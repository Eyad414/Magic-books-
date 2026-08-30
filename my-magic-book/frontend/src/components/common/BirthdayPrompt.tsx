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

  useEffect(() => {
    if (!user || user.role === 'admin') { setOpen(false); return; }
    if (user.birthday) { setOpen(false); return; }
    let dismissed = false;
    try { dismissed = !!localStorage.getItem(key); } catch { /* private mode */ }
    if (dismissed) return;
    // A beat after arrival: a dialog that lands on top of the page as it paints
    // reads as an error, not an invitation.
    const id = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(id);
  }, [user, key]);

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-[#0d1b2e] border border-gold-500/25 shadow-2xl p-6 text-center">
        <div className="text-4xl mb-2">🎂</div>
        <h2 className="font-arabic font-black text-white text-lg mb-1">
          {t('birthday.title', 'إيمتى عيد ميلادك؟')}
        </h2>
        <p className="font-arabic text-white/55 text-sm mb-5 leading-relaxed">
          {t('birthday.desc', 'خبّرنا بتاريخ ميلادك ومنبعتلك هدية بيومه — قصة كاملة مجاناً 🎁')}
        </p>

        <input
          type="date"
          dir="ltr"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="magic-input w-full text-center mb-4"
        />

        <button
          type="button"
          onClick={save}
          disabled={!date || saving}
          className="w-full py-3 rounded-xl bg-gold-500 text-[#0a1628] font-arabic font-black hover:bg-gold-400 transition disabled:opacity-50"
        >
          {saving ? t('birthday.saving', 'جاري الحفظ…') : t('birthday.save', 'احفظ وابعتلي الهدية')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full py-2 font-arabic text-white/40 text-xs hover:text-white/70 transition"
        >
          {t('birthday.later', 'مش هلق')}
        </button>
      </div>
    </div>
  );
}
