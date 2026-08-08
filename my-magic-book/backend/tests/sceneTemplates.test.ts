import { describe, it, expect } from 'vitest';
import { SCENE_TEMPLATES, COLORING_PAGES, resolveGender, resolveTokens } from '../src/services/sceneTemplates';

const STORY_PAGES = 13;

/** Themes that ship a full story book (as opposed to coloring-only). */
const storyThemes = Object.entries(SCENE_TEMPLATES).filter(([, tpl]) => !!tpl.pageTexts);

describe('scene templates', () => {
  it('has at least the themes the live API advertises', () => {
    for (const id of ['zoo_adventure', 'space', 'magic_book', 'school_hero', 'pirate_adventure', 'dinosaur_adventure', 'ocean_adventure']) {
      expect(SCENE_TEMPLATES[id], `missing template: ${id}`).toBeDefined();
    }
  });

  describe.each(storyThemes)('%s', (id, tpl) => {
    // Text and scenes are index-matched at render time — a length mismatch
    // silently pairs page 7's words with page 8's picture.
    it(`has ${STORY_PAGES} page texts and ${STORY_PAGES} matching scenes`, () => {
      expect(tpl.pageTexts, `${id}.pageTexts`).toHaveLength(STORY_PAGES);
      expect(tpl.pageScenes, `${id}.pageScenes`).toHaveLength(STORY_PAGES);
    });

    it('has a cover, a portrait and an Arabic title', () => {
      expect(tpl.coverScene?.trim(), `${id}.coverScene`).toBeTruthy();
      expect(tpl.portraitScene?.trim(), `${id}.portraitScene`).toBeTruthy();
      expect(tpl.titleAr?.trim(), `${id}.titleAr`).toBeTruthy();
    });

    it('has no empty page text or scene', () => {
      tpl.pageTexts?.forEach((t, i) => expect(t?.trim(), `${id}.pageTexts[${i}]`).toBeTruthy());
      tpl.pageScenes?.forEach((s, i) => expect(s?.trim(), `${id}.pageScenes[${i}]`).toBeTruthy());
    });

    // medalPages is 1-based and appends a "no lettering on the medal" guard. An
    // out-of-range index put a spurious medal on the wrong dinosaur page once.
    it('only marks medal pages that exist', () => {
      for (const p of tpl.medalPages ?? []) {
        expect(p, `${id}.medalPages`).toBeGreaterThanOrEqual(1);
        expect(p, `${id}.medalPages`).toBeLessThanOrEqual(STORY_PAGES);
      }
    });

    it('leaves no unresolved tokens after resolveTokens', () => {
      for (const raw of [tpl.titleAr!, ...(tpl.pageTexts ?? [])]) {
        const out = resolveTokens(raw, 'سارة', 'female');
        expect(out, `unresolved [NAME] in ${id}`).not.toMatch(/\[NAME\]/i);
        expect(out, `unresolved {m|f} in ${id}`).not.toMatch(/\{[^|{}]*\|[^|{}]*\}/);
      }
    });
  });

  it('gives every coloring theme the full page count', () => {
    for (const [id, tpl] of Object.entries(SCENE_TEMPLATES)) {
      if (!tpl.coloringScenes) continue;
      expect(tpl.coloringScenes, `${id}.coloringScenes`).toHaveLength(COLORING_PAGES);
    }
  });
});

describe('resolveGender', () => {
  it('honours an explicit female', () => {
    expect(resolveGender('أحمد', 'female')).toBe('female');
  });

  // The wizard defaults childGender to male, so girls arrive stored as male.
  it.each(['سارة', 'جوليا', 'Julia', 'لورا', 'Lora'])('corrects the girl name %s', (name) => {
    expect(resolveGender(name, 'male')).toBe('female');
  });

  it('matches on the first name only', () => {
    expect(resolveGender('سارة أبو طه', 'male')).toBe('female');
  });

  // Guessing on a unisex name would misgender a boy — leave those alone.
  it.each(['نور', 'ملك'])('leaves the unisex name %s as stored', (name) => {
    expect(resolveGender(name, 'male')).toBe('male');
  });

  it('keeps the stored value for an unknown or empty name', () => {
    expect(resolveGender('زيدان', 'male')).toBe('male');
    expect(resolveGender('', 'male')).toBe('male');
    expect(resolveGender(undefined, 'male')).toBe('male');
  });
});

describe('resolveTokens', () => {
  it('substitutes the name', () => {
    expect(resolveTokens('مرحبا [NAME]!', 'سارة', 'female')).toBe('مرحبا سارة!');
  });

  it('picks the masculine or feminine side', () => {
    expect(resolveTokens('{ذهب|ذهبت}', 'أحمد', 'male')).toBe('ذهب');
    expect(resolveTokens('{ذهب|ذهبت}', 'سارة', 'female')).toBe('ذهبت');
  });

  // The bug this guards: text was gender-corrected by name but the art prompt
  // was not, so a girl's book read feminine and looked masculine.
  it('applies the name-based correction even when male is passed', () => {
    expect(resolveTokens('{ذهب|ذهبت}', 'جوليا', 'male')).toBe('ذهبت');
  });

  it('survives empty input', () => {
    expect(resolveTokens('', 'سارة', 'female')).toBe('');
  });
});
