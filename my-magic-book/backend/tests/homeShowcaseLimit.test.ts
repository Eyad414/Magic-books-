import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { homeTagRank } from '../../frontend/src/data/showcaseCards';

/**
 * The dashboard must promise what the home page does.
 *
 * BestSellers sorts the owner's picks by badge and then slices the list, so
 * ticking ten books puts four on the site and silently drops six. The showcase
 * panel just printed "10" — the owner had no way to see that most of what they
 * ticked never appears, or which four won.
 *
 * The panel now previews the cut, which only stays true while both screens use
 * the SAME number and the SAME order. Two literals in two files is exactly how
 * that goes wrong, so they live in showcaseCards.ts and this checks nobody has
 * quietly reintroduced a local copy.
 */

const FRONTEND = path.resolve(__dirname, '../../frontend/src');
const read = (p: string) => fs.readFileSync(path.join(FRONTEND, p), 'utf8');

const cards = read('data/showcaseCards.ts');
const bestSellers = read('components/home/BestSellers.tsx');
const admin = read('pages/AdminDashboard.tsx');

describe('the home-page cut is defined once', () => {
  it('showcaseCards exports the limit and the order', () => {
    expect(cards).toMatch(/export const HOME_CARD_LIMIT = \d+;/);
    expect(cards).toMatch(/export function homeTagRank\(/);
  });

  it('the home page slices by the shared limit, not a literal', () => {
    expect(bestSellers).toContain('HOME_CARD_LIMIT');
    expect(
      bestSellers,
      'BestSellers slices by a hardcoded number again — the dashboard preview will lie',
    ).not.toMatch(/\.slice\(0,\s*\d+\)/);
  });

  it('the home page orders by the shared rank, not its own table', () => {
    expect(bestSellers).toContain('homeTagRank');
    expect(
      bestSellers,
      'BestSellers has its own badge order again, so the preview can pick different books',
    ).not.toMatch(/TAG_ORDER/);
  });

  it('the dashboard previews with the same limit and order', () => {
    expect(admin).toContain('HOME_CARD_LIMIT');
    expect(admin).toContain('homeTagRank');
  });

  it('both import them from the one place', () => {
    for (const [name, src] of [['BestSellers', bestSellers], ['AdminDashboard', admin]] as const) {
      const imports = src.split('\n').filter((l) => l.includes('showcaseCards'));
      expect(imports.join(' '), `${name} does not import from showcaseCards`).toContain('HOME_CARD_LIMIT');
    }
  });
});

describe('homeTagRank', () => {
  it('puts the badges in the order the home page shows them', () => {
    expect(homeTagRank('new')).toBeLessThan(homeTagRank('bestseller'));
    expect(homeTagRank('bestseller')).toBeLessThan(homeTagRank('featured'));
    expect(homeTagRank('featured')).toBeLessThan(homeTagRank(''));
  });

  it('treats an untagged book as last, never as first', () => {
    // An untagged book sorting first would push a badged one off the page.
    for (const tag of ['new', 'bestseller', 'featured']) {
      expect(homeTagRank(undefined)).toBeGreaterThan(homeTagRank(tag as any));
      expect(homeTagRank(null)).toBeGreaterThan(homeTagRank(tag as any));
    }
  });
});
