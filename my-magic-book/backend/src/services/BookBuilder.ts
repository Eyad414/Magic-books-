import Order, { IOrder } from '../models/Order';
import Story, { IStory } from '../models/Story';
import { generateIllustration } from './ImageGenerator';
import { buildBookHtml, BookData } from './HtmlTemplateBuilder';
import { generateBookPdf } from './PdfGenerator';
import { uploadBuffer, pdfFolderPath, copyObject, objectExists } from './StorageService';
import { splitStoryIntoPages, buildIllustrationPrompt, buildFallbackCoverPrompt, buildFallbackPortraitPrompt, NO_TEXT_RULE, type FallbackArtStyle } from './promptBuilder';
import { getSceneTemplate, buildScenePrompt, buildColoringCoverPrompt, buildColoringBackCoverPrompt, resolveTokens, resolveGender, resolveColoringScenes, wantsColoringBook, COLORING_PAGES } from './sceneTemplates';
import { coverPreviewSlug, findPreviewCover } from './coverPreviewKey';
import { describeCoverScene } from './CoverConcept';
import { printAndSubmitForOrder, printAndSubmitColoringForOrder, buildColoringPrintForOrder, buildPrintFilesForStory, PrintBuildOpts } from './PrintOrchestrator';
import { isBookPodConfigured, registerBook, createPrintOrder, type BookPodShipping } from './BookPodService';
import { PRINT_TRIM_MM, PRINT_BLEED_MM } from './PrintService';
import { localizeName } from '../utils/translit';
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
// Read the locale file FRESH on every call. It used to be cached in memory for
// the whole process lifetime, which meant a title/text change never took effect
// until the server restarted (a rebuilt book kept the stale title). Book builds
// are infrequent, so re-reading a small JSON each time is negligible.
function loadLocale(language: string): any {
  const lang = ['ar', 'en', 'he'].includes(language) ? language : 'ar';
  try {
    const file = path.join(__dirname, '..', '..', '..', 'frontend', 'src', 'locales', lang, 'translation.json');
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * A theme's 13 Arabic page texts, straight from the locale file the print
 * pipeline already reads. Lets the dashboard seed a new story without the text
 * being pasted a second time into the controller, where the two copies would
 * drift apart.
 */
export function arabicStoryPages(theme: string): string[] {
  const s = loadLocale('ar')?.stories?.[theme];
  if (!s?.pages) return [];
  return Object.keys(s.pages)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => s.pages[k] as string)
    .filter((t) => typeof t === 'string' && t.trim().length > 0);
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
 * Publish build progress so the dashboard can show a real bar instead of an
 * open-ended spinner. Best-effort: a failed progress write must never abort a
 * build that is otherwise fine, so errors are swallowed.
 */
async function reportProgress(orderId: string, percent: number, stage: string): Promise<void> {
  try {
    await Order.findByIdAndUpdate(orderId, {
      buildProgress: Math.max(0, Math.min(100, Math.round(percent))),
      buildStage: stage,
    });
  } catch { /* progress is cosmetic */ }
}

/**
 * Returns the object path for this book's front cover.
 *
 * Prefers the cover the customer already approved in step 2: the preview slug
 * hashes the exact generation inputs, so a hit proves the stored image was made
 * from this same prompt and photo. Without this the book shipped a freshly
 * generated cover — the same prompt, but image models aren't deterministic, so
 * the printed cover was visibly NOT the one the customer said yes to.
 *
 * Reuse is best-effort: any miss or error falls through to generating, so the
 * worst case is exactly the previous behaviour.
 */
async function reuseApprovedCover(
  story: any,
  coverPrompt: string,
  childPhoto: string,
  sid: string
): Promise<string> {
  try {
    const userId = String(story.userId?._id || story.userId || '');
    if (userId && childPhoto) {
      const slug = coverPreviewSlug(userId, story.theme, coverPrompt, childPhoto);
      const approved = await findPreviewCover(slug);
      if (approved) {
        const dest = pdfFolderPath(`generated/${sid}`, `page-00.${approved.ext}`);
        await copyObject(approved.path, dest);
        console.log(`[BookBuilder] reusing the cover ${story.childName} approved (${approved.path})`);
        return dest;
      }
    }
  } catch (err: any) {
    console.warn(`[BookBuilder] cover reuse skipped, generating instead: ${err.message}`);
  }
  const cover = await generateIllustration(coverPrompt, childPhoto, { storyId: sid, pageNumber: 0 });
  return cover.objectPath;
}

/**
 * The 13 page texts for a template-built book, or null when this theme has none.
 *
 * Text and ARTWORK come from different places and it was wrong to gate one on
 * the other. A photoreal variant like space_real has hand-written scenes but no
 * pageTexts — its story text is typed by the owner in the dashboard and lives on
 * the story itself. Requiring template.pageTexts sent those orders down the
 * fallback path, so the customer received CGI cartoon art while the demo book
 * they chose from was photoreal. Sold one thing, delivered another.
 *
 * Order of preference: the customer's language from the locale, then the
 * template, then the pages typed for that theme. Null if any page has no text
 * at all, so a book can never be printed with blank pages.
 */
function templateStoryTexts(story: any, template: any, loc: any): string[] | null {
  const typed: string[] = (story.templatePages || [])
    .filter((p: any) => p?.type === 'text')
    .map((p: any) => String(p?.content || ''));

  const texts: string[] = [];
  for (let i = 0; i < ILLUSTRATION_PAGES; i++) {
    const raw = loc?.pages?.[i] ?? template?.pageTexts?.[i] ?? typed[i] ?? '';
    if (!String(raw).trim()) return null;
    // Both token styles appear across these sources: [NAME] with {he|she}
    // gender forms in the locales, {{name}} in the dashboard-typed pages.
    texts.push(substituteName(resolveTokens(raw, story.childName, story.childGender), story.childName));
  }
  return texts;
}

/** Neutral personalized title for a "write with AI" story — never the theme name. */
function aiStoryTitle(story: any): string {
  const tmpl = loadLocale((story as any).language || 'ar')?.storybook?.ai_story_title || 'قصة [NAME] السحرية';
  return resolveTokens(tmpl, story.childName, story.childGender);
}

/**
 * Builds the finished, illustrated book for a paid order.
 *
 * Lifecycle invariant: this function is the *only* place we call the paid AI
 * illustration API. Anywhere else (wizard, preview) must stay free.
 *
 * Idempotent: if illustrationsStatus is already 'generating' or 'ready', we
 * skip. Failures land in 'failed' with the error captured for the admin UI.
 */
export async function buildBookForOrder(orderId: string, submitToBookPod = true): Promise<IOrder> {
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
  // Render the child's name in the book's language for print (e.g. "Baha" -> "بهاء").
  story.childName = localizeName(story.childName, (story as any).language || 'ar');

  order.illustrationsStatus = 'generating';
  order.illustrationsError = undefined;
  order.buildProgress = 0;
  order.buildStage = 'بدء التجهيز';
  await order.save();

  try {
    const childPhoto = story.childPhotoUrl || '';
    const sid = String(story._id);

    // Preferred path: the theme has a reusable SCENE TEMPLATE (the "Baha story"
    // structure). We re-run its exact scenes/text with THIS customer's photo as
    // the face reference — same story, swapped kid — in the photoreal style.
    const template = getSceneTemplate(story.theme);
    const wantsColoring = wantsColoringBook(story.bookPackage, template, story.theme);

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
    } else if (
      story.mode !== 'ai' &&
      template?.pageScenes?.length === ILLUSTRATION_PAGES &&
      template?.coverScene &&
      template?.portraitScene &&
      templateStoryTexts(story, template, localizedStory(story.theme, (story as any).language || 'ar'))
    ) {
      // PHOTOREAL story book — the theme's FIXED (ready) story, this customer's face.
      // AI-mode stories skip this (mode!=='ai' guard): they must use the customer's
      // own generated text + illustrations derived from it, not the theme template.
      // The ARTWORK must use the same corrected gender as the text below, which
      // goes through resolveTokens: the wizard defaults childGender to 'male',
      // so a girl whose order was never toggled was getting "she" in the story
      // and a boy in every illustration.
      const artGender = resolveGender(story.childName, story.childGender);

      const coverPrompt = buildScenePrompt('cover', template.coverScene, story.childName, artGender);
      await reportProgress(String(order._id), 2, 'الغلاف الأمامي');
      const coverPath = await reuseApprovedCover(story, coverPrompt, childPhoto, sid);

      const objectPaths: string[] = [];
      pageTexts = [];
      const loc = localizedStory(story.theme, (story as any).language || 'ar');
      // Non-null: the branch condition already built these successfully.
      const resolvedTexts = templateStoryTexts(story, template, loc) as string[];
      for (let i = 0; i < ILLUSTRATION_PAGES; i++) {
        const medal = (template.medalPages || []).includes(i + 1);
        const img = await generateIllustration(
          buildScenePrompt('page', template.pageScenes[i], story.childName, artGender, { medal }),
          childPhoto, { storyId: sid, pageNumber: i + 1 }
        );
        objectPaths.push(img.objectPath);
        pageTexts.push(resolvedTexts[i]);
        await reportProgress(
          String(order._id),
          5 + ((i + 1) / ILLUSTRATION_PAGES) * 70,
          `الصفحة ${i + 1} من ${ILLUSTRATION_PAGES}`,
        );
      }
      await reportProgress(String(order._id), 78, 'الصورة الختامية');
      const portrait = await generateIllustration(
        buildScenePrompt('portrait', template.portraitScene, story.childName, artGender),
        childPhoto, { storyId: sid, pageNumber: 99 }
      );
      story.generatedCover = coverPath;
      story.generatedImages = objectPaths;
      story.generatedPortrait = portrait.objectPath;
      await story.save();

      imageUrls = objectPaths.map(proxyUrl);
      coverImageUrl = proxyUrl(coverPath);
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
        await reportProgress(
          String(order._id),
          5 + ((i + 1) / ILLUSTRATION_PAGES) * 70,
          `الصفحة ${i + 1} من ${ILLUSTRATION_PAGES}`,
        );
      }
      story.generatedImages = paths;
      await story.save();

      // Cover and back portrait. This branch used to stop at the 13 interior
      // pages, so a book on a theme without a scene template had neither: the
      // viewer fell back to the child's RAW UPLOADED SNAPSHOT as the front
      // cover, and the order still reported "ready" because that check only
      // counts interior pages. Every customer on a photoreal-variant theme got
      // that book.
      //
      // The style follows the artwork that was just drawn — CGI for an AI-mode
      // story, soft storybook for a template one — because a photoreal cover on
      // a cartoon book is worse than no cover at all.
      const artStyle: FallbackArtStyle = story.mode === 'ai' ? 'cgi' : 'storybook';
      // What the cover should SHOW is designed from this book's own story, not
      // looked up from a theme map that only knows about twenty themes — a book
      // about a first day at school and one about a lost puppy were getting the
      // same generic sparkles. Text-only, so it costs nothing; it just decides
      // what goes into the cover image we were generating anyway.
      await reportProgress(String(order._id), 75, 'تصميم الغلاف');
      const coverScene = await describeCoverScene({
        theme: story.theme,
        childName: story.childName,
        pages: pageTexts,
        title: story.mode === 'ai' ? aiStoryTitle(story) : undefined,
      });
      const coverPrompt = buildFallbackCoverPrompt({
        coverScene,
        childName: story.childName,
        childGender: resolveGender(story.childName, story.childGender),
        childAge: story.childAge,
        theme: story.theme,
        openingText: pageTexts[0],
        style: artStyle,
      });
      await reportProgress(String(order._id), 76, 'الغلاف الأمامي');
      // Reuses a cover the customer already approved from the free preview when
      // one matches, exactly like the template path — that keeps this from
      // costing an extra image on every such order.
      const fallbackCover = await reuseApprovedCover(story, coverPrompt, childPhoto, sid);

      await reportProgress(String(order._id), 79, 'الصورة الختامية');
      const fallbackPortrait = await generateIllustration(
        buildFallbackPortraitPrompt({
          coverScene,
          childName: story.childName,
          childGender: resolveGender(story.childName, story.childGender),
          childAge: story.childAge,
          theme: story.theme,
          style: artStyle,
        }),
        childPhoto,
        { storyId: sid, pageNumber: 99 },
      );

      story.generatedCover = fallbackCover;
      story.generatedPortrait = fallbackPortrait.objectPath;
      await story.save();

      imageUrls = paths.map(proxyUrl);
      coverImageUrl = proxyUrl(fallbackCover);
      storyTitle = story.mode === 'ai' ? aiStoryTitle(story) : `${story.childName} ${story.theme}`;
    }

    // PRO bundle: also generate the line-art COLORING book as a second digital
    // artifact (page numbers offset to +200 so it never overwrites the color
    // story above). The printed/BookPod book stays the color story; the coloring
    // book is delivered digitally (viewable in the customer's dashboard).
    // Pro used to require hand-written coloringScenes + coloringCoverScene, which
    // only 4 of 17 themes had — so most Pro orders quietly shipped without the
    // colouring book the customer paid for. Now any theme with page scenes works.
    if (story.bookPackage === 'pro' && resolveColoringScenes(template)) {
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
    // A book is only "ready" if it has everything a reader sees. There was no
    // completeness check at all — the status was set on reaching the end of the
    // function — so a book with 13 pages and no cover reported ready and was
    // delivered that way. A missing piece now fails the build loudly, where the
    // dashboard shows the reason, instead of shipping quietly.
    if (!isColoringBook) {
      const missing = [
        story.generatedCover ? '' : 'cover',
        story.generatedPortrait ? '' : 'back portrait',
        (story.generatedImages || []).length === ILLUSTRATION_PAGES ? '' : `${ILLUSTRATION_PAGES} interior pages`,
      ].filter(Boolean);
      if (missing.length) {
        throw new Error(`book is incomplete — missing ${missing.join(', ')}`);
      }
    }

    await reportProgress(orderId, 82, 'تجهيز ملف الكتاب (PDF)');
    const html = buildBookHtml(bookData);
    const pdfBuffer = await generateBookPdf(html);
    const objectPath = pdfFolderPath('orders', `${orderId}.pdf`);
    const stored = await uploadBuffer(pdfBuffer, objectPath, 'application/pdf');

    order.illustrationsStatus = 'ready';
    order.bookPdfUrl = stored.gcsUri;
    order.buildProgress = 90;
    order.buildStage = 'تجهيز ملفات الطباعة';
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
      }, submitToBookPod);
      order.printCoverUrl = printResult.urls.coverUrl;
      order.printInteriorUrl = printResult.urls.interiorUrl;
      order.printInteriorPages = printResult.urls.interiorPages;
      if (printResult.jobId) {
        order.bookpodJobId = printResult.jobId;
        order.bookpodStatus = 'submitted';
      }
      await order.save();
      // PRO bundle: also print the coloring book as a second BookPod job.
      if (submitToBookPod) await maybeSubmitProColoring(order, story);
    } catch (printErr: any) {
      console.warn(`[BookBuilder] print/BookPod step skipped: ${printErr.message}`);
    }

    await reportProgress(orderId, 100, 'اكتمل');
    return order;
  } catch (err: any) {
    console.error(`[BookBuilder] order ${orderId} failed:`, err);
    order.illustrationsStatus = 'failed';
    order.illustrationsError = err.message?.slice(0, 500) || 'unknown error';
    order.buildStage = 'فشل';
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
  // Falls back to the theme's own page scenes, so the colouring book follows
  // whichever story the customer picked rather than only the four themes that
  // happen to have hand-written colouring scenes.
  const resolved = resolveColoringScenes(template);
  if (!resolved) throw new Error(`no coloring scenes for theme ${story.theme}`);
  const scenes = resolved.scenes;
  const coverGen = await generateIllustration(
    buildColoringCoverPrompt(resolved.cover, story.childName, story.childGender),
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
  if (resolved.back) {
    const back = await generateIllustration(
      buildColoringBackCoverPrompt(resolved.back, story.childName, story.childGender),
      childPhoto, { storyId: sid, pageNumber: base + 98 },
    );
    backCover = back.objectPath;
  }
  return { cover: coverGen.objectPath, images, backCover };
}

/**
 * PRO bundle: if the order's story has a generated coloring book, also print it
 * as a SECOND BookPod job. Best-effort — never fails the main flow. Stores the
 * coloring print URLs + job id on the order.
 */
async function maybeSubmitProColoring(order: any, story: any): Promise<void> {
  if (story.bookPackage !== 'pro' || !(story.coloringImages?.length) || !story.coloringCover) return;
  try {
    const col = await printAndSubmitColoringForOrder(order, story);
    order.coloringPrintCoverUrl = col.urls.coverUrl;
    order.coloringPrintInteriorUrl = col.urls.interiorUrl;
    if (col.jobId) order.coloringBookpodJobId = col.jobId;
    await order.save();
    console.log(`[BookBuilder] order ${order._id}: coloring book ${col.submitted ? 'submitted to BookPod' : 'built (not submitted)'}`);
  } catch (e: any) {
    console.warn(`[BookBuilder] pro coloring print skipped: ${e?.message || e}`);
  }
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
  } else if (story.mode !== 'ai' && template?.pageTexts && template?.coverScene) {
    // Ready (template) story text. AI stories skip this and use their own text below.
    pageTexts = images.map((_: string, i: number) =>
      resolveTokens(loc?.pages?.[i] ?? template.pageTexts![i] ?? '', story.childName, story.childGender)
    );
    storyTitle = resolveTokens(loc?.title || template.titleAr || story.childName, story.childName, story.childGender);
  } else {
    const pairs = story.mode === 'template' && Array.isArray(story.templatePages) && story.templatePages.length > 0
      ? extractPairsFromTemplate(story.templatePages, story.childName)
      : extractPairsFromAi(story);
    pageTexts = images.map((_: string, i: number) => pairs[i]?.text ?? '');
    storyTitle = story.mode === 'ai' ? aiStoryTitle(story) : `${story.childName} ${story.theme}`;
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
  // Render the child's name in the book's language for print (e.g. "Baha" -> "بهاء").
  story.childName = localizeName(story.childName, (story as any).language || 'ar');
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

/** The bucket object behind a stored print URL (…/uploads/image?path=<object>). */
function printObjectPath(url?: string): string | null {
  if (!url) return null;
  try {
    const p = new URL(url).searchParams.get('path');
    return p || null;
  } catch {
    return null;
  }
}

interface BatchBookInput {
  externalId: string;
  title: string;
  isColoring: boolean;
  language: string;
  coverPath: string;
  interiorPath: string;
}

/**
 * Register every book, then place ONE BookPod order for all of them.
 *
 * Registration uploads PDFs but prints nothing, so a failure part-way leaves
 * unused books on BookPod's side rather than a half-printed batch — which is
 * why the order comes last, after every upload has succeeded.
 */
async function registerAndOrderTogether(
  books: BatchBookInput[],
  shipping: BookPodShipping
): Promise<{ jobId: string; books: { externalId: string; bookId: string; title: string }[] }> {
  const items: { bookId: string; quantity: number }[] = [];
  const registered: { externalId: string; bookId: string; title: string }[] = [];
  for (const b of books) {
    const { bookId } = await registerBook({
      externalId: b.externalId,
      title: b.title,
      author: 'Magic Fanoos',
      isColoring: b.isColoring,
      readingDirection: b.language === 'en' ? 'left' : 'right',
      widthCm: PRINT_TRIM_MM / 10,
      heightCm: PRINT_TRIM_MM / 10,
      bleed: PRINT_BLEED_MM > 0,
      coverPath: b.coverPath,
      interiorPath: b.interiorPath,
    });
    items.push({ bookId, quantity: 1 });
    registered.push({ externalId: b.externalId, bookId, title: b.title });
  }
  const reference = books.map((b) => b.externalId.slice(-8)).join('+').slice(0, 100);
  const { jobId } = await createPrintOrder(items, shipping, reference);
  console.log(`[BookPod] batch job ${jobId}: ${registered.length} book(s) — ${registered.map((b) => b.title).join(', ')}`);
  return { jobId, books: registered };
}

/** Where a story's print PDFs live once they have been built. */
export function storyPrintPaths(storyId: string): { coverPath: string; interiorPath: string } {
  return {
    coverPath: pdfFolderPath('print', `${storyId}-cover.pdf`),
    interiorPath: pdfFolderPath('print', `${storyId}-interior.pdf`),
  };
}

/** Which of these stories already have both print PDFs in the bucket. */
export async function storiesPrintReadiness(storyIds: string[]): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  await Promise.all(storyIds.map(async (id) => {
    const { coverPath, interiorPath } = storyPrintPaths(id);
    const [cover, interior] = await Promise.all([objectExists(coverPath), objectExists(interiorPath)]);
    out[id] = cover && interior;
  }));
  return out;
}

/**
 * Send several READY-LIBRARY books (الكتب الجاهزة) to BookPod as one print order.
 *
 * Unlike an order, a library book has nowhere to record a print URL, so its PDFs
 * are located by convention at magic-fanoose/print/<storyId>-{cover,interior}.pdf
 * — the same path a rebuild writes. Books whose files are not there are named in
 * the error rather than silently skipped: a batch that quietly prints four of
 * five books is worse than one that refuses.
 */
export async function submitStoriesToBookPodTogether(
  storyIds: string[],
  shipping: BookPodShipping
): Promise<{ jobId: string; books: { storyId: string; bookId: string; title: string }[] }> {
  if (!isBookPodConfigured()) {
    throw new Error('BookPod is not configured on the server (missing BOOKPOD_USER_ID / BOOKPOD_TOKEN).');
  }
  if (!storyIds.length) throw new Error('No books selected.');

  const prepared: BatchBookInput[] = [];
  const missing: string[] = [];
  for (const id of storyIds) {
    const story = await Story.findById(id);
    if (!story) throw new Error(`Story ${id} not found`);
    story.childName = localizeName(story.childName, (story as any).language || 'ar');
    const { coverPath, interiorPath } = storyPrintPaths(id);
    const [hasCover, hasInterior] = await Promise.all([objectExists(coverPath), objectExists(interiorPath)]);
    const opts = reconstructPrintOpts(story);
    if (!hasCover || !hasInterior) { missing.push(`${story.childName} — ${opts.title}`); continue; }
    prepared.push({
      externalId: `story-${id}`,
      title: opts.title,
      isColoring: !!opts.isColoring,
      language: (story as any).language || 'ar',
      coverPath,
      interiorPath,
    });
  }
  if (missing.length) {
    throw new Error(`ملفات الطباعة غير جاهزة لـ: ${missing.join('، ')} — جهّزها أولاً ثم أعد المحاولة.`);
  }

  const { jobId, books } = await registerAndOrderTogether(prepared, shipping);
  return { jobId, books: books.map((b) => ({ storyId: b.externalId.replace(/^story-/, ''), bookId: b.bookId, title: b.title })) };
}

export interface BulkPrintResult {
  jobId: string;
  books: { orderId: string; bookId: string; title: string }[];
}

/**
 * Send SEVERAL finished orders to BookPod as ONE print order.
 *
 * Two things make this different from submitting orders one by one:
 *  - One BookPod order, one delivery. The books share `shipping`, so this is for
 *    a batch the owner collects (or has sent to one address) and hands out
 *    himself — BookPod bills shipping per order, not per book.
 *  - It REUSES each order's existing print PDFs instead of rebuilding them.
 *    Rebuilding is what gets OOM-killed on the 512MB instance, and rebuilding a
 *    file the owner has already checked is a way to print something he never saw.
 *
 * Nothing is submitted unless every selected order already has its files.
 */
export async function submitOrdersToBookPodTogether(
  orderIds: string[],
  shipping: BookPodShipping
): Promise<BulkPrintResult> {
  if (!isBookPodConfigured()) {
    throw new Error('BookPod is not configured on the server (missing BOOKPOD_USER_ID / BOOKPOD_TOKEN).');
  }
  if (!orderIds.length) throw new Error('No orders selected.');

  // Load and validate EVERYTHING first: a half-sent batch would leave some
  // orders billed and printing while the owner is looking at an error.
  const prepared: { order: IOrder; story: IStory; title: string; isColoring: boolean; coverPath: string; interiorPath: string }[] = [];
  for (const id of orderIds) {
    const order = await Order.findById(id);
    if (!order) throw new Error(`Order ${id} not found`);
    const short = String(order._id).slice(-8).toUpperCase();
    if (order.bookpodJobId) {
      throw new Error(`#${short} was already sent to BookPod (job ${order.bookpodJobId}).`);
    }
    const coverPath = printObjectPath(order.printCoverUrl);
    const interiorPath = printObjectPath(order.printInteriorUrl);
    if (!coverPath || !interiorPath) {
      throw new Error(`#${short} has no print files yet — prepare its files first.`);
    }
    const story = await Story.findById(order.storyId);
    if (!story) throw new Error(`Story for #${short} not found`);
    story.childName = localizeName(story.childName, (story as any).language || 'ar');
    const opts = reconstructPrintOpts(story);
    prepared.push({ order, story, title: opts.title, isColoring: !!opts.isColoring, coverPath, interiorPath });
  }

  const { jobId, books } = await registerAndOrderTogether(
    prepared.map((p) => ({
      externalId: String(p.order._id),
      title: p.title,
      isColoring: p.isColoring,
      language: (p.story as any).language || 'ar',
      coverPath: p.coverPath,
      interiorPath: p.interiorPath,
    })),
    shipping,
  );

  for (const p of prepared) {
    p.order.bookpodJobId = jobId;
    p.order.bookpodStatus = 'submitted';
    await p.order.save();
  }
  return { jobId, books: books.map((b) => ({ orderId: b.externalId, bookId: b.bookId, title: b.title })) };
}

/**
 * Admin: rebuild ONLY the Pro coloring book's print files (no BookPod submit).
 * Free — reuses the stored coloring images.
 */
export async function reRenderColoringForOrder(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  const story = await Story.findById(order.storyId);
  if (!story) throw new Error(`Story ${order.storyId} for order ${orderId} not found`);
  story.childName = localizeName(story.childName, (story as any).language || 'ar');
  const urls = await buildColoringPrintForOrder(story);
  order.coloringPrintCoverUrl = urls.coverUrl;
  order.coloringPrintInteriorUrl = urls.interiorUrl;
  await order.save();
  return order;
}

/**
 * Admin: submit ONLY the Pro coloring book to BookPod for an existing order
 * (a separate print job from the story book).
 */
export async function submitColoringForOrder(orderId: string): Promise<IOrder> {
  const order = await Order.findById(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  const story = await Story.findById(order.storyId);
  if (!story) throw new Error(`Story ${order.storyId} for order ${orderId} not found`);
  story.childName = localizeName(story.childName, (story as any).language || 'ar');
  const res = await printAndSubmitColoringForOrder(order, story);
  order.coloringPrintCoverUrl = res.urls.coverUrl;
  order.coloringPrintInteriorUrl = res.urls.interiorUrl;
  if (res.jobId) order.coloringBookpodJobId = res.jobId;
  await order.save();
  if (!res.submitted) {
    throw new Error('Coloring files were rebuilt but BookPod did not accept the job. Check credentials/logs.');
  }
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
    // Print choices for this one book, passed straight to BookPod.
    printColor?: 'bw' | 'color'; sheetType?: 'white110' | 'chromo170'; lamination?: 'none' | 'flat' | 'matt';
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
  // The owner's per-book print choices ride on top of whatever this book type
  // would have used by default.
  const opts = reconstructPrintOpts(pseudoStory);
  if (input.printColor) (opts as any).printColor = input.printColor;
  if (input.sheetType) (opts as any).sheetType = input.sheetType;
  if (input.lamination) (opts as any).lamination = input.lamination;
  return printAndSubmitForOrder(pseudoOrder, pseudoStory, opts);
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
  // Render the child's name in the book's language for print (e.g. "Baha" -> "بهاء").
  story.childName = localizeName(story.childName, (story as any).language || 'ar');
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
  // PRO bundle: also print the coloring book as a second BookPod job.
  await maybeSubmitProColoring(order, story);

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
        // The trailing rule used to be a bare "no text." — Gemini wrote straight
        // through it and baked invented Arabic letters into a paid customer's
        // page. NO_TEXT_RULE names the surfaces it likes to letter.
        `Children's book illustration of ${childName}, whose face clearly resembles the reference photograph — ` +
        `the SAME child and outfit on every page. Scene: ${substituteName(t?.content || '', childName)}. ` +
        `Soft pastel storybook style, square 1:1. ${NO_TEXT_RULE}`,
    });
  }
  return pairs;
}

function extractPairsFromAi(story: { generatedText?: string; childName: string; childAge: string; childGender: 'male' | 'female'; theme: string; language: 'ar' | 'en' | 'he' }): PagePair[] {
  const textChunks = splitStoryIntoPages(story.generatedText || '', ILLUSTRATION_PAGES);
  return textChunks.map((chunk, i) => ({
    text: chunk,
    imagePrompt: buildIllustrationPrompt({
      pageText: chunk,
      childName: story.childName,
      childAge: story.childAge,
      childGender: story.childGender,
      theme: story.theme,
      language: story.language,
      pageNumber: i + 1,
    }),
  }));
}

