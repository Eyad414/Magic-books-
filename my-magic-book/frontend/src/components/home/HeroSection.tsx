import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Star, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStoryProgress } from '../../context/StoryProgressContext';

export default function HeroSection() {
  const { t } = useTranslation();
  const { resetProgress } = useStoryProgress();
  const navigate = useNavigate();

  const handleStartStory = (e: React.MouseEvent) => {
    e.preventDefault();
    resetProgress();
    navigate('/create');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Radial background glow */}
      <div className="absolute inset-0 bg-hero-radial opacity-60" />
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-magic-500/20 rounded-full blur-3xl animate-pulse-gold" />
      <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl animate-pulse" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-right animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-500 font-arabic text-sm mb-6">
              <Sparkles className="w-4 h-4 animate-sparkle" />
              <span>{t('hero.ai_powered')}</span>
            </div>

            <h1 className="font-arabic font-black text-white mb-6">
              {t('hero.create')}{' '}
              <span className="shimmer-text">{t('hero.magic_story')}</span>
              <br />
              {t('hero.for_your_child')}
            </h1>

            <p className="font-arabic text-white/60 text-lg md:text-xl leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
              {t('hero.description')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-end gap-4">
              <button
                id="hero-cta-btn"
                onClick={handleStartStory}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-lg transition-all duration-300 hover:shadow-gold-glow hover:-translate-y-1 group"
              >
                <Sparkles className="w-5 h-5 group-hover:animate-sparkle" />
                <span>{t('hero.start_magic_story')}</span>
              </button>
              <Link
                to="/stories"
                id="hero-stories-btn"
                className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/20 text-white/80 font-arabic font-medium text-lg hover:border-gold-500/40 hover:text-gold-500 transition-all"
              >
                <span>{t('hero.browse_stories')}</span>
                <ArrowLeft className="w-4 h-4 rtl:rotate-0 ltr:rotate-180 transition-transform" />
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center lg:justify-end gap-8 mt-10">
              {[
                { value: '+500', label: t('hero.stats_stories_created') },
                { value: '+100', label: t('hero.stats_happy_families') },
                { value: '+20', label: t('hero.stats_ready_stories') },
                { value: '5 ⭐', label: t('hero.stats_rating') },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-arabic font-black text-gold-500 text-2xl" dir="ltr">{stat.value}</div>
                  <div className="font-arabic text-white/40 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Floating Book Illustration */}
          <div className="flex items-center justify-center animate-float">
            <div className="relative">
              {/* Main book */}
              <div className="w-64 h-80 md:w-80 md:h-96 relative" style={{ perspective: '1000px' }}>
                <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #1B1F5E 0%, #6C3FC5 50%, #1B1F5E 100%)',
                    border: '3px solid rgba(245,166,35,0.4)',
                    boxShadow: '0 0 60px rgba(108,63,197,0.5), 0 0 30px rgba(245,166,35,0.2)',
                  }}
                >
                  {/* Book content mockup */}
                  <div className="p-6 h-full flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center mb-4">
                        <Star className="w-6 h-6 text-gold-500 animate-sparkle" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-white/20 rounded-full w-3/4" />
                        <div className="h-3 bg-white/15 rounded-full w-full" />
                        <div className="h-3 bg-white/15 rounded-full w-2/3" />
                        <div className="h-3 bg-white/10 rounded-full w-5/6" />
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <div className="text-gold-500 font-arabic text-sm font-bold">{t('hero.custom_story')}</div>
                      <div className="h-2 bg-white/10 rounded-full w-1/2 mt-2" />
                    </div>
                  </div>
                </div>
                {/* Floating sparkles */}
                {[
                  { top: '-12px', right: '-12px', delay: '0s', size: 'w-8 h-8' },
                  { top: '20%', left: '-20px', delay: '0.5s', size: 'w-6 h-6' },
                  { bottom: '20%', right: '-15px', delay: '1s', size: 'w-7 h-7' },
                  { bottom: '-10px', left: '20%', delay: '1.5s', size: 'w-5 h-5' },
                ].map((pos, i) => (
                  <div
                    key={i}
                    className={`absolute ${pos.size} rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center animate-sparkle shadow-gold-glow`}
                    style={{ ...pos, animationDelay: pos.delay }}
                  >
                    <Sparkles className="w-3 h-3 text-dark-900" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 animate-bounce-slow">
        <span className="font-arabic text-xs">{t('hero.discover_more')}</span>
        <div className="w-0.5 h-8 bg-gradient-to-b from-white/20 to-transparent" />
      </div>
    </section>
  );
}

