import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStoryProgress } from '../context/StoryProgressContext';
import HeroSection from '../components/home/HeroSection';
import WorkFlow from '../components/home/WorkFlow';
import BestSellers from '../components/home/BestSellers';


function ScrollIndicator() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-white/30 animate-bounce-slow py-4">
      <span className="font-arabic text-xs">{t('home.discover_more')}</span>
      <div className="w-0.5 h-10 bg-gradient-to-b from-gold-500/50 to-transparent" />
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const { resetProgress } = useStoryProgress();
  const navigate = useNavigate();

  const handleStartStory = (e: React.MouseEvent) => {
    e.preventDefault();
    resetProgress();
    navigate('/create');
  };

  return (
    <div>
      <HeroSection />
      
      <WorkFlow />
      <ScrollIndicator />
      
      <BestSellers />
      <ScrollIndicator />
      <div className="max-w-3xl mx-auto px-4 mt-8 mb-16 flex justify-center">
        <div className="glass-card glass-card-hover p-10 text-center w-full relative overflow-hidden border border-gold-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
          
          <div className="text-5xl mb-6 relative z-10">✨📖</div>
          <p className="font-arabic font-black text-white text-2xl leading-relaxed relative z-10">
            "نحن لا نصنع قصصاً فقط، نحن نبني <span className="text-gold-500">ثقة الطفل</span> بنفسه وننمي لديه <span className="text-gold-500">حب القراءة</span>."
          </p>
        </div>
      </div>
      <ScrollIndicator />
      {/* Final CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto glass-card p-12">
          <div className="text-5xl mb-6">📚✨</div>
          <h2 className="font-arabic font-black text-white mb-4">
            {t('home.final_cta_title')}
          </h2>
          <p className="font-arabic text-white/50 mb-8">
            {t('home.final_cta_desc')}
          </p>
          <button
            id="home-final-cta"
            onClick={handleStartStory}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-xl transition-all duration-300 hover:shadow-gold-glow hover:-translate-y-1"
          >
            {t('home.final_cta_btn')}
          </button>
        </div>
      </section>
    </div>
  );
}

