import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * One logo for the website, and the share card WhatsApp will actually show.
 *
 * The site's brand used to be an illustration (two children, an oil lamp, a
 * book and the name painted inside it) dropped into six places as
 * /logo.png, each with its own hand-set name beside it. It is now a single
 * component: a lamp glowing in a starry night tile, and the name "magic fanoos"
 * drawn as shapes. Every page that shows the brand renders BrandLogo, so the
 * next change to the logo is one file, not six.
 *
 * The books carry the same logo — the on-screen book, the flipbook preview and
 * the PDF that goes to the printer — and the two sides are held to the same
 * artwork, because a preview that doesn't match the print is a promise broken
 * at the door.
 */

const FE = path.resolve(__dirname, '../../frontend');
const read = (p: string) => fs.readFileSync(path.join(FE, p), 'utf8');
const BE = path.resolve(__dirname, '..');
const readBE = (p: string) => fs.readFileSync(path.join(BE, p), 'utf8');

const SITE_CHROME = [
  'src/components/common/Navbar.tsx',
  'src/components/common/Footer.tsx',
  'src/pages/Login.tsx',
  'src/pages/Register.tsx',
  'src/pages/ForgotPassword.tsx',
  'src/pages/ResetPassword.tsx',
];

describe('the website shows one logo', () => {
  it.each(SITE_CHROME)('%s renders BrandLogo, not the old image', (file) => {
    const src = read(file);
    expect(src).toContain('<BrandLogo');
    expect(src, `${file} went back to /logo.png`).not.toContain('logo.png');
  });

  it('writes the name in English only, as the owner asked', () => {
    for (const file of SITE_CHROME) {
      expect(read(file), `${file} still prints the Arabic name beside the logo`).not.toContain('الفانوس السحري');
    }
  });

  it('gives the wordmark colours for both themes', () => {
    // The letters are shapes, so their colour comes from CSS — without these the
    // light site would paint a white "fanoos" on a pale page.
    const css = read('src/index.css');
    for (const rule of ['.mf-wordmark .mf-gold', '.mf-wordmark .mf-ink',
                        ':root[data-theme="light"] .mf-wordmark .mf-gold',
                        ':root[data-theme="light"] .mf-wordmark .mf-ink']) {
      expect(css).toContain(rule);
    }
  });

  it('keeps gradient ids unique per logo', () => {
    // Header and footer both draw the mark; shared ids make the second one
    // borrow the first one's gradients and render blank in some browsers.
    expect(read('src/components/common/BrandLogo.tsx')).toContain('useId(');
  });
});

describe('the icons and the share card', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:href|content)="(?:https:\/\/www\.magicfanoos\.com)?(\/(?:icon|og)-[^"]+)"/g)].map((m) => m[1]);

  it('points at files that exist', () => {
    expect(refs.length).toBeGreaterThanOrEqual(5);
    for (const r of refs) {
      expect(fs.existsSync(path.join(FE, 'public', r)), `${r} is referenced but missing from public/`).toBe(true);
    }
  });

  it('uses a wide share card, sized for summary_large_image', () => {
    expect(html).toContain('content="summary_large_image"');
    expect(html).toMatch(/og:image" content="[^"]*og-v7\.jpg"/);
    expect(html).toContain('<meta property="og:image:width" content="1200" />');
    expect(html).toContain('<meta property="og:image:height" content="630" />');
  });

  it('keeps the share card small enough for WhatsApp to preview', () => {
    // WhatsApp silently drops the link preview when the image is over ~300KB,
    // and WhatsApp is where this shop's links get passed around.
    const bytes = fs.statSync(path.join(FE, 'public/og-v7.jpg')).size;
    expect(bytes, `og image is ${Math.round(bytes / 1024)}KB`).toBeLessThan(300 * 1024);
  });

  it('tells Google the new logo', () => {
    expect(html).toContain('"logo": "https://www.magicfanoos.com/icon-512-v7.png"');
  });
});

const BOOK = [
  'src/components/book/FrontCover.tsx',
  'src/components/book/TitlePage.tsx',
  'src/components/book/CopyrightPage.tsx',
  'src/components/book/FanoosPage.tsx',
  'src/components/book/BackCover.tsx',
  'src/components/wizard/FlipbookPreview.tsx',
  'src/components/wizard/CoverPreview.tsx',
];

describe('the on-screen book shows the same logo', () => {
  it.each(BOOK)('%s uses the brand components, not the old picture', (file) => {
    const src = read(file);
    expect(src).toContain('<BrandMark');
    expect(src, `${file} still points at /logo.png`).not.toContain('logo.png');
  });

  it('keeps the wordmark white-and-gold on every book page', () => {
    // A book page is dark in both themes (it mirrors the printed page), so a
    // theme-following "fanoos" would turn navy-on-navy in light mode.
    for (const file of BOOK) {
      const words = read(file).match(/<BrandWordmark[^>]*>/g) || [];
      for (const w of words) expect(w, `${file}: ${w}`).toContain('tone="onDark"');
    }
  });

  it('no longer forces the old picture onto the «فانوس» pages', () => {
    expect(read('src/components/book/StoryBook.tsx')).not.toContain('logo.png');
  });

  it('reads icon-then-name even inside the right-to-left book', () => {
    expect(read('src/components/book/FrontCover.tsx')).toContain('className="cover-brand" dir="ltr"');
    expect(read('src/components/book/BackCover.tsx')).toContain('className="bc-footer" dir="ltr"');
  });
});

describe('the printed book carries the same logo', () => {
  const ps = readBE('src/services/PrintService.ts');

  it('embeds the new brand, not logo.png', () => {
    expect(ps).not.toContain("'logo.png'");
    for (const f of ['mark', 'wordmark-on-dark', 'lamp']) {
      expect(fs.existsSync(path.join(BE, 'assets/brand', `${f}.svg`)), `assets/brand/${f}.svg is missing`).toBe(true);
    }
  });

  it('prints exactly the artwork the website shows', () => {
    // Two copies of a logo drift apart. Byte-for-byte is the only safe test.
    expect(readBE('assets/brand/mark.svg')).toBe(read('public/brand/mark.svg'));
    expect(readBE('assets/brand/wordmark-on-dark.svg')).toBe(read('public/brand/wordmark-dark.svg'));
  });

  it('keeps the back-cover footer icon-then-name in the RTL panel', () => {
    expect(ps).toMatch(/\.bc-foot \{[^}]*direction: ltr/);
  });

  it('prints the address the website and the on-screen book show', () => {
    // The printed copyright page carried an old, misspelt gmail while the
    // screen said hello@magicfanoos.com.
    expect(ps).toContain('hello@magicfanoos.com');
    expect(ps).not.toContain('magicfanoose@gmail.com');
    expect(read('src/components/book/CopyrightPage.tsx')).toContain('hello@magicfanoos.com');
  });
});
