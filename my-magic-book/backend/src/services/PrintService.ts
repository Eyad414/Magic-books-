import sharp from 'sharp';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { Storage } from '@google-cloud/storage';
import { uploadBuffer, pdfFolderPath } from './StorageService';

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
// Source AI illustrations are only ~864x1184px. The interior render (13 images
// in one Chromium page) sat right at the 512MB host limit at 1400px and
// intermittently OOM-crashed. 1100px still exceeds the source resolution (no
// real detail lost) and keeps the peak comfortably under 512MB every time.
export const PRINT_PX = 1100;

// Log resident memory at a labelled point in the print build so an OOM kill's
// last line pinpoints where it died.
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
    <div class="ded2-heading">🌟 إهداء خاص 🌟</div>
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
    ${moral ? `<div><div class="fsp2-head">💡 الدرس المستفاد</div><div class="fsp2-moral">${moral}</div></div>` : ''}
    ${qs ? `<div class="fsp2-divider fsp2-divider--sm"></div><div><div class="fsp2-head">🤔 أسئلة ممتعة للمناقشة مع طفلك</div><ul class="fsp2-q">${qs}</ul></div>` : ''}
    <div class="fsp2-divider"></div>
    ${conclusion ? `<div class="fsp2-concl">${conclusion}</div>` : ''}
    <div class="fsp2-star">⭐ أحسنت يا ${childName}! ⭐</div>
  </div>`;
}
function copyrightPageHtml(qr = ''): string {
  const logo = logoDataUri();
  return `<div class="page cp2-page">
    ${logo ? `<img class="cp2-logo" src="${logo}" alt="" />` : ''}
    <div class="cp2-brand">Magic Fanoos</div>
    <div class="cp2-divider"></div>
    <div class="cp2-info-row">🌐 <span class="cp2-link">MagicFanoos.com</span></div>
    <div class="cp2-info-row">📧 <span class="cp2-link">magicfanoose@gmail.com</span></div>
    <div class="cp2-divider"></div>
    <div class="cp2-policy">
      <p><strong>سياسة المحتوى:</strong> القصة والصور مخصّصة لطفلك للاستخدام العائلي فقط، ولا يجوز إعادة بيعها أو توزيعها تجاريًا.</p>
      <p><strong>سياسة الطباعة:</strong> المنتج مطبوع خصيصًا لطفلك، لذا لا يمكن استرجاعه بعد بدء الطباعة. نضمن جودة الطباعة — تواصل معنا لأي مشكلة.</p>
    </div>
    <div class="cp2-divider"></div>
    <div class="cp2-qr-row">
      <div class="cp2-qr-text"><div class="cp2-qr-label">🏮 زر موقعنا</div><div class="cp2-qr-sub">امسح الكود لزيارة MagicFanoos.com واكتشاف المزيد من القصص</div></div>
      ${qr ? `<div class="cp2-qr-box"><img class="cp2-qr-img" src="${qr}" alt="QR" /></div>` : ''}
    </div>
    <div class="cp2-copy">© ${new Date().getFullYear()} Magic Fanoos. جميع الحقوق محفوظة.<br/>هذه القصة مُولَّدة بواسطة الذكاء الاصطناعي وتم تخصيصها خصيصًا لطفلك.</div>
  </div>`;
}
const PRINT_PAGE_COLORS = ['#F2607A', '#7C5CE0', '#159B8A', '#2E7BD6', '#E17055', '#3FA34D'];
// A Gemini-style 4-point sparkle (concave sides), scattered on the colored page.
const GEMINI_SPARK =
  `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C12 6.6 6.6 12 0 12C6.6 12 12 17.4 12 24C12 17.4 17.4 12 24 12C17.4 12 12 6.6 12 0Z" fill="rgba(255,255,255,0.9)"/></svg>`;
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
        <div class="bc-greeting">أحسنت يا ${a.childName}! 🌟</div>
        <div class="bc-subtxt">أتممت قراءة قصتك السحرية — استمر في المغامرة!</div>
      </div>
      <div class="bc-line"></div>
      <div class="bc-section">
        <div class="bc-head">✨ مغامرات أخرى تنتظرك</div>
        <div class="bc-grid">${teasers}</div>
      </div>
      <div class="bc-line"></div>
      <div class="bc-foot">${logo ? `<img class="bc-foot-logo" src="${logo}" alt="" />` : ''}<div class="bc-foot-text"><span class="bc-foot-brand">Magic Fanoos</span><span class="bc-foot-url">🌐 MagicFanoos.com</span></div></div>
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

export async function renderPrintPdf(html: string, widthMm = PRINT_PAGE_MM, heightMm = PRINT_PAGE_MM): Promise<Buffer> {
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
  const front = await upscaleForPrint(await downloadObject(o.frontPath));
  const back = await upscaleForPrint(await downloadObject(o.backPath));
  // Real uploaded kid photo for the story back-cover circle (best-effort — skip
  // if missing/non-GCS, then the circle falls back to the AI portrait).
  let childPhotoSrc = '';
  if (o.childPhotoPath && !/^https?:/i.test(o.childPhotoPath)) {
    try {
      const c = await upscaleForPrint(await downloadObject(o.childPhotoPath), { px: 900 });
      childPhotoSrc = dataUri(c.buffer, c.mime);
    } catch (e: any) {
      console.warn('[PrintService] back-cover kid photo skipped:', e?.message || e);
    }
  }
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
    theme: o.theme,
    childPhotoSrc,
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
}

export async function buildStoryPrintFiles(input: StoryPrintInput): Promise<PrintFiles> {
  logMem(`story build start (${input.imagePaths.length} images @ ${PRINT_PX}px)`);
  // Load + upscale one image at a time (NOT Promise.all) — upscaling 13 print-res
  // images in parallel spikes RAM well past 512MB and OOM-kills the host.
  const images: Array<{ buffer: Buffer; mime: string }> = [];
  for (const p of input.imagePaths) {
    images.push(await upscaleForPrint(await downloadObject(p)));
  }
  logMem('images upscaled');
  // Dedication photo — best-effort (skip the page if it can't be fetched, e.g.
  // a non-GCS URL), so it never fails the whole build.
  let photoSrc = '';
  if (input.childPhotoPath && !/^https?:/i.test(input.childPhotoPath)) {
    try {
      const u = await upscaleForPrint(await downloadObject(input.childPhotoPath), { px: 900 });
      photoSrc = dataUri(u.buffer, u.mime);
    } catch (e: any) {
      console.warn('[PrintService] dedication photo skipped:', e?.message || e);
    }
  }

  const qrSrc = await websiteQrDataUri();
  const lanternUri = lanternDataUri();
  const interior: string[] = [];
  // Front matter: inside title + lantern separator + dedication.
  interior.push(titlePageHtml(input.title, input.childName));
  interior.push(fanoosPageHtml());
  if (photoSrc) interior.push(dedicationPageHtml(photoSrc, input.childName, input.dedication));
  // Body: each story page is a decorative TEXT page + its full-bleed illustration.
  for (let i = 0; i < input.imagePaths.length; i++) {
    interior.push(storyTextPageHtml(input.pageTexts[i] || '', i, lanternUri));
    interior.push(linePageHtml(dataUri(images[i].buffer, images[i].mime)));
  }
  images.length = 0; // drop the upscaled buffers — the base64 is now in the HTML
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
  const interiorPdf = await renderPrintPdf(squareDoc(padded));
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
