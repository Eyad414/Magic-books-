import { describe, it, expect } from 'vitest';
import { isOnShelf, shelfStories } from '../../frontend/src/utils/storyShelf';

/**
 * «قصصي» shows books, not abandoned forms.
 *
 * The dashboard listed every story row the wizard had ever created, so a shelf
 * of nine was eight grey 📚 placeholders and one real cover — and the one book
 * the customer actually paid for looked like one of nine.
 *
 * The obvious rule, "only show stories that have a cover", is wrong in a way
 * that matters more than the bug: artwork is generated AFTER payment and takes
 * minutes. For that whole window a paid order has no cover, so hiding on
 * artwork alone would make an order vanish from the customer's account exactly
 * when they are most likely to open it and check. The cases below are mostly
 * about that window.
 */
describe('what belongs on the shelf', () => {
  it('shows a finished book', () => {
    expect(isOnShelf({ generatedCover: 'magic-fanoose/generated/abc/page-00.png', status: 'ready' })).toBe(true);
  });

  it('hides a draft with nothing in it', () => {
    expect(isOnShelf({ status: 'draft' })).toBe(false);
    expect(isOnShelf({ status: 'draft', generatedCover: null, generatedImages: [] })).toBe(false);
  });

  it('treats a missing status as a draft', () => {
    expect(isOnShelf({})).toBe(false);
  });

  it('KEEPS a paid order that has no artwork yet', () => {
    // The window between paying and the images existing. Hiding this is how a
    // customer concludes their order was lost.
    for (const status of ['ordered', 'paid', 'generating', 'printing', 'shipped', 'completed']) {
      expect(isOnShelf({ status }), `${status} must stay on the shelf`).toBe(true);
    }
  });

  it('keeps a draft that somehow has artwork', () => {
    // Demo and repaired books sit in this state; they are real pictures of a
    // real child and the customer should see them.
    expect(isOnShelf({ status: 'draft', generatedCover: 'x/page-00.png' })).toBe(true);
    expect(isOnShelf({ status: 'draft', generatedImages: ['x/page-01.png'] })).toBe(true);
  });

  it('does not count an empty image list as artwork', () => {
    expect(isOnShelf({ status: 'draft', generatedImages: [] })).toBe(false);
  });

  it('survives junk instead of a story', () => {
    expect(isOnShelf(null as any)).toBe(false);
    expect(isOnShelf(undefined as any)).toBe(false);
    expect(isOnShelf({ generatedImages: 'not an array' } as any)).toBe(false);
  });

  it('filters a list without touching the originals', () => {
    const list = [
      { _id: '1', status: 'draft' },
      { _id: '2', status: 'ordered' },
      { _id: '3', status: 'draft', generatedCover: 'c' },
    ];
    expect(shelfStories(list).map((s) => s._id)).toEqual(['2', '3']);
    expect(list).toHaveLength(3);
  });

  it('copes with no stories at all', () => {
    expect(shelfStories(null)).toEqual([]);
    expect(shelfStories(undefined)).toEqual([]);
    expect(shelfStories([])).toEqual([]);
  });
});
