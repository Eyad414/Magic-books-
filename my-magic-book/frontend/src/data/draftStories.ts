/**
 * Stories written and registered but not yet approved for customers.
 *
 * A story becomes public in more places than the wizard: its text in the
 * locale files is enough for scripts/prerender.mjs to give it a page at
 * /stories/<slug>, put it in the sitemap and demand a rewrite and a share card
 * for it. A draft listed here gets none of that, and /stories/<slug> answers
 * "not found", until its id is removed — which is the one-line publish step,
 * together with setting the theme `ready` in the dashboard.
 *
 * The build reads this file as text (one quoted id per entry), so keep it a
 * plain list of string literals.
 */
export const DRAFT_STORIES: readonly string[] = [
  'good_night',
  'first_tooth',
  'winter_rain',
];
