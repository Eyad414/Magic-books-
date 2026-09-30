// ─── ColoringBookView ────────────────────────────────────────────────────────
// Presentational coloring-book viewer: full-color front cover (with name title)
// + line-art pages + full-color back cover. Used by the admin theme preview
// (ColoringBookPage) and by the customer's finished book (StoryBookPage).
//
// Every word here used to be hardcoded Arabic, and so was dir="rtl" — so a
// customer reading the site in English opened their finished colouring book
// and found an Arabic page laid out right-to-left.

import { useTranslation } from 'react-i18next';

interface ColoringBookViewProps {
  childName: string;
  place: string;          // e.g. "حديقة الحيوانات"
  cover: string;          // display URL (front cover)
  backCover?: string;     // display URL (back cover)
  pages: string[];        // display URLs (line-art pages)
}

export default function ColoringBookView({ childName, place, cover, backCover, pages }: ColoringBookViewProps) {
  const { t, i18n } = useTranslation();
  const title = place
    ? t('coloring.title_place', { name: childName, place })
    : t('coloring.title_plain', { name: childName });
  const rtl = i18n.language === 'ar' || i18n.language === 'he';

  return (
    <div className="min-h-screen bg-[#03060e] pt-24 pb-20 px-3" dir={rtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center mb-6 no-print">
        <p className="text-gold-500 font-arabic font-bold text-sm">{t('coloring.eyebrow')}</p>
        <h1 className="text-white font-arabic font-black text-2xl mt-1">{title}</h1>
        <p className="text-white/50 font-arabic text-sm mt-1">{t('coloring.contents', { n: pages.length })}</p>
        <button
          onClick={() => window.print()}
          className="mt-4 px-6 py-2.5 rounded-xl bg-gold-500 text-[#0a1628] font-arabic font-bold hover:bg-gold-400 transition"
        >
          {t('coloring.print')}
        </button>
      </div>

      <div className="max-w-2xl mx-auto space-y-5">
        {/* FRONT cover (full color) with the child's name overlaid */}
        {cover && (
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-gold-500/30 aspect-square bg-paper">
            <img src={cover} alt={t('coloring.front_cover')} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6 text-center">
              <h2 className="text-white font-arabic font-black text-4xl sm:text-5xl drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] leading-tight">{title}</h2>
              <p className="text-gold-300 font-arabic text-base mt-2">{t('coloring.cover_caption')}</p>
            </div>
          </div>
        )}

        {/* Line-art pages (no text) */}
        {pages.map((src, i) => (
          <div key={i} className="relative rounded-2xl overflow-hidden bg-paper shadow-xl aspect-square">
            <img src={src} alt={t('coloring.page_alt', { n: i + 1 })} className="w-full h-full object-contain" loading="lazy" />
            <span className="absolute bottom-2 left-3 text-[#333] text-xs font-bold bg-white/80 rounded-full px-2 py-0.5 border border-gold-500/30">
              {i + 1}
            </span>
          </div>
        ))}

        {/* BACK cover (full color), after the last page */}
        {backCover && (
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-gold-500/30 aspect-square bg-paper">
            <img src={backCover} alt={t('coloring.back_cover')} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 text-center">
              <p className="text-white font-arabic font-black text-xl drop-shadow-lg">{t('coloring.well_done', { name: childName })}</p>
              <p className="text-gold-300 font-arabic text-sm mt-1">{t('coloring.finished')}</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
