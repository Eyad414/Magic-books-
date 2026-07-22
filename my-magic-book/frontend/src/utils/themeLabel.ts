// ─── Theme label / description resolution ────────────────────────────────────
// A theme's title & description can be (a) edited by the admin in "Stories &
// Themes" (stored on the theme as a single string), or (b) left at the built-in
// default. Rule: if the admin CUSTOMIZED it, that custom text wins in every UI
// language; otherwise we show the localized i18n string so built-in themes keep
// per-language names. Shared by the admin dashboard AND the customer wizard so
// what the admin types is exactly what the customer sees.

type TFn = (key: string, opts?: any) => string;

// Built-in default Arabic labels — a stored label equal to one of these means
// the admin never edited it (so use the localized i18n name instead).
const DEFAULT_THEME_LABELS = [
  'مغامرة',
  'مغامرة حديقة الحيوان',
  'مغامرة حديقة الحيوانات',
  'الفضاء',
  'المحيط',
  'بطل المدرسة',
  'رحلة الكتاب المسحور',
  'رحلة الكتاب السحري',
];

const DEFAULT_THEME_DESCS = [
  'استكشاف ومغامرات مثيرة',
  'رحلة مثيرة بين الحيوانات اللطيفة',
  'رحلة بين النجوم والكواكب',
  'رحلات بين النجوم والكواكب',
  'عالم سحري تحت الماء',
  'مساعدة الآخرين ونشر اللطف والألوان في المدرسة',
  'مغامرة سحرية داخل عالم الكتب لإعادة الألوان والسعادة',
];

// A theme may carry explicit per-language titles set by the admin, e.g.
// { en: 'The Magic Book', he: 'הספר הקסום' }. The Arabic title stays in `label`.
export interface ThemeTitles { ar?: string; en?: string; he?: string }

export function getThemeLabel(
  theme: { id: string; label?: string; titles?: ThemeTitles },
  t: TFn,
  lang?: string,
): string {
  // 1. An explicit admin-set title for THIS UI language wins outright.
  const L = (lang || '').toLowerCase();
  const perLang =
    L.startsWith('en') ? theme.titles?.en :
    L.startsWith('he') ? theme.titles?.he :
    L.startsWith('ar') ? theme.titles?.ar : undefined;
  if (perLang?.trim()) return perLang.trim();

  const label = theme.label?.trim();
  const key = `step2.theme_${theme.id}`;
  const translated = t(key);
  const hasI18n = translated !== key;

  // `label` always holds the ARABIC name. On a non-Arabic UI with no explicit
  // per-language title, prefer the localized i18n name over the raw Arabic label
  // (otherwise an admin-renamed theme shows Arabic text in English/Hebrew).
  if (!(L.startsWith('ar') || L === '') && hasI18n) return translated;

  // 2. Arabic UI: a customized single Arabic label wins over the built-in name.
  const isCustomized = !!label && !DEFAULT_THEME_LABELS.includes(label);
  if (isCustomized) return label!;

  // 3. Built-in, un-edited theme → localized i18n name.
  return hasI18n ? translated : (label || theme.id);
}

export function getThemeDesc(
  theme: { id: string; desc?: string; descriptions?: ThemeTitles },
  t: TFn,
  lang?: string,
): string {
  // 1. An explicit admin-set description for THIS UI language wins.
  const L = (lang || '').toLowerCase();
  const perLang =
    L.startsWith('en') ? theme.descriptions?.en :
    L.startsWith('he') ? theme.descriptions?.he :
    L.startsWith('ar') ? theme.descriptions?.ar : undefined;
  if (perLang?.trim()) return perLang.trim();

  const desc = theme.desc?.trim();
  const key = `step2.theme_${theme.id}_desc`;
  const translated = t(key);
  const hasI18n = translated !== key;

  // `desc` always holds ARABIC. On a non-Arabic UI with no per-language
  // description, prefer the localized i18n text over the raw Arabic.
  if (!(L.startsWith('ar') || L === '') && hasI18n) return translated;

  // 2. Arabic UI: a customized single Arabic description wins.
  const isCustomized = !!desc && !DEFAULT_THEME_DESCS.includes(desc);
  if (isCustomized) return desc!;

  // 3. Built-in, un-edited theme → localized i18n description.
  return hasI18n ? translated : (desc || '');
}
