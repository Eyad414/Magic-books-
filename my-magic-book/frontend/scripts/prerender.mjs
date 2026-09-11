/**
 * Give every route real HTML, before any JavaScript runs.
 *
 * This is a single-page app: the server sends one index.html whose <body> is an
 * empty <div id="root">, and React fills it in the browser. A crawler fetching
 * /stories therefore receives 0 characters of visible text and one <title> —
 * the home page's — for every route on the site. Google does run JavaScript,
 * but it does so on a slower second pass and with no guarantee, which is a bad
 * bet for a new site with no authority to spend.
 *
 * So after `vite build` we write a real index.html per route: the correct head
 * (title, description, canonical, og/twitter) and a body carrying the page's
 * actual words and links. React still owns the page — createRoot (not
 * hydrateRoot) clears the container on mount — so this changes nothing about
 * how the app behaves once loaded.
 *
 * Deliberately NOT a headless-browser crawl. A browser in the deploy build is
 * slow, needs a ~300MB Chromium download, and fails the whole deploy when that
 * download is blocked. Everything below is read straight from the translation
 * files the app itself uses, so it cannot drift and cannot break the build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ORIGIN = 'https://www.magicfanoos.com';
const SUFFIX = 'Magic Fanoos | ماجيك فانوس';

const t = JSON.parse(fs.readFileSync(path.join(root, 'src/locales/ar/translation.json'), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Story titles are written for the printed book: fully voweled, with a [NAME]
 * placeholder and {male|female} gender pairs. None of that belongs in a search
 * result, so strip it back to plain words.
 */
const plain = (s) =>
  String(s || '')
    .replace(/\{([^|}]*)\|[^}]*\}/g, '$1')
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/\[NAME\]/g, 'طفلك')
    .replace(/\s+/g, ' ')
    .trim();

/** The scripted stories, labelled the way the wizard labels them. */
function storyList() {
  return Object.entries(t.stories || {})
    .filter(([, v]) => v && typeof v === 'object' && v.title)
    .map(([id, v]) => ({
      id,
      label: t.step2?.[`theme_${id}`] || plain(v.title),
      desc: t.step2?.[`theme_${id}_desc`] || '',
    }));
}

const stories = storyList();
const brandDesc = t.meta?.about_desc
  || 'ماجيك فانوس: كتب أطفال مخصّصة، اسم طفلك ووجهه في كل صفحة، مطبوعة ومشحونة من القدس.';

const list = (items) =>
  `<ul>${items.map((s) => `<li><strong>${esc(s.label)}</strong>${s.desc ? ` — ${esc(s.desc)}` : ''}</li>`).join('')}</ul>`;

const NAV = [
  ['/', 'الرئيسية'],
  ['/stories', 'القصص الجاهزة'],
  ['/create', 'ابدأ قصة طفلك'],
  ['/about', 'من نحن'],
  ['/contact', 'تواصل معنا'],
];

const ROUTES = [
  {
    path: '/',
    title: t.meta?.home_title || SUFFIX,
    desc: brandDesc,
    body: `<h1>${esc(SUFFIX)} — قصص مخصّصة لطفلك</h1><p>${esc(brandDesc)}</p>
           <p>اختر قصة، أرسل صورة واحدة لطفلك، ويصلك الكتاب مطبوعاً باسمه ووجهه في كل صفحة.</p>
           ${list(stories.slice(0, 8))}`,
  },
  {
    path: '/stories',
    title: t.meta?.stories_title,
    desc: t.meta?.stories_desc,
    // The single most valuable page to index: twenty distinct story subjects a
    // parent might actually search for, none of which existed in the HTML.
    body: `<h1>${esc(t.meta?.stories_title || 'قصص جاهزة لطفلك')}</h1><p>${esc(t.meta?.stories_desc || '')}</p>
           <h2>كل القصص المتاحة (${stories.length})</h2>${list(stories)}`,
  },
  {
    path: '/create',
    title: t.meta?.create_title,
    desc: t.meta?.create_desc,
    body: `<h1>${esc(t.meta?.create_title || 'ابدأ قصة طفلك')}</h1><p>${esc(t.meta?.create_desc || '')}</p>`,
  },
  {
    path: '/about',
    title: t.meta?.about_title,
    desc: t.meta?.about_desc,
    body: `<h1>${esc(t.meta?.about_title || 'من نحن')}</h1><p>${esc(t.meta?.about_desc || '')}</p>`,
  },
  {
    path: '/contact',
    title: t.meta?.contact_title,
    desc: t.meta?.contact_desc,
    body: `<h1>${esc(t.meta?.contact_title || 'تواصل معنا')}</h1><p>${esc(t.meta?.contact_desc || '')}</p>`,
  },
  {
    path: '/policy',
    title: t.meta?.policy_title,
    desc: 'سياسة الخصوصية وشروط الاستخدام والاسترجاع في ماجيك فانوس.',
    body: `<h1>${esc(t.meta?.policy_title || 'السياسات والشروط')}</h1><p>سياسة الخصوصية وشروط الاستخدام والاسترجاع.</p>`,
  },
];

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

