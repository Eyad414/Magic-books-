/**
 * Is a demo book actually complete enough to send to a printer?
 *
 * The dashboard used to answer this from the theme record, which lists the
 * object paths it EXPECTS — the seed writes them before anything is generated.
 * So a book read as ready while its images 404, and the only way to know was to
 * open every page by hand. Nineteen books is too many to check that way, and a
 * print run is real money, so this asks storage what exists.
 */
import { listObjects } from './StorageService';

export const STORY_PAGES = 13;

/**
 * Baha's zoo book predates the theme_<id> convention and lives in theme_zoo.
 * Anything reading a theme's artwork has to go through here, or that one book
 * looks empty.
 */
export function themeArtFolder(themeId: string): string {
  return themeId === 'zoo_adventure' ? 'theme_zoo' : `theme_${themeId}`;
}

export interface ThemeReadiness {
  id: string;
  label?: string;
  /** Interior pages present, out of STORY_PAGES. */
  pages: number;
  cover: boolean;
  portrait: boolean;
  ready: boolean;
  /** Human-readable list of what is missing, empty when ready. */
  missing: string[];
  /** When the artwork was last written, so a stale book is visible as stale. */
  updatedAt?: string;
}

/**
 * The decision itself, separated from the storage call so it can be tested.
 * This is what decides whether a book is worth paying a printer for, and it was
 * only reachable through a network call to a bucket.
 */
export function summarizeArtwork(fileNames: Iterable<string>): Omit<ThemeReadiness, 'id' | 'label' | 'updatedAt'> {
  const names = new Set(fileNames);
  const present: number[] = [];
  const absent: number[] = [];
  for (let i = 1; i <= STORY_PAGES; i++) {
    (names.has(`page-${String(i).padStart(2, '0')}.png`) ? present : absent).push(i);
  }
  const cover = names.has('page-00.png');
  const portrait = names.has('page-99.png');

  const missing: string[] = [];
  if (!cover) missing.push('الغلاف');
  // Name the actual gaps — "11 of 13" does not tell you which page to redo.
  if (absent.length) missing.push(`صفحات: ${absent.join(', ')}`);
  if (!portrait) missing.push('الصورة الختامية');

  return { pages: present.length, cover, portrait, ready: missing.length === 0, missing };
}

export async function checkThemeArtwork(themeId: string, label?: string): Promise<ThemeReadiness> {
  const folder = themeArtFolder(themeId);
  const objects = await listObjects(`${process.env.GCS_PDF_FOLDER || 'magic-fanoose'}/generated/${folder}/`);
  const summary = summarizeArtwork(objects.map((o) => o.path.split('/').pop() || ''));
  const updatedAt = objects.length ? objects.map((o) => o.updated).sort().slice(-1)[0] : undefined;
  return { id: themeId, label, ...summary, updatedAt };
}

/** Readiness for many themes at once, in the order given. */
export async function checkThemes(themes: { id: string; label?: string }[]): Promise<ThemeReadiness[]> {
  // Sequential on purpose: the host is memory-constrained and this runs on an
  // admin click, not a customer request, so a couple of seconds is fine.
  const out: ThemeReadiness[] = [];
  for (const t of themes) out.push(await checkThemeArtwork(t.id, t.label));
  return out;
}
