import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, Camera, Sparkles, Truck, ChevronLeft } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useStoryProgress } from '../context/StoryProgressContext';
import { usePackages } from '../hooks/usePackages';
import { publicApi } from '../api/publicApi';
import { toCardUrl, toDisplayUrl } from '../api/mediaUrl';
import FlipbookPreview, { buildThemePreview } from '../components/wizard/FlipbookPreview';
import { BrandEmblem } from '../components/common/BrandLogo';
import { localizeName } from '../utils/translit';
import { detectGender, applyGenderTokens } from '../utils/gender';
import { type DemoVisibility } from '../data/showcaseCards';
import {
  storySlug, storyIdFromSlug, cardForStory, wizardThemeFor, themeCoverPath,
} from '../data/storyPages';

/** How many opening pages of the story the page quotes — enough to read, not the book. */
const EXCERPT_PAGES = 3;

/**
 * A story's own page: /stories/jerusalem-tale and thirty others.
 *
 * Built for the parent who arrives from a search, not from the menu — so it
 * answers what the /stories modal assumes they already know: what the story
 * is about, what the child takes from it, what they would get, and what it
 * costs, with the preview and a button that opens the wizard ON this story.
 *
 * The build writes real HTML for every one of these (scripts/prerender.mjs),
 * so a crawler gets the title and the story's opening pages without running
 * any JavaScript; this component replaces that on load.
 */
