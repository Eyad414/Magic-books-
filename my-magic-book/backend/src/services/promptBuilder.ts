/**
 * Pure helpers for turning generated story text into per-page illustration prompts.
 *
 * Everything in here is sync + side-effect-free so it's trivial to test and reuse.
 */

/**
 * Premium warm cinematic color grading — the "buyable" look (soft golden light,
 * rich-but-natural harmonious palette, gentle film tones, soft bokeh). Shared by
 * the body-page and cover prompt builders so every illustration feels polished.
 */
export const COLOR_GRADE =
  'Cinematic warm color grading with a soft, harmonious, premium color palette — gentle golden key lighting, lush vivid yet natural colors (never neon or harsh), tasteful film-like tones, soft dreamy background bokeh, cozy inviting storybook mood that feels emotionally warm and high-end.';

export interface PromptInput {
  pageText: string;
  childName: string;
  childAge: string | number;
  childGender: 'male' | 'female';
  theme: string;
  language: 'ar' | 'en' | 'he';
  pageNumber: number;
}

/**
 * Builds a PHOTOREALISTIC scene prompt (a real-photo-style template that a face
 * will be swapped onto later). The kid here is generic — the customer's real
 * face gets transplanted afterward — so we describe a believable photograph,
 * NOT a 3D cartoon.
 */
export function buildPhotorealPrompt(input: PromptInput): string {
  const { pageText, childAge, childGender, theme, pageNumber } = input;
  const ageStr = String(childAge).split('-')[0];
  const child = childGender === 'female' ? 'girl' : 'boy';
  const scene = trimForPrompt(pageText, 280);

  return [
    `Ultra-photorealistic DSLR photograph for a personalized children's book, page ${pageNumber}.`,
    `A happy ${ageStr}-year-old ${child} as the subject, waist-up, facing the camera with a warm natural smile,`,
    `clear well-lit front-facing face suitable for face replacement (face unobstructed, looking forward).`,
    scene ? `Scene context: "${scene}".` : '',
    `Realistic natural lighting, lifelike skin and textures, shallow depth of field, 50mm lens, professional photography.`,
    `Bright, colorful, cheerful ${theme} setting. Square 1:1. Real photographic quality, NOT a cartoon, NOT a 3D render, NOT an illustration.`,
    `No text, no captions, no watermark.`,
  ].filter(Boolean).join(' ');
}

/**
 * Splits a story into N page chunks of roughly equal length.
 *
 * Strategy:
 *  1. Split by paragraph (double newline). Empty paragraphs dropped.
 *  2. If we already have >= n paragraphs, group consecutive paragraphs so the
 *     final array has exactly n entries, balanced by character count.
 *  3. If we have fewer than n paragraphs, split the longest paragraphs at
 *     sentence boundaries until we have n.
 *
 * Always returns exactly `n` strings. If the input is empty the result is
 * `n` empty strings — the caller decides whether that's a hard error.
 */
export function splitStoryIntoPages(text: string, n: number): string[] {
  if (n <= 0) return [];
  const cleaned = (text || '').trim();
  if (!cleaned) return Array(n).fill('');

  let chunks = cleaned
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Too few chunks: split the LONGEST SPLITTABLE chunk by sentence boundary
  // until we have n. A chunk is "splittable" if it still has >1 sentence.
  while (chunks.length < n) {
    // Find the longest chunk that still has at least 2 sentences.
    let splittableIdx = -1;
    let splittableLen = -1;
    let splittableSentences: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const sentences = chunks[i].split(/(?<=[.!?؟])\s+/).filter(Boolean);
      if (sentences.length >= 2 && chunks[i].length > splittableLen) {
        splittableIdx = i;
        splittableLen = chunks[i].length;
        splittableSentences = sentences;
      }
    }
    if (splittableIdx === -1) break; // nothing left to split
    const mid = Math.ceil(splittableSentences.length / 2);
    const first = splittableSentences.slice(0, mid).join(' ');
    const second = splittableSentences.slice(mid).join(' ');
    chunks = [...chunks.slice(0, splittableIdx), first, second, ...chunks.slice(splittableIdx + 1)];
  }

  // If still too few (input is genuinely tiny), rotate through what we have
  // rather than spamming the same closing sentence — gives the AI varied
  // scene cues even if the story is short.
  if (chunks.length < n && chunks.length > 0) {
    const base = [...chunks];
    let cursor = 0;
    while (chunks.length < n) {
      chunks.push(base[cursor % base.length]);
      cursor++;
    }
  }

  // Too many chunks: greedily merge adjacent shortest pairs until we have n.
  while (chunks.length > n) {
    let smallestPairIdx = 0;
    let smallestPairLen = Infinity;
    for (let i = 0; i < chunks.length - 1; i++) {
      const combined = chunks[i].length + chunks[i + 1].length;
      if (combined < smallestPairLen) {
        smallestPairLen = combined;
        smallestPairIdx = i;
      }
    }
    chunks = [
      ...chunks.slice(0, smallestPairIdx),
      `${chunks[smallestPairIdx]}\n${chunks[smallestPairIdx + 1]}`,
      ...chunks.slice(smallestPairIdx + 2),
    ];
  }

  return chunks;
}

