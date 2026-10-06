import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  storySlug, storyIdFromSlug, cardForStory, wizardThemeFor, textThemeFor,
} from '../../frontend/src/data/storyPages';
import { SHOWCASE_CARDS, isPrivateCard } from '../../frontend/src/data/showcaseCards';

/**
 * Every story has a page of its own, at /stories/<slug>.
 *
 * The site had six URLs. A parent searching «قصة عن القدس للأطفال» found
 * nothing of ours, because thirty-one stories lived inside one modal on one
 * page with one title. Each now gets a real, prerendered page, a sitemap entry
 * and a rewrite — and the guards below are about the ways that quietly breaks:
 * a story without a rewrite serves the HOME page's HTML at its own URL, and a
 * page built to be found by strangers must never show a child who was not
 * cleared to be public.
 */

const root = path.resolve(__dirname, '../..');
const ar = JSON.parse(fs.readFileSync(path.join(root, 'frontend/src/locales/ar/translation.json'), 'utf8'));
const STORIES = Object.keys(ar.stories).filter((id) => ar.stories[id]?.title);

describe('story page URLs', () => {
  it('round-trips every story id through its slug', () => {
    for (const id of STORIES) expect(storyIdFromSlug(storySlug(id))).toBe(id);
  });

  it('uses hyphens, which is what people and search engines read as word breaks', () => {
    expect(storySlug('jerusalem_tale')).toBe('jerusalem-tale');
    expect(storySlug('space')).toBe('space');
  });

  it('gives every story a vercel rewrite, ahead of the catch-all', () => {
    // Without its own rewrite the catch-all answers /stories/x with the home
    // page's HTML — a page that lies about which page it is.
    const vercel = JSON.parse(fs.readFileSync(path.join(root, 'frontend/vercel.json'), 'utf8'));
    const sources: string[] = vercel.rewrites.map((r: any) => r.source);
    const catchAll = sources.indexOf('/(.*)');
    expect(catchAll).toBe(sources.length - 1);
    for (const id of STORIES) {
      const i = sources.indexOf(`/stories/${storySlug(id)}`);
      expect(i, `no rewrite for ${id}`).toBeGreaterThanOrEqual(0);
      expect(vercel.rewrites[i].destination).toBe(`/stories/${storySlug(id)}/index.html`);
    }
  });

  it('is routed in the app', () => {
    const app = fs.readFileSync(path.join(root, 'frontend/src/App.tsx'), 'utf8');
    expect(app).toMatch(/path="stories\/:slug"/);
  });

  it('builds the sitemap from the route list instead of a hand-kept file', () => {
    const prerender = fs.readFileSync(path.join(root, 'frontend/scripts/prerender.mjs'), 'utf8');
    expect(prerender).toContain("'sitemap.xml'");
    expect(prerender).toContain('...stories.map(storyRoute)');
    expect(fs.existsSync(path.join(root, 'frontend/public/sitemap.xml'))).toBe(false);
  });
});

describe('which child illustrates a story page', () => {
  it('never picks a private card, even when it is the only match', () => {
    for (const id of STORIES) {
      const card = cardForStory(id);
      if (card) expect(isPrivateCard(card), `${id} → ${card.key}`).toBe(false);
    }
    // Lora is a real child; her zoo book must never be the zoo page.
    expect(cardForStory('zoo_adventure')?.key).toBe('tala-zoo');
  });

  it('prefers the theme\'s demo art over a real customer\'s book', () => {
    // `space` has Liam's real order and Mariam's demo.
    expect(cardForStory('space')?.key).toBe('mariam-space');
  });

  it('respects the owner unticking a card from the Stories page', () => {
    expect(cardForStory('jerusalem_tale', { 'omar-jerusalem': { stories: false } })).toBeUndefined();
  });

  it('leaves the alphabet books without art rather than invent some', () => {
    // Their theme entries point at pictures that were never made (404).
    expect(cardForStory('alphabet_abc')).toBeUndefined();
    expect(cardForStory('alphabet_ar')).toBeUndefined();
  });

  it('opens the wizard on an orderable theme', () => {
    expect(wizardThemeFor('space')).toBe('space_real');
    expect(wizardThemeFor('jerusalem_tale')).toBe('jerusalem_tale');
    // Even when only Liam's card (filed under 'space') is left public.
    expect(wizardThemeFor('space', { 'mariam-space': { stories: false } })).toBe('space_real');
  });

  it('the build script agrees with the app about which theme art is public', () => {
    // prerender.mjs reads showcaseCards.ts line by line; a card split over two
    // lines would hide its `private: true` from it.
    const src = fs.readFileSync(path.join(root, 'frontend/src/data/showcaseCards.ts'), 'utf8');
    for (const card of SHOWCASE_CARDS) {
      const line = src.split('\n').find((l) => l.includes(`key: '${card.key}'`));
      expect(line, card.key).toBeDefined();
      expect(line!.includes(`themeId: '${card.themeId}'`), card.key).toBe(true);
      if (card.private) expect(/private:\s*true/.test(line!), card.key).toBe(true);
    }
    expect(textThemeFor('space_real')).toBe('space');
  });
});

/** Width × height of a JPEG, read from its start-of-frame marker. */
function jpegSize(buf: Buffer): [number, number] | null {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return null;
}

describe('sharing a story link', () => {
  it('every story has its own share card, sized for link previews and small enough for WhatsApp', () => {
    // A story link in WhatsApp used to preview as the generic logo card for
    // all thirty-one stories. WhatsApp drops a preview image over ~300KB.
    for (const id of STORIES) {
      const file = path.join(root, `frontend/public/og/stories/${storySlug(id)}.jpg`);
      expect(fs.existsSync(file), `no share card for ${id} — run scripts/make-story-share-cards.ts`).toBe(true);
      const buf = fs.readFileSync(file);
      expect(buf.length, id).toBeLessThan(300 * 1024);
      expect(jpegSize(buf), id).toEqual([1200, 630]);
    }
  });

  it('the build points each story page at its own card and its own language versions', () => {
    const prerender = fs.readFileSync(path.join(root, 'frontend/scripts/prerender.mjs'), 'utf8');
    expect(prerender).toContain('og/stories/${s.slug}.jpg');
    // index.html's hreflang names the HOME page; copied unchanged, every story
    // told Google its other-language versions were the home page.
    expect(prerender).toMatch(/hreflang="\(ar\|x-default\)"/);
    expect(prerender).toMatch(/\?lng=\$\{lang\}/);
  });
});
