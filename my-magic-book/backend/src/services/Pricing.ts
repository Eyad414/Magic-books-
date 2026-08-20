import SiteSettings, { DEFAULT_COUPONS, type ICoupon } from '../models/SiteSettings';

export const DELIVERY_FEE_ILS = 30;
/** Packages that are files, not parcels. */
const DIGITAL = new Set(['ebook', 'audio']);

/**
 * What an order actually costs.
 *
 * The browser used to work this out on its own: it showed 50% off and then the
 * server charged full price, because the coupon never travelled with the order.
 * Every number a customer is charged is decided here, from the package price in
 * the database and a coupon looked up by code.
 */
export async function resolveCoupon(code?: string): Promise<ICoupon | null> {
  const wanted = String(code || '').trim().toUpperCase();
  if (!wanted) return null;
  const settings = await SiteSettings.findOne();
  const list: ICoupon[] = (settings?.coupons?.length ? settings.coupons : DEFAULT_COUPONS) as ICoupon[];
  return list.find((c) => c.active && String(c.code).toUpperCase() === wanted) || null;
}

export interface PriceBreakdown {
  basePrice: number;
  discount: number;
  deliveryFee: number;
  total: number;
  couponCode?: string;
}

export function priceOrder(opts: {
  basePrice: number;
  bookPackage?: string;
  deliveryMethod?: string;
  coupon?: ICoupon | null;
}): PriceBreakdown {
  const { basePrice, bookPackage, deliveryMethod, coupon } = opts;
  const percent = coupon?.type === 'percent' ? coupon.value : 0;
  const discount = percent ? Math.round(basePrice * (percent / 100)) : 0;

  const noParcel = DIGITAL.has(String(bookPackage)) || deliveryMethod === 'pickup';
  const deliveryWaived = noParcel || coupon?.type === 'freeDelivery';
  const deliveryFee = deliveryWaived ? 0 : DELIVERY_FEE_ILS;

  return {
    basePrice,
    discount,
    deliveryFee,
    total: Math.max(0, basePrice - discount) + deliveryFee,
    couponCode: coupon?.code,
  };
}
