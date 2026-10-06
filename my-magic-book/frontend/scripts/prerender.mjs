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

const API_IMAGE = 'https://magicfanoos-api-us.onrender.com/api/uploads/image?path=';

/**
 * Which theme's artwork may illustrate each story, read from the same showcase
 * list the app uses (src/data/showcaseCards.ts — one card per line). Only
 * cards that are not private and are built from the theme's own demo art
 * count: a real child's book, or a real customer's order, never goes into a
 * page built to be found by strangers. Mirrors cardForStory() in
 * src/data/storyPages.ts. A story with no such card (the alphabet books) gets
 * no image rather than a broken one.
 */
const TEXT_THEME = { space_real: 'space' };
function publicArt() {
  const src = fs.readFileSync(path.join(root, 'src/data/showcaseCards.ts'), 'utf8');
  const art = {};
  for (const line of src.split('\n')) {
    const m = line.match(/themeId:\s*'([^']+)'/);
    if (!m || /private:\s*true/.test(line)) continue;
    const story = line.match(/storyId:\s*'([^']+)'/);
    if (story && !story[1].startsWith('theme_')) continue;
    const id = TEXT_THEME[m[1]] || m[1];
    art[id] ??= m[1];
  }
  return art;
}
const ART = publicArt();

/** The scripted stories, labelled the way the wizard labels them. */
function storyList() {
  return Object.entries(t.stories || {})
    .filter(([, v]) => v && typeof v === 'object' && v.title)
    .map(([id, v]) => ({
      id,
      // Same rule as storySlug() in src/data/storyPages.ts: the id, hyphenated.
      slug: id.replace(/_/g, '-'),
      label: plain(t.step2?.[`theme_${id}`]) || plain(v.title),
      desc: plain(t.step2?.[`theme_${id}_desc`] || ''),
      pages: Object.keys(v.pages || {}).sort((a, b) => Number(a) - Number(b)).map((k) => plain(v.pages[k])),
      moral: plain(v.moral || ''),
      cover: ART[id] ? `${API_IMAGE}${encodeURIComponent(`magic-fanoose/generated/theme_${ART[id]}/page-00.png`)}&w=640` : '',
    }));
}

const stories = storyList();
const brandDesc = t.meta?.about_desc
  || 'ماجيك فانوس: كتب أطفال مخصّصة، اسم طفلك ووجهه في كل صفحة، مطبوعة ومشحونة من القدس.';

const list = (items) =>
  `<ul>${items.map((s) => `<li><a href="/stories/${s.slug}" style="color:#f0c45a"><strong>${esc(s.label)}</strong></a>${s.desc ? ` — ${esc(s.desc)}` : ''}</li>`).join('')}</ul>`;

const sp = t.story_page || {};
const fill = (tpl, vars) => String(tpl || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');

/**
 * A story's page, as a crawler sees it: what the story is, its first pages and
 * its moral in plain Arabic, and a real link to every other story. React
 * replaces all of this on load (src/pages/StoryDetail.tsx).
 */
function storyRoute(s) {
  const url = `${ORIGIN}/stories/${s.slug}`;
  const others = stories.filter((o) => o.id !== s.id);
  const ld = [
    {
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: s.label,
      description: s.desc || undefined,
      inLanguage: 'ar',
      url,
      image: s.cover || undefined,
      publisher: { '@type': 'Organization', name: 'Magic Fanoos', url: ORIGIN },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: sp.breadcrumb_stories || 'القصص', item: `${ORIGIN}/stories` },
        { '@type': 'ListItem', position: 2, name: s.label, item: url },
      ],
    },
  ];
  return {
    path: `/stories/${s.slug}`,
    title: fill(sp.meta_title || '{{story}}', { story: s.label }),
    desc: fill(sp.meta_desc || '{{desc}}', { desc: s.desc || s.label }),
    jsonLd: ld,
    body: `<p><a href="/stories" style="color:#f0c45a">${esc(sp.breadcrumb_stories || 'القصص')}</a> › ${esc(s.label)}</p>
           <h1>${esc(s.label)}</h1>${s.desc ? `<p>${esc(s.desc)}</p>` : ''}
           ${s.cover ? `<img src="${esc(s.cover)}" alt="${esc(s.label)}" width="300" height="400" style="border-radius:16px;max-width:100%;height:auto">` : ''}
           <p>${[sp.bullet_name, sp.bullet_photo, sp.bullet_pages, sp.bullet_delivery].filter(Boolean).map(esc).join(' · ')}</p>
           <h2>${esc(sp.excerpt_title || 'من صفحات القصة')}</h2>${s.pages.slice(0, 3).map((p) => `<p>${esc(p)}</p>`).join('')}
           ${s.moral ? `<h2>${esc(sp.moral_title || '')}</h2><p>${esc(s.moral)}</p>` : ''}
           <p><a href="/create" style="color:#f0c45a"><strong>${esc(t.stories_page?.modal_cta_theme || 'اصنع هذه القصة لطفلك')}</strong></a></p>
           <h2>${esc(sp.more_title || 'قصص أخرى')}</h2>${list(others)}`,
  };
}

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
  ...stories.map(storyRoute),
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
  if (r.jsonLd) {
    // `<` escaped so no string in a story can close the script tag.
    const ld = r.jsonLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
    html = html.replace('</head>', `${ld}</head>`);
  }

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

/**
 * The sitemap, from the same route list — so a story added to the translations
 * is in it the moment it has a page, and one that is removed drops out. It was
 * a hand-written file in public/ that would have needed thirty-one more
 * entries kept in step by hand.
 */
const PRIORITY = { '/': ['weekly', '1.0'], '/stories': ['weekly', '0.9'], '/create': ['monthly', '0.8'], '/policy': ['yearly', '0.3'] };
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map((r) => {
  const [freq, prio] = PRIORITY[r.path] || (r.path.startsWith('/stories/') ? ['monthly', '0.7'] : ['monthly', '0.5']);
  return `  <url>\n    <loc>${ORIGIN}${r.path}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${prio}</priority>\n  </url>`;
}).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap);

console.log(`prerendered ${written} routes (${stories.length} story pages), sitemap ${ROUTES.length} urls`);
