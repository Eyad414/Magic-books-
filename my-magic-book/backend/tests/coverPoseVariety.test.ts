import { describe, it, expect } from 'vitest';
import { SCENE_TEMPLATES } from '../src/services/sceneTemplates';

/**
 * Covers that sit side by side must not be the same photograph twice.
 *
 * Five stories were re-shot from one child's photo in the same week, and every
 * cover scene had been written from the same formula:
 *
 *   "the child standing centre frame in <place> with arms open and a proud
 *    smile, surrounded at waist height by a neat arc of objects — <props>"
 *
 * Each one is a fine cover on its own. Together — in the wizard grid, on
 * /stories, in the hero deck where they rotate through the same frame — they
 * read as one picture with the background swapped, which is the opposite of
 * what a catalogue of twenty-five different stories is supposed to say. The
 * owner spotted it immediately: same child, same pose, five times.
 *
 * The formula is not banned. It is a good cover and دبكة keeps it, because
 * arms open IS the dabke step. What is banned is more than one of these using
 * it, since these are the ones a customer sees together.
 */

/**
 * The stories drawn from the same photograph, which therefore appear as a set:
 * the hero deck rotates them and the wizard grid lists them together. Keep this
 * in step with FROM_THIS_PHOTO in HeroBookDeck.tsx.
 */
const SHOWN_TOGETHER = [
  'world_adventure',
  'little_vet',
  'dabke',
  'jerusalem_tale',
  'jaffa_day',
  'oud_lesson',
] as const;

/** The pose the five shared. */
const ARMS_OPEN = /arms open/i;

describe('covers shown together do not share a pose', () => {
  it('knows the stories it is talking about', () => {
    for (const id of SHOWN_TOGETHER) {
      expect(SCENE_TEMPLATES[id], `${id} is not a scene template any more`).toBeDefined();
      expect(typeof SCENE_TEMPLATES[id].coverScene).toBe('string');
    }
  });

  it('lets at most one of them stand with arms open', () => {
    const using = SHOWN_TOGETHER.filter((id) => ARMS_OPEN.test(SCENE_TEMPLATES[id].coverScene || ''));
    expect(
      using,
      `these covers are shown side by side and ${using.length} of them use the same ` +
        `arms-open pose, so the set reads as one picture with the background swapped. ` +
        `Give all but one a pose that comes from its own story.`,
    ).toHaveLength(1);
  });

  it('gives each of them a distinct opening clause', () => {
    // The first clause is the pose. Two identical openings is the same failure
    // as the shared pose, just phrased differently.
    const openings = SHOWN_TOGETHER.map((id) => ({
      id,
      opening: (SCENE_TEMPLATES[id].coverScene || '').split(',')[0].trim().toLowerCase(),
    }));
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const { id, opening } of openings) {
      const already = seen.get(opening);
      if (already) clashes.push(`${already} and ${id}: "${opening}"`);
      else seen.set(opening, id);
    }
    expect(clashes, 'two covers in the set open on the same pose').toEqual([]);
  });
});
