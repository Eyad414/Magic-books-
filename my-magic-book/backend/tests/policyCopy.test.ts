import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Legal text must not be able to vanish quietly.
 *
 * Policy.tsx renders most clauses by splitting the string on a colon and
 * printing the halves: `t(key).split(':')[0]` as a bold lead-in and
 * `.split(':')[1]` as the clause. That works today — every clause in all three
 * languages has exactly one colon — but it is one careless edit from failing
 * silently in either direction:
 *
 *   no colon   -> [1] is undefined, React renders nothing, the clause is gone
 *   two colons -> everything after the second colon is dropped
 *
 * Nothing would show an error. The page would simply be missing a promise the
 * shop makes, on the page a customer reads precisely when they are deciding
 * whether to trust it — or, worse, missing the half of a sentence that limits
 * it.
 *
 * Also pinned: the refund clauses themselves. They cite Israeli consumer law
 * and are the shop's actual obligations, so the test fails if a key disappears
 * rather than letting the page render a blank section.
 */

const LOCALES = ['ar', 'en', 'he'];

/** Keys Policy.tsx renders via .split(':') — both halves are displayed. */
const SPLIT_RENDERED = [
  'privacy_content_2', 'privacy_content_3', 'privacy_content_4',
  'terms_content_1', 'terms_content_2', 'terms_content_3',
  'terms_content_4', 'terms_content_5', 'terms_content_6',
  'refund_content_2', 'refund_content_3', 'refund_content_4', 'refund_content_5',
];

/** Sections the page links to and renders; a missing title is a dead anchor. */
const SECTION_TITLES = [
  'privacy_title', 'terms_title', 'refund_title',
  'shipping_title', 'payment_title', 'data_deletion_title',
];

function policy(lng: string): Record<string, string> {
  const file = path.resolve(__dirname, `../../frontend/src/locales/${lng}/translation.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')).policy;
}

describe('policy copy survives rendering', () => {
  for (const lng of LOCALES) {
    const p = policy(lng);

    for (const key of SPLIT_RENDERED) {
      it(`${lng}.${key} has exactly one colon`, () => {
        const value = p[key];
        expect(value, `${key} is missing — the page would render an empty clause`).toBeTruthy();
        const colons = (value.match(/:/g) || []).length;
        expect(
          colons,
          colons === 0
            ? 'no colon: split(":")[1] is undefined and the whole clause disappears'
            : 'more than one colon: everything after the second is silently dropped',
        ).toBe(1);
      });
    }

    for (const key of SECTION_TITLES) {
      it(`${lng}.${key} exists for its anchor`, () => {
        expect(p[key], 'the section nav links to this; an empty title is a dead link').toBeTruthy();
      });
    }
  }
});
