import { IOrder } from '../models/Order';
import { IStory } from '../models/Story';
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

  const res = await submitPrintJob({
    externalId: String(order._id),
    title: opts.title,
    quantity: 1,
    coverUrl: urls.coverUrl,
    interiorUrl: urls.interiorUrl,
    interiorPages: urls.interiorPages,
    trimMm: urls.trimMm,
    bleedMm: urls.bleedMm,
    shipping: order.shippingAddress
      ? {
          name: order.shippingAddress.fullName,
          line1: `${order.shippingAddress.street} ${order.shippingAddress.buildingNo || ''}`.trim(),
          line2: order.shippingAddress.district,
          city: order.shippingAddress.city,
          postcode: order.shippingAddress.postalCode,
          country: order.shippingAddress.country,
          phone: order.shippingAddress.phone,
        }
      : undefined,
  });

  return { urls, jobId: res.jobId, submitted: true };
}
