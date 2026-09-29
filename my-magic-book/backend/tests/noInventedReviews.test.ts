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
