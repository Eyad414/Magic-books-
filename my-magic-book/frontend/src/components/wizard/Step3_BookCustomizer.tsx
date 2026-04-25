import { useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import FlipbookPreview from './FlipbookPreview';

// Props Interface: Contains callbacks to navigate through the wizard
interface Props { onNext: () => void; onPrev: () => void; }

// Constant: Available hexadecimal cover colors for the physical book
const COVER_COLORS = [
  { value: '#1B1F5E', label: 'كحلي' },
  { value: '#6C3FC5', label: 'بنفسجي' },
  { value: '#1a237e', label: 'أزرق داكن' },
  { value: '#1b5e20', label: 'أخضر داكن' },
  { value: '#4a148c', label: 'أرجواني' },
  { value: '#bf360c', label: 'برتقالي داكن' },
  { value: '#006064', label: 'فيروزي' },
  { value: '#ffffff', label: 'أبيض' },
];

// Constant: Available physical product packages with pricing
const BOOK_PACKAGES = [
  { id: 'color', label: 'كتاب ملون', price: 99, emoji: '🌈', desc: 'كتاب ملون بالكامل بجودة عالية' },
  { id: 'coloring', label: 'دفتر تلوين', price: 69, emoji: '🖍️', desc: 'رسومات غير ملونة جاهزة للتلوين' },
  { id: 'pro', label: 'باقة Pro (النسختين)', price: 149, emoji: '✨', desc: 'الكتاب الملون + دفتر التلوين معاً' },
];

export default function Step3_BookCustomizer({ onNext, onPrev }: Props) { // To move to the next page in the steps 
  const { progress, setBookCustomization } = useStoryProgress();// To save User Choices in the steps
  
  // Local State: Tracks the user's selected book customization options for this step
  const [form, setForm] = useState({
    coverColor: progress.bookCustomization?.coverColor || '#1B1F5E',
    bookPackage: progress.bookCustomization?.bookPackage || 'color',
  });

  // Derived State: Calculates the total price dynamically based on the selected package state
  const selectedPkg = BOOK_PACKAGES.find(p => p.id === form.bookPackage);
  const totalPrice = selectedPkg ? selectedPkg.price : 99;

  // Function: Saves the aesthetic customization to the global context and moves to the Shipping Step
  const handleNext = () => {
    setBookCustomization(form);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🎨</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">خصّص كتابك</h2>
        <p className="font-arabic text-white/50 text-sm">اختر الألوان والخط وأضف لمسة شخصية</p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Form */}
        <div className="flex-1 space-y-5">
          {/* Cover Color */}
          <div>
            <label className="block font-arabic text-white/80 text-sm mb-3">🎨 لون غلاف الكتاب</label>
            <div className="flex flex-wrap gap-3">
              {COVER_COLORS.map((color) => (
                <button
                  key={color.value}
                  id={`color-${color.label}`}
                  type="button"
                  onClick={() => setForm({ ...form, coverColor: color.value })}
                  className={`w-10 h-10 rounded-xl transition-all ${form.coverColor === color.value ? 'ring-2 ring-gold-500 ring-offset-2 ring-offset-dark-900 scale-110' : 'hover:scale-105'
                    }`}
                  style={{ background: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          {/* Book Packages */}
          <div>
            <label className="block font-arabic text-white/80 text-sm mb-3">⭐ باقات الكتاب</label>
            <div className="space-y-3">
              {BOOK_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setForm({ ...form, bookPackage: pkg.id as any })}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-right ${form.bookPackage === pkg.id
                      ? 'border-gold-500 bg-gold-500/10'
                      : 'border-white/10 hover:border-white/30 bg-dark-700/50'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl mt-1">{pkg.emoji}</span>
                    <div className="flex flex-col">
                      <span className={`font-arabic text-lg font-bold ${form.bookPackage === pkg.id ? 'text-gold-500' : 'text-white'}`}>
                        {pkg.label}
                      </span>
                      <span className="font-arabic text-white/50 text-sm mt-1">{pkg.desc}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-arabic text-gold-500 font-bold text-lg">{pkg.price} ر.س</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.bookPackage === pkg.id ? 'border-gold-500 bg-gold-500' : 'border-white/20'
                      }`}>
                      {form.bookPackage === pkg.id && <span className="text-dark-900 text-xs">✓</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Book Preview */}
        <div className="md:w-72 flex flex-col items-center justify-center">
          <p className="font-arabic text-white/50 text-xs mb-3 text-center">معاينة الكتاب</p>
          {progress.storyConfig?.generatedText ? (
            <div className="-mt-8 scale-75 transform origin-top w-[350px]">
              <FlipbookPreview text={progress.storyConfig.generatedText} language={progress.storyConfig.language as any} />
            </div>
          ) : (
            <div
              className="w-36 h-48 rounded-2xl shadow-2xl flex flex-col items-center justify-center gap-3 transition-all duration-500"
              style={{ background: `linear-gradient(135deg, ${form.coverColor}, ${form.coverColor}99)`, border: '2px solid rgba(245,166,35,0.3)' }}
            >
              <span className="text-4xl">✨</span>
              <p className="font-arabic text-white font-bold text-sm text-center px-3 leading-tight">
                {progress.childDetails.childName || 'اسم طفلك'}
              </p>
              <p className="font-arabic text-white/60 text-xs text-center px-2">كتابي السحري</p>
            </div>
          )}
          <p className="font-arabic text-gold-500 font-black text-xl mt-4">{totalPrice} ر.س</p>
          <p className="font-arabic text-white/30 text-xs">السعر الإجمالي</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5" />}>
          السابق
        </MagicButton>
        <MagicButton
          id="step3-next-btn"
          fullWidth
          size="lg"
          onClick={handleNext}
          icon={<ChevronLeft className="w-5 h-5" />}
        >
          التالي — عنوان الشحن
        </MagicButton>
      </div>
    </div>
  );
}
