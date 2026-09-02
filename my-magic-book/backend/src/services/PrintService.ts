import sharp from 'sharp';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { Storage } from '@google-cloud/storage';
import { PDFDocument } from 'pdf-lib';
import { uploadBuffer, pdfFolderPath } from './StorageService';
import { imagenUpscale, resetUpscaleStats, getUpscaleStats } from './UpscaleService';

// The host is memory-constrained (512MB). Disable sharp's decoded-image cache and
// cap its worker threads so upscaling 15 print-res photos doesn't retain buffers
// or spike RAM across the batched interior render.
sharp.cache(false);
sharp.concurrency(1);

// QR code for the website, generated LOCALLY (embedded data URI) so the print
// render never waits on an external QR service — an external fetch could hang
// the Chromium render and 502 the request. Generated once and cached.
let _qrUri: string | null = null;
async function websiteQrDataUri(): Promise<string> {
  if (_qrUri !== null) return _qrUri;
  try {
    _qrUri = await QRCode.toDataURL('https://magicfanoos.com', {
      margin: 1, width: 300, color: { dark: '#0a1628ff', light: '#ffffffff' },
    });
  } catch (e: any) {
    console.warn('[PrintService] QR generation failed:', e?.message || e);
    _qrUri = '';
  }
  return _qrUri;
}

// The Magic Fanoos brand logo, embedded (base64) so the server-side PDF render
// can show it without a network fetch. Read once and cached.
let _logoDataUri: string | null = null;
function logoDataUri(): string {
  if (_logoDataUri !== null) return _logoDataUri;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'assets', 'logo.png'));
    _logoDataUri = `data:image/png;base64,${buf.toString('base64')}`;
  } catch (e: any) {
    console.warn('[PrintService] logo.png not found for cover:', e?.message || e);
    _logoDataUri = '';
  }
  return _logoDataUri;
}

// The magic-lamp emblem shown on the story text pages (embedded, cached).
let _lanternUri: string | null = null;
function lanternDataUri(): string {
  if (_lanternUri !== null) return _lanternUri;
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), 'assets', 'lantern.png'));
    _lanternUri = `data:image/png;base64,${buf.toString('base64')}`;
  } catch { _lanternUri = ''; }
  return _lanternUri;
}

// "More adventures" teasers shown on the back cover (Arabic print). We drop the
// teaser that matches the book's own theme so we never recommend the same story.
const BACK_TEASERS = [
  { id: 'space',  emoji: '🚀', ar: 'في الفضاء' },
  { id: 'school', emoji: '🏫', ar: 'في المدرسة' },
  { id: 'zoo',    emoji: '🦁', ar: 'في حديقة الحيوانات' },
  { id: 'ocean',  emoji: '🌊', ar: 'في أعماق المحيط' },
  { id: 'world',  emoji: '🌍', ar: 'حول العالم' },
];
const THEME_TEASER_EXCLUDE: Record<string, string> = {
  zoo_adventure: 'zoo', zoo_coloring: 'zoo',
  space: 'space', space_real: 'space', space_coloring: 'space',
  school_coloring: 'school',
};
function pickTeasers(theme?: string) {
  const drop = THEME_TEASER_EXCLUDE[theme || ''] || '';
  return BACK_TEASERS.filter((t) => t.id !== drop).slice(0, 3);
}

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
// Fallback/native size for non-photo assets (line art, the small back-cover kid
// photo inset). Source AI illustrations are ~864x1184px; 864 is their full native
// square with zero upscaling.
export const PRINT_PX = 864;
// Full-bleed STORY photo pages + the story cover are AI-upscaled (Imagen x3) to
// ~2592px first, then embedded at this size → ~300 DPI on a 22cm page. The single
// big Chromium render can't hold 13 of these in 512MB, so the interior is rendered
// in small batches and merged (renderPagesBatched) to keep peak memory bounded.
export const PRINT_PHOTO_PX = 2400;
// Interior pages rendered per Chromium pass. Each hi-res photo decodes to ~23MB;
// 3 pages (≤2 photos) keeps peak well under the 512MB host cap.
const RENDER_BATCH_PAGES = Number(process.env.PRINT_RENDER_BATCH_PAGES) || 3;
// How many illustrations to AI-upscale at once on a cold build. The upscale calls
// are network-bound (~30s each) and hold little RAM, so parallelising them cuts a
// first build from ~8 min to ~2. Kept modest to stay within Imagen's per-minute
// quota (429s are waited out + retried in UpscaleService).
const UPSCALE_CONCURRENCY = Number(process.env.GEMINI_UPSCALE_CONCURRENCY) || 4;

/**
 * The memory ceiling this process actually runs under, in MB — the CONTAINER's
 * limit, not the host's. `os.totalmem()` reports the whole machine on Render and
 * would happily claim 8GB on a 512MB instance.
 *
 * Returns 0 when it cannot be determined (a dev Mac, an unusual runtime), and
 * callers must treat 0 as "unknown, allow" — refusing to work on a box we simply
 * failed to measure would be worse than the crash we are avoiding.
 */
export function containerMemoryLimitMb(): number {
  try {
    const constrained = (process as any).constrainedMemory?.();
    if (constrained > 0) return Math.round(constrained / 1024 / 1024);
  } catch { /* not available on this runtime */ }
  // cgroup v2, then v1. "max" means no limit set.
  for (const file of ['/sys/fs/cgroup/memory.max', '/sys/fs/cgroup/memory/memory.limit_in_bytes']) {
    try {
      const raw = fs.readFileSync(file, 'utf8').trim();
      if (raw === 'max') return 0;
      const bytes = Number(raw);
      // v1 reports an absurd sentinel (~8EB) when unlimited.
      if (Number.isFinite(bytes) && bytes > 0 && bytes < 1024 ** 4) return Math.round(bytes / 1024 / 1024);
    } catch { /* try the next one */ }
  }
  return 0;
}

/**
 * What a full-colour story build needs, measured on the COMPILED build (an
 * earlier figure was taken through tsx, which compiles TypeScript in-process
 * and inflated it): ~150MB to load the build path, rising to ~360MB at the
 * cover — and Chromium renders alongside it in the same container. Collecting
 * garbage between phases reclaims nothing, so that is real usage, not a
 * high-water mark left behind.
 */
