import { useState, useEffect, useMemo } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import { useAuth } from '../../context/AuthContext';
import MagicButton from '../common/MagicButton';
import { ChevronRight, CreditCard, Shield, Package, CheckCircle, Tag, Plus, MapPin } from 'lucide-react';
import { orderApi } from '../../api/orderApi';
import { publicApi } from '../../api/publicApi';
import { toDisplayUrl } from '../../api/mediaUrl';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { localizeName } from '../../utils/translit';

// Merged checkout step: shipping address (old step 4) + order review & payment
// (old step 5) on a single screen, so the customer pays in one place.
interface Props { onPrev: () => void; }

// Online payment gateways (Visa/PayPal/Apple Pay) aren't live yet — only
// cash-on-delivery is enabled for now. Flip this to `true` (one line) to
// turn the online options back on when the gateway is ready.
const ONLINE_PAYMENTS_ENABLED = false;

// Supported cities for shipping validation and dropdowns.
const SUPPORTED_CITIES = [
  'القدس', 'تل أبيب', 'حيفا', 'يافا', 'الناصرة', 'عكا', 'بئر السبع',
  'الرملة', 'اللد', 'ريشون لتسيون', 'أسدود', 'نتانيا', 'الخضيرة',
  'رام الله', 'نابلس', 'الخليل', 'بيت لحم', 'جنين', 'طولكرم', 'قلقيلية', 'أريحا'
];

// Known neighborhoods/areas per city for location selection.
const CITY_STREETS: Record<string, string[]> = {
  'القدس': ['رأس العامود', 'وادي الجوز', 'الطور', 'سلوان', 'الشيخ جراح', 'بيت حنينا', 'شعفاط', 'العيسوية', 'صور باهر', 'جبل المكبر', 'البلدة القديمة', 'باب الزاهرة', 'الثوري', 'أبو ديس', 'العيزرية', 'كفر عقب', 'عناتا', 'الرام'],
  'تل أبيب': ['يافا', 'فلورنتين', 'نيفي شأنان', 'شابيرا', 'المنشية', 'العجمي'],
  'حيفا': ['وادي النسناس', 'الحليصة', 'عباس', 'وادي الصليب', 'الكرمل', 'بات غاليم', 'الألمانية'],
  'يافا': ['العجمي', 'الجبلية', 'المنشية', 'النزهة', 'الحي القديم'],
  'الناصرة': ['الحي الشرقي', 'الحي الغربي', 'الصفافرة', 'كرم الصاحب', 'شنلر', 'البشارة', 'المطران'],
  'عكا': ['البلدة القديمة', 'الحي الجديد', 'المنشية', 'وولفسون'],
  'بئر السبع': ['البلدة القديمة', 'الحي الشرقي', 'النقب'],
  'رام الله': ['المنارة', 'الطيرة', 'البيرة', 'أم الشرايط', 'الإرسال', 'المصيون', 'عين منجد', 'رأس الطاحونة'],
  'نابلس': ['رفيديا', 'البلدة القديمة', 'رأس العين', 'المساكن الشعبية', 'خلة العامود', 'المخفية', 'بلاطة'],
  'الخليل': ['عين سارة', 'البلدة القديمة', 'رأس الجورة', 'وادي التفاح', 'الحرس', 'نمرة', 'أبو الريش'],
  'بيت لحم': ['الدهيشة', 'عايدة', 'بيت جالا', 'بيت ساحور', 'المهد', 'القناطر'],
  'جنين': ['المخيم', 'البلدة القديمة', 'الحي الشرقي', 'الحي الغربي', 'الناصرة', 'الزبابدة'],
  'طولكرم': ['المخيم', 'إرتاح', 'ذنابة', 'البلدة القديمة', 'شويكة'],
  'قلقيلية': ['المركز', 'الحي الشمالي', 'الحي الجنوبي'],
  'أريحا': ['عين السلطان', 'المركز', 'عقبة جبر', 'النويعمة'],
  'الرملة': ['البلدة القديمة', 'الحي الشرقي', 'الحي الغربي'],
  'اللد': ['البلدة القديمة', 'المحطة', 'الحي الشمالي'],
  'ريشون لتسيون': ['المركز', 'الحي الغربي', 'الحي الشرقي'],
  'أسدود': ['المركز', 'الحي الشمالي', 'الحي الجنوبي'],
  'نتانيا': ['المركز', 'الحي الشرقي', 'الحي الغربي'],
  'الخضيرة': ['المركز', 'الحي الشمالي'],
};

