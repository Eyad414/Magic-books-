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
}

/** Badge on the home-page card. Absent = no badge. */
export type HomeTag = 'bestseller' | 'new' | 'featured';

/** The three badges, in the order they appear in the dashboard. */
export const HOME_TAGS: HomeTag[] = ['bestseller', 'new', 'featured'];

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
  return PRIVATE_DEMO_CHILDREN.has(card.name) ? flag === true : flag !== false;
}

/** Demo cards only reach the home page when explicitly ticked. */
export function demoOnHomePage(card: ShowcaseCard, vis: DemoVisibility): boolean {
  return vis[card.key]?.home === true;
}

export const SHOWCASE_CARDS: ShowcaseCard[] = [
  { key: 'liam-space',      themeId: 'space',           name: 'Liam',  storyId: '6a43cbf500c3ecaed9218b3c', emoji: '🚀' },
  { key: 'baha-space',      themeId: 'space_real',      name: 'Baha',  emoji: '🌌' },
  { key: 'baha-zoo',        themeId: 'zoo_adventure',   name: 'Baha',  emoji: '🦁' },
  { key: 'baha-magicbook',  themeId: 'magic_book',      name: 'Baha',  storyId: 'theme_magic_book', emoji: '📖' },
  { key: 'lora-zoo',        themeId: 'zoo_adventure',   name: 'Lora',  storyId: '6a3bbaf645b418d21337de09', emoji: '🦁' },
  { key: 'lora-toycity',    themeId: 'toy_city',        name: 'Lora',  emoji: '🤖' },
  { key: 'lora-coloring',   themeId: 'zoo_coloring',    name: 'Lora',  emoji: '🖍️' },
  { key: 'ahmad-coloring',  themeId: 'space_coloring',  name: 'Ahmad', emoji: '🖍️' },
  { key: 'yosef-coloring',  themeId: 'school_coloring', name: 'Yosef', emoji: '🖍️' },
  // Themes that already had demo artwork in storage but no card, so nothing
  // listed them: the two new stories plus pirate and school.
  { key: 'sara-dinosaur',   themeId: 'dinosaur_adventure', name: 'Sara',  emoji: '🦕' },
  { key: 'julia-ocean',     themeId: 'ocean_adventure',    name: 'Julia', emoji: '🐋' },
  { key: 'baha-pirate',     themeId: 'pirate_adventure',   name: 'Baha',  emoji: '🏴‍☠️' },
  { key: 'baha-school',     themeId: 'school_hero',        name: 'Baha',  emoji: '🏫' },
  { key: 'sara-world',      themeId: 'world_adventure',    name: 'Sara',  emoji: '🌍' },
  { key: 'julia-deepsea',   themeId: 'deep_sea',           name: 'Julia', emoji: '🐬' },
  { key: 'baha-chef',       themeId: 'little_chef',        name: 'Baha',  emoji: '🍳' },
  { key: 'baha-castle',     themeId: 'castle_guardian',    name: 'Baha',  emoji: '🏰' },
  { key: 'lora-kinder',     themeId: 'happy_kindergarten', name: 'Lora',  emoji: '🧸' },
  { key: 'sara-firstday',   themeId: 'first_day_school',   name: 'Sara',  emoji: '🎒' },
  { key: 'julia-grade1',    themeId: 'first_grade',        name: 'Julia', emoji: '✏️' },
  { key: 'baha-future',     themeId: 'future_hero',        name: 'Baha',  emoji: '🚀' },
];
