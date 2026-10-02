// Single source of truth for the curated showcase stories displayed on the
// Stories page. The Dashboard "favorites" tab reads the SAME list so a story
// favorited on /stories (stored by its `key`) shows up in the dashboard.
//
// A `storyId` pins the card to a specific generated book's cover + illustrations
// (e.g. Lora's real zoo book) instead of the theme's generic cover.
export interface ShowcaseCard {
  key: string;
  themeId: string;
  name: string;
  storyId?: string;
  emoji: string; // shown in the dashboard favorites card
  /**
   * Needs the owner's explicit approval before it can be public. Keeps the card
   * off the Stories and home pages until it is ticked, while still listing it
   * in the dashboard.
   *
   * Originally set because the artwork showed a real child whose family had not
   * agreed. The eight below have since been regenerated from Baha's photo, so
   * that reason is gone — the flag stays only so the owner decides when each
   * one goes public, rather than eight cards appearing on their own.
   *
   * This has to live on the CARD, not on the name. Privacy used to be inferred
   * from the displayed name (PRIVATE_DEMO_CHILDREN), so renaming a card to an
   * invented name silently published it — the label changed but the child's
   * face on the cover did not.
   */
  private?: boolean;
}

/** Badge on the home-page card. Absent = no badge. */
export type HomeTag = 'bestseller' | 'new' | 'featured';

/** The three badges, in the order they appear in the dashboard. */
export const HOME_TAGS: HomeTag[] = ['new', 'bestseller', 'featured'];

/**
 * How many of the owner's picks the home page actually shows.
 *
 * BestSellers slices the list, so ticking ten books puts four on the page and
 * silently drops six — and the dashboard said "10" with no hint that most of
 * them never appear. The number lives here because two screens read it: the
 * page that enforces it and the panel that promises it.
 */
export const HOME_CARD_LIMIT = 4;

/**
 * The order the home page puts its cards in: new, then best seller, then
 * featured, then untagged. It decides WHICH ones survive the slice above, so
 * the dashboard preview has to sort the same way or it shows the owner four
 * books that are not the four a visitor gets.
 */
export function homeTagRank(tag?: HomeTag | '' | null): number {
  const order: Record<string, number> = { new: 0, bestseller: 1, featured: 2 };
  return order[String(tag || '')] ?? 3;
}

/** Per-card publish flags, stored in SiteSettings.demoCards keyed by card key. */
export type DemoVisibility = Record<string, { home?: boolean; stories?: boolean; tag?: HomeTag }>;

/**
 * Demo books built from a REAL child's photo. They stay off the public site
 * unless the owner deliberately publishes them from the dashboard.
 */
export const PRIVATE_DEMO_CHILDREN = new Set(['Lora', 'Sara', 'Julia']);

/**
 * Whether a demo card is actually on the public Stories page right now. The
 * default differs by card, so the dashboard summary and the Stories page have
 * to share this rule or they will disagree: a real child's book needs an
 * explicit tick, every other demo shows unless it was unticked.
 */
export function demoOnStoriesPage(card: ShowcaseCard, vis: DemoVisibility): boolean {
  const flag = vis[card.key]?.stories;
  return isPrivateCard(card) ? flag === true : flag !== false;
}

/**
 * Demo cards only reach the home page when explicitly ticked — and never while
 * they need permission.
 *
 * The private check was missing here, so a card could be pulled from the
 * Stories page and carry on sitting on the home page: exactly what happened to
 * the space colouring card, which was taken off /stories while `home: true`
 * kept it on the front page. Privacy has to hold on every public surface, not
 * whichever one someone remembered.
 */
export function demoOnHomePage(card: ShowcaseCard, vis: DemoVisibility): boolean {
  if (isPrivateCard(card)) return false;
  return vis[card.key]?.home === true;
}

/** A card needing permission before it can be public — by flag, or by the
 *  older name-based rule kept for the cards still using a real child's name. */
export function isPrivateCard(card: ShowcaseCard): boolean {
  return card.private === true || PRIVATE_DEMO_CHILDREN.has(card.name);
}

