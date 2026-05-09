import { useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { Sparkles, ChevronLeft, ChevronRight, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import FlipbookPreview from './FlipbookPreview';
import { storyApi } from '../../api/storyApi';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

// Props Interface: Defines navigation callbacks passed from the parent wizard container
interface Props { onNext: () => void; onPrev: () => void; }

const INITIAL_THEME_COUNT = 8;

export default function Step2_AI_Generator({ onNext, onPrev }: Props) { // To move to the next page in the steps
  const { progress, setStoryConfig } = useStoryProgress(); // To save User Choices in the steps
  const { t } = useTranslation();

  // Constant: Array defining all available story themes, their emojis, and labels
  const THEMES = [
    { id: 'adventure', emoji: '🗺️', label: t('step2.theme_adventure'), desc: t('step2.theme_adventure_desc') },
    { id: 'space', emoji: '🚀', label: t('step2.theme_space'), desc: t('step2.theme_space_desc') },
    { id: 'ocean', emoji: '🌊', label: t('step2.theme_ocean'), desc: t('step2.theme_ocean_desc') },
    { id: 'forest', emoji: '🌿', label: t('step2.theme_forest'), desc: t('step2.theme_forest_desc') },
    { id: 'princess', emoji: '👸', label: t('step2.theme_princess'), desc: t('step2.theme_princess_desc') },
    { id: 'superhero', emoji: '⚡', label: t('step2.theme_superhero'), desc: t('step2.theme_superhero_desc') },
    { id: 'animals', emoji: '🦁', label: t('step2.theme_animals'), desc: t('step2.theme_animals_desc') },
    { id: 'dinosaurs', emoji: '🦕', label: t('step2.theme_dinosaurs'), desc: t('step2.theme_dinosaurs_desc') },
    { id: 'pirates', emoji: '🏴‍☠️', label: t('step2.theme_pirates'), desc: t('step2.theme_pirates_desc') },
    { id: 'robots', emoji: '🤖', label: t('step2.theme_robots'), desc: t('step2.theme_robots_desc') },
    { id: 'magic', emoji: '🧙', label: t('step2.theme_magic'), desc: t('step2.theme_magic_desc') },
    { id: 'sports', emoji: '⚽', label: t('step2.theme_sports'), desc: t('step2.theme_sports_desc') },
    { id: 'cooking', emoji: '👨‍🍳', label: t('step2.theme_cooking'), desc: t('step2.theme_cooking_desc') },
    { id: 'music', emoji: '🎵', label: t('step2.theme_music'), desc: t('step2.theme_music_desc') },
    { id: 'custom', emoji: '✏️', label: t('step2.theme_custom'), desc: t('step2.theme_custom_desc') },
  ];


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
      });
      const newStoryId = createRes.story._id;
      setStoryId(newStoryId);

      const genRes = await storyApi.generate(newStoryId);
      const text = genRes.story.generatedText || '';
      setGeneratedText(text);
      setStoryConfig({ ...form, generatedText: text, storyId: newStoryId });
      toast.success(t('step2.gen_success'));
    } catch (err: any) {
      // Use mock story if API not connected
      const mockText = getMockPreview(progress.childDetails.childName || 'طفلك', form.theme);
      setGeneratedText(mockText);
      setStoryConfig({ ...form, generatedText: mockText });
      toast.success(t('step2.gen_success'), { icon: '📖' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Function: Ensures text is properly generated before allowing the user to proceed to Step 3
  const handleNext = () => {
    if (!generatedText) {
      toast.error(t('step2.err_not_generated'));
      return;
    }
    setStoryConfig({ ...form, generatedText, storyId });
    onNext();
  };

  const previewTextContent = generatedText ? generatedText : `قصة سحرية عن ${progress.childDetails.childName || 'الطفل'} يستكشف عوالم وألوان جديدة...`;
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">✨</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">{t('step2.title')}</h2>
        <p className="font-arabic text-white/50 text-sm">{t('step2.desc').replace('{name}', progress.childDetails.childName || '')}</p>
      </div>

      {/* Theme Selection: Core subject/plot that the AI will use to build the child's story */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-3">{t('step2.theme_label')}</label>
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