export const PRINT_STORY_MIN_MEMORY_MB = Number(process.env.PRINT_MIN_MEMORY_MB ?? 768);

/**
 * Refuse a story print build the box cannot finish.
 *
 * Without this the process is OOM-killed part-way through: the caller gets no
 * response at all (the browser reports it as a CORS failure, which sends the
 * owner hunting for a bug that isn't there), and — worse — the API is down for
 * ~20s for every customer on the site while it restarts. A clear refusal costs
 * nothing and breaks nothing.
 *
 * Set PRINT_MIN_MEMORY_MB=0 to disable once the box is big enough.
 */
export function assertCanBuildStoryPrint(): void {
  if (PRINT_STORY_MIN_MEMORY_MB <= 0) return;
  const limit = containerMemoryLimitMb();
  if (limit === 0 || limit >= PRINT_STORY_MIN_MEMORY_MB) return;
  throw new Error(
    `لا يمكن بناء ملفات الطباعة على هذا الخادم: الذاكرة المتاحة ${limit}MB والبناء يحتاج ~${PRINT_STORY_MIN_MEMORY_MB}MB. ` +
    `لو بدأ هنا لتوقّف الخادم في منتصفه وتعطّل الموقع للزوار لحوالي ٢٠ ثانية. ` +
    `جهّز الملفات من الجهاز (scripts/build-print-local.ts) ثم اربطها بالطلب، أو ارفع حجم الخادم.`
  );
}

// Log resident memory at a labelled point in the print build so an OOM kill's
// last line pinpoints where it died.
/**
 * Hand memory back between the heavy phases.
 *
 * The build's peak is not one phase needing a lot at once — it is each phase
 * leaving its pages behind for the next one. Sharp's decode buffers and V8's
 * old space both keep the high-water mark, so a build that never exceeds ~220MB
 * in any single step still reports 368MB by the cover. Collecting between
 * phases is what turns that into the number the phases actually need.
 *
 * Needs --expose-gc; without it this is a no-op and nothing breaks.
 */
export function reclaim(label: string): void {
  const before = process.memoryUsage().rss;
  try { (global as any).gc?.(); } catch { /* not exposed */ }
  const after = process.memoryUsage().rss;
  const mb = (n: number) => Math.round(n / 1024 / 1024);
  if (before !== after) console.log(`[Print][mem] ${label}: reclaimed ${mb(before)}MB → ${mb(after)}MB`);
}

