/**
 * Share cards for the story pages: frontend/public/og/stories/<slug>.jpg
 *
 * A story link pasted into WhatsApp showed the same generic logo card for all
 * thirty-one stories, so «حكاية في القدس» and «عيد ميلادي» previewed
 * identically — and WhatsApp is where parents here pass things on. Each card
 * is that story's own cover, its title and the brand, at the 1200×630 every
 * link preview uses, and well under the ~300KB WhatsApp silently drops.
 *
 * Free and read-only: covers come through the public image proxy, nothing is
 * generated. Re-run after a theme's cover is redone:
 *
 *   cd backend && npx tsx scripts/make-story-share-cards.ts [slug ...]
 *
 * The build (frontend/scripts/prerender.mjs) points a story page's og:image at
 * its card when the file exists, and at the generic card when it does not.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer';
import { storySlug, cardForStory, themeCoverPath } from '../../frontend/src/data/storyPages';

const FE = path.resolve(__dirname, '../../frontend');
const OUT = path.join(FE, 'public/og/stories');
const API_IMAGE = 'https://magicfanoos-api-us.onrender.com/api/uploads/image?path=';
const MAX_BYTES = 300 * 1024;

const ar = JSON.parse(fs.readFileSync(path.join(FE, 'src/locales/ar/translation.json'), 'utf8'));
const plain = (s: string) =>
  String(s || '').replace(/\{([^|}]*)\|[^}]*\}/g, '$1').replace(/[ً-ْٰـ]/g, '').replace(/\s+/g, ' ').trim();
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const fileUrl = (p: string) => 'file://' + p;

function cardHtml(title: string, desc: string, art: string | null): string {
  const brand = path.join(FE, 'public/brand');
  const tile = art
    ? `<img class="cover" src="${fileUrl(art)}">`
    : `<img class="emblem" src="${fileUrl(path.join(brand, 'emblem.svg'))}">`;
  // A fixed sprinkle of stars, so a re-run does not change every file.
  const stars = Array.from({ length: 34 }, (_, i) => {
    const x = (i * 137) % 1200, y = (i * 89) % 630, r = 1 + (i % 3);
    return `<i style="left:${x}px;top:${y}px;width:${r}px;height:${r}px;opacity:${0.25 + (i % 4) * 0.15}"></i>`;
  }).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Lalezar&family=Noto+Kufi+Arabic:wght@600;800&family=Fredoka:wght@600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0}
.card{width:1200px;height:630px;position:relative;overflow:hidden;direction:rtl;color:#fff;font-family:'Noto Kufi Arabic',sans-serif;
  background:radial-gradient(circle at 78% 30%,rgba(251,191,36,.16),transparent 45%),linear-gradient(160deg,#0B1022 0%,#141A4A 55%,#3B1D8A 100%)}
.stars i{position:absolute;border-radius:50%;background:#fff}
.tile{position:absolute;top:65px;right:60px;width:500px;height:500px;border-radius:28px;overflow:hidden;border:4px solid rgba(253,230,138,.55);
  box-shadow:0 24px 60px rgba(0,0,0,.5);background:#0a1426;display:flex;align-items:center;justify-content:center}
.tile .cover{width:100%;height:100%;object-fit:cover}.tile .emblem{width:70%}
.text{position:absolute;top:60px;bottom:60px;right:610px;left:60px;display:flex;flex-direction:column;justify-content:center}
.eyebrow{font-weight:800;font-size:24px;color:#FDE68A;margin:0 0 14px}
h1{font-family:'Lalezar',sans-serif;font-weight:400;font-size:66px;line-height:1.15;margin:0 0 18px}
.desc{font-weight:600;font-size:25px;line-height:1.65;color:rgba(255,255,255,.8);margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.brand{position:absolute;left:60px;bottom:52px;display:flex;align-items:center;gap:14px;direction:ltr}
.brand .mark{width:58px;height:58px}.brand .word{height:32px}
.url{position:absolute;right:610px;bottom:58px;font-family:'Fredoka';font-weight:600;font-size:24px;color:#FBBF24;direction:ltr}
</style></head><body><div class="card"><div class="stars">${stars}</div>
<div class="tile">${tile}</div>
<div class="text"><p class="eyebrow">قصة مخصّصة باسم طفلك ووجهه</p><h1>${esc(title)}</h1>${desc ? `<p class="desc">${esc(desc)}</p>` : ''}</div>
<div class="brand"><img class="mark" src="${fileUrl(path.join(brand, 'mark.svg'))}"><img class="word" src="${fileUrl(path.join(brand, 'wordmark-dark.svg'))}"></div>
<div class="url">magicfanoos.com</div>
</div></body></html>`;
}

async function download(objectPath: string, to: string): Promise<boolean> {
  const res = await fetch(`${API_IMAGE}${encodeURIComponent(objectPath)}&w=960`);
  if (!res.ok) return false;
  fs.writeFileSync(to, Buffer.from(await res.arrayBuffer()));
  return true;
}

(async () => {
  const only = process.argv.slice(2);
  const ids = Object.keys(ar.stories).filter((id) => ar.stories[id]?.title)
    .filter((id) => !only.length || only.includes(storySlug(id)));
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'share-cards-'));

  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

  for (const id of ids) {
    const slug = storySlug(id);
    const title = plain(ar.step2?.[`theme_${id}`] || ar.stories[id].title).replace(/\[NAME\]/g, 'طفلك');
    const desc = plain(ar.step2?.[`theme_${id}_desc`] || '');
    // Same rule as the page: art only from a card that is already public.
    const card = cardForStory(id);
    const real = card?.storyId && !card.storyId.startsWith('theme_') ? card.storyId : '';
    let art: string | null = null;
    if (card) {
      const cover = real ? `magic-fanoose/generated/${real}/page-00.png` : themeCoverPath(card.themeId);
      const file = path.join(tmp, `${slug}.webp`);
      if (await download(cover, file)) art = file;
      else console.warn(`  ${slug}: cover did not load — using the emblem`);
    }
    fs.writeFileSync(path.join(tmp, `${slug}.html`), cardHtml(title, desc, art));
    await page.goto(fileUrl(path.join(tmp, `${slug}.html`)), { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluate(async () => { await (document as any).fonts.ready; });
    let quality = 84;
    let buf = Buffer.from(await page.screenshot({ type: 'jpeg', quality }));
    while (buf.length > MAX_BYTES && quality > 50) {
      quality -= 8;
      buf = Buffer.from(await page.screenshot({ type: 'jpeg', quality }));
    }
    fs.writeFileSync(path.join(OUT, `${slug}.jpg`), buf);
    console.log(`  ${slug.padEnd(22)} ${(buf.length / 1024).toFixed(0).padStart(4)}KB q${quality}${art ? '' : '  (emblem)'}`);
  }
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`wrote ${ids.length} cards to ${path.relative(process.cwd(), OUT)}`);
})().catch((e) => { console.error(e); process.exit(1); });
