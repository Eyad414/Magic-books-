import { describe, it, expect } from 'vitest';
import { DELIVERY_FEE_ILS as SERVER_FEE, priceOrder } from '../src/services/Pricing';
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
