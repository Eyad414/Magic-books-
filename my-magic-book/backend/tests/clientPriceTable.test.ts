import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The shop must not carry its own price list.
 *
 * The wizard used to keep a hard-coded "sensible fallback" price table on three
 * separate screens, and every one of them had drifted from the dashboard: a
 * colour story was quoted at 60 ₪ while orderController priced the same order at
 * 130 ₪ from settings.bookPackages. The fallback rendered on every page load
 * before the settings request came back, and stayed for good if that request
 * failed — so the cheap number was the first thing a customer saw, on exactly
 * the flaky mobile connections the shop's traffic arrives on.
 *
 * Prices belong to the server. This test fails the build if a literal price
 * creeps back into a customer-facing price surface.
 */

const FRONTEND = path.resolve(__dirname, '../../frontend/src');

/** Files allowed to talk about prices at all — the wizard and the pricing hooks. */
const PRICE_SURFACES = [
  'components/wizard/Step2_AI_Generator.tsx',
  'components/wizard/Step3_Checkout.tsx',
  'components/wizard/Step4_Payment.tsx',
  'hooks/useCheckoutTotals.ts',
  'hooks/usePackages.ts',
];

function read(rel: string): string {
  return fs.readFileSync(path.join(FRONTEND, rel), 'utf8');
}

/** Strip comments so prose explaining the old bug is not mistaken for code. */
function code(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

describe('the client never hard-codes a price', () => {
  for (const rel of PRICE_SURFACES) {
    it(`${rel} declares no price literal`, () => {
      const src = code(read(rel));
      // `price: 60`, `price = 60`, `originalPrice: 140` — any literal money
      // assigned to a price field.
      const hits = src.match(/\b(original)?[Pp]rice\s*[:=]\s*\d+/g) || [];
      expect(hits, `remove these — prices come from the server: ${hits.join(', ')}`).toEqual([]);
    });
  }

  it('usePackages ships a catalogue with no prices in it', () => {
    const src = code(read('hooks/usePackages.ts'));
    const catalogue = src.slice(src.indexOf('const CATALOGUE'), src.indexOf('] as const'));
    // No price field, and no money-sized literal. (A translation key like
    // `step3.pkg_color` carries a digit, so match standalone numbers only.)
    expect(catalogue).not.toMatch(/price/i);
    expect(catalogue).not.toMatch(/\b\d{2,}\b/);
    // and every entry still names a package the server knows
    for (const id of ['color', 'coloring', 'ebook', 'pro']) {
      expect(catalogue).toContain(`id: '${id}'`);
    }
  });

  it('the pay button and the checkout handler both wait for real prices', () => {
    const pay = read('components/wizard/Step4_Payment.tsx');
    expect(pay).toContain('disabled={!pricesReady}');
    // the handler refuses too, so a click that bypasses the disabled state
    // cannot create an order against a price nobody quoted
    expect(code(pay)).toMatch(/handleCheckout\s*=\s*async[^{]*\{\s*if\s*\(!pricesReady\)/);
  });

  it('every price surface reads the shared hook', () => {
    for (const rel of PRICE_SURFACES) {
      if (rel.endsWith('usePackages.ts')) continue;
      const src = read(rel);
      expect(src, `${rel} must get packages from usePackages/useCheckoutTotals`)
        .toMatch(/usePackages|useCheckoutTotals/);
    }
  });
});
