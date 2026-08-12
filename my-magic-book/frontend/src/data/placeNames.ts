/**
 * Display names for the shipping city / neighbourhood dropdowns.
 *
 * The Arabic string is the VALUE — it is what gets stored on the order, what
 * keys CITY_STREETS, and what goes to BookPod. Translating it would silently
 * change order data and break the neighbourhood lookup, so nothing here touches
 * the value: this maps a value to what the customer reads.
 *
 * Anything without an entry falls through to the Arabic, so a city added to
 * Step3_Checkout without a translation still works — it just isn't localized.
 */
type Names = { en: string; he: string };

const PLACE_NAMES: Record<string, Names> = {
  // ── Cities ────────────────────────────────────────────────────────────────
  'القدس': { en: 'Jerusalem', he: 'ירושלים' },
  'تل أبيب': { en: 'Tel Aviv', he: 'תל אביב' },
  'حيفا': { en: 'Haifa', he: 'חיפה' },
  'يافا': { en: 'Jaffa', he: 'יפו' },
  'الناصرة': { en: 'Nazareth', he: 'נצרת' },
  'عكا': { en: 'Acre', he: 'עכו' },
  'بئر السبع': { en: 'Beersheba', he: 'באר שבע' },
  'الرملة': { en: 'Ramla', he: 'רמלה' },
  'اللد': { en: 'Lod', he: 'לוד' },
  'ريشون لتسيون': { en: 'Rishon LeZion', he: 'ראשון לציון' },
  'أسدود': { en: 'Ashdod', he: 'אשדוד' },
  'نتانيا': { en: 'Netanya', he: 'נתניה' },
  'الخضيرة': { en: 'Hadera', he: 'חדרה' },
  'رام الله': { en: 'Ramallah', he: 'רמאללה' },
  'نابلس': { en: 'Nablus', he: 'שכם' },
  'الخليل': { en: 'Hebron', he: 'חברון' },
  'بيت لحم': { en: 'Bethlehem', he: 'בית לחם' },
  'جنين': { en: 'Jenin', he: "ג'נין" },
  'طولكرم': { en: 'Tulkarm', he: 'טולכרם' },
  'قلقيلية': { en: 'Qalqilya', he: 'קלקיליה' },
  'أريحا': { en: 'Jericho', he: 'יריחו' },

  // ── Generic quarter names, shared by several cities ───────────────────────
  'البلدة القديمة': { en: 'Old City', he: 'העיר העתיקה' },
  'المركز': { en: 'Centre', he: 'המרכז' },
  'المخيم': { en: 'Refugee Camp', he: 'המחנה' },
  'الحي الشرقي': { en: 'Eastern Quarter', he: 'הרובע המזרחי' },
  'الحي الغربي': { en: 'Western Quarter', he: 'הרובע המערבי' },
  'الحي الشمالي': { en: 'Northern Quarter', he: 'הרובע הצפוני' },
  'الحي الجنوبي': { en: 'Southern Quarter', he: 'הרובע הדרומי' },
  'الحي الجديد': { en: 'New Quarter', he: 'הרובע החדש' },
  'الحي القديم': { en: 'Old Quarter', he: 'הרובע הישן' },
  'المنشية': { en: 'Manshiya', he: 'מנשייה' },
  'العجمي': { en: 'Ajami', he: "עג'מי" },
  'المحطة': { en: 'The Station', he: 'התחנה' },

  // ── Jerusalem ─────────────────────────────────────────────────────────────
  'رأس العامود': { en: 'Ras al-Amud', he: 'ראס אל-עמוד' },
  'وادي الجوز': { en: 'Wadi al-Joz', he: "ואדי אל-ג'וז" },
  'الطور': { en: 'At-Tur', he: 'א-טור' },
  'سلوان': { en: 'Silwan', he: 'סילואן' },
  'الشيخ جراح': { en: 'Sheikh Jarrah', he: "שייח' ג'ראח" },
  'بيت حنينا': { en: 'Beit Hanina', he: 'בית חנינא' },
  'شعفاط': { en: 'Shuafat', he: 'שועפאט' },
  'العيسوية': { en: 'Isawiya', he: 'עיסאוויה' },
  'صور باهر': { en: 'Sur Baher', he: 'צור באהר' },
  'جبل المكبر': { en: 'Jabal Mukaber', he: "ג'בל מוכבר" },
  'باب الزاهرة': { en: 'Bab az-Zahra', he: 'באב א-זהרה' },
  'الثوري': { en: 'Abu Tor', he: 'אבו תור' },
  'أبو ديس': { en: 'Abu Dis', he: 'אבו דיס' },
  'العيزرية': { en: 'Al-Eizariya', he: 'אל-עיזריה' },
  'كفر عقب': { en: 'Kafr Aqab', he: 'כפר עקב' },
  'عناتا': { en: 'Anata', he: 'ענתא' },
  'الرام': { en: 'Ar-Ram', he: 'א-ראם' },

  // ── Tel Aviv ──────────────────────────────────────────────────────────────
  'فلورنتين': { en: 'Florentin', he: 'פלורנטין' },
  'نيفي شأنان': { en: "Neve Sha'anan", he: 'נווה שאנן' },
  'شابيرا': { en: 'Shapira', he: 'שפירא' },

  // ── Haifa ─────────────────────────────────────────────────────────────────
  'وادي النسناس': { en: 'Wadi Nisnas', he: 'ואדי ניסנאס' },
  'الحليصة': { en: 'Halisa', he: 'חליסה' },
  'عباس': { en: 'Abbas', he: 'עבאס' },
  'وادي الصليب': { en: 'Wadi Salib', he: 'ואדי סאליב' },
  'الكرمل': { en: 'Carmel', he: 'הכרמל' },
  'بات غاليم': { en: 'Bat Galim', he: 'בת גלים' },
  'الألمانية': { en: 'German Colony', he: 'המושבה הגרמנית' },

  // ── Jaffa ─────────────────────────────────────────────────────────────────
  'الجبلية': { en: 'Jabaliya', he: "ג'בליה" },
  'النزهة': { en: 'Nuzha', he: 'נוזהה' },

  // ── Nazareth ──────────────────────────────────────────────────────────────
  'الصفافرة': { en: 'Safafra', he: 'צפאפרה' },
  'كرم الصاحب': { en: 'Karm as-Sahib', he: "כרם א-סאחב" },
  'شنلر': { en: 'Schneller', he: 'שנלר' },
  'البشارة': { en: 'Annunciation', he: 'הבשורה' },
  'المطران': { en: 'Al-Mutran', he: 'אל-מוטראן' },

  // ── Acre / Beersheba ──────────────────────────────────────────────────────
  'وولفسون': { en: 'Wolfson', he: 'וולפסון' },
  'النقب': { en: 'Negev', he: 'הנגב' },

  // ── Ramallah ──────────────────────────────────────────────────────────────
  'المنارة': { en: 'Al-Manara', he: 'אל-מנארה' },
  'الطيرة': { en: 'At-Tira', he: 'א-טירה' },
  'البيرة': { en: 'Al-Bireh', he: 'אל-בירה' },
  'أم الشرايط': { en: 'Um al-Sharayet', he: 'אום א-שראיט' },
  'الإرسال': { en: 'Al-Irsal', he: 'אל-אירסאל' },
  'المصيون': { en: 'Al-Masyoun', he: 'אל-מסיון' },
  'عين منجد': { en: 'Ein Munjed', he: "עין מונג'ד" },
  'رأس الطاحونة': { en: 'Ras at-Tahouneh', he: 'ראס א-טאחונה' },

  // ── Nablus ────────────────────────────────────────────────────────────────
  'رفيديا': { en: 'Rafidia', he: 'רפידיא' },
  'رأس العين': { en: 'Ras al-Ein', he: 'ראס אל-עין' },
  'المساكن الشعبية': { en: 'Popular Housing', he: 'השיכונים העממיים' },
  'خلة العامود': { en: 'Khallet al-Amoud', he: "ח'לת אל-עמוד" },
  'المخفية': { en: 'Al-Makhfiya', he: "אל-מח'פיה" },
  'بلاطة': { en: 'Balata', he: 'בלאטה' },

  // ── Hebron ────────────────────────────────────────────────────────────────
  'عين سارة': { en: 'Ein Sara', he: 'עין סארה' },
  'رأس الجورة': { en: 'Ras al-Joura', he: "ראס אל-ג'ורה" },
  'وادي التفاح': { en: 'Wadi at-Tuffah', he: 'ואדי א-תפאח' },
  'الحرس': { en: 'Al-Haras', he: 'אל-חרס' },
  'نمرة': { en: 'Namra', he: 'נמרה' },
  'أبو الريش': { en: 'Abu al-Rish', he: 'אבו א-ריש' },

  // ── Bethlehem ─────────────────────────────────────────────────────────────
  'الدهيشة': { en: 'Dheisheh', he: 'דהיישה' },
  'عايدة': { en: 'Aida', he: 'עאידה' },
  'بيت جالا': { en: 'Beit Jala', he: "בית ג'אלה" },
  'بيت ساحور': { en: 'Beit Sahour', he: 'בית סאחור' },
  'المهد': { en: 'Nativity', he: 'המולד' },
  'القناطر': { en: 'Al-Qanater', he: 'אל-קנאטר' },

  // ── Jenin ─────────────────────────────────────────────────────────────────
  'الزبابدة': { en: 'Zababdeh', he: 'זבאבדה' },

  // ── Tulkarm ───────────────────────────────────────────────────────────────
  'إرتاح': { en: 'Irtah', he: 'אירתאח' },
  'ذنابة': { en: 'Dhinnaba', he: "ד'נאבה" },
  'شويكة': { en: 'Shweika', he: 'שוויכה' },

  // ── Jericho ───────────────────────────────────────────────────────────────
  'عين السلطان': { en: 'Ein as-Sultan', he: 'עין א-סולטאן' },
  'عقبة جبر': { en: 'Aqabat Jabr', he: "עקבת ג'בר" },
  'النويعمة': { en: "An-Nuwei'ma", he: 'א-נוויעמה' },
};

/** What to show for a place whose stored value is `ar`. */
export function placeName(ar: string, lang: string): string {
  const L = (lang || '').toLowerCase();
  const n = PLACE_NAMES[ar];
  if (!n) return ar;
  if (L.startsWith('en')) return n.en;
  if (L.startsWith('he')) return n.he;
  return ar;
}
