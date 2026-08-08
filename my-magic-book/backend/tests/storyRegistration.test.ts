import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SCENE_TEMPLATES } from '../src/services/sceneTemplates';

/**
 * Adding a story means registering it in FOUR places. Miss the frontend
 * `data/stories` one and the book silently renders as the zoo — `findStory()`
 * falls back to STORIES[0] rather than throwing, so nothing looks broken until
 * a customer opens the wrong book. These tests make that miss loud.
 */
const FRONTEND = path.resolve(__dirname, '../../frontend/src');
const STORY_PAGES = 13;
const LOCALES = ['ar', 'en', 'he'] as const;

/**
 * KNOWN GAP — `toy_city` is a half-registered showcase story: it has a frontend
 * story file and Arabic text, but no backend scene template and no en/he
 * translation. It is demo-only (the API does not offer it as an orderable
 * theme), so the cost is that the `lora-toycity` showcase card reads broken for
 * English and Hebrew visitors. Exempted narrowly so the rest of the suite can
 * gate CI; delete this list once the story is finished or retired.
 */
const KNOWN_INCOMPLETE = ['toy_city'];

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
  });

  it('has no frontend story without a backend scene template', () => {
    const templated = Object.keys(SCENE_TEMPLATES);
    const orphans = registered.filter((id) => !templated.includes(id) && !KNOWN_INCOMPLETE.includes(id));
    expect(orphans, `frontend stories with no backend template: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('locale parity', () => {
  /** Flattens to dotted leaf paths so a missing nested key is reported precisely. */
  function leaves(obj: any, prefix = ''): string[] {
    if (obj === null || typeof obj !== 'object') return [prefix];
    return Object.entries(obj).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  }

  const exempt = (key: string) => KNOWN_INCOMPLETE.some((id) => key.includes(id));
  const base = [...new Set(leaves(locale('ar')))].filter((k) => !exempt(k));

  it.each(['en', 'he'])('%s has every key Arabic has', (lng) => {
    const have = new Set(leaves(locale(lng)));
    const missing = base.filter((k) => !have.has(k));
    expect(missing, `missing ${missing.length} key(s) in ${lng}, e.g. ${missing.slice(0, 8).join(', ')}`).toEqual([]);
  });
});
