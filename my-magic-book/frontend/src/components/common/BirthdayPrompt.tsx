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
 *  - not a wall. There is a close button and «مش هلق», because a shop that
 *    holds a reader hostage for a date of birth loses the reader, not the date.
 *  - not repeated. Dismissing it is remembered per account, so the site does
 *    not ask again on every visit; the field stays in their profile for
 *    whenever they feel like it. They can also be asked again next year, which
 *    is what clearing the key on a new year does.
 *
 * Admins never see it: the owner opening their own dashboard does not need a
 * birthday gift from themselves.
 */
export default function BirthdayPrompt() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth() as any;
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
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
      toast.success(t('birthday.saved', 'تمام! رح نتذكّر عيد ميلادك 🎂'));
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
          {t('birthday.title', 'إيمتى عيد ميلادك؟')}
        </h2>

        <p className="font-arabic text-[#5b6478] text-sm leading-[1.9] mb-6">
          {t('birthday.desc', 'خبّرنا بتاريخ ميلادك ومنبعتلك هدية بيومه — قصة كاملة مجاناً 🎁')}
        </p>

        <input
          type="date"
          dir="ltr"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label={t('birthday.title', 'إيمتى عيد ميلادك؟')}
          className="w-full mb-5 px-4 py-3 rounded-xl border border-[#d9dee8] bg-white text-[#1b2437] text-center text-base focus:outline-none focus:border-[#D4A937] focus:ring-2 focus:ring-[#D4A937]/25 transition"
        />

        <button
          type="button"
          onClick={save}
          disabled={!date || saving}
          className="w-full py-3.5 rounded-xl bg-[#D4A937] text-[#1b2437] font-arabic font-black text-[15px] hover:bg-[#c39a2c] active:scale-[0.99] transition disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {saving ? t('birthday.saving', 'جاري الحفظ…') : t('birthday.save', 'احفظ وابعتلي الهدية')}
        </button>

        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full py-2 font-arabic text-[#8b93a5] text-xs hover:text-[#5b6478] transition"
        >
          {t('birthday.later', 'مش هلق')}
        </button>
      </div>
    </div>
  );
}
