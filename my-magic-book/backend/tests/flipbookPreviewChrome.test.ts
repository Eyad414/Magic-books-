import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { asSpreads } from '../../frontend/src/utils/bookSpreads';
import path from 'path';

/**
 * The preview book is printed matter, and printed matter does not change
 * colour when the site does.
 *
 * Two faults showed up together the night before an order went to the printer,
 * both of them in light mode, both of them in this one component.
 *
 * 1. The story's own title went invisible. `white` in this codebase is not the
 *    colour white — tailwind.config.js maps it to `rgb(var(--c-fg))`, the
 *    theme's foreground — so `text-white` is pale on the dark site and deep
 *    indigo in light mode. Every other surface flips with the theme, so that is
 *    right everywhere except here: the book's pages carry their own colours in
 *    the markup (#0a1426 covers, dark front matter), they stay dark in both
 *    themes, and the ink on them turned indigo-on-navy and vanished. `paper` is
 *    the fixed #ffffff that ink on a dark page needs.
 *
 * 2. The book sat right of centre. It is a two-page book, but `showCover`
 *    gives the cover a sheet of its own, and a lone sheet fills one half of the
 *    frame and leaves the other empty — measured at the time: a 560px frame
 *    with the cover in the right 280 of it, 67px off the centre line. The fix
 *    parks the book by its VISIBLE page: half a page left when closed at the
 *    front, half a page right on the unpartnered last sheet, nothing in
 *    between, on a stage three pages wide so there is room to move.
 */

const FLIPBOOK = path.resolve(
  __dirname,
  '../../frontend/src/components/wizard/FlipbookPreview.tsx',
);
const src = fs.readFileSync(FLIPBOOK, 'utf8');

describe('the preview book keeps its own colours', () => {
  it('writes its ink as paper, not as the theme foreground', () => {
    expect(src).toContain('text-paper');
  });

  it('has no theme-aware white left anywhere in the book', () => {
    // text-white, bg-white/5, border-white/10 — all of them follow the theme,
    // and every surface in this file is a hardcoded dark page. Only the classes
    // count: the comments above explain the trap and have to be free to name it.
    const offenders = src
      .split('\n')
      .map((line, i) => ({ n: i + 1, line }))
      .filter(({ line }) => /class(Name)?=/.test(line))
      .filter(({ line }) => /\b(text|bg|border|from|to|via)-white\b|-white\//.test(line));
    expect(
      offenders.map((o) => `${o.n}: ${o.line.trim().slice(0, 90)}`),
      'these follow the theme and will go dark-on-dark in light mode — use paper',
    ).toEqual([]);
  });
});

/**
 * The book stays in one place.
 *
 * Centring it was done first by sliding it — half a page left on the lone
 * cover, half a page right on the lone last sheet — which centred every state
 * but made the book visibly move as it opened. The owner asked for it still.
 *
 * It is still because every sheet now has a partner, so the frame is always
 * full and always the same width. That rests entirely on the counting below:
 * an even number of sheets before the body, and an even number in total. Get
 * the first one wrong and nothing looks broken — the book just quietly shows
 * every page's words beside the NEXT page's picture, all the way through.
 */
describe('asSpreads — every sheet gets a partner', () => {
  const cover = { type: 'cover' as const };
  const title = { type: 'title' as const };
  const dedication = { type: 'dedication' as const };
  const lock = { type: 'lock' as const };
  const policy = () => ({ type: 'policy' as const });
  /** A story body: each page is its words, then that page's picture. */
  const body = (n: number) =>
    Array.from({ length: n * 2 }, (_, i) =>
      i % 2 === 0 ? { type: 'text' as const, words: i / 2 } : { type: 'text' as const, picture: (i - 1) / 2 },
    );

  it('gives a bare cover a title page to face', () => {
    const out = asSpreads([cover], body(13), [lock], title, policy);
    expect(out[0].type).toBe('cover');
    expect(out[1].type).toBe('title');
  });

  it('never leaves a sheet without a partner', () => {
    // Odd lengths are the whole problem: 1 cover + 26 body + 1 lock = 28, and
    // adding the title page makes 29.
    for (const pages of [1, 2, 5, 12, 13]) {
      const out = asSpreads([cover], body(pages), [lock], title, policy);
      expect(out.length % 2, `${pages} story pages leaves a half-empty frame`).toBe(0);
    }
  });

  it('keeps every page’s words beside that page’s own picture', () => {
    const out = asSpreads([cover], body(13), [lock], title, policy);
    for (let k = 0; k < 13; k++) {
      const words = out[2 + 2 * k] as any;
      const picture = out[3 + 2 * k] as any;
      expect(words.words, `page ${k + 1}'s words moved`).toBe(k);
      expect(picture.picture, `page ${k + 1} is facing the wrong picture`).toBe(k);
      // Same spread: an even index and the odd one after it.
      expect(Math.floor((2 + 2 * k) / 2)).toBe(Math.floor((3 + 2 * k) / 2));
    }
  });

  it('does not print the copyright page twice', () => {
    // A full book already opens on a title page, so the front is evened up
    // with the copyright sheet — which then has to leave the back.
    const out = asSpreads(
      [cover, title, dedication],
      body(13),
      [{ type: 'final' as const }, policy(), { type: 'back' as const }],
      title,
      policy,
    );
    expect(out.filter((p) => p.type === 'policy')).toHaveLength(1);
    expect(out.length % 2).toBe(0);
    // The body still starts on a left-hand sheet.
    const first = out.findIndex((p: any) => p.words === 0);
    expect(first % 2, 'the body starts on a right-hand sheet, so every page faces the wrong picture').toBe(0);
  });

  it('leaves an already-even front alone', () => {
    // A coloring book has a title page and no dedication.
    const out = asSpreads([cover, title], body(6), [lock], title, policy);
    expect(out.slice(0, 2).map((p) => p.type)).toEqual(['cover', 'title']);
    expect(out.filter((p) => p.type === 'title')).toHaveLength(1);
  });

  it('copes with a book that is nothing but a cover and a lock', () => {
    const out = asSpreads([cover], [], [lock], title, policy);
    expect(out.map((p) => p.type)).toEqual(['cover', 'title', 'lock', 'policy']);
  });

  it('does not mutate what it was given', () => {
    const front = [cover];
    const back = [lock];
    asSpreads(front, body(3), back, title, policy);
    expect(front).toHaveLength(1);
    expect(back).toHaveLength(1);
  });
});

describe('the book is fixed in one place', () => {
  it('has no slide left in it', () => {
    for (const gone of ['data-at', 'fbp-stage', 'translateX(-25%)', 'translateX(25%)']) {
      expect(src, `${gone} is the slide the owner asked to remove`).not.toContain(gone);
    }
  });

  it('is one centred box of a fixed width', () => {
    expect(src).toMatch(/\.fbp-book\s*\{\s*width:100%;\s*max-width:560px;\s*margin:0 auto/);
  });

  it('does not give the cover a sheet of its own', () => {
    // showCover is what isolates the cover, and a lone sheet is what made the
    // book move.
    expect(src).toContain('showCover={false}');
  });

  it('lets a narrow screen fall back to one page', () => {
    expect(src).toContain('usePortrait={true}');
    expect(src, 'minWidth drives the portrait switch at 2x its value').toContain('minWidth={180}');
  });
});
