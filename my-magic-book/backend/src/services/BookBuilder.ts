import Order, { IOrder } from '../models/Order';
import Story from '../models/Story';
import { generateIllustration } from './ImageGenerator';
import { buildBookHtml, BookData } from './HtmlTemplateBuilder';
import { generateBookPdf } from './PdfGenerator';
import { uploadBuffer, pdfFolderPath } from './StorageService';
import { splitStoryIntoPages, buildIllustrationPrompt } from './promptBuilder';
import { getSceneTemplate, buildScenePrompt, buildColoringCoverPrompt, buildColoringBackCoverPrompt, resolveTokens, COLORING_PAGES } from './sceneTemplates';
import { printAndSubmitForOrder, buildPrintFilesForStory, PrintBuildOpts } from './PrintOrchestrator';
import { isBookPodConfigured } from './BookPodService';
import fs from 'fs';
import path from 'path';

/** Turn a private GCS object path into a backend proxy URL the PDF/web can load. */
function proxyUrl(objectPath: string): string {
  const base = process.env.PUBLIC_API_URL || 'http://localhost:5001/api';
  return `${base}/uploads/image?path=${encodeURIComponent(objectPath)}`;
}

// The printed book must match the language the customer chose. The page texts
// live in the same translation files the web book uses, so we read them here
// (graceful fallback to the Arabic scene template if unavailable).
const _localeCache: Record<string, any> = {};
function loadLocale(language: string): any {
  const lang = ['ar', 'en', 'he'].includes(language) ? language : 'ar';
  if (_localeCache[lang]) return _localeCache[lang];
  try {
    const file = path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'locales', lang, 'translation.json');
    _localeCache[lang] = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    _localeCache[lang] = {};
  }
  return _localeCache[lang];
}

/** Localized { title, pages[] } for a theme in the chosen language, or null. */
function localizedStory(theme: string, language: string): {
  title?: string; pages: string[]; dedication?: string; moral?: string; conclusion?: string; questions?: string[];
} | null {
  const s = loadLocale(language)?.stories?.[theme];
  if (!s || !s.pages) return null;
  const pages = Object.keys(s.pages).sort((a, b) => Number(a) - Number(b)).map((k) => s.pages[k] as string);
  const q = s.questions;
  const questions = Array.isArray(q)
    ? q
    : (q && typeof q === 'object' ? Object.keys(q).sort((a, b) => Number(a) - Number(b)).map((k) => q[k]) : undefined);
  return { title: s.title, pages, dedication: s.dedication, moral: s.moral, conclusion: s.conclusion, questions };
}

const ILLUSTRATION_PAGES = 13; // matches the 13 image slots in the printed book

/**
 * Builds the finished, illustrated book for a paid order.
 *
 * Lifecycle invariant: this function is the *only* place we call the paid AI
 * illustration API. Anywhere else (wizard, preview) must stay free.
 *
 * Idempotent: if illustrationsStatus is already 'generating' or 'ready', we
 * skip. Failures land in 'failed' with the error captured for the admin UI.
 */
