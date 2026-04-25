import { useState } from 'react';
import { Star, Lock, BookOpen, Eye, X } from 'lucide-react';
import FlipbookPreview from '../components/wizard/FlipbookPreview';
import { Link } from 'react-router-dom';

const SAMPLE_STORIES = [
  { id: 1, childName: 'محمد', theme: 'adventure', emoji: '🗺️', color: ['#1B1F5E', '#6C3FC5'], rating: 5.0, previewText: 'في صحراء لا حدود لها، انطلق محمد بشجاعة لم يعرفها أحد من قبل. كان قلبه يدق بسرعة وعيناه تلمعان بفضول المستكشف...' },
  { id: 2, childName: 'سارة', theme: 'princess', emoji: '👸', color: ['#4a148c', '#6a1b9a'], rating: 4.9, previewText: 'في مملكة حيث تتساقط الورود من السماء، كانت الأميرة سارة تنتظر مغامرة تختلف عن كل ما رأته...' },
  { id: 3, childName: 'علي', theme: 'space', emoji: '🚀', color: ['#006064', '#00838f'], rating: 5.0, previewText: 'ارتفعت مركبة الفضاء وعلي يمسك بها بكلتا يديه، أمامه الكون اللامتناهي وقلبه مليء بالتساؤلات...' },
  { id: 4, childName: 'ريم', theme: 'ocean', emoji: '🌊', color: ['#1a237e', '#283593'], rating: 4.8, previewText: 'غاصت ريم تحت الماء لأول مرة، وما رأته عيناها لم تتخيله في أجمل أحلامها — عالم يتلألأ...' },
  { id: 5, childName: 'خالد', theme: 'superhero', emoji: '⚡', color: ['#1b5e20', '#2e7d32'], rating: 5.0, previewText: 'اكتشف خالد قوته الخارقة في يوم عادي، لكن مع القوة جاءت مسؤولية لم يكن يتوقعها...' },
  { id: 6, childName: 'نورة', theme: 'forest', emoji: '🌿', color: ['#bf360c', '#d84315'], rating: 4.9, previewText: 'دخلت نورة الغابة السرية التي لم يدخلها أحد من القرية، وفوجئت بصوت يناديها بالاسم...' },
];

