import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SCENE_TEMPLATES, resolveTokens, wantsColoringBook, getSceneTemplate } from '../src/services/sceneTemplates';

/**
 * Adding a story means registering it in FOUR places. Miss the frontend
 * `data/stories` one and the book silently renders as the zoo — `findStory()`
 * falls back to STORIES[0] rather than throwing, so nothing looks broken until
 * a customer opens the wrong book. These tests make that miss loud.
 */
const FRONTEND = path.resolve(__dirname, '../../frontend/src');
const STORY_PAGES = 13;
const LOCALES = ['ar', 'en', 'he'] as const;

const storyThemes = Object.entries(SCENE_TEMPLATES)
  .filter(([, tpl]) => !!tpl.pageTexts)
  .map(([id]) => id);

/** Theme ids registered in the frontend story registry. */
function frontendStoryIds(): string[] {
  const dir = path.join(FRONTEND, 'data/stories');
  const index = fs.readFileSync(path.join(dir, 'index.ts'), 'utf8')
    // index.ts keeps a commented-out list of planned stories; those files do
    // not exist yet, so drop comments before looking for real imports.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  // Only files actually imported by index.ts count — an orphaned story file
  // that nobody imports is exactly the bug we are guarding against.
  const imported = [...index.matchAll(/from\s+'\.\/(story\d+_[a-z0-9]+)'/gi)].map((m) => m[1]);
  const ids: string[] = [];
  for (const file of imported) {
    const src = fs.readFileSync(path.join(dir, `${file}.ts`), 'utf8');
    const id = src.match(/^\s*id:\s*'([^']+)'/m)?.[1];
    if (id) ids.push(id);
  }
  return ids;
}

function locale(lng: string): any {
  return JSON.parse(fs.readFileSync(path.join(FRONTEND, `locales/${lng}/translation.json`), 'utf8'));
}

