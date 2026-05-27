import { useState, useEffect, useMemo } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import { useAuth } from '../../context/AuthContext';
import MagicButton from '../common/MagicButton';
import { ChevronRight, CreditCard, Shield, Package, CheckCircle, Tag, Minus, Plus, Truck } from 'lucide-react';
import { orderApi } from '../../api/orderApi';
import { publicApi } from '../../api/publicApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Props Interface: Needs only 'onPrev' as 'onNext' is dynamically handled by Checkout submissions
interface Props { onPrev: () => void; }

const EXTRA_THEMES = [
  { id: 'adventure', emoji: '🗺️', label: 'مغامرة' },
  { id: 'space', emoji: '🚀', label: 'الفضاء' },
  { id: 'ocean', emoji: '🌊', label: 'المحيط' },
  { id: 'forest', emoji: '🌿', label: 'الغابة' },
  { id: 'princess', emoji: '👸', label: 'الأميرة' },
  { id: 'superhero', emoji: '⚡', label: 'البطل الخارق' },
  { id: 'animals', emoji: '🦁', label: 'الحيوانات' },
  { id: 'dinosaurs', emoji: '🦕', label: 'الديناصورات' },
  { id: 'pirates', emoji: '🏴‍☠️', label: 'القراصنة' },
  { id: 'magic', emoji: '🧙', label: 'السحر' },
];

