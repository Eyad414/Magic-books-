import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { funnelStagesFor } from '../src/services/VisitFunnel';

/**
 * The failure this guards is a stage that cannot fire.
 *
 * "وصل الدفع" tested for a path no part of the app emitted, so it read 0 every
 * day since it was written and nobody could tell that from looking at it. The
 * last test is the important one: every stage must be reachable by a path the
 * frontend genuinely sends.
 */

const FRONTEND = path.resolve(__dirname, '../../frontend/src');

describe('funnel stages', () => {
  it('reads a whole journey', () => {
    const s = funnelStagesFor([
      '/', '/stories', '/create', '/create/step-1', '/create/step-2',
      '/create/step-3', '/create/step-4', '/order/success',
    ]);
    expect(s).toEqual({
      stories: true, create: true, step2: true, step3: true, checkout: true, paid: true,
    });
  });

  it('stops where the visitor stopped', () => {
    const s = funnelStagesFor(['/', '/create', '/create/step-1', '/create/step-2']);
    expect(s.step2).toBe(true);
    expect(s.step3).toBe(false);
    expect(s.checkout).toBe(false);
    expect(s.paid).toBe(false);
  });

  it('does not count a browser that only read the shop', () => {
    const s = funnelStagesFor(['/', '/stories', '/about']);
    expect(s.stories).toBe(true);
    expect(s.create).toBe(false);
    expect(s.paid).toBe(false);
  });

  it('counts each stage once however many times it was seen', () => {
    const a = funnelStagesFor(['/create/step-2']);
    const b = funnelStagesFor(['/create/step-2', '/create/step-2', '/create/step-2']);
    expect(a).toEqual(b);
  });

  it('handles an empty trail', () => {
    expect(Object.values(funnelStagesFor([])).every((v) => v === false)).toBe(true);
  });

  /**
   * The one that would have caught the original bug.
   */
  it('every stage is reachable by a path the app actually emits', () => {
    const app = fs.readFileSync(path.join(FRONTEND, 'App.tsx'), 'utf8');
    const wizard = fs.readFileSync(path.join(FRONTEND, 'pages/CreateStory.tsx'), 'utf8');

    // routes the router records, plus whatever the wizard reports for itself
    const routes = [...app.matchAll(/path="([^"]*)"/g)].map((m) => '/' + m[1].replace(/^\/+/, ''));
    const stepTemplate = /recordVisit\(`\/create\/step-\$\{[^}]+\}`/.test(wizard);
    expect(stepTemplate, 'the wizard must report /create/step-N or the step stages are dead').toBe(true);
    const emitted = [...routes, '/create/step-1', '/create/step-2', '/create/step-3', '/create/step-4'];

    const union = funnelStagesFor(emitted);
    for (const [stage, reached] of Object.entries(union)) {
      expect(reached, `no path the app emits can ever set "${stage}"`).toBe(true);
    }
  });
});
