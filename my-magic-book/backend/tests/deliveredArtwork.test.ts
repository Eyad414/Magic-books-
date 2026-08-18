import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SCENE_TEMPLATES } from '../src/services/sceneTemplates';

/**
 * A customer must receive the artwork they were shown.
 *
 * The demo book on the Stories page is generated from a theme's scene template.
 * The PAID book was only built from that template when the template also
 * carried pageTexts — so a theme with hand-written scenes but no texts
 * (space_real, whose story text is typed in the dashboard) fell through to the
 * fallback path and the customer got CGI cartoon art, while the book they chose
 * from was photoreal.
 */
const SRC = fs.readFileSync(path.resolve(__dirname, '../src/services/BookBuilder.ts'), 'utf8');

describe('what a paying customer receives', () => {
  it('chooses the template path on ARTWORK, not on page texts', () => {
    // The old gate: template?.pageScenes && template?.pageTexts && ...
    expect(SRC).not.toMatch(/template\?\.pageScenes && template\?\.pageTexts/);
    expect(SRC).toContain('template?.pageScenes?.length === ILLUSTRATION_PAGES');
  });

  it('can take page text from the dashboard-typed pages', () => {
    // Where space_real keeps its story text.
    expect(SRC).toContain('story.templatePages');
    expect(SRC).toContain('templateStoryTexts');
  });

  it('refuses to build a templated book with a blank page', () => {
    // templateStoryTexts returns null on any empty page, which drops the order
    // back to the fallback rather than printing an empty page.
    expect(SRC).toMatch(/if \(!String\(raw\)\.trim\(\)\) return null;/);
  });

  it('every theme with scenes can also produce text for all 13 pages', () => {
    // A theme with artwork but no text anywhere would silently keep using the
    // fallback, which is the bug this fixes — so name the ones that rely on
    // dashboard-typed pages.
    const locales = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../frontend/src/locales/ar/translation.json'), 'utf8'),
    );
    const needsTypedPages: string[] = [];
    for (const [id, tpl] of Object.entries(SCENE_TEMPLATES)) {
      if (!(tpl as any).pageScenes?.length) continue;
      const fromLocale = locales.stories?.[id]?.pages;
      const fromTemplate = (tpl as any).pageTexts?.length;
      if (!fromLocale && !fromTemplate) needsTypedPages.push(id);
    }
    // space_real is the known one; it carries its text on the theme record.
    expect(needsTypedPages).toEqual(['space_real']);
  });
});
