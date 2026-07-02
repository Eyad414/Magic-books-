// ─── ColoringBookView ────────────────────────────────────────────────────────
// Presentational coloring-book viewer: full-color front cover (with name title)
// + line-art pages + full-color back cover. Used by the admin theme preview
// (ColoringBookPage) and by the customer's finished book (StoryBookPage).

interface ColoringBookViewProps {
  childName: string;
  place: string;          // e.g. "حديقة الحيوانات"
  cover: string;          // display URL (front cover)
  backCover?: string;     // display URL (back cover)
  pages: string[];        // display URLs (line-art pages)
}

export default function ColoringBookView({ childName, place, cover, backCover, pages }: ColoringBookViewProps) {
  const title = place ? `مغامرة ${childName} في ${place}` : `كتاب تلوين ${childName}`;

  return (
    <div className="min-h-screen bg-[#03060e] pt-24 pb-20 px-3" dir="rtl">
      {/* Header */}
      <div className="max-w-2xl mx-auto text-center mb-6 no-print">
        <p className="text-gold-500 font-arabic font-bold text-sm">🖍️ كتاب تلوين</p>
        <h1 className="text-white font-arabic font-black text-2xl mt-1">{title}</h1>
        <p className="text-white/50 font-arabic text-sm mt-1">غلاف أمامي · {pages.length} صفحة للتلوين · غلاف خلفي</p>
        <button
          onClick={() => window.print()}
          className="mt-4 px-6 py-2.5 rounded-xl bg-gold-500 text-[#0a1628] font-arabic font-bold hover:bg-gold-400 transition"
        >
          🖨️ اطبع كتاب التلوين
        </button>
      </div>

      <div className="max-w-2xl mx-auto space-y-5">
        {/* FRONT cover (full color) with the child's name overlaid */}
        {cover && (
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-gold-500/30 aspect-square bg-white">
            <img src={cover} alt="front cover" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6 text-center">
              <h2 className="text-white font-arabic font-black text-4xl sm:text-5xl drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)] leading-tight">{title}</h2>
              <p className="text-gold-300 font-arabic text-base mt-2">🖍️ كتاب تلوين · Magic Fanoos</p>
            </div>
          </div>
        )}

        {/* Line-art pages (no text) */}
        {pages.map((src, i) => (
          <div key={i} className="relative rounded-2xl overflow-hidden bg-white shadow-xl aspect-square">
            <img src={src} alt={`صفحة ${i + 1}`} className="w-full h-full object-contain" loading="lazy" />
            <span className="absolute bottom-2 left-3 text-[#333] text-xs font-bold bg-white/80 rounded-full px-2 py-0.5 border border-gold-500/30">
              {i + 1}
            </span>
          </div>
        ))}

        {/* BACK cover (full color), after the last page */}
        {backCover && (
          <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-gold-500/30 aspect-square bg-white">
            <img src={backCover} alt="back cover" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 text-center">
              <p className="text-white font-arabic font-black text-xl drop-shadow-lg">🌟 أحسنت يا {childName}!</p>
              <p className="text-gold-300 font-arabic text-sm mt-1">لقد أكملت كتاب التلوين · Magic Fanoos</p>
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