export const SHOWCASE_CARDS: ShowcaseCard[] = [
  { key: 'liam-space',      themeId: 'space',           name: 'Liam',  storyId: '6a43cbf500c3ecaed9218b3c', emoji: '🚀' },
  { key: 'baha-space',      themeId: 'space_real',      name: 'Baha',  emoji: '🌌' },
  { key: 'baha-zoo',        themeId: 'zoo_adventure',   name: 'Baha',  emoji: '🦁' },
  { key: 'baha-magicbook',  themeId: 'magic_book',      name: 'Baha',  storyId: 'theme_magic_book', emoji: '📖' },
  // Lora's own zoo book — her real photograph, and the one card here still
  // pointing at a storyId rather than a theme, so it was NOT re-shot with the
  // others. It was gated by her name alone; the flag is what survives a
  // rename, which is the whole reason the flag exists.
  { key: 'lora-zoo',        themeId: 'zoo_adventure',   name: 'Lora',  storyId: '6a3bbaf645b418d21337de09', private: true, emoji: '🦁' },
  { key: 'baha-toycity',    themeId: 'toy_city',        name: 'Baha',  emoji: '🤖' },
  { key: 'adam-coloring',   themeId: 'zoo_coloring',    name: 'Adam',  emoji: '🖍️' },
  // Owner says this one is Lora's, despite the displayed name — off the public
  // page until her family agrees.
  { key: 'ahmad-coloring',  themeId: 'space_coloring',  name: 'Ahmad', private: true, emoji: '🖍️' },
  { key: 'yosef-coloring',  themeId: 'school_coloring', name: 'Yosef', emoji: '🖍️' },
  // Themes that already had demo artwork in storage but no card, so nothing
  // listed them: the two new stories plus pirate and school.
  //
  // Adding a card here:
  //   1. `private: true` if the cover art shows a child you have no permission
  //      to publish. Judge the ARTWORK, not the name — an invented name over a
  //      real child's face is still that child on the public page.
  //   2. Match the displayed name to the gender in that artwork. The name drives
  //      detectGender, which resolves the story's {masc|fem} tokens, so a boy's
  //      name over a picture of a girl gives masculine text on a girl's cover.
  { key: 'baha-dinosaur',   themeId: 'dinosaur_adventure', name: 'Baha',  emoji: '🦕' },
  { key: 'baha-ocean',     themeId: 'ocean_adventure',    name: 'Baha', emoji: '🐋' },
  { key: 'baha-pirate',     themeId: 'pirate_adventure',   name: 'Baha',  emoji: '🏴‍☠️' },
  { key: 'baha-school',     themeId: 'school_hero',        name: 'Baha',  emoji: '🏫' },
  { key: 'ahmad-world',      themeId: 'world_adventure',    name: 'Ahmad',  emoji: '🌍' },
  { key: 'baha-deepsea',   themeId: 'deep_sea',           name: 'Baha', emoji: '🐬' },
  { key: 'baha-chef',       themeId: 'little_chef',        name: 'Baha',  emoji: '🍳' },
  { key: 'baha-castle',     themeId: 'castle_guardian',    name: 'Baha',  emoji: '🏰' },
  { key: 'baha-kinder',     themeId: 'happy_kindergarten', name: 'Baha',  emoji: '🧸' },
  { key: 'baha-firstday',   themeId: 'first_day_school',   name: 'Baha',  emoji: '🎒' },
  { key: 'baha-grade1',    themeId: 'first_grade',        name: 'Baha', emoji: '✏️' },
  { key: 'baha-future',     themeId: 'future_hero',        name: 'Baha',  emoji: '🚀' },
  { key: 'baha-engineer',   themeId: 'little_engineer',    name: 'Baha',  emoji: '🛠️' },
  // سلسلة الهلال — both generated from Baha's photo, so no permission question.
  { key: 'baha-ramadan',    themeId: 'ramadan_first',      name: 'Baha',  emoji: '🌙' },
  { key: 'baha-eid',        themeId: 'eid_first',          name: 'Baha',  emoji: '🎁' },
  { key: 'baha-bigbrother', themeId: 'big_brother',        name: 'Baha',  emoji: '👶' },
  // These five were drawn from Lora's photograph and sat here as `private`,
  // waiting on her family. That is no longer what is on the covers: all five
  // themes were re-shot from Baha's photo on 2026-09-30, every page of every
  // one, so the artwork these cards point at is not Lora's any more.
  //
  // Leaving them as they were was not "safe". A card carries the NAME into
  // detectGender, which resolves the story's {masc|fem} tokens — so "Lora" over
  // the new artwork reads a boy's picture out in feminine Arabic. And the
  // privacy flag was holding back books that no longer need holding back,
  // which is how five finished stories stayed invisible on /stories.
  //
  // The keys change with the names on purpose: a stored home/stories tick
  // belongs to the card it was given to, and that card no longer exists.
  { key: 'baha-vet',        themeId: 'little_vet',         name: 'Baha',  emoji: '🐾' },
  { key: 'baha-dabke',      themeId: 'dabke',              name: 'Baha',  emoji: '🥁' },
  { key: 'baha-jaffa',      themeId: 'jaffa_day',          name: 'Baha',  emoji: '⛵' },
  { key: 'baha-oud',        themeId: 'oud_lesson',         name: 'Baha',  emoji: '🎶' },
  { key: 'baha-jerusalem',  themeId: 'jerusalem_tale',     name: 'Baha',  emoji: '🏮' },
];
