import { useState, useEffect, useMemo } from 'react';
import { getPackageLabel, getPackageDesc } from '../../utils/packageLabel';
import { useStoryProgress } from '../../context/StoryProgressContext';
import { useAuth } from '../../context/AuthContext';
import MagicButton from '../common/MagicButton';
import { ChevronRight, CreditCard, Package, Tag, Plus, MapPin } from 'lucide-react';
import { publicApi } from '../../api/publicApi';
import { toDisplayUrl } from '../../api/mediaUrl';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { localizeName } from '../../utils/translit';
import { placeName } from '../../data/placeNames';

// Step 3 — the customer's details and a review of what they are buying.
// Payment is its own step (Step4_Payment), so the card is entered on a screen
// of its own and, once BookPod's link is live, on BookPod's page rather than
// here.
interface Props { onNext: () => void; onPrev: () => void; }

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

export default function Step3_Checkout({ onNext, onPrev }: Props) {
  const { progress, resetProgress, setShippingAddress } = useStoryProgress();
  const { t, i18n } = useTranslation();
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
  const [liveSettings, setLiveSettings] = useState<any>(null);

  useEffect(() => {
    publicApi.getSettings().then(res => {
      if (res.success && res.settings) setLiveSettings(res.settings);
    }).catch(err => console.error('Failed to load pricing:', err));
  }, []);

  // Read the package NAME off `selectedPkg.label` — never re-translate by id.
  // t() returns the key itself when a string is missing, so `t(...) || label`
  // never reaches the fallback and silently discards the admin's rename.
  const lang = i18n.language;
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
          if (!livePkg) return defaultPkg;
          // The dashboard's name/description edits only ever reached the price
          // and hidden flags before, so a rename in the admin never showed to a
          // customer. Admin text is typed in Arabic and packages have no
          // per-language field, so it wins for Arabic and en/he keep the
          // built-in translation.

          // Keep the "was" price only when it is genuinely higher than the
          // live one. The default carries originalPrice: 140 while the admin
          // has raised pro to 170, which rendered a struck-through 140 next to
          // 170 — a discount advertised off a LOWER price.
          const was = (defaultPkg as any).originalPrice;
          return {
            ...defaultPkg,
            label: getPackageLabel(livePkg, t, lang, defaultPkg.label),
            desc: getPackageDesc(livePkg, t, lang, (defaultPkg as any).desc),
            price: livePkg.price,
            hidden: livePkg.hidden,
            originalPrice: was && was > livePkg.price ? was : undefined,
          };
        })
        .filter((pkg) => !(pkg as any).hidden); // admin-hidden packages don't show
    }
    return DEFAULT_PACKAGES;
  }, [liveSettings, t, lang]);

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
  // If the chosen package has since been hidden in the dashboard, the lookup
  // misses and the customer is silently moved to a different package at a
  // different price — they'd return to a saved order and just see the wrong
  // one. Fall back so checkout still works, but say so.
  const chosenPkgId = bookCustomization?.bookPackage;
  const matchedPkg = packages.find(p => p.id === chosenPkgId);
  const selectedPkg = matchedPkg || packages[0];
  const pkgUnavailable = !!chosenPkgId && !matchedPkg;
  const isDigital = selectedPkg.id === 'audio' || selectedPkg.id === 'ebook';
  const isPickup = shippingForm.deliveryMethod === 'pickup';
  // Arabic uses its own comma; an English address line reading "Silwan، Jerusalem" looks broken.
  const addrSep = i18n.language?.startsWith('ar') ? '،' : ',';
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
      // House number and postal code were dropped from this step on request.
      // Validating fields the customer can no longer see would block checkout
      // with an error pointing at nothing.
      //
      // NOTE: BookPod still wants both. BookPodService falls back to house '1'
      // and zipCode '0000000', so until their checkout collects the real
      // address, a home delivery is submitted with a placeholder street number.
    } else {
      if (!shippingForm.pickupLocation) errs.pickupLocation = t('step4.err_pickup_location', 'الرجاء اختيار نقطة الاستلام');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 3 ends at the customer's details: validate, save the address, and hand
  // over to the payment step. Placing the order now happens there.
  const handleContinue = () => {
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
    onNext();
  };

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
          {/* Say what applies to the choice the customer actually made, instead
              of listing both and leaving them to work out which is theirs. */}
          <p className="font-arabic text-white/70 text-sm">
            {isPickup
              ? t('step4.delivery_banner_pickup', '🏬 الاستلام الشخصي مجاني — نُعلمك فور جهوز الطلب.')
              : t('step4.delivery_banner_home', '🚚 توصيل للمنزل خلال 5-8 أيام عمل.')}
          </p>
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
                    // The Arabic string stays the value — only the label is
                    // localized, so the order and the BookPod submission are
                    // byte-identical whichever language the customer used.
                    <option key={`city-${index}-${city}`} value={city}>{placeName(city, i18n.language)}</option>
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
                      <option key={street} value={street}>{placeName(street, i18n.language)}</option>
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
                📍 <strong className="text-white">{shippingForm.fullName || t('step4.recipient_fallback')}</strong> — {placeName(shippingForm.street, i18n.language)}{addrSep} {placeName(shippingForm.city, i18n.language)}
                {shippingForm.buildingNo ? `${addrSep} ${t('step4.addr_building', 'مبنى')} ${shippingForm.buildingNo}` : ''}
                {shippingForm.floor ? `${addrSep} ${t('step4.addr_floor', 'طابق')} ${shippingForm.floor}` : ''}
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

      <div className="space-y-3">
        {/* Story details + copies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-dark-700 border border-white/10 space-y-1.5">
            <h3 className="font-arabic font-bold text-white text-xs mb-2 flex items-center gap-1.5">
              <span>📖</span> {t('step5.story_details_title')}
            </h3>

            {/* Book-cover preview: the child's photo mocked up as a mini cover */}
            <div className="flex items-center gap-2.5 mb-2 pb-2 border-b border-white/5">
              <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-gold-500/40 bg-dark-800 shadow-lg shadow-black/40">
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
                <p className="font-arabic font-black text-white text-xs leading-tight truncate">
                  {(t('step5.cover_preview_hero', 'كتاب {name}') as string).replace('{name}', heroName || '')}
                </p>
                <p className="font-arabic text-gold-500/80 text-[11px] mt-0.5">
                  🪄 {t('step5.cover_preview_hint', 'معاينة الغلاف')}
                </p>
              </div>
            </div>

            {/* Order review — all details in one compact wrapping row */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] pt-0.5">
              {[
                { l: t('step5.story_hero'), v: heroName || '-' },
                { l: t('step5.gender'), v: childDetails.childGender === 'female' ? t('step5.girl') : t('step5.boy') },
                { l: t('step5.hero_age'), v: childDetails.childAge ? `${childDetails.childAge} ${t('step5.years')}` : '-' },
                { l: t('step5.theme'), v: storyConfig?.theme ? (t(`step2.theme_${storyConfig.theme}`) as string) || storyConfig.theme : (t('step2.theme_adventure') as string) },
                { l: t('step5.language'), v: storyConfig?.language === 'en' ? t('step5.lang_en') : storyConfig?.language === 'he' ? t('step5.lang_he') : t('step5.lang_ar') },
                { l: t('step5.package_type'), v: `${selectedPkg.emoji} ${selectedPkg.label}` },
              ].map((r, i) => (
                <span key={i} className="font-arabic text-white/45 whitespace-nowrap">
                  {r.l} <span className="text-white/90 font-bold">{r.v}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Want another book? Create a separate story (its own order). */}
          <div className="p-3 rounded-xl bg-dark-700 border border-white/10 flex flex-col items-center justify-center text-center gap-2">
            <span className="text-2xl">📚</span>
            <p className="font-arabic text-white/60 text-[11px] leading-relaxed max-w-[90%]">
              {t('step3.another_story_hint', 'تريد كتاباً آخر بموضوع مختلف؟ أنشئ قصة جديدة بطلب منفصل.')}
            </p>
            <button
              type="button"
              onClick={handleCreateAnotherStory}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-magic-500/20 text-magic-300 border border-magic-500/30 font-arabic font-bold text-xs hover:bg-magic-500/30 transition-all"
            >
              <Plus className="w-4 h-4" /> {t('step3.create_another_story', 'أنشئ قصة جديدة')}
            </button>
          </div>
        </div>

        {/* Coupon + price summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-dark-700 border border-white/10">
            <h3 className="font-arabic font-bold text-white text-xs mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-gold-500" /> {t('step3.coupon_placeholder', 'كود الخصم')}
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

          <div className="p-3 rounded-xl bg-gradient-to-l from-gold-500/20 to-gold-500/5 border border-gold-500/30 space-y-1.5">
            <h3 className="font-arabic font-bold text-white text-xs mb-2">💰 {t('step5.price_summary_title')}</h3>
            <div className="flex items-start justify-between gap-4">
              <span className="font-arabic text-white/50 text-sm flex-shrink-0">{selectedPkg.label}:</span>
              <div className="flex items-center gap-2">
                {(selectedPkg as any).originalPrice && (
                  <span className="font-arabic text-white/30 text-xs line-through">{(selectedPkg as any).originalPrice} ₪</span>
                )}
                <span className="font-arabic text-white text-sm">{basePrice} ₪</span>
              </div>
            </div>
            {pkgUnavailable && (
              <p className="mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 font-arabic text-amber-300 text-xs leading-relaxed">
                ⚠️ {t('step3.pkg_unavailable', 'الباقة التي اخترتها لم تعد متاحة، وتم اختيار «{{name}}» بدلاً منها. يمكنك الرجوع للخطوة السابقة لتغييرها.', { name: selectedPkg.label })}
              </p>
            )}
            {couponApplied && <Row label={`${t('step5.discount', 'خصم')} ${discount}%`} value={`- ${basePrice - discountedBase} ₪`} />}
            <Row label={t('step5.delivery_fee')} value={deliveryFee === 0 ? `${t('step3.free_delivery', 'مجاني')} 🎉` : `${deliveryFee} ₪`} />
            <div className="mt-1 flex items-center justify-between rounded-xl bg-gold-500/15 border border-gold-500/40 px-3 py-2.5">
              <span className="font-arabic font-black text-white text-lg">{t('step5.total')}</span>
              <span className="font-arabic font-black text-gold-500 text-2xl drop-shadow-[0_0_10px_rgba(212,169,55,0.4)]">{totalPrice} ₪</span>
            </div>
          </div>
        </div>

        {/* Payment moved to step 4 — this step is details and review only. */}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5 nav-icon" />}>
          {t('wizard.prev_btn')}
        </MagicButton>
        <MagicButton fullWidth size="lg" onClick={handleContinue} icon={<CreditCard className="w-5 h-5" />}>
          {t('checkout.to_payment', 'التالي — الدفع')}
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