describe('story registration', () => {
  const registered = frontendStoryIds();

  it('finds the frontend registry', () => {
    expect(registered.length).toBeGreaterThan(0);
  });

  describe.each(storyThemes)('%s', (id) => {
    it('is registered in the frontend story registry', () => {
      expect(registered, `${id} has a backend template but no frontend story — it will render as ${registered[0]}`).toContain(id);
    });

    it.each(LOCALES)('has a title and story pages in %s', (lng) => {
      const story = locale(lng).stories?.[id];
      expect(story, `stories.${id} missing from ${lng}/translation.json`).toBeDefined();
      expect(story.title?.trim(), `stories.${id}.title in ${lng}`).toBeTruthy();

      // Two key schemes are in use across locales (a plain array in some, a
      // numbered object in others). Both are fine; an incomplete one is not.
      const pages = story.pages;
      expect(pages, `stories.${id}.pages in ${lng}`).toBeDefined();
      const count = Array.isArray(pages) ? pages.length : Object.keys(pages).length;
      expect(count, `stories.${id}.pages in ${lng} has ${count} pages, expected ${STORY_PAGES}`).toBe(STORY_PAGES);
    });

    // A separate key from stories.<id>.title, and easy to forget: the title
    // carries [NAME] and gender tokens, so the wizard's theme grid needs its own
    // short name. Without it getThemeLabel falls back to the theme's Arabic
    // `label`, and nine stories showed Arabic names on the English and Hebrew
    // wizard — under "show more", where it went unnoticed.
    it.each(LOCALES)('has a wizard theme name and description in %s', (lng) => {
      const step2 = locale(lng).step2 || {};
      expect(
        step2[`theme_${id}`]?.trim(),
        `step2.theme_${id} missing from ${lng} — the theme grid will show Arabic`,
      ).toBeTruthy();
      expect(
        step2[`theme_${id}_desc`]?.trim(),
        `step2.theme_${id}_desc missing from ${lng}`,
      ).toBeTruthy();
    });
  });

  it('has no frontend story without a backend scene template', () => {
    const templated = Object.keys(SCENE_TEMPLATES);
    const orphans = registered.filter((id) => !templated.includes(id));
    expect(orphans, `frontend stories with no backend template: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('locale story text', () => {
  // Story text is hand-written per language and carries [NAME] and {masc|fem}
  // tokens. A dropped brace renders the raw token to the child, so check that
  // every localized string survives the same resolver the book uses.
  const textsOf = (story: any): string[] => {
    const qs = Array.isArray(story.questions) ? story.questions : Object.values(story.questions ?? {});
    const pages = Array.isArray(story.pages) ? story.pages : Object.values(story.pages ?? {});
    return [story.title, story.tagline, story.moral, story.conclusion, story.dedication, ...qs, ...pages]
      .filter((s): s is string => typeof s === 'string');
  };

  for (const lng of LOCALES) {
    const stories = locale(lng).stories ?? {};
    describe.each(Object.keys(stories))(`${lng} — %s`, (id) => {
      it('resolves every token for a girl and for a boy', () => {
        for (const raw of textsOf(stories[id])) {
          for (const [name, gender] of [['سارة', 'female'], ['أحمد', 'male']] as const) {
            const out = resolveTokens(raw, name, gender);
            expect(out, `unresolved [NAME] in ${lng}/${id}: ${raw.slice(0, 60)}`).not.toMatch(/\[NAME\]/i);
            expect(out, `unresolved {m|f} in ${lng}/${id}: ${raw.slice(0, 60)}`).not.toMatch(/\{[^|{}]*\|[^|{}]*\}/);
          }
        }
      });

      // An unpaired brace is the classic hand-translation slip: it never renders
      // as a token, so it reaches the page verbatim.
      it('has balanced braces', () => {
        for (const raw of textsOf(stories[id])) {
          const opens = (raw.match(/\{/g) || []).length;
          const closes = (raw.match(/\}/g) || []).length;
          expect(opens, `unbalanced braces in ${lng}/${id}: ${raw.slice(0, 60)}`).toBe(closes);
        }
      });
    });
  }
});

describe('locale parity', () => {
  /** Flattens to dotted leaf paths so a missing nested key is reported precisely. */
  function leaves(obj: any, prefix = ''): string[] {
    if (obj === null || typeof obj !== 'object') return [prefix];
    return Object.entries(obj).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  }

  const base = [...new Set(leaves(locale('ar')))];

  it.each(['en', 'he'])('%s has every key Arabic has', (lng) => {
    const have = new Set(leaves(locale(lng)));
    const missing = base.filter((k) => !have.has(k));
    expect(missing, `missing ${missing.length} key(s) in ${lng}, e.g. ${missing.slice(0, 8).join(', ')}`).toEqual([]);
  });
});

describe('wantsColoringBook', () => {
  it('builds a colouring book for a theme that only has story scenes', () => {
    // zoo has no hand-written colouring scenes; before the fix this order
    // silently produced a story book instead of the colouring book paid for.
    expect(wantsColoringBook('coloring', SCENE_TEMPLATES.zoo_adventure)).toBe(true);
  });

  it('builds one for every theme that can be ordered', () => {
    const themes = Object.keys(SCENE_TEMPLATES).filter((id) => SCENE_TEMPLATES[id]?.pageScenes?.length);
    const cannot = themes.filter((id) => !wantsColoringBook('coloring', SCENE_TEMPLATES[id]));
    expect(cannot).toEqual([]);
  });

  it('leaves other packages alone', () => {
    expect(wantsColoringBook('color', SCENE_TEMPLATES.zoo_adventure)).toBe(false);
    expect(wantsColoringBook('pro', SCENE_TEMPLATES.zoo_adventure)).toBe(false);
    expect(wantsColoringBook(undefined, SCENE_TEMPLATES.zoo_adventure)).toBe(false);
  });

  it('refuses a theme with nothing to derive from', () => {
    expect(wantsColoringBook('coloring', { pageScenes: [] })).toBe(false);
    expect(wantsColoringBook('coloring', undefined)).toBe(false);
  });
});

describe('colouring themes sold as their own story', () => {
  it('finds the story template behind a colouring theme', () => {
    // These ids have no template of their own; the scenes live on the story.
    expect(getSceneTemplate('zoo_coloring')).toBe(SCENE_TEMPLATES.zoo_adventure);
    expect(getSceneTemplate('space_coloring')).toBe(SCENE_TEMPLATES.space_real);
    expect(getSceneTemplate('school_coloring')).toBe(SCENE_TEMPLATES.school_hero);
  });

  it('builds a colouring book for a colouring theme whatever the package says', () => {
    expect(wantsColoringBook('color', getSceneTemplate('zoo_coloring'), 'zoo_coloring')).toBe(true);
    expect(wantsColoringBook(undefined, getSceneTemplate('space_coloring'), 'space_coloring')).toBe(true);
  });

  it('leaves ordinary story themes alone', () => {
    expect(wantsColoringBook('color', SCENE_TEMPLATES.zoo_adventure, 'zoo_adventure')).toBe(false);
    expect(getSceneTemplate('zoo_adventure')).toBe(SCENE_TEMPLATES.zoo_adventure);
  });
});
