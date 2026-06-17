import Order, { IOrder } from '../models/Order';
import Story from '../models/Story';
import { generateIllustration } from './ImageGenerator';
import { buildBookHtml, BookData } from './HtmlTemplateBuilder';
import { generateBookPdf } from './PdfGenerator';
import { uploadBuffer, pdfFolderPath } from './StorageService';
import { splitStoryIntoPages, buildIllustrationPrompt } from './promptBuilder';

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
    // Build the 13 (text, image-prompt) pairs depending on mode.
    //   - 'template': honor the handwritten pages from the wizard; image prompts
    //                 come from the author's hand-crafted `prompt` field.
    //   - 'ai'     : the AI text is split into 13 chunks; each chunk gets a
    //                 derived prompt from promptBuilder.
    const pairs = story.mode === 'template' && Array.isArray(story.templatePages) && story.templatePages.length > 0
      ? extractPairsFromTemplate(story.templatePages, story.childName)
      : extractPairsFromAi(story);

    // Generate the 13 illustrations, one per pair.
    const imageUrls: string[] = [];
    for (let i = 0; i < ILLUSTRATION_PAGES; i++) {
      const stored = await generateIllustration(pairs[i].imagePrompt, story.childPhotoUrl || '', {
        storyId: String(story._id),
        pageNumber: i + 1,
      });
      imageUrls.push(stored.signedUrl || stored.gcsUri);
    }

    // Assemble pages alternating text/image like the existing PDF layout.
    const pages: BookData['pages'] = [];
    for (let i = 0; i < ILLUSTRATION_PAGES; i++) {
      pages.push({ type: 'text', content: pairs[i].text });
      pages.push({ type: 'image', imageUrl: imageUrls[i] });
    }

    const bookData: BookData = {
      childName: story.childName,
      childPhotoUrl: story.childPhotoUrl || '',
      storyTitle: `${story.childName} ${story.theme}`,
      coverImageUrl: story.coverImageUrl || imageUrls[0] || '',
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

    return order;
  } catch (err: any) {
    console.error(`[BookBuilder] order ${orderId} failed:`, err);
    order.illustrationsStatus = 'failed';
    order.illustrationsError = err.message?.slice(0, 500) || 'unknown error';
    await order.save();
    throw err;
  }
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

