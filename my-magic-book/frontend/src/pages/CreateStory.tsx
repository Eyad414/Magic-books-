import { useStoryProgress } from '../context/StoryProgressContext';
import Step1_ChildDetails from '../components/wizard/Step1_ChildDetails';
import Step2_AI_Generator from '../components/wizard/Step2_AI_Generator';
import Step3_BookCustomizer from '../components/wizard/Step3_BookCustomizer';
import Step4_ShippingAddress from '../components/wizard/Step4_ShippingAddress';
import Step5_OrderReview from '../components/wizard/Step5_OrderReview';
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function CreateStory() {
  const { progress, setStep } = useStoryProgress();
  const currentStep = progress.currentStep;
  const { t } = useTranslation();

  const STEPS = [
    { number: 1, label: t('wizard.step1_label'), emoji: '👶' },
    { number: 2, label: t('wizard.step2_label'), emoji: '✨' },
    { number: 3, label: t('wizard.step3_label'), emoji: '🎨' },
    { number: 4, label: t('wizard.step4_label'), emoji: '📦' },
    { number: 5, label: t('wizard.step5_label'), emoji: '🚀' },
  ];

  const goNext = () => {
    if (currentStep < 5) setStep(currentStep + 1);
  };

  const goPrev = () => {
    if (currentStep > 1) setStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-arabic font-black text-white mb-2">
            {t('wizard.build')} <span className="shimmer-text">{t('wizard.your_magic_story')}</span>
          </h1>
          <p className="font-arabic text-white/50">{t('wizard.header_desc')}</p>
        </div>

        {/* Step Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-center gap-1 sm:gap-2 overflow-x-auto pb-2">
            {STEPS.map((step, index) => {
              const isDone = currentStep > step.number;
              const isActive = currentStep === step.number;

              return (
                <div key={step.number} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <button
                    onClick={() => isDone && setStep(step.number)}
                    className={`flex flex-col items-center gap-1 group ${isDone ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isDone
                          ? 'bg-gold-500 text-dark-900'
                          : isActive
                          ? 'bg-gradient-to-br from-magic-500 to-navy-800 border-2 border-gold-500 shadow-gold-glow'
                          : 'bg-dark-700 border border-white/10 text-white/30'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="text-lg">{step.emoji}</span>
                      )}
                    </div>
                    <span
                      className={`font-arabic text-xs hidden sm:block ${
                        isActive ? 'text-gold-500 font-bold' : isDone ? 'text-gold-500' : 'text-white/30'
                      }`}
                    >
                      {step.label}
                    </span>
                  </button>

                  {index < STEPS.length - 1 && (
                    <div className={`w-6 sm:w-10 h-0.5 transition-all duration-500 ${currentStep > step.number ? 'bg-gold-500' : 'bg-white/10'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step counter */}
          <p className="text-center font-arabic text-white/40 text-sm mt-3">
            {t('wizard.step_x_of_y').replace('{current}', String(currentStep)).replace('{total}', String(STEPS.length))}
            {STEPS[currentStep - 1].label}
          </p>
        </div>

        {/* Step Content */}
        <div className="glass-card p-6 sm:p-8">
          {currentStep === 1 && <Step1_ChildDetails onNext={goNext} />}
          {currentStep === 2 && <Step2_AI_Generator onNext={goNext} onPrev={goPrev} />}
          {currentStep === 3 && <Step3_BookCustomizer onNext={goNext} onPrev={goPrev} />}
          {currentStep === 4 && <Step4_ShippingAddress onNext={goNext} onPrev={goPrev} />}
          {currentStep === 5 && <Step5_OrderReview onPrev={goPrev} />}
        </div>
      </div>
    </div>
  );
}