export async function buildBookForOrder(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);

  if (order.paymentStatus !== 'paid') {
    throw new Error(`Refusing to build: order ${orderId} paymentStatus=${order.paymentStatus}`);
  }
  if (order.illustrationsStatus === 'generating' || order.illustrationsStatus === 'ready') {
    console.log(`[BookBuilder] order ${orderId} already ${order.illustrationsStatus}, skipping`);
    return order;
  }

  const story = await Story.findById(order.storyId);
  if (!story) throw new Error(`Story ${order.storyId} for order ${orderId} not found`);

  order.illustrationsStatus = 'generating';
  order.illustrationsError = undefined;
  await order.save();

  try {
    const childPhoto = story.childPhotoUrl || '';
    const sid = String(story._id);

    // Preferred path: the theme has a reusable SCENE TEMPLATE (the "Baha story"
    // structure). We re-run its exact scenes/text with THIS customer's photo as
    // the face reference — same story, swapped kid — in the photoreal style.
    const template = getSceneTemplate(story.theme);
    const wantsColoring = story.bookPackage === 'coloring' && !!template?.coloringScenes && !!template?.coloringCoverScene;

    let imageUrls: string[];
    let pageTexts: string[];
    let coverImageUrl: string;
    let storyTitle: string;
    let isColoringBook = false;

    if (wantsColoring) {
      // COLORING BOOK: one full-color creative cover + 16 line-art pages (no text).
      // Back cover (page-98) is stored on generatedPortrait for the viewer.
      isColoringBook = true;
      const col = await generateColoringArtifacts(story, childPhoto, template!, sid, 0);
      story.generatedCover = col.cover;
      story.generatedImages = col.images;
      story.generatedPortrait = col.backCover;
      await story.save();

      imageUrls = col.images.map(proxyUrl);
      pageTexts = col.images.map(() => '');
      coverImageUrl = proxyUrl(col.cover);
      storyTitle = `${story.childName} — كتاب تلوين`;
    } else if (template?.pageScenes && template?.pageTexts && template?.coverScene && template?.portraitScene) {
      // PHOTOREAL story book — same story, this customer's face.
      const cover = await generateIllustration(
        buildScenePrompt('cover', template.coverScene, story.childName, story.childGender),
        childPhoto, { storyId: sid, pageNumber: 0 }
      );
      const objectPaths: string[] = [];
      pageTexts = [];
      const loc = localizedStory(story.theme, (story as any).language || 'ar');
      for (let i = 0; i < ILLUSTRATION_PAGES; i++) {
        const medal = (template.medalPages || []).includes(i + 1);
        const img = await generateIllustration(
          buildScenePrompt('page', template.pageScenes[i], story.childName, story.childGender, { medal }),
          childPhoto, { storyId: sid, pageNumber: i + 1 }
        );
        objectPaths.push(img.objectPath);
        pageTexts.push(resolveTokens(loc?.pages?.[i] ?? template.pageTexts[i], story.childName, story.childGender));
      }
      const portrait = await generateIllustration(
        buildScenePrompt('portrait', template.portraitScene, story.childName, story.childGender),
        childPhoto, { storyId: sid, pageNumber: 99 }
      );
      story.generatedCover = cover.objectPath;
      story.generatedImages = objectPaths;
      story.generatedPortrait = portrait.objectPath;
      await story.save();

      imageUrls = objectPaths.map(proxyUrl);
      coverImageUrl = proxyUrl(cover.objectPath);
      storyTitle = resolveTokens(loc?.title || template.titleAr || `${story.childName}`, story.childName, story.childGender);
    } else {
      // Fallback for themes without a scene template (handwritten / AI mode).
      const pairs = story.mode === 'template' && Array.isArray(story.templatePages) && story.templatePages.length > 0
        ? extractPairsFromTemplate(story.templatePages, story.childName)
        : extractPairsFromAi(story);

      const paths: string[] = [];
      pageTexts = [];
      for (let i = 0; i < ILLUSTRATION_PAGES; i++) {
        const stored = await generateIllustration(pairs[i].imagePrompt, childPhoto, { storyId: sid, pageNumber: i + 1 });
        paths.push(stored.objectPath);
        pageTexts.push(pairs[i].text);
      }
      story.generatedImages = paths;
      await story.save();
      imageUrls = paths.map(proxyUrl);
      coverImageUrl = story.coverImageUrl || imageUrls[0] || '';
      storyTitle = `${story.childName} ${story.theme}`;
    }

    // PRO bundle: also generate the line-art COLORING book as a second digital
    // artifact (page numbers offset to +200 so it never overwrites the color
    // story above). The printed/BookPod book stays the color story; the coloring
    // book is delivered digitally (viewable in the customer's dashboard).
    if (story.bookPackage === 'pro' && template?.coloringScenes && template?.coloringCoverScene) {
      const col = await generateColoringArtifacts(story, childPhoto, template, sid, 200);
      story.coloringCover = col.cover;
      story.coloringImages = col.images;
      story.coloringBackCover = col.backCover;
      await story.save();
    }

    // Assemble pages. A coloring book is image-only (no story text); a story book
    // alternates text/image.
    const pages: BookData['pages'] = [];
    for (let i = 0; i < imageUrls.length; i++) {
      if (!isColoringBook) pages.push({ type: 'text', content: pageTexts[i] });
      pages.push({ type: 'image', imageUrl: imageUrls[i] });
    }

    const bookData: BookData = {
      childName: story.childName,
      childPhotoUrl: story.childPhotoUrl || '',
      storyTitle,
      coverImageUrl,
      pages,
    };

    // Step 3: render the PDF and upload to GCS.
    const html = buildBookHtml(bookData);
    const pdfBuffer = await generateBookPdf(html);
    const objectPath = pdfFolderPath('orders', `${orderId}.pdf`);
    const stored = await uploadBuffer(pdfBuffer, objectPath, 'application/pdf');

    order.illustrationsStatus = 'ready';
    order.bookPdfUrl = stored.gcsUri;
    await order.save();

    // Sync the Story too so the user's library shows the finished book.
    story.status = 'ordered';
    await story.save();

    // Build print-ready files (wraparound cover + multiple-of-4 interior) and,
    // if BookPod is configured, submit the print job. Never fails the build.
    try {
      const printLoc = localizedStory(story.theme, (story as any).language || 'ar');
      const rt = (s?: string) => (s ? resolveTokens(s, story.childName, story.childGender) : undefined);
      const printResult = await printAndSubmitForOrder(order, story, {
        isColoring: isColoringBook,
        title: storyTitle,
        pageTexts,
        childPhotoPath: story.childPhotoUrl,
        dedication: rt(printLoc?.dedication),
        moral: rt(printLoc?.moral),
        conclusion: rt(printLoc?.conclusion),
        questions: printLoc?.questions?.map((q) => resolveTokens(q, story.childName, story.childGender)),
      });
      order.printCoverUrl = printResult.urls.coverUrl;
      order.printInteriorUrl = printResult.urls.interiorUrl;
      order.printInteriorPages = printResult.urls.interiorPages;
      if (printResult.jobId) {
        order.bookpodJobId = printResult.jobId;
        order.bookpodStatus = 'submitted';
      }
      await order.save();
    } catch (printErr: any) {
      console.warn(`[BookBuilder] print/BookPod step skipped: ${printErr.message}`);
    }

    return order;
  } catch (err: any) {
    console.error(`[BookBuilder] order ${orderId} failed:`, err);
    order.illustrationsStatus = 'failed';
    order.illustrationsError = err.message?.slice(0, 500) || 'unknown error';
    await order.save();
    throw err;
  }
}

