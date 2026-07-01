import { useState, useEffect, useMemo } from 'react';
import { Star, Lock, BookOpen, Eye, X, Heart } from 'lucide-react';
import FlipbookPreview, { buildThemePreview } from '../components/wizard/FlipbookPreview';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStoryProgress } from '../context/StoryProgressContext';
import { publicApi } from '../api/publicApi';
import { toDisplayUrl } from '../api/mediaUrl';
import toast from 'react-hot-toast';

// Demo child per theme, so titles read like "Baha's adventure in the zoo".
const DEMO_NAME: Record<string, string> = {
  zoo_adventure: 'Baha',
  space: 'Liam',
  space_real: 'Noor',
  zoo_coloring: 'Lora',
  space_coloring: 'Yara',
  school_coloring: 'Sara',
  school_hero: 'Sara',
};

export default function Stories() {
  const [themes, setThemes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const { t, i18n } = useTranslation();
  const { resetProgress } = useStoryProgress();
  const navigate = useNavigate();

  useEffect(() => {
    publicApi.getSettings()
      .then((res) => {
        // Only real, generated demo stories (those that have a cover image).
        const list = (res?.settings?.themes || []).filter((th: any) => th.generatedCover);
        setThemes(list);
      })
      .catch(() => {});
    const saved = localStorage.getItem('favorite_stories');
    if (saved) { try { setFavorites(JSON.parse(saved)); } catch { /* ignore */ } }
  }, []);

  const ft = useMemo(() => i18n.getFixedT(i18n.language), [i18n.language]);
  const nameFor = (id: string) => DEMO_NAME[id] || 'Baha';

  // Story title, e.g. "مغامرة بهاء في الفضاء" / "Baha's Adventure in Space".
  const titleFor = (theme: any) => {
    const raw = (ft(`stories.${theme.id}.title`, '') as string) || '';
    if (raw) return raw.replace(/\[NAME\]/gi, nameFor(theme.id));
    const label = ft(`step2.theme_${theme.id}`, { defaultValue: theme.label || theme.id }) as string;
    return `${nameFor(theme.id)} — ${label}`;
  };

  // Explainer = the first 3 scripted story pages (falls back to the theme desc).
  const explainerFor = (theme: any) => {
    const pagesObj = ft(`stories.${theme.id}.pages`, { returnObjects: true }) as any;
    if (pagesObj && typeof pagesObj === 'object') {
      const keys = Object.keys(pagesObj).sort((a, b) => Number(a) - Number(b)).slice(0, 3);
      const txt = keys.map((k) => pagesObj[k]).join(' ').replace(/\[NAME\]/gi, nameFor(theme.id)).trim();
      if (txt) return txt;
    }
    return ft(`step2.theme_${theme.id}_desc`, { defaultValue: theme.desc || '' }) as string;
  };

  const toggleFavorite = (id: string) => {
    const isFav = favorites.includes(id);
    const next = isFav ? favorites.filter((f) => f !== id) : [...favorites, id];
    setFavorites(next);
    localStorage.setItem('favorite_stories', JSON.stringify(next));
    toast.success(isFav ? t('stories_page.remove_from_favorites') : t('stories_page.add_to_favorites'));
  };

  const handleStartStory = (e: React.MouseEvent) => {
    e.preventDefault();
    resetProgress();
    navigate('/create');
  };

  const previewPages = useMemo(() => {
    if (!selected) return [];
    return buildThemePreview({
      theme: selected.id,
      language: i18n.language as any,
      childName: nameFor(selected.id),
      coverImage: toDisplayUrl(selected.generatedCover),
      pageImages: (selected.generatedImages || []).map(toDisplayUrl),
      i18n,
    });
  }, [selected, i18n.language]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="font-arabic font-black text-white mb-4">
            {t('stories_page.title')} <span className="shimmer-text">{t('stories_page.title_shimmer')}</span>
          </h1>
          <p className="font-arabic text-white/50 text-lg">{t('stories_page.description')}</p>
        </div>

        {/* Preview Lock Banner */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gold-500/10 border border-gold-500/30 mb-10">
          <Lock className="w-5 h-5 text-gold-500 flex-shrink-0" />
          <p className="font-arabic text-white/70 text-sm">
            <strong className="text-gold-500">{t('stories_page.preview_system')}</strong> {t('stories_page.preview_desc')}
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme, idx) => {
            const cover = toDisplayUrl(theme.generatedCover);
            const rating = [5.0, 4.9, 4.8][idx % 3];
            const isFav = favorites.includes(theme.id);
            return (
              <div key={theme.id} className="glass-card glass-card-hover overflow-hidden group flex flex-col">
                {/* Cover — the real generated front cover */}
                <div className="h-44 relative overflow-hidden bg-dark-800">
                  {cover && <img src={cover} alt={nameFor(theme.id)} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-900/50 to-transparent pointer-events-none" />
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-gold-500 px-2 py-1 rounded-lg">
                    <Star className="w-3 h-3 text-dark-900 fill-dark-900" />
                    <span className="font-arabic font-bold text-dark-900 text-xs">{rating}</span>
                  </div>
                  <button
                    onClick={() => toggleFavorite(theme.id)}
                    aria-label={t('stories_page.add_to_favorites')}
                    className={`absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center transition-all ${isFav ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-black/25 text-white/70 hover:bg-black/45 hover:text-white'}`}
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-arabic font-bold text-white text-lg mb-1">{titleFor(theme)}</h3>
                  <p className="font-arabic text-gold-500 text-xs mb-3">
                    {t('stories_page.theme')} {t(`step2.theme_${theme.id}`, { defaultValue: theme.label || theme.id })}
                  </p>

                  {/* Explainer — first lines of the real story */}
                  <div className="relative mb-4 flex-1">
                    <p className="font-arabic text-white/70 text-sm leading-relaxed line-clamp-3">{explainerFor(theme)}</p>
                  </div>

                  {/* View / lock row */}
                  <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-dark-700 border border-white/10 mb-4 gap-2">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelected(theme)} className="flex items-center gap-1 pr-3 group cursor-pointer">
                        <Eye className="w-3.5 h-3.5 text-gold-500 group-hover:scale-125 transition-transform" />
                        <span className="font-arabic text-gold-500 text-xs border-b border-transparent group-hover:border-gold-500 transition-colors">{t('stories_page.available_30')}</span>
                      </button>
                      <div className="flex items-center gap-1 border-r border-white/10 pr-3">
                        <Lock className="w-3.5 h-3.5 text-white/40" />
                        <span className="font-arabic text-white/40 text-xs">{t('stories_page.locked_70')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-white/60" />
                      <span className="font-arabic text-white/60 text-xs font-bold">{t('stories_page.order_to_complete')}</span>
                    </div>
                  </div>

                  <button onClick={handleStartStory} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-sm hover:shadow-gold-glow transition-all">
                    ✨ {t('stories_page.start_creating')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14 glass-card p-10">
          <div className="text-5xl mb-4">🌟</div>
          <h2 className="font-arabic font-bold text-white text-2xl mb-3">{t('stories_page.want_custom_story')}</h2>
          <p className="font-arabic text-white/50 mb-6">{t('stories_page.custom_story_desc')}</p>
          <button onClick={handleStartStory} className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-xl hover:shadow-gold-glow hover:-translate-y-1 transition-all duration-300">
            ✨ {t('stories_page.start_creating')}
          </button>
        </div>
      </div>

      {/* Illustrated book preview modal — 30% readable, the rest locked */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in text-center">
          <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-md" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-4xl glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-dark-900/95 p-6 md:p-8 pt-10">
            <button onClick={() => setSelected(null)} className="absolute top-4 left-4 p-2 rounded-full bg-white/5 hover:bg-gold-500 hover:text-dark-900 text-white/50 transition-all z-20">
              <X className="w-6 h-6" />
            </button>
            <div className="mb-2">
              <h3 className="font-arabic font-black text-white text-2xl">
                <span className="text-gold-500">{titleFor(selected)}</span>
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
              <button onClick={handleStartStory} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-lg hover:shadow-gold-glow hover:-translate-y-1 transition-all">
                {t('stories_page.modal_cta')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
