import { useEffect, useRef, useState } from 'react';
import { Sparkles, Lock, ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { storyApi } from '../../api/storyApi';
import { toDisplayUrl } from '../../api/mediaUrl';
import { resolveGender, applyGenderTokens } from '../../utils/gender';
import { localizeName } from '../../utils/translit';

interface Props {
  childName: string;
  childGender: string;
  childPhotoUrl: string;
  theme: string;
  /** The book's language — the cover prompt renders the name in it. */
  language: string;
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
export default function CoverPreview({ childName, childGender, childPhotoUrl, theme, language, enabled }: Props) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [cover, setCover] = useState('');
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // A fresh theme means the shown cover no longer matches the selection.
  useEffect(() => { setCover(''); setError(''); }, [theme, language]);

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
      const res = await storyApi.coverPreview({ childName, childGender, childPhotoUrl, theme, language });
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

  // The exact title the printed cover carries: the theme's story title with the
  // child's name and gender tokens resolved.
  // The BOOK's language, not the site's — this title has to match the cover the
  // server renders, and that one follows `language`. Reading i18n.language here
  // meant an English UI showed "Ayad" over a cover printed "اياد".
  const displayName = localizeName(childName || '', language);
  const gender = resolveGender(childName, childGender === 'female' ? 'female' : 'male');
  // …and the TITLE has to come from that same language. t() reads the site's
  // language, so an English site over an Arabic book pulled the English title
  // and dropped the Arabic name into it — «وهيب's Adventure in Building», which
  // the bidi algorithm then scrambles on screen. Asking for the book's `lng`
  // keeps the whole line in one language.
  const rawTitle = (t(`stories.${theme.replace(/_(real|photoreal|cartoon|pr|hd)$/, '')}.title`, {
    defaultValue: '',
    lng: language,
  }) as string) || '';
  const storyTitle = applyGenderTokens(rawTitle.replace(/\[NAME\]/gi, displayName), gender);

  const remaining = quota ? Math.max(0, quota.limit - quota.used) : null;
  const stage =
    pct < 30 ? t('cover_preview.stage_1', '✨ نحضّر الفانوس السحري…')
    : pct < 60 ? t('cover_preview.stage_2', '🎨 نرسم ملامح طفلك…')
    : pct < 90 ? t('cover_preview.stage_3', '🌟 نضيف اللمسات الأخيرة…')
    : t('cover_preview.stage_4', '📖 غلافك جاهز تقريباً!');

  return (
    <div className="rounded-2xl border border-gold-500/25 bg-gold-500/[0.04] p-4 text-center">
      <div className="flex flex-col items-center gap-1">
        <h4 className="font-arabic font-bold text-white text-sm flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-gold-500" />
          {t('cover_preview.title', 'شاهد طفلك على الغلاف')}
        </h4>
        <p className="font-arabic text-white/45 text-xs max-w-sm">
          {t('cover_preview.help', 'سننشئ غلاف القصة بوجه طفلك — قد يستغرق حتى دقيقة.')}
        </p>
      </div>


      {cover && (
        /* Rendered exactly like the printed FrontCover: a square, full-bleed
           illustration with a readability scrim, the story title and the brand
           line — so what the customer sees here IS the cover they receive. */
        <div className="my-4 flex justify-center">
          <div
            className="relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden shadow-[0_18px_50px_rgba(0,0,0,0.55)] border border-gold-500/25"
            style={{ background: '#0a1426' }}
            dir={i18n.dir()}
          >
            <img src={cover} alt={storyTitle} className="absolute inset-0 w-full h-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(5,10,21,0.94) 0%, rgba(5,10,21,0.10) 46%, rgba(5,10,21,0.42) 100%)' }}
            />
            <div className="absolute inset-x-0 bottom-0 px-3.5 pb-3 text-center">
              {storyTitle && (
                <h3 className="font-arabic font-black text-white text-[13px] leading-snug drop-shadow-lg mb-2 line-clamp-2">
                  {storyTitle}
                </h3>
              )}
              <div className="flex items-center justify-center gap-1.5">
                <img src="/logo.png?v=7" alt="" className="w-5 h-5 object-contain" />
                <div className="flex flex-col items-start leading-none">
                  <span className="font-brand text-gold-500 text-[10px] tracking-wide">Magic Fanoos</span>
                  <span className="font-arabic text-white/45 text-[7px] mt-0.5">
                    {t('storybook.cover_brand_tag', 'قصة بتصميم شخصي من Magic Fanoos')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div className="my-4 flex flex-col items-center" role="status" aria-live="polite">
          {/* Placeholder in the SAME square as the finished cover, so the panel
              doesn't jump when the image arrives. */}
          {!cover && (
            <div className="cp-skeleton relative w-full max-w-[260px] aspect-square rounded-2xl overflow-hidden border border-gold-500/25 mb-3 flex items-center justify-center">
              <span className="text-3xl animate-pulse">🏮</span>
            </div>
          )}
          <div className="w-full max-w-[260px]">
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
          <style>{`
            .cp-skeleton {
              background: linear-gradient(110deg, #0c1830 25%, #16264a 42%, #0c1830 60%);
              background-size: 260% 100%;
              animation: cp-shimmer 1.5s linear infinite;
            }
            @keyframes cp-shimmer { from { background-position: 180% 0; } to { background-position: -80% 0; } }
          `}</style>
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
          className="mt-3 mx-auto w-full max-w-[260px] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-500/15 border border-gold-500/40 text-gold-400 font-arabic font-bold text-sm hover:bg-gold-500/25 transition-all disabled:opacity-50 disabled:cursor-wait"
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
