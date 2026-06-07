// ─── Client-side Name Transliteration ────────────────────────────────────────
// Converts a child's name into the correct script for the story language.
// Works entirely in the browser — no API key needed.
//
// Priority:
//   1. Exact match in the name dictionary  (fast + accurate)
//   2. Phonetic rules                       (fallback for unknown names)
//   3. Return the original name             (safe last resort)

// ── Script detection ──────────────────────────────────────────────────────────
export const isArabic  = (s: string) => /[؀-ۿ؀-ۿ]/.test(s);
export const isHebrew  = (s: string) => /[֐-׿]/.test(s);
export const isLatin   = (s: string) =>  /[a-zA-Z]/.test(s);

// ── Arabic ↔ English name dictionary ─────────────────────────────────────────
// Keys: normalized English (lowercase, no spaces). Values: Arabic form.
const AR_EN: Record<string, string> = {
  // ── Common Arabic names (English spellings) ──────────────────────────────
  ahmad: 'أحمد', ahmed: 'أحمد', ahamed: 'أحمد',
  muhammad: 'محمد', mohammed: 'محمد', mohamed: 'محمد', mohamad: 'محمد',
  ali: 'علي', alee: 'علي',
  omar: 'عمر', umar: 'عمر', omer: 'عمر',
  eyad: 'إياد', iyad: 'إياد', eiad: 'إياد',
  khaled: 'خالد', khalid: 'خالد',
  youssef: 'يوسف', yousef: 'يوسف', yusuf: 'يوسف', joseph: 'يوسف',
  ibrahim: 'إبراهيم', abrahim: 'إبراهيم',
  ismail: 'إسماعيل', ismael: 'إسماعيل',
  ayman: 'أيمن', eyman: 'أيمن',
  bilal: 'بلال', belal: 'بلال',
  jamal: 'جمال', gamal: 'جمال',
  hassan: 'حسن', hasan: 'حسن',
  hussein: 'حسين', husain: 'حسين', hossein: 'حسين', hussain: 'حسين',
  hamza: 'حمزة', hamzah: 'حمزة',
  rami: 'رامي', ramy: 'رامي',
  reem: 'ريم', rim: 'ريم',
  ziad: 'زياد', zyad: 'زياد',
  sami: 'سامي', samy: 'سامي',
  salma: 'سلمى', salema: 'سلمى',
  shadi: 'شادي', shady: 'شادي',
  saleh: 'صالح', salih: 'صالح',
  tariq: 'طارق', tarek: 'طارق', tarik: 'طارق',
  adel: 'عادل', adil: 'عادل',
  ammar: 'عمار', ammer: 'عمار',
  faisal: 'فيصل', faysal: 'فيصل', fayssal: 'فيصل',
  qasim: 'قاسم', kasim: 'قاسم',
  karim: 'كريم', kareem: 'كريم',
  lena: 'لينا', lina: 'لينا',
  majed: 'ماجد', majid: 'ماجد',
  marwan: 'مروان',
  mona: 'منى', muna: 'منى', monia: 'منى',
  nader: 'نادر', nadir: 'نادر',
  noura: 'نورة', nura: 'نورة', noor: 'نور', nur: 'نور',
  hadi: 'هادي', haadi: 'هادي',
  walid: 'وليد', waleed: 'وليد',
  liyan: 'ليان', liaan: 'ليان',
  jana: 'جنى', jenna: 'جنى',
  nora: 'نورا', norah: 'نورا',
  rayan: 'ريان', ryan: 'ريان',
  lamis: 'لميس',
  anas: 'أنس',
  tala: 'تالا',
  joud: 'جود', jood: 'جود',
  dana: 'دانة',
  ruba: 'ربى', roba: 'ربى',
  rand: 'رند',
  rana: 'رنا',
  zainab: 'زينب', zaynab: 'زينب', zeinab: 'زينب',
  sultan: 'سلطان',
  safaa: 'صفاء', safa: 'صفاء',
  farah: 'فرح',
  malak: 'ملاك',
  noha: 'نهى', noha2: 'نهى',
  nawaf: 'نواف',
  hind: 'هند',
  yasmine: 'ياسمين', jasmine: 'ياسمين', yasmin: 'ياسمين',
  yasser: 'ياسر', yaser: 'ياسر',
  wisam: 'وسام', wesam: 'وسام',
  sara: 'سارة', sarah: 'سارة',
  fatima: 'فاطمة', fatema: 'فاطمة', fatimah: 'فاطمة',
  abdullah: 'عبدالله',
  abdulrahman: 'عبدالرحمن', abdelrahman: 'عبدالرحمن',
  saleha: 'صالحة',
  amira: 'أميرة', ameera: 'أميرة',
  nadia: 'نادية',
  leila: 'ليلى', layla: 'ليلى', lyla: 'ليلى',
  sumaya: 'سمية', soumaya: 'سمية',
  rawan: 'روان',
  hana: 'هناء', hanaa: 'هناء', hanna: 'هناء',
  amal: 'أمل',
  eman: 'إيمان', iman: 'إيمان',
  ghada: 'غادة',
  dina: 'دينا',
  rola: 'رولا',
  abeer: 'عبير', abir: 'عبير',
  // ── Common Western names → Arabic ──────────────────────────────────────
  adam: 'آدم',
  benjamin: 'بنيامين', ben: 'بن',
  emma: 'إيما',
  liam: 'ليام',
  noah: 'نوح',
  sophia: 'صوفيا', sofia: 'صوفيا',
  isabella: 'إيزابيلا',
  james: 'جيمس',
  charlotte: 'شارلوت',
  amelia: 'أميليا',
  oliver: 'أوليفر',
  lucas: 'لوكاس',
  mia: 'ميا',
  ethan: 'إيثان',
  ava: 'آفا',
  henry: 'هنري',
  elijah: 'إيليا',
  aiden: 'إيدن',
  ella: 'إيلا',
  harper: 'هاربر',
  aria: 'آريا',
  chloe: 'كلوي',
  daniel: 'دانييل', daniyel: 'دانييل',
  david: 'داود', dawod: 'داود',
  emily: 'إيميلي',
  michael: 'مايكل',
  lily: 'ليلى',
  jack: 'جاك',
  john: 'جون',
  george: 'جورج',
  anna: 'آنا',
  grace: 'غريس',
  luna: 'لونا',
  zoe: 'زوي',
  natalie: 'ناتالي',
  alex: 'أليكس',
  jessica: 'جيسيكا',
  mary: 'ماري', maria: 'ماريا',
  julia: 'جوليا',
  victor: 'فيكتور',
  kevin: 'كيفن',
  ryan: 'ريان',
  sam: 'سام',
  max: 'ماكس',
  leo: 'ليو',
  nina: 'نينا',
  rose: 'روز',
  kate: 'كيت',
  amy: 'إيمي',
  peter: 'بيتر',
  paul: 'بول',
  mark: 'مارك',
  tom: 'توم',
  nick: 'نيك',
};

