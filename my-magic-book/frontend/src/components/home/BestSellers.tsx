import { useState, useEffect, useMemo } from 'react';
import { Star, TrendingUp, Eye, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../../api/publicApi';
import { toDisplayUrl } from '../../api/mediaUrl';
import { localizeName } from '../../utils/translit';
import FlipbookPreview, { buildThemePreview } from '../wizard/FlipbookPreview';

// Some themes reuse another theme's scripted story text (mirrors Stories page).
const TEXT_THEME: Record<string, string> = { space_real: 'space' };
const textThemeFor = (id: string) => TEXT_THEME[id] || id;

export default function BestSellers() {
  const { t, i18n } = useTranslation();

  // Live themes (for the real generated front-cover images).
  const [themes, setThemes] = useState<Record<string, any>>({});
  // The story currently open in the preview modal (same UX as the Stories page).
  const [selected, setSelected] = useState<any>(null);
  useEffect(() => {
    publicApi.getSettings()
      .then((res) => {
        const map: Record<string, any> = {};
        for (const th of (res?.settings?.themes || [])) map[th.id] = th;
        setThemes(map);
      })
      .catch(() => {});
  }, []);

  // The showcase stories. themeId points at a real demo theme so we can show its
  // generated cover; name is the demo child. Cards c/d are placeholders the
  // owner can swap for the newest themes.
  const bestSellers = [
    { id: 1, themeId: 'zoo_adventure', name: 'Baha', emoji: '🦁', rating: 4.9, reviews: 128, tag: t('bestsellers.tag_best_seller'), colors: ['#33691e', '#558b2f'] },
    { id: 2, themeId: 'space', name: 'Liam', emoji: '🚀', rating: 4.8, reviews: 94, tag: t('bestsellers.tag_new'), colors: ['#1a237e', '#311b92'], coverPath: 'magic-fanoose/generated/6a43cbf500c3ecaed9218b3c/page-00.png' },
    { id: 3, themeId: 'school_coloring', name: 'Yosef', emoji: '🎒', rating: 5.0, reviews: 76, tag: t('bestsellers.tag_featured'), colors: ['#4a148c', '#6a1b9a'] },
    { id: 4, themeId: 'space_coloring', name: 'Sara', emoji: '🎨', rating: 4.7, reviews: 61, tag: '', colors: ['#006064', '#00838f'] },
  ];

  // Build the 30%-readable flipbook preview for the selected card (rest is locked).
  const previewPages = useMemo(() => {
    if (!selected) return [];
    const theme = themes[selected.themeId];
    const cover = selected.coverPath ? toDisplayUrl(selected.coverPath)
      : theme?.generatedCover ? toDisplayUrl(theme.generatedCover) : '';
    return buildThemePreview({
      theme: textThemeFor(selected.themeId),
      language: i18n.language as any,
      childName: selected.name,
      coverImage: cover,
      pageImages: (theme?.generatedImages || []).map(toDisplayUrl),
      i18n,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, themes, i18n.language]);

  return (
    <>
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-500 font-arabic text-sm mb-4">
              <TrendingUp className="w-4 h-4" />
              <span>{t('bestsellers.badge')}</span>
            </div>
            <h2 className="font-arabic font-black text-white">
              {t('bestsellers.stories')} <span className="shimmer-text">{t('bestsellers.kids_love')}</span>
            </h2>
          </div>
          <Link to="/stories" className="font-arabic text-gold-500 text-sm hover:underline hidden sm:block">
            {t('bestsellers.view_all')}
          </Link>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bestSellers.map((book) => {
            const theme = themes[book.themeId];
            // Prefer an explicit cover (a specific generated story) over the theme's cover.
            const cover = (book as any).coverPath ? toDisplayUrl((book as any).coverPath)
              : theme?.generatedCover ? toDisplayUrl(theme.generatedCover) : '';
            const themeLabel = t(`step2.theme_${book.themeId}`, { defaultValue: theme?.label || '' });
            const desc = t(`step2.theme_${book.themeId}_desc`, { defaultValue: theme?.desc || '' });
            return (
              <div key={book.id} className="glass-card glass-card-hover p-0 overflow-hidden">
                {/* Front cover — the real generated illustration, with an emoji
                    fallback behind it (shown if the cover is missing or fails). */}
                <div
                  className="h-48 relative overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${book.colors[0]}, ${book.colors[1]})` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl animate-float">{book.emoji}</span>
                  </div>
                  {cover && (
                    <img
                      src={cover}
                      alt={book.name}
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 pointer-events-none" />
                  {book.tag && (
                    <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-gold-500 text-dark-900 font-arabic font-bold text-xs">
                      {book.tag}
                    </div>
                  )}
                  {/* Preview (eye) — opens the same 30%-readable flipbook as the Stories page */}
                  <button
                    type="button"
                    onClick={() => setSelected(book)}
                    aria-label={t('step2.book_preview_label', 'معاينة الكتاب')}
                    className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-dark-900/70 backdrop-blur border border-white/15 text-gold-500 hover:bg-gold-500 hover:text-dark-900 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="font-arabic text-xs font-bold">{t('step2.book_preview_label', 'معاينة الكتاب')}</span>
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-arabic font-bold text-white text-lg mb-0.5">
                    {t('stories_page.story_title', { name: localizeName(book.name, i18n.language) })}
                  </h3>
                  {themeLabel && <p className="font-arabic text-gold-500 text-xs mb-2">{themeLabel}</p>}
                  {desc && <p className="font-arabic text-white/50 text-xs mb-3 leading-relaxed line-clamp-2">{desc}</p>}

                  <div className="flex items-center justify-start">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-gold-500 fill-gold-500" />
                      <span className="text-gold-500 font-bold text-sm">{book.rating}</span>
                      <span className="text-white/30 text-xs">({book.reviews})</span>
                    </div>
                  </div>

                  <Link
                    to="/create"
                    id={`bestseller-cta-${book.id}`}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gold-500/10 border border-gold-500/30 text-gold-500 font-arabic font-bold text-sm hover:bg-gold-500/20 transition-all"
                  >
                    {t('bestsellers.order_custom')} ✨
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>

    {/* Illustrated book preview modal — 30% readable, the rest locked (same as Stories) */}
    {selected && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in text-center">
        <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-md" onClick={() => setSelected(null)} />
        <div className="relative w-full max-w-4xl glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-dark-900/95 p-6 md:p-8 pt-10">
          <button onClick={() => setSelected(null)} className="absolute top-4 left-4 p-2 rounded-full bg-white/5 hover:bg-gold-500 hover:text-dark-900 text-white/50 transition-all z-20">
            <X className="w-6 h-6" />
          </button>
          <div className="mb-2">
            <h3 className="font-arabic font-black text-white text-2xl">
              <span className="text-gold-500">{t('stories_page.story_title', { name: localizeName(selected.name, i18n.language) })}</span>
            </h3>
            <p className="font-arabic text-white/50 text-sm mt-2 flex items-center justify-center gap-2">
              <Eye className="w-4 h-4 text-gold-500" />
              {t('stories_page.modal_desc')}
            </p>
          </div>
          <div className="my-6 flex justify-center">
            <FlipbookPreview pages={previewPages} language={i18n.language as any} />
          </div>
          <div className="flex justify-center mt-4">
            <Link to="/create" onClick={() => setSelected(null)} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-lg hover:shadow-gold-glow hover:-translate-y-1 transition-all">
              {t('stories_page.modal_cta')}
            </Link>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
