/**
 * Package names, resolved for the UI language — the same rule the themes use
 * (see utils/themeLabel).
 *
 * The dashboard's name field is Arabic, so a rename used to reach Arabic
 * customers only: English and Hebrew kept the built-in translation and never
 * saw it. Per-language overrides fix that without showing Arabic text to an
 * English reader when no override has been written.
 *
 * Order: an override for this language → the Arabic label (Arabic UI only) →
 * the built-in translation.
 */
export interface LocalizedPackage {
  id: string;
  label?: string;
  desc?: string;
  titles?: { ar?: string; en?: string; he?: string };
  descriptions?: { ar?: string; en?: string; he?: string };
}

// Same shape utils/themeLabel uses, so i18next's TFunction satisfies it.
type TFn = (key: string, opts?: any) => string;

function pick(over: { ar?: string; en?: string; he?: string } | undefined, lang: string): string | undefined {
  const L = (lang || '').toLowerCase();
  const v =
    L.startsWith('en') ? over?.en :
    L.startsWith('he') ? over?.he :
    L.startsWith('ar') ? over?.ar : undefined;
  return v?.trim() ? v.trim() : undefined;
}

export function getPackageLabel(pkg: LocalizedPackage, t: TFn, lang: string, fallback?: string): string {
  const over = pick(pkg.titles, lang);
  if (over) return over;
  // The bare `label` is whatever the owner typed, which is Arabic — so it only
  // stands in for the Arabic UI.
  if ((lang || '').toLowerCase().startsWith('ar') && pkg.label?.trim()) return pkg.label.trim();
  return fallback ?? t(`step3.pkg_${pkg.id}`);
}

export function getPackageDesc(pkg: LocalizedPackage, t: TFn, lang: string, fallback?: string): string {
  const over = pick(pkg.descriptions, lang);
  if (over) return over;
  if ((lang || '').toLowerCase().startsWith('ar') && pkg.desc?.trim()) return pkg.desc.trim();
  return fallback ?? t(`step3.pkg_${pkg.id}_desc`);
}
