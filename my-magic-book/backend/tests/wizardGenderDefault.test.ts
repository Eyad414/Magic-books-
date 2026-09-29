import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The wizard must not pick the child's gender for the parent.
 *
 * One value decides every pronoun and verb ending across thirteen pages of
 * Arabic. It used to arrive pre-set to male in two places at once — the
 * context's defaultProgress and the step-1 form's fallback — so a parent who
 * never looked at the field got a boy's book for their daughter, and the
 * mistake first became visible on printed paper.
 *
 * It is also how the shop ended up with a catalogue a customer described as
 * "all for boys": the demo generator carried the same hardcoded default.
 *
 * Both places are asserted, because fixing either one alone changes nothing —
 * the form falls back to the context, so a default in the context survives a
 * fix in the form and looks exactly like a fix.
 */

const FRONTEND = path.resolve(__dirname, '../../frontend/src');
const context = fs.readFileSync(path.join(FRONTEND, 'context/StoryProgressContext.tsx'), 'utf8');
const step1 = fs.readFileSync(path.join(FRONTEND, 'components/wizard/Step1_ChildDetails.tsx'), 'utf8');

describe('wizard gender is chosen, never assumed', () => {
  it('defaultProgress does not seed a gender', () => {
    const block = context.slice(context.indexOf('defaultProgress'), context.indexOf('defaultProgress') + 400);
    expect(
      /childGender:\s*'(male|female)'/.test(block),
      'defaultProgress seeds a gender — step 1 reads through to it, so the form ' +
        'renders with that gender already chosen and a parent can miss it entirely.',
    ).toBe(false);
  });

  it('step 1 does not fall back to a gender', () => {
    expect(
      /childGender:\s*progress\.childDetails\.childGender\s*\|\|\s*'(male|female)'/.test(step1),
      "step 1 falls back to a gender when the context has none — the field arrives pre-answered.",
    ).toBe(false);
  });

  it('step 1 refuses to advance until one is picked', () => {
    // The guard above only helps if something stops an empty value going through.
    expect(step1).toMatch(/if\s*\(!form\.childGender\)\s*errs\.childGender/);
  });
});
