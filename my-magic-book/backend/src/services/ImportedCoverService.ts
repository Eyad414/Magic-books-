/**
 * Designs and composes a print-ready cover for an IMPORTED book.
 *
 * The importer takes page 1 of a supplied PDF as the cover, which is right when
 * the file already opens with a designed cover and useless when it does not —
 * a manuscript exported from Word starts on body text, so the "cover" is a
 * page of paragraphs. This builds a real one instead: art designed from what
 * the book is about, laid out as a wraparound (back + spine + front) at the
 * book's own trim, with the title set in the right script and direction.
 *
 * Nothing here reads the supplied PDF's text. Arabic Word exports use
 * non-Unicode fonts, so extracted text is unreliable (see BookImportService) —
 * the subject comes from what the owner types, which is also the only sane
 * input for a book whose contents we must not reproduce.
 */
import sharp from 'sharp';
import { generateImageFromPrompt } from './ImageGenerator';
import { renderPrintPdf, spineWidthMm, downloadObject, upscaleForPrint } from './PrintService';
import { uploadBuffer, pdfFolderPath } from './StorageService';
import { sanitizeCoverScene } from './CoverConcept';

const BLEED_MM = 3;

export interface ImportedCoverInput {
  title: string;
  /** What the book is about, in the owner's words. Drives the whole design. */
  subject?: string;
  author?: string;
  widthMm: number;
  heightMm: number;
  interiorPages: number;
  /** Arabic/Hebrew books open on the right, so the front panel sits there. */
  rtl?: boolean;
  /**
   * 'branded' lays the art out as OUR cover: title and author typeset on the
   * front, title down the spine, darkened art on the back. Right for art we
   * generated, wrong for a cover the owner supplies — they already designed it,
   * and printing our title over theirs is not their cover any more.
   *
   * 'asis' prints their artwork and nothing else. A WIDE image is taken as a
   * finished wraparound and spans the whole sheet; a TALL one is taken as a
   * front-only cover and fills the front panel, with a plain dark spine and
   * back rather than an invented design.
   */
  mode?: 'branded' | 'asis';
}

export interface ImportedCoverResult {
  coverPath: string;
  /** Flat PNG of the finished layout, for showing in the dashboard. */
  previewPath?: string;
  /** True when the supplied art was taken as a finished wraparound. */
  artIsWraparound?: boolean;
  artPath: string;
  scene: string;
  widthMm: number;
  heightMm: number;
  spineMm: number;
}

/** Asks the text model what this book's cover should show. */
export async function describeImportedCoverScene(input: {
  title: string;
  subject?: string;
}): Promise<string> {
  const fallback = 'a calm symbolic still life on a plain background, soft directional light, generous empty space at the top';
  if (!process.env.GEMINI_API_KEY && !process.env.GCP_PROJECT_ID) return fallback;

  const prompt = [
    'You are art-directing the FRONT COVER of a printed book for adults.',
    `Title: ${input.title}`,
    input.subject ? `What it is about: ${input.subject}` : '',
    '',
    'Describe the cover art in ONE English sentence, under 40 words.',
    'It must be a symbolic, tasteful composition that signals the subject at a glance:',
    'name the main visual metaphor, the palette, the lighting and the mood.',
    'Leave the upper third uncluttered so a title can sit there.',
    'Do NOT describe any text, lettering, logos or people\'s faces. Reply with the sentence only.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const { generateResilient } = await import('./genaiClient');
    const override = process.env.GEMINI_TEXT_MODEL;
    const res = await generateResilient(
      { studio: override || 'gemini-flash-lite-latest', vertex: override || 'gemini-2.5-flash-lite' },
      (model) => ({
        model,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.8, maxOutputTokens: 200 },
      }),
    );
    const text =
      (res as any).text ||
      ((res as any).candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text).filter(Boolean).join('');
    const scene = sanitizeCoverScene(text);
    if (scene.length >= 25) {
      console.log(`[ImportedCover] scene: ${scene}`);
      return scene;
    }
  } catch (err: any) {
    console.warn(`[ImportedCover] scene design failed (${err?.message || err}) — using the neutral fallback`);
  }
  return fallback;
}

/** The image prompt: cover ART only, never the lettering. */
export function importedCoverArtPrompt(scene: string, aspect: 'portrait' | 'wide' = 'portrait'): string {
  return [
    `A professional book-cover ILLUSTRATION, ${aspect === 'wide' ? 'wide landscape' : 'tall portrait'} format, edge to edge with no border and no letterbox bars.`,
    `Subject: ${scene}.`,
    'Modern publishing quality, striking but uncluttered, rich depth, deliberate negative space in the upper third.',
    // The title is typeset in the PDF, where the script and direction are
    // correct. Anything the model writes would be gibberish Arabic and would
    // sit under the real title.
    'ABSOLUTELY NO TEXT ANYWHERE: no letters, no words, no Arabic script, no numbers, no title, no author name,',
    'no logos, no watermark and no signature — every surface is completely blank and unlettered.',
  ].join(' ');
}

