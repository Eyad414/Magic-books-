// Favourited showcase stories, kept in localStorage.
//
// These used to live under one browser-wide key, so they were shared by every
// account that ever used the browser: sign out, create a fresh account, and the
// new dashboard already showed "favourites" nobody had added. Each account now
// gets its own bucket, and logged-out browsing has a separate guest bucket.

const LEGACY_KEY = 'favorite_stories';
const GUEST_KEY = 'favorite_stories:guest';

const keyFor = (userId: string) => `favorite_stories:${userId}`;

/**
 * Drop the pre-account keys. Favourites belong to an account, so anything
 * stored before sign-in has no owner we can trust: the old shared key leaked
 * between accounts, and the guest bucket it was migrated into made a
 * logged-OUT visitor see hearts they never clicked.
 */
function dropOwnerlessKeys(): void {
  try {
    localStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(GUEST_KEY);
  } catch { /* private mode / quota — favourites are a nicety, never fatal */ }
}

/** Favourites for an account. Signed-out visitors have none, by design. */
export function loadFavorites(userId?: string): string[] {
  dropOwnerlessKeys();
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavorites(userId: string | undefined, keys: string[]): void {
  if (!userId) return; // nothing to save against — the caller asks them to sign in
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(keys));
  } catch { /* ignore */ }
}
