import sharp from 'sharp';
import puppeteer from 'puppeteer';
import { Storage } from '@google-cloud/storage';
import { uploadBuffer, pdfFolderPath } from './StorageService';

// ─── Print pipeline ──────────────────────────────────────────────────────────
// Turns the (screen-resolution) AI images into high-resolution, print-ready
// PDFs for BookPod. The web viewer keeps using the small images; only the
// printed PDFs get the upscaled, full-bleed versions.
//
// BookPod expects (per the shop owner):
//   • cover as a WRAPAROUND (back + spine + front in one landscape page)
//   • interior as a SEPARATE file, page count an even multiple of 4
//   • files fetched from a public URL
//   • 220×220 mm trim + 3 mm bleed

export const PRINT_TRIM_MM = 220;          // final cut size
export const PRINT_BLEED_MM = 3;           // extra art past the cut on each side
export const PRINT_PAGE_MM = PRINT_TRIM_MM + PRINT_BLEED_MM * 2; // 226 (interior pages)
export const PRINT_SAFE_MM = PRINT_BLEED_MM + 5;                 // keep text inside this margin
export const PRINT_PX = 2700;              // ~300 DPI at 226 mm
// Per-interior-page thickness used to estimate the spine. BookPod's template is
// authoritative — override per build or via env once you have their number.
export const PRINT_PAGE_THICKNESS_MM = Number(process.env.PRINT_PAGE_THICKNESS_MM || 0.13);

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'first-webapp-storage';
const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const bucket = storage.bucket(BUCKET_NAME);

export function spineWidthMm(interiorPages: number): number {
  return Math.max(1, Math.round(interiorPages * PRINT_PAGE_THICKNESS_MM * 10) / 10);
}

/** Public URL BookPod can fetch a stored object from (via our image/PDF proxy). */
export function publicProxyUrl(objectPath: string): string {
  const base = process.env.PUBLIC_API_URL || 'http://localhost:5001/api';
  return `${base}/uploads/image?path=${encodeURIComponent(objectPath)}`;
}

export async function downloadObject(objectPath: string): Promise<Buffer> {
  const [buf] = await bucket.file(objectPath).download();
  return buf;
}

export interface UpscaleOpts {
  lineArt?: boolean;
  px?: number;
}

export async function upscaleForPrint(
  input: Buffer,
  opts: UpscaleOpts = {}
): Promise<{ buffer: Buffer; mime: string }> {
  const px = opts.px ?? PRINT_PX;
  let pipe = sharp(input)
    .flatten({ background: '#ffffff' })
    .resize(px, px, { fit: 'cover', position: 'centre', kernel: sharp.kernel.lanczos3 });

  if (opts.lineArt) {
    pipe = pipe.linear(1.12, -12).sharpen({ sigma: 1.2 });
    const buffer = await pipe.png({ compressionLevel: 9 }).toBuffer();
    return { buffer, mime: 'image/png' };
  }
  pipe = pipe.sharpen({ sigma: 0.8 });
  const buffer = await pipe.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
  return { buffer, mime: 'image/jpeg' };
}

