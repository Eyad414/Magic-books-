import { useEffect, useState } from 'react';
import { X, ExternalLink, FileText, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { objectPathToUrl } from '../../api/mediaUrl';

/**
 * The two PDFs, before they are printed.
 *
 * Sending to BookPod is real money and a real parcel, and the only way to look
 * at what was about to be sent was to download a folder and open it. The card
 * already had "عرض القصة للمراجعة", but that renders the story as web pages —
 * not the cover and interior files the printer receives, which is where a
 * wrong trim, a missing spine or a bad page order would actually show up.
 *
 * These are the same two objects BookPodService downloads and submits, so what
 * is on screen here is what gets printed.
 */

/** A stored print URL, or a bare object path, as a URL the browser can open. */
function viewUrl(stored?: string): string {
  if (!stored) return '';
  try {
    const u = new URL(stored, window.location.origin);
    const p = u.searchParams.get('path');
    // Rebuilt from the object path so links stored before RENDER_EXTERNAL_URL
    // (which pointed at localhost) still resolve. No `download=1`: that sets
    // Content-Disposition and the browser saves the file instead of showing it.
    return p ? objectPathToUrl(p) : stored;
  } catch {
    return objectPathToUrl(stored);
  }
}

export interface PrintPreviewProps {
  interior?: string;
  cover?: string;
  childName?: string;
  onClose: () => void;
}

export function PrintPreview({ interior, cover, childName, onClose }: PrintPreviewProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'interior' | 'cover'>('interior');
  // A print interior runs to about 17MB, which is several seconds of nothing
  // on a blank frame — long enough to read as broken and get clicked again.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const src = viewUrl(tab === 'interior' ? interior : cover);
  useEffect(() => { setLoading(true); }, [src]);
  const has = { interior: !!interior, cover: !!cover };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl h-[90vh] flex flex-col glass-card p-4 border-gold-500/30 animate-scale-in">

        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-arabic font-black text-white text-lg">
            {t('admin.print_preview_title', 'معاينة ملفات الطباعة')}
            {childName && <span className="text-white/45 font-bold text-sm"> — {childName}</span>}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t('common.close', 'إغلاق')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="font-arabic text-white/50 text-xs mb-3 bg-gold-500/10 border border-gold-500/20 rounded-xl px-3 py-2">
          ⚠️ {t('admin.print_preview_note', 'هذه نفس الملفات التي تُرسل إلى BookPod للطباعة. راجعها قبل الإرسال — الطباعة حقيقية ومدفوعة.')}
        </p>

        <div className="flex items-center gap-2 mb-3" dir="rtl">
          <button
            type="button"
            onClick={() => setTab('interior')}
            disabled={!has.interior}
            className={`px-3 py-1.5 rounded-xl font-arabic text-xs font-bold border transition-all disabled:opacity-40 ${
              tab === 'interior' ? 'bg-gold-500/20 border-gold-500/50 text-gold-400' : 'border-white/15 text-white/60 hover:text-white'}`}
          >
            <BookOpen className="w-3.5 h-3.5 inline -mt-0.5 me-1" />
            {t('admin.print_interior', 'الداخل')}
          </button>
          <button
            type="button"
            onClick={() => setTab('cover')}
            disabled={!has.cover}
            className={`px-3 py-1.5 rounded-xl font-arabic text-xs font-bold border transition-all disabled:opacity-40 ${
              tab === 'cover' ? 'bg-gold-500/20 border-gold-500/50 text-gold-400' : 'border-white/15 text-white/60 hover:text-white'}`}
          >
            <FileText className="w-3.5 h-3.5 inline -mt-0.5 me-1" />
            {t('admin.print_cover', 'الغلاف')}
          </button>
          {src && (
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="ms-auto px-3 py-1.5 rounded-xl font-arabic text-xs font-bold border border-white/15 text-white/60 hover:text-gold-400 hover:border-gold-500/40 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 inline -mt-0.5 me-1" />
              {t('admin.print_open_tab', 'فتح في تبويب جديد')}
            </a>
          )}
        </div>

        <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden bg-white/5 border border-white/10">
          {src ? (
            <>
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-dark-800/70 pointer-events-none">
                  <div className="w-7 h-7 rounded-full border-2 border-gold-500/30 border-t-gold-500 animate-spin" />
                  <span className="font-arabic text-white/55 text-xs">
                    {t('admin.print_preview_loading', 'جاري تحميل الملف… (ملف الداخل كبير، قد يأخذ لحظات)')}
                  </span>
                </div>
              )}
              {/* A PDF the browser renders itself, so page navigation and zoom
                  come free — which is what reviewing 28 pages actually needs. */}
              <iframe
                src={src}
                title={t('admin.print_preview_title', 'معاينة ملفات الطباعة')}
                className="w-full h-full"
                onLoad={() => setLoading(false)}
              />
            </>
          ) : (
            <div className="h-full flex items-center justify-center font-arabic text-white/40 text-sm text-center px-6">
              {t('admin.print_preview_missing', 'لا يوجد ملف لهذا الجزء بعد — اضغط «إعادة تجهيز الملفات» أولاً (مجاني).')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
