/**
 * Which of a customer's stories belong on their shelf.
 *
 * «قصصي» listed every row the wizard had ever created, so a shelf of nine
 * books was eight grey 📚 placeholders and one real cover. A draft with no
 * artwork is not a book the customer owns — it is an abandoned form — and
 * showing it as a card next to a finished book makes the finished one look
 * like one of nine rather than the thing they paid for.
 *
 * The rule is NOT "has a cover", though that is how it was asked for. A story
 * that has been paid for has no artwork yet either: it is generated after
 * payment, and that takes minutes. Hiding on artwork alone would make an order
 * vanish from the customer's account in the window where they are most likely
 * to go looking for it — which is a far worse bug than the one being fixed.
 *
 * So: artwork OR a status past draft. An abandoned draft is the only thing
 * that disappears, and nothing is deleted — it is still there, still theirs,
 * and still returned by the API.
 */

export interface ShelfStory {
  generatedCover?: string | null;
  generatedImages?: unknown[] | null;
  status?: string | null;
}

/** Statuses that mean the customer has committed — these always show. */
const PAST_DRAFT = new Set(['generating', 'ready', 'ordered', 'paid', 'printing', 'shipped', 'completed']);

export function isOnShelf(story: ShelfStory): boolean {
  if (!story) return false;
  if (story.generatedCover) return true;
  if (Array.isArray(story.generatedImages) && story.generatedImages.length > 0) return true;
  return PAST_DRAFT.has(String(story.status || 'draft'));
}

export function shelfStories<T extends ShelfStory>(stories: readonly T[] | null | undefined): T[] {
  return (stories ?? []).filter(isOnShelf);
}
