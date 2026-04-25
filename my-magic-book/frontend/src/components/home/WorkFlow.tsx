import { Wand2, BookOpen, Send, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function WorkFlow() {
  const { t } = useTranslation();

  const steps = [
    {
      icon: Wand2,
      title: t('home.workflow.step1Title'),
      description: t('home.workflow.step1Desc'),
      color: 'from-blue-500 to-blue-600',
      glow: 'rgba(59,130,246,0.3)',
      delay: '0s',
    },
    {
      icon: BookOpen,
      title: t('home.workflow.step2Title'),
      description: t('home.workflow.step2Desc'),
      color: 'from-magic-500 to-magic-600',
      glow: 'rgba(108,63,197,0.3)',
      delay: '0.2s',
    },
    {
      icon: Send,
      title: t('home.workflow.step3Title'),
      description: t('home.workflow.step3Desc'),
      color: 'from-pink-500 to-pink-600',
      glow: 'rgba(236,72,153,0.3)',
      delay: '0.4s',
    },
    {
      icon: Send,
      title: t('home.workflow.step4Title'),
      description: t('home.workflow.step4Desc'),
      color: 'from-orange-500 to-orange-600',
      glow: 'rgba(249,115,22,0.3)',
      delay: '0.6s',
    },
    {
      icon: Send,
      title: t('home.workflow.step5Title'),
      description: t('home.workflow.step5Desc'),
      color: 'from-gold-500 to-gold-600',
      glow: 'rgba(245,166,35,0.3)',
      delay: '0.8s',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-magic-500/10 border border-magic-500/30 text-magic-400 font-arabic text-sm mb-4">
            <CheckCircle className="w-4 h-4" />
            <span>{t('home.workflow.badge')}</span>
          </div>
          <h2 className="font-arabic font-black text-white text-3xl md:text-4xl mb-4">
            {t('home.workflow.title')}
          </h2>
          <p className="font-arabic text-white/50 text-lg max-w-2xl mx-auto">
            {t('home.workflow.subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-16 right-[10%] left-[10%] h-0.5 bg-gradient-to-l from-gold-500/20 via-magic-500/40 to-gold-500/20" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 relative">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center group"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Step icon */}
                <div
                  className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-3xl mb-5 transition-all duration-300 group-hover:-translate-y-3 group-hover:scale-110 z-10"
                  style={{
                    background: `linear-gradient(135deg, #1B1F5E, #252844)`,
                    border: '2px solid rgba(245,166,35,0.2)',
                    boxShadow: `0 8px 30px ${step.glow}`,
                  }}
                >
                  <step.icon className="w-8 h-8 text-gold-500" />
                  {/* Step number badge */}
                  <div
                    className={`absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-xs font-black shadow-lg`}
                  >
                    {index + 1}
                  </div>
                </div>

                <h3 className="font-arabic font-bold text-white text-sm mb-2 group-hover:text-gold-500 transition-colors">
                  {step.title}
                </h3>
                <p className="font-arabic text-white/40 text-xs leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <a
            href="/create"
            id="workflow-cta-btn"
            className="inline-flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-l from-gold-500 to-gold-600 text-dark-900 font-arabic font-black text-lg transition-all duration-300 hover:shadow-gold-glow hover:-translate-y-1"
          >
            <span>{t('home.workflow.btn')}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
