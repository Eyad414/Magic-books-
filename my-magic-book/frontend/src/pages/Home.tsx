import { useTranslation, Trans } from 'react-i18next';
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
            <Trans i18nKey="home.value_tagline" components={{ gold: <span className="text-gold-500" /> }} />
          </p>
        </div>
      </div>
    </div>
  );
}

