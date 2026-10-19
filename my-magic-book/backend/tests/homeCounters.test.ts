import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { displayCount } from '../../frontend/src/hooks/useSiteStats';

/**
 * The home page counters: bigger, and still true.
 *
 * The owner asked for big numbers. The real ones were small (45 stories
 * started, 14 children), and invented ones are not an option, so the hero now
 * counts things that genuinely are large — illustrations in books and books
 * with artwork — and rounds them the way shops do, but only ever DOWN.
 */
describe('displayCount', () => {
  it('rounds large counts down, never up', () => {
    expect(displayCount(1595)).toBe('+1,500');
    expect(displayCount(108)).toBe('+100');
    expect(displayCount(1500)).toBe('1,500');
    for (let n = 0; n < 5000; n += 7) {
      const shown = Number(displayCount(n).replace(/[+,]/g, ''));
      expect(shown, `n=${n}`).toBeLessThanOrEqual(n);
    }
  });

  it('keeps small counts exact', () => {
    expect(displayCount(34)).toBe('34');
    expect(displayCount(3)).toBe('3');
  });

  it('shows a figure the owner typed exactly as typed', () => {
    expect(displayCount('+2,000')).toBe('+2,000');
  });

  it('shows a dash rather than a guess when the count is missing', () => {
    expect(displayCount(null)).toBe('—');
    expect(displayCount(undefined)).toBe('—');
  });
});

describe('what the counters count', () => {
  const ctrl = fs.readFileSync(path.join(__dirname, '../src/controllers/adminController.ts'), 'utf8');
  it('counts book pictures only — not thumbnails, not unpublished proofs', () => {
    const re = /\/page-\\d\+\\\.png\$/;
    expect(ctrl).toMatch(re);
    expect(ctrl).toContain("!p.includes('/proof_')");
  });
  it('the home page shows pictures and illustrated books', () => {
    const hero = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/home/HeroSection.tsx'), 'utf8');
    expect(hero).toContain('stats.pictures');
    expect(hero).toContain('stats.illustratedBooks');
  });
});
