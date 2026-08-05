import { useEffect, useRef, useState } from 'react';
import { Sparkles, Lock, ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { storyApi } from '../../api/storyApi';
import { toDisplayUrl } from '../../api/mediaUrl';

interface Props {
  childName: string;
  childGender: string;
  childPhotoUrl: string;
  theme: string;
  /** Signed-in customers only — generating costs an AI image. */
  enabled: boolean;
}

/** Roughly how long one cover takes; the bar paces itself against this. */
const EXPECTED_MS = 22000;

/**
 * "See your child on the cover" — renders the real front cover with the kid's
 * face before checkout. Generation is behind an explicit button: each press
 * costs a Gemini image, so browsing themes must never trigger one.
 */
export default function CoverPreview({ childName, childGender, childPhotoUrl, theme, enabled }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [cover, setCover] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // A fresh theme means the shown cover no longer matches the selection.
  useEffect(() => { setCover(''); setError(''); }, [theme]);

  useEffect(() => {
    if (!enabled) return;
    storyApi.coverPreviewQuota()
      .then((r) => setQuota({ used: r.used, limit: r.limit }))
      .catch(() => {});
  }, [enabled]);

  useEffect(() => () => window.clearInterval(timer.current), []);

  /* The bar climbs toward 90% on a curve — fast at first, then easing off — so
     it keeps moving without ever implying the image is done. Only a real
     response takes it to 100%. */
  const startBar = () => {
    const started = Date.now();
    setPct(0);
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const ratio = Math.min(1, (Date.now() - started) / EXPECTED_MS);
      setPct(Math.round(90 * (1 - Math.pow(1 - ratio, 2.2))));
    }, 120);
  };

  const finishBar = () => {
    window.clearInterval(timer.current);
    setPct(100);
    window.setTimeout(() => setBusy(false), 450);
  };

  const generate = async () => {
    if (busy) return;
    setError(''); setBlocked(false); setBusy(true); startBar();
    try {
      const res = await storyApi.coverPreview({ childName, childGender, childPhotoUrl, theme });
      setCover(res.objectPath ? toDisplayUrl(res.objectPath) : res.signedUrl || '');
      if (typeof res.used === 'number') setQuota({ used: res.used, limit: res.limit });
      finishBar();
    } catch (err: any) {
      window.clearInterval(timer.current);
      setPct(0);
      setBusy(false);
      const data = err?.response?.data;
      if (data?.limitReached) {
        setBlocked(true);
        setQuota({ used: data.used, limit: data.limit });
      }
      setError(data?.message || t('cover_preview.error', 'تعذّر إنشاء الغلاف، حاول مرة أخرى'));
    }
  };

  if (!enabled) return null;

  const remaining = quota ? Math.max(0, quota.limit - quota.used) : null;
  const stage =
    pct < 30 ? t('cover_preview.stage_1', '✨ نحضّر الفانوس السحري…')
    : pct < 60 ? t('cover_preview.stage_2', '🎨 نرسم ملامح طفلك…')
    : pct < 90 ? t('cover_preview.stage_3', '🌟 نضيف اللمسات الأخيرة…')
    : t('cover_preview.stage_4', '📖 غلافك جاهز تقريباً!');

  return (
    <div className="rounded-2xl border border-gold-500/25 bg-gold-500/[0.04] p-4">
      <div className="flex items-start gap-2 mb-1">
        <ImageIcon className="w-4 h-4 text-gold-500 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-arabic font-bold text-white text-sm">
            {t('cover_preview.title', 'شاهد طفلك على الغلاف')}
          </h4>
          <p className="font-arabic text-white/45 text-xs mt-0.5">
            {t('cover_preview.help', 'سننشئ غلاف القصة بوجه طفلك — قد يستغرق حتى دقيقة.')}
          </p>
        </div>
      </div>

      {cover && (
        <div className="my-3 flex justify-center">
          <img
            src={cover}
            alt={t('cover_preview.title', 'شاهد طفلك على الغلاف')}
            className="w-48 rounded-xl border-2 border-gold-500/40 shadow-gold-glow"
          />
        </div>
      )}

      {busy && (
        <div className="my-3" role="status" aria-live="polite">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-arabic text-gold-400 text-xs font-bold">{stage}</span>
            <span className="font-mono text-gold-500 text-xs font-bold">{pct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-l from-gold-400 via-amber-300 to-gold-500 transition-[width] duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="font-arabic text-white/35 text-[11px] mt-1.5">
            {t('cover_preview.wait_note', 'لا تغلق الصفحة — الرسم قيد التنفيذ.')}
          </p>
        </div>
      )}

      {error && (
        <p className={`font-arabic text-xs mt-2 leading-relaxed ${blocked ? 'text-amber-300' : 'text-red-400'}`}>
          {blocked ? <Lock className="w-3.5 h-3.5 inline ml-1" /> : null}{error}
        </p>
      )}

      {!blocked && (
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-500/15 border border-gold-500/40 text-gold-400 font-arabic font-bold text-sm hover:bg-gold-500/25 transition-all disabled:opacity-50 disabled:cursor-wait"
        >
          <Sparkles className="w-4 h-4" />
          {busy
            ? t('cover_preview.generating', 'جاري إنشاء الغلاف…')
            : cover
              ? t('cover_preview.again', 'أنشئ غلافاً جديداً')
              : t('cover_preview.cta', 'شاهد غلاف طفلك')}
        </button>
      )}

      {remaining !== null && !blocked && (
        <p className="font-arabic text-white/35 text-[11px] mt-1.5 text-center">
          {t('cover_preview.remaining', 'متبقٍ لك {n} معاينات مجانية').replace('{n}', String(remaining))}
        </p>
      )}
    </div>
  );
}
