import { PDFDocument } from 'pdf-lib';

/**
 * Re-impose an existing PDF onto a different trim size, ready for print.
 *
 * This is for books the owner already has as a finished PDF — their own titles,
 * a public-domain work, or a customer's manuscript they are printing as a
 * service — rather than the generated Magic Fanoos books, which are laid out
 * from scratch by PrintService.
 *
 * What it does NOT do is re-flow text. A supplied PDF's text is often a
 * non-Unicode font (Arabic exports especially), so the words cannot be reliably
 * extracted and re-set. Each page is scaled to fit the new trim and centred
 * instead, which is faithful for a reprint but shifts the margins whenever the
 * source and target proportions differ. `fitScale` reports that difference so
 * the caller can warn rather than surprising anyone at the printer.
 */

const MM_PER_PT = 25.4 / 72;
const mmToPt = (mm: number) => mm / MM_PER_PT;

export interface ImportedBookInfo {
  pageCount: number;
  sourceWidthMm: number;
  sourceHeightMm: number;
}

export interface ReimposeOpts {
  /** Finished trim, e.g. 150 x 220. */
  widthMm: number;
  heightMm: number;
  /** Printer bleed added on every side. BookPod uses 3mm, same as our own books. */
  bleedMm?: number;
}

export interface ReimposeResult {
  pdf: Buffer;
  pageCount: number;
  sourceWidthMm: number;
  sourceHeightMm: number;
  /** How much each source page had to shrink to fit. 1 = no change. */
  fitScale: number;
  /** True when source and target proportions differ enough to move the margins. */
  aspectChanged: boolean;
}

/** Page count and trim of a supplied PDF, without modifying it. */
export async function inspectPdf(input: Buffer): Promise<ImportedBookInfo> {
  const doc = await PDFDocument.load(input, { ignoreEncryption: true });
  const first = doc.getPage(0);
  return {
    pageCount: doc.getPageCount(),
    sourceWidthMm: round1(first.getWidth() * MM_PER_PT),
    sourceHeightMm: round1(first.getHeight() * MM_PER_PT),
  };
}

export async function reimposePdf(input: Buffer, opts: ReimposeOpts): Promise<ReimposeResult> {
  const { widthMm, heightMm, bleedMm = 3 } = opts;
  if (!(widthMm > 0 && heightMm > 0)) throw new Error('trim size must be positive');

  const src = await PDFDocument.load(input, { ignoreEncryption: true });
  const out = await PDFDocument.create();

  const sheetW = mmToPt(widthMm + bleedMm * 2);
  const sheetH = mmToPt(heightMm + bleedMm * 2);

  const first = src.getPage(0);
  const srcW = first.getWidth();
  const srcH = first.getHeight();
  // Contain, never crop: losing a line of text off the edge is worse than a
  // wider margin, and a supplied book has no safe area we can assume.
  const fitScale = Math.min(sheetW / srcW, sheetH / srcH);
  const srcAspect = srcW / srcH;
  const dstAspect = sheetW / sheetH;
  const aspectChanged = Math.abs(srcAspect - dstAspect) > 0.01;

  const embedded = await out.embedPdf(src, src.getPageIndices());
  for (const page of embedded) {
    const sheet = out.addPage([sheetW, sheetH]);
    // Each page is measured on its own — a scanned book often has one odd page
    // (a fold-out, a rotated plate) and forcing the first page's scale on it
    // would crop exactly the page someone cared about.
    const s = Math.min(sheetW / page.width, sheetH / page.height);
    const w = page.width * s;
    const h = page.height * s;
    sheet.drawPage(page, {
      width: w,
      height: h,
      x: (sheetW - w) / 2,
      y: (sheetH - h) / 2,
    });
  }

  return {
    pdf: Buffer.from(await out.save()),
    pageCount: src.getPageCount(),
    sourceWidthMm: round1(srcW * MM_PER_PT),
    sourceHeightMm: round1(srcH * MM_PER_PT),
    fitScale: Math.round(fitScale * 1000) / 1000,
    aspectChanged,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Split a re-imposed book into the two files BookPod's API wants: a cover and
 * an interior. Their create-book step takes them separately — one combined PDF
 * is not something it accepts.
 *
 * Without a supplied cover we take page 1, which is what a single-file export
 * of a finished book almost always is. That is a FRONT cover only: a printer's
 * wraparound also carries the spine and back, so a book sent this way gets the
 * front artwork and nothing on the spine. Said plainly in the dashboard rather
 * than discovered on the delivered copies.
 */
export async function splitCoverInterior(
  reimposed: Buffer,
): Promise<{ cover: Buffer; interior: Buffer; interiorPages: number }> {
  const src = await PDFDocument.load(reimposed, { ignoreEncryption: true });
  const total = src.getPageCount();
  if (total < 2) throw new Error('a book needs at least 2 pages to split into cover + interior');

  const coverDoc = await PDFDocument.create();
  const [c] = await coverDoc.copyPages(src, [0]);
  coverDoc.addPage(c);

  const interiorDoc = await PDFDocument.create();
  const rest = await interiorDoc.copyPages(src, src.getPageIndices().slice(1));
  for (const p of rest) interiorDoc.addPage(p);

  return {
    cover: Buffer.from(await coverDoc.save()),
    interior: Buffer.from(await interiorDoc.save()),
    interiorPages: total - 1,
  };
}
