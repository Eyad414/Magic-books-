import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../api/publicApi';
import { getPackageLabel, getPackageDesc } from '../utils/packageLabel';

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
  const { t, i18n } = useTranslation();
  const [liveSettings, setLiveSettings] = useState<any>(null);

  useEffect(() => {
    publicApi.getSettings()
      .then((res) => { if (res.success && res.settings) setLiveSettings(res.settings); })
      .catch((err) => console.error('Failed to load pricing:', err));
  }, []);

  const lang = i18n.language;
  const packages = useMemo(() => {
    const DEFAULTS = [
      { id: 'color', label: t('step3.pkg_color', 'قصة ملونة'), price: 60, emoji: '🌈', desc: t('step3.pkg_color_desc') },
      { id: 'coloring', label: t('step3.pkg_coloring', 'دفتر تلوين'), price: 50, emoji: '🖍️', desc: t('step3.pkg_coloring_desc') },
      { id: 'audio', label: t('step3.pkg_audio', 'ملف صوتي (Audio)'), price: 20, emoji: '🎧', desc: t('step3.pkg_audio_desc') },
      { id: 'ebook', label: t('step3.pkg_ebook', 'نسخة رقمية (E-Book)'), price: 20, emoji: '📱', desc: t('step3.pkg_ebook_desc') },
      { id: 'pro', label: t('step3.pkg_pro', 'باقة Pro الشاملة'), price: 120, originalPrice: 140, emoji: '✨', desc: t('step3.pkg_pro_desc') },
    ];
    if (!liveSettings?.bookPackages) return DEFAULTS;
    return DEFAULTS
      .map((d) => {
        const live = liveSettings.bookPackages.find((p: any) => p.id === d.id);
        if (!live) return d;
        return {
          ...d,
          price: typeof live.price === 'number' ? live.price : d.price,
          label: getPackageLabel(live, t as any, lang, d.label),
          desc: getPackageDesc(live, t as any, lang, d.desc),
          hidden: live.hidden,
          originalPrice: (live as any).originalPrice ?? (d as any).originalPrice,
        };
      })
      .filter((p: any) => !p.hidden);
  }, [liveSettings, t, lang]);

  const matchedPkg = packages.find((p: any) => p.id === opts.bookPackage);
  const selectedPkg = matchedPkg || packages[0];
  const pkgUnavailable = !!opts.bookPackage && !matchedPkg;

  const isDigital = selectedPkg?.id === 'audio' || selectedPkg?.id === 'ebook';
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
  };
}
