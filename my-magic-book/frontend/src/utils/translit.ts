// ─── Name transliteration (Arabic ⇄ Latin ⇄ Hebrew) for display ──────────────
// Auto-guesses the child's name in the script that matches the site language
// (Arabic UI → بهاء, English → Baha, Hebrew → בהאא). Best-effort: a dictionary
// of common kids' names is exact; a phonetic fallback covers the rest. No API.

export type ScriptName = 'arabic' | 'latin' | 'hebrew' | 'other';

interface Forms { en: string; ar: string; he: string }

// Common names with exact spellings in all three scripts.
const NAMES: Forms[] = [
  { en: 'Baha', ar: 'بهاء', he: 'בהאא' },
  { en: 'Lora', ar: 'لورا', he: 'לורה' },
  { en: 'Laura', ar: 'لورا', he: 'לורה' },
  { en: 'Eyad', ar: 'إياد', he: 'איאד' },
  { en: 'Iyad', ar: 'إياد', he: 'איאד' },
  { en: 'Adam', ar: 'آدم', he: 'אדם' },
  { en: 'Sara', ar: 'سارة', he: 'שרה' },
  { en: 'Sarah', ar: 'سارة', he: 'שרה' },
  { en: 'Omar', ar: 'عمر', he: 'עומר' },
  { en: 'Yusuf', ar: 'يوسف', he: 'יוסף' },
  { en: 'Yousef', ar: 'يوسف', he: 'יוסף' },
  { en: 'Ali', ar: 'علي', he: 'עלי' },
  { en: 'Lara', ar: 'لارا', he: 'לארה' },
  { en: 'Maryam', ar: 'مريم', he: 'מרים' },
  { en: 'Mariam', ar: 'مريم', he: 'מרים' },
  { en: 'Noor', ar: 'نور', he: 'נור' },
  { en: 'Nour', ar: 'نور', he: 'נור' },
  { en: 'Yara', ar: 'يارا', he: 'יארה' },
  { en: 'Ahmad', ar: 'أحمد', he: 'אחמד' },
  { en: 'Ahmed', ar: 'أحمد', he: 'אחמד' },
  { en: 'Mohammad', ar: 'محمد', he: 'מוחמד' },
  { en: 'Mohammed', ar: 'محمد', he: 'מוחמד' },
  { en: 'Hamza', ar: 'حمزة', he: 'חמזה' },
  { en: 'Salma', ar: 'سلمى', he: 'סלמא' },
  { en: 'Maya', ar: 'مايا', he: 'מאיה' },
  { en: 'Dana', ar: 'دانة', he: 'דאנה' },
  { en: 'Lina', ar: 'لينا', he: 'לינה' },
  { en: 'Karim', ar: 'كريم', he: 'כרים' },
];

const norm = (s: string) => s.trim().toLowerCase();
const byScript: Record<'en' | 'ar' | 'he', Map<string, Forms>> = { en: new Map(), ar: new Map(), he: new Map() };
for (const f of NAMES) {
  byScript.en.set(norm(f.en), f);
  byScript.ar.set(norm(f.ar), f);
  byScript.he.set(norm(f.he), f);
}

export function detectScript(s: string): ScriptName {
  if (/[֐-׿]/.test(s)) return 'hebrew';
  if (/[؀-ۿ]/.test(s)) return 'arabic';
  if (/[A-Za-z]/.test(s)) return 'latin';
  return 'other';
}

