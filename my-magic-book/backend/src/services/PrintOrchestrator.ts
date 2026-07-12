import { IOrder } from '../models/Order';
import { IStory } from '../models/Story';
import User from '../models/User';
import {
  buildColoringPrintFiles,
  buildStoryPrintFiles,
  uploadPrintFiles,
  PrintUrls,
} from './PrintService';
import { isBookPodConfigured, submitPrintJob } from './BookPodService';

export interface PrintBuildOpts {
  isColoring: boolean;
  title: string;
  pageTexts?: string[]; // story interior texts (ignored for coloring)
  // Localized front/back matter (story books only).
  childPhotoPath?: string;
  dedication?: string;
  moral?: string;
  conclusion?: string;
  questions?: string[];
}

/** Build the wraparound cover + interior PDFs for a story and upload them. */
export async function buildPrintFilesForStory(
  story: IStory,
  opts: PrintBuildOpts
): Promise<PrintUrls> {
  const front = story.generatedCover;
  const back = story.generatedPortrait;
  const images = story.generatedImages || [];
  if (!front || !back || images.length === 0) {
    throw new Error('cannot build print files: story is missing generatedCover/Portrait/Images');
  }

  const files = opts.isColoring
    ? await buildColoringPrintFiles({
        title: opts.title,
        childName: story.childName,
        coverPath: front,
        pagePaths: images,
        backPath: back,
      })
    : await buildStoryPrintFiles({
        title: opts.title,
        childName: story.childName,
        coverPath: front,
        backPath: back,
        imagePaths: images,
        pageTexts: opts.pageTexts || images.map(() => ''),
        childPhotoPath: opts.childPhotoPath,
        dedication: opts.dedication,
        moral: opts.moral,
        conclusion: opts.conclusion,
        questions: opts.questions,
        theme: (story as any).theme,
        rtl: ((story as any).language || 'ar') !== 'en',
      });

  return uploadPrintFiles(String(story._id), files);
}

export interface PrintSubmitResult {
  urls: PrintUrls;
  jobId?: string;
  submitted: boolean;
}

/**
 * Builds the print files for a paid order and, if BookPod is configured,
 * submits the print job. If BookPod isn't configured yet, it still builds and
 * uploads the files (so they're ready) and just skips the submission.
 */
export async function printAndSubmitForOrder(
  order: IOrder,
  story: IStory,
  opts: PrintBuildOpts
): Promise<PrintSubmitResult> {
  const urls = await buildPrintFilesForStory(story, opts);

  if (!isBookPodConfigured()) {
    console.log(
      `[Print] order ${order._id}: print files built (not submitting — BookPod not configured).\n` +
      `        cover:    ${urls.coverUrl}\n` +
      `        interior: ${urls.interiorUrl} (${urls.interiorPages}pp, spine ${urls.spineMm}mm)`
    );
    return { urls, submitted: false };
  }

  const sa = order.shippingAddress;
  const user = await User.findById(order.userId).select('email name').lean();
  const lang = (story as any).language || 'ar';
  const floorNum = sa?.floor ? Number(String(sa.floor).replace(/\D/g, '')) : undefined;

  const res = await submitPrintJob({
    externalId: String(order._id),
    title: opts.title,
    author: 'Magic Fanoos',
    isColoring: opts.isColoring,
    readingDirection: lang === 'en' ? 'left' : 'right', // ar/he are RTL
    widthCm: urls.trimMm / 10,
    heightCm: urls.trimMm / 10,
    bleed: urls.bleedMm > 0,
    coverPath: urls.coverPath,
    interiorPath: urls.interiorPath,
    quantity: 1,
    totalPrice: order.totalPrice,
    shipping: {
      method: sa?.deliveryMethod === 'pickup' ? 'pickup' : 'delivery',
      name: sa?.fullName || '',
      phone: sa?.phone || '',
      email: (user as any)?.email || '',
      city: sa?.city,
      street: sa?.street,
      house: sa?.buildingNo,
      floor: Number.isFinite(floorNum) ? floorNum : undefined,
      zipCode: sa?.postalCode,
      notes: sa?.notes || sa?.pickupLocation,
    },
  });

  return { urls, jobId: res.jobId, submitted: true };
}

/**
 * PRO bundle: build + submit the COLORING book as a SECOND BookPod job for the
 * same order. Reads the coloring artifacts (coloringCover/Images/BackCover),
 * uploads under a `<storyId>-coloring` path and submits with a
 * `<orderId>-coloring` external id so it's a distinct print job.
 */
export async function printAndSubmitColoringForOrder(
  order: IOrder,
  story: IStory
): Promise<PrintSubmitResult> {
  const cover = (story as any).coloringCover as string | undefined;
  const images = ((story as any).coloringImages as string[]) || [];
  const back = (story as any).coloringBackCover as string | undefined;
  if (!cover || images.length === 0) {
    throw new Error('cannot print coloring: story is missing coloringCover/coloringImages');
  }

  const title = `${story.childName} — كتاب تلوين`;
  const files = await buildColoringPrintFiles({
    title,
    childName: story.childName,
    coverPath: cover,
    pagePaths: images,
    backPath: back || cover,
  });
  const urls = await uploadPrintFiles(`${String(story._id)}-coloring`, files);

  if (!isBookPodConfigured()) {
    console.log(`[Print] order ${order._id}: coloring print built (BookPod not configured, not submitting).`);
    return { urls, submitted: false };
  }

  const sa = order.shippingAddress;
  const user = await User.findById(order.userId).select('email name').lean();
  const lang = (story as any).language || 'ar';
  const floorNum = sa?.floor ? Number(String(sa.floor).replace(/\D/g, '')) : undefined;

  const res = await submitPrintJob({
    externalId: `${String(order._id)}-coloring`,
    title,
    author: 'Magic Fanoos',
    isColoring: true,
    readingDirection: lang === 'en' ? 'left' : 'right',
    widthCm: urls.trimMm / 10,
    heightCm: urls.trimMm / 10,
    bleed: urls.bleedMm > 0,
    coverPath: urls.coverPath,
    interiorPath: urls.interiorPath,
    quantity: 1,
    totalPrice: 0,
    shipping: {
      method: sa?.deliveryMethod === 'pickup' ? 'pickup' : 'delivery',
      name: sa?.fullName || '',
      phone: sa?.phone || '',
      email: (user as any)?.email || '',
      city: sa?.city,
      street: sa?.street,
      house: sa?.buildingNo,
      floor: Number.isFinite(floorNum) ? floorNum : undefined,
      zipCode: sa?.postalCode,
      notes: sa?.notes || sa?.pickupLocation,
    },
  });

  return { urls, jobId: res.jobId, submitted: true };
}
