import { usePackages } from './usePackages';

/**
 * The package the customer chose and what it costs.
 *
 * Shared by the details step and the payment step. Those are two screens now,
 * and the price shown on one has to be the price charged on the other — keeping
 * a second copy of this arithmetic in the payment step is how they drift.
 */
export interface CheckoutTotals {
  packages: any[];
  selectedPkg: any;
  /** The chosen package no longer exists (hidden in the dashboard since). */
  pkgUnavailable: boolean;
  isDigital: boolean;
  basePrice: number;
  discountedBase: number;
  deliveryFee: number;
  totalPrice: number;
  liveSettings: any;
  /** Every number below is one the server will honour. */
  pricesReady: boolean;
  /** Pricing could not be loaded — show that, don't invent a total. */
  pricesFailed: boolean;
  retryPrices: () => void;
}

export function useCheckoutTotals(opts: {
  bookPackage?: string;
  isPickup: boolean;
  discount?: number;
  couponApplied?: boolean;
  couponType?: 'percent' | 'freeDelivery';
  /** Set when the code only works on one package, e.g. a birthday e-book gift. */
  couponOnlyPackage?: string | null;
}): CheckoutTotals {
  const { packages, pricesReady, pricesFailed, retryPrices, liveSettings } = usePackages();

  const matchedPkg = packages.find((p: any) => p.id === opts.bookPackage);
  const selectedPkg = matchedPkg || packages[0];
  const pkgUnavailable = !!opts.bookPackage && !matchedPkg;

  const isDigital = selectedPkg?.id === 'audio' || selectedPkg?.id === 'ebook';
  // 0 would render as a free book; the caller is told not to show a total at
  // all until pricesReady.
  const basePrice = selectedPkg?.price ?? 0;
  // A code tied to one package does nothing on any other — the same rule the
  // server prices by. Without this a birthday e-book gift quoted a printed
  // book at 0 ILS and the server then charged full price.
  const wrongPackage = !!opts.couponOnlyPackage && String(opts.couponOnlyPackage) !== String(selectedPkg?.id || '');
  const couponLive = !!opts.couponApplied && !wrongPackage;

  // Clamped for the same reason the server clamps: a coupon saved as 150 must
  // not show money owed back to the customer.
  const percent = couponLive ? Math.min(100, Math.max(0, opts.discount || 0)) : 0;
  const discountedBase = couponLive ? Math.round(basePrice * (1 - percent / 100)) : basePrice;
  // Mirrors priceOrder on the server: 100% off means free, delivery included,
  // and a free-delivery coupon waives the fee on its own. If these two ever
  // disagree the customer is quoted one number and charged another.
  const fullyFree = couponLive && opts.couponType !== 'freeDelivery' && percent >= 100;
  const couponFreeDelivery = couponLive && opts.couponType === 'freeDelivery';
  const deliveryFee = isDigital || opts.isPickup || fullyFree || couponFreeDelivery ? 0 : 30;

  return {
    packages, selectedPkg, pkgUnavailable, isDigital,
    basePrice, discountedBase, deliveryFee,
    totalPrice: discountedBase + deliveryFee,
    liveSettings,
    pricesReady, pricesFailed, retryPrices,
  };
}
