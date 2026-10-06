import { SHOWCASE_CARDS, demoOnStoriesPage, type DemoVisibility, type ShowcaseCard } from './showcaseCards';

/**
 * One public page per story, at /stories/<slug>.
 *
 * The site had six URLs, so a parent searching «قصة عن القدس للأطفال» or
 * «قصة رمضان للأطفال» found nothing of ours: every story lived inside a modal
 * on /stories, which has one title and one description for thirty books.
 *
 * The slug is the story's id with hyphens, and nothing else. That rule is the
 * whole contract: the build script (scripts/prerender.mjs) derives the same
 * URLs from the same translation file without importing any of this, and the
 * vercel.json rewrites and sitemap are generated from it — so a story added to
 * the translations gets its page, its rewrite check and its sitemap entry with
 * no list to keep in step.
 */
export const storySlug = (storyId: string) => storyId.replace(/_/g, '-');
export const storyIdFromSlug = (slug: string) => slug.toLowerCase().replace(/-/g, '_');

/**
 * Some themes reuse another theme's scripted story text: the realistic space
 * book tells the `space` story. Theme id → story (text) id.
 */
const TEXT_THEME: Record<string, string> = { space_real: 'space' };
export const textThemeFor = (themeId: string) => TEXT_THEME[themeId] || themeId;

/** A real customer's book, as opposed to artwork stored on the theme itself. */
const isRealBook = (card: ShowcaseCard) => !!card.storyId && !card.storyId.startsWith('theme_');

/**
 * The showcase card that illustrates a story's page.
 *
 * Only cards that are already public on /stories qualify, so this page can
 * never publish a child the owner has not — a private card (a real child's
 * book) is skipped even when it is the only art there is. Among the rest, the
 * theme's own demo art wins over a real customer's book: `space` has both
 * Liam's real order and Mariam's demo, and a page built to be shared should
 * not be built on someone's order.
 */
export function cardForStory(storyId: string, vis: DemoVisibility = {}): ShowcaseCard | undefined {
  const matches = SHOWCASE_CARDS.filter(
    (c) => textThemeFor(c.themeId) === storyId && demoOnStoriesPage(c, vis),
  );
  return matches.find((c) => !isRealBook(c)) || matches[0];
}

/**
 * The theme the wizard should open on for this story. The card's own theme
 * when there is one (`space` is ordered as `space_real`), otherwise the story
 * id itself, which is also a theme id for every story but `space`.
 */
export function wizardThemeFor(storyId: string, vis: DemoVisibility = {}): string {
  const theme = cardForStory(storyId, vis)?.themeId || storyId;
  // Liam's card is filed under 'space', which is not an orderable theme.
  return theme === 'space' ? 'space_real' : theme;
}

/** Bucket path of a theme's cover. Every theme stores it here (checked against live data). */
export const themeCoverPath = (themeId: string) => `magic-fanoose/generated/theme_${themeId}/page-00.png`;
