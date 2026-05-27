// ─── AdminBookGuard ───────────────────────────────────────────────────────────
// Guards the /book route:
//   • Admin (eyadat720@gmail.com or role=admin) → always full access
//   • Regular customer → only if they have a PAID order with ebook or pro package
//     for the specific story in the URL (:storyId param)
//   • Everyone else → redirect to /login or show "upgrade" screen

import { useState, useEffect, type ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderApi } from '../../api/orderApi';

const ADMIN_EMAIL = 'eyadat720@gmail.com';

interface AdminBookGuardProps {
  children: ReactNode;
}

export default function AdminBookGuard({ children }: AdminBookGuardProps) {
  const { user, isLoading } = useAuth();
  const { storyId } = useParams<{ storyId?: string }>();

  const [accessChecked, setAccessChecked] = useState(false);
  const [hasEbookAccess, setHasEbookAccess] = useState(false);

  const isAdmin = user?.email === ADMIN_EMAIL || user?.role === 'admin';

  useEffect(() => {
    // Admin always has access — skip the API check
    if (isAdmin) {
      setHasEbookAccess(true);
      setAccessChecked(true);
      return;
    }

    // Demo story IDs (non-MongoDB) — admin-only
    if (!storyId || !storyId.match(/^[a-f\d]{24}$/i)) {
      setHasEbookAccess(false);
      setAccessChecked(true);
      return;
    }

    if (!user) {
      setAccessChecked(true);
      return;
    }

    orderApi.getStoryAccess(storyId)
      .then((res) => {
        setHasEbookAccess(res.hasEbook);
      })
      .catch(() => setHasEbookAccess(false))
      .finally(() => setAccessChecked(true));
  }, [isAdmin, user, storyId]);

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading || !accessChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-full border-4 border-gold-500/30 border-t-gold-500 animate-spin"
            aria-label="جارٍ التحقق من الصلاحيات..."
          />
          <p className="font-arabic text-white/50 text-sm">جارٍ التحقق…</p>
        </div>
      </div>
    );
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ── Admin — full access ───────────────────────────────────────────────────
  if (isAdmin) {
    return <>{children}</>;
  }

  // ── Customer with ebook/pro order — full access ───────────────────────────
  if (hasEbookAccess) {
    return <>{children}</>;
  }

  // ── Customer without ebook package — show upgrade prompt ──────────────────
  return (
    <div className="min-h-screen bg-[#03060e] flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-card p-10 text-center space-y-6 border border-gold-500/20">
        <div className="text-6xl">🔒</div>
        <h1 className="font-arabic font-black text-white text-2xl">
          الكتاب الإلكتروني مقفل
        </h1>
        <p className="font-arabic text-white/60 text-sm leading-relaxed">
          للوصول إلى نسخة الكتاب الرقمية، يجب شراء باقة <strong className="text-gold-500">الكتاب الإلكتروني</strong> أو باقة <strong className="text-gold-500">Pro</strong>.
        </p>
        <div className="bg-gold-500/10 border border-gold-500/30 rounded-2xl p-5 text-right space-y-2">
          <p className="font-arabic text-gold-500 font-bold text-sm">✨ باقة Pro — 120 ₪</p>
          <p className="font-arabic text-white/50 text-xs">كتاب ملوّن + كتاب إلكتروني + كتاب صوتي + كتاب تلوين</p>
          <p className="font-arabic text-gold-500 font-bold text-sm mt-2">📱 باقة الكتاب الإلكتروني — 20 ₪</p>
          <p className="font-arabic text-white/50 text-xs">قراءة القصة على أي جهاز</p>
        </div>
        <a
          href="/create"
          className="block w-full py-3.5 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-base hover:shadow-gold-glow transition-all"
        >
          ✨ ابدأ قصة جديدة مع الباقة المناسبة
        </a>
      </div>
    </div>
  );
}
