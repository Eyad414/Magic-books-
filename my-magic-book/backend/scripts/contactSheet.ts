/**
 * Build a labelled contact sheet of a book's pages, for judging artwork.
 *
 * Reviewing a 15-image book one file at a time is slow and, worse, invites
 * judging a book by one page — which is how a cartoon interior sat behind a
 * photoreal cover unnoticed. One sheet shows drift between pages immediately.
 *
 *   npx tsx scripts/contactSheet.ts <out.jpg> <theme:pages> [theme:pages ...]
 *
 *   npx tsx scripts/contactSheet.ts /tmp/dino.jpg dinosaur_adventure:1-13 first_grade:0
 */
import 'dotenv/config';
import sharp from 'sharp';
import { downloadObject } from '../src/services/PrintService';

const W = 215, H = 300, LABEL_H = 22, COLS = 7;

/** "1-13" → ['01'..'13'];  "0,5,99" → ['00','05','99'] */
function parsePages(spec: string): string[] {
  const out: string[] = [];
  for (const part of spec.split(',')) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      for (let i = Number(range[1]); i <= Number(range[2]); i++) out.push(String(i).padStart(2, '0'));
    } else {
      out.push(String(Number(part)).padStart(2, '0'));
    }
  }
  return out;
}

/** Baha's zoo book predates the theme_<id> convention and lives in theme_zoo. */
const folderFor = (theme: string) => (theme === 'zoo_adventure' ? 'theme_zoo' : `theme_${theme}`);

(async () => {
  const [out, ...specs] = process.argv.slice(2);
  if (!out || !specs.length) throw new Error('usage: contactSheet.ts <out.jpg> <theme:pages> ...');

  const F = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
  const jobs: { theme: string; page: string }[] = [];
  for (const spec of specs) {
    const [theme, pages = '0,1-13,99'] = spec.split(':');
    for (const page of parsePages(pages)) jobs.push({ theme, page });
  }

  const cells: sharp.OverlayOptions[] = [];
  let missing = 0;
  for (let i = 0; i < jobs.length; i++) {
    const { theme, page } = jobs[i];
    const col = i % COLS, row = Math.floor(i / COLS);
    const x = col * W, y = row * (H + LABEL_H);
    const label = `${theme.slice(0, 11)} p${page}`;
    try {
      const buf = await downloadObject(`${F}/${'generated'}/${folderFor(theme)}/page-${page}.png`);
      const thumb = await sharp(buf).resize(W - 4, H - 4, { fit: 'cover' }).toBuffer();
      cells.push({ input: thumb, left: x + 2, top: y + LABEL_H });
    } catch {
      // A gap in a book is itself the finding — show it rather than aborting.
      missing++;
      cells.push({
        input: Buffer.from(`<svg width="${W - 4}" height="${H - 4}"><rect width="100%" height="100%" fill="#3b1d1d"/><text x="10" y="${H / 2}" font-family="sans-serif" font-size="15" fill="#f88">MISSING</text></svg>`),
        left: x + 2, top: y + LABEL_H,
      });
    }
    cells.push({
      input: Buffer.from(`<svg width="${W}" height="${LABEL_H}"><text x="4" y="16" font-family="sans-serif" font-size="13" fill="white">${label}</text></svg>`),
      left: x, top: y,
    });
  }

  const rows = Math.ceil(jobs.length / COLS);
  await sharp({ create: { width: COLS * W, height: rows * (H + LABEL_H), channels: 3, background: '#111827' } })
    .composite(cells)
    .jpeg({ quality: 84 })
    .toFile(out);
  console.log(`${out} — ${jobs.length} pages${missing ? `, ${missing} MISSING` : ''}`);
})().catch((err) => { console.error(err.message); process.exit(1); });
