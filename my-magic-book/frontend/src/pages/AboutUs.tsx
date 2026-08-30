import { Star, BookOpen, Heart, Award, Globe, Zap, Languages } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStoryProgress } from '../context/StoryProgressContext';
import { useSiteStats } from '../hooks/useSiteStats';


function ScrollIndicator() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-white/30 animate-bounce-slow py-4 mb-10 -mt-10">
      <span className="font-arabic text-xs">{t('home.discover_more')}</span>
      <div className="w-0.5 h-10 bg-gradient-to-b from-gold-500/50 to-transparent" />
    </div>
  );
}

// FAQ section
function FAQ() {
  const { t } = useTranslation();
  const faqs = [
    { q: t('about.faqs.1_q'), a: t('about.faqs.1_a') },
    { q: t('about.faqs.2_q'), a: t('about.faqs.2_a') },
    { q: t('about.faqs.3_q'), a: t('about.faqs.3_a') },
    { q: t('about.faqs.4_q'), a: t('about.faqs.4_a') },
    { q: t('about.faqs.5_q'), a: t('about.faqs.5_a') },
    { q: t('about.faqs.6_q'), a: t('about.faqs.6_a') },
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
  // Counted from the database, exactly like the Home hero. This page used to
  // read settings.homeStats — figures typed by hand — and so claimed "+300
  // stories" and "+150 families" on the page after the hero said 39 and 12.
  const stats = useSiteStats();
  
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
      // iyad_abu_taha did not exist — Instagram answered "this page isn't
      // available", so the founder's icon led nowhere. Same convention as the
      // brand links below: no ?igsh= share token.
      instagram: 'https://www.instagram.com/eyad_abu_taha' },
  ];

  // Brand accounts. Same URLs as the footer so the two never drift apart —
  // the share tokens Instagram appends (?igsh=…) are stripped on purpose.
  const socials = [
    {
      label: 'Instagram',
      handle: '@magicfanoos',
      href: 'https://www.instagram.com/magicfanoos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
      ),
    },
    {
      label: 'TikTok',
      handle: '@magic.fanoos',
      href: 'https://www.tiktok.com/@magic.fanoos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-5 h-5">
          <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      ),
    },
    {
      label: 'WhatsApp',
      handle: '058-550-2072',
      href: 'https://wa.me/972585502072',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="w-5 h-5">
          <path d="M12.031 0C5.385 0 0 5.387 0 12.035c0 2.128.555 4.195 1.611 6.014L.43 23.491l5.584-1.465a12.028 12.028 0 0 0 6.017 1.609c6.645 0 12.033-5.387 12.033-12.035C24.062 5.387 18.675 0 12.031 0zm6.657 17.335c-.282.8-1.503 1.517-2.072 1.583-.54.063-1.229.176-3.874-.922-3.197-1.328-5.263-4.606-5.421-4.818-.158-.212-1.294-1.724-1.294-3.288 0-1.564.813-2.339 1.107-2.657.294-.317.641-.397.853-.397.212 0 .423.003.606.012.2.009.467-.078.732.559.282.68 1.011 2.464 1.1 2.65.088.187.147.404.041.616-.106.213-.159.345-.317.532-.158.188-.335.405-.482.559-.158.165-.328.347-.147.658.182.311.813 1.341 1.745 2.17.12.115.356.24.605.341.25.101.554.091.764-.138.21-.232.898-1.045 1.144-1.405.247-.361.493-.3.846-.17.353.13 2.235 1.053 2.617 1.244.382.19.636.284.73.444.094.16.094.928-.188 1.728z" />
        </svg>
      ),
    },
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
      
      <ScrollIndicator />

      {/* Stats */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-5">
          {[
            { value: stats.storiesCreated, label: t('hero.stats_stories_created'), emoji: '📖' },
            { value: stats.happyFamilies, label: t('hero.stats_happy_families'), emoji: '👨‍👩‍👧‍👦' },
            { value: stats.readyStories, label: t('about.stats_themes'), emoji: '🌟' },
            { value: stats.languages, label: t('about.stats_languages'), emoji: '🌍' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card p-6 text-center">
              <div className="text-3xl mb-2">{stat.emoji}</div>
              <div className="font-arabic font-black text-gold-500 text-3xl">{stat.value}</div>
              <div className="font-arabic text-white/50 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <ScrollIndicator />

      {/* Follow us */}
      <section className="px-4 sm:px-6 lg:px-8 mb-20">
        <div className="max-w-3xl mx-auto glass-card p-8 sm:p-10 text-center">
          <h2 className="font-arabic font-bold text-white text-2xl mb-3">{t('about.follow_title')}</h2>
          <p className="font-arabic text-white/50 mb-7">{t('about.follow_desc')}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 hover:text-gold-500 hover:border-gold-500/40 hover:-translate-y-0.5 transition-all"
              >
                <span className="text-white/50 group-hover:text-gold-500 transition-colors">{s.icon}</span>
                <span className="text-start leading-tight">
                  <span className="block font-arabic font-bold text-sm">{s.label}</span>
                  <span className="block text-xs text-white/40" dir="ltr">{s.handle}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <ScrollIndicator />

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

      <ScrollIndicator />

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

      <ScrollIndicator />

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
      
      <ScrollIndicator />
      
      <FAQ />

      <ScrollIndicator />

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

