// ─── Stories Index ────────────────────────────────────────────────────────────
// Import every story here. Each story lives in its own file (story01_xxx.ts …
// story20_xxx.ts). Add new stories by:
//   1. Create src/data/stories/storyNN_slug.ts exporting a StoryDefinition
//   2. Import it here and add it to the STORIES array.
//
// The array is sorted by `order` automatically at runtime.

import type { StoryDefinition } from './types';
import { zooAdventure } from './story01_zoo';
import { spaceAdventure } from './story02_space';
import { schoolAdventure } from './story03_school';
import { magicBookJourney } from './story04_magicbook';
import { toyCityAdventure } from './story05_toycity';
import { pirateTreasure } from './story06_pirate';
import { dinosaurAdventure } from './story07_dinosaur';
import { oceanAdventure } from './story08_ocean';

// ── Future stories — uncomment as you add them ────────────────────────────────
// import { forestAdventure }   from './story04_forest';
// import { desertAdventure }   from './story05_desert';
// import { mountainAdventure } from './story06_mountain';
// import { cityAdventure }     from './story07_city';
// import { farmAdventure }     from './story08_farm';
// import { kitchenAdventure }  from './story10_kitchen';
// import { gardenAdventure }   from './story11_garden';
// import { seaAdventure }      from './story12_sea';
// import { rainAdventure }     from './story13_rain';
// import { snowAdventure }     from './story14_snow';
// import { nightAdventure }    from './story15_night';
// import { marketAdventure }   from './story16_market';
// import { libraryAdventure }  from './story17_library';
// import { paintAdventure }    from './story18_paint';
// import { musicAdventure }    from './story19_music';
// import { friendshipStory }   from './story20_friendship';

/** All 20 stories sorted by display order */
export const STORIES: StoryDefinition[] = [
  zooAdventure,
  spaceAdventure,
  schoolAdventure,
  magicBookJourney,
  toyCityAdventure,
  pirateTreasure,
  dinosaurAdventure,
  oceanAdventure,
  // forestAdventure,
  // desertAdventure,
  // mountainAdventure,
  // cityAdventure,
  // farmAdventure,
  // schoolAdventure,
  // kitchenAdventure,
  // gardenAdventure,
  // seaAdventure,
  // rainAdventure,
  // snowAdventure,
  // nightAdventure,
  // marketAdventure,
  // libraryAdventure,
  // paintAdventure,
  // musicAdventure,
  // friendshipStory,
].sort((a, b) => a.order - b.order);

/** Helper: look up a story by its id.
 *  Style variants (e.g. "space_real", "space_cartoon") reuse their base
 *  story's text/title; only the generated illustrations differ (held in the
 *  matching admin theme). So "space_real" falls back to the "space" story. */
export function findStory(id: string): StoryDefinition | undefined {
  const direct = STORIES.find((s) => s.id === id);
  if (direct) return direct;
  const base = id.replace(/_(real|photoreal|cartoon|pr|hd)$/, '');
  const fallback = STORIES.find((s) => s.id === base);
  // A miss is silent in production — the viewer falls back to STORIES[0] and
  // quietly shows the ZOO title and text under another story's cover. Shout in
  // dev so a newly added theme without a definition here is caught immediately.
  if (!fallback && import.meta.env.DEV) {
    console.warn(
      `[stories] no StoryDefinition for "${id}" — the viewer will fall back to "${STORIES[0].id}" ` +
      `and show its title/text. Add src/data/stories/storyNN_${id}.ts and register it in index.ts.`,
    );
  }
  return fallback;
}

export type { StoryDefinition };
