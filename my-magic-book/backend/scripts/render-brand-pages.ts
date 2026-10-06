/**
 * Render the printed book's branded pages to PNG, using the exact functions the
 * print pipeline uses — for checking a logo change before any order is built.
 *
 * Nothing is downloaded or uploaded and no order is touched: the cover artwork
 * is a local placeholder, and the output goes to the folder you name.
 *
 * Usage:
 *   npx tsx scripts/render-brand-pages.ts <out-dir> [cover-image]
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer';
import { brandedPagesForReview as P, PRINT_PAGE_MM } from '../src/services/PrintService';

async function main() {
  const out = path.resolve(process.argv[2] || 'brand-review');
  const coverPath = process.argv[3] || path.resolve(__dirname, '../../frontend/public/showcase/tala.webp');
  fs.mkdirSync(out, { recursive: true });
  const cover = `data:image/webp;base64,${fs.readFileSync(coverPath).toString('base64')}`;

  const pages = [
    P.titlePageHtml('مُغَامَرَةُ تالا فِي حَدِيقَةِ الْحَيَوَانَاتِ', 'تالا'),
    P.fanoosPageHtml(),
    P.copyrightPageHtml(''),
    P.storyTextPageHtml('فَتَحَتْ بيلا الْكِتَابَ، فَخَرَجَ مِنْهُ ضَوْءٌ ذَهَبِيٌّ دَافِئٌ.', 0, P.emblemDataUri()),
  ];
  const spine = 10;
  const wrap = P.wraparoundDoc({
    frontSrc: cover, backSrc: cover, childPhotoSrc: cover,
    title: 'مُغَامَرَةُ تالا فِي حَدِيقَةِ الْحَيَوَانَاتِ', childName: 'تالا',
    kind: 'story', rtl: true, theme: 'zoo_adventure',
    spineMm: spine, panelWmm: PRINT_PAGE_MM, widthMm: PRINT_PAGE_MM * 2 + spine, heightMm: PRINT_PAGE_MM,
  } as any);

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  // Load the way the print pipeline does: from a file, wait for 'load', then
  // for the fonts — not setContent, which stalls on a page full of data URIs.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-brand-'));
  const load = async (pg: any, html: string, name: string) => {
    const file = path.join(tmp, `${name}.html`);
    fs.writeFileSync(file, html);
    await pg.goto(`file://${file}`, { waitUntil: 'load' });
    await pg.evaluate(async () => { // @ts-ignore
      if (document.fonts && document.fonts.ready) await document.fonts.ready; });
  };
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 2000, height: 1000, deviceScaleFactor: 1 });

    await load(page, P.squareDoc(pages, true), 'interior');
    const names = ['title', 'fanoos', 'copyright', 'story-card'];
    const els = await page.$$('.page');
    for (let i = 0; i < els.length; i++) await els[i].screenshot({ path: path.join(out, `${names[i]}.png`) });
    await page.pdf({ path: path.join(out, 'interior.pdf'), preferCSSPageSize: true, printBackground: true });

    await load(page, wrap, 'cover');
    const w = await page.$('.wrap');
    await w!.screenshot({ path: path.join(out, 'cover-wraparound.png') });
    await page.pdf({ path: path.join(out, 'cover.pdf'), preferCSSPageSize: true, printBackground: true });
  } finally {
    await browser.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log('rendered to', out, fs.readdirSync(out));
}
main().catch((e) => { console.error(e); process.exit(1); });
