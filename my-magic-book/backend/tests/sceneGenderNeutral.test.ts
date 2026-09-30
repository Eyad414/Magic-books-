import { describe, it, expect } from 'vitest';
import { SCENE_TEMPLATES, buildScenePrompt } from '../src/services/sceneTemplates';

/**
 * A scene may not dress every child in one gender's clothes.
 *
 * jerusalem_tale wrote "a soft olive-green cardigan over a cream dress" into
 * its cover, its portrait and all thirteen pages. There is one scene per page
 * and no way to vary it, so EVERY child who ordered that story — boys included
 * — got fifteen photographs of themselves in a dress, in the book their parent
 * paid for. The demo generator could not produce a boy's version of the story
 * at all, which is how it was found: a re-shoot with a boy's photograph came
 * back as a boy's face above a dress.
 *
 * The fix is a gender token in the scene, resolved by buildScenePrompt with the
 * same rule the Arabic story text already used:
 *
 *   "over {a cream linen shirt and beige linen trousers|a cream dress} and
 *    brown leather sandals"
 *
 * So: a garment that belongs to one gender has to sit inside a token, and the
 * token has to actually resolve. Both are checked here, because either one
 * alone passes while the books come out wrong.
 */

/** Garments that read as one gender's and so must not be named unconditionally. */
const GENDERED_GARMENT = /\b(dress|skirt|gown|leggings|frock)\b/i;
/** "dress-up" is a box of costumes, not a garment. */
const NOT_A_GARMENT = /\bdress-up\b/gi;

/**
 * Only what the HERO wears is checked — the clause after "CLOTHING:" or
 * "wearing", up to the end of that sentence.
 *
 * world_adventure describes the children the hero meets as being in "distinct
 * traditional dress from several continents", which is the whole point of that
 * story and none of this rule's business. A check over the entire scene string
 * flags it, and a rule that cries wolf gets switched off.
 */
const heroClothing = (scene: string): string[] =>
  [...scene.matchAll(/(?:CLOTHING:\s*|\bwearing\s+)([^.]*)/gi)].map((m) => m[1]);

function scenesOf(t: (typeof SCENE_TEMPLATES)[string]): string[] {
  return [t.coverScene, t.portraitScene, ...(t.pageScenes || [])].filter(
    (x): x is string => typeof x === 'string' && x.length > 0,
  );
}

/** What is left once every {masculine|feminine} choice is removed. */
const outsideTokens = (scene: string) => scene.replace(/\{[^|{}]*\|[^|{}]*\}/g, ' ');

describe('scene prompts do not dress every child the same', () => {
  it('finds the templates to check', () => {
    expect(Object.keys(SCENE_TEMPLATES).length).toBeGreaterThan(20);
  });

  for (const [id, tpl] of Object.entries(SCENE_TEMPLATES)) {
    it(`${id} names no gendered garment outside a token`, () => {
      const offenders = scenesOf(tpl)
        .flatMap((s, i) => heroClothing(s).map((clause) => ({ i, clause })))
        .map((x) => ({ ...x, text: outsideTokens(x.clause).replace(NOT_A_GARMENT, ' ') }))
        .filter((x) => GENDERED_GARMENT.test(x.text))
        .map((x) => `scene #${x.i}: "${x.text.match(GENDERED_GARMENT)?.[0]}" in "${x.text.trim().slice(0, 70)}"`);

      expect(
        offenders,
        `${id} names a gendered garment for every child who orders this story. ` +
          `Write it as {masculine|feminine} instead — buildScenePrompt resolves it.`,
      ).toEqual([]);
    });
  }
});

describe('buildScenePrompt resolves the gender token', () => {
  const scene = 'standing in a hall wearing {a grey suit|a red dress} and boots';

  it('a boy gets the masculine half', () => {
    const p = buildScenePrompt('page', scene, 'بهاء', 'male');
    expect(p).toContain('a grey suit');
    expect(p).not.toContain('a red dress');
  });

  it('a girl gets the feminine half', () => {
    const p = buildScenePrompt('page', scene, 'لورا', 'female');
    expect(p).toContain('a red dress');
    expect(p).not.toContain('a grey suit');
  });

  it('leaves a scene without a token exactly as written', () => {
    const plain = 'standing in a hall wearing a blue coat';
    expect(buildScenePrompt('page', plain, 'بهاء', 'male')).toContain(plain);
  });

  // The story that caused this, end to end.
  it('jerusalem_tale puts a boy in trousers and a girl in the dress', () => {
    const t = SCENE_TEMPLATES.jerusalem_tale;
    for (const scene of [t.coverScene, t.portraitScene, ...(t.pageScenes || [])]) {
      if (!scene) continue;
      const boy = buildScenePrompt('page', scene, 'بهاء', 'male');
      const girl = buildScenePrompt('page', scene, 'لورا', 'female');
      expect(boy).toContain('beige linen trousers');
      expect(boy).not.toContain('cream dress');
      expect(girl).toContain('cream dress');
    }
  });
});
