import { useState, useEffect, useMemo } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { BookOpen, Eye, X, Heart } from 'lucide-react';
import FlipbookPreview, { buildThemePreview } from '../components/wizard/FlipbookPreview';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStoryProgress } from '../context/StoryProgressContext';
import { publicApi } from '../api/publicApi';
import { toDisplayUrl, toCardUrl } from '../api/mediaUrl';
import { localizeName } from '../utils/translit';
import { detectGender, applyGenderTokens } from '../utils/gender';
import { SHOWCASE_CARDS as CARDS, demoOnStoriesPage, type DemoVisibility, type ShowcaseCard as Card } from '../data/showcaseCards';
import { loadFavorites, saveFavorites } from '../utils/favorites';
import { useAuth } from '../context/AuthContext';
import { usePackages } from '../hooks/usePackages';
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
  usePageMeta(t('meta.stories_title'), t('meta.stories_desc'));
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


  // The printed book's live price, for the header. Same hook the wizard and
  // checkout use — there is no second price list to drift.
  const { packages, pricesReady } = usePackages();
  const printedPkg = packages.find((p) => p.id === 'color');

  const ft = useMemo(() => i18n.getFixedT(i18n.language), [i18n.language]);
  const nameL = (card: Card) => localizeName(card.name, i18n.language);
  // Insert the (localized) name and resolve {masc|fem} gender tokens.
  const personalize = (card: Card, text: string) =>
    applyGenderTokens((text || '').replace(/\[NAME\]/gi, nameL(card)), detectGender(card.name));

  const coverFor = (card: Card) =>
    card.storyId
      ? toDisplayUrl(`magic-fanoose/generated/${card.storyId}/page-00.png`)
      : (themes[card.themeId]?.generatedCover ? toDisplayUrl(themes[card.themeId].generatedCover) : '');
  /** The grid renders this at ~340px — it must not pull the full-size cover.
   *  coverFor stays full-res for the reading preview. */
  const cardCoverFor = (card: Card) => toCardUrl(
    card.storyId
      ? `magic-fanoose/generated/${card.storyId}/page-00.png`
      : (themes[card.themeId]?.generatedCover || ''),
    480,
  );
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
      // Back to the grid they were browsing, not the dashboard — they were in
      // the middle of liking a story, not trying to administer an account.
      navigate('/login', { state: { from: '/stories' } });
      return;
    }
    const isFav = favorites.includes(key);
    const next = isFav ? favorites.filter((f) => f !== key) : [...favorites, key];
    setFavorites(next);
    saveFavorites(user.id, next);
    toast.success(isFav ? t('stories_page.remove_from_favorites') : t('stories_page.add_to_favorites'));
  };

  /**
   * Boys / girls filter.
   *
   * A customer told the owner "every story on your site is for boys". They were
   * very nearly right — the demo generator was hardcoded male, so 24 of 25
   * showcase books were boys. That is fixed and the girl books exist now, but a
   * parent scrolling a grid of twenty-five covers still has no way to ask the
   * question that customer asked. So they can ask it here.
   *
   * Gender comes from the card's name via detectGender, the same helper the book
   * text uses to conjugate Arabic, so the filter agrees with the pages.
   */
  const [audience, setAudience] = useState<'all' | 'girls' | 'boys'>('all');

  const publicCards = useMemo(() => CARDS.filter(isVisible), [vis]);
  const counts = useMemo(() => {
    let girls = 0;
    for (const c of publicCards) if (detectGender(c.name) === 'female') girls++;
    return { all: publicCards.length, girls, boys: publicCards.length - girls };
  }, [publicCards]);
  const shownCards = useMemo(
    () =>
      audience === 'all'
        ? publicCards
        : publicCards.filter((c) => (detectGender(c.name) === 'female') === (audience === 'girls')),
    [publicCards, audience],
  );

  const AUDIENCES: { id: 'all' | 'girls' | 'boys'; label: string; emoji: string }[] = [
    { id: 'all', label: t('stories_page.filter_all', 'كل القصص'), emoji: '✨' },
    { id: 'girls', label: t('stories_page.filter_girls', 'للبنات'), emoji: '🎀' },
    { id: 'boys', label: t('stories_page.filter_boys', 'للأولاد'), emoji: '🚀' },
  ];

  /** Owner-set badge from the dashboard — a real flag, not an invented score. */
  const TAG_LABEL: Record<string, string> = {
    new: t('stories_page.tag_new', 'جديدة'),
    bestseller: t('stories_page.tag_bestseller', 'الأكثر طلباً'),
    featured: t('stories_page.tag_featured', 'مميّزة'),
  };

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

  /**
   * The sample book as a TEASER, not the whole thing: cover + the first ~30% of
   * pages readable, the rest blurred, then a lock page. `full: true` here used
   * to render every sheet including the ending, which left a visitor with no
   * reason to order — they had already read the book.
   */
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
      full: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, i18n.language, themes]);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-arabic font-black text-white mb-4">
            {t('stories_page.title')} <span className="shimmer-text">{t('stories_page.title_shimmer')}</span>
          </h1>
          <p className="font-arabic text-white/50 text-lg">{t('stories_page.description')}</p>

          {/* What one of these costs, on the page where they are browsed.
              Fourteen books and no price anywhere — a visitor had to start the
              wizard to find out, which is a lot to ask of someone still
              deciding whether to care. Priced through usePackages, the same
              source checkout reads, so it cannot quote a number the server
              will not honour. */}
          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
            {pricesReady && printedPkg?.price != null ? (
              <span className="font-arabic text-white/70 text-xs">
                {t('stories_page.price_from', 'الكتاب المطبوع')}{' '}
                <strong className="text-gold-500 font-black" dir="ltr">{printedPkg.price} ₪</strong>
              </span>
            ) : (
              <span className="inline-block h-3 w-20 rounded bg-white/15 animate-pulse" />
            )}
            <span className="text-white/15">·</span>
            <span className="font-arabic text-white/60 text-xs">
              {t('stories_page.price_delivery', 'شامل التوصيل')}
            </span>
            <span className="text-white/15">·</span>
            <span className="font-arabic text-gold-500 text-xs font-bold">
              {t('stories_page.price_preview', 'المعاينة مجانية')}
            </span>
          </div>
        </div>

        {/* Audience filter — the question a real customer asked out loud. */}
        <div className={`flex-wrap items-center justify-center gap-2 mb-10 ${counts.girls > 0 && counts.boys > 0 ? 'flex' : 'hidden'}`}>
          {/* A filter that leads to an empty grid is worse than no filter: it
              advertises the gap instead of hiding it. Chips appear only once
              they have something to show, so «للبنات» surfaces by itself the
              moment the girl books get showcase cards. */}
          {AUDIENCES.filter((a) => a.id === 'all' || counts[a.id] > 0).map((a) => {
            const on = audience === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAudience(a.id)}
                aria-pressed={on}
                className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-2xl font-arabic font-bold text-sm border transition-all duration-300 ${
                  on
                    ? 'bg-magic-gradient text-dark-900 border-transparent shadow-lg shadow-gold-500/20 scale-[1.03]'
                    : 'bg-white/5 text-white/65 border-white/10 hover:border-gold-500/30 hover:text-white'
                }`}
              >
                <span aria-hidden>{a.emoji}</span>
                {a.label}
                <span className={`text-[11px] font-black ${on ? 'text-dark-900/60' : 'text-white/35'}`} dir="ltr">
                  {counts[a.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Stories grid.
            Books made from a real child's own photo stay off the public site
            until the owner ticks them — see ShowcaseCard.private. */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {shownCards.map((card) => {
            const cover = cardCoverFor(card);
            const isFav = favorites.includes(card.key);
            const tag = vis[card.key]?.tag;
            return (
              <article
                key={card.key}
                className="group relative flex flex-col rounded-3xl overflow-hidden bg-dark-800 border border-white/10 hover:border-gold-500/40 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-gold-500/10 transition-all duration-500"
              >
                {/* A book cover is portrait. This was a 176px letterbox that
                    cropped the top and bottom off every illustration — the
                    artwork is the product, so it gets the room. */}
                <button
                  onClick={() => setSelected(card)}
                  aria-label={`${t('stories_page.read_full')} — ${titleFor(card)}`}
                  className="relative block w-full aspect-[3/4] overflow-hidden bg-dark-700 text-right"
                >
                  {cover && (
                    <img
                      src={cover}
                      alt={titleFor(card)}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/30 to-transparent pointer-events-none" />

                  {/* Title sits on the art instead of in a separate slab. */}
                  <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 pointer-events-none">
                    <h3 className="font-arabic font-black text-white text-sm sm:text-base leading-snug line-clamp-2 drop-shadow-lg">
                      {titleFor(card)}
                    </h3>
                    <p className="font-arabic text-gold-500 text-[10px] sm:text-[11px] mt-1 font-bold">
                      {themeLabelFor(card)}
                    </p>
                  </div>

                  {/* Read affordance, revealed on hover / always legible on touch. */}
                  {/* Visible wherever there is no hover.
                      This was opacity-0 until :hover, which on a phone means
                      never — so the free preview, the best reason a stranger
                      has to trust this shop, was invisible on the device most
                      of the traffic arrives on. Pointer devices keep the
                      reveal; touch devices just get it. */}
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none [@media(hover:none)]:hidden">
                    <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-dark-900/85 border border-gold-500/40">
                      <Eye className="w-4 h-4 text-gold-500" />
                      <span className="font-arabic font-bold text-white text-xs">{t('stories_page.read_full')}</span>
                    </span>
                  </span>

                  {/* The badge the owner actually set. There used to be a star
                      rating here — 5.0, 4.9, 4.8 picked by array index, the
                      same three scores repeating down the grid. Invented
                      reviews are not ours to show. */}
                  {tag && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-gold-500 font-arabic font-black text-dark-900 text-[10px] shadow-lg">
                      {TAG_LABEL[tag] || tag}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => toggleFavorite(card.key)}
                  aria-label={t('stories_page.add_to_favorites')}
                  className={`absolute top-2.5 left-2.5 w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                    isFav ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-dark-900/45 text-white/70 hover:bg-dark-900/70 hover:text-white'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                </button>

                {/* Starts on THIS story, not an empty wizard. */}
                <div className="p-3 sm:p-4 mt-auto space-y-1.5">
                  {/* Touch devices only. The hover pill above never appears on
                      a phone, and there is nowhere to float it on a 215px cover
                      whose bottom 84px is already the title — so the free
                      preview, the strongest reason a stranger has to trust this
                      shop, gets a line of its own instead of fighting the art. */}
                  <button
                    onClick={() => setSelected(card)}
                    className="hidden [@media(hover:none)]:flex w-full items-center justify-center gap-1.5 min-h-[40px] rounded-2xl bg-white/5 border border-white/10 text-white/70 font-arabic font-bold text-[11px]"
                  >
                    <Eye className="w-3.5 h-3.5 text-gold-500" />
                    {t('stories_page.read_full')}
                  </button>
                  <button
                    onClick={() => startWithTheme(card.themeId)}
                    className="w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-xs sm:text-sm hover:shadow-gold-glow transition-all"
                  >
                    <BookOpen className="w-4 h-4" />
                    {t('stories_page.start_creating')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {shownCards.length === 0 && (
          <p className="font-arabic text-white/45 text-center py-14">
            {t('stories_page.filter_empty', 'ما في قصص بهذا التصنيف بعد — جرب «كل القصص».')}
          </p>
        )}

        {/* Bottom CTA */}
        <div className="text-center mt-14 glass-card p-10">
          <div className="text-5xl mb-4">🌟</div>
          <h2 className="font-arabic font-bold text-white text-2xl mb-3">{t('stories_page.want_custom_story')}</h2>
          <p className="font-arabic text-white/50 mb-6">{t('stories_page.custom_story_desc')}</p>
          <button onClick={handleStartStory} className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-xl hover:shadow-gold-glow hover:-translate-y-1 transition-all duration-300">
            {t('stories_page.start_creating')}
          </button>
        </div>
      </div>

      {/* Illustrated book preview modal — cover + the first ~30%, then a lock */}
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
                wizard. This keeps the story they just read and names it — the
                decision is made here, not two pages later. No price: the packages
                belong in the wizard's own step, not on a story card. */}
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
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
