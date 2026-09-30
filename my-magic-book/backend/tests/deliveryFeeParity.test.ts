import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DELIVERY_FEE_ILS as SERVER_FEE, priceOrder } from '../src/services/Pricing';
import { DEFAULT_COUPONS } from '../src/models/SiteSettings';
import { DELIVERY_FEE_ILS as CLIENT_FEE } from '../../frontend/src/config/delivery';

/**
 * The number the checkout quotes and the number the server charges.
 *
 * These live in two codebases and the fee was written out by hand in three
 * places — Pricing.ts, useCheckoutTotals.ts and Step3_Checkout.tsx. Changing
 * the fee meant changing all three and noticing none were missed, and the
 * failure mode is the worst one this flow has: the customer is shown one total
 * and billed another.
 *
 * The frontend now has a single constant, and this pins it to the server's.
 */

describe('delivery fee', () => {
  it('is the same on both sides', () => {
    expect(CLIENT_FEE).toBe(SERVER_FEE);
  });

  it('is zero — the book price is the whole price', () => {
    // Owner's decision, 2026-09-29. If this is ever reversed, both constants
    // and the copy that says "no extra charge" have to move together.
    expect(SERVER_FEE).toBe(0);
  });

  it('a printed book delivered to the door costs exactly its package price', () => {
    const p = priceOrder({
      basePrice: 130,
      bookPackage: 'color',
      deliveryMethod: 'delivery',
      coupon: null,
    });
    expect(p.total).toBe(130);
    expect(p.deliveryFee).toBe(0);
  });
});


/**
 * A code that says "applied" and takes nothing off.
 *
 * FANOOS was seeded as type freeDelivery. The moment delivery went free that
 * coupon became worth zero — it still validated, still showed the customer a
 * green "code accepted", and still deducted 0 ₪. That is worse than a rejected
 * code, because the customer believes they got a discount.
 *
 * So while the fee is zero, no shipped default may be a freeDelivery code.
 * (The live coupon list lives in the database and is the owner's to edit; this
 * only guards what a fresh install starts with.)
 */
describe('seeded coupons are worth something', () => {
  it('ships no freeDelivery code while delivery is already free', () => {
    const dead = DEFAULT_COUPONS.filter((c) => c.active && c.type === 'freeDelivery');
    expect(
      SERVER_FEE > 0 ? [] : dead.map((c) => c.code),
      'these codes waive a fee of 0 — they would apply, say "accepted", and discount nothing',
    ).toEqual([]);
  });

  it('every active default actually reduces the total', () => {
    for (const c of DEFAULT_COUPONS.filter((x) => x.active)) {
      const p = priceOrder({ basePrice: 130, bookPackage: 'color', deliveryMethod: 'delivery', coupon: c as any });
      expect(p.total, `${c.code} takes nothing off a 130 ILS book`).toBeLessThan(130);
    }
  });
});

/**
 * The bundle's saving, derived rather than typed.
 *
 * باقة Pro is 170 ₪ and its own description says "all versions (colour +
 * colouring + digital)" — 230 ₪ bought separately. The wizard never said so,
 * and Pro has not once been bought by a real customer while its three parts
 * have. usePackages now derives the comparison, so it stays true when any of
 * the three prices changes and cannot become an invented "was".
 */
describe('Pro bundle saving', () => {
  it('is the real sum of its parts, not a number someone typed', async () => {
    const src = await import('fs').then((fs) =>
      fs.readFileSync(
        require('path').resolve(__dirname, '../../frontend/src/hooks/usePackages.ts'),
        'utf8',
      ),
    );
    // Derived from the live rows...
    expect(src).toMatch(/\['color', 'coloring', 'ebook'\]/);
    // ...and only when it genuinely beats Pro, so it can never advertise a
    // discount off a lower number.
    expect(src).toMatch(/if \(separately > pro\.price\)/);
    // ...and only when all three parts have a real price.
    expect(src).toMatch(/parts\.length === 3/);
  });
});

/**
 * A struck-through price must be a real one.
 *
 * `originalPrice` renders as a "was" price beside the live one, on the home
 * page, the stories header, step 2 and checkout. It is the easiest thing on the
 * site to turn into a lie — an inflated number nobody was ever charged — so
 * usePackages only passes it through when it is genuinely higher than the price
 * being charged, and drops it otherwise.
 *
 * It also has to exist in the schema to survive a save. It did not: the
 * frontend read it for a long time while SiteSettings had no such field, so
 * mongoose dropped it on every write and setting a sale price in the dashboard
 * looked like it worked and silently did nothing.
 */
describe('sale prices', () => {
  const model = fs.readFileSync(path.resolve(__dirname, '../src/models/SiteSettings.ts'), 'utf8');
  const hook = fs.readFileSync(
    path.resolve(__dirname, '../../frontend/src/hooks/usePackages.ts'),
    'utf8',
  );

  it('the schema can actually store a was-price', () => {
    expect(model, 'without this mongoose drops it and the sale never saves')
      .toMatch(/originalPrice:\s*\{\s*type:\s*Number/);
  });

  it('a was-price is only shown when it beats the live price', () => {
    expect(hook).toMatch(/was\s*&&\s*price\s*!==\s*null\s*&&\s*was\s*>\s*price/);
  });
});
