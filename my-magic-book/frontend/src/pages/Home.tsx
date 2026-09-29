import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { usePageMeta } from '../hooks/usePageMeta';
import HeroSection from '../components/home/HeroSection';
import WorkFlow from '../components/home/WorkFlow';
import BestSellers from '../components/home/BestSellers';
import WhatYouGet from '../components/home/WhatYouGet';
import NameMagic from '../components/home/NameMagic';
import HomeFaq from '../components/home/HomeFaq';


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
  usePageMeta(t('meta.home_title'));

  /**
   * Make /#faq actually land on the FAQ.
   *
   * The browser tries the anchor the moment the document arrives, which on a
   * single-page app is before React has rendered anything — so the element does
   * not exist yet, the jump silently does nothing, and the visitor lands at the
   * top of the home page wondering what the link was for. The About page links
   * here, so that link was one render away from being decorative.
   */
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    // One frame after paint: the section is mounted by then, and this runs on
    // every hash change so a second click on the same link still works.
    const raf = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [hash]);

  return (
    <div>
      <HeroSection />
      
      {/* The claim "your child's name in every page" was three screens away
          from any evidence of it. This is the evidence, and it comes first. */}
      <NameMagic />
      <WorkFlow />

      {/* What arrives and what it costs — the page said neither, and a parent
          had to reach step three of the wizard to find a price. */}
      <WhatYouGet />
      <ScrollIndicator />
      
      <BestSellers />
      <HomeFaq />
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