// English → Hebrew name dictionary (subset of common names)
const HE_EN: Record<string, string> = {
  muhammad: 'מוחמד', mohammed: 'מוחמד', ahmad: 'אחמד', ahmed: 'אחמד',
  ali: 'עלי', omar: 'עומר', youssef: 'יוסף', ibrahim: 'אברהים',
  sara: 'שרה', sarah: 'שרה', adam: 'אדם', david: 'דוד',
  daniel: 'דניאל', joseph: 'יוסף', michael: 'מיכאל',
  john: 'ג׳ון', mary: 'מרים', maria: 'מריה', anna: 'אנה',
  liam: 'ליאם', noah: 'נח', emma: 'אמה', sophia: 'סופיה',
  james: 'ג׳יימס', emily: 'אמילי', mia: 'מיה', alex: 'אלכס',
  eyad: 'איאד', iyad: 'איאד', khaled: 'ח׳אלד', khalid: 'ח׳אלד',
};

// Arabic → English (reverse lookup)
const EN_AR: Record<string, string> = {};
for (const [en, ar] of Object.entries(AR_EN)) {
  if (!EN_AR[ar]) EN_AR[ar] = capitalize(en);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Phonetic Latin → Arabic fallback ─────────────────────────────────────────
// Handles unknown names using a simplified phonetic mapping.
const PHONETIC_AR: [RegExp, string][] = [
  // Digraphs first (order matters)
  [/kh/gi, 'خ'], [/gh/gi, 'غ'], [/sh/gi, 'ش'], [/ch/gi, 'ش'],
  [/th/gi, 'ث'], [/ph/gi, 'ف'], [/oo/gi, 'و'], [/ee/gi, 'ي'],
  [/aa/gi, 'ا'], [/ei/gi, 'ي'], [/ou/gi, 'و'], [/ay/gi, 'اي'],
  [/aw/gi, 'او'],
  // Single letters
  [/a/gi, 'ا'], [/b/gi, 'ب'], [/c/gi, 'ك'], [/d/gi, 'د'],
  [/e/gi, 'ي'], [/f/gi, 'ف'], [/g/gi, 'ج'], [/h/gi, 'ه'],
  [/i/gi, 'ي'], [/j/gi, 'ج'], [/k/gi, 'ك'], [/l/gi, 'ل'],
  [/m/gi, 'م'], [/n/gi, 'ن'], [/o/gi, 'و'], [/p/gi, 'ب'],
  [/q/gi, 'ق'], [/r/gi, 'ر'], [/s/gi, 'س'], [/t/gi, 'ت'],
  [/u/gi, 'و'], [/v/gi, 'ف'], [/w/gi, 'و'], [/x/gi, 'كس'],
  [/y/gi, 'ي'], [/z/gi, 'ز'],
];

function phoneticToArabic(name: string): string {
  let result = name.toLowerCase();
  for (const [pattern, replacement] of PHONETIC_AR) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ── Arabic → Latin phonetic ───────────────────────────────────────────────────
const PHONETIC_EN: [RegExp, string][] = [
  [/خ/g, 'kh'], [/غ/g, 'gh'], [/ش/g, 'sh'], [/ث/g, 'th'],
  [/ح/g, 'h'], [/ص/g, 's'], [/ض/g, 'd'], [/ط/g, 't'], [/ظ/g, 'z'],
  [/ع/g, '\''], [/ق/g, 'q'], [/أ|إ|آ/g, 'a'],
  [/ا/g, 'a'], [/ب/g, 'b'], [/ت/g, 't'], [/ج/g, 'j'],
  [/د/g, 'd'], [/ذ/g, 'dh'], [/ر/g, 'r'], [/ز/g, 'z'],
  [/س/g, 's'], [/ف/g, 'f'], [/ك/g, 'k'], [/ل/g, 'l'],
  [/م/g, 'm'], [/ن/g, 'n'], [/ه/g, 'h'], [/و/g, 'w'],
  [/ي/g, 'y'], [/ة/g, 'a'], [/ى/g, 'a'], [/[ًٌٍَُِّْ]/g, ''],
];

function phoneticToLatin(name: string): string {
  let result = name;
  for (const [pattern, replacement] of PHONETIC_EN) {
    result = result.replace(pattern, replacement);
  }
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Transliterates a child's name into the script required by the story language.
 *
 * @param name  - Name as typed by the customer (any script)
 * @param lang  - Target story language: 'ar' | 'en' | 'he'
 * @returns     - Name in the correct script for the story
 */
export function transliterateName(name: string, lang: 'ar' | 'en' | 'he'): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;

  const nameIsArabic = isArabic(trimmed);
  const nameIsHebrew = isHebrew(trimmed);
  const nameIsLatin  = isLatin(trimmed) && !nameIsArabic && !nameIsHebrew;

  // ── Target: Arabic ──────────────────────────────────────────────────────────
  if (lang === 'ar') {
    if (nameIsArabic) return trimmed; // already Arabic

    // Try dictionary
    const key = trimmed.toLowerCase().replace(/\s+/g, '');
    if (AR_EN[key]) return AR_EN[key];

    // Try partial / first word only
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    if (AR_EN[firstWord]) return AR_EN[firstWord];

    // Phonetic fallback
    return phoneticToArabic(trimmed);
  }

  // ── Target: English ─────────────────────────────────────────────────────────
  if (lang === 'en') {
    if (nameIsLatin) return trimmed; // already Latin

    if (nameIsArabic) {
      // Try reverse dictionary
      const found = EN_AR[trimmed];
      if (found) return found;

      // Try first word
      const firstWord = trimmed.split(/\s+/)[0];
      if (EN_AR[firstWord]) return EN_AR[firstWord];

      return phoneticToLatin(trimmed);
    }

    return trimmed; // Hebrew or other — leave as-is
  }

  // ── Target: Hebrew ──────────────────────────────────────────────────────────
  if (lang === 'he') {
    if (nameIsHebrew) return trimmed; // already Hebrew

    if (nameIsArabic) {
      // Route: Arabic → reverse-lookup English → Hebrew
      // e.g. "أحمد" → EN_AR["أحمد"] = "Ahmad" → HE_EN["ahmad"] = "אחמד"
      const firstWord = trimmed.split(/\s+/)[0];
      const enForm = EN_AR[trimmed] || EN_AR[firstWord];
      if (enForm) {
        const heKey = enForm.toLowerCase();
        if (HE_EN[heKey]) return HE_EN[heKey];
      }
      return trimmed; // no Hebrew mapping found
    }

    if (nameIsLatin) {
      const key = trimmed.toLowerCase().replace(/\s+/g, '');
      if (HE_EN[key]) return HE_EN[key];
      const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
      if (HE_EN[firstWord]) return HE_EN[firstWord];
    }

    return trimmed; // leave as-is if no rule
  }

  return trimmed;
}
