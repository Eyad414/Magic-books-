import { describe, it, expect } from 'vitest';
import { priceOrder, DELIVERY_FEE_ILS } from '../src/services/Pricing';

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
});
