import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { orderThemesForChild, demoRank } from '../../frontend/src/utils/themeOrder';

/**
 * The wizard's theme grid, ordered for the child in front of it.
 *
 * The behaviour worth pinning is not "girls' books first" — it is what happens
 * to a theme nobody has labelled. Treating an unset demoGender as male is the
 * exact assumption that gave the shop a catalogue a customer called all-boys,
 * and it would come back here as every unlabelled book sinking below the girls'
 * ones the moment someone "tidied" the comparison.
 */

const T = (id: string, demoGender?: 'male' | 'female') => ({ id, demoGender });

describe('orderThemesForChild', () => {
  it('puts the matching gender first', () => {
    const out = orderThemesForChild([T('boy1', 'male'), T('girl1', 'female')], 'female');
    expect(out.map((t) => t.id)).toEqual(['girl1', 'boy1']);
  });

  it('leaves unlabelled themes above the mismatched ones, not below', () => {
    const out = orderThemesForChild(
      [T('boy1', 'male'), T('unknown'), T('girl1', 'female')],
      'female',
    );
    expect(out.map((t) => t.id)).toEqual(['girl1', 'unknown', 'boy1']);
  });

  it('does not treat unset as male', () => {
    expect(demoRank(T('x'), 'female')).toBeLessThan(demoRank(T('y', 'male'), 'female'));
  });

  it('is stable — same rank keeps the shop\'s own order', () => {
    const out = orderThemesForChild(
      [T('a', 'female'), T('b', 'female'), T('c', 'female')],
      'female',
    );
    expect(out.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('changes nothing when the gender is not known yet', () => {
    const input = [T('a', 'male'), T('b', 'female'), T('c')];
    expect(orderThemesForChild(input, undefined).map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the list it was given', () => {
    const input = [T('boy', 'male'), T('girl', 'female')];
    orderThemesForChild(input, 'female');
    expect(input.map((t) => t.id)).toEqual(['boy', 'girl']);
  });
});


/**
 * The sort is only as good as the data reaching it.
 *
 * Step 2 builds its theme list by naming every field it keeps, so a field added
 * to the model and to the dashboard still arrives as undefined until it is
 * listed there too. demoGender shipped exactly that way: model, admin toggle,
 * sort and six green tests, and the grid did not move, because the pure
 * function was being handed fixtures I wrote rather than the objects the app
 * actually builds.
 */
describe('the wizard actually receives demoGender', () => {
  const step2 = fs.readFileSync(
    path.resolve(__dirname, '../../frontend/src/components/wizard/Step2_AI_Generator.tsx'),
    'utf8',
  );

  it('carries demoGender through the API mapping', () => {
    expect(
      /demoGender:\s*dbTheme\.demoGender/.test(step2),
      'Step 2 maps the API theme field by field. Without demoGender listed there, ' +
        'every theme reaches the sort with it undefined and the grid never reorders.',
    ).toBe(true);
  });

  it('sorts the list it renders, not the raw one', () => {
    // visibleThemes must slice the ORDERED list; slicing THEMES silently
    // discards the ordering for everyone who does not press "show more".
    expect(step2).toMatch(/visibleThemes\s*=\s*showAllThemes\s*\?\s*orderedThemes\s*:\s*orderedThemes\.slice/);
  });
});
