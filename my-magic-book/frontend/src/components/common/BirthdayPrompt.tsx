import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../api/userApi';
import toast from 'react-hot-toast';

/**
 * Asks a signed-in customer for their birthday, once, the first time they open
 * the site without one on file.
 *
 * Two things it deliberately is NOT:
 *
 *  - not a wall. There is a close button and «ليس الآن», because a shop that
 *    holds a reader hostage for a date of birth loses the reader, not the date.
 *  - not repeated. Dismissing it is remembered per account, so the site does
 *    not ask again on every visit; the field stays in their profile for
 *    whenever they feel like it. They can also be asked again next year, which
 *    is what clearing the key on a new year does.
 *
 * Admins never see it: the owner opening their own dashboard does not need a
 * birthday gift from themselves.
 */
/**
 * Month names written out, per language.
 *
 * The browser's own <input type="date"> follows the BROWSER's locale, not the
 * page, so an Arabic reader was being shown "dd/mm/yyyy" and a Gregorian
 * picker in English. Three dropdowns read in the language the person chose.
 *
 * Arabic uses the Levantine names — كانون الثاني rather than يناير — because
 * that is what is said in Jerusalem, where the shop is.
 */
const MONTHS: Record<string, string[]> = {
  ar: ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'],
  he: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

/** Days in a month, so 31 February cannot be picked. */
function daysIn(month: string, year: string): number {
  const m = Number(month);
  const y = Number(year);
  if (!m) return 31;
  if (!y) return m === 2 ? 29 : [4, 6, 9, 11].includes(m) ? 30 : 31;
  return new Date(y, m, 0).getDate();
}

export default function BirthdayPrompt() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'ar').slice(0, 2);
  const isRtl = lang === 'ar' || lang === 'he';
  const monthNames = MONTHS[lang] || MONTHS.ar;
  // Oldest first would put 1926 at the top of a list a 30-year-old scrolls
  // through; newest first puts the likely years within reach.
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, i) => String(thisYear - 5 - i));
  const selectClass =
    'w-full px-2 py-3 rounded-xl border border-[#d9dee8] bg-white text-[#1b2437] font-arabic text-sm text-center ' +
    'focus:outline-none focus:border-[#D4A937] focus:ring-2 focus:ring-[#D4A937]/25 transition';
  const { user, updateUser } = useAuth() as any;
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // The three parts only become a date once all three are chosen.
  const date = day && month && year
    ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : '';
  const [saving, setSaving] = useState(false);

  const key = user?.id ? `mmb_bday_asked:${user.id}` : '';

  // ?birthday=1 forces it open for anyone signed in, admins included. The
  // owner cannot otherwise see the thing his customers see, and neither could
  // I — the dialog hides from exactly the account used to check it.
  const forced = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('birthday') === '1';

  useEffect(() => {
    if (forced && user) { setOpen(true); return; }
    if (!user || user.role === 'admin') { setOpen(false); return; }
    if (user.birthday) { setOpen(false); return; }
    let dismissed = false;
    try { dismissed = !!localStorage.getItem(key); } catch { /* private mode */ }
    if (dismissed) return;
    // A beat after arrival: a dialog that lands on top of the page as it paints
    // reads as an error, not an invitation.
    const id = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(id);
  }, [user, key, forced]);

  const dismiss = () => {
    try { localStorage.setItem(key, String(Date.now())); } catch { /* fine */ }
    setOpen(false);
  };

  const save = async () => {
    if (!date) return;
    setSaving(true);
    try {
      const res = await userApi.updateProfile({ birthday: date });
      if (!res?.success) throw new Error(res?.message);
      toast.success(t('birthday.saved', 'تم الحفظ! سنتذكّر عيد ميلادك 🎂'));
      try { localStorage.setItem(key, String(Date.now())); } catch { /* fine */ }
      setOpen(false);
      // Keep the session in step so the prompt does not reappear on navigation.
      updateUser?.({ ...user, birthday: date });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('birthday.failed', 'تعذّر الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bday-title"
      onClick={dismiss}
    >
      {/* A light card on a dimmed page, the way a site notice is normally
          shown. The rest of the site is dark, so this stands away from it
          instead of blending into the page behind. Clicking the backdrop
          closes it — a dialog you cannot get out of is a wall. */}
      <div
        className="w-full max-w-[420px] rounded-2xl bg-white shadow-2xl px-7 py-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-[#FDF3D6] flex items-center justify-center text-3xl">
          🎂
        </div>

        <h2 id="bday-title" className="font-arabic font-black text-[#1b2437] text-lg mb-3">
          {t('birthday.title', 'متى عيد ميلادك؟')}
        </h2>

        <p className="font-arabic text-[#5b6478] text-sm leading-[1.9] mb-6">
          {t('birthday.desc', 'أخبِرنا بتاريخ ميلادك ونُرسل لك هدية في يومه — قصة كاملة مجاناً 🎁')}
        </p>

        {/* Day / month / year, in the reader's own language. */}
        <div className="grid grid-cols-3 gap-2 mb-5" dir={isRtl ? 'rtl' : 'ltr'}>
          <select
            aria-label={t('birthday.day', 'يوم')}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={selectClass}
          >
            <option value="">{t('birthday.day', 'يوم')}</option>
            {Array.from({ length: daysIn(month, year) }, (_, i) => String(i + 1)).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            aria-label={t('birthday.month', 'شهر')}
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              // A day that no longer exists in the new month has to go, or
              // "31 February" quietly becomes 3 March when saved.
              if (day && Number(day) > daysIn(e.target.value, year)) setDay('');
            }}
            className={selectClass}
          >
            <option value="">{t('birthday.month', 'شهر')}</option>
            {monthNames.map((name, i) => (
              <option key={name} value={String(i + 1)}>{name}</option>
            ))}
          </select>

          <select
            aria-label={t('birthday.year', 'سنة')}
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              if (day && Number(day) > daysIn(month, e.target.value)) setDay('');
            }}
            className={selectClass}
          >
            <option value="">{t('birthday.year', 'سنة')}</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!date || saving}
          className="w-full py-3.5 rounded-xl bg-[#D4A937] text-[#1b2437] font-arabic font-black text-[15px] hover:bg-[#c39a2c] active:scale-[0.99] transition disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {saving ? t('birthday.saving', 'جارٍ الحفظ…') : t('birthday.save', 'احفظ وأرسِل لي الهدية')}
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full py-2 font-arabic text-[#8b93a5] text-xs hover:text-[#5b6478] transition"
        >
          {t('birthday.later', 'ليس الآن')}
        </button>
      </div>
    </div>
  );
}