/**
 * Generate the line-art COLORING book artifacts (full-color creative cover + 16
 * line-art pages + creative back cover). Reused by the coloring-only path and
 * the Pro bundle. `base` offsets the page numbers so Pro's coloring images
 * (page-200..) don't overwrite the color story's images (page-00..13, page-99).
 */
async function generateColoringArtifacts(
  story: any, childPhoto: string, template: any, sid: string, base = 0,
): Promise<{ cover: string; images: string[]; backCover?: string }> {
  const scenes = template.coloringScenes!;
  const coverGen = await generateIllustration(
    buildColoringCoverPrompt(template.coloringCoverScene!, story.childName, story.childGender),
    childPhoto, { storyId: sid, pageNumber: base + 0 },
  );
  const images: string[] = [];
  for (let i = 0; i < COLORING_PAGES; i++) {
    const img = await generateIllustration(
      buildScenePrompt('page', scenes[i], story.childName, story.childGender, { coloring: true }),
      childPhoto, { storyId: sid, pageNumber: base + i + 1 },
    );
    images.push(img.objectPath);
  }
  let backCover: string | undefined;
  if (template.coloringBackCoverScene) {
    const back = await generateIllustration(
      buildColoringBackCoverPrompt(template.coloringBackCoverScene, story.childName, story.childGender),
      childPhoto, { storyId: sid, pageNumber: base + 98 },
    );
    backCover = back.objectPath;
  }
  return { cover: coverGen.objectPath, images, backCover };
}

/**
 * Reconstruct the print-build options (title + page texts + front/back matter)
 * for an order whose illustrations already exist. Fully deterministic — no AI
 * calls, so it costs nothing. Shared by the re-render and BookPod-submit paths.
 */
