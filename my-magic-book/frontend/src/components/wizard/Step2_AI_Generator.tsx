import { useEffect, useMemo, useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { Sparkles, ChevronLeft, ChevronRight, Globe, ChevronDown, ChevronUp, Loader2, BookOpen } from 'lucide-react';
import FlipbookPreview from './FlipbookPreview';
import { storyApi } from '../../api/storyApi';
import { publicApi } from '../../api/publicApi';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { STORY_TEMPLATES } from '../../data/stories/templates';
import { buildBook } from '../../data/stories/builder';
import type { StoryMode } from '../../context/StoryProgressContext';

// Props Interface: Defines navigation callbacks passed from the parent wizard container
interface Props { onNext: () => void; onPrev: () => void; }

const INITIAL_THEME_COUNT = 8;

interface ApiTheme { id: string; emoji: string; label: string; desc: string; ready?: boolean; }

export default function Step2_AI_Generator({ onNext, onPrev }: Props) { // To move to the next page in the steps
  const { progress, setStoryConfig } = useStoryProgress(); // To save User Choices in the steps
  const { t } = useTranslation();

  // Themes come from the admin panel via /api/public/settings. The backend
  // already filters to ready===true so half-finished stories never appear.
  const [THEMES, setThemes] = useState<ApiTheme[]>([]);
  const [themesLoading, setThemesLoading] = useState(true);

  useEffect(() => {
    publicApi.getSettings()
      .then((res) => {
        const fromApi: ApiTheme[] = (res?.settings?.themes ?? []).map((dbTheme: any) => {
          const labelKey = `step2.theme_${dbTheme.id}`;
          const descKey = `step2.theme_${dbTheme.id}_desc`;
          const localizedLabel = t(labelKey);
          const localizedDesc = t(descKey);
          return {
            id: dbTheme.id,
            emoji: dbTheme.emoji,
            // Prefer the i18n string if one exists, otherwise fall back to the admin-edited label.
            label: localizedLabel !== labelKey ? localizedLabel : dbTheme.label,
            desc: localizedDesc !== descKey ? localizedDesc : dbTheme.desc,
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

  // Local State: Stores the selected theme, language and any custom notes
  const [form, setForm] = useState({
    theme: progress.storyConfig.theme || 'adventure',
    language: progress.storyConfig.language || 'ar' as 'ar' | 'en' | 'he',
    customThemeNote: progress.storyConfig.customThemeNote || '',
  });
  
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
      const createRes = await storyApi.create({
        ...childDetails,
        ...form,
        mode: 'ai',
      });
      const newStoryId = createRes.story._id;
      setStoryId(newStoryId);

      const genRes = await storyApi.generate(newStoryId);
      const text = genRes.story.generatedText || '';
      setGeneratedText(text);
      setStoryConfig({ ...form, mode: 'ai', generatedText: text, storyId: newStoryId });
      toast.success(t('step2.gen_success'));
    } catch (err: any) {
      // Use mock story if API not connected
      const mockText = getMockPreview(progress.childDetails.childName || 'طفلك', form.theme);
      setGeneratedText(mockText);
      setStoryConfig({ ...form, mode: 'ai', generatedText: mockText });
      toast.success(t('step2.gen_success'), { icon: '📖' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Function: Looks up the handwritten template for the currently-selected theme
  // and substitutes the kid's name. Returns null if no template exists.
  const templatePagesForCurrentTheme = useMemo(() => {
    const raw = STORY_TEMPLATES[form.theme];
    if (!raw || raw.length === 0) return null;
    return buildBook(raw, progress.childDetails.childName || '...', progress.childDetails.childPhotoUrl || '');
  }, [form.theme, progress.childDetails.childName, progress.childDetails.childPhotoUrl]);

  // Function: Ensures the story is ready before proceeding to Step 3.
  // In template mode this is also where we create the Story in the DB
  // (no separate "generate" step). The raw template (with {{name}} placeholders
  // still intact) is sent — backend substitutes at PDF render time.
  const handleNext = async () => {
    if (mode === 'ai' && !generatedText) {
      toast.error(t('step2.err_not_generated'));
      return;
    }
    if (mode === 'template' && !STORY_TEMPLATES[form.theme]) {
      toast.error(t('step2.err_template_missing', 'هذه القصة قيد الإعداد، الرجاء اختيار أخرى أو استخدام الذكاء الاصطناعي.'));
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
            mode: 'template',
            templatePages: STORY_TEMPLATES[form.theme], // raw, placeholders intact
          });
          nextStoryId = createRes.story._id;
          setStoryId(nextStoryId);
        } catch (err: any) {
          toast.error(err?.response?.data?.message || err.message || 'فشل في حفظ القصة');
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
    onNext();
  };

  // Preview text used inside the flipbook component.
  const previewTextContent = (() => {
    if (mode === 'template' && templatePagesForCurrentTheme) {
      return templatePagesForCurrentTheme
        .filter((p) => p.type === 'text')
        .map((p) => (p as { content: string }).content)
        .join('\n\n');
    }
    if (generatedText) return generatedText;
    return `قصة سحرية عن ${progress.childDetails.childName || 'الطفل'} يستكشف عوالم وألوان جديدة...`;
  })();
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">✨</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">{t('step2.title')}</h2>
        <p className="font-arabic text-white/50 text-sm">{t('step2.desc').replace('{name}', progress.childDetails.childName || '')}</p>
      </div>

      {/* Mode Toggle: how the customer authors the story */}
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

      {/* Theme Selection: Core subject/plot that the AI will use to build the child's story */}
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
                {theme.label} {theme.emoji}
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
              onClick={() => setForm({ ...form, language: lang.id as 'ar' | 'en' | 'he' })}
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

      {/* Live Preview: Interactive Flipbook to let parents visualize how the book will look */}
      <div className="mt-8 flex flex-col items-center justify-center bg-dark-700/30 rounded-3xl border border-white/5 w-full py-12 relative min-h-[50px]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
        <label className="block font-arabic text-white/80 text-sm mb-2 text-center w-full">{t('step2.preview_label')}</label>
        {(() => {
          const selectedTheme = THEMES.find(t => t.id === form.theme);
          return selectedTheme ? (
            <p className="font-arabic text-gold-500/80 text-xs mb-6 text-center">
              {selectedTheme.emoji} {selectedTheme.label} — {selectedTheme.desc}
            </p>
          ) : null;
        })()}
        <div className="w-full max-w-[500px] px-4">
          <FlipbookPreview text={previewTextContent} language={form.language as any}/>
        </div>

      </div>

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