export default function Stories() {
  const [selectedStory, setSelectedStory] = useState<any>(null);

  const getStoryText = (text: string) => {
    // Repeat the short text to make the book preview look better
    return `${text} ${text} فجأة، تغير كل شيء أمام أعينهم وبدأت رحلة جديدة مليئة بالتحديات التي تحتاج إلى شجاعة وذكاء. هل سيتمكنون من الوصول إلى هدفهم؟`;
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="font-arabic font-black text-white mb-4">
            مكتبة <span className="shimmer-text">القصص السحرية</span>
          </h1>
          <p className="font-arabic text-white/50 text-lg">
            استمتع بمعاينة قصصنا المخصصة — ابدأ ٣٠٪ مجاناً، واحصل على الكتاب كاملاً بعد الطلب
          </p>
        </div>

        {/* Preview Lock Banner */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-gold-500/10 border border-gold-500/30 mb-10">
          <Lock className="w-5 h-5 text-gold-500 flex-shrink-0" />
          <p className="font-arabic text-white/70 text-sm">
            <strong className="text-gold-500">نظام المعاينة:</strong> يمكن مشاهدة ٣٠٪ من كل قصة مجاناً — باقي القصة يُكشف بعد طلب كتابك المخصص
          </p>
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_STORIES.map((story) => (
            <div key={story.id} className="glass-card glass-card-hover overflow-hidden group">
              {/* Cover */}
              <div
                className="h-40 flex items-center justify-center relative"
                style={{ background: `linear-gradient(135deg, ${story.color[0]}, ${story.color[1]})` }}
              >
                <span className="text-5xl group-hover:animate-float">{story.emoji}</span>
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-gold-500 px-2 py-1 rounded-lg">
                  <Star className="w-3 h-3 text-dark-900 fill-dark-900" />
                  <span className="font-arabic font-bold text-dark-900 text-xs">{story.rating}</span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-arabic font-bold text-white text-lg mb-1">قصة {story.childName}</h3>
                <p className="font-arabic text-gold-500 text-xs mb-3">موضوع: {story.theme}</p>

                {/* Preview text with blur */}
                <div className="relative mb-4">
                  <div className="blur-preview">
                    <p className="font-arabic text-white/70 text-sm leading-relaxed">
                      {story.previewText}
                    </p>
                    <p className="font-arabic text-white/70 text-sm leading-relaxed mt-2">
                      وتتواصل القصة في مغامرة مثيرة مليئة بالمفاجآت والدروس...
                    </p>
                  </div>
                </div>

                {/* Lock notice */}
                <div className="flex flex-wrap items-center justify-between p-3 rounded-xl bg-dark-700 border border-white/10 mb-4 gap-2">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedStory(story)}
                      className="flex items-center gap-1 border-l border-white/10 pl-3 group cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-gold-500 group-hover:scale-125 transition-transform" />
                      <span className="font-arabic text-gold-500 text-xs border-b border-transparent group-hover:border-gold-500 transition-colors">٣٠٪ مُتاح</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-white/40" />
                      <span className="font-arabic text-white/40 text-xs">٧٠٪ مقفل</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-white/60" />
                    <span className="font-arabic text-white/60 text-xs font-bold">يكتمل بالطلب</span>
                  </div>
                </div>

                <Link to="/create" id={`story-cta-${story.id}`}>
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-sm hover:shadow-gold-glow transition-all">
                    ✨ ابدأ بصنع قصتك الآن
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Catchy Banner */}
        <div className="mt-12 flex items-center justify-center animate-fade-in-up">
          <div className="inline-flex flex-wrap items-center justify-center gap-4 px-8 py-5 rounded-3xl bg-gold-500/10 border border-gold-500/20 backdrop-blur-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-500/10 to-transparent animate-shimmer" />
            <span className="font-arabic font-bold text-white text-lg md:text-xl relative">قصص أكثر 📚</span>
            <span className="font-arabic font-black text-gold-500 text-2xl relative">=</span>
            <span className="flex items-center gap-2 relative">
              <span className="font-arabic font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-magic-400 to-cyan-400 drop-shadow-[0_2px_10px_rgba(192,132,252,0.4)] text-lg md:text-xl relative">ذكريات أكثر</span>
              <span className="text-lg md:text-xl">📸</span>
            </span>
            <span className="font-arabic font-black text-gold-500 text-2xl relative">=</span>
            <span className="font-arabic font-bold text-gold-500 drop-shadow-[0_0_15px_rgba(245,166,35,0.6)] text-lg md:text-xl relative animate-pulse">سعادة أكبر ✨</span>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-14 glass-card p-10">
          <div className="text-5xl mb-4">🌟</div>
          <h2 className="font-arabic font-bold text-white text-2xl mb-3">
            هل تريد قصة تحمل اسم طفلك؟
          </h2>
          <p className="font-arabic text-white/50 mb-6">
            أنشئ قصة مخصصة بالكامل لطفلك — اسمه هو البطل، موضوعه هو الحكاية
          </p>
          <Link to="/create">
            <button className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-xl hover:shadow-gold-glow hover:-translate-y-1 transition-all duration-300">
              ✨ ابدأ بصنع قصتك الآن
            </button>
          </Link>
        </div>
      </div>

      {/* Flipbook Modal */}
      {selectedStory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in text-center">
          <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-md" onClick={() => setSelectedStory(null)} />
          
          <div className="relative w-full max-w-4xl glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-dark-900/95 p-6 md:p-8 pt-10">
            <button 
              onClick={() => setSelectedStory(null)} 
              className="absolute top-4 left-4 p-2 rounded-full bg-white/5 hover:bg-gold-500 hover:text-dark-900 text-white/50 transition-all z-20"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="mb-6">
              <h3 className="font-arabic font-black text-white text-2xl">
                معاينة قصة <span className="text-gold-500">{selectedStory.childName}</span>
              </h3>
              <p className="font-arabic text-white/50 text-sm mt-2 flex items-center justify-center gap-2">
                <Eye className="w-4 h-4 text-gold-500" />
                هذا العرض يوضح ٣٠٪ فقط من القصة المخصصة
              </p>
            </div>
            
            <div className="my-8 flex justify-center">
              <FlipbookPreview text={getStoryText(selectedStory.previewText)} />
            </div>

            <div className="flex justify-center mt-6">
              <Link to="/create" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-bold text-lg hover:shadow-gold-glow hover:-translate-y-1 transition-all">
                ✨ ابدأ بصنع نسختك الكاملة
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
