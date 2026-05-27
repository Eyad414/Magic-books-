import { useState, useEffect, useMemo } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FlipbookPreview from './FlipbookPreview';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../../api/publicApi';

// Props Interface: Contains callbacks to navigate through the wizard
interface Props { onNext: () => void; onPrev: () => void; }

export default function Step3_BookCustomizer({ onNext, onPrev }: Props) { // To move to the next page in the steps 
  const { progress, setBookCustomization } = useStoryProgress();// To save User Choices in the steps
  const { t } = useTranslation();

  const [liveSettings, setLiveSettings] = useState<any>(null);

  useEffect(() => {
    // Fetch live settings to get accurate prices
    publicApi.getSettings().then(res => {
      if (res.success && res.settings) {
        setLiveSettings(res.settings);
      }
    }).catch(err => console.error('Failed to load pricing:', err));
  }, []);

  // Dynamically resolve package labels and prices on language changes
  const packages = useMemo(() => {
    const DEFAULT_PACKAGES = [
      { id: 'color', label: t('step3.pkg_color'), price: 60, emoji: '🌈', desc: t('step3.pkg_color_desc') },
      { id: 'coloring', label: t('step3.pkg_coloring'), price: 40, emoji: '🖍️', desc: t('step3.pkg_coloring_desc') },
      { id: 'audio', label: t('step3.pkg_audio'), price: 20, emoji: '🎧', desc: t('step3.pkg_audio_desc') },
      { id: 'ebook', label: t('step3.pkg_ebook'), price: 20, emoji: '📱', desc: t('step3.pkg_ebook_desc') },
      { id: 'pro', label: t('step3.pkg_pro'), price: 120, originalPrice: 140, emoji: '✨', desc: t('step3.pkg_pro_desc') },
    ];

    if (liveSettings?.bookPackages) {
      return DEFAULT_PACKAGES.map(defaultPkg => {
        const livePkg = liveSettings.bookPackages.find((p: any) => p.id === defaultPkg.id);
        if (livePkg) {
          return {
            ...defaultPkg,
            price: livePkg.price,
            label: t(`step3.pkg_${defaultPkg.id}`, defaultPkg.label),
            desc: t(`step3.pkg_${defaultPkg.id}_desc`, defaultPkg.desc)
          };
        }
        return defaultPkg;
      });
    }
    return DEFAULT_PACKAGES;
  }, [liveSettings, t]);

  // Local State: Tracks the user's selected book customization options for this step
  const [form, setForm] = useState({
    coverColor: progress.bookCustomization?.coverColor || '#1B1F5E',
    bookPackage: progress.bookCustomization?.bookPackage || 'color',
  });

  // Function: Saves the aesthetic customization to the global context and moves to the Shipping Step
  const handleNext = () => {
    setBookCustomization(form);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🎨</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">{t('step3.title')}</h2>
        <p className="font-arabic text-white/50 text-sm">{t('step3.desc')}</p>
      </div>

      <div className="space-y-5">
        {/* Book Packages */}
          <div>
            <label className="block font-arabic text-white/80 text-sm mb-3">{t('step3.packages_label')}</label>
            <div className="flex gap-2 w-full">
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setForm({ ...form, bookPackage: pkg.id as any })}
                  className={`relative flex-1 flex flex-col items-center justify-center p-2 h-28 rounded-2xl border-2 transition-all text-center group ${form.bookPackage === pkg.id
                      ? 'border-gold-500 bg-gold-500/10 shadow-gold-glow'
                      : 'border-white/10 hover:border-white/30 bg-dark-700/50'
                    }`}
                >
                  <span className={`text-2xl mb-1 transition-transform duration-300 ${form.bookPackage === pkg.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {pkg.emoji}
                  </span>
                  <span className={`font-arabic text-xs font-bold leading-tight mb-1 ${form.bookPackage === pkg.id ? 'text-gold-500' : 'text-white'}`}>
                    {pkg.label}
                  </span>
                  {'originalPrice' in pkg && pkg.originalPrice ? (
                    <div className="flex items-center gap-1 justify-center">
                      <span className="font-arabic text-white/30 text-xs line-through">{(pkg as any).originalPrice} ₪</span>
                      <span className="font-arabic text-gold-500 font-bold text-xs">{pkg.price} ₪</span>
                    </div>
                  ) : (
                    <span className="font-arabic text-gold-500 font-bold text-xs">{pkg.price} ₪</span>
                  )}
                  {form.bookPackage === pkg.id && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold-500 text-dark-900 flex items-center justify-center shadow-lg animate-scale-in">
                      <span className="text-xs font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Book Live Preview — below packages */}
          <div className="flex flex-col items-center pt-2">
            <p className="font-arabic text-white/50 text-xs mb-3 text-center">{t('step3.book_preview_label')}</p>
            {progress.storyConfig?.generatedText ? (
              <div className="-mt-4 scale-75 transform origin-top w-[350px]">
                <FlipbookPreview 
                  text={progress.storyConfig.generatedText} 
                  language={progress.storyConfig.language as any} 
                />
              </div>
            ) : (
              <div
                className="w-36 h-48 rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-3 transition-all duration-500"
                style={{ background: `linear-gradient(135deg, ${form.coverColor}, ${form.coverColor}99)`, border: '2px solid rgba(245,166,35,0.3)' }}
              >
                <span className="text-4xl">✨</span>
                <p className="font-arabic text-white font-bold text-sm text-center px-3 leading-tight">
                  {progress.childDetails.childName || '...'}
                </p>
                <p className="font-arabic text-white/60 text-xs text-center px-2">{t('step3.book_brand')}</p>
              </div>
            )}
          </div>
        </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5 nav-icon" />}>
          {t('wizard.prev_btn')}
        </MagicButton>
        <MagicButton
          id="step3-next-btn"
          fullWidth
          size="lg"
          onClick={handleNext}
          icon={<ChevronLeft className="w-5 h-5 nav-icon" />}
        >
          {t('step3.next_btn')}
        </MagicButton>
      </div>
    </div>
  );
}
