import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The shop does not claim reviews it has not received.
 *
 * Found twice in one day, both shipped to customers:
 *
 *   /stories  — a star score per card, `[5.0, 4.9, 4.8][idx % 3]`, so every
 *               book showed a rating and the same three repeated down the grid.
 *   home page — `rating: 4.9, reviews: 128` and three more like it, hardcoded
 *               in the bestsellers array. Worse, every card spreads that array
 *               by index, so genuinely published books inherited them: 359
 *               reviews claimed by a shop with four real customer purchases.
 *
 * A number a customer can believe is a promise. This fails the build on the
 * shapes both bugs took, in the two components that show product cards.
 */

const FRONTEND = path.resolve(__dirname, '../../frontend/src');
const FILES = [
  'components/home/BestSellers.tsx',
  'pages/Stories.tsx',
  'components/home/WhatYouGet.tsx',
];

describe('no invented ratings or review counts', () => {
  for (const rel of FILES) {
    const src = fs.readFileSync(path.join(FRONTEND, rel), 'utf8');

    it(`${rel} declares no review count`, () => {
      expect(src, 'a literal review count is a fabricated review').not.toMatch(/reviews:\s*\d+/);
    });

    it(`${rel} declares no star rating`, () => {
      expect(src, 'a literal rating is a fabricated review').not.toMatch(/rating:\s*\d/);
    });

    it(`${rel} does not deal ratings out of an array`, () => {
      // The /stories shape: a list of scores indexed by position.
      expect(src).not.toMatch(/\[\s*[45]\.\d\s*,\s*[45]\.\d/);
    });
  }
});


/**
 * ...and not in the copy either.
 *
 * The third one hid where the checks above could not see it. "Rated 5/5 by over
 * 100 families" was not in a component at all — it sat in
 * locales/{ar,en,he}/translation.json as about.rating_text, rendered under five
 * gold stars on the About page, in three languages, on a shop with four real
 * customer purchases.
 *
 * A guard that only reads .tsx files would have passed that forever. So this
 * reads the copy.
 */
describe('no invented reviews in the copy', () => {
  const LOCALES = ['ar', 'en', 'he'];

  /** Claims of a score, or of a count of people who gave one. */
  const CLAIMS: { name: string; re: RegExp }[] = [
    { name: 'a x/5 or x/10 score', re: /\b[45](?:[.,]\d)?\s*\/\s*(?:5|10)\b/ },
    { name: 'N families / customers / reviews', re: /\d{2,}\s*(?:families|عائلة|عائلات|משפחות|reviews|تقييم|ביקורות|customers|عميل|לקוחות)/i },
    { name: 'a star count', re: /\b(?:five|5)[- ]star\b/i },
  ];

  for (const lng of LOCALES) {
    const file = path.resolve(__dirname, `../../frontend/src/locales/${lng}/translation.json`);
    const raw = fs.readFileSync(file, 'utf8');

    for (const { name, re } of CLAIMS) {
      it(`${lng} copy makes no claim of ${name}`, () => {
        const lines = raw.split('\n').filter((l) => re.test(l));
        expect(
          lines.map((l) => l.trim().slice(0, 90)),
          'the shop does not have reviews yet; saying it does is a promise it cannot keep',
        ).toEqual([]);
      });
    }
  }
});