/**
 * Builds a prompt for the image generator from a single page's text.
 *
 * Format: <character anchor> · <scene from page text> · <style hints>.
 * Returns English even when the source text is Arabic/Hebrew — modern
 * multilingual image models handle either, but the structural cues (style
 * directives, aspect ratio, negative constraints) are most reliable in
 * English.
 */
export function buildIllustrationPrompt(input: PromptInput): string {
  const { pageText, childName, childAge, childGender, theme, pageNumber } = input;
  const ageStr = String(childAge).split('-')[0]; // "3-5" -> "3"
  const pronoun = childGender === 'male' ? 'boy' : 'girl';

  const characterAnchor = `A ${ageStr}-year-old ${pronoun} named ${childName} as the main character (consistent appearance across all pages)`;

  const sceneHint = trimForPrompt(pageText, 320);
  const styleHints = themeStyle(theme);

  const parts = [
    `High-quality 3D rendered children's book illustration in the style of a Pixar / DreamWorks animated movie, page ${pageNumber}.`,
    characterAnchor +
      ', rendered with a photorealistic, recognizable face that closely matches the reference photo (same facial features, skin tone and hair), set as a charming 3D animated character.',
    sceneHint ? `Scene from the story: "${sceneHint}".` : null,
    styleHints,
    'Square 1:1 aspect ratio, 220x220mm print size. Soft realistic textures, volumetric glow, highly detailed background, professional CGI render quality.',
    COLOR_GRADE,
    'Expressive joyful face, child-safe, polished and magical. No text, no captions, no watermarks, no signatures.',
  ].filter(Boolean);

  return parts.join(' ');
}

/**
 * Concrete cover-background elements per theme. Unlike themeStyle (which only
 * gives color/mood art-direction), this lists the actual OBJECTS that should
 * surround the hero on the FRONT COVER so the cover instantly communicates the
 * story's world — e.g. zoo => real animals, school => classroom + blackboard.
 */
export function coverBackground(theme: string): string {
  const map: Record<string, string> = {
    school_hero:
      'a bright colorful classroom and sunny schoolyard — a chalkboard with drawings, stacks of books, pencils and crayons, a playground slide, hanging paper art, and cheerful smiling classmates gathered around',
    school:
      'a bright colorful classroom and sunny schoolyard — a chalkboard, books, pencils, a playground slide, and smiling classmates gathered around',
    zoo_adventure:
      'a lively zoo full of friendly happy animals — a lion, an elephant, a giraffe, playful monkeys and a little bear cub — leafy green trees, balloons and colorful animal enclosures filling the background',
    animals:
      'a cheerful world of adorable friendly animals — a lion, an elephant, a giraffe, monkeys and a bear cub — surrounded by leafy trees and bright flowers',
    space:
      'outer space with friendly smiling planets, a cute rocket ship, twinkling stars, a glowing rainbow nebula and a little astronaut helmet',
    forest:
      'an enchanted forest with tall trees, friendly woodland animals (a rabbit, a fox, an owl and a deer), glowing mushrooms, flowers and dappled magical sunlight',
    ocean:
      'a colorful underwater world with playful fish, a smiling dolphin, a sea turtle, glowing coral reefs and shimmering sun rays',
    adventure:
      'a sweeping adventurous landscape — green mountains, a winding trail, a waving flag, a treasure-map feeling and warm golden-hour light',
    princess:
      'a sparkling fairytale castle with tall towers, blooming roses, friendly birds and shimmering magical light',
    superhero:
      'a bright city skyline at sunset with a heroic flowing cape, comic-style energy bursts and friendly little sidekicks',
    dinosaurs:
      'a lush prehistoric jungle with friendly colorful dinosaurs, giant ferns, a sparkling waterfall and a distant volcano',
    pirates:
      'a treasure island with a wooden pirate ship, palm trees, an open treasure chest of gold, a parrot and a turquoise sea',
    robots:
      'a fun retro-futuristic lab with friendly colorful robots, glowing gadgets, buttons and floating holograms',
    sports:
      'a sunny stadium with a ball, a goal net, a cheering crowd, bright team banners and confetti',
    cooking:
      'a cozy colorful kitchen with fresh ingredients, mixing bowls, a chef hat, cupcakes and yummy treats',
    music:
      'a whimsical concert stage with instruments, floating glowing musical notes, sparkles and colorful spotlights',
    magic:
      'a magical wonder-filled world with swirling golden sparkles, floating lanterns and glowing dreamlike light',
    custom:
      'a magical wonder-filled storybook world with swirling sparkles, warm glowing light and charming friendly details',
  };
  return map[theme] || map.custom;
}

