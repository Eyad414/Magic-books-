// Favourited showcase stories, kept in localStorage.
//
// These used to live under one browser-wide key, so they were shared by every
// account that ever used the browser: sign out, create a fresh account, and the
// new dashboard already showed "favourites" nobody had added. Each account now
// gets its own bucket, and logged-out browsing has a separate guest bucket.

const LEGACY_KEY = 'favorite_stories';

const keyFor = (userId?: string) => `favorite_stories:${userId || 'guest'}`;

/**
 * One-time cleanup of the old shared key. Its contents belong to "whoever was
 * using this browser", so they move to the guest bucket — never into an
 * account, which is exactly the leak this replaces.
 */
function migrateLegacy(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === null) return;
    if (localStorage.getItem(keyFor()) === null) localStorage.setItem(keyFor(), legacy);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* private mode / quota — favourites are a nicety, never fatal */ }
}

export function loadFavorites(userId?: string): string[] {
  migrateLegacy();
  try {
    const raw = localStorage.getItem(keyFor(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavorites(userId: string | undefined, keys: string[]): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(keys));
  } catch { /* ignore */ }
}