function dataUri(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

// ─── shared styles + interior page fragments ─────────────────────────────────

const SHARED_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: 'Cairo', sans-serif; }
  .page { width: ${PRINT_PAGE_MM}mm; height: ${PRINT_PAGE_MM}mm; position: relative; overflow: hidden; background: #fff; page-break-after: always; }
  .page:last-child { page-break-after: avoid; }
  .page-cream { background: #fcfaf2; }
  .center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: ${PRINT_SAFE_MM + 8}mm; text-align: center; }
  .bleed { width: 100%; height: 100%; object-fit: cover; display: block; }
  .overlay { position: absolute; left: 0; right: 0; padding: 0 ${PRINT_SAFE_MM + 4}mm; }
  .overlay-bottom { bottom: 0; padding-bottom: ${PRINT_SAFE_MM + 4}mm; padding-top: 18mm; background: linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.35), transparent); text-align: center; }
  .cover-title { font-weight: 900; color: #fff; font-size: 34pt; line-height: 1.15; text-shadow: 0 3px 10px rgba(0,0,0,0.9); }
  .cover-sub { font-weight: 700; color: #ffd479; font-size: 13pt; margin-top: 4mm; }
  .back-title { font-weight: 900; color: #fff; font-size: 24pt; text-shadow: 0 3px 10px rgba(0,0,0,0.9); }
  .story-text { font-weight: 700; color: #0a1628; font-size: 26pt; line-height: 1.9; }
  .end-mark { font-weight: 900; color: #b8860b; font-size: 30pt; margin-bottom: 8mm; }
  .ded-photo { width: 60mm; height: 60mm; border-radius: 50%; object-fit: cover; border: 3mm solid #F5A623; margin-bottom: 12mm; }
  .ded-text { font-weight: 700; color: #0a1628; font-size: 22pt; line-height: 1.7; width: 80%; }
`;

function linePageHtml(src: string): string {
  return `<div class="page"><img class="bleed" src="${src}" alt="" /></div>`;
}
function dedicationPageHtml(photoSrc: string, childName: string): string {
  return `<div class="page page-cream center"><img class="ded-photo" src="${photoSrc}" alt="${childName}" /><div class="ded-text">إلى البطل الرائع ${childName},<br/>نتمنى أن تكون حياتك مليئة بالمغامرات والسعادة.</div></div>`;
}
function storyTextPageHtml(text: string): string {
  return `<div class="page page-cream center"><div class="story-text">${text}</div></div>`;
}
function blankPageHtml(): string {
  return `<div class="page"></div>`;
}
function padToMultipleOf4(pages: string[]): string[] {
  const out = [...pages];
  while (out.length % 4 !== 0) out.push(blankPageHtml());
  return out;
}

function squareDoc(pagesHtml: string[]): string {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap" rel="stylesheet" />
<style>@page { size: ${PRINT_PAGE_MM}mm ${PRINT_PAGE_MM}mm; margin: 0; } ${SHARED_CSS}</style>
</head><body>${pagesHtml.join('\n')}</body></html>`;
}

// ─── Wraparound cover ────────────────────────────────────────────────────────

interface WraparoundDocArgs {
  frontSrc: string;
  backSrc: string;
  title: string;
  childName: string;
  kind: 'coloring' | 'story';
  rtl: boolean;
  spineMm: number;
  widthMm: number;
  heightMm: number;
  panelWmm: number;
}

function wraparoundDoc(a: WraparoundDocArgs): string {
  const sub = a.kind === 'coloring' ? '🖍️ كتاب تلوين · Magic Fanoose' : '✨ Magic Fanoose';
  const frontPanel = `<div class="panel">
    <img class="bleed" src="${a.frontSrc}" alt="front" />
    <div class="overlay overlay-bottom"><div class="cover-title">${a.title}</div><div class="cover-sub">${sub}</div></div>
  </div>`;
  const backOverlay =
    a.kind === 'coloring'
      ? `<div class="overlay overlay-bottom"><div class="back-title">🌟 أحسنت يا ${a.childName}!</div></div>`
      : ''; // story back cover = portrait image only, no text
  const backPanel = `<div class="panel">
    <img class="bleed" src="${a.backSrc}" alt="back" />
    ${backOverlay}
  </div>`;
  const spineText = a.spineMm >= 8 ? `<div class="spine-text">${a.title}</div>` : '';
  const spinePanel = `<div class="spine">${spineText}</div>`;
  // Lay panels left→right. Arabic (rtl) books read right-to-left, so the FRONT
  // cover sits on the LEFT of the flat wraparound and the BACK on the RIGHT.
  const order = a.rtl ? [frontPanel, spinePanel, backPanel] : [backPanel, spinePanel, frontPanel];
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8" />
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700;900&display=swap" rel="stylesheet" />
<style>
  @page { size: ${a.widthMm}mm ${a.heightMm}mm; margin: 0; }
  ${SHARED_CSS}
  .wrap { width: ${a.widthMm}mm; height: ${a.heightMm}mm; display: flex; }
  .panel { position: relative; width: ${a.panelWmm}mm; height: ${a.heightMm}mm; overflow: hidden; background: #fff; }
  .spine { width: ${a.spineMm}mm; height: ${a.heightMm}mm; background: #0a1628; display: flex; align-items: center; justify-content: center; }
  .spine-text { color: #fff; font-weight: 900; font-size: 12pt; writing-mode: vertical-rl; white-space: nowrap; }
</style>
</head><body><div class="wrap" dir="ltr">${order.join('')}</div></body></html>`;
}

export async function renderPrintPdf(html: string, widthMm = PRINT_PAGE_MM, heightMm = PRINT_PAGE_MM): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    });
    const pdf = await page.pdf({ printBackground: true, width: `${widthMm}mm`, height: `${heightMm}mm` });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export interface WraparoundInput {
  title: string;
  childName: string;
  frontPath: string;
  backPath: string;
  interiorPages: number;
  kind: 'coloring' | 'story';
  spineMm?: number;
  rtl?: boolean;
}

export interface WraparoundResult {
  pdf: Buffer;
  widthMm: number;
  heightMm: number;
  spineMm: number;
}

export async function buildWraparoundCoverPdf(o: WraparoundInput): Promise<WraparoundResult> {
  const front = await upscaleForPrint(await downloadObject(o.frontPath));
  const back = await upscaleForPrint(await downloadObject(o.backPath));
  const spineMm = o.spineMm ?? spineWidthMm(o.interiorPages);
  const panelWmm = PRINT_TRIM_MM + PRINT_BLEED_MM;            // 220 + outer bleed
  const widthMm = 2 * PRINT_TRIM_MM + 2 * PRINT_BLEED_MM + spineMm;
  const heightMm = PRINT_PAGE_MM;
  const html = wraparoundDoc({
    frontSrc: dataUri(front.buffer, front.mime),
    backSrc: dataUri(back.buffer, back.mime),
    title: o.title,
    childName: o.childName,
    kind: o.kind,
    rtl: o.rtl !== false,
    spineMm,
    widthMm,
    heightMm,
    panelWmm,
  });
  const pdf = await renderPrintPdf(html, widthMm, heightMm);
  return { pdf, widthMm, heightMm, spineMm };
}

// ─── Print file bundles (wraparound cover + square interior) ─────────────────

export interface PrintFiles {
  coverPdf: Buffer;
  interiorPdf: Buffer;
  interiorPages: number;
  coverWidthMm: number;
  coverHeightMm: number;
  spineMm: number;
}

export interface ColoringPrintInput {
  title: string;
  childName: string;
  coverPath: string;
  pagePaths: string[];
  backPath: string;
}

export async function buildColoringPrintFiles(input: ColoringPrintInput): Promise<PrintFiles> {
  const lines = await Promise.all(
    input.pagePaths.map(async (p) => upscaleForPrint(await downloadObject(p), { lineArt: true }))
  );
  const interior = padToMultipleOf4(lines.map((u) => linePageHtml(dataUri(u.buffer, u.mime))));
  const interiorPdf = await renderPrintPdf(squareDoc(interior));

  const cover = await buildWraparoundCoverPdf({
    title: input.title,
    childName: input.childName,
    frontPath: input.coverPath,
    backPath: input.backPath,
    interiorPages: interior.length,
    kind: 'coloring',
  });

  return {
    coverPdf: cover.pdf,
    interiorPdf,
    interiorPages: interior.length,
    coverWidthMm: cover.widthMm,
    coverHeightMm: cover.heightMm,
    spineMm: cover.spineMm,
  };
}

export interface StoryPrintInput {
  title: string;
  childName: string;
  childPhotoPath?: string;
  coverPath: string;
  backPath: string;
  imagePaths: string[];
  pageTexts: string[];
}

export async function buildStoryPrintFiles(input: StoryPrintInput): Promise<PrintFiles> {
  const images = await Promise.all(input.imagePaths.map(async (p) => upscaleForPrint(await downloadObject(p))));
  const photoSrc = input.childPhotoPath
    ? dataUri(...(await (async () => {
        const u = await upscaleForPrint(await downloadObject(input.childPhotoPath!), { px: 900 });
        return [u.buffer, u.mime] as [Buffer, string];
      })()))
    : '';

  const interior: string[] = [];
  if (photoSrc) interior.push(dedicationPageHtml(photoSrc, input.childName));
  for (let i = 0; i < input.imagePaths.length; i++) {
    interior.push(storyTextPageHtml(input.pageTexts[i] || ''));
    interior.push(linePageHtml(dataUri(images[i].buffer, images[i].mime)));
  }
  const padded = padToMultipleOf4(interior);
  const interiorPdf = await renderPrintPdf(squareDoc(padded));

  const cover = await buildWraparoundCoverPdf({
    title: input.title,
    childName: input.childName,
    frontPath: input.coverPath,
    backPath: input.backPath,
    interiorPages: padded.length,
    kind: 'story',
  });

  return {
    coverPdf: cover.pdf,
    interiorPdf,
    interiorPages: padded.length,
    coverWidthMm: cover.widthMm,
    coverHeightMm: cover.heightMm,
    spineMm: cover.spineMm,
  };
}

// ─── Upload + return BookPod-fetchable URLs ─────────────────────────────────

export interface PrintUrls {
  coverUrl: string;
  interiorUrl: string;
  interiorPages: number;
  trimMm: number;
  bleedMm: number;
  coverWidthMm: number;
  coverHeightMm: number;
  spineMm: number;
}

export async function uploadPrintFiles(idKey: string, files: PrintFiles): Promise<PrintUrls> {
  const coverPath = pdfFolderPath('print', `${idKey}-cover.pdf`);
  const interiorPath = pdfFolderPath('print', `${idKey}-interior.pdf`);
  await uploadBuffer(files.coverPdf, coverPath, 'application/pdf');
  await uploadBuffer(files.interiorPdf, interiorPath, 'application/pdf');
  return {
    coverUrl: publicProxyUrl(coverPath),
    interiorUrl: publicProxyUrl(interiorPath),
    interiorPages: files.interiorPages,
    trimMm: PRINT_TRIM_MM,
    bleedMm: PRINT_BLEED_MM,
    coverWidthMm: files.coverWidthMm,
    coverHeightMm: files.coverHeightMm,
    spineMm: files.spineMm,
  };
}
