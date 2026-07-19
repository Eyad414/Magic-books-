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

export function getThemeLabel(theme: { id: string; label?: string }, t: TFn): string {
  const label = theme.label?.trim();
  const isCustomized = !!label && !DEFAULT_THEME_LABELS.includes(label);
  if (isCustomized) return label;
  const key = `step2.theme_${theme.id}`;
  const translated = t(key);
  return translated !== key ? translated : (label || theme.id);
}

export function getThemeDesc(theme: { id: string; desc?: string }, t: TFn): string {
  const desc = theme.desc?.trim();
  const isCustomized = !!desc && !DEFAULT_THEME_DESCS.includes(desc);
  if (isCustomized) return desc;
  const key = `step2.theme_${theme.id}_desc`;
  const translated = t(key);
  return translated !== key ? translated : (desc || '');
}
