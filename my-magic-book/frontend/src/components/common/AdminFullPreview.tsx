import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/**
 * Admin-only "read the whole showcase book" mode. Active only when a logged-in
 * admin visits with ?preview=full — so visitors always keep the paywall lock.
 * Triggered from the admin dashboard's Stories tab.
 */
export function useAdminFullPreview(): boolean {
  const { user } = useAuth();
  const [params] = useSearchParams();
  return user?.role === 'admin' && params.get('preview') === 'full';
}

/** Floating badge shown while full-preview is active, with an explicit close. */
export function AdminFullPreviewBadge() {
  const full = useAdminFullPreview();
  const [params, setParams] = useSearchParams();
  const { t } = useTranslation();
  if (!full) return null;
  const exit = () => {
    const p = new URLSearchParams(params);
    p.delete('preview');
    setParams(p, { replace: true });
  };
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-full bg-dark-900/90 backdrop-blur border border-gold-500/40 shadow-lg">
      <Eye className="w-4 h-4 text-gold-500" />
      <span className="font-arabic text-sm text-white/90">
        {t('admin.full_preview_active', 'معاينة كاملة (أدمن) — بدون قفل')}
      </span>
      <button
        onClick={exit}
        className="flex items-center gap-1 ms-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 font-arabic text-xs transition-colors"
      >
        <X className="w-3.5 h-3.5" /> {t('admin.full_preview_exit', 'إغلاق')}
      </button>
    </div>
  );
}
