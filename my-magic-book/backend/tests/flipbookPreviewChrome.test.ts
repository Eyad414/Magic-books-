import { describe, it, expect } from 'vitest';
import fs from 'fs';
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

describe('the preview book sits on the centre line', () => {
  it('parks itself by the sheet that is actually showing', () => {
    expect(src).toMatch(/data-at=\{at\}/);
    expect(src).toMatch(/data-at="front"\]\s*\{\s*transform:\s*translateX\(-25%\)/);
    expect(src).toMatch(/data-at="back"\]\s*\{\s*transform:\s*translateX\(25%\)/);
  });

  it('knows which sheets have no partner', () => {
    // Sheet 0 is the cover. After it the sheets pair up, so the only other lone
    // sheet is a last one with nothing to pair with.
    expect(src).toContain("sheet === 0 ? 'front'");
    expect(src).toMatch(/sheet === lastSheet && sheet % 2 === 1/);
  });

  it('follows the page turns', () => {
    expect(src, 'without onFlip the book never learns it has been opened').toMatch(/onFlip=/);
  });

  it('gives itself room to move', () => {
    // Three pages wide: two for the book, one for the half-page slide either
    // way. Narrower than that and the slide pushes the cover off the stage.
    expect(src).toMatch(/\.fbp-stage\s*\{[^}]*max-width:840px/);
    expect(src).toMatch(/\.fbp-book\s*\{\s*width:66\.6667%/);
  });

  it('only slides where there is room for it', () => {
    // A phone has no spare third of a screen, and goes to a single page
    // instead, so the slide must stay behind the desktop breakpoint.
    const mq = src.indexOf('@media (min-width: 768px)');
    expect(mq).toBeGreaterThan(-1);
    expect(src.indexOf('data-at="front"'), 'the slide escaped its media query').toBeGreaterThan(mq);
  });

  it('lets a narrow screen fall back to one page', () => {
    // Pinned to landscape, a phone laid out a 360px spread inside a 293px box
    // and the overflow-hidden cut the cover in half.
    expect(src).toContain('usePortrait={true}');
    expect(src, 'minWidth drives the portrait switch at 2x its value').toContain('minWidth={180}');
  });
});
