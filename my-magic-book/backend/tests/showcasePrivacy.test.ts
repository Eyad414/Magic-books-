import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * A real child's face never reaches a public page by default — and a finished
 * book never stays invisible because nobody wrote it a card.
 *
 * Two failures, one file.
 *
 * PRIVACY. Four girl books — دبكة, يوم في يافا, درس العود, حكاية في القدس —
 * were drawn from Lora's own photograph and had to wait on her family. Two ways
 * that went wrong before, both recorded in showcaseCards.ts:
 *   - privacy was inferred from the DISPLAYED NAME, so renaming a card to an
 *     invented name published the child's face while only the label changed;
 *   - the private check existed on the Stories page and not the home page, so
 *     a card pulled from one carried on sitting on the other.
 * This used to assert that those four themes were private, which was a fact
 * about the artwork of the day rather than a rule. All four were re-shot from
 * Baha's photo, the fact stopped being true, and a test that states a fact
 * instead of a rule has to be either edited or deleted the moment the world
 * moves — so it now asserts the rule: a card NAMING a private child must be
 * flagged, whatever its theme.
 *
 * VISIBILITY. The Stories page renders SHOWCASE_CARDS, not the themes, so a
 * story with no card is invisible however ready it is. little_vet was finished,
 * published and re-shot, and had no card at all — the owner went looking for it
 * and could not find it. Every story with a scene template needs a card, and a
 * deliberate omission has to be written down here rather than just happening.
 */

const CARDS = path.resolve(__dirname, '../../frontend/src/data/showcaseCards.ts');
const TEMPLATES = path.resolve(__dirname, '../src/services/sceneTemplates.ts');
const src = fs.readFileSync(CARDS, 'utf8');

interface Card { key: string; themeId: string; name: string; private: boolean; line: string }

/** The card rows, read as data rather than matched line by line. */
function cards(): Card[] {
  const out: Card[] = [];
  for (const line of src.split('\n')) {
    const key = line.match(/key:\s*'([^']+)'/);
    const themeId = line.match(/themeId:\s*'([^']+)'/);
    const name = line.match(/name:\s*'([^']+)'/);
    if (!key || !themeId || !name) continue;
    out.push({
      key: key[1], themeId: themeId[1], name: name[1],
      private: /private:\s*true/.test(line), line: line.trim(),
    });
  }
  return out;
}

function privateNames(): string[] {
  const m = src.match(/PRIVATE_DEMO_CHILDREN = new Set\(\[([^\]]*)\]/);
  expect(m, 'PRIVATE_DEMO_CHILDREN is gone').not.toBeNull();
  return [...m![1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

/**
 * Stories with no card ON PURPOSE. Both alphabet books are unfinished drafts
 * the owner has never published; they get a card when they are ready. Anything
 * else missing is the little_vet mistake happening again.
 */
const NO_CARD_ON_PURPOSE = new Set(['alphabet_ar', 'alphabet_abc']);

describe('a real child is never published by accident', () => {
  it('finds cards to check', () => {
    expect(cards().length).toBeGreaterThan(20);
  });

  it('flags every card that names a child we may not publish', () => {
    const names = privateNames();
    const unflagged = cards().filter((c) => names.includes(c.name) && !c.private);
    expect(
      unflagged.map((c) => c.line),
      "this card names a child from PRIVATE_DEMO_CHILDREN and would go public without private: true",
    ).toEqual([]);
  });

  it('still gates on the flag OR the name, so neither alone can be forgotten', () => {
    expect(src).toMatch(/card\.private === true \|\| PRIVATE_DEMO_CHILDREN\.has\(card\.name\)/);
  });

  it('keeps Lora, Sara and Julia in the private set', () => {
    for (const name of ['Lora', 'Sara', 'Julia']) expect(privateNames()).toContain(name);
  });

  it('never lets the home page publish what the stories page would not', () => {
    // demoOnHomePage must refuse a private card outright, not just rely on the
    // owner having unticked it — this is the bug that left the space colouring
    // card on the front page after it was pulled from /stories.
    const home = src.slice(src.indexOf('export function demoOnHomePage'));
    expect(home.slice(0, 300)).toMatch(/if \(isPrivateCard\(card\)\) return false;/);
  });
});

describe('a finished story is never invisible', () => {
  const templates = [...fs.readFileSync(TEMPLATES, 'utf8').matchAll(/^  ([a-z0-9_]+): \{/gm)]
    .map((m) => m[1])
    // `opts: {` is the buildScenePrompt signature, not a story.
    .filter((id) => id !== 'opts');

  it('finds the story templates', () => {
    expect(templates.length).toBeGreaterThan(20);
  });

  it('gives every story a showcase card, or says why not', () => {
    const carded = new Set(cards().map((c) => c.themeId));
    const orphans = templates.filter((id) => !carded.has(id) && !NO_CARD_ON_PURPOSE.has(id));
    expect(
      orphans,
      `these stories exist but have no card, so /stories cannot show them however ` +
        `ready they are: ${orphans.join(', ')}. Add a card, or list it in ` +
        `NO_CARD_ON_PURPOSE with the reason.`,
    ).toEqual([]);
  });

  it('keeps the exemption list honest', () => {
    // An exemption for a story that no longer exists hides the next real gap.
    const stale = [...NO_CARD_ON_PURPOSE].filter((id) => !templates.includes(id));
    expect(stale, `exempted but no longer a story: ${stale.join(', ')}`).toEqual([]);
  });
});
