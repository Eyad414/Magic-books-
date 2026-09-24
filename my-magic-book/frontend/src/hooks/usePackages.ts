import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../api/publicApi';
import { getPackageLabel, getPackageDesc } from '../utils/packageLabel';

/**
 * What the shop sells, and what it costs.
 *
 * The price is the server's to state. Three screens used to keep their own
 * hard-coded copy of the price list as a "sensible fallback", and all three had
 * drifted: a colour story was quoted at 60 ₪ while checkout charged 130. The
 * fallback rendered on every load before the settings request came back, and
 * stayed on screen for good if that request failed — so the cheap number was
 * the FIRST thing a customer saw, and the server then priced the order from its
 * own table (orderController resolves basePrice from settings.bookPackages).
 * Quote one price and charge another and it reads as bait-and-switch, whoever
 * wrote the constant.
 *
 * So there is no fallback price here, and no way to add one: `price` is null
 * until the server answers. A screen showing null must show a placeholder and
 * must not let the customer commit to a number nobody has quoted yet.
 */

/** Identity and wording only — deliberately no prices. */
const CATALOGUE = [
  { id: 'color', key: 'step3.pkg_color', fallbackLabel: 'قصة ملونة', emoji: '🌈' },
  { id: 'coloring', key: 'step3.pkg_coloring', fallbackLabel: 'دفتر تلوين', emoji: '🖍️' },
  { id: 'ebook', key: 'step3.pkg_ebook', fallbackLabel: 'نسخة رقمية (E-Book)', emoji: '📱' },
  { id: 'pro', key: 'step3.pkg_pro', fallbackLabel: 'باقة Pro الشاملة', emoji: '✨' },
] as const;

export interface ShopPackage {
  id: string;
  label: string;
  desc?: string;
  emoji: string;
  /** null while the real price is still unknown. Never a guess. */
  price: number | null;
  /** A struck-through "was" price, and only when the server says so. */
  originalPrice?: number;
  hidden?: boolean;
}

export interface UsePackages {
  packages: ShopPackage[];
  /** Every visible package has a price the server will honour. */
  pricesReady: boolean;
  /** The request failed; the customer needs to be told, not given a number. */
  pricesFailed: boolean;
  retryPrices: () => void;
  liveSettings: any;
}

export function usePackages(): UsePackages {
  const { t, i18n } = useTranslation();
  const [liveSettings, setLiveSettings] = useState<any>(null);
  const [pricesFailed, setPricesFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPricesFailed(false);
    publicApi.getSettings()
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.settings) setLiveSettings(res.settings);
        else setPricesFailed(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load pricing:', err);
        setPricesFailed(true);
      });
    return () => { cancelled = true; };
  }, [attempt]);

  const retryPrices = useCallback(() => setAttempt((n) => n + 1), []);

  const lang = i18n.language;
  const packages = useMemo<ShopPackage[]>(() => {
    const live: any[] | null = liveSettings?.bookPackages ?? null;
    return CATALOGUE
      .map((entry) => {
        const label = t(entry.key, entry.fallbackLabel);
        const desc = t(`${entry.key}_desc`);
        const row = live?.find((p: any) => p.id === entry.id);
        // The admin types names in Arabic and packages carry no per-language
        // field, so an admin rename wins for Arabic and en/he keep the built-in
        // translation.
        if (!row) {
          return { id: entry.id, label, desc, emoji: entry.emoji, price: null,
                   // Before the server answers nothing is hidden yet; once it
                   // has answered, a package it never mentioned does not exist.
                   hidden: live ? true : false };
        }
        const was = typeof row.originalPrice === 'number' ? row.originalPrice : undefined;
        const price = typeof row.price === 'number' ? row.price : null;
        return {
          id: entry.id,
          label: getPackageLabel(row, t as any, lang, label),
          desc: getPackageDesc(row, t as any, lang, desc),
          emoji: entry.emoji,
          price,
          // Only ever a genuine markdown: a "was" at or below the live price
          // advertises a discount off a lower number.
          originalPrice: was && price !== null && was > price ? was : undefined,
          hidden: !!row.hidden,
        };
      })
      .filter((p) => !p.hidden);
  }, [liveSettings, t, lang]);

  const pricesReady = packages.length > 0 && packages.every((p) => typeof p.price === 'number');

  return { packages, pricesReady, pricesFailed, retryPrices, liveSettings };
}
