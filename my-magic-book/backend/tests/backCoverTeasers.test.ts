import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { BACK_TEASERS, pickTeasers } from '../src/services/PrintService';
import { SCENE_TEMPLATES } from '../src/services/sceneTemplates';

/**
 * The three stories a finished book advertises on its back cover.
 *
 * Two things had gone wrong. It always showed the SAME three — the picker took
 * `.slice(0, 3)` off a fixed list, so every child in every book was pointed at
 * space, school and the zoo. And the list contained "superhero", which is not a
 * theme and never has been: children were being sold a book nobody can order.
 */

const FRONTEND = path.resolve(__dirname, '../../frontend/src');

describe('back-cover teasers', () => {
  it('only ever advertises a story that exists', () => {
    const real = new Set(Object.keys(SCENE_TEMPLATES));
    const phantom = BACK_TEASERS.filter((t) => !real.has(t.theme)).map((t) => t.theme);
    expect(phantom, `these are advertised but are not themes: ${phantom.join(', ')}`).toEqual([]);
  });

  it('never recommends the book you are already holding', () => {
    for (const t of BACK_TEASERS) {
      const picked = pickTeasers(t.theme, 'لورا').map((p) => p.theme);
      expect(picked, `${t.theme} recommended itself`).not.toContain(t.theme);
    }
    // a colouring or photoreal variant excludes its parent too
    expect(pickTeasers('zoo_coloring', 'لورا').map((p) => p.theme)).not.toContain('zoo_adventure');
    expect(pickTeasers('space_real', 'لورا').map((p) => p.theme)).not.toContain('space');
  });

  it('gives the same book the same three, every time', () => {
    const a = pickTeasers('jerusalem_tale', 'لورا').map((p) => p.theme);
    const b = pickTeasers('jerusalem_tale', 'لورا').map((p) => p.theme);
    expect(a).toEqual(b);
  });

  it('does not give every book the same three', () => {
    // the actual complaint: always space / school / zoo
    const sets = ['jerusalem_tale', 'little_vet', 'little_chef', 'big_brother', 'toy_city']
      .map((th) => pickTeasers(th, 'لورا').map((p) => p.theme).join(','));
    expect(new Set(sets).size).toBeGreaterThan(1);
  });

  it('varies by child as well as by story', () => {
    const one = pickTeasers('space', 'لورا').map((p) => p.theme).join(',');
    const two = pickTeasers('space', 'إياد').map((p) => p.theme).join(',');
    expect(one).not.toEqual(two);
  });

  it('always gives exactly three', () => {
    for (const t of BACK_TEASERS) expect(pickTeasers(t.theme, 'سارة')).toHaveLength(3);
  });

  it('the printed cover and the screen offer the same list', () => {
    // BackCover.tsx carries its own copy; if they drift, a customer who read
    // the book online finds different titles in the parcel.
    const tsx = fs.readFileSync(path.join(FRONTEND, 'components/book/BackCover.tsx'), 'utf8');
    const frontIds = [...tsx.matchAll(/\{ id: '([^']+)',\s*emoji:/g)].map((m) => m[1]);
    expect(frontIds.sort()).toEqual(BACK_TEASERS.map((t) => t.theme).sort());
  });
});
