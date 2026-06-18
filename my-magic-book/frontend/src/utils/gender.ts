// Gender detection + Arabic gender-agreement helpers.
//
// Templates can embed gender tokens: {masc|fem}
//   "بطل{|ة} المدرسة"  -> male: "بطل المدرسة"  | female: "بطلة المدرسة"
//   "استيقظ{|ت}"        -> male: "استيقظ"        | female: "استيقظت"

export type Gender = 'male' | 'female';

// Common girl names (Arabic + transliterations). Everything else defaults to male.
const FEMALE_NAMES = new Set(
  [
    'سارة', 'ساره', 'ريم', 'ريما', 'رؤى', 'لين', 'جنى', 'ميرا', 'تالا', 'سيلين',
    'ميسم', 'رهف', 'جودي', 'ملك', 'ريناد', 'لمار', 'دانة', 'دانه', 'جوري', 'شهد',
    'رزان', 'لينا', 'مايا', 'ميار', 'تولين', 'سما', 'يارا', 'ياره', 'ليان', 'روان',
    'هيا', 'وعد', 'غلا', 'رتاج', 'بيسان', 'نور', 'إلين', 'ايلين', 'سيدرا', 'كادي',
    // transliterations
    'sara', 'sarah', 'reem', 'rem', 'rima', 'reema', 'lin', 'lyn', 'jana', 'mira',
    'tala', 'celine', 'maysam', 'rahaf', 'judy', 'malak', 'renad', 'lamar', 'dana',
    'joury', 'shahd', 'razan', 'lina', 'maya', 'mayar', 'sama', 'yara', 'layan',
    'rawan', 'haya', 'noor', 'nour', 'sidra', 'kadi',
  ].map((n) => n.toLowerCase())
);

/** Detect gender from a name. Defaults to 'male' when unknown. */
export function detectGender(name?: string): Gender {
  if (!name) return 'male';
  const n = name.trim().toLowerCase();
  if (FEMALE_NAMES.has(n)) return 'female';
  // First token (in case of full names)
  const first = n.split(/\s+/)[0];
  if (FEMALE_NAMES.has(first)) return 'female';
  return 'male';
}

/** Replace {masc|fem} tokens in text according to gender. */
export function applyGenderTokens(text: string, gender: Gender): string {
  if (!text) return '';
  return text.replace(/\{([^|{}]*)\|([^|{}]*)\}/g, (_m, masc, fem) =>
    gender === 'female' ? fem : masc
  );
}

/** Demo names for the admin book preview. */
export const DEMO_NAMES: { name: string; gender: Gender }[] = [
  { name: 'بهاء', gender: 'male' },
  { name: 'يوسف', gender: 'male' },
  { name: 'سارة', gender: 'female' },
  { name: 'ريم', gender: 'female' },
];