// Reusable labelled input with inline error.
const Field = ({ id, label, placeholder, value, onChange, type = 'text', error }: any) => (
  <div>
    <label className="block font-arabic text-white/80 text-sm mb-2">{label}</label>
    <input
      type={type}
      id={id}
      className="magic-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {error && <p className="text-red-400 text-xs font-arabic mt-1">{error}</p>}
  </div>
);

export default function Step3_Checkout({ onPrev }: Props) {
  const { progress, resetProgress, setShippingAddress } = useStoryProgress();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { childDetails, storyConfig, bookCustomization } = progress;

  // The hero name rendered in the child's script for the book's language, so an
  // Arabic book shows "بهاء" even if the parent typed "Baha" (matches the actual
  // printed book, which localizes the name to the story language).
  const heroName = localizeName(childDetails.childName || '', storyConfig?.language);

  // Child photo rendered as the cover thumbnail in the order summary.
  const coverPhoto = toDisplayUrl(childDetails.childPhotoUrl);

  // ── Shipping form (from old step 4) ──────────────────────────────────
  const [shippingForm, setShippingForm] = useState({
    fullName: progress.shippingAddress?.fullName || '',
    phone: progress.shippingAddress?.phone || '',
    city: progress.shippingAddress?.city || '',
    floor: progress.shippingAddress?.floor || '',
    notes: progress.shippingAddress?.notes || '',
    buildingNo: progress.shippingAddress?.buildingNo || '',
    postalCode: progress.shippingAddress?.postalCode || '',
    street: progress.shippingAddress?.street || '',
    country: progress.shippingAddress?.country || 'SA',
    deliveryMethod: progress.shippingAddress?.deliveryMethod || 'delivery',
    pickupLocation: progress.shippingAddress?.pickupLocation || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Review / payment state (from old step 5) ─────────────────────────
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'applepay' | 'cash'>(
    ONLINE_PAYMENTS_ENABLED ? 'card' : 'cash'
  );
  const [liveSettings, setLiveSettings] = useState<any>(null);

  useEffect(() => {
    publicApi.getSettings().then(res => {
      if (res.success && res.settings) setLiveSettings(res.settings);
    }).catch(err => console.error('Failed to load pricing:', err));
  }, []);

  const packages = useMemo(() => {
    const DEFAULT_PACKAGES = [
      { id: 'color', label: t('step3.pkg_color', 'قصة ملونة'), price: 60, emoji: '🌈', desc: t('step3.pkg_color_desc') },
      { id: 'coloring', label: t('step3.pkg_coloring', 'دفتر تلوين'), price: 50, emoji: '🖍️', desc: t('step3.pkg_coloring_desc') },
      { id: 'audio', label: t('step3.pkg_audio', 'ملف صوتي (Audio)'), price: 20, emoji: '🎧', desc: t('step3.pkg_audio_desc') },
      { id: 'ebook', label: t('step3.pkg_ebook', 'نسخة رقمية (E-Book)'), price: 20, emoji: '📱', desc: t('step3.pkg_ebook_desc') },
      { id: 'pro', label: t('step3.pkg_pro', 'باقة Pro الشاملة'), price: 120, originalPrice: 140, emoji: '✨', desc: t('step3.pkg_pro_desc') },
    ];
    if (liveSettings?.bookPackages) {
      return DEFAULT_PACKAGES
        .map(defaultPkg => {
          const livePkg = liveSettings.bookPackages.find((p: any) => p.id === defaultPkg.id);
          return livePkg ? { ...defaultPkg, price: livePkg.price, hidden: livePkg.hidden } : defaultPkg;
        })
        .filter((pkg) => !(pkg as any).hidden); // admin-hidden packages don't show
    }
    return DEFAULT_PACKAGES;
  }, [liveSettings, t]);

  // One book per order. To order another book (a different theme/child), the
  // customer creates a brand-new story — its own order and payment.
  const handleCreateAnotherStory = () => {
    if (!window.confirm(t('step3.create_another_confirm', 'بدء قصة جديدة؟ لن يتم طلب الكتاب الحالي إلا بعد الدفع.'))) return;
    resetProgress();
    navigate('/create');
  };

  // Coupon
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

  // Price calculation (single book per order)
  const selectedPkg = packages.find(p => p.id === bookCustomization?.bookPackage) || packages[0];
  const isDigital = selectedPkg.id === 'audio' || selectedPkg.id === 'ebook';
  const isPickup = shippingForm.deliveryMethod === 'pickup';
  const basePrice = selectedPkg.price;
  const discountedBase = couponApplied ? Math.round(basePrice * (1 - discount / 100)) : basePrice;
  const freeDelivery = isDigital || isPickup;
  const deliveryFee = freeDelivery ? 0 : 30;
  const totalPrice = discountedBase + deliveryFee;

  const validateShipping = () => {
    const errs: Record<string, string> = {};
    if (!shippingForm.fullName.trim()) errs.fullName = t('step4.err_fullname');
    if (!shippingForm.phone.trim()) errs.phone = t('step4.err_phone');
    if (shippingForm.deliveryMethod === 'delivery') {
      if (!shippingForm.city.trim()) errs.city = t('step4.err_city');
      if (!shippingForm.street.trim()) errs.street = t('step4.err_street');
      // BookPod home delivery needs a numeric house number + postal code.
      if (!shippingForm.buildingNo.trim()) errs.buildingNo = t('step4.err_house', 'الرجاء إدخال رقم المنزل');
      if (!shippingForm.postalCode.trim()) errs.postalCode = t('step4.err_postalcode', 'الرجاء إدخال الرمز البريدي');
    } else {
      if (!shippingForm.pickupLocation) errs.pickupLocation = t('step4.err_pickup_location', 'الرجاء اختيار نقطة الاستلام');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error(t('step5.err_login'));
      navigate('/login');
      return;
    }
    if (!validateShipping()) {
      toast.error(t('checkout.err_shipping', 'يرجى إكمال بيانات الشحن أولاً'));
      return;
    }
    setShippingAddress(shippingForm);
    setIsProcessing(true);
    try {
      const res = await orderApi.createCheckout({
        storyId: storyConfig?.storyId,
        shippingAddress: shippingForm,
        totalPrice,
        paymentMethod,
        bookPackage: bookCustomization?.bookPackage,
      });
      // Card/online → Stripe Checkout. The webhook marks the order paid and
      // triggers book generation only after a successful payment.
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      // Cash / self-pickup → order placed offline, no online payment.
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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-500 font-arabic text-xs font-bold mb-4">
          🔒 {t('checkout.secure_badge', 'دفع آمن ومحمي')}
        </div>
        <h2 className="font-arabic font-black text-white text-2xl sm:text-3xl mb-2">
          <span className="shimmer-text">{t('checkout.title', 'الشحن والدفع')}</span>
        </h2>
        <p className="font-arabic text-white/50 text-sm">{t('checkout.desc', 'خطوة أخيرة — أدخل بيانات التوصيل وأكمل طلبك')}</p>
        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-5 text-white/60 font-arabic text-xs">
          <span className="flex items-center gap-1.5">🔒 {t('checkout.trust_secure', 'دفع آمن')}</span>
          <span className="flex items-center gap-1.5">🎨 {t('checkout.trust_preview', 'عاينت قصتك مجاناً')}</span>
          <span className="flex items-center gap-1.5">🚚 {t('checkout.trust_delivery', 'توصيل لباب منزلك')}</span>
          <span className="flex items-center gap-1.5">⭐ {t('checkout.trust_quality', 'طباعة فاخرة')}</span>
        </div>
      </div>

      {/* ── Shipping section ─────────────────────────────────────────── */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-gold-500">
          <MapPin className="w-4 h-4" />
          <span className="font-arabic font-bold text-sm">{t('step4.title')}</span>
        </div>

        {/* Shipping estimate banner */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-magic-500/10 border border-magic-500/20">
          <MapPin className="w-5 h-5 text-magic-400 flex-shrink-0" />
          <p className="font-arabic text-white/70 text-sm">{t('step4.delivery_banner')}</p>
        </div>

        {/* Delivery method toggle */}
        <div className="flex gap-4 p-1 rounded-xl bg-dark-700/50 border border-white/10 w-fit mx-auto animate-fade-in">
          <button
            type="button"
            onClick={() => setShippingForm({ ...shippingForm, deliveryMethod: 'delivery' })}
            className={`px-6 py-2 rounded-lg font-arabic font-bold text-sm transition-all ${
              shippingForm.deliveryMethod === 'delivery' ? 'bg-gold-500 text-dark-900 shadow-gold-glow' : 'text-white/50 hover:text-white'
            }`}
          >
            {t('step4.standard_delivery', 'توصيل للمنزل')}
          </button>
          <button
            type="button"
            onClick={() => setShippingForm({ ...shippingForm, deliveryMethod: 'pickup' })}
            className={`px-6 py-2 rounded-lg font-arabic font-bold text-sm transition-all ${
              shippingForm.deliveryMethod === 'pickup' ? 'bg-gold-500 text-dark-900 shadow-gold-glow' : 'text-white/50 hover:text-white'
            }`}
          >
            {t('step4.self_pickup', 'استلام شخصي (مجانًا)')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            id="shipping-fullname"
            label={t('step4.fullname_label')}
            placeholder={t('step4.fullname_placeholder')}
            value={shippingForm.fullName}
            onChange={(v: string) => setShippingForm({ ...shippingForm, fullName: v })}
            error={errors.fullName}
          />
          <Field
            id="shipping-phone"
            label={t('step4.phone_label')}
            placeholder="05XXXXXXXX"
            type="tel"
            value={shippingForm.phone}
            onChange={(v: string) => setShippingForm({ ...shippingForm, phone: v.replace(/\D/g, '') })}
            error={errors.phone}
          />

          {shippingForm.deliveryMethod === 'delivery' ? (
            <>
              <div>
                <label className="block font-arabic text-white/80 text-sm mb-2">{t('step4.city_label')}</label>
                <select
                  id="shipping-city"
                  className="magic-input"
                  value={shippingForm.city}
                  onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value, street: '' })}
                >
                  <option value="" disabled>{t('step4.city_placeholder')}</option>
                  {SUPPORTED_CITIES.map((city, index) => (
                    <option key={`city-${index}-${city}`} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && <p className="text-red-400 text-xs font-arabic mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="block font-arabic text-white/80 text-sm mb-2">{t('step4.street_label')}</label>
                {shippingForm.city && CITY_STREETS[shippingForm.city] ? (
                  <select
                    id="shipping-street"
                    className="magic-input"
                    value={shippingForm.street}
                    onChange={(e) => setShippingForm({ ...shippingForm, street: e.target.value })}
                  >
                    <option value="">{t('step4.street_placeholder_select')}</option>
                    {CITY_STREETS[shippingForm.city].map((street) => (
                      <option key={street} value={street}>{street}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    id="shipping-street"
                    className="magic-input"
                    placeholder={shippingForm.city ? t('step4.street_placeholder_input') : t('step4.street_placeholder_disabled')}
                    value={shippingForm.street}
                    onChange={(e) => setShippingForm({ ...shippingForm, street: e.target.value })}
                    disabled={!shippingForm.city}
                  />
                )}
                {errors.street && <p className="text-red-400 text-xs font-arabic mt-1">{errors.street}</p>}
              </div>

              <Field
                id="shipping-floor"
                label={t('step4.floor_label')}
                placeholder={t('step4.floor_placeholder')}
                value={shippingForm.floor}
                onChange={(v: string) => setShippingForm({ ...shippingForm, floor: v })}
              />
              <Field
                id="shipping-house"
                label={t('step4.house_label', 'رقم المنزل')}
                placeholder={t('step4.house_placeholder', 'مثال: 12')}
                type="tel"
                value={shippingForm.buildingNo}
                onChange={(v: string) => setShippingForm({ ...shippingForm, buildingNo: v.replace(/\D/g, '') })}
                error={errors.buildingNo}
              />
              <Field
                id="shipping-postalcode"
                label={t('step4.postalcode_label', 'الرمز البريدي')}
                placeholder={t('step4.postalcode_placeholder', 'مثال: 9990000')}
                type="tel"
                value={shippingForm.postalCode}
                onChange={(v: string) => setShippingForm({ ...shippingForm, postalCode: v.replace(/\D/g, '') })}
                error={errors.postalCode}
              />
              <Field
                id="shipping-notes"
                label={t('step4.notes_label')}
                placeholder={t('step4.optional')}
                value={shippingForm.notes}
                onChange={(v: string) => setShippingForm({ ...shippingForm, notes: v })}
              />
            </>
          ) : (
            <div className="sm:col-span-2 p-4 bg-dark-700/50 border border-gold-500/30 rounded-xl space-y-4">
              <div>
                <label className="block font-arabic text-white/80 text-sm mb-2">{t('step4.pickup_location_label', 'نقطة الاستلام المتاحة')}</label>
                <select
                  id="pickup-location"
                  className="magic-input w-full"
                  value={shippingForm.pickupLocation}
                  onChange={(e) => setShippingForm({ ...shippingForm, pickupLocation: e.target.value })}
                >
                  <option value="" disabled>{t('step4.pickup_location_placeholder', 'اختر نقطة الاستلام من القائمة')}</option>
                  <option value="القدس">{t('step4.jerusalem', 'القدس')}</option>
                  <option value="رام الله">{t('step4.ramallah', 'رام الله')}</option>
                </select>
                {errors.pickupLocation && <p className="text-red-400 text-xs font-arabic mt-1">{errors.pickupLocation}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Address summary + map (delivery) */}
        {shippingForm.deliveryMethod === 'delivery' && shippingForm.city && shippingForm.street && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-dark-700 border border-white/10">
              <p className="font-arabic text-white/60 text-sm">
                📍 <strong className="text-white">{shippingForm.fullName || t('step4.recipient_fallback')}</strong> — {shippingForm.street}، {shippingForm.city}
                {shippingForm.buildingNo ? `، مبنى ${shippingForm.buildingNo}` : ''}
                {shippingForm.floor ? `، طابق ${shippingForm.floor}` : ''}
              </p>
            </div>
            <div className="w-full h-48 rounded-xl overflow-hidden border-2 border-gold-500/30">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(shippingForm.city + ' ' + shippingForm.street)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </div>
        )}
        {shippingForm.deliveryMethod === 'pickup' && shippingForm.pickupLocation && (
          <div className="p-4 rounded-xl bg-dark-700 border border-white/10 animate-fade-in">
            <p className="font-arabic text-white/60 text-sm">
              📍 <strong className="text-white">{shippingForm.fullName || t('step4.recipient_fallback')}</strong> — {t('step4.self_pickup_summary', 'الاستلام من نقطة:')} <strong className="text-gold-500">{shippingForm.pickupLocation}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-white/10" />

      {/* ── Order summary & payment section ──────────────────────────── */}
      <div className="flex items-center gap-2 text-gold-500">
        <Package className="w-4 h-4" />
        <span className="font-arabic font-bold text-sm">{t('step5.title')}</span>
      </div>

      <div className="space-y-4">
        {/* Story details + copies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-dark-700 border border-white/10 space-y-2">
            <h3 className="font-arabic font-bold text-white text-sm mb-3 flex items-center gap-2">
              <span>📖</span> {t('step5.story_details_title')}
            </h3>

            {/* Book-cover preview: the child's photo mocked up as a mini cover */}
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/5">
              <div className="relative w-16 h-20 rounded-lg overflow-hidden shrink-0 border border-gold-500/40 bg-dark-800 shadow-lg shadow-black/40">
                {coverPhoto ? (
                  <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
                {/* spine sheen */}
                <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-white/25 to-transparent" />
                <div className="absolute top-1 left-1 text-xs drop-shadow">✨</div>
                <div className="absolute inset-x-0 bottom-0 px-1 pb-1 text-center">
                  <span className="font-arabic font-black text-white text-[9px] leading-tight drop-shadow block truncate">
                    {heroName || ''}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-arabic font-black text-white text-sm leading-tight truncate">
                  {(t('step5.cover_preview_hero', 'كتاب {name}') as string).replace('{name}', heroName || '')}
                </p>
                <p className="font-arabic text-gold-500/80 text-[11px] mt-0.5">
                  🪄 {t('step5.cover_preview_hint', 'معاينة الغلاف')}
                </p>
              </div>
            </div>

            <Row label={t('step5.story_hero')} value={heroName || '-'} />
            <Row label={t('step5.gender')} value={childDetails.childGender === 'female' ? t('step5.girl') : t('step5.boy')} />
            <Row label={t('step5.hero_age')} value={childDetails.childAge ? `${childDetails.childAge} ${t('step5.years')}` : '-'} />
            <Row label={t('step5.theme')} value={storyConfig?.theme ? t(`step2.theme_${storyConfig.theme}`) || storyConfig.theme : t('step2.theme_adventure')} />
            <Row label={t('step5.language')} value={storyConfig?.language === 'en' ? t('step5.lang_en') : storyConfig?.language === 'he' ? t('step5.lang_he') : t('step5.lang_ar')} />
            <Row label={t('step5.package_type')} value={`${selectedPkg.emoji} ${t(`step3.pkg_${selectedPkg.id}`) || selectedPkg.label}`} />
          </div>

          {/* Want another book? Create a separate story (its own order). */}
          <div className="p-4 rounded-xl bg-dark-700 border border-white/10 flex flex-col items-center justify-center text-center gap-3">
            <span className="text-3xl">📚</span>
            <p className="font-arabic text-white/60 text-xs leading-relaxed max-w-[85%]">
              {t('step3.another_story_hint', 'تريد كتاباً آخر بموضوع مختلف؟ أنشئ قصة جديدة بطلب منفصل.')}
            </p>
            <button
              type="button"
              onClick={handleCreateAnotherStory}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-magic-500/20 text-magic-300 border border-magic-500/30 font-arabic font-bold text-sm hover:bg-magic-500/30 transition-all"
            >
              <Plus className="w-4 h-4" /> {t('step3.create_another_story', 'أنشئ قصة جديدة')}
            </button>
          </div>
        </div>

        {/* Coupon + price summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="p-4 rounded-xl bg-gradient-to-l from-gold-500/20 to-gold-500/5 border border-gold-500/30 space-y-2">
            <h3 className="font-arabic font-bold text-white text-sm mb-3">💰 {t('step5.price_summary_title')}</h3>
            <div className="flex items-start justify-between gap-4">
              <span className="font-arabic text-white/50 text-sm flex-shrink-0">{t(`step3.pkg_${selectedPkg.id}`) || selectedPkg.label}:</span>
              <div className="flex items-center gap-2">
                {(selectedPkg as any).originalPrice && (
                  <span className="font-arabic text-white/30 text-xs line-through">{(selectedPkg as any).originalPrice} ₪</span>
                )}
                <span className="font-arabic text-white text-sm">{basePrice} ₪</span>
              </div>
            </div>
            {couponApplied && <Row label={`خصم ${discount}%`} value={`- ${basePrice - discountedBase} ₪`} />}
            <Row label={t('step5.delivery_fee')} value={deliveryFee === 0 ? `${t('step3.free_delivery', 'مجاني')} 🎉` : `${deliveryFee} ₪`} />
            <div className="mt-1 flex items-center justify-between rounded-xl bg-gold-500/15 border border-gold-500/40 px-3 py-2.5">
              <span className="font-arabic font-black text-white text-lg">{t('step5.total')}</span>
              <span className="font-arabic font-black text-gold-500 text-2xl drop-shadow-[0_0_10px_rgba(212,169,55,0.4)]">{totalPrice} ₪</span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="p-3 rounded-xl bg-dark-700 border border-white/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="font-arabic font-bold text-white text-sm flex items-center gap-2 shrink-0">
              <CreditCard className="w-4 h-4 text-gold-500" /> {t('step5.payment_method_title')}
            </h3>
            <div className="flex items-center gap-1 p-1 rounded-full bg-dark-800 border border-white/5 overflow-x-auto">
              {[
                { id: 'card', label: t('step5.credit_card'), icon: '💳', soon: !ONLINE_PAYMENTS_ENABLED },
                { id: 'paypal', label: 'PayPal', icon: '🅿️', soon: !ONLINE_PAYMENTS_ENABLED },
                { id: 'applepay', label: 'Apple Pay', icon: '🍎', soon: !ONLINE_PAYMENTS_ENABLED },
                { id: 'cash', label: t('step5.cash', 'نقدًا عند الاستلام'), icon: '💵', soon: false },
              ].map((method) => {
                const active = paymentMethod === method.id;
                const soon = method.soon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    disabled={soon}
                    onClick={() => { if (!soon) setPaymentMethod(method.id as any); }}
                    title={soon ? `${method.label} — ${t('step5.soon', 'قريباً')}` : method.label}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-arabic font-bold whitespace-nowrap transition-all ${
                      soon
                        ? 'text-white/35 cursor-not-allowed'
                        : active
                          ? 'bg-gold-500 text-dark-900 shadow-[0_0_12px_rgba(212,169,55,0.4)]'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className={`text-base leading-none ${soon ? 'opacity-60' : ''}`}>{method.icon}</span>
                    <span className={active ? '' : 'hidden sm:inline'}>{method.label}</span>
                    {soon && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold-500/15 text-gold-500/80 border border-gold-500/25">
                        {t('step5.soon', 'قريباً')}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {ONLINE_PAYMENTS_ENABLED && paymentMethod === 'card' && (
            <div className="mt-3 p-3 bg-dark-800 rounded-lg border border-white/5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_100px_80px] gap-2">
                <div>
                  <label className="block font-arabic text-white/40 text-[10px] mb-1">{t('step5.card_number')}</label>
                  <input type="text" placeholder="•••• •••• •••• ••••" className="magic-input w-full font-mono text-left !py-2 text-sm tracking-wider" dir="ltr" />
                </div>
                <div>
                  <label className="block font-arabic text-white/40 text-[10px] mb-1">{t('step5.expiry_date')}</label>
                  <input type="text" placeholder="MM/YY" className="magic-input w-full text-left !py-2 text-sm" dir="ltr" />
                </div>
                <div>
                  <label className="block font-arabic text-white/40 text-[10px] mb-1">CVC</label>
                  <input type="text" placeholder="•••" className="magic-input w-full text-left !py-2 text-sm" dir="ltr" />
                </div>
              </div>
            </div>
          )}
          {paymentMethod === 'cash' && (
            <p className="mt-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 font-arabic text-green-400 text-xs animate-fade-in">
              💵 {t('step5.cash_note', 'سيتم تحصيل المبلغ نقدًا عند استلام الطلب من نقطة الاستلام.')}
            </p>
          )}
          {paymentMethod === 'paypal' && (
            <p className="mt-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 font-arabic text-blue-300 text-xs animate-fade-in">
              🅿️ {t('step5.paypal_note', 'سيتم تحويلك إلى PayPal لإتمام الدفع بأمان.')}
            </p>
          )}
          {paymentMethod === 'applepay' && (
            <p className="mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 font-arabic text-white/70 text-xs animate-fade-in">
              🍎 {t('step5.applepay_note', 'استخدم Touch ID أو Face ID لإتمام الدفع.')}
            </p>
          )}
        </div>
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-2 justify-center text-white/30">
        <Shield className="w-4 h-4 text-green-500" />
        <span className="font-arabic text-xs">{t('step5.secure_payment')}</span>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5 nav-icon" />}>
          {t('wizard.prev_btn')}
        </MagicButton>
        <div className="relative flex-1 group">
          <div className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-gold-500 via-amber-400 to-gold-500 opacity-40 blur-md animate-pulse group-hover:opacity-70 transition-opacity" />
          <div className="relative">
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
