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

