import { describe, it, expect } from 'vitest';
import { SCENE_TEMPLATES, resolveColoringScenes, COLORING_PAGES } from '../src/services/sceneTemplates';

/**
 * The Pro bundle promises a colouring book. It used to require hand-written
 * `coloringScenes`, which only four themes had, so a Pro customer who chose any
 * other story paid for a colouring book and silently received none — no error,
 * nothing in the order, nothing logged.
 *
 * These lock in the rule that made that impossible: every theme that can be
 * ordered must be able to produce colouring scenes, from its own page scenes if
 * nobody wrote bespoke ones.
 */
const orderable = Object.entries(SCENE_TEMPLATES).filter(([, t]) => !!(t as any).pageScenes);

describe('coloring scenes', () => {
  it('covers every orderable theme', () => {
    const missing = orderable.filter(([, t]) => !resolveColoringScenes(t)).map(([id]) => id);
    expect(missing, `Pro would ship no colouring book for: ${missing.join(', ')}`).toEqual([]);
  });

  describe.each(orderable.map(([id]) => id))('%s', (id) => {
    const r = resolveColoringScenes((SCENE_TEMPLATES as any)[id])!;

    it(`has exactly ${COLORING_PAGES} page scenes`, () => {
      expect(r.scenes).toHaveLength(COLORING_PAGES);
      expect(r.scenes.every((s) => s.trim().length > 0)).toBe(true);
    });

    it('has a cover scene', () => {
      expect(r.cover.trim().length).toBeGreaterThan(0);
    });

    it('drops the full-colour boilerplate that means nothing in line art', () => {
      // These clauses pin wardrobe, lighting and "not a flat cut-out" for the
      // photoreal pages. In a black-and-white colouring page they only dilute
      // the prompt.
      const all = [r.cover, ...r.scenes, r.back ?? ''].join(' ').toLowerCase();
      expect(all).not.toContain('never the clothes from the reference photo');
      expect(all).not.toContain('flat cut-out');
      expect(all).not.toContain('the same outfit on every page');
    });

    it('keeps each scene short enough to stay the focus of the prompt', () => {
      for (const s of r.scenes) expect(s.length).toBeLessThanOrEqual(220);
    });
  });

  it('prefers hand-written colouring scenes over derived ones', () => {
    const [id, tpl] = orderable.find(([, t]) => ((t as any).coloringScenes || []).length > 0)!;
    const r = resolveColoringScenes(tpl)!;
    expect(r.scenes[0], `${id} should use its own coloringScenes`).toBe((tpl as any).coloringScenes[0]);
  });
});