function reconstructPrintOpts(story: any): PrintBuildOpts {
  const template = getSceneTemplate(story.theme);
  const isColoringBook =
    story.bookPackage === 'coloring' && !!template?.coloringScenes && !!template?.coloringCoverScene;
  const loc = localizedStory(story.theme, (story as any).language || 'ar');
  const rt = (s?: string) => (s ? resolveTokens(s, story.childName, story.childGender) : undefined);
  const images: string[] = story.generatedImages || [];

  let pageTexts: string[];
  let storyTitle: string;
  if (isColoringBook) {
    pageTexts = images.map(() => '');
    storyTitle = `${story.childName} — كتاب تلوين`;
  } else if (template?.pageTexts && template?.coverScene) {
    pageTexts = images.map((_: string, i: number) =>
      resolveTokens(loc?.pages?.[i] ?? template.pageTexts![i] ?? '', story.childName, story.childGender)
    );
    storyTitle = resolveTokens(loc?.title || template.titleAr || story.childName, story.childName, story.childGender);
  } else {
    const pairs = story.mode === 'template' && Array.isArray(story.templatePages) && story.templatePages.length > 0
      ? extractPairsFromTemplate(story.templatePages, story.childName)
      : extractPairsFromAi(story);
    pageTexts = images.map((_: string, i: number) => pairs[i]?.text ?? '');
    storyTitle = `${story.childName} ${story.theme}`;
  }

  return {
    isColoring: isColoringBook,
    title: storyTitle,
    pageTexts,
    childPhotoPath: story.childPhotoUrl,
    dedication: rt(loc?.dedication),
    moral: rt(loc?.moral),
    conclusion: rt(loc?.conclusion),
    questions: loc?.questions?.map((q) => resolveTokens(q, story.childName, story.childGender)),
  };
}

/**
 * Rebuild ONLY the print-ready PDFs (wraparound cover + interior) for an order
 * whose illustrations are ALREADY generated, reusing the stored images. This
 * costs nothing on the AI side and never submits to BookPod — it just brings an
 * older order up to the current print layout.
 */
export async function reRenderPrintFilesForOrder(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  const story = await Story.findById(order.storyId);
  if (!story) throw new Error(`Story ${order.storyId} for order ${orderId} not found`);
  if (!story.generatedCover || !story.generatedPortrait || !(story.generatedImages || []).length) {
    throw new Error('cannot re-render files: this order has no generated illustrations yet — build it first');
  }

  const urls = await buildPrintFilesForStory(story, reconstructPrintOpts(story));
  order.printCoverUrl = urls.coverUrl;
  order.printInteriorUrl = urls.interiorUrl;
  order.printInteriorPages = urls.interiorPages;
  await order.save();
  return order;
}

/**
 * Build the print-ready PDFs (cover + interior) for a showcase/preview book that
 * is NOT tied to a paid order — e.g. the admin book viewer's "Download" button.
 * The caller supplies the theme, child name, and the already-generated GCS image
 * paths; the story TEXT (title, page texts, dedication, moral, questions) is
 * reconstructed server-side from the theme + name, exactly like an order rebuild.
 * Nothing is submitted to BookPod. Returns the uploaded PDF paths/urls.
 */
export async function buildPreviewPrintFiles(input: {
  theme: string;
  childName: string;
  childGender?: 'male' | 'female';
  language?: string;
  coverPath: string;
  backPath: string;
  imagePaths: string[];
  childPhotoPath?: string;
  isColoring?: boolean;
}) {
  const pseudoStory: any = {
    _id: `preview-${input.theme}-${Date.now()}`,
    theme: input.theme,
    childName: input.childName || 'الطفل',
    childGender: input.childGender,
    language: input.language || 'ar',
    generatedCover: input.coverPath,
    generatedPortrait: input.backPath,
    generatedImages: input.imagePaths,
    childPhotoUrl: input.childPhotoPath,
    bookPackage: input.isColoring ? 'coloring' : 'story',
    mode: 'template',
  };
  return buildPrintFilesForStory(pseudoStory, reconstructPrintOpts(pseudoStory));
}

/**
 * Build a preview/showcase book and SUBMIT it to BookPod for printing (admin
 * "Send to BookPod" from the book viewer). Not tied to a paid order — the caller
 * supplies the shipping details from a form. Billable + prints a physical book,
 * so it is only ever reached by a deliberate, confirmed admin click.
 */
