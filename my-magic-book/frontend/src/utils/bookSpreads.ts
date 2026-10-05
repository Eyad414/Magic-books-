/**
 * Laying a book's sheets out as SPREADS, with nothing left over.
 *
 * The preview shows two pages at a time, so a sheet with no partner fills one
 * half of the frame and leaves the other empty. That is not a cosmetic detail:
 * a lone sheet is why the book used to sit off to one side and then slide
 * across to centre itself as it opened, which the owner asked to stop. Giving
 * every sheet a partner is what lets the book stay in one place.
 *
 * Two things have to hold, and they are the same thing counted twice:
 *
 *  - The cover needs a facing page, or it stands alone in a half-empty frame.
 *  - The body has to BEGIN on a left-hand sheet. The story is built as a page's
 *    words, then that page's picture. Start it one sheet out and the pairing
 *    shifts by one, so every page's words land beside the NEXT page's picture
 *    — all the way through, quietly, with nothing obviously broken on screen.
 *
 * Both reduce to: an even number of sheets before the body, and an even number
 * in total.
 *
 * This lives apart from the component so the rule can be tested on its own —
 * the component imports react-pageflip, which a node test cannot load.
 */

/** Any book sheet. Only `type` is read here; the rest is the renderer's business. */
export interface Sheet {
  type: string;
}

export function asSpreads<T extends Sheet>(
  front: T[],
  body: T[],
  back: T[],
  /** The cover's facing page, used only when the front has no title sheet yet. */
  facing: T,
  /** The neutral sheet used to even things up (the copyright page). */
  filler: () => T,
): T[] {
  let opening = [...(front || [])];
  let closing = [...(back || [])];

  if (opening.length % 2 === 1) {
    if (!opening.some((pg) => pg && pg.type === 'title')) {
      // A preview opens on the bare cover; give it its title page.
      opening = [...opening, facing];
    } else {
      // A full book already has one, so the copyright sheet moves up to face
      // the dedication — where a printed book carries it anyway — rather than
      // being printed a second time at the back.
      opening = [...opening, filler()];
      closing = closing.filter((pg) => !pg || pg.type !== 'policy');
    }
  }

  const all = [...opening, ...(body || []), ...closing];
  return all.length % 2 === 1 ? [...all, filler()] : all;
}
