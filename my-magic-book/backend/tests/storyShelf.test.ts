import { describe, it, expect } from 'vitest';
import { isOnShelf, shelfStories } from '../../frontend/src/utils/storyShelf';

/**
 * «قصصي» shows books, not abandoned forms.
 *
 * The dashboard listed every story row the wizard had ever created, so a shelf
 * of nine was eight grey 📚 placeholders and one real cover — and the one book
 * the customer actually paid for looked like one of nine.
 *
 * "Only show stories that have a cover" is wrong on its own: artwork is
 * generated AFTER payment and takes minutes, so for that window an order has
 * none, and hiding it would make the order vanish exactly when the customer
 * goes looking for it.
 *
 * Trusting the status instead is ALSO wrong, which the live data settled. The
 * owner's account holds five rows claiming status 'ready' with zero images and
 * no cover — they kept showing as 📚 cards that open an empty book, which is
 * why the placeholders survived the first attempt at this. A status is a
 * claim; artwork is a fact. 'ordered' and 'generating' are shelved on the
 * claim because the pictures are genuinely on their way; 'ready' has to prove
 * it.
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

  it('KEEPS an order whose artwork has not been made yet', () => {
    // The window between paying and the images existing. Hiding this is how a
    // customer concludes their order was lost.
    for (const status of ['ordered', 'generating']) {
      expect(isOnShelf({ status }), `${status} must stay on the shelf`).toBe(true);
    }
  });

  it('HIDES a story that claims to be ready with nothing in it', () => {
    // Five of these are sitting on the owner's account right now. "ready" with
    // no pages is not ready, and the card opened an empty book.
    expect(isOnShelf({ status: 'ready' })).toBe(false);
    expect(isOnShelf({ status: 'ready', generatedImages: [] })).toBe(false);
  });

  it('keeps a ready story that really does have its artwork', () => {
    expect(isOnShelf({ status: 'ready', generatedCover: 'x/page-00.png' })).toBe(true);
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
