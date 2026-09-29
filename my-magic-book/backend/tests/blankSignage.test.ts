import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * No scene prompt may ask for a BLANK sign.
 *
 * Telling an image model "every sign is completely BLANK and unlettered" does
 * not remove the sign. It removes the letters and leaves the board: a flat
 * white rectangle nailed to the wall, which is worse than a sign with writing
 * on it because a reader cannot explain it away.
 *
 * It has been found and paid for three times now. The last time, the fix was
 * applied to the thirteen page prompts of three new stories and not to their
 * covers, so the covers kept producing white panels and nobody noticed until a
 * cover was about to go in front of customers — and jerusalem_tale's pages were
 * re-rolled twenty-four images at a time against wording that had never been
 * corrected at all. That bill is the reason this file exists.
 *
 * The working phrasing forbids the OBJECT and then says what is really there:
 *   "NO signboards, NO painted lettering and NO labels anywhere — not blank
 *    ones either. Crates are plain bare wood ... Never a white panel or an
 *    empty sign."
 */

const FILE = path.resolve(__dirname, '../src/services/sceneTemplates.ts');

/** Phrasings that describe a surface as blank instead of absent. */
const ASKS_FOR_BLANK = [
  /BLANK and unlettered/i,
  /is completely blank/i,
  /are completely blank/i,
  /blank sign/i,
  /empty signboard/i,
];

describe('scene prompts never ask for a blank sign', () => {
  const src = fs.readFileSync(FILE, 'utf8');

  for (const pattern of ASKS_FOR_BLANK) {
    it(`contains no ${pattern}`, () => {
      const hit = src.match(pattern);
      expect(
        hit,
        `"${hit?.[0]}" tells the model to draw a blank surface, which renders as a white ` +
          `rectangle. Forbid the object instead and say what is really there — see the ` +
          `"Never a white panel or an empty sign" wording used elsewhere in this file.`,
      ).toBeNull();
    });
  }

  it('still forbids signage the way that actually works', () => {
    // If this drops to zero someone has removed the guardrail wholesale.
    const good = src.match(/Never a white panel/g) || [];
    expect(good.length).toBeGreaterThan(40);
  });
});