/** Replace an existing tag's attribute value, leaving the rest of the tag alone. */
function setAttr(html, tagMatch, attr, value) {
  const re = new RegExp(`(<${tagMatch}[^>]*\\b${attr}=")[^"]*(")`, 'i');
  return re.test(html) ? html.replace(re, `$1${esc(value)}$2`) : html;
}

let written = 0;
for (const r of ROUTES) {
  const fullTitle = r.title && !r.title.includes(SUFFIX) ? `${r.title} | ${SUFFIX}` : (r.title || SUFFIX);
  const url = `${ORIGIN}${r.path}`;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(fullTitle)}</title>`);
  html = setAttr(html, 'meta[^>]*name="description"', 'content', r.desc || brandDesc);
  html = setAttr(html, 'link[^>]*rel="canonical"', 'href', url);
  html = setAttr(html, 'meta[^>]*property="og:url"', 'content', url);
  html = setAttr(html, 'meta[^>]*property="og:title"', 'content', fullTitle);
  html = setAttr(html, 'meta[^>]*property="og:description"', 'content', r.desc || brandDesc);
  html = setAttr(html, 'meta[^>]*name="twitter:title"', 'content', fullTitle);
  html = setAttr(html, 'meta[^>]*name="twitter:description"', 'content', r.desc || brandDesc);

  // Sits inside #root, so React's first render replaces it wholesale. Painted
  // in the site's own background so the swap is not a flash of white, and the
  // links are real <a href> — the nav is JS-built, so this is the only way a
  // crawler finds its way from one page to the next.
  const seo =
    `<div id="prerender" style="position:absolute;left:0;right:0;top:0;padding:24px;` +
    `background:#0a0e20;color:#e8e6f0;font-family:system-ui,sans-serif;direction:rtl;line-height:1.9">` +
    r.body +
    `<nav>${NAV.filter(([p]) => p !== r.path).map(([p, l]) => `<a href="${p}" style="color:#f0c45a;margin-left:14px">${esc(l)}</a>`).join('')}</nav>` +
    `</div>`;
  html = html.replace(/(<div id="root">)(\s*)(<\/div>)/i, `$1${seo}$3`);

  const out = r.path === '/' ? path.join(dist, 'index.html') : path.join(dist, r.path, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  written++;
  console.log(`  ${r.path.padEnd(10)} -> ${path.relative(dist, out)}  (${esc(fullTitle).length} char title)`);
}
// A prerendered file is only reachable if vercel.json rewrites its path to it.
// Without the rewrite the catch-all serves the HOME page's HTML for that route —
// the exact bug this script exists to fix, but harder to spot. Fail the build
// rather than deploy a page that lies about which page it is.
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const routed = new Set((vercel.rewrites || []).map((r) => r.source));
const unrouted = ROUTES.filter((r) => r.path !== '/' && !routed.has(r.path)).map((r) => r.path);
if (unrouted.length) {
  console.error(`\nprerender: no vercel.json rewrite for ${unrouted.join(', ')} —`);
  console.error('these routes would serve the home page\'s HTML. Add a rewrite to its own index.html.');
  process.exit(1);
}

console.log(`prerendered ${written} routes, ${stories.length} stories listed on /stories`);
