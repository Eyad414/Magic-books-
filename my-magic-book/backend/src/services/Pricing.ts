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
  const found = list.find((c) => c.active && String(c.code).toUpperCase() === wanted) || null;
  // A used-up code prices like no code at all, everywhere: the checkout quote,
  // the order total and the entry box all go through here.
  return found && couponExhausted(found) ? null : found;
}

/** True when a limited code has been used up. Unlimited codes never are. */
export function couponExhausted(c: ICoupon): boolean {
  const max = Number(c.maxUses) || 0;
  return max > 0 && (Number(c.usedCount) || 0) >= max;
}

/**
 * Claim one use of a coupon, atomically.
 *
 * Read-then-write would let two people checking out at the same moment both
 * take the last use of a one-shot code. The update therefore requires the
 * counter to still hold the value we read; if somebody else moved it first the
 * write matches nothing and we look again. Three attempts is generous for a
 * shop this size and guarantees the loop ends.
 *
 * Every code is counted, limited or not, so the owner can see which of them
 * people actually use.
 */
export async function claimCouponUse(code?: string): Promise<{ ok: boolean; reason?: 'missing' | 'exhausted' | 'busy' }> {
  const wanted = String(code || '').trim().toUpperCase();
  if (!wanted) return { ok: true };

  for (let attempt = 0; attempt < 3; attempt++) {
    const settings = await SiteSettings.findOne().lean();
    const list: ICoupon[] = (settings?.coupons?.length ? settings.coupons : DEFAULT_COUPONS) as ICoupon[];
    const c = list.find((x) => x.active && String(x.code).toUpperCase() === wanted);
    if (!c) return { ok: false, reason: 'missing' };
    if (couponExhausted(c)) return { ok: false, reason: 'exhausted' };

    // The defaults list is code-only, not stored — nothing to count against.
    if (!settings?.coupons?.length) return { ok: true };

    const used = Number(c.usedCount) || 0;
    // A coupon saved before this field existed has no usedCount at all, and
    // { usedCount: 0 } does not match a missing field in MongoDB.
    const seen: any = used === 0 ? { $or: [{ usedCount: 0 }, { usedCount: { $exists: false } }] } : { usedCount: used };
    const r = await SiteSettings.updateOne(
      { coupons: { $elemMatch: { code: c.code, ...seen } } },
      { $inc: { 'coupons.$.usedCount': 1 } },
    );
    if (r.modifiedCount === 1) return { ok: true };
  }
  return { ok: false, reason: 'busy' };
}

/** Give a use back when the order it was claimed for could not be created. */
export async function releaseCouponUse(code?: string): Promise<void> {
  const wanted = String(code || '').trim().toUpperCase();
  if (!wanted) return;
  await SiteSettings.updateOne(
    { coupons: { $elemMatch: { code: wanted, usedCount: { $gt: 0 } } } },
    { $inc: { 'coupons.$.usedCount': -1 } },
  ).catch(() => { /* a stuck count is better than a thrown checkout */ });
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
  // Clamped: a coupon saved as 150 must not invent money back, and a negative
  // one must not quietly add to the bill.
  const percent = coupon?.type === 'percent' ? Math.min(100, Math.max(0, coupon.value)) : 0;
  const discount = percent ? Math.round(basePrice * (percent / 100)) : 0;

  // "100% off" has to mean free. Charging delivery on top of a coupon that
  // says the order costs nothing is the kind of surprise that loses the
  // customer at the last screen — and a giveaway is not a giveaway if the
  // winner is asked for 30 ₪ at the door.
  const fullyFree = percent >= 100;
  const noParcel = DIGITAL.has(String(bookPackage)) || deliveryMethod === 'pickup';
  const deliveryWaived = noParcel || fullyFree || coupon?.type === 'freeDelivery';
  const deliveryFee = deliveryWaived ? 0 : DELIVERY_FEE_ILS;

  return {
    basePrice,
    discount,
    deliveryFee,
    total: Math.max(0, basePrice - discount) + deliveryFee,
    couponCode: coupon?.code,
  };
}
