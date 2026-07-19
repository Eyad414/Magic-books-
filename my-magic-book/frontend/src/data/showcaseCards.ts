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

export const SHOWCASE_CARDS: ShowcaseCard[] = [
  { key: 'liam-space',     themeId: 'space',           name: 'Liam',  storyId: '6a43cbf500c3ecaed9218b3c', emoji: '🚀' },
  { key: 'baha-space',     themeId: 'space_real',      name: 'Baha',  emoji: '🌌' },
  { key: 'baha-zoo',       themeId: 'zoo_adventure',   name: 'Baha',  emoji: '🦁' },
  { key: 'baha-magicbook', themeId: 'magic_book',      name: 'Baha',  storyId: 'theme_magic_book', emoji: '📖' },
  { key: 'lora-zoo',       themeId: 'zoo_adventure',   name: 'Lora',  storyId: '6a3bbaf645b418d21337de09', emoji: '🦁' },
  { key: 'lora-coloring',  themeId: 'zoo_coloring',    name: 'Lora',  emoji: '🖍️' },
  { key: 'ahmad-coloring', themeId: 'space_coloring',  name: 'Ahmad', emoji: '🖍️' },
  { key: 'yosef-coloring', themeId: 'school_coloring', name: 'Yosef', emoji: '🖍️' },
];
