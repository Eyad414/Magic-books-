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
 * The printed books are a separate matter on purpose — their pages mirror what
 * goes to the printer, so they are not asserted on here.
 */

const FE = path.resolve(__dirname, '../../frontend');
const read = (p: string) => fs.readFileSync(path.join(FE, p), 'utf8');

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
