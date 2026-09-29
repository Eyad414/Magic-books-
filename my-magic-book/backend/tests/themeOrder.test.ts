import { describe, it, expect } from 'vitest';
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
