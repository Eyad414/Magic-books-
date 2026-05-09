import { Star, BookOpen, Heart, Award, Globe, Zap, Languages } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStoryProgress } from '../context/StoryProgressContext';

// FAQ section
function FAQ() {
  const { t } = useTranslation();
  const faqs = [
    { q: t('about.faqs.1_q'), a: t('about.faqs.1_a') },
    { q: t('about.faqs.2_q'), a: t('about.faqs.2_a') },
    { q: t('about.faqs.3_q'), a: t('about.faqs.3_a') },
    { q: t('about.faqs.4_q'), a: t('about.faqs.4_a') },
    { q: t('about.faqs.5_q'), a: t('about.faqs.5_a') },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 mb-20 bg-dark-700/30 rounded-3xl mx-auto max-w-5xl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-arabic font-black text-white text-3xl">
            {t('about.faq_title_1')} <span className="shimmer-text">{t('about.faq_title_2')}</span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-card p-6">
              <h3 className="font-arabic font-bold text-white text-lg mb-3 flex items-start gap-2">
                <span className="text-gold-500">❓</span> {faq.q}
              </h3>
              <p className="font-arabic text-white/70 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AboutUs() {
  const { t } = useTranslation();
  const { resetProgress } = useStoryProgress();
  const navigate = useNavigate();
  
  const handleStartStory = (e: React.MouseEvent) => {
    e.preventDefault();
    resetProgress();
    navigate('/create');
  };

  const team = [
    { name: 'Eyad Abu Taha', 
      role: 'Founder & CEO | Software Engineer',
      emoji: '👨‍💻',
      desc: t('about.founder_role'),
      instagram: 'https://www.instagram.com/iyad_abu_taha?igsh=MWQ2Z3QzdTAwM3V6dA==' },
  ];

  const values = [
    { icon: Heart, title: t('about.values.1_title'), desc: t('about.values.1_desc') },
    { icon: Star, title: t('about.values.2_title'), desc: t('about.values.2_desc') },
    { icon: Globe, title: t('about.values.3_title'), desc: t('about.values.3_desc') },
    { icon: Award, title: t('about.values.4_title'), desc: t('about.values.4_desc') },
    { icon: Zap, title: t('about.values.5_title'), desc: t('about.values.5_desc') },
    { icon: Languages, title: t('about.values.6_title'), desc: t('about.values.6_desc') },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Hero */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-6xl mb-6">📚✨</div>
          <h1 className="font-arabic font-black text-white mb-6">
            {t('about.hero_title_1')} <span className="shimmer-text">{t('about.hero_title_2')}</span>
          </h1>
          <p className="font-arabic text-white/60 text-xl leading-relaxed mb-8">
            {t('about.hero_desc')}
          </p>
          <div className="flex items-center justify-center gap-1 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="w-6 h-6 text-gold-500 fill-gold-500" />
            ))}
            <span className="font-arabic text-white/60 mx-2 text-sm">{t('about.rating_text')}</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { value: '+500', label: t('hero.stats_stories_created'), emoji: '📖' },
            { value: '+100', label: t('hero.stats_happy_families'), emoji: '👨‍👩‍👧‍👦' },
            { value: '+20', label: t('about.stats_themes'), emoji: '🌟' },
            { value: '3', label: t('about.stats_languages'), emoji: '🌍' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-6 text-center">
              <div className="text-3xl mb-2">{stat.emoji}</div>
              <div className="font-arabic font-black text-gold-500 text-3xl">{stat.value}</div>
              <div className="font-arabic text-white/50 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-arabic font-bold text-white text-3xl text-center mb-10">
            {t('about.founder_title_1')} <span className="shimmer-text">{t('about.founder_title_2')}</span>
          </h2>
          <div className="flex justify-center">
            {team.map((member) => (
              <div key={member.name} className="glass-card glass-card-hover p-8 text-center max-w-sm w-full relative">
                <div className="text-6xl mb-5">{member.emoji}</div>
                <h3 className="font-arabic font-bold text-white text-xl mb-2">{member.name}</h3>
                <p className="font-arabic text-gold-500 text-sm mb-2">{member.role}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-400 text-xs font-arabic mb-4">
                  🖨️ 7 {t('about.printing_experience', 'سنوات خبرة في مجال الطباعة')}
                </div>
                <p className="font-arabic text-white/60 text-sm leading-relaxed mb-6">{member.desc}</p>
                {member.instagram && (
                  <div className="flex justify-center mt-2">
                    <a href={member.instagram} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-gold-500 transition-colors flex items-center justify-center p-2 rounded-full hover:bg-gold-500/10">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                      </svg>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-3xl mx-auto glass-card p-10 text-center">
          <BookOpen className="w-12 h-12 text-gold-500 mx-auto mb-4" />
          <h2 className="font-arabic font-bold text-white text-2xl mb-4">{t('about.mission_title')}</h2>
          <p className="font-arabic text-white/60 text-lg leading-relaxed">
            {t('about.mission_desc')}
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-arabic font-bold text-white text-3xl text-center mb-10">
            {t('about.values_title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v) => (
              <div key={v.title} className="glass-card glass-card-hover p-6 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                  <v.icon className="w-6 h-6 text-gold-500" />
                </div>
                <div>
                  <h3 className="font-arabic font-bold text-white text-lg mb-2">{v.title}</h3>
                  <p className="font-arabic text-white/50 text-sm leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FAQ />

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-xl mx-auto glass-card p-10">
          <h2 className="font-arabic font-bold text-white text-2xl mb-4">{t('about.cta_title')}</h2>
          <p className="font-arabic text-white/50 mb-6">{t('about.cta_desc')}</p>
          <button 
            onClick={handleStartStory}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-lg transition-all hover:shadow-gold-glow hover:-translate-y-1"
          >
            {t('about.cta_btn')}
          </button>
        </div>
      </section>
    </div>
  );
}