export default function Step5_OrderReview({ onPrev }: Props) {
  const { progress, resetProgress } = useStoryProgress();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Local State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'applepay' | 'cash'>('card');
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
      { id: 'color', label: t('step3.pkg_color', 'قصة ملونة'), price: 60, emoji: '🌈', desc: t('step3.pkg_color_desc') },
      { id: 'coloring', label: t('step3.pkg_coloring', 'دفتر تلوين'), price: 40, emoji: '🖍️', desc: t('step3.pkg_coloring_desc') },
      { id: 'audio', label: t('step3.pkg_audio', 'ملف صوتي (Audio)'), price: 20, emoji: '🎧', desc: t('step3.pkg_audio_desc') },
      { id: 'ebook', label: t('step3.pkg_ebook', 'نسخة رقمية (E-Book)'), price: 20, emoji: '📱', desc: t('step3.pkg_ebook_desc') },
      { id: 'pro', label: t('step3.pkg_pro', 'باقة Pro الشاملة'), price: 120, originalPrice: 140, emoji: '✨', desc: t('step3.pkg_pro_desc') },
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

  // Quantity & Extra Books State
  const [quantity, setQuantity] = useState(1);
  const [extraBooks, setExtraBooks] = useState<{childName: string; theme: string; age: string; gender: 'male' | 'female'}[]>([]);

  const updateQuantity = (newQty: number) => {
    setQuantity(newQty);
    const extraCount = Math.max(0, newQty - 1);
    setExtraBooks(prev => {
      if (prev.length < extraCount) {
        return [...prev, ...Array(extraCount - prev.length).fill({ childName: '', theme: 'adventure', age: '3-5', gender: 'male' })];
      }
      return prev.slice(0, extraCount);
    });
  };

  const updateExtraBook = (index: number, field: string, value: string) => {
    setExtraBooks(prev => prev.map((book, i) => i === index ? { ...book, [field]: value } : book));
  };

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [discount, setDiscount] = useState(0);

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'MAGIC10') { setDiscount(10); setCouponApplied(true); setCouponError(''); }
    else if (code === 'MAGIC20') { setDiscount(20); setCouponApplied(true); setCouponError(''); }
    else { setCouponApplied(false); setDiscount(0); setCouponError(t('step3.coupon_invalid')); }
  };

  // Destructure progress
  const { childDetails, storyConfig, bookCustomization, shippingAddress } = progress;

  // Price Calculation
  const selectedPkg = packages.find(p => p.id === bookCustomization?.bookPackage) || packages[0];
  const isDigital = selectedPkg.id === 'audio' || selectedPkg.id === 'ebook';
  const isPickup = shippingAddress?.deliveryMethod === 'pickup';
  const freeBooks = Math.floor(quantity / 5);
  const paidBooks = quantity - freeBooks;
  const basePrice = selectedPkg.price * paidBooks;
  const discountedBase = couponApplied ? Math.round(basePrice * (1 - discount / 100)) : basePrice;
  const freeDelivery = isDigital || isPickup || quantity >= 3;
  const deliveryFee = freeDelivery ? 0 : 30;
  const totalPrice = discountedBase + deliveryFee;

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error(t('step5.err_login'));
      navigate('/login');
      return;
    }
    setIsProcessing(true);
    try {
      await orderApi.createCheckout({
        storyId: storyConfig?.storyId,
        shippingAddress,
        totalPrice,
      });
      setIsSuccess(true);
      toast.success(t('step5.success_toast'));
      setTimeout(() => { resetProgress(); navigate('/dashboard'); }, 3000);
    } catch {
      toast.error(t('step5.err_general'));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="w-20 h-20 rounded-full bg-gold-500/20 border-2 border-gold-500 flex items-center justify-center mx-auto animate-pulse-gold">
          <CheckCircle className="w-10 h-10 text-gold-500" />
        </div>
        <h2 className="font-arabic font-black text-white text-2xl">{t('step5.order_on_way')}</h2>
        <p className="font-arabic text-white/60">{t('step5.order_desc')}</p>
        <div className="text-5xl animate-bounce-slow">📚✨</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🚀</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">{t('step5.title')}</h2>
        <p className="font-arabic text-white/50 text-sm">{t('step5.desc')}</p>
      </div>

      <div className="space-y-4">
        {/* Story Info */}
        <div className="p-4 rounded-xl bg-dark-700 border border-white/10 space-y-2">
          <h3 className="font-arabic font-bold text-white text-sm mb-3 flex items-center gap-2">
            <span>📖</span> {t('step5.story_details_title')}
          </h3>
          <Row label={t('step5.story_hero')} value={childDetails.childName || '-'} />
          <Row label={t('step5.gender')} value={childDetails.childGender === 'female' ? t('step5.girl') : t('step5.boy')} />
          <Row label={t('step5.hero_age')} value={childDetails.childAge ? `${childDetails.childAge} ${t('step5.years')}` : '-'} />
          <Row label={t('step5.theme')} value={storyConfig?.theme ? t(`step2.theme_${storyConfig.theme}`) || storyConfig.theme : t('step2.theme_adventure')} />
          <Row label={t('step5.language')} value={storyConfig?.language === 'en' ? t('step5.lang_en') : storyConfig?.language === 'he' ? t('step5.lang_he') : t('step5.lang_ar')} />
          <Row label={t('step5.package_type')} value={`${selectedPkg.emoji} ${t(`step3.pkg_${selectedPkg.id}`) || selectedPkg.label}`} />
        </div>

        {/* Shipping */}
        <div className="p-4 rounded-xl bg-dark-700 border border-white/10 space-y-2">
          <h3 className="font-arabic font-bold text-white text-sm mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" /> {t('step5.shipping_title')}
          </h3>
          <Row label={t('step5.recipient')} value={shippingAddress?.fullName || '-'} />
          <Row label={t('step5.phone')} value={shippingAddress?.phone || '-'} />
          {isPickup ? (
            <Row label={t('step4.self_pickup', 'استلام شخصي')} value={shippingAddress?.pickupLocation || '-'} />
          ) : (
            <Row label={t('step5.address')} value={`${shippingAddress?.street || ''}، ${shippingAddress?.city || ''}`} />
          )}
        </div>

        {/* ✨ Quantity & Extra Books Section */}
        <div className="p-4 rounded-xl bg-dark-700 border border-white/10 space-y-4">
          <h3 className="font-arabic font-bold text-white text-sm mb-1 flex items-center gap-2">
            <span>📦</span> {t('step3.qty_label', 'عدد النسخ')}
          </h3>
          
          {/* Quantity Controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => updateQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center text-white/60 hover:border-gold-500 hover:text-gold-500 transition-all"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="font-arabic font-black text-gold-500 text-2xl min-w-[40px] text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(Math.min(10, quantity + 1))}
              className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center text-white/60 hover:border-gold-500 hover:text-gold-500 transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Offer Banners */}
          <div className="space-y-2">
            {freeDelivery && !isPickup && !isDigital && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 animate-fade-in">
                <Truck className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="font-arabic text-green-400 text-sm font-bold">{t('step3.free_delivery')}</p>
              </div>
            )}
            {isPickup && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 animate-fade-in">
                <Truck className="w-5 h-5 text-green-400 flex-shrink-0" />
                <p className="font-arabic text-green-400 text-sm font-bold">✅ {t('step4.self_pickup', 'الاستلام شخصي')} — {t('step3.free_delivery', 'توصيل مجاني')}</p>
              </div>
            )}
            {!freeDelivery && !isPickup && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gold-500/5 border border-gold-500/20">
                <Truck className="w-5 h-5 text-gold-500/50 flex-shrink-0" />
                <p className="font-arabic text-white/50 text-xs">{t('step3.free_delivery_hint')} <strong className="text-gold-500">{t('step3.free_delivery_strong')}</strong></p>
              </div>
            )}
            {freeBooks > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 animate-fade-in">
                <span className="text-xl">🎁</span>
                <p className="font-arabic text-green-400 text-sm font-bold">
                  {t('step3.free_books_msg', 'مبروك! {count} {text} مع طلبك!').replace('{count}', String(freeBooks)).replace('{text}', freeBooks === 1 ? t('step3.free_book_single', 'كتاب مجاني') : t('step3.free_book_plural', 'كتب مجانية'))}
                </p>
              </div>
            )}
            {quantity >= 2 && freeBooks === 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-magic-500/5 border border-magic-500/20">
                <span className="text-lg">🎁</span>
                <p className="font-arabic text-white/50 text-xs">{t('step3.buy_4_get_1', 'اشتري 4 كتب واحصل على')} <strong className="text-magic-400">{t('step3.5th_free', 'الخامس مجانًا')}</strong></p>
              </div>
            )}
          </div>

          {/* Extra Books Details */}
          {extraBooks.map((book, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-magic-500/20 bg-magic-500/5 space-y-3 animate-fade-in">
              <p className="font-arabic text-magic-400 font-bold text-sm">📚 {t('step3.extra_book_num', 'الكتاب رقم {num}').replace('{num}', String(idx + 2))}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-arabic text-white/60 text-xs mb-1">{t('step3.extra_child_name', 'اسم الطفل')}</label>
                  <input type="text" className="magic-input text-sm !py-2" placeholder="اسم الطفل" value={book.childName} onChange={(e) => updateExtraBook(idx, 'childName', e.target.value)} maxLength={30} />
                </div>
                <div>
                  <label className="block font-arabic text-white/60 text-xs mb-1">{t('step3.extra_gender', 'الجنس')}</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateExtraBook(idx, 'gender', 'male')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-xs transition-all ${book.gender === 'male' ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/50'}`}>
                      <span>👦</span><span className="font-arabic font-bold">{t('step1.gender_male', 'ولد')}</span>
                    </button>
                    <button type="button" onClick={() => updateExtraBook(idx, 'gender', 'female')} className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border text-xs transition-all ${book.gender === 'female' ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/50'}`}>
                      <span>👧</span><span className="font-arabic font-bold">{t('step1.gender_female', 'بنت')}</span>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block font-arabic text-white/60 text-xs mb-1">{t('step3.extra_age', 'العمر')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[{ id: '1-3', emoji: '👶' }, { id: '3-5', emoji: '🧸' }, { id: '5-8', emoji: '🎠' }, { id: '8-10', emoji: '🏆' }].map((age) => (
                    <button key={age.id} type="button" onClick={() => updateExtraBook(idx, 'age', age.id)} className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs transition-all ${book.age === age.id ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/50'}`}>
                      <span>{age.emoji}</span><span className="font-arabic font-bold">{age.id}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block font-arabic text-white/60 text-xs mb-1">{t('step3.extra_theme', 'الموضوع')}</label>
                <div className="flex flex-wrap gap-2">
                  {EXTRA_THEMES.map((theme) => (
                    <button key={theme.id} type="button" onClick={() => updateExtraBook(idx, 'theme', theme.id)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs transition-all ${book.theme === theme.id ? 'border-gold-500 bg-gold-500/10 text-gold-500' : 'border-white/10 text-white/50 hover:border-white/30'}`}>
                      <span>{theme.emoji}</span><span className="font-arabic font-bold">{theme.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coupon Code */}
        <div className="p-4 rounded-xl bg-dark-700 border border-white/10">
          <h3 className="font-arabic font-bold text-white text-sm mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-gold-500" /> {t('step3.coupon_placeholder', 'كود الخصم')}
          </h3>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                className="magic-input pr-9"
                placeholder={t('step3.coupon_placeholder', 'أدخل كود الخصم...')}
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); setCouponApplied(false); setDiscount(0); }}
                disabled={couponApplied}
              />
            </div>
            <button
              type="button"
              onClick={applyCoupon}
              disabled={!couponCode.trim() || couponApplied}
              className="px-4 py-3 rounded-xl bg-gold-500/20 border border-gold-500/30 text-gold-500 font-arabic text-sm font-bold hover:bg-gold-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {couponApplied ? t('step3.coupon_applied_btn', 'مطبّق ✓') : t('step3.coupon_apply_btn', 'تطبيق')}
            </button>
          </div>
          {couponError && <p className="text-red-400 text-xs font-arabic mt-2">{couponError}</p>}
          {couponApplied && <p className="text-green-400 text-xs font-arabic mt-2">{t('step3.coupon_success', 'تم تطبيق خصم {discount}%').replace('{discount}', String(discount))} ✨</p>}
        </div>

        {/* Price Summary */}
        <div className="p-4 rounded-xl bg-gradient-to-l from-gold-500/20 to-gold-500/5 border border-gold-500/30 space-y-2">
          <h3 className="font-arabic font-bold text-white text-sm mb-3">💰 {t('step5.price_summary_title')}</h3>
          <div className="flex items-start justify-between gap-4">
            <span className="font-arabic text-white/50 text-sm flex-shrink-0">{t(`step3.pkg_${selectedPkg.id}`) || selectedPkg.label} × {quantity}:</span>
            <div className="flex items-center gap-2">
              {(selectedPkg as any).originalPrice && quantity === 1 && (
                <span className="font-arabic text-white/30 text-xs line-through">{(selectedPkg as any).originalPrice * quantity} ₪</span>
              )}
              <span className="font-arabic text-white text-sm">{basePrice} ₪</span>
            </div>
          </div>
          {couponApplied && <Row label={`خصم ${discount}%`} value={`- ${basePrice - discountedBase} ₪`} />}
          <Row label={t('step5.delivery_fee')} value={deliveryFee === 0 ? `${t('step3.free_delivery', 'مجاني')} 🎉` : `${deliveryFee} ₪`} />
          <div className="border-t border-gold-500/30 pt-2 flex items-center justify-between">
            <span className="font-arabic font-black text-white text-lg">{t('step5.total')}</span>
            <span className="font-arabic font-black text-gold-500 text-2xl">{totalPrice} ₪</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="p-4 rounded-xl bg-dark-700 border border-white/10 space-y-3">
          <h3 className="font-arabic font-bold text-white text-sm mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-gold-500" /> {t('step5.payment_method_title')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: 'card', label: t('step5.credit_card'), icon: '💳' },
              { id: 'paypal', label: 'PayPal', icon: '🅿️' },
              { id: 'applepay', label: 'Apple Pay', icon: '🍎' },
              { id: 'cash', label: t('step5.cash', 'نقدًا عند الاستلام'), icon: '💵' },
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id as any)}
                className={`p-3 rounded-lg flex flex-col items-center justify-center gap-2 transition-all border ${
                  paymentMethod === method.id
                    ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                    : 'bg-dark-800 border-white/10 text-white/60 hover:bg-white/5'
                }`}
              >
                <div className="text-2xl">{method.icon}</div>
                <div className="font-arabic font-bold text-xs">{method.label}</div>
              </button>
            ))}
          </div>
          
          {paymentMethod === 'card' && (
            <div className="mt-4 p-4 bg-dark-800 rounded-lg border border-white/5 space-y-3 animate-fade-in">
              <div>
                <label className="block font-arabic text-white/50 text-xs mb-1">{t('step5.card_number')}</label>
                <input type="text" placeholder="**** **** **** ****" className="magic-input w-full font-mono text-left" dir="ltr" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-arabic text-white/50 text-xs mb-1">{t('step5.expiry_date')}</label>
                  <input type="text" placeholder="MM/YY" className="magic-input w-full text-left" dir="ltr" />
                </div>
                <div>
                  <label className="block font-arabic text-white/50 text-xs mb-1">CVC</label>
                  <input type="text" placeholder="123" className="magic-input w-full text-left" dir="ltr" />
                </div>
              </div>
            </div>
          )}
          {paymentMethod === 'cash' && (
            <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-500/20 animate-fade-in">
              <p className="font-arabic text-green-400 text-sm">
                💵 {t('step5.cash_note', 'سيتم تحصيل المبلغ نقدًا عند استلام الطلب من نقطة الاستلام.')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-2 justify-center text-white/30">
        <Shield className="w-4 h-4 text-green-500" />
        <span className="font-arabic text-xs">{t('step5.secure_payment')}</span>
      </div>

      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5 nav-icon" />}>
          {t('wizard.prev_btn')}
        </MagicButton>
        <MagicButton
          id="checkout-btn"
          fullWidth
          size="lg"
          onClick={handleCheckout}
          isLoading={isProcessing}
          icon={<CreditCard className="w-5 h-5" />}
        >
          {isAuthenticated ? t('step5.pay_now').replace('{price}', String(totalPrice)) : t('step5.login_to_pay')}
        </MagicButton>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-arabic text-white/50 text-sm flex-shrink-0">{label}:</span>
      <span className="font-arabic text-white text-sm text-left">{value}</span>
    </div>
  );
}
