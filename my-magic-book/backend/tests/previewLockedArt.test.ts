import { describe, it, expect } from 'vitest';
import { buildThemePreview, type PreviewPage } from '../../frontend/src/components/wizard/FlipbookPreview';

/**
 * Locked preview pages borrow a picture rather than showing a bare padlock.
 *
 * 29 of the demo stories were shot only as far as the preview is readable:
 * a cover and four pages. Everything after the lock was blurred text with no
 * picture beside it — five spreads of grey in a row, counted on the live site,
 * at the moment a parent decides whether to pay. A blurred picture says there
 * is a book behind the lock; a padlock on an empty page says there isn't.
 *
 * The rule has limits that matter as much as the rule: a repeat is only ever
 * shown blurred, never on a readable page (where it would be plain to see),
 * and never in the full admin preview (which must show exactly what exists).
 */

const PAGES: Record<string, string> = Object.fromEntries(
  Array.from({ length: 13 }, (_, i) => [String(i + 1), `page ${i + 1} [NAME]`]),
);
const fakeI18n = {
  getFixedT: () => (key: string, def?: unknown) => {
    if (key === 'stories.demo.title') return 'A story for [NAME]';
    if (key === 'stories.demo.pages') return PAGES;
    return typeof def === 'string' ? def : '';
  },
};
const img = (n: number) => `https://img.test/page-${String(n).padStart(2, '0')}.png`;

function build(pageImages: string[], full = false) {
  return buildThemePreview({
    theme: 'demo', language: 'en', childName: 'Tala', childGender: 'female',
    coverImage: img(0), pageImages, i18n: fakeI18n, full,
  });
}
const pictures = (pages: PreviewPage[]) => pages.filter((p) => p.type === 'text' && p.image);

describe('locked preview pages', () => {
  it('give every locked page a picture when only the readable four were shot', () => {
    const pages = build([img(1), img(2), img(3), img(4)]);
    // 13 story pages, each with a picture beside it.
    expect(pictures(pages)).toHaveLength(13);
  });

  it('only ever show a borrowed picture blurred', () => {
    const shot = [img(1), img(2), img(3), img(4)];
    const pics = pictures(build(shot));
    // The first four are the real ones and readable…
    expect(pics.slice(0, 4).map((p) => [p.image, !!p.blur])).toEqual(shot.map((s) => [s, false]));
    // …everything after is borrowed from those four, and blurred.
    for (const p of pics.slice(4)) {
      expect(shot).toContain(p.image);
      expect(p.blur).toBe(true);
    }
  });

  it('prefers a page\'s own picture when it has one', () => {
    const full13 = Array.from({ length: 13 }, (_, i) => img(i + 1));
    const pics = pictures(build(full13));
    expect(pics.map((p) => p.image)).toEqual(full13);
  });

  it('never borrows in the full admin preview', () => {
    const pics = pictures(build([img(1), img(2), img(3), img(4)], true));
    expect(pics.map((p) => p.image)).toEqual([img(1), img(2), img(3), img(4)]);
  });

  it('never fills a readable page with someone else\'s picture', () => {
    // Two shot pages: readable pages 3 and 4 stay text-only rather than repeat.
    const pages = build([img(1), img(2)]);
    const readablePics = pictures(pages).filter((p) => !p.blur);
    expect(readablePics.map((p) => p.image)).toEqual([img(1), img(2)]);
  });

  it('copes with a story that has no pictures at all', () => {
    expect(pictures(build([]))).toHaveLength(0);
  });
});