/**
 * Builds the FRONT COVER prompt — the hero kid centered inside the themed
 * world, Taletoons-style. Pulls concrete scene objects from coverBackground so
 * each story's cover clearly shows what it's about.
 */
export function buildCoverPrompt(opts: {
  childName: string;
  childAge?: string | number;
  childGender: 'male' | 'female';
  theme: string;
}): string {
  const ageStr = String(opts.childAge ?? '5').split('-')[0];
  const child = opts.childGender === 'female' ? 'girl' : 'boy';
  const bg = coverBackground(opts.theme);
  return [
    `High-quality 3D rendered Pixar / DreamWorks style children's book FRONT COVER, square 1:1 aspect ratio.`,
    `${opts.childName}, a joyful ${ageStr}-year-old ${child} with a photorealistic recognizable face that closely matches the reference photo,`,
    `shown waist-up and centered as the smiling hero looking straight at the viewer with a big happy smile.`,
    `Surrounding background and props: ${bg}.`,
    `These themed elements clearly fill the whole frame around the child so the cover instantly tells what the story is about.`,
    `Soft realistic textures, dreamy glow, highly detailed, professional CGI render quality.`,
    COLOR_GRADE,
    `No text, no title, no watermark.`,
  ].join(' ');
}

function trimForPrompt(text: string, maxChars: number): string {
  const single = text.replace(/\s+/g, ' ').trim();
  if (single.length <= maxChars) return single;
  // Stop at sentence boundary if possible
  const slice = single.slice(0, maxChars);
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('؟ '), slice.lastIndexOf('! '));
  return (lastStop > maxChars * 0.6 ? slice.slice(0, lastStop + 1) : slice).trim();
}

/**
 * Theme-specific art-direction hints. Keep these short; the page text
 * already provides the scene specifics.
 */
function themeStyle(theme: string): string {
  const map: Record<string, string> = {
    adventure: 'Lush painterly storybook style, sweeping vivid landscapes, glowing golden-hour light, jewel-toned colors.',
    space: 'Dazzling space scene with friendly planets, sparkling stars and luminous rainbow nebulae, deep cosmic blues and electric purples.',
    ocean: 'Brilliant underwater world, playful colorful sea creatures, glowing coral, radiant turquoise and coral palette, shimmering sun rays.',
    forest: 'Enchanted forest bursting with cheerful animals, dappled magical sunlight, vivid emerald greens and warm golden browns.',
    princess: 'Sparkling fairytale castle, rich rose-gold and lavender palette, glittering magical details and shimmering light.',
    superhero: 'Dynamic friendly child-superhero scene, bold punchy colors, energetic glowing motion lines.',
    animals: 'Adorable expressive cartoon animals, candy-bright saturated colors, lively cheerful background.',
    zoo_adventure: 'A lush sunny zoo full of friendly adorable animals — a giraffe, an elephant, a colorful parrot, monkeys and a lion — leafy green trees, warm golden sunlight filtering through the leaves.',
    school_hero: 'Joyful school scene exploding with bright rainbow colors as kindness restores the school, warm and lively.',
    magic: 'Radiant magical glow, gold, lavender and teal hues, swirling sparkles, dreamlike luminous atmosphere.',
    dinosaurs: 'Friendly colorful dinosaurs in a vivid prehistoric jungle, lush saturated greens and warm sunset oranges.',
    pirates: 'Playful cartoon pirate adventure, treasure island, sparkling turquoise sea, golden warm sunset glow.',
    robots: 'Charming friendly robots, bright candy-colored retro-futuristic palette, glowing neon accents.',
    sports: 'Sunny vibrant field or court, dynamic action poses, bold energetic colors.',
    cooking: 'Cozy warm kitchen bursting with colorful ingredients, rich buttery golden palette.',
    music: 'Whimsical concert scene with floating glowing musical notes, vivid neon-pastel colors and sparkles.',
    custom: 'Vivid magical storybook art, rich saturated colors and a warm, wonder-filled atmosphere.',
  };
  return map[theme] || map.custom;
}
