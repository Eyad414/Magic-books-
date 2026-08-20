import { useState, useEffect, useMemo } from 'react';
import { Star, BookOpen, Eye, X, Heart } from 'lucide-react';
import FlipbookPreview, { buildThemePreview } from '../components/wizard/FlipbookPreview';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStoryProgress } from '../context/StoryProgressContext';
import { publicApi } from '../api/publicApi';
import { toDisplayUrl } from '../api/mediaUrl';
import { localizeName } from '../utils/translit';
import { detectGender, applyGenderTokens } from '../utils/gender';
import { SHOWCASE_CARDS as CARDS, demoOnStoriesPage, type DemoVisibility, type ShowcaseCard as Card } from '../data/showcaseCards';
import { loadFavorites, saveFavorites } from '../utils/favorites';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Some themes reuse another theme's scripted story text (e.g. the realistic
// space variant shares the space story).
const TEXT_THEME: Record<string, string> = { space_real: 'space' };
const textThemeFor = (id: string) => TEXT_THEME[id] || id;

const storyImgs = (id: string) =>
  Array.from({ length: 13 }, (_, i) => `magic-fanoose/generated/${id}/page-${String(i + 1).padStart(2, '0')}.png`);

export default function Stories() {
  const [themes, setThemes] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<Card | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const { t, i18n } = useTranslation();
  const { resetProgress, setStoryConfig } = useStoryProgress();
  const navigate = useNavigate();
  // Favourites are per-account (guest bucket when logged out).
  const { user } = useAuth();

  useEffect(() => {
    publicApi.getSettings()
      .then((res) => {
        const map: Record<string, any> = {};
        for (const th of (res?.settings?.themes || [])) map[th.id] = th;
        setThemes(map);
      })
      .catch(() => {});
    setFavorites(loadFavorites(user?.id));
  }, [user?.id]);

  // Per-card visibility set in the dashboard. A card built from a real child's
  // photo needs an explicit tick; every other demo card shows unless unticked.
  const [vis, setVis] = useState<DemoVisibility>({});
  useEffect(() => {
    publicApi.getSettings().then((res) => setVis(res?.settings?.demoCards || {})).catch(() => {});
  }, []);
  const isVisible = (c: Card) => demoOnStoriesPage(c, vis);

  // Colouring books made for a real child and published from the dashboard.
  // The grid below shows what each STORY looks like as a colouring book; these
  // show what a real one looks like with a real child's face in it, which is
  // the thing a parent is actually deciding about.
  const [kidColoring, setKidColoring] = useState<any[]>([]);
  useEffect(() => {
    publicApi.getStoriesPageBooks()
      .then((res) => setKidColoring((res?.books || []).filter((b: any) => b.coloringCover)))
      .catch(() => {});
  }, []);


  const ft = useMemo(() => i18n.getFixedT(i18n.language), [i18n.language]);
  const nameL = (card: Card) => localizeName(card.name, i18n.language);
  // Insert the (localized) name and resolve {masc|fem} gender tokens.
  const personalize = (card: Card, text: string) =>
    applyGenderTokens((text || '').replace(/\[NAME\]/gi, nameL(card)), detectGender(card.name));

  const coverFor = (card: Card) =>
    card.storyId
      ? toDisplayUrl(`magic-fanoose/generated/${card.storyId}/page-00.png`)
      : (themes[card.themeId]?.generatedCover ? toDisplayUrl(themes[card.themeId].generatedCover) : '');
  const imagesFor = (card: Card) =>
    card.storyId
      ? storyImgs(card.storyId).map(toDisplayUrl)
      : (themes[card.themeId]?.generatedImages || []).map(toDisplayUrl);
  // page-99 is the closing portrait the printed book puts on its back cover.
  const portraitFor = (card: Card) =>
    card.storyId
      ? toDisplayUrl(`magic-fanoose/generated/${card.storyId}/page-99.png`)
      : (themes[card.themeId]?.generatedPortrait ? toDisplayUrl(themes[card.themeId].generatedPortrait) : '');

  // Story title, e.g. "مغامرة لورا في حديقة الحيوانات" / "Lora's Adventure in the Zoo".
  const titleFor = (card: Card) => {
    const raw = (ft(`stories.${textThemeFor(card.themeId)}.title`, '') as string) || '';
    if (raw) return personalize(card, raw);
    const label = ft(`step2.theme_${card.themeId}`, { defaultValue: themes[card.themeId]?.label || card.themeId }) as string;
    return `${nameL(card)} — ${label}`;
  };
  const themeLabelFor = (card: Card) => t(`step2.theme_${card.themeId}`, { defaultValue: themes[card.themeId]?.label || card.themeId });

  const toggleFavorite = (key: string) => {
    // Favourites live on the account, so a signed-out visitor has nowhere to
    // save them — send them to log in rather than pretending it worked.
    if (!user?.id) {
      toast(t('stories_page.login_to_favorite', 'سجّل الدخول لحفظ قصصك المفضلة ❤️'));
      navigate('/login');
      return;
    }
    const isFav = favorites.includes(key);
    const next = isFav ? favorites.filter((f) => f !== key) : [...favorites, key];
    setFavorites(next);
    saveFavorites(user.id, next);
    toast.success(isFav ? t('stories_page.remove_from_favorites') : t('stories_page.add_to_favorites'));
  };

  // Colouring is a format, not a catalogue: any story theme can be ordered as
  // one, so this lists the stories themselves rather than a parallel set.
  const colorableThemes = useMemo(
    () => Object.values(themes).filter((th: any) => th && !th.isColoring && th.id),
    [themes],
  );

  const handleStartStory = (e: React.MouseEvent) => {
    e.preventDefault();
    resetProgress();
    navigate('/create');
  };

  /**
   * Start the wizard on the story the customer was just reading.
   *
   * Every route out of this page used to land on an empty wizard, so someone
   * who fell for the pirate story had to find it again in a grid of twenty —
   * and the moment they liked it was already gone.
   */
  const startWithTheme = (themeId: string) => {
    resetProgress();
    setStoryConfig({ theme: themeId });
    navigate('/create');
  };

  const previewPages = useMemo(() => {
    if (!selected) return [];
    return buildThemePreview({
      theme: textThemeFor(selected.themeId),
      language: i18n.language as any,
      childName: selected.name,
      coverImage: coverFor(selected),
      pageImages: imagesFor(selected),
      portraitImage: portraitFor(selected),
      i18n,
      full: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, i18n.language, themes]);

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

        {/* Stories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Books made from a real child's own photo stay in the admin dash and
              off the public site. Add a name here when a new demo uses a real
              family photo rather than a stock/demo face. */}
          {CARDS.filter(isVisible).map((card, idx) => {
            const cover = coverFor(card);
            const rating = [5.0, 4.9, 4.8][idx % 3];
            const isFav = favorites.includes(card.key);
            return (
              <div key={card.key} className="glass-card glass-card-hover overflow-hidden group flex flex-col">
                {/* Cover — the real generated front cover */}
                <div className="h-44 relative overflow-hidden bg-dark-800">
                  {cover && <img src={cover} alt={nameL(card)} loading="lazy" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-900/50 to-transparent pointer-events-none" />
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-gold-500 px-2 py-1 rounded-lg">
                    <Star className="w-3 h-3 text-dark-900 fill-dark-900" />
                    <span className="font-arabic font-bold text-dark-900 text-xs">{rating}</span>
                  </div>
                  <button
                    onClick={() => toggleFavorite(card.key)}
                    aria-label={t('stories_page.add_to_favorites')}
                    className={`absolute top-3 left-3 w-11 h-11 rounded-full flex items-center justify-center transition-all ${isFav ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-black/25 text-white/70 hover:bg-black/45 hover:text-white'}`}
                  >
                    <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-arabic font-bold text-white text-lg mb-1">{titleFor(card)}</h3>
                  <p className="font-arabic text-gold-500 text-xs mb-3">
                    {t('stories_page.theme')} {themeLabelFor(card)}
                  </p>

                  {/* View row — the whole sample book is readable */}
                  <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-dark-700 border border-white/10 mb-4 gap-2 mt-auto">
                    <button onClick={() => setSelected(card)} className="flex items-center gap-1 pr-3 py-2 -my-1 min-h-[44px] group cursor-pointer">
                      <Eye className="w-3.5 h-3.5 text-gold-500 group-hover:scale-125 transition-transform" />
                      <span className="font-arabic text-gold-500 text-xs border-b border-transparent group-hover:border-gold-500 transition-colors">{t('stories_page.read_full')}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-white/60" />
                      <span className="font-arabic text-white/60 text-xs font-bold">{t('stories_page.order_to_complete')}</span>
                    </div>
                  </div>

                  {/* Starts on THIS story, not an empty wizard. */}
                  <button onClick={() => startWithTheme(card.themeId)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-sm hover:shadow-gold-glow transition-all">
                    ✨ {t('stories_page.start_creating')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Every story is also a colouring book.
            Not a separate catalogue: the pages ARE the story the customer
            picks, drawn as line art with their own child in them — so listing
            twenty more cards would be listing the same twenty stories twice. */}
        <div className="mt-14 glass-card p-8 sm:p-10">
          <div className="text-center">
            <div className="text-4xl mb-3">🖍️</div>
            <h2 className="font-arabic font-bold text-white text-2xl mb-2">
              {t('stories_page.coloring_title', 'كل قصة متوفرة ككتاب تلوين')}
            </h2>
            <p className="font-arabic text-white/55 max-w-2xl mx-auto">
              {t('stories_page.coloring_desc', 'نفس القصة اللي بتختارها — مرسومة خطوط، ووجه طفلك بكل صفحة. ١٦ صفحة يلوّنها بإيده.')}
            </p>
          </div>

          {/* Real books first, when there are any. A generic cover shows the
              idea; a real child's book shows the product. */}
          {kidColoring.length > 0 && (
            <div className="mt-7">
              <p className="font-arabic text-gold-500 text-sm text-center mb-3">
                {t('stories_page.coloring_real', 'كتب تلوين عملناها لأطفال حقيقيين')}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                {kidColoring.map((b) => (
                  <div key={b.id} className="w-40">
                    <div className="aspect-square rounded-2xl overflow-hidden bg-white/5 border border-gold-500/30">
                      <img
                        src={toDisplayUrl(b.coloringCover)}
                        alt={b.childName}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="font-arabic text-white/70 text-xs text-center mt-1.5">
                      {localizeName(b.childName, i18n.language)}
                      <span className="text-white/35"> · {b.coloringImages?.length || 0} </span>
                      {t('stories_page.coloring_pages', 'صفحة')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Every story now has a colouring cover of its own, so this shows
              the books rather than a list of names. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-7">
            {colorableThemes.map((th) => (
              <div key={th.id} className="group">
                <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-gold-500/40 transition-colors">
                  {th.coloringCover ? (
                    <img
                      src={toDisplayUrl(th.coloringCover)}
                      alt={th.label}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">{th.emoji}</div>
                  )}
                </div>
                <p className="font-arabic text-white/60 text-[11px] text-center mt-1.5 leading-snug">
                  {t(`step2.theme_${th.id}`, { defaultValue: th.label })}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-7">
            <span className="font-arabic text-gold-500 font-black text-2xl" dir="ltr">₪60</span>
            <span className="font-arabic text-white/45 text-sm mr-2">
              {t('stories_page.coloring_price_note', 'للكتاب — أو ضمن الباقة الشاملة')}
            </span>
          </div>
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

      {/* Illustrated book preview modal — the full sample story, end to end */}
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
            {/* Closing the preview used to drop the reader on an empty
                wizard. This keeps the story they just read, names it, and says
                what it costs — the decision is made here, not two pages later. */}
            <div className="mt-5 rounded-2xl border border-gold-500/30 bg-gradient-to-l from-gold-500/10 to-magic-500/10 p-5">
              <p className="font-arabic text-white text-lg font-bold text-center">
                {t('stories_page.modal_swap', 'هاي القصة… بس البطل يكون {{name}}', { name: t('stories_page.modal_your_child', 'طفلك') })}
              </p>
              <p className="font-arabic text-white/60 text-sm text-center mt-1.5">
                {t('stories_page.modal_swap_desc', 'صورة وحدة لوجهه، واسمه بكل صفحة — وبيوصلك مطبوع')}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => { setSelected(null); startWithTheme(selected.themeId); }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-lg hover:shadow-gold-glow hover:-translate-y-1 transition-all"
                >
                  ✨ {t('stories_page.modal_cta_theme', 'اصنع هذه القصة لطفلك')}
                </button>
                <span className="font-arabic text-white/50 text-sm">
                  {t('stories_page.modal_price_hint', 'تبدأ من ₪40 · المطبوعة ₪130')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