export function coverHtml(o: {
  artSrc: string;
  title: string;
  author?: string;
  widthMm: number;
  heightMm: number;
  panelWmm: number;
  spineMm: number;
  rtl: boolean;
  mode?: 'branded' | 'asis';
  /** True when the supplied art is already a full wraparound (back+spine+front). */
  artIsWraparound?: boolean;
}): string {
  const asis = o.mode === 'asis';
  // A finished wraparound is printed across the whole sheet untouched — no
  // panels, no overlay, nothing of ours on top of it.
  if (asis && o.artIsWraparound) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
      @page { size: ${o.widthMm}mm ${o.heightMm}mm; margin: 0; }
      html, body { margin: 0; width: ${o.widthMm}mm; height: ${o.heightMm}mm; background: #0a1628; }
      img { width: 100%; height: 100%; object-fit: cover; display: block; }
    </style></head><body><img src="${o.artSrc}"/></body></html>`;
  }
  const dir = o.rtl ? 'rtl' : 'ltr';
  const spineText = !asis && o.spineMm >= 8 ? `<div class="spine-text" dir="${dir}">${escapeHtml(o.title)}</div>` : '';
  const front = `
    <div class="panel front">
      <img class="art" src="${o.artSrc}" />
      ${asis ? '' : '<div class="scrim"></div>'}
      ${asis ? '' : `<div class="titles" dir="${dir}">
        <div class="title">${escapeHtml(o.title)}</div>
        ${o.author ? `<div class="author">${escapeHtml(o.author)}</div>` : ''}
      </div>`}
    </div>`;
  // The back is the same art, heavily darkened — one piece of art wrapping the
  // book reads as designed, where a blank back reads as unfinished.
  const back = asis
    ? `<div class="panel back plain"></div>`
    : `<div class="panel back">
      <img class="art" src="${o.artSrc}" />
      <div class="scrim back-scrim"></div>
    </div>`;
  const spine = `<div class="spine">${spineText}</div>`;
  // Markup order IS print order, left to right. The body is forced to LTR flow
  // for that reason: with dir="rtl" the flex row lays the first element on the
  // RIGHT, so the markup read backwards from the printed sheet and a reader had
  // to hold two negations in their head to know which panel was the front.
  // Text direction is set per element instead.
  // An Arabic jacket unwrapped outside-up reads front | spine | back from the
  // left; an English one reads back | spine | front.
  const order = o.rtl ? [front, spine, back] : [back, spine, front];

  return `<!DOCTYPE html><html dir="${dir}"><head><meta charset="utf-8"/>
  <style>
    @page { size: ${o.widthMm}mm ${o.heightMm}mm; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; width: ${o.widthMm}mm; height: ${o.heightMm}mm; display: flex; direction: ltr; background: #0a1628;
           font-family: 'Noto Naskh Arabic', 'Amiri', 'Segoe UI', Tahoma, sans-serif; }
    .panel { position: relative; width: ${o.panelWmm}mm; height: ${o.heightMm}mm; overflow: hidden; }
    .art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
    .scrim { position: absolute; inset: 0;
             background: linear-gradient(to bottom, rgba(4,10,24,.72) 0%, rgba(4,10,24,.15) 45%, rgba(4,10,24,.55) 100%); }
    .back-scrim { background: rgba(4,10,24,.72); }
    .plain { background: #0a1628; }
    .titles { position: absolute; top: ${Math.round(o.heightMm * 0.07)}mm; inset-inline: ${Math.round(o.panelWmm * 0.09)}mm; text-align: center; }
    .title { color: #fff; font-weight: 800; font-size: ${Math.max(16, Math.round(o.panelWmm * 0.13))}pt;
             line-height: 1.25; text-shadow: 0 2px 12px rgba(0,0,0,.55); }
    .author { margin-top: 6mm; color: #f5d38b; font-size: ${Math.max(10, Math.round(o.panelWmm * 0.055))}pt; font-weight: 600; }
    .spine { width: ${o.spineMm}mm; height: ${o.heightMm}mm; background: #0a1628; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    /* The whole line is ROTATED, not set with writing-mode: that stacks glyphs
       one under another, which breaks Arabic's cursive joining and turns a
       title into disconnected letters down the spine. */
    .spine-text { color: #fff; font-weight: 800; font-size: 10pt; white-space: nowrap;
                  transform: rotate(-90deg); transform-origin: center; }
  </style></head><body>${order.join('')}</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/**
 * Lays existing cover ART out as a print-ready wraparound. Separate from
 * generation so a layout can be rebuilt — different title, different trim, a
 * fixed margin — without paying for the image again.
 */
export async function composeImportedCover(
  artPath: string,
  input: ImportedCoverInput & { scene?: string },
): Promise<ImportedCoverResult> {
  // The model returns a SQUARE canvas and letterboxes a portrait composition
  // inside it with flat white bars down both sides. `object-fit: cover` would
  // crop most of that away, but a sliver survives at the panel edges — a white
  // stripe running down a printed cover. Trim the uniform border first, and
  // keep the untrimmed image if trimming would eat the artwork.
  const raw = await downloadObject(artPath);
  let cropped = raw;
  try {
    const before = await sharp(raw).metadata();
    const trimmed = await sharp(raw).trim({ threshold: 12 }).toBuffer();
    const after = await sharp(trimmed).metadata();
    const kept = ((after.width || 0) * (after.height || 0)) / Math.max(1, (before.width || 1) * (before.height || 1));
    if (kept > 0.25) {
      cropped = trimmed;
      console.log(`[ImportedCover] trimmed border: ${before.width}x${before.height} → ${after.width}x${after.height}`);
    } else {
      console.warn('[ImportedCover] trim would remove most of the art — keeping it as generated');
    }
  } catch (err: any) {
    console.warn(`[ImportedCover] trim skipped: ${err?.message || err}`);
  }

  const up = await upscaleForPrint(cropped, { px: 2048 });
  const artSrc = `data:${up.mime};base64,${up.buffer.toString('base64')}`;

  // Is the supplied art already a full wraparound? A front-only cover is taller
  // than it is wide; a wraparound is roughly twice as wide as one panel. Judged
  // from the image itself rather than asked, because the owner should not have
  // to know the word "wraparound" to hand over a cover they already have.
  const meta = await sharp(cropped).metadata();
  const artAspect = (meta.width || 1) / (meta.height || 1);
  const artIsWraparound = artAspect > 1.2;

  const spineMm = spineWidthMm(input.interiorPages);
  const panelWmm = input.widthMm + BLEED_MM;
  const widthMm = 2 * input.widthMm + 2 * BLEED_MM + spineMm;
  const heightMm = input.heightMm + 2 * BLEED_MM;

  const html = coverHtml({
      artSrc,
      title: input.title,
      author: input.author,
      widthMm,
      heightMm,
      panelWmm,
      spineMm,
    rtl: input.rtl !== false,
    mode: input.mode || 'branded',
    artIsWraparound,
  });
  const pdf = await renderPrintPdf(html, widthMm, heightMm);

  const stamp = Date.now();
  const coverPath = pdfFolderPath('imported', `${stamp}_designed-cover.pdf`);
  await uploadBuffer(pdf, coverPath, 'application/pdf');

  // A flat PNG of the SAME markup. The dashboard used to preview the raw art,
  // which does not show the title, the spine or where the fold lands — the
  // things worth checking before this goes to a printer. Best-effort: a preview
  // that fails must not lose the cover that already rendered.
  let previewPath: string | undefined;
  try {
    const png = await renderCoverPng(html, widthMm, heightMm);
    previewPath = pdfFolderPath('imported', `${stamp}_designed-cover.png`);
    await uploadBuffer(png, previewPath, 'image/png');
  } catch (err: any) {
    console.warn(`[ImportedCover] preview render skipped: ${err?.message || err}`);
  }

  return {
    coverPath,
    previewPath,
    artPath,
    scene: input.scene || '',
    widthMm,
    heightMm,
    spineMm,
    artIsWraparound,
  };
}

export async function buildImportedCover(input: ImportedCoverInput): Promise<ImportedCoverResult> {
  const scene = await describeImportedCoverScene({ title: input.title, subject: input.subject });
  const art = await generateImageFromPrompt(importedCoverArtPrompt(scene), {
    folder: 'imported',
    filename: `${Date.now()}_cover-art.png`,
  });
  return composeImportedCover(art.objectPath, { ...input, scene, mode: 'branded' });
}

/**
 * Flat PNG of a cover layout, rendered from the same HTML as the PDF so the
 * preview cannot drift from what gets printed.
 */
export async function renderCoverPng(html: string, widthMm: number, heightMm: number): Promise<Buffer> {
  const puppeteer = (await import('puppeteer')).default;
  const px = (mm: number) => Math.round((mm / 25.4) * 96);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process', '--disable-extensions'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: px(widthMm), height: px(heightMm), deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'load' });
    const shot = await page.screenshot({ type: 'png' });
    return Buffer.from(shot);
  } finally {
    const proc = browser.process();
    try { await browser.close(); } catch { /* ignore */ }
    try { proc?.kill('SIGKILL'); } catch { /* ignore */ }
  }
}

/**
 * Which cover a submission actually used, read back from the file it sent.
 * This is the question that could not be answered when a send looked wrong:
 * page 1 of the interior, a cover we designed, or one the owner supplied.
 */
export function coverSourceFor(coverPath: string): 'page-1' | 'designed' | 'uploaded' {
  const p = String(coverPath || '');
  if (/_designed-cover/.test(p)) return 'designed';
  if (/_own-cover/.test(p)) return 'uploaded';
  return 'page-1';
}
