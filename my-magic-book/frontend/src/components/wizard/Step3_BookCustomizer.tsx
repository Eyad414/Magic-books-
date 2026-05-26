import { useState, useEffect } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../../api/publicApi';

// Props Interface: Contains callbacks to navigate through the wizard
interface Props { onNext: () => void; onPrev: () => void; }

export default function Step3_BookCustomizer({ onNext, onPrev }: Props) { // To move to the next page in the steps 
  const { progress, setBookCustomization } = useStoryProgress();// To save User Choices in the steps
  const { t } = useTranslation();

  // Constant: Available hexadecimal cover colors for the physical book
  const COVER_COLORS = [
    { value: '#1B1F5E', label: t('step3.color_navy') },
    { value: '#6C3FC5', label: t('step3.color_purple') },
    { value: '#1a237e', label: t('step3.color_darkblue') },
    { value: '#1b5e20', label: t('step3.color_darkgreen') },
    { value: '#4a148c', label: t('step3.color_magenta') },
    { value: '#bf360c', label: t('step3.color_darkorange') },
    { value: '#006064', label: t('step3.color_turquoise') },
    { value: '#ffffff', label: t('step3.color_white') },
  ];

  const EXTRA_THEMES = [
    { id: 'adventure', emoji: '🗺️', label: t('step2.theme_adventure') },
    { id: 'space', emoji: '🚀', label: t('step2.theme_space') },
    { id: 'ocean', emoji: '🌊', label: t('step2.theme_ocean') },
    { id: 'school_hero', emoji: '🏫', label: t('step2.theme_school_hero') },
    { id: 'forest', emoji: '🌿', label: t('step2.theme_forest') },
    { id: 'princess', emoji: '👸', label: t('step2.theme_princess') },
    { id: 'superhero', emoji: '⚡', label: t('step2.theme_superhero') },
    { id: 'animals', emoji: '🦁', label: t('step2.theme_animals') },
    { id: 'dinosaurs', emoji: '🦕', label: t('step2.theme_dinosaurs') },
    { id: 'pirates', emoji: '🏴‍☠️', label: t('step2.theme_pirates') },
    { id: 'magic', emoji: '🧙', label: t('step2.theme_magic') },
  ];

  const DEFAULT_PACKAGES = [
    { id: 'color', label: t('step3.pkg_color'), price: 60, emoji: '🌈', desc: t('step3.pkg_color_desc') },
    { id: 'coloring', label: t('step3.pkg_coloring'), price: 40, emoji: '🖍️', desc: t('step3.pkg_coloring_desc') },
    { id: 'audio', label: t('step3.pkg_audio'), price: 20, emoji: '🎧', desc: t('step3.pkg_audio_desc') },
    { id: 'ebook', label: t('step3.pkg_ebook'), price: 20, emoji: '📱', desc: t('step3.pkg_ebook_desc') },
    { id: 'pro', label: t('step3.pkg_pro'), price: 120, originalPrice: 140, emoji: '✨', desc: t('step3.pkg_pro_desc') },
  ];
  
  const [packages, setPackages] = useState<any[]>(DEFAULT_PACKAGES);

  useEffect(() => {
    // Fetch live settings to get accurate prices
    publicApi.getSettings().then(res => {
      if (res.success && res.settings?.bookPackages) {
        // Merge fetched prices/labels with our local structure (to keep emojis and translations fallback)
        const updatedPackages = DEFAULT_PACKAGES.map(defaultPkg => {
          const livePkg = res.settings.bookPackages.find((p: any) => p.id === defaultPkg.id);
          if (livePkg) {
            return {
              ...defaultPkg,
              price: livePkg.price,
              label: livePkg.label || defaultPkg.label,
              desc: livePkg.desc || defaultPkg.desc
            };
          }
          return defaultPkg;
        });
        setPackages(updatedPackages);
      }
    }).catch(err => console.error('Failed to load pricing:', err));
  }, []);

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
          {/* Cover Color */}
          <div>
            <label className="block font-arabic text-white/80 text-sm mb-3">{t('step3.cover_color_label')}</label>
            <div className="flex gap-2 w-full">
              {COVER_COLORS.map((color) => (
                <button
                  key={color.value}
                  id={`color-${color.label}`}
                  type="button"
                  onClick={() => setForm({ ...form, coverColor: color.value })}
                  className={`flex-1 h-10 rounded-xl transition-all ${form.coverColor === color.value ? 'ring-2 ring-gold-500 ring-offset-2 ring-offset-dark-900 scale-110' : 'hover:scale-105'}`}
                  style={{ background: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

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