// ── Phonetic letter maps (best-effort) ───────────────────────────────────────
const L2A: Record<string, string> = { a:'ا',b:'ب',c:'ك',d:'د',e:'',f:'ف',g:'غ',h:'ه',i:'ي',j:'ج',k:'ك',l:'ل',m:'م',n:'ن',o:'و',p:'ب',q:'ق',r:'ر',s:'س',t:'ت',u:'و',v:'ف',w:'و',x:'كس',y:'ي',z:'ز',"'":'ء' };
const L2H: Record<string, string> = { a:'א',b:'ב',c:'ק',d:'ד',e:'',f:'פ',g:'ג',h:'ה',i:'י',j:'ג',k:'ק',l:'ל',m:'מ',n:'נ',o:'ו',p:'פ',q:'ק',r:'ר',s:'ס',t:'ט',u:'ו',v:'ו',w:'ו',x:'קס',y:'י',z:'ז',"'":'' };
const A2L: Record<string, string> = { 'ا':'a','أ':'a','إ':'i','آ':'a','ب':'b','ت':'t','ث':'th','ج':'j','ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh','ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q','ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'o','ي':'y','ى':'a','ة':'a','ء':'','ئ':'e','ؤ':'o' };
const A2H: Record<string, string> = { 'ا':'א','أ':'א','إ':'א','آ':'א','ب':'ב','ت':'ת','ث':'ת','ج':'ג','ح':'ח','خ':'כ','د':'ד','ذ':'ז','ر':'ר','ز':'ז','س':'ס','ش':'ש','ص':'צ','ض':'ד','ط':'ט','ظ':'ז','ع':'ע','غ':'ג','ف':'פ','ق':'ק','ك':'כ','ل':'ל','م':'מ','ن':'נ','ه':'ה','و':'ו','ي':'י','ى':'א','ة':'ה','ء':'א','ئ':'י','ؤ':'ו' };
const H2L: Record<string, string> = { 'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'o','ז':'z','ח':'h','ט':'t','י':'y','כ':'k','ך':'k','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s','ע':'a','פ':'f','ף':'f','צ':'ts','ץ':'ts','ק':'q','ר':'r','ש':'sh','ת':'t' };
const H2A: Record<string, string> = { 'א':'ا','ב':'ب','ג':'ج','ד':'د','ה':'ه','ו':'و','ז':'ز','ח':'ح','ט':'ط','י':'ي','כ':'ك','ך':'ك','ל':'ل','מ':'م','ם':'م','נ':'ن','ן':'ن','ס':'س','ע':'ع','פ':'ف','ף':'ف','צ':'ص','ץ':'ص','ק':'ق','ר':'ر','ש':'ش','ת':'ت' };
// Hebrew final-letter forms applied to the last character.
const H_FINAL: Record<string, string> = { 'מ':'ם','נ':'ן','צ':'ץ','פ':'ף','כ':'ך' };

function mapChars(s: string, table: Record<string, string>, srcScript: ScriptName): string {
  let out = '';
  for (const ch of s) out += table[ch] !== undefined ? table[ch] : (detectScript(ch) === srcScript ? '' : ch);
  return out;
}
function cap(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function finalize(he: string): string {
  if (!he) return he;
  const last = he[he.length - 1];
  return H_FINAL[last] ? he.slice(0, -1) + H_FINAL[last] : he;
}

function toLatin(name: string): string {
  const s = detectScript(name);
  if (s === 'latin') return name;
  if (s === 'arabic') return cap(mapChars(name.trim(), A2L, 'arabic'));
  if (s === 'hebrew') return cap(mapChars(name.trim(), H2L, 'hebrew'));
  return name;
}
function toArabic(name: string): string {
  const s = detectScript(name);
  if (s === 'arabic') return name;
  if (s === 'latin') return mapChars(norm(name), L2A, 'latin') || name;
  if (s === 'hebrew') return mapChars(name.trim(), H2A, 'hebrew') || name;
  return name;
}
function toHebrew(name: string): string {
  const s = detectScript(name);
  if (s === 'hebrew') return name;
  if (s === 'latin') return finalize(mapChars(norm(name), L2H, 'latin')) || name;
  if (s === 'arabic') return finalize(mapChars(name.trim(), A2H, 'arabic')) || name;
  return name;
}

function lookup(name: string): Forms | undefined {
  const s = detectScript(name);
  const key = norm(name);
  if (s === 'latin') return byScript.en.get(key);
  if (s === 'arabic') return byScript.ar.get(key);
  if (s === 'hebrew') return byScript.he.get(key);
  return undefined;
}

/** Return the name written in the script that matches the site language. */
export function localizeName(name: string, lang: string | undefined): string {
  if (!name) return name;
  const target: 'ar' | 'he' | 'en' =
    !lang ? 'en' : lang.toLowerCase().startsWith('ar') ? 'ar' : lang.toLowerCase().startsWith('he') ? 'he' : 'en';
  const have = detectScript(name);
  if (have === 'other') return name;
  // already in the right script?
  if ((target === 'ar' && have === 'arabic') || (target === 'he' && have === 'hebrew') || (target === 'en' && have === 'latin')) {
    return name;
  }
  const forms = lookup(name);
  if (forms) return forms[target];
  return target === 'ar' ? toArabic(name) : target === 'he' ? toHebrew(name) : toLatin(name);
}

/** Return the name in the opposite script (kept for any callers). */
export function otherScript(name: string): string {
  const s = detectScript(name);
  if (s === 'latin') return toArabic(name);
  if (s === 'arabic') return toLatin(name);
  if (s === 'hebrew') return toLatin(name);
  return name;
}