export async function submitPreviewToBookPod(
  input: {
    theme: string; childName: string; childGender?: 'male' | 'female'; language?: string;
    coverPath: string; backPath: string; imagePaths: string[]; childPhotoPath?: string; isColoring?: boolean;
  },
  shipping: {
    fullName: string; phone: string; city?: string; street?: string; buildingNo?: string;
    floor?: string; postalCode?: string; notes?: string; deliveryMethod?: 'delivery' | 'pickup'; pickupLocation?: string;
  },
) {
  const pseudoStory: any = {
    _id: `preview-${input.theme}-${Date.now()}`,
    theme: input.theme,
    childName: input.childName || 'الطفل',
    childGender: input.childGender,
    language: input.language || 'ar',
    generatedCover: input.coverPath,
    generatedPortrait: input.backPath,
    generatedImages: input.imagePaths,
    childPhotoUrl: input.childPhotoPath,
    bookPackage: input.isColoring ? 'coloring' : 'story',
    mode: 'template',
  };
  const pseudoOrder: any = {
    _id: pseudoStory._id,
    shippingAddress: shipping,
    userId: null,
    totalPrice: 0,
  };
  return printAndSubmitForOrder(pseudoOrder, pseudoStory, reconstructPrintOpts(pseudoStory));
}

/**
 * Submit an ALREADY-BUILT order to BookPod for printing. Rebuilds the print PDFs
 * from the existing images (no AI cost, no image re-generation) and sends the
 * print job. Surfaces a clear error if BookPod isn't configured, the order has no
 * illustrations yet, or BookPod rejects the job — so failures are never silent.
 */
export async function submitOrderToBookPod(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (!isBookPodConfigured()) {
    throw new Error('BookPod is not configured on the server (missing BOOKPOD_USER_ID / BOOKPOD_TOKEN). Restart the backend after setting them in backend/.env.');
  }
  const story = await Story.findById(order.storyId);
  if (!story) throw new Error(`Story ${order.storyId} for order ${orderId} not found`);
  if (!story.generatedCover || !(story.generatedImages || []).length) {
    throw new Error('This order has no generated illustrations yet — build the book first.');
  }

  const result = await printAndSubmitForOrder(order, story, reconstructPrintOpts(story));
  order.printCoverUrl = result.urls.coverUrl;
  order.printInteriorUrl = result.urls.interiorUrl;
  order.printInteriorPages = result.urls.interiorPages;
  if (result.jobId) {
    order.bookpodJobId = result.jobId;
    order.bookpodStatus = 'submitted';
  }
  await order.save();

  if (!result.submitted) {
    throw new Error('Print files were rebuilt but BookPod did not accept the job. Check the server credentials/logs.');
  }
  return order;
}

interface PagePair {
  text: string;
  imagePrompt: string;
}

/**
 * Mirrors the frontend `buildBook` substitutor so backend and frontend
 * render the same string from the same template.
 */
function substituteName(s: string, name: string): string {
  return (s || '')
    .replace(/\[NAME\]/gi, name)
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\s*name\s*\}/gi, name);
}

function extractPairsFromTemplate(
  templatePages: Array<{ type: 'text' | 'image'; content?: string; prompt?: string }>,
  childName: string
): PagePair[] {
  const texts = templatePages.filter((p) => p.type === 'text');
  const images = templatePages.filter((p) => p.type === 'image');
  const pairs: PagePair[] = [];
  for (let i = 0; i < ILLUSTRATION_PAGES; i++) {
    const t = texts[i % Math.max(texts.length, 1)];
    const img = images[i % Math.max(images.length, 1)];
    pairs.push({
      text: substituteName(t?.content || '', childName),
      imagePrompt: substituteName(img?.prompt || '', childName) ||
        // Fallback: if author didn't write a prompt for this page, derive one
        // from the text on the same page.
        `Children's book illustration of ${childName}. Scene: ${substituteName(t?.content || '', childName)}. Soft pastel storybook style, square 1:1, no text.`,
    });
  }
  return pairs;
}

function extractPairsFromAi(story: { generatedText?: string; childName: string; childAge: string; childGender: 'male' | 'female'; theme: string; language: string }): PagePair[] {
  const textChunks = splitStoryIntoPages(story.generatedText || '', ILLUSTRATION_PAGES);
  return textChunks.map((chunk, i) => ({
    text: chunk,
    imagePrompt: buildIllustrationPrompt({
      pageText: chunk,
      childName: story.childName,
      childAge: story.childAge,
      childGender: story.childGender,
      theme: story.theme,
      language: story.language as 'ar' | 'en' | 'he',
      pageNumber: i + 1,
    }),
  }));
}