export default function StoryDetail() {
  const { slug = '' } = useParams();
  const storyId = storyIdFromSlug(slug);
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { resetProgress, setStoryConfig } = useStoryProgress();
  const { packages, pricesReady } = usePackages();
  const printedPkg = packages.find((p) => p.id === 'color');

  const [themes, setThemes] = useState<Record<string, any>>({});
  const [vis, setVis] = useState<DemoVisibility>({});
  useEffect(() => {
    publicApi.getSettings()
      .then((res) => {
        const map: Record<string, any> = {};
        for (const th of (res?.settings?.themes || [])) map[th.id] = th;
        setThemes(map);
        setVis(res?.settings?.demoCards || {});
      })
      .catch(() => {});
  }, []);

  const ft = useMemo(() => i18n.getFixedT(i18n.language), [i18n.language]);
  const rawTitle = ft(`stories.${storyId}.title`, '') as string;
  const exists = !!rawTitle;

  const card = exists ? cardForStory(storyId, vis) : undefined;
  const wizardTheme = wizardThemeFor(storyId, vis);
  const childName = card ? localizeName(card.name, i18n.language) : '';
  const gender = card ? detectGender(card.name) : 'male';
  const personalize = (s: string) =>
    applyGenderTokens((s || '').replace(/\[NAME\]/gi, childName || t('stories_page.modal_your_child', 'طفلك')), gender);

  const label = (ft(`step2.theme_${storyId}`, { defaultValue: '' }) as string) || personalize(rawTitle);
  const desc = ft(`step2.theme_${storyId}_desc`, { defaultValue: '' }) as string;
  const moral = personalize(ft(`stories.${storyId}.moral`, '') as string);

  const pagesObj = ft(`stories.${storyId}.pages`, { returnObjects: true }) as Record<string, string> | string;
  const excerpt = pagesObj && typeof pagesObj === 'object'
    ? Object.keys(pagesObj).sort((a, b) => Number(a) - Number(b)).slice(0, EXCERPT_PAGES).map((k) => personalize(pagesObj[k]))
    : [];

  // Artwork only ever comes from a card that is already public (cardForStory),
  // so the alphabet books — which have no card — get the brand cover instead
  // of a picture of nobody.
  const theme = card ? themes[card.themeId] : undefined;
  const realBook = card?.storyId && !card.storyId.startsWith('theme_') ? card.storyId : '';
  const coverPath = card ? (realBook ? `magic-fanoose/generated/${realBook}/page-00.png` : themeCoverPath(card.themeId)) : '';
  const pageImages: string[] = realBook
    ? Array.from({ length: 13 }, (_, i) => toDisplayUrl(`magic-fanoose/generated/${realBook}/page-${String(i + 1).padStart(2, '0')}.png`))
    : (theme?.generatedImages || []).map(toDisplayUrl);
  const portrait = realBook
    ? toDisplayUrl(`magic-fanoose/generated/${realBook}/page-99.png`)
    : (theme?.generatedPortrait ? toDisplayUrl(theme.generatedPortrait) : '');

  const previewPages = useMemo(() => {
    if (!exists) return [];
    return buildThemePreview({
      theme: storyId,
      language: i18n.language as any,
      childName: card?.name,
      coverImage: coverPath ? toDisplayUrl(coverPath) : undefined,
      pageImages: card ? pageImages : [],
      portraitImage: portrait || undefined,
      i18n,
      full: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyId, exists, card?.key, i18n.language, themes]);

  usePageMeta(
    exists ? t('story_page.meta_title', '{{story}} — قصة أطفال باسم طفلك', { story: label }) : t('story_page.not_found_title', 'ما لقينا هالقصة'),
    exists ? t('story_page.meta_desc', '{{desc}}. قصة أطفال مطبوعة، اسم طفلك ووجهه في كل صفحة. المعاينة مجانية.', { desc: desc || label }) : undefined,
  );

  const startStory = () => {
    resetProgress();
    setStoryConfig({ theme: wizardTheme });
    navigate('/create');
  };

  // Other stories to read next — real links, so a visitor (and a crawler)
  // can walk from one story to the rest without going back to the grid.
  const allStories = useMemo(() => {
    const obj = ft('stories', { returnObjects: true }) as Record<string, any>;
    return Object.keys(obj || {}).filter((id) => obj[id]?.title);
  }, [ft]);
  const more = useMemo(() => {
    const others = allStories.filter((id) => id !== storyId && cardForStory(id, vis));
    const start = Math.max(0, allStories.indexOf(storyId));
    return [...others.slice(start), ...others.slice(0, start)].slice(0, 4);
  }, [allStories, storyId, vis]);

  if (!exists) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 text-center">
        <div className="max-w-lg mx-auto glass-card p-10">
          <div className="text-5xl mb-4">📚</div>
          <h1 className="font-arabic font-black text-white text-2xl mb-3">{t('story_page.not_found_title', 'ما لقينا هالقصة')}</h1>
          <p className="font-arabic text-white/60 mb-6">{t('story_page.not_found_desc', 'يمكن الرابط قديم. كل قصصنا موجودة هون:')}</p>
          <Link to="/stories" className="inline-flex items-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black">
            {t('story_page.all_stories', 'كل القصص')}
          </Link>
        </div>
      </div>
    );
  }

  const bullets = [
    { icon: Sparkles, text: t('story_page.bullet_name', 'اسم طفلك ووجهه في كل صفحة') },
    { icon: Camera, text: t('story_page.bullet_photo', 'صورة وحدة لوجهه بتكفي') },
    { icon: BookOpen, text: t('story_page.bullet_pages', '13 مشهداً مرسوماً، وطفلك بطل كل واحد') },
    { icon: Truck, text: t('story_page.bullet_delivery', 'كتاب مطبوع بيوصلك، أو نسخة رقمية') },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <nav aria-label={t('story_page.breadcrumb', 'مسار الصفحة')} className="mb-6 font-arabic text-sm text-white/50 flex items-center gap-1.5 flex-wrap">
          <Link to="/stories" className="hover:text-gold-500 transition-colors">{t('story_page.breadcrumb_stories', 'القصص')}</Link>
          <ChevronLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
          <span className="text-white/80">{label}</span>
        </nav>

        {/* Hero: the cover beside what the story is and what you get. */}
        <section className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-12 items-center">
          <div className="relative mx-auto w-full max-w-[13rem] sm:max-w-xs md:max-w-sm">
            <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-dark-800 border border-white/10 shadow-2xl shadow-gold-500/10">
              {coverPath ? (
                <img
                  src={toCardUrl(coverPath, 640)}
                  alt={personalize(rawTitle)}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#0a1426]">
                  <BrandEmblem className="w-2/3 h-auto" />
                </div>
              )}
              <span className="pointer-events-none absolute inset-y-0 start-0 w-[7px] bg-dark-900/45" />
              <span className="pointer-events-none absolute inset-y-0 start-[7px] w-px bg-white/15" />
            </div>
            {childName && (
              <p className="font-arabic text-white/45 text-xs text-center mt-3">
                {t('story_page.hero_named', 'بالمعاينة البطل {{name}} — وبكتابك البطل طفلك', { name: childName })}
              </p>
            )}
          </div>

          <div className="text-center md:text-start">
            <p className="font-arabic text-gold-500 text-sm font-bold mb-2">{t('story_page.eyebrow', 'قصة مخصّصة باسم طفلك')}</p>
            <h1 className="font-arabic font-black text-white text-3xl sm:text-4xl leading-tight mb-4">{label}</h1>
            {desc && <p className="font-arabic text-white/70 text-lg leading-relaxed mb-6">{desc}</p>}

            <ul className="grid sm:grid-cols-2 gap-2.5 mb-6 text-start">
              {bullets.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                  <Icon className="w-4 h-4 text-gold-500 shrink-0" aria-hidden />
                  <span className="font-arabic text-white/80 text-sm">{text}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <button
                onClick={startStory}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-lg hover:shadow-gold-glow hover:-translate-y-1 transition-all"
              >
                ✨ {t('stories_page.modal_cta_theme', 'اصنع هذه القصة لطفلك')}
              </button>
              <a href="#preview" className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-white/5 border border-white/15 text-white font-arabic font-bold hover:border-gold-500/40 transition-all">
                {t('story_page.see_preview', 'شوف المعاينة')}
              </a>
            </div>
            <p className="font-arabic text-white/55 text-sm mt-4">
              {pricesReady && printedPkg?.price != null ? (
                <>
                  {t('stories_page.price_from', 'الكتاب المطبوع')}{' '}
                  <strong className="text-gold-500 font-black" dir="ltr">{printedPkg.price} ₪</strong>
                  <span className="text-white/25 mx-2">·</span>
                </>
              ) : null}
              {t('stories_page.price_delivery', 'شامل التوصيل')}
              <span className="text-white/25 mx-2">·</span>
              <span className="text-gold-500 font-bold">{t('stories_page.price_preview', 'المعاينة مجانية')}</span>
            </p>
          </div>
        </section>

        {/* The story's own opening pages — the words a parent is deciding on. */}
        {excerpt.length > 0 && (
          <section className="mt-16">
            <h2 className="font-arabic font-black text-white text-2xl mb-5 text-center">{t('story_page.excerpt_title', 'من صفحات القصة')}</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {excerpt.map((text, i) => (
                <blockquote key={i} className="glass-card rounded-2xl p-5 font-arabic text-white/80 leading-loose text-[15px]">
                  <span className="block text-gold-500 text-xs font-bold mb-2">{t('story_page.page_n', 'صفحة {{n}}', { n: i + 1 })}</span>
                  {text}
                </blockquote>
              ))}
            </div>
          </section>
        )}

        {moral && (
          <section className="mt-10 max-w-3xl mx-auto rounded-2xl border border-gold-500/25 bg-gradient-to-l from-gold-500/10 to-magic-500/10 p-6 text-center">
            <h2 className="font-arabic font-black text-white text-xl mb-2">{t('story_page.moral_title', 'شو بيتعلّم طفلك من القصة')}</h2>
            <p className="font-arabic text-white/75 leading-relaxed">{moral}</p>
          </section>
        )}

        <section id="preview" className="mt-16 scroll-mt-24 text-center">
          <h2 className="font-arabic font-black text-white text-2xl mb-2">{t('story_page.preview_title', 'تصفّح القصة')}</h2>
          <p className="font-arabic text-white/50 text-sm mb-6">{t('stories_page.modal_desc')}</p>
          <div className="flex justify-center">
            <FlipbookPreview pages={previewPages} language={i18n.language as any} />
          </div>
          <div className="mt-8 max-w-2xl mx-auto rounded-2xl border border-gold-500/30 bg-gradient-to-l from-gold-500/10 to-magic-500/10 p-5">
            <p className="font-arabic text-white text-lg font-bold">
              {t('stories_page.modal_swap', 'هاي القصة… بس البطل يكون {{name}}', { name: t('stories_page.modal_your_child', 'طفلك') })}
            </p>
            <p className="font-arabic text-white/60 text-sm mt-1.5">
              {t('stories_page.modal_swap_desc', 'صورة وحدة لوجهه، واسمه بكل صفحة — وبيوصلك مطبوع')}
            </p>
            <button
              onClick={startStory}
              className="mt-4 inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-lg hover:shadow-gold-glow hover:-translate-y-1 transition-all"
            >
              ✨ {t('stories_page.modal_cta_theme', 'اصنع هذه القصة لطفلك')}
            </button>
          </div>
        </section>

        {more.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="font-arabic font-black text-white text-2xl">{t('story_page.more_title', 'قصص ثانية ممكن تعجبكم')}</h2>
              <Link to="/stories" className="font-arabic text-gold-500 text-sm font-bold hover:underline">{t('story_page.all_stories', 'كل القصص')}</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {more.map((id) => {
                const c = cardForStory(id, vis)!;
                const realId = c.storyId && !c.storyId.startsWith('theme_') ? c.storyId : '';
                const cover = toCardUrl(realId ? `magic-fanoose/generated/${realId}/page-00.png` : themeCoverPath(c.themeId), 480);
                const name = ft(`step2.theme_${id}`, { defaultValue: id }) as string;
                return (
                  <Link
                    key={id}
                    to={`/stories/${storySlug(id)}`}
                    className="group relative block aspect-[3/4] rounded-2xl overflow-hidden bg-dark-800 border border-white/10 hover:border-gold-500/40 hover:-translate-y-1 transition-all duration-500"
                  >
                    <img src={cover} alt={name} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-dark-900/20 to-transparent" />
                    <span className="absolute bottom-0 inset-x-0 p-3 font-arabic font-black text-white text-sm leading-snug drop-shadow-lg">{name}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
