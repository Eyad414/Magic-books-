/**
 * Which of a customer's stories belong on their shelf.
 *
 * «قصصي» listed every row the wizard had ever created, so a shelf of nine
 * books was eight grey 📚 placeholders and one real cover. A draft with no
 * artwork is not a book the customer owns — it is an abandoned form — and
 * showing it as a card next to a finished book makes the finished one look
 * like one of nine rather than the thing they paid for.
 *
 * It is not simply "has a cover", because artwork is generated AFTER payment
 * and takes minutes: for that window an order legitimately has none, and
 * hiding it would make the order vanish from the customer's account exactly
 * when they are most likely to open it and check.
 *
 * But status alone cannot be trusted either, and the data says so. This
 * account has five rows claiming status 'ready' with zero images and no cover
 * — "ready" is not true of them, and they were still showing as 📚 cards that
 * open an empty book. A status is a claim; artwork is a fact.
 *
 * So the two are split by what each one is good for:
 *   - 'ordered' and 'generating' mean the customer has committed and the
 *     pictures are on their way. Shelved on the status alone, because that is
 *     the whole point of showing them.
 *   - 'ready' and 'draft' are claims about a finished book. Shelved only if
 *     the artwork is actually there to back them up.
 *
 * Nothing is deleted — the rows are still there, still theirs, still returned
 * by the API. They are just not books yet.
 */

export interface ShelfStory {
  generatedCover?: string | null;
  generatedImages?: unknown[] | null;
  status?: string | null;
}

/**
 * The customer has committed and the pictures are still coming. These show
 * with or without artwork; everything else has to prove it.
 *
 * The Story model's status enum is exactly draft | generating | ready |
 * ordered, so there is nothing else to list. 'ready' is deliberately absent:
 * a book that says it is ready and has no pages is not ready.
 */
const AWAITING_ARTWORK = new Set(['ordered', 'generating']);

export function isOnShelf(story: ShelfStory): boolean {
  if (!story) return false;
  if (story.generatedCover) return true;
  if (Array.isArray(story.generatedImages) && story.generatedImages.length > 0) return true;
  return AWAITING_ARTWORK.has(String(story.status || 'draft'));
}

export function shelfStories<T extends ShelfStory>(stories: readonly T[] | null | undefined): T[] {
  return (stories ?? []).filter(isOnShelf);
}
