import { describe, it, expect } from 'vitest';
import { priceOrder, DELIVERY_FEE_ILS, couponExhausted } from '../src/services/Pricing';

const percent = (value: number) => ({ code: 'X', type: 'percent' as const, value, active: true });
const freeDelivery = { code: 'FANOOS', type: 'freeDelivery' as const, value: 0, active: true };

describe('priceOrder', () => {
  it('charges the package price plus delivery when no code is used', () => {
    const p = priceOrder({ basePrice: 130, bookPackage: 'color', deliveryMethod: 'delivery', coupon: null });
    expect(p).toMatchObject({ discount: 0, deliveryFee: DELIVERY_FEE_ILS, total: 160 });
  });

  it('takes the percentage off the book, not off the delivery', () => {
    const p = priceOrder({ basePrice: 130, bookPackage: 'color', deliveryMethod: 'delivery', coupon: percent(50) });
    expect(p.discount).toBe(65);
    expect(p.deliveryFee).toBe(DELIVERY_FEE_ILS);
    expect(p.total).toBe(95);
  });

  it('waives delivery for the free-delivery code and leaves the book alone', () => {
    const p = priceOrder({ basePrice: 130, bookPackage: 'color', deliveryMethod: 'delivery', coupon: freeDelivery });
    expect(p).toMatchObject({ discount: 0, deliveryFee: 0, total: 130 });
  });

  it('never charges delivery on a file or a pickup', () => {
    expect(priceOrder({ basePrice: 40, bookPackage: 'ebook', deliveryMethod: 'delivery', coupon: null }).deliveryFee).toBe(0);
    expect(priceOrder({ basePrice: 130, bookPackage: 'color', deliveryMethod: 'pickup', coupon: null }).deliveryFee).toBe(0);
  });

  it('cannot be talked into a negative price', () => {
    const p = priceOrder({ basePrice: 40, bookPackage: 'ebook', deliveryMethod: 'pickup', coupon: percent(150) });
    expect(p.total).toBe(0);
  });

  it('records which code was used, so an order can be explained later', () => {
    expect(priceOrder({ basePrice: 130, coupon: percent(20) }).couponCode).toBe('X');
    expect(priceOrder({ basePrice: 130, coupon: null }).couponCode).toBeUndefined();
  });

  it('a 100% coupon makes the order free, delivery included', () => {
    const p = priceOrder({
      basePrice: 130,
      bookPackage: 'color',
      deliveryMethod: 'delivery',
      coupon: { code: 'FREE', type: 'percent', value: 100, active: true },
    });
    expect(p.discount).toBe(130);
    // The point of the rule: a giveaway must not ask for 30 ILS at the door.
    expect(p.deliveryFee).toBe(0);
    expect(p.total).toBe(0);
  });

  it('clamps a coupon saved above 100 instead of paying the customer', () => {
    const p = priceOrder({
      basePrice: 130,
      bookPackage: 'color',
      deliveryMethod: 'delivery',
      coupon: { code: 'OOPS', type: 'percent', value: 150, active: true },
    });
    expect(p.total).toBe(0);
    expect(p.discount).toBe(130);
  });

  it('a 99% coupon still charges delivery — only 100 means free', () => {
    const p = priceOrder({
      basePrice: 130,
      bookPackage: 'color',
      deliveryMethod: 'delivery',
      coupon: { code: 'NEARLY', type: 'percent', value: 99, active: true },
    });
    expect(p.deliveryFee).toBe(DELIVERY_FEE_ILS);
  });

  it('a limited coupon is exhausted once it hits its cap', () => {
    expect(couponExhausted({ code: 'X', type: 'percent', value: 100, active: true, maxUses: 1, usedCount: 0 })).toBe(false);
    expect(couponExhausted({ code: 'X', type: 'percent', value: 100, active: true, maxUses: 1, usedCount: 1 })).toBe(true);
    // Over the cap counts as exhausted too, not as "one more left".
    expect(couponExhausted({ code: 'X', type: 'percent', value: 100, active: true, maxUses: 2, usedCount: 5 })).toBe(true);
  });

  it('an unlimited coupon is never exhausted, however often it is used', () => {
    expect(couponExhausted({ code: 'X', type: 'percent', value: 20, active: true, maxUses: 0, usedCount: 999 })).toBe(false);
    // Codes saved before the field existed have neither number.
    expect(couponExhausted({ code: 'X', type: 'percent', value: 20, active: true } as any)).toBe(false);
  });
});
