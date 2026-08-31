import { useEffect, useMemo, useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { Sparkles, ChevronLeft, ChevronRight, Globe, ChevronDown, ChevronUp, Loader2, BookOpen } from 'lucide-react';
import FlipbookPreview from './FlipbookPreview';
import { storyApi } from '../../api/storyApi';
import { publicApi } from '../../api/publicApi';
import { toDisplayUrl } from '../../api/mediaUrl';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { localizeName } from '../../utils/translit';
import { getPackageLabel, getPackageDesc } from '../../utils/packageLabel';
import { getThemeLabel, getThemeDesc } from '../../utils/themeLabel';
import { STORY_TEMPLATES } from '../../data/stories/templates';
import ThemeChatHelper from './ThemeChatHelper';
import { buildBook, type TemplatePage } from '../../data/stories/builder';
import type { StoryMode } from '../../context/StoryProgressContext';
import { buildThemePreview, type PreviewPage } from './FlipbookPreview';
import { useSiteFlags } from '../../hooks/useSiteFlags';
import CoverPreview from './CoverPreview';
import { useAuth } from '../../context/AuthContext';

// Props Interface: Defines navigation callbacks passed from the parent wizard container
interface Props { onNext: () => void; onPrev: () => void; }

const INITIAL_THEME_COUNT = 8;

// Live preview in Step 2 — hidden per request. Flip to true to bring it back.
const SHOW_LIVE_PREVIEW = false;

// Convert an admin theme's saved pages ([{ text, imageSrc }]) into the
// TemplatePage[] shape (text page + image page per entry). This lets ANY theme
// the admin adds/edits work in "ready story" (template) mode — without a
// hardcoded STORY_TEMPLATES entry — instead of showing "under preparation".
function dbPagesToTemplate(pages?: any[]): TemplatePage[] | null {
  if (!Array.isArray(pages) || pages.length === 0) return null;
  const out: TemplatePage[] = [];
  for (const p of pages) {
    const text = (p?.text ?? '').toString();
    out.push({ type: 'text', content: text });
    out.push({ type: 'image', prompt: (p?.imagePrompt ?? p?.prompt ?? text ?? '').toString() });
  }
  return out;
}

interface ApiTheme {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  titles?: { ar?: string; en?: string; he?: string };
  descriptions?: { ar?: string; en?: string; he?: string };
  /** Admin-authored story pages ([{text, imageSrc}]) — used as the template in
   *  "ready story" mode for themes without a hardcoded STORY_TEMPLATES entry. */
  pages?: any[];
  ready?: boolean;
  series?: string;
  seriesName?: string;
  seriesPart?: number;
  // Sample illustrations (generated with the demo child "Baha") so the preview
  // can show what a finished book looks like.
  generatedCover?: string;
  generatedImages?: string[];
}

export default function Step2_AI_Generator({ onNext, onPrev }: Props) { // To move to the next page in the steps
  const { progress, setStoryConfig, setBookCustomization, setChildDetails } = useStoryProgress(); // To save User Choices in the steps
  const { t, i18n } = useTranslation();
  // "Write with AI" stays hidden until the owner turns it on in the dashboard.
  const { aiModeEnabled } = useSiteFlags();
  const { user } = useAuth();

  // Themes come from the admin panel via /api/public/settings. The backend
  // already filters to ready===true so half-finished stories never appear.
  const [THEMES, setThemes] = useState<ApiTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);
  // Live settings power the book-package prices below (same call as the themes).
  const [liveSettings, setLiveSettings] = useState<any>(null);

  useEffect(() => {
    publicApi.getSettings()
      .then((res) => {
        setLiveSettings(res?.settings || null);
        const fromApi: ApiTheme[] = (res?.settings?.themes ?? [])
          // Coloring books are NOT separate themes here — the format (full-color
          // story vs coloring book) is chosen as a "package" in the next step.
          .filter((dbTheme: any) => !dbTheme.isColoring)
          .map((dbTheme: any) => {
          return {
            id: dbTheme.id,
            emoji: dbTheme.emoji,
            // Keep the RAW admin label/desc/titles — the display name is resolved
            // at render via getThemeLabel/getThemeDesc, so an admin-edited title
            // wins and the label re-localizes when the UI language changes.
            label: dbTheme.label,
            desc: dbTheme.desc,
            titles: dbTheme.titles,
            descriptions: dbTheme.descriptions,
            pages: dbTheme.pages,
            series: dbTheme.series,
            seriesName: dbTheme.seriesName,
            seriesPart: dbTheme.seriesPart,
            generatedCover: dbTheme.generatedCover,
            generatedImages: dbTheme.generatedImages,
          };
        });
        setThemes(fromApi);
        // If a previously-saved theme is no longer ready, fall back to the first one.
        setForm((prev) => {
          if (prev.theme === 'custom') return prev;
          const stillExists = fromApi.some((th) => th.id === prev.theme);
          if (stillExists) return prev;
          return { ...prev, theme: fromApi[0]?.id || '' };
        });
      })
      .catch(() => {
        setThemes([]);
      })
      .finally(() => setThemesLoading(false));
    // i18n.language change triggers re-render naturally; we don't re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Local State: Tracks how the customer wants to author the story.
  const [mode, setMode] = useState<StoryMode>(progress.storyConfig.mode || 'template');

  // AI mode is owner-gated. If it gets switched off while a half-finished order
  // still carries mode:'ai' in saved progress, drop back to the ready story —
  // otherwise the customer is stuck in a mode whose toggle is no longer shown.
  useEffect(() => {
    if (!aiModeEnabled && mode === 'ai') setMode('template');
  }, [aiModeEnabled, mode]);

  // Local State: Stores the selected theme, language and any custom notes
  const [form, setForm] = useState({
    theme: progress.storyConfig.theme || 'adventure',
    language: progress.storyConfig.language || 'ar' as 'ar' | 'en' | 'he',
    customThemeNote: progress.storyConfig.customThemeNote || '',
  });


  /**
   * The name as it will be WRITTEN in the book.
   *
   * Transliterated automatically — «وهيب» becomes «Waheeb» in an English
   * story — unless the parent corrected the spelling, in which case theirs
   * wins. They know how their child's name is spelled; we are guessing.
   */
  const typedName = (progress.childDetails.childName || '').trim();
  const autoName = localizeName(typedName, form.language);
  const nameOverride = (progress.childDetails.childNameAlt || '').trim();
  const effectiveName = nameOverride || autoName;

  // Local State: The book format/package (full-color story, coloring book, …).
  // Merged in from the old "Customize" step so story + format live on one screen.
  const [bookPackage, setBookPackage] = useState(progress.bookCustomization?.bookPackage || 'color');

  // Package list with live admin prices (falls back to sensible defaults).
  const lang = i18n.language;
  const packages = useMemo(() => {
    const DEFAULT_PACKAGES = [
      { id: 'color', label: t('step3.pkg_color'), price: 60, emoji: '🌈', desc: t('step3.pkg_color_desc') },
      { id: 'coloring', label: t('step3.pkg_coloring'), price: 50, emoji: '🖍️', desc: t('step3.pkg_coloring_desc') },
      { id: 'ebook', label: t('step3.pkg_ebook'), price: 20, emoji: '📱', desc: t('step3.pkg_ebook_desc') },
      { id: 'pro', label: t('step3.pkg_pro'), price: 120, originalPrice: 140, emoji: '✨', desc: t('step3.pkg_pro_desc') },
    ];
    if (liveSettings?.bookPackages) {
      return DEFAULT_PACKAGES
        .map((defaultPkg) => {
          const livePkg = liveSettings.bookPackages.find((p: any) => p.id === defaultPkg.id);
          if (!livePkg) return defaultPkg;
          // The dashboard's name/description edits only ever reached the price
          // and hidden flags before, so a rename in the admin never showed to a
          // customer. Admin text is typed in Arabic and packages have no
          // per-language field, so it wins for Arabic and en/he keep the
          // built-in translation.

          // Keep the "was" price only when it is genuinely higher than the
          // live one. The default carries originalPrice: 140 while the admin
          // has raised pro to 170, which rendered a struck-through 140 next to
          // 170 — a discount advertised off a LOWER price.
          const was = (defaultPkg as any).originalPrice;
          return {
            ...defaultPkg,
            label: getPackageLabel(livePkg, t, lang, defaultPkg.label),
            desc: getPackageDesc(livePkg, t, lang, (defaultPkg as any).desc),
            price: livePkg.price,
            hidden: livePkg.hidden,
            originalPrice: was && was > livePkg.price ? was : undefined,
          };
        })
        .filter((pkg) => !(pkg as any).hidden); // admin-hidden packages don't show
    }
    return DEFAULT_PACKAGES;
  }, [liveSettings, t, lang]);
  
  // Local State: Tracks if the AI is currently generating the text to show a loading indicator
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Local State: Stores the generated text returned from the backend API 
  const [generatedText, setGeneratedText] = useState(progress.storyConfig.generatedText || '');
  
  // Local State: Stores the unique database ID for the newly created story instance
  const [storyId, setStoryId] = useState(progress.storyConfig.storyId || '');

  // Local State: Controls whether all themes are visible or just the initial set
  const [showAllThemes, setShowAllThemes] = useState(false);
  const visibleThemes = showAllThemes ? THEMES : THEMES.slice(0, INITIAL_THEME_COUNT);

  // Function: Creates the story in the database and triggers the AI text generation via backend API
  const generateStory = async () => {
    setIsGenerating(true);
    try {
      // First create the story record, then generate
      const childDetails = progress.childDetails;
      // The AI writes a NEW story about the customer's SUBJECT: their typed idea if
      // any, otherwise the chosen theme's real label (so a chosen "space" theme
      // yields a space story — theme ids like "space_real" aren't in the backend
      // label map, which would otherwise produce a generic story).
      const chosenTheme = THEMES.find((th) => th.id === form.theme);
      const subject = (form.customThemeNote || '').trim()
        || (chosenTheme ? getThemeLabel(chosenTheme, t, i18n.language) : '');
      const createRes = await storyApi.create({
        ...childDetails,
        ...form,
        // The book's language script (e.g. "Baha" -> "بهاء"), or the spelling
        // the parent typed over it.
        childName: effectiveName,
        customThemeNote: subject || undefined,
        mode: 'ai',
      });
      const newStoryId = createRes.story._id;
      setStoryId(newStoryId);

      const genRes = await storyApi.generate(newStoryId);
      const text = (genRes.story.generatedText || '').trim();
      if (!text) throw new Error(t('step2.gen_empty', 'لم يُرجع الذكاء الاصطناعي نصاً'));
      setGeneratedText(text);
      setStoryConfig({ ...form, mode: 'ai', generatedText: text, storyId: newStoryId });
      toast.success(t('step2.gen_success'));
    } catch (err: any) {
      // Real generation failed — fall back to a sample, but DON'T pretend it
      // succeeded: surface the reason so a genuine outage is visible.
      const mockText = getMockPreview(progress.childDetails.childName || 'طفلك', form.theme);
      setGeneratedText(mockText);
      setStoryConfig({ ...form, mode: 'ai', generatedText: mockText });
      const reason = err?.response?.data?.message || err?.message || '';
      toast.error(t('step2.gen_fallback', 'تعذّر توليد القصة بالذكاء الاصطناعي الآن — عُرض نموذج مؤقت، حاول مرة أخرى.') + (reason ? ` (${reason})` : ''), { duration: 6000 });
    } finally {
      setIsGenerating(false);
    }
  };

  // The raw template pages for the selected theme: a hardcoded STORY_TEMPLATES
  // entry if one exists, otherwise the theme's own admin-authored pages from the
  // database. This is what makes every ready theme usable in template mode.
  const effectiveTemplate = useMemo<TemplatePage[] | null>(() => {
    // Style variants (e.g. "space_real") reuse the base theme's template text —
    // otherwise the ready story shows "under preparation" (no template for that id).
    const base = form.theme.replace(/_(real|photoreal|cartoon|pr|hd)$/, '');
    const hardcoded = STORY_TEMPLATES[form.theme] || STORY_TEMPLATES[base];
    if (hardcoded && hardcoded.length > 0) return hardcoded;
    const dbPages = THEMES.find((th) => th.id === form.theme)?.pages;
    return dbPagesToTemplate(dbPages);
  }, [form.theme, THEMES]);

  // Function: Builds the template preview for the currently-selected theme and
  // substitutes the kid's name. Returns null if no template exists.
  const templatePagesForCurrentTheme = useMemo(() => {
    if (!effectiveTemplate || effectiveTemplate.length === 0) return null;
    return buildBook(effectiveTemplate, progress.childDetails.childName || '...', progress.childDetails.childPhotoUrl || '');
  }, [effectiveTemplate, progress.childDetails.childName, progress.childDetails.childPhotoUrl]);

  // Function: Ensures the story is ready before proceeding to Step 3.
  // In template mode this is also where we create the Story in the DB
  // (no separate "generate" step). The raw template (with {{name}} placeholders
  // still intact) is sent — backend substitutes at PDF render time.
  const handleNext = async () => {
    if (mode === 'ai' && !generatedText) {
      toast.error(t('step2.err_not_generated'));
      return;
    }
    if (mode === 'template' && (!effectiveTemplate || effectiveTemplate.length === 0)) {
      toast.error(t('step2.err_template_missing', 'هذه القصة قيد الإعداد، الرجاء اختيار أخرى أو استخدام الذكاء الاصطناعي.'));
      return;
    }

    // Restored progress can land here with step 1 never completed. Catch it
    // before the API does, so the customer gets a route back instead of a raw
    // database validation error in English.
    if (!String(progress.childDetails?.childName || '').trim()) {
      toast.error(t('step2.err_no_child_name', 'ينقص اسم الطفل — ارجع إلى الخطوة الأولى وأكمل بيانات طفلك.'));
      onPrev();
      return;
    }

    let nextStoryId = storyId;
    if (mode === 'template') {
      // Only create the DB row if we haven't already (e.g. user returns to step 2).
      if (!nextStoryId) {
        setIsGenerating(true);
        try {
          const createRes = await storyApi.create({
            ...progress.childDetails,
            ...form,
            // Same name the cover and the preview showed.
            childName: effectiveName,
            mode: 'template',
            templatePages: effectiveTemplate, // raw, placeholders intact
          });
          nextStoryId = createRes.story._id;
          setStoryId(nextStoryId);
        } catch (err: any) {
          // Server messages here are Mongoose validation strings in English —
          // fine for the console, not for a customer on an Arabic page.
          console.error('[Step2] story create failed:', err?.response?.data?.message || err?.message || err);
          toast.error(t('step2.err_save_failed', 'تعذّر حفظ القصة — تأكد من اكتمال بيانات طفلك ثم حاول مرة أخرى.'));
          setIsGenerating(false);
          return;
        }
        setIsGenerating(false);
      }
    }

    setStoryConfig({
      ...form,
      mode,
      generatedText: mode === 'ai' ? generatedText : undefined,
      storyId: nextStoryId,
    });
    // Persist the chosen format so the checkout step can price the order.
    setBookCustomization({ bookPackage, coverColor: progress.bookCustomization?.coverColor || '#1B1F5E' });
    onNext();
  };

  // Language-aware teaser of the SELECTED theme's real story (cover + first
  // pages + a locked page), illustrated with the theme's sample (Baha) images.
  // Built in the language the customer chose here.
  const selectedTheme = THEMES.find((th) => th.id === form.theme);
  const coverImage = toDisplayUrl(selectedTheme?.generatedCover);
  const pageImages = (selectedTheme?.generatedImages || []).map((p) => toDisplayUrl(p));
  const previewPages: PreviewPage[] = useMemo(
    () => buildThemePreview({
      theme: form.theme,
      language: form.language,
      childName: progress.childDetails.childName,
      childGender: (progress.childDetails as any).childGender,
      coverImage,
      pageImages,
      i18n,
    }),
    [form.theme, form.language, progress.childDetails.childName, (progress.childDetails as any).childGender, coverImage, pageImages.join('|'), i18n],
  );
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">✨</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">{t('step2.title')}</h2>
        {/* Don't promise an AI-written story while AI mode is switched off —
            in ready-story mode the text comes from our own written stories. */}
        <p className="font-arabic text-white/50 text-sm">
          {t(aiModeEnabled ? 'step2.desc' : 'step2.desc_template')
            // form.language, not the site language: this line promises how the
            // BOOK will spell the name, and that follows the story language.
            .replace('{name}', localizeName(progress.childDetails.childName || '', form.language))}
        </p>
      </div>

      {/* Mode Toggle: how the customer authors the story. The whole choice is
          hidden while the owner keeps AI mode switched off in the dashboard —
          there is no decision to make when "ready story" is the only option. */}
      {aiModeEnabled && (
        <div>
          <label className="block font-arabic text-white/80 text-sm mb-3">{t('step2.mode_label', 'كيف تريد إنشاء القصة؟')}</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              id="mode-template"
              onClick={() => setMode('template')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                mode === 'template' ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/60 hover:border-white/30'
              }`}
            >
              <BookOpen className="w-6 h-6" />
              <span className="font-arabic font-bold text-sm">{t('step2.mode_template', 'قصة جاهزة')}</span>
              <span className="font-arabic text-xs opacity-70 text-center">{t('step2.mode_template_desc', 'اختر من قصصنا المكتوبة بعناية')}</span>
            </button>
            <button
              type="button"
              id="mode-ai"
              onClick={() => setMode('ai')}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                mode === 'ai' ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/60 hover:border-white/30'
              }`}
            >
              <Sparkles className="w-6 h-6" />
              <span className="font-arabic font-bold text-sm">{t('step2.mode_ai', 'بالذكاء الاصطناعي')}</span>
              <span className="font-arabic text-xs opacity-70 text-center">{t('step2.mode_ai_desc', 'الذكاء الاصطناعي يكتب قصة فريدة')}</span>
            </button>
          </div>
        </div>
      )}

      {/* AI mode — the customer writes their OWN story idea and the AI builds a
          brand-new story around it (customThemeNote drives generation). */}
      {mode === 'ai' && (
        <div className="mb-5">
          <label className="block font-arabic text-white/80 text-sm mb-2">
            ✍️ {t('step2.idea_label', 'اكتب فكرة القصة التي تريدها')}
          </label>
          <textarea
            className="magic-input w-full min-h-[92px] resize-y"
            placeholder={t('step2.idea_placeholder', 'مثال: مغامرة يكتشف فيها بطلنا كوكباً مليئاً بالديناصورات الودودة، ويتعلّم قيمة الشجاعة...')}
            value={form.customThemeNote}
            onChange={(e) => setForm({ ...form, customThemeNote: e.target.value })}
          />
          <p className="font-arabic text-white/40 text-xs mt-1.5">
            {t('step2.idea_help', 'سيكتب الذكاء الاصطناعي قصة جديدة كاملة مبنية على فكرتك.')}
          </p>
        </div>
      )}

      {/* AI helper — shown only for AI mode: chat that recommends a theme for
          this child. Hidden in "ready story" mode (the customer browses themes). */}
      {mode === 'ai' && !themesLoading && THEMES.length > 0 && (
        <ThemeChatHelper
          language={i18n.language}
          childInfo={{
            name: progress.childDetails.childName,
            age: progress.childDetails.childAge,
            gender: progress.childDetails.childGender,
          }}
          onApply={(themeId) => {
            setForm((f) => ({ ...f, theme: themeId }));
            toast.success(t('step2.chat_applied'));
          }}
          resolveThemeName={(themeId) => {
            const th = THEMES.find((x) => x.id === themeId);
            return th ? getThemeLabel(th, t, i18n.language) : undefined;
          }}
        />
      )}

      {/* Theme Selection — only in "ready story" mode. In AI mode the assistant
          + Gemini shape the story, so the fixed theme grid is hidden. */}
      {mode !== 'ai' && (
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-3">{t('step2.theme_label')}</label>
        {themesLoading ? (
          <div className="flex items-center justify-center py-8 text-white/50 font-arabic text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('step2.themes_loading', 'جاري تحميل القصص المتاحة...')}
          </div>
        ) : THEMES.length === 0 ? (
          <div className="text-center py-8 text-white/60 font-arabic text-sm">
            {t('step2.themes_empty', 'لا توجد قصص متاحة الآن، يرجى المحاولة لاحقاً.')}
          </div>
        ) : (
        <>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {visibleThemes.map((theme) => (
            <button
              key={theme.id}
              id={`theme-${theme.id}`}
              type="button"
              onClick={() => setForm({ ...form, theme: theme.id })}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center ${form.theme === theme.id
                  ? 'border-gold-500 bg-gold-500/10'
                  : 'border-white/10 hover:border-white/30'
                }`}
            >
              <span className={`font-arabic font-bold text-xs ${form.theme === theme.id ? 'text-gold-500' : 'text-white/70'}`}>
                {getThemeLabel(theme, t, i18n.language)} {theme.emoji}
              </span>
            </button>
          ))}
        </div>
        {THEMES.length > INITIAL_THEME_COUNT && (
          <button
            type="button"
            onClick={() => setShowAllThemes(!showAllThemes)}
            className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 rounded-xl border border-white/10 hover:border-gold-500/40 hover:bg-gold-500/5 text-white/60 hover:text-gold-500 transition-all"
          >
            {showAllThemes ? (
              <><ChevronUp className="w-4 h-4" /><span className="font-arabic text-sm font-bold">{t('step2.show_less')}</span></>
            ) : (
              <><ChevronDown className="w-4 h-4" /><span className="font-arabic text-sm font-bold">{t('step2.show_more').replace('{count}', String(THEMES.length - INITIAL_THEME_COUNT))}</span></>
            )}
          </button>
        )}
        </>
        )}
        {form.theme === 'custom' && (
          <input
            type="text"
            className="magic-input mt-3"
            placeholder={t('step2.custom_theme_placeholder')}
            value={form.customThemeNote}
            onChange={(e) => setForm({ ...form, customThemeNote: e.target.value })}
          />
        )}
      </div>
      )}

      {/* Let the customer see their OWN child on the chosen cover before paying.
          Needs a signed-in account (the free allowance is per account) and an
          uploaded photo — there is no face to render without one. */}
      <CoverPreview
        childName={effectiveName}
        childGender={progress.childDetails.childGender || 'male'}
        childPhotoUrl={progress.childDetails.childPhotoUrl || ''}
        theme={form.theme}
        language={form.language}
        enabled={!!user && !!progress.childDetails.childPhotoUrl && form.theme !== 'custom'}
      />

      {/* How the child's name will be written once the language is chosen —
          and a box to correct it. The transliteration is a guess: «وهيب» can
          be Waheeb, Wahib or Waheb, and the parent is the one who knows. Left
          empty it follows the automatic spelling, so nobody has to care. */}
      {typedName && autoName !== typedName && (
        <div className="mt-3 rounded-xl bg-gold-500/[0.07] border border-gold-500/30 px-3 py-2.5">
          <label className="block font-arabic text-[11px] text-gold-200/90 mb-1.5" htmlFor="name-as-written">
            {t('cover_preview.name_as', 'سيظهر الاسم في القصة هكذا:')}
          </label>
          <div className="flex items-center gap-2">
            <input
              id="name-as-written"
              type="text"
              dir="auto"
              value={nameOverride || autoName}
              onChange={(e) => setChildDetails({ childNameAlt: e.target.value })}
              className="flex-1 px-3 py-2 rounded-lg bg-[#0a1426] border-2 border-gold-500/50 text-gold-300 font-black text-base text-center focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/25 transition"
            />
            {nameOverride && nameOverride !== autoName && (
              <button
                type="button"
                onClick={() => setChildDetails({ childNameAlt: '' })}
                className="px-2.5 py-2 rounded-lg text-[11px] font-arabic text-gold-300 hover:text-[#0a1426] hover:bg-gold-500 border border-gold-500/40 whitespace-nowrap transition"
                title={autoName}
              >
                {t('cover_preview.name_reset', 'رجوع للتلقائي')}
              </button>
            )}
          </div>
          <p className="font-arabic text-[10px] text-white/45 mt-1.5">
            {t('cover_preview.name_edit_hint', 'يمكنك تعديل طريقة كتابة الاسم — هكذا سيُطبع في الكتاب.')}
          </p>
        </div>
      )}

      {/* Language: The language in which the AI generator will write the text */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-3">
          <Globe className="w-4 h-4 inline ml-1 text-gold-500" />
          {t('step2.lang_label')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'ar', label: t('step2.lang_ar'), desc: t('step2.lang_ar_desc') },
            { id: 'en', label: t('step2.lang_en'), desc: t('step2.lang_en_desc') },
            { id: 'he', label: t('step2.lang_he'), desc: t('step2.lang_he_desc') },
          ].map((lang) => (
            <button
              key={lang.id}
              id={`lang-${lang.id}`}
              type="button"
              onClick={() => {
                setForm({ ...form, language: lang.id as 'ar' | 'en' | 'he' });
                // A spelling corrected for English means nothing in Hebrew.
                if (nameOverride) setChildDetails({ childNameAlt: '' });
              }}
              className={`p-3 rounded-xl border transition-all text-center sm:text-right ${form.language === lang.id
                  ? 'border-gold-500 bg-gold-500/10'
                  : 'border-white/10 hover:border-white/30'
                }`}
            >
              <div className={`font-arabic font-bold text-sm ${form.language === lang.id ? 'text-gold-500' : 'text-white'}`}>
                {lang.label}
              </div>
              <div className="font-arabic text-white/40 text-xs mt-0.5">{lang.desc}</div>
            </button>
          ))}
        </div>

      </div>

      {/* Book Format / Package: full-color story, colouring book, e-book … */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-3">{t('step3.packages_label')}</label>
        {/* How they can pay, said HERE rather than only on the last screen.
            Someone weighing up a 130 ILS book needs to know they can pay
            without meeting anyone — a customer outside Jerusalem who assumes
            it is cash-on-delivery only never starts the order at all. */}
        <p className="font-arabic text-white/45 text-[11px] mb-3 flex items-center gap-1.5">
          <span aria-hidden="true">💳</span>
          {liveSettings?.transferPayment?.enabled
            ? t('step2.pay_hint_transfer', 'الدفع نقداً عند الاستلام، أو تحويل عبر Bit من أي مكان.')
            : t('step2.pay_hint_cash', 'الدفع نقداً عند الاستلام.')}
        </p>
        <div className="flex gap-2 w-full">
          {packages.map((pkg) => {
            const isSoon = (pkg as any).soon;   // e.g. audio — not available yet
            return (
            <button
              key={pkg.id}
              type="button"
              id={`pkg-${pkg.id}`}
              disabled={isSoon}
              onClick={() => { if (!isSoon) setBookPackage(pkg.id); }}
              className={`relative flex-1 flex flex-col items-center justify-center p-2 h-28 rounded-2xl border-2 transition-all text-center group ${isSoon
                  ? 'border-white/10 bg-dark-700/30 opacity-50 cursor-not-allowed'
                  : bookPackage === pkg.id
                  ? 'border-gold-500 bg-gold-500/10 shadow-gold-glow'
                  : 'border-white/10 hover:border-white/30 bg-dark-700/50'
                }`}
            >
              <span className={`text-2xl mb-1 transition-transform duration-300 ${bookPackage === pkg.id && !isSoon ? 'scale-110' : 'group-hover:scale-110'}`}>
                {pkg.emoji}
              </span>
              <span className={`font-arabic text-xs font-bold leading-tight mb-1 ${bookPackage === pkg.id && !isSoon ? 'text-gold-500' : 'text-white'}`}>
                {pkg.label}
              </span>
              {isSoon ? (
                <span className="font-arabic text-white/60 font-bold text-xs">{t('step3.coming_soon', 'قريباً')}</span>
              ) : 'originalPrice' in pkg && pkg.originalPrice ? (
                <div className="flex items-center gap-1 justify-center">
                  <span className="font-arabic text-white/30 text-xs line-through">{(pkg as any).originalPrice} ₪</span>
                  <span className="font-arabic text-gold-500 font-bold text-xs">{pkg.price} ₪</span>
                </div>
              ) : (
                <span className="font-arabic text-gold-500 font-bold text-xs">{pkg.price} ₪</span>
              )}
              {isSoon && (
                <div className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-white/15 text-white/80 text-[10px] font-bold font-arabic">
                  {t('step3.coming_soon', 'قريباً')}
                </div>
              )}
              {bookPackage === pkg.id && !isSoon && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold-500 text-dark-900 flex items-center justify-center shadow-lg animate-scale-in">
                  <span className="text-xs font-bold">✓</span>
                </div>
              )}
            </button>
            );
          })}
        </div>
      </div>

      {/* Live Preview — hidden per request (flip SHOW_LIVE_PREVIEW to restore) */}
      {SHOW_LIVE_PREVIEW && (
      <div className="mt-8 flex flex-col items-center justify-center bg-dark-700/30 rounded-3xl border border-white/5 w-full py-12 relative min-h-[50px]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
        <label className="block font-arabic text-white/80 text-sm mb-2 text-center w-full">{t('step2.preview_label')}</label>
        {(() => {
          const selectedTheme = THEMES.find(t => t.id === form.theme);
          return selectedTheme ? (
            <p className="font-arabic text-gold-500/80 text-xs mb-6 text-center">
              {selectedTheme.emoji} {getThemeLabel(selectedTheme, t, i18n.language)} — {getThemeDesc(selectedTheme, t, i18n.language)}
            </p>
          ) : null;
        })()}
        <div className="w-full max-w-[500px] px-4">
          <FlipbookPreview pages={previewPages} language={form.language as any}/>
        </div>

      </div>
      )}

      {mode === 'ai' ? (
        <MagicButton
          id="generate-story-btn"
          fullWidth
          size="lg"
          onClick={generateStory}
          isLoading={isGenerating}
          icon={<Sparkles className="w-5 h-5" />}
        >
          {isGenerating
            ? t('step2.generating_text')
            : generatedText
              ? t('step2.regenerate_btn')
              : t('step2.generate_btn')}
        </MagicButton>
      ) : (
        <div className={`p-4 rounded-xl border text-center font-arabic text-sm ${
          templatePagesForCurrentTheme
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {templatePagesForCurrentTheme
            ? t('step2.template_loaded', 'القصة الجاهزة محملة. اضغط "التالي" للمتابعة.')
            : t('step2.template_missing', 'هذه القصة قيد الإعداد. اختر قصة أخرى أو استخدم الذكاء الاصطناعي.')}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5 nav-icon" />}>
          {t('wizard.prev_btn')}
        </MagicButton>
        <MagicButton
          id="step2-next-btn"
          fullWidth
          size="lg"
          onClick={handleNext}
          icon={<ChevronLeft className="w-5 h-5 nav-icon" />}
        >
        {t('step2.next_btn')}
        </MagicButton>
      </div>

    </div>
  );
}

function getMockPreview(childName: string, _theme: string): string {
  return `في مملكة بعيدة حيث تتلألأ النجوم كالألماس في السماء، كان يعيش طفل شجاع اسمه ${childName}. كان ${childName} يحلم دائماً بالمغامرات الكبيرة، ويتطلع في كل يوم إلى أفق الجبال البعيدة يتساءل عما يوجد خلفها.

في يوم جميل من أيام الربيع، استيقظ ${childName} باكراً ووجد أمام بابه طيراً صغيراً ذهبي الريش، يحمل في منقاره رسالة لامعة مكتوب عليها: "القلب الشجاع يجد طريقه دائماً."

قرر ${childName} أن يتبع الطائر الذهبي، فانطلق في رحلة عجيبة عبر الغابات الخضراء والأنهار الفضية. في طريقه، قابل أصدقاء جدداً أثروا حياته إلى الأبد.

[... تكشف باقي القصة بعد الدفع 🔒]`;
}