export function logMem(label: string): void {
  const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
  console.log(`[Print][mem] ${label}: rss=${rssMb}MB`);
}
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
  // Prefer an explicit PUBLIC_API_URL; else use Render's auto-provided external
  // URL (so deployed links never point at localhost); local dev falls back last.
  const base =
    process.env.PUBLIC_API_URL ||
    (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/api` : 'http://localhost:5001/api');
  return `${base}/uploads/image?path=${encodeURIComponent(objectPath)}`;
}

export async function downloadObject(objectPath: string): Promise<Buffer> {
  const [buf] = await bucket.file(objectPath).download();
  return buf;
}

/** Normalize a stored image reference to a bucket object path. The wizard saves
 * child photos as `gs://<bucket>/<path>` URIs, but downloadObject needs just the
 * `<path>`. Plain object paths pass through unchanged. */
function toObjectPath(ref: string): string {
  if (ref.startsWith('gs://')) {
    const withoutScheme = ref.slice(5);
    const slash = withoutScheme.indexOf('/');
    return slash >= 0 ? withoutScheme.slice(slash + 1) : withoutScheme;
  }
  return ref;
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
  // Gentle unsharp mask for perceived clarity on the glossy 170gsm stock — enough
  // to crisp edges without haloing or altering the photo's actual content.
  pipe = pipe.sharpen({ sigma: 1.0 });
  const buffer = await pipe.jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
  return { buffer, mime: 'image/jpeg' };
}

function dataUri(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * The AI-upscaled (Imagen x3, ~300 DPI) version of a stored illustration, cached
 * in GCS next to the original as `<name>.x3.jpg` so each image is upscaled ONCE
 * and reused across preview / print / BookPod builds. On any upscaler failure the
 * original (native-res) buffer is returned and NOT cached, so a build never fails.
 */
// Images already upscaled on an earlier build come straight from GCS and never
// hit Imagen, so they are counted separately from this run's live attempts.
let _upscaleCacheHits = 0;

/**
 * One line saying whether the illustrations were genuinely AI-upscaled or fell
 * back to native resolution. `upscaleForPrint` still resizes everything to
 * PRINT_PHOTO_PX with Lanczos3, so a fallback build is ~277 DPI and prints
 * fine — it is softer, not undersized. Worth surfacing, not worth failing on.
 */
function logUpscaleSummary(): void {
  const { upscaled, nativeRes, reason } = getUpscaleStats();
  const done = upscaled + _upscaleCacheHits;
  if (!nativeRes) {
    console.log(`[Print] upscale OK — ${done} image(s) at x3 (${_upscaleCacheHits} cached).`);
    return;
  }
  console.warn(
    `[Print] UPSCALE DEGRADED — ${nativeRes} of ${done + nativeRes} image(s) fell back to native ` +
    `resolution (Lanczos-enlarged to ${PRINT_PHOTO_PX}px, ~277 DPI instead of ~310). Reason: ${reason}`
  );
}

async function hiResBuffer(objectPath: string): Promise<Buffer> {
  const cachePath = objectPath.replace(/\.(png|jpe?g|webp)$/i, '') + '.x3.jpg';
  try {
    const cached = await downloadObject(cachePath); // cache hit
    _upscaleCacheHits += 1;
    return cached;
  } catch { /* not cached yet — upscale below */ }

  const original = await downloadObject(objectPath);
  const upscaled = await imagenUpscale(original);
  if (upscaled !== original) {
    // Only cache a genuine upscale (imagenUpscale returns the same buffer on failure).
    try {
      await uploadBuffer(upscaled, cachePath, 'image/jpeg');
    } catch (e: any) {
      console.warn('[PrintService] hi-res cache upload skipped:', e?.message || e);
    }
  }
  return upscaled;
}

/** Run `fn` over `items` with at most `limit` in flight, preserving input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) || 1 }, worker));
  return results;
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
  /* Decorative story text page (matches the on-screen lantern card) */
  .stp-page { display: flex; align-items: center; justify-content: center; padding: 16mm; }
  .stp-card { position: relative; z-index: 1; width: 82%; background: radial-gradient(120% 90% at 50% 0%, #fffdf8 0%, #fdf4dd 70%, #f8ead0 100%); border-radius: 14mm; padding: 26mm 16mm 20mm; box-shadow: 0 8mm 18mm rgba(0,0,0,0.25); }
  .stp-card::before { content: ''; position: absolute; inset: 5mm; border: 0.8mm dashed rgba(201,150,40,0.6); border-radius: 10mm; }
  .stp-lantern { position: absolute; z-index: 2; top: -13mm; left: 50%; transform: translateX(-50%); width: 26mm; height: 26mm; border-radius: 50%; background-size: cover; background-position: center 42%; border: 1.4mm solid #fff; box-shadow: 0 0 8mm rgba(212,169,55,0.7); }
  .stp-lantern--emoji { background: radial-gradient(circle at 50% 35%, #fff6da, #f3d98f 70%, #d4a937); display: flex; align-items: center; justify-content: center; font-size: 26pt; }
  .stp-spark { position: absolute; z-index: 0; }
  .stp-spark svg { width: 100%; height: 100%; display: block; filter: drop-shadow(0 0 1.2mm rgba(255,255,255,0.55)); }
  .stp-divider { width: 34mm; height: 1mm; margin: 0 auto 8mm; border-radius: 2mm; background: linear-gradient(90deg, transparent, #d4a937, transparent); }
  .stp-txt { position: relative; font-weight: 700; color: #3a2c10; font-size: 23pt; line-height: 1.9; text-align: center; }
  .stp-corner { position: absolute; color: rgba(201,150,40,0.75); font-size: 12pt; }
  /* Inside title page */
  .title-page { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20mm; text-align: center; background: radial-gradient(ellipse at 50% 30%, #17294a, #0a1426 70%, #050a15); }
  .title-brand { color: #e0a82e; font-size: 16pt; font-weight: 700; letter-spacing: 1px; }
  .title-rule { width: 40mm; height: 1mm; background: rgba(212,169,55,0.6); margin: 8mm 0; }
  .title-big { color: #fff; font-weight: 900; font-size: 38pt; line-height: 1.2; }
  /* Lantern separator page */
  .fanoos-page { display: flex; flex-direction: column; align-items: center; justify-content: center; background: radial-gradient(ellipse at 50% 40%, #17294a, #0a1426 70%, #050a15); }
  .fanoos-emblem { font-size: 90pt; }
  /* Closing page */
  .end-page { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20mm; text-align: center; background: #fcfaf2; }
  /* Final story page (moral + questions + conclusion) */
  .final-page { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18mm; text-align: center; background: #fcfaf2; }
  .final-conclusion { font-weight: 700; color: #0a1628; font-size: 19pt; line-height: 1.7; margin-bottom: 8mm; }
  .final-moral { font-weight: 700; color: #8a5a00; font-size: 16pt; line-height: 1.6; background: #fff4d6; border-radius: 8mm; padding: 8mm 10mm; margin-bottom: 8mm; }
  .final-q-title { font-size: 22pt; margin-bottom: 4mm; }
  .final-q { list-style: none; color: #3a2c10; font-size: 14pt; line-height: 2; font-weight: 700; }
  /* Copyright page */
  .copyright-page { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20mm; text-align: center; background: #0a1426; }
  .cp-brand { color: #e0a82e; font-weight: 700; font-size: 18pt; margin-bottom: 8mm; }
  .cp-text { color: #cfd8e6; font-size: 12pt; line-height: 1.8; }

  /* ── Rich interior pages (match the on-screen book) ─────────────────────── */
  /* Inside title page */
  .pt-page { background: linear-gradient(160deg,#050a15,#0a1628 50%,#0e1f3d); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7mm; padding:24mm; text-align:center; }
  .pt-logo { width:42mm; height:42mm; object-fit:contain; filter:drop-shadow(0 0 8mm rgba(212,169,55,0.6)); }
  .pt-brand-name { font-size:15pt; font-weight:800; color:#D4A937; letter-spacing:2px; }
  .pt-rule { width:44mm; height:0.6mm; background:linear-gradient(90deg,transparent,#D4A937,transparent); }
  .pt-presents { font-size:13pt; color:rgba(212,169,55,0.8); font-weight:600; letter-spacing:1px; margin-bottom:4mm; }
  .pt-title { font-size:34pt; font-weight:900; color:#fff; line-height:1.25; max-width:175mm; }
  .pt-tagline { font-size:14pt; color:rgba(255,255,255,0.5); margin-top:4mm; }
  .pt-website { font-size:11pt; color:rgba(212,169,55,0.6); letter-spacing:2px; font-weight:600; }
  /* Full-logo separator page */
  .fp-page { background:radial-gradient(ellipse at center,#1a2440,#0a1020); display:flex; align-items:center; justify-content:center; padding:20mm; }
  .fp-logo { max-width:82%; max-height:82%; object-fit:contain; border-radius:6mm; filter:drop-shadow(0 6mm 20mm rgba(0,0,0,0.55)); }
  /* Dedication page */
  .ded2-page { background:linear-gradient(145deg,#fdf8ee,#fef3d0 50%,#fff8e1); border:2mm solid #D4A937; display:flex; flex-direction:column; align-items:center; gap:6mm; padding:22mm 18mm; text-align:center; }
  .ded2-photo { width:54mm; height:54mm; border-radius:50%; object-fit:cover; border:2.5mm solid #D4A937; box-shadow:0 0 0 4mm rgba(212,169,55,0.18); }
  .ded2-heading { font-size:22pt; font-weight:900; color:#8B5E0A; }
  .ded2-divider { width:52mm; height:0.6mm; background:linear-gradient(90deg,transparent,#D4A937,transparent); }
  .ded2-text { font-size:17pt; line-height:1.85; color:#3a2800; font-weight:600; max-width:155mm; font-style:italic; }
  .ded2-write-label { font-size:12pt; color:#8B5E0A; font-weight:700; margin-top:5mm; align-self:stretch; text-align:right; }
  .ded2-lines { display:flex; flex-direction:column; gap:7mm; width:100%; margin-top:2mm; }
  .ded2-line { width:100%; border-bottom:0.4mm dashed rgba(139,94,10,0.45); }
  /* Final story page */
  .fsp2-page { background:linear-gradient(160deg,#0a1628,#111840 60%,#0d0f1a); display:flex; flex-direction:column; gap:5mm; padding:20mm 16mm; direction:rtl; }
  .fsp2-label { font-size:11pt; color:rgba(212,169,55,0.75); letter-spacing:2px; font-weight:700; text-align:center; }
  .fsp2-title { font-size:24pt; font-weight:900; color:#fff; text-align:center; margin-top:2mm; }
  .fsp2-divider { width:100%; height:0.4mm; background:linear-gradient(90deg,transparent,rgba(212,169,55,0.4),transparent); }
  .fsp2-head { font-size:13pt; font-weight:800; color:#D4A937; margin-bottom:2mm; }
  .fsp2-moral { font-size:14pt; line-height:1.8; color:rgba(255,255,255,0.85); background:rgba(212,169,55,0.06); border-right:1mm solid #D4A937; padding:5mm 7mm; border-radius:0 3mm 3mm 0; }
  .fsp2-q { list-style:none; display:flex; flex-direction:column; gap:3mm; }
  .fsp2-q li { font-size:12pt; color:rgba(255,255,255,0.78); line-height:1.6; padding-right:6mm; position:relative; }
  .fsp2-q li::before { content:"◆"; position:absolute; right:0; color:#D4A937; font-size:8pt; top:1.5mm; }
  .fsp2-concl { font-size:14pt; color:rgba(255,255,255,0.85); font-weight:600; text-align:center; }
  .fsp2-star { font-size:16pt; font-weight:900; color:#D4A937; text-align:center; margin-top:1mm; }
  .fsp2-qr-row { display:flex; align-items:center; justify-content:space-between; gap:6mm; background:rgba(212,169,55,0.06); border:0.4mm solid rgba(212,169,55,0.25); border-radius:5mm; padding:6mm 8mm; margin-top:auto; }
  .fsp2-qr-label { font-size:13pt; font-weight:800; color:#D4A937; }
  .fsp2-qr-sub { font-size:10pt; color:rgba(255,255,255,0.55); margin-top:1mm; line-height:1.5; }
  .fsp2-qr-box { background:#fff; padding:2mm; border-radius:3mm; flex-shrink:0; }
  .fsp2-qr-img { width:30mm; height:30mm; display:block; }
  /* Copyright / contact page */
  .cp2-page { background:linear-gradient(160deg,#0a1628,#050a15); display:flex; flex-direction:column; align-items:center; gap:5mm; padding:22mm 18mm; text-align:center; direction:rtl; }
  .cp2-logo { width:36mm; height:36mm; object-fit:contain; filter:drop-shadow(0 0 6mm rgba(212,169,55,0.55)); }
  .cp2-brand { font-size:15pt; font-weight:800; color:#D4A937; letter-spacing:2px; }
  .cp2-divider { width:100%; height:0.4mm; background:linear-gradient(90deg,transparent,rgba(212,169,55,0.3),transparent); }
  .cp2-info-row { display:flex; align-items:center; justify-content:center; gap:3mm; font-size:13pt; }
  .cp2-link { color:rgba(212,169,55,0.9); font-weight:700; direction:ltr; text-decoration:none; }
  .cp2-policy { max-width:165mm; text-align:right; display:flex; flex-direction:column; gap:3mm; }
  .cp2-policy p { font-size:10pt; color:rgba(255,255,255,0.6); line-height:1.6; }
  .cp2-policy strong { color:rgba(212,169,55,0.9); font-weight:800; }
  .cp2-qr-row { display:flex; align-items:center; gap:6mm; background:rgba(212,169,55,0.06); border:0.4mm solid rgba(212,169,55,0.2); border-radius:5mm; padding:6mm 8mm; max-width:155mm; }
  .cp2-qr-text { flex:1; text-align:right; }
  .cp2-qr-label { font-size:13pt; font-weight:800; color:#D4A937; }
  .cp2-qr-sub { font-size:10pt; color:rgba(255,255,255,0.5); margin-top:1mm; line-height:1.5; }
  .cp2-qr-box { background:#fff; padding:2mm; border-radius:3mm; flex-shrink:0; }
  .cp2-qr-img { width:28mm; height:28mm; display:block; }
  .cp2-copy { font-size:10pt; color:rgba(255,255,255,0.35); line-height:1.7; margin-top:2mm; }
`;

function linePageHtml(src: string): string {
  return `<div class="page"><img class="bleed" src="${src}" alt="" /></div>`;
}
function dedicationPageHtml(photoSrc: string, childName: string, text?: string): string {
  const body = text || `إلى البطل الرائع ${childName}،<br/>نتمنى أن تكون حياتك مليئة بالمغامرات والسعادة.`;
  return `<div class="page ded2-page">
    <img class="ded2-photo" src="${photoSrc}" alt="${childName}" />
    <div class="ded2-heading">${sparkSpan(6)} إهداء خاص ${sparkSpan(6)}</div>
    <div class="ded2-divider"></div>
    <div class="ded2-text">${body}</div>
    <div class="ded2-write-label">✍️ رسالتك الخاصة:</div>
    <div class="ded2-lines"><div class="ded2-line"></div><div class="ded2-line"></div><div class="ded2-line"></div></div>
  </div>`;
}
function finalStoryPageHtml(title: string, moral: string, questions: string[], conclusion: string, childName = ''): string {
  const qs = (questions || []).filter(Boolean).map((q) => `<li>${q}</li>`).join('');
  return `<div class="page fsp2-page">
    <div class="fsp2-label">✦ نهاية القصة ✦</div>
    <div class="fsp2-title">${title}</div>
    <div class="fsp2-divider"></div>
    ${moral ? `<div><div class="fsp2-head">${sparkSpan(5)} الدرس المستفاد</div><div class="fsp2-moral">${moral}</div></div>` : ''}
    ${qs ? `<div class="fsp2-divider fsp2-divider--sm"></div><div><div class="fsp2-head">${sparkSpan(5)} أسئلة ممتعة للمناقشة مع طفلك</div><ul class="fsp2-q">${qs}</ul></div>` : ''}
    <div class="fsp2-divider"></div>
    ${conclusion ? `<div class="fsp2-concl">${conclusion}</div>` : ''}
    <div class="fsp2-star">${sparkSpan(6)} أحسنت يا ${childName}! ${sparkSpan(6)}</div>
  </div>`;
}
function copyrightPageHtml(qr = ''): string {
  const logo = logoDataUri();
  const lantern = lanternDataUri();
  return `<div class="page cp2-page">
    ${logo ? `<img class="cp2-logo" src="${logo}" alt="" />` : ''}
    <div class="cp2-brand">Magic Fanoos</div>
    <div class="cp2-divider"></div>
    <div class="cp2-info-row">${sparkSpan(4)} <span class="cp2-link">MagicFanoos.com</span></div>
    <div class="cp2-info-row">${sparkSpan(4)} <span class="cp2-link">magicfanoose@gmail.com</span></div>
    <div class="cp2-divider"></div>
    <div class="cp2-policy">
      <p><strong>سياسة المحتوى:</strong> القصة والصور مخصّصة لطفلك للاستخدام العائلي فقط، ولا يجوز إعادة بيعها أو توزيعها تجاريًا.</p>
      <p><strong>سياسة الطباعة:</strong> المنتج مطبوع خصيصًا لطفلك، لذا لا يمكن استرجاعه بعد بدء الطباعة. نضمن جودة الطباعة — تواصل معنا لأي مشكلة.</p>
    </div>
    <div class="cp2-divider"></div>
    <div class="cp2-qr-row">
      <div class="cp2-qr-text"><div class="cp2-qr-label">${lantern ? `<img src="${lantern}" style="width:7mm;height:7mm;border-radius:50%;object-fit:cover;vertical-align:-2mm;margin-left:1.5mm;" />` : '🏮'} زر موقعنا</div><div class="cp2-qr-sub">امسح الكود لزيارة MagicFanoos.com واكتشاف المزيد من القصص</div></div>
      ${qr ? `<div class="cp2-qr-box"><img class="cp2-qr-img" src="${qr}" alt="QR" /></div>` : ''}
    </div>
    <div class="cp2-copy">© ${new Date().getFullYear()} Magic Fanoos. جميع الحقوق محفوظة.<br/>هذه القصة مُولَّدة بواسطة الذكاء الاصطناعي وتم تخصيصها خصيصًا لطفلك.</div>
  </div>`;
}
const PRINT_PAGE_COLORS = ['#F2607A', '#7C5CE0', '#159B8A', '#2E7BD6', '#E17055', '#3FA34D'];
// A Gemini-style 4-point sparkle (concave sides).
function sparkSvg(fill: string): string {
  return `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z" fill="${fill}"/></svg>`;
}
// Inline sparkle used in headings/titles in place of the ⭐/🌟/💡/🤔 emojis.
function sparkSpan(mm: number, fill = '#D4A937'): string {
  return `<span style="display:inline-block;width:${mm}mm;height:${mm}mm;vertical-align:-0.12em;margin:0 1.5mm;">${sparkSvg(fill)}</span>`;
}
const GEMINI_SPARK = sparkSvg('rgba(255,255,255,0.9)');
const SPARK_POS = [
  { t: 6, l: 8, s: 9 }, { t: 11, l: 88, s: 6 }, { t: 44, l: 5, s: 7 }, { t: 55, l: 93, s: 8 },
  { t: 88, l: 12, s: 7 }, { t: 92, l: 82, s: 9 }, { t: 24, l: 93, s: 5 }, { t: 78, l: 5, s: 6 },
];
function sparklesHtml(): string {
  return SPARK_POS.map((p) =>
    `<div class="stp-spark" style="top:${p.t}%;left:${p.l}%;width:${p.s}mm;height:${p.s}mm">${GEMINI_SPARK}</div>`
  ).join('');
}
function storyTextPageHtml(text: string, idx = 0, lantern = ''): string {
  const bg = PRINT_PAGE_COLORS[idx % PRINT_PAGE_COLORS.length];
  const emblem = lantern
    ? `<div class="stp-lantern" style="background-image:url(${lantern})"></div>`
    : `<div class="stp-lantern stp-lantern--emoji">🏮</div>`;
  return `<div class="page stp-page" style="background:${bg}">` +
    sparklesHtml() +
    `<div class="stp-card">` +
    emblem +
    `<span class="stp-corner" style="top:6mm;left:7mm">✦</span><span class="stp-corner" style="top:6mm;right:7mm">✦</span>` +
    `<span class="stp-corner" style="bottom:6mm;left:7mm">✦</span><span class="stp-corner" style="bottom:6mm;right:7mm">✦</span>` +
    `<div class="stp-divider"></div><div class="stp-txt">${text}</div></div></div>`;
}
function titlePageHtml(title: string, childName = ''): string {
  const logo = logoDataUri();
  return `<div class="page pt-page">
    ${logo ? `<img class="pt-logo" src="${logo}" alt="" />` : ''}
    <div class="pt-brand-name">Magic Fanoos</div>
    <div class="pt-rule"></div>
    <div>
      ${childName ? `<div class="pt-presents">✦ يُقدّم لـ ${childName} ✦</div>` : ''}
      <div class="pt-title">${title}</div>
      <div class="pt-tagline">قصة مُهداة إليك وحدك</div>
    </div>
    <div class="pt-rule"></div>
    <div class="pt-website">MagicFanoos.com</div>
  </div>`;
}
function fanoosPageHtml(): string {
  const logo = logoDataUri();
  return `<div class="page fp-page">${logo ? `<img class="fp-logo" src="${logo}" alt="Magic Fanoos" />` : '<div class="fanoos-emblem">🏮</div>'}</div>`;
}
function endPageHtml(childName: string): string {
  return `<div class="page end-page"><div class="end-mark">🌟 ✦ 🌟</div><div class="ded-text">${childName} 💛<br/>Magic Fanoos</div></div>`;
}
function blankPageHtml(): string {
  return `<div class="page"></div>`;
}
function padToMultipleOf4(pages: string[]): string[] {
  const out = [...pages];
  while (out.length % 4 !== 0) out.push(blankPageHtml());
  return out;
}

/**
 * `rtl` decides the document's direction, and it matters even though every page
 * is centred: in an RTL paragraph the bidi algorithm puts a Latin sentence's
 * closing full stop on the LEFT — an English book printed "…zoo." came out
 * ".…zoo" on every text page.
 */
function squareDoc(pagesHtml: string[], rtl = true): string {
  return `<!DOCTYPE html><html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8" />
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
  theme?: string;
  childPhotoSrc?: string; // real uploaded kid photo for the back-cover circle
}

function wraparoundDoc(a: WraparoundDocArgs): string {
  const logo = logoDataUri();
  // Front cover: title + the brand logo + name (falls back to a text brand line).
  const brand = logo
    ? `<div class="cover-brand"><img class="cover-brand-logo" src="${logo}" alt="" /><span class="cover-brand-name">Magic Fanoos</span></div>`
    : `<div class="cover-sub">${a.kind === 'coloring' ? '🖍️ كتاب تلوين · Magic Fanoos' : '✨ Magic Fanoos'}</div>`;
  const frontPanel = `<div class="panel">
    <img class="bleed" src="${a.frontSrc}" alt="front" />
    <div class="overlay overlay-bottom"><div class="cover-title">${a.title}</div>${brand}</div>
  </div>`;

  // Story back cover = the branded "well done / more adventures" page (matches the
  // on-screen back cover). Coloring keeps the simple full-bleed image + greeting.
  let backPanel: string;
  if (a.kind === 'story') {
    const teasers = pickTeasers(a.theme).map((tz) => `
      <div class="bc-card">
        <div class="bc-thumb">${logo ? `<img class="bc-thumb-logo" src="${logo}" alt="" />` : ''}<span class="bc-emoji">${tz.emoji}</span></div>
        <div class="bc-card-title">${a.childName} ${tz.ar}</div>
      </div>`).join('');
    backPanel = `<div class="panel back-designed" dir="rtl">
      <div class="bc-hero">
        <div class="bc-photo-frame"><div class="bc-photo-ring"></div><img class="bc-photo" src="${a.childPhotoSrc || a.backSrc}" alt="" /></div>
        ${logo ? `<img class="bc-greet-logo" src="${logo}" alt="Magic Fanoos" />` : ''}
        <div class="bc-greeting">${sparkSpan(5)} أحسنت يا ${a.childName}! ${sparkSpan(5)}</div>
        <div class="bc-subtxt">أتممت قراءة قصتك السحرية — استمر في المغامرة!</div>
      </div>
      <div class="bc-line"></div>
      <div class="bc-section">
        <div class="bc-head">${sparkSpan(4.5)} مغامرات أخرى تنتظرك</div>
        <div class="bc-grid">${teasers}</div>
      </div>
      <div class="bc-line"></div>
      <div class="bc-foot">${logo ? `<img class="bc-foot-logo" src="${logo}" alt="" />` : ''}<div class="bc-foot-text"><span class="bc-foot-brand">Magic Fanoos</span><span class="bc-foot-url">${sparkSpan(3.5)} MagicFanoos.com</span></div></div>
    </div>`;
  } else {
    backPanel = `<div class="panel">
      <img class="bleed" src="${a.backSrc}" alt="back" />
      <div class="overlay overlay-bottom"><div class="back-title">🌟 أحسنت يا ${a.childName}!</div></div>
    </div>`;
  }

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

  /* Front cover brand row (logo + name) */
  .cover-brand { display: flex; align-items: center; justify-content: center; gap: 4mm; margin-top: 5mm; }
  .cover-brand-logo { width: 16mm; height: 16mm; object-fit: contain; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6)); }
  .cover-brand-name { color: #ffd479; font-weight: 900; font-size: 15pt; }

  /* Designed story back cover — mirrors the on-screen back cover */
  .back-designed {
    background: linear-gradient(180deg, #0a1628 0%, #060d1a 60%, #03060e 100%);
    display: flex; flex-direction: column; align-items: center; text-align: center;
    padding: ${PRINT_SAFE_MM + 5}mm ${PRINT_SAFE_MM + 7}mm; gap: 6mm;
  }
  .bc-hero { display: flex; flex-direction: column; align-items: center; gap: 4mm; }
  .bc-photo-frame { position: relative; width: 56mm; height: 56mm; display: flex; align-items: center; justify-content: center; }
  .bc-photo-ring { position: absolute; inset: -3mm; border-radius: 50%; background: conic-gradient(from 0deg, #D4A937, #fff3c4, #D4A937, #b88c20, #D4A937); }
  .bc-photo { position: relative; width: 52mm; height: 52mm; border-radius: 50%; object-fit: cover; object-position: center 30%; border: 1.8mm solid #0a1628; box-shadow: 0 4mm 12mm rgba(0,0,0,0.6); }
  .bc-greet-logo { width: 17mm; height: 17mm; object-fit: contain; filter: drop-shadow(0 0 3mm rgba(212,169,55,0.5)); }
  .bc-greeting { font-size: 26pt; font-weight: 900; color: #D4A937; }
  .bc-subtxt { font-size: 12pt; color: rgba(255,255,255,0.62); max-width: 130mm; line-height: 1.5; }
  .bc-line { width: 88%; height: 0.4mm; background: linear-gradient(90deg, transparent, rgba(212,169,55,0.4), transparent); }
  .bc-section { width: 100%; }
  .bc-head { font-size: 13pt; font-weight: 800; color: rgba(212,169,55,0.9); margin-bottom: 5mm; }
  .bc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; }
  .bc-card { background: rgba(255,255,255,0.04); border: 0.4mm solid rgba(212,169,55,0.18); border-radius: 4mm; padding: 4mm 2mm; display: flex; flex-direction: column; align-items: center; gap: 3mm; }
  .bc-thumb { position: relative; width: 22mm; height: 22mm; border-radius: 50%; overflow: hidden; border: 0.5mm solid rgba(212,169,55,0.3); background: radial-gradient(circle at 50% 45%, #11233f, #0a1628); display: flex; align-items: center; justify-content: center; }
  .bc-thumb-logo { width: 94%; height: 94%; object-fit: contain; }
  .bc-emoji { position: absolute; bottom: -1mm; right: -1mm; width: 8mm; height: 8mm; display: flex; align-items: center; justify-content: center; font-size: 10pt; background: #0a1628; border: 0.5mm solid rgba(212,169,55,0.5); border-radius: 50%; }
  .bc-card-title { font-size: 10pt; font-weight: 700; color: rgba(255,255,255,0.85); line-height: 1.4; }
  .bc-foot { display: flex; align-items: center; justify-content: center; gap: 4mm; margin-top: auto; }
  .bc-foot-logo { width: 15mm; height: 15mm; object-fit: contain; filter: drop-shadow(0 0 3mm rgba(212,169,55,0.5)); }
  .bc-foot-text { display: flex; flex-direction: column; align-items: center; }
  .bc-foot-brand { font-size: 13pt; font-weight: 800; color: #D4A937; }
  .bc-foot-url { font-size: 10pt; color: rgba(212,169,55,0.65); font-weight: 600; }
</style>
</head><body><div class="wrap" dir="ltr">${order.join('')}</div></body></html>`;
}

export async function renderPrintPdf(
  html: string,
  widthMm = PRINT_PAGE_MM,
  heightMm = PRINT_PAGE_MM,
  baseDir?: string,
): Promise<Buffer> {
  // Low-memory Chromium flags — the print pages embed large images, and the host
  // may only have 512MB RAM. --disable-dev-shm-usage (tiny /dev/shm in containers)
  // and --single-process are the key ones that keep this under the memory cap.
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
    ],
  });
  try {
    const page = await browser.newPage();
    // Load from a FILE, not setContent. An interior page's illustration is
    // ~2400px; as a base64 data URI it costs the bytes twice in node (utf-16
    // string) and again while Chromium parses it. Written to disk beside this
    // html it is a plain <img src="...">, which Chromium streams — the single
    // biggest saving on a box this size.
    const dir = baseDir || fs.mkdtempSync(path.join(os.tmpdir(), 'mf-print-'));
    const file = path.join(dir, `doc-${randomUUID()}.html`);
    fs.writeFileSync(file, html);
    try {
      await page.goto(`file://${file}`, { waitUntil: 'load' });
    } finally {
      try { fs.unlinkSync(file); } catch { /* best effort */ }
      if (!baseDir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } }
    }
    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    });
    const pdf = await page.pdf({ printBackground: true, width: `${widthMm}mm`, height: `${heightMm}mm` });
    return Buffer.from(pdf);
  } finally {
    // Force-kill Chromium so its memory is fully reclaimed before the next
    // render — otherwise back-to-back builds accumulate and OOM the 512MB host
    // (the 2nd download failing while the 1st succeeded).
    const proc = browser.process();
    try { await browser.close(); } catch { /* ignore */ }
    try { proc?.kill('SIGKILL'); } catch { /* ignore */ }
  }
}

/** Merge several PDF buffers into one, preserving order. */
async function mergePdfBuffers(buffers: Buffer[]): Promise<Buffer> {
  if (buffers.length === 1) return buffers[0];
  const out = await PDFDocument.create();
  for (const b of buffers) {
    const src = await PDFDocument.load(b);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const p of pages) out.addPage(p);
  }
  return Buffer.from(await out.save());
}

/**
 * Render page-HTML strings to one square PDF, but in small batches so only a few
 * hi-res photos are decoded in Chromium at once — keeping peak RAM under the
 * 512MB host cap. Each batch is its own short-lived browser (renderPrintPdf kills
 * it), then the batch PDFs are merged in order. This is what lets the print
 * interior carry Imagen-upscaled ~300 DPI images on the free tier.
 */
async function renderPagesBatched(
  pages: string[],
  widthMm = PRINT_PAGE_MM,
  heightMm = PRINT_PAGE_MM,
  batchSize = RENDER_BATCH_PAGES,
  rtl = true,
  baseDir?: string,
): Promise<Buffer> {
  const pdfs: Buffer[] = [];
  for (let i = 0; i < pages.length; i += batchSize) {
    pdfs.push(await renderPrintPdf(squareDoc(pages.slice(i, i + batchSize), rtl), widthMm, heightMm, baseDir));
    logMem(`interior batch ${pdfs.length} (${Math.min(i + batchSize, pages.length)}/${pages.length} pages)`);
  }
  return mergePdfBuffers(pdfs);
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
  theme?: string; // used to pick the back-cover "more adventures" teasers
  childPhotoPath?: string; // real uploaded kid photo for the back-cover circle
}

export interface WraparoundResult {
  pdf: Buffer;
  widthMm: number;
  heightMm: number;
  spineMm: number;
}

export async function buildWraparoundCoverPdf(o: WraparoundInput): Promise<WraparoundResult> {
  // Story covers are full-bleed photos → AI-upscale to ~300 DPI. Coloring covers
  // are line art → keep the native sharp path. Only 2 images render here, so the
  // single cover pass stays within the 512MB cap without batching.
  const photo = o.kind === 'story';
  // Fetch/upscale front + back in parallel (network-bound), then crop sequentially.
  const [frontSrc, backSrc] = await Promise.all(
    photo
      ? [hiResBuffer(o.frontPath), hiResBuffer(o.backPath)]
      : [downloadObject(o.frontPath), downloadObject(o.backPath)],
  );
  const cropOpts = photo ? { px: PRINT_PHOTO_PX } : {};
  // Same reason as the interior: the two cover panels are 2400px each, and as
  // data URIs they were the build's highest peak of all.
  const coverDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-cover-'));
  const toFile = (name: string, buf: Buffer, mime: string): string => {
    const file = `${name}.${mime === 'image/png' ? 'png' : 'jpg'}`;
    fs.writeFileSync(path.join(coverDir, file), buf);
    return file;
  };
  const front = await upscaleForPrint(frontSrc, cropOpts);
  const frontFile = toFile('front', front.buffer, front.mime);
  (front as any).buffer = undefined;
  const back = await upscaleForPrint(backSrc, cropOpts);
  const backFile = toFile('back', back.buffer, back.mime);
  (back as any).buffer = undefined;
  // Real uploaded kid photo for the story back-cover circle (best-effort — skip
  // if missing/non-GCS, then the circle falls back to the AI portrait).
  let childPhotoSrc = '';
  if (o.childPhotoPath) {
    const objPath = toObjectPath(o.childPhotoPath);
    if (!/^https?:/i.test(objPath)) {
      try {
        const c = await upscaleForPrint(await downloadObject(objPath), { px: 900 });
        childPhotoSrc = toFile('kid', c.buffer, c.mime);
      } catch (e: any) {
        console.warn('[PrintService] back-cover kid photo skipped:', e?.message || e);
      }
    }
  }
  const spineMm = o.spineMm ?? spineWidthMm(o.interiorPages);
  const panelWmm = PRINT_TRIM_MM + PRINT_BLEED_MM;            // 220 + outer bleed
  const widthMm = 2 * PRINT_TRIM_MM + 2 * PRINT_BLEED_MM + spineMm;
  const heightMm = PRINT_PAGE_MM;
  const html = wraparoundDoc({
    frontSrc: frontFile,
    backSrc: backFile,
    title: o.title,
    childName: o.childName,
    kind: o.kind,
    rtl: o.rtl !== false,
    spineMm,
    widthMm,
    heightMm,
    panelWmm,
    theme: o.theme,
    childPhotoSrc,
  });
  let pdf: Buffer;
  try {
    pdf = await renderPrintPdf(html, widthMm, heightMm, coverDir);
  } finally {
    try { fs.rmSync(coverDir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
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
  // One image at a time to keep peak RAM under the 512MB host cap (see story build).
  const lines: Array<{ buffer: Buffer; mime: string }> = [];
  for (const p of input.pagePaths) {
    lines.push(await upscaleForPrint(await downloadObject(p), { lineArt: true }));
  }
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
  // Front/back matter text (localized) so the printed book matches the on-screen
  // one: dedication, then the closing moral + discussion questions + conclusion.
  dedication?: string;
  moral?: string;
  conclusion?: string;
  questions?: string[];
  theme?: string; // used to pick the back-cover "more adventures" teasers
  rtl?: boolean;  // false for English → the wraparound cover binds on the other side
}

export async function buildStoryPrintFiles(input: StoryPrintInput): Promise<PrintFiles> {
  assertCanBuildStoryPrint();
  logMem(`story build start (${input.imagePaths.length} images @ ${PRINT_PX}px)`);
  // ONE image at a time: fetch (or AI-upscale) it, crop it to the print square,
  // write it to disk, drop it.
  //
  // It used to upscale all 13 in parallel and hold both the source set and the
  // cropped set in memory. That was cheap while Imagen did the enlarging — the
  // step was network-bound and the buffers small. Since Imagen started 404ing
  // the enlarge happens HERE, in sharp, so four at once meant four 2400px
  // decodes at once, and the peak landed past Render's 512MB mid-crop:
  // rss went 245MB → 504MB → killed, with no print file written.
  //
  // Sequential costs wall-clock only while the upscaler is down (each call
  // returns immediately), and nothing at all once it works again.
  resetUpscaleStats();
  _upscaleCacheHits = 0;
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-print-'));
  const imageFiles: string[] = [];
  for (let i = 0; i < input.imagePaths.length; i++) {
    const src = await hiResBuffer(input.imagePaths[i]);
    const cropped = await upscaleForPrint(src, { px: PRINT_PHOTO_PX });
    const name = `img-${i}.${cropped.mime === 'image/png' ? 'png' : 'jpg'}`;
    fs.writeFileSync(path.join(workDir, name), cropped.buffer);
    imageFiles.push(name);
    (cropped as any).buffer = undefined;
    if (i % 4 === 3) logMem(`prepared ${i + 1}/${input.imagePaths.length}`);
  }
  logUpscaleSummary();
  reclaim('after images prepared');
  logMem('images prepared')
  // Dedication photo — best-effort (skip the page if it can't be fetched, e.g.
  // a non-GCS URL), so it never fails the whole build.
  let photoSrc = '';
  if (input.childPhotoPath) {
    const objPath = toObjectPath(input.childPhotoPath);
    if (!/^https?:/i.test(objPath)) {
      try {
        const u = await upscaleForPrint(await downloadObject(objPath), { px: 900 });
        photoSrc = dataUri(u.buffer, u.mime);
      } catch (e: any) {
        console.warn('[PrintService] dedication photo skipped:', e?.message || e);
      }
    }
  }

  const qrSrc = await websiteQrDataUri();
  const lanternUri = lanternDataUri();
  const interior: string[] = [];
  // Front matter: inside title, then the dedication (before the logo separator).
  interior.push(titlePageHtml(input.title, input.childName));
  if (photoSrc) interior.push(dedicationPageHtml(photoSrc, input.childName, input.dedication));
  interior.push(fanoosPageHtml());
  // Body: each story page is a decorative TEXT page + its full-bleed illustration.
  for (let i = 0; i < input.imagePaths.length; i++) {
    interior.push(storyTextPageHtml(input.pageTexts[i] || '', i, lanternUri));
    interior.push(linePageHtml(imageFiles[i]));
  }
  logMem('interior html built');
  // Back matter: lantern separator, the final story page (moral + questions +
  // conclusion), then the copyright page — mirrors the on-screen book.
  interior.push(fanoosPageHtml());
  if (input.moral || input.conclusion || (input.questions && input.questions.length)) {
    interior.push(finalStoryPageHtml(input.title, input.moral || '', input.questions || [], input.conclusion || '', input.childName));
  } else {
    interior.push(endPageHtml(input.childName));
  }
  interior.push(copyrightPageHtml(qrSrc));
  const padded = padToMultipleOf4(interior);
  // Same direction as the cover binding, which this input already carried and
  // the interior never used.
  let interiorPdf: Buffer;
  try {
    interiorPdf = await renderPagesBatched(padded, PRINT_PAGE_MM, PRINT_PAGE_MM, RENDER_BATCH_PAGES, input.rtl !== false, workDir);
  } finally {
    // Ephemeral disk, but a failed build must not leave 40MB of pages behind:
    // enough of those and the next build has nowhere to write.
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  reclaim('after interior render');
  logMem('interior PDF rendered');

  const cover = await buildWraparoundCoverPdf({
    title: input.title,
    childName: input.childName,
    frontPath: input.coverPath,
    backPath: input.backPath,
    interiorPages: padded.length,
    kind: 'story',
    theme: input.theme,
    childPhotoPath: input.childPhotoPath,
    rtl: input.rtl,
  });
  logMem('cover PDF rendered');

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
  /** GCS object paths — used to re-upload the PDF bytes to BookPod. */
  coverPath: string;
  interiorPath: string;
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
    coverPath,
    interiorPath,
    interiorPages: files.interiorPages,
    trimMm: PRINT_TRIM_MM,
    bleedMm: PRINT_BLEED_MM,
    coverWidthMm: files.coverWidthMm,
    coverHeightMm: files.coverHeightMm,
    spineMm: files.spineMm,
  };
}
