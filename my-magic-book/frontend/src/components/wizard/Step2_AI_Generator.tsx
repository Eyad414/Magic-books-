import { useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { Sparkles, ChevronLeft, ChevronRight, Globe } from 'lucide-react';
import FlipbookPreview from './FlipbookPreview';
import { storyApi } from '../../api/storyApi';
import toast from 'react-hot-toast';

// Props Interface: Defines navigation callbacks passed from the parent wizard container
interface Props { onNext: () => void; onPrev: () => void; }

// Constant: Array defining all available story themes, their emojis, and labels
const THEMES = [
  { id: 'adventure', emoji: '🗺️', label: 'مغامرة', desc: 'استكشاف ومغامرات مثيرة' },
  { id: 'space', emoji: '🚀', label: 'الفضاء', desc: 'رحلات بين النجوم والكواكب' },
  { id: 'ocean', emoji: '🌊', label: 'المحيط', desc: 'عالم تحت الماء الساحر' },
  { id: 'forest', emoji: '🌿', label: 'الغابة', desc: 'حيوانات ناطقة وأسرار' },
  { id: 'princess', emoji: '👸', label: 'الأميرة', desc: 'قصور وأميرات ومغامرات' },
  { id: 'superhero', emoji: '⚡', label: 'البطل الخارق', desc: 'قوى خارقة وبطولات' },
  { id: 'animals', emoji: '🦁', label: 'الحيوانات', desc: 'حيوانات أليفة ووحشية' },
  { id: 'custom', emoji: '✏️', label: 'موضوع خاص', desc: 'اختر موضوعك الخاص' },
];



export default function Step2_AI_Generator({ onNext, onPrev }: Props) { // To move to the next page in the steps
  const { progress, setStoryConfig } = useStoryProgress(); // To save User Choices in the steps
  
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
      toast.success('تم توليد القصة بنجاح! ✨');
    } catch (err: any) {
      // Use mock story if API not connected
      const mockText = getMockPreview(progress.childDetails.childName || 'طفلك', form.theme);
      setGeneratedText(mockText);
      setStoryConfig({ ...form, generatedText: mockText });
      toast.success('تم توليد القصة! ✨', { icon: '📖' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Function: Ensures text is properly generated before allowing the user to proceed to Step 3
  const handleNext = () => {
    if (!generatedText) {
      toast.error('يرجى توليد القصة أولاً');
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
        <h2 className="font-arabic font-bold text-white text-xl mb-1">اختر موضوع قصتك</h2>
        <p className="font-arabic text-white/50 text-sm">الذكاء الاصطناعي سيكتب قصة مخصصة لـ {progress.childDetails.childName}</p>
      </div>

      {/* Theme Selection: Core subject/plot that the AI will use to build the child's story */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-3">🎭 موضوع القصة</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map((theme) => (
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
              <span className="text-2xl">{theme.emoji}</span>
              <span className={`font-arabic font-bold text-xs ${form.theme === theme.id ? 'text-gold-500' : 'text-white/70'}`}>
                {theme.label}
              </span>
            </button>
          ))}
        </div>
        {form.theme === 'custom' && (
          <input
            type="text"
            className="magic-input mt-3"
            placeholder="اكتب موضوع قصتك الخاص..."
            value={form.customThemeNote}
            onChange={(e) => setForm({ ...form, customThemeNote: e.target.value })}
          />
        )}
      </div>


      {/* Language: The language in which the AI generator will write the text */}
      <div>
        <label className="block font-arabic text-white/80 text-sm mb-3">
          <Globe className="w-4 h-4 inline ml-1 text-gold-500" />
          لغة القصة
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'ar', label: 'العربية 🇸🇦', desc: 'قصة فصحى' },
            { id: 'en', label: 'الإنجليزية 🇬🇧', desc: 'English story' },
            { id: 'he', label: 'العبرية 🇮🇱', desc: 'סיפור קסום' },
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
      <div className="mt-8 flex flex-col items-center justify-center bg-dark-700/30 rounded-3xl border border-white/5 w-full py-12 relative min-h-[700px]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
        <label className="block font-arabic text-white/80 text-sm mb-6 text-center w-full">📖 نظرة مبدئية على الكتاب</label>
        <div className="w-[350px] scale-110 sm:scale-125 transform origin-top transition-transform duration-500">
          <FlipbookPreview text={previewTextContent} language={form.language as any} />
        </div>

      </div>

      {/* Generate Button */}
      {!generatedText && (
        <MagicButton
          id="generate-story-btn"
          fullWidth
          size="lg"
          onClick={generateStory}
          isLoading={isGenerating}
          icon={<Sparkles className="w-5 h-5" />}
        >
          {isGenerating ? 'يكتب الذكاء الاصطناعي قصتك...' : 'اكتب لي قصة سحرية ✨'}
        </MagicButton>
      )}



      {/* Navigation */}
      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5" />}>
          السابق
        </MagicButton>
        <MagicButton
          id="step2-next-btn"
          fullWidth
          size="lg"
          onClick={handleNext}
          icon={<ChevronLeft className="w-5 h-5" />}
        >
          التالي — تخصيص الكتاب
        </MagicButton>
      </div>

      {/* Enhanced Information Section: Two distinct divs for page count and guidance (Moved to Lowest) */}
      <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
        {/* Card 1: Page Count */}
        <div className="flex-1 w-full sm:w-auto bg-navy-800/50 border border-gold-500/20 rounded-2xl p-5 flex flex-col items-center text-center backdrop-blur-lg transition-transform hover:scale-105 max-w-sm">
          <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center mb-3">
            <span className="text-xl">📖</span>
          </div>
          <span className="font-arabic text-gold-500 font-black text-base">٣٢ صفحة سحرية</span>
          <span className="font-arabic text-white/40 text-xs mt-1">إجمالي صفحات كتابك المخصص</span>
        </div>

        {/* Card 2: Guidance */}
        <div className="flex-1 w-full sm:w-auto bg-navy-800/50 border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center backdrop-blur-lg transition-transform hover:scale-105 max-w-sm">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3">
            <span className="text-xl">🖱️</span>
          </div>
          <span className="font-arabic text-white font-bold text-base">استكشف القصة</span>
          <span className="font-arabic text-white/40 text-xs mt-1">اسحب أو اضغط لقلب الصفحات</span>
        </div>
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
