import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * A real child's face never reaches a public page by default.
 *
 * The four girl books — دبكة, يوم في يافا, درس العود, حكاية في القدس — were all
 * drawn from Lora's own photograph. Her family has not agreed to her being on
 * the shop, so every one of those cards must need an explicit tick before it
 * can appear on /stories or the home page.
 *
 * Two ways that has gone wrong before, both recorded in showcaseCards.ts:
 *   - privacy was inferred from the DISPLAYED NAME, so renaming a card to an
 *     invented name published the child's face while the label changed;
 *   - the private check existed on the Stories page and not the home page, so
 *     a card pulled from one carried on sitting on the other.
 *
 * So this asserts on the data, not on the rendering: any card whose artwork
 * comes from a child in PRIVATE_DEMO_CHILDREN must carry `private: true` of its
 * own, independently of the name.
 */

const FILE = path.resolve(__dirname, '../../frontend/src/data/showcaseCards.ts');
const src = fs.readFileSync(FILE, 'utf8');

/** Themes whose demo artwork was generated from a real child's photograph. */
const DRAWN_FROM_A_REAL_CHILD = ['dabke', 'jaffa_day', 'oud_lesson', 'jerusalem_tale'];

function cardLinesFor(themeId: string): string[] {
  return src
    .split('\n')
    .filter((l) => l.includes('key:') && new RegExp(`themeId:\\s*'${themeId}'`).test(l));
}

describe("showcase cards drawn from a real child's photo", () => {
  for (const themeId of DRAWN_FROM_A_REAL_CHILD) {
    it(`${themeId} has a card at all`, () => {
      // A story with no card is invisible on /stories however ready it is —
      // which is how three finished books sat unseen for a month.
      expect(cardLinesFor(themeId).length).toBeGreaterThan(0);
    });

    it(`${themeId} is marked private, not left to its name`, () => {
      for (const line of cardLinesFor(themeId)) {
        expect(line, `this card publishes a real child's face unless it says private: true:\n${line}`)
          .toMatch(/private:\s*true/);
      }
    });
  }

  it('still gates on the flag OR the name, so neither alone can be forgotten', () => {
    expect(src).toMatch(/card\.private === true \|\| PRIVATE_DEMO_CHILDREN\.has\(card\.name\)/);
  });

  it('keeps Lora, Sara and Julia in the private set', () => {
    const m = src.match(/PRIVATE_DEMO_CHILDREN = new Set\(\[([^\]]*)\]/);
    expect(m).not.toBeNull();
    for (const name of ['Lora', 'Sara', 'Julia']) expect(m![1]).toContain(name);
  });
});
