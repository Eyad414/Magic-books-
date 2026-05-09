import { useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Props Interface: Contains callbacks to navigate through the wizard
interface Props { onNext: () => void; onPrev: () => void; }

// Constant: List of supported cities for shipping validation and dropdowns
const SUPPORTED_CITIES = [
  'القدس', 'تل أبيب', 'حيفا', 'يافا', 'الناصرة', 'عكا', 'بئر السبع',
  'الرملة', 'اللد', 'ريشون لتسيون', 'أسدود', 'نتانيا', 'الخضيرة',
  'رام الله', 'نابلس', 'الخليل', 'بيت لحم', 'جنين', 'طولكرم', 'قلقيلية', 'أريحا'
];

// Constant: Known neighborhoods/areas per city for location selection
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

// Sub-component: A reusable input wrapper definition that renders labels, inputs, and error UI cleanly
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

export default function Step4_ShippingAddress({ onNext, onPrev }: Props) { // To move to the next page in the steps
  const { progress, setShippingAddress } = useStoryProgress(); // To save User Choices in the steps
  const { t } = useTranslation();
  
  // Local State: Stores the shipping delivery form inputs locally before validation
  const [form, setForm] = useState({
    fullName: progress.shippingAddress?.fullName || '',
    phone: progress.shippingAddress?.phone || '',
    city: progress.shippingAddress?.city || '',
    floor: progress.shippingAddress?.floor || '',
    notes: progress.shippingAddress?.notes || '',
    buildingNo: progress.shippingAddress?.buildingNo || '',
    street: progress.shippingAddress?.street || '',
    country: progress.shippingAddress?.country || 'SA',
    deliveryMethod: progress.shippingAddress?.deliveryMethod || 'delivery',
    pickupLocation: progress.shippingAddress?.pickupLocation || '',
  });
  
  // Local State: Manages validation error strings per input field
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Function: Validates the shipping address ensuring all mandatory fields are filled out
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = t('step4.err_fullname');
    if (!form.phone.trim()) errs.phone = t('step4.err_phone');
    
    if (form.deliveryMethod === 'delivery') {
      if (!form.city.trim()) errs.city = t('step4.err_city');
      if (!form.street.trim()) errs.street = t('step4.err_street');
    } else {
      if (!form.pickupLocation) errs.pickupLocation = t('step4.err_pickup_location', 'الرجاء اختيار نقطة الاستلام');
    }
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Function: Checks form validity, saves inputs to global context, and navigates to the Final Review page
  const handleNext = () => {
    if (!validate()) return;
    setShippingAddress(form);
    onNext();
  };



  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">📦</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">{t('step4.title')}</h2>
        <p className="font-arabic text-white/50 text-sm">{t('step4.desc')}</p>
      </div>

      {/* Shipping Estimate Banner: Shows delivery expectations to build trust and urgency */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-magic-500/10 border border-magic-500/20">
        <MapPin className="w-5 h-5 text-magic-400 flex-shrink-0" />
        <p className="font-arabic text-white/70 text-sm">
          {t('step4.delivery_banner')}
        </p>
      </div>

      {/* Delivery Method Toggle */}
      <div className="flex gap-4 p-1 rounded-xl bg-dark-700/50 border border-white/10 w-fit mx-auto animate-fade-in">
        <button
          type="button"
          onClick={() => setForm({ ...form, deliveryMethod: 'delivery' })}
          className={`px-6 py-2 rounded-lg font-arabic font-bold text-sm transition-all ${
            form.deliveryMethod === 'delivery' ? 'bg-gold-500 text-dark-900 shadow-gold-glow' : 'text-white/50 hover:text-white'
          }`}
        >
          {t('step4.standard_delivery', 'توصيل للمنزل')}
        </button>
        <button
          type="button"
          onClick={() => setForm({ ...form, deliveryMethod: 'pickup' })}
          className={`px-6 py-2 rounded-lg font-arabic font-bold text-sm transition-all ${
            form.deliveryMethod === 'pickup' ? 'bg-gold-500 text-dark-900 shadow-gold-glow' : 'text-white/50 hover:text-white'
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
          value={form.fullName}
          onChange={(v: string) => setForm({ ...form, fullName: v })}
          error={errors.fullName}
        />
        <Field
          id="shipping-phone"
          label={t('step4.phone_label')}
          placeholder="05XXXXXXXX"
          type="tel"
          value={form.phone}
          onChange={(v: string) => setForm({ ...form, phone: v.replace(/\D/g, '') })}
          error={errors.phone}
        />

        {form.deliveryMethod === 'delivery' ? (
          <>
            {/* City Dropdown */}
            <div>
              <label className="block font-arabic text-white/80 text-sm mb-2">{t('step4.city_label')}</label>
              <select
                id="shipping-city"
                className="magic-input"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value, street: '' })}
              >
                <option value="" disabled>{t('step4.city_placeholder')}</option>
                {SUPPORTED_CITIES && SUPPORTED_CITIES.length > 0 ? (
                  SUPPORTED_CITIES.map((city, index) => (
                    <option key={`city-${index}-${city}`} value={city}>
                      {city}
                    </option>
                  ))
                ) : (
                  <option value="error">Error loading cities</option>
                )}
              </select>
              {errors.city && <p className="text-red-400 text-xs font-arabic mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block font-arabic text-white/80 text-sm mb-2">{t('step4.street_label')}</label>
              {form.city && CITY_STREETS[form.city] ? (
                <select
                  id="shipping-street"
                  className="magic-input"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                >
                  <option value="">{t('step4.street_placeholder_select')}</option>
                  {CITY_STREETS[form.city].map((street) => (
                    <option key={street} value={street}>{street}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  id="shipping-street"
                  className="magic-input"
                  placeholder={form.city ? t('step4.street_placeholder_input') : t('step4.street_placeholder_disabled')}
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  disabled={!form.city}
                />
              )}
              {errors.street && <p className="text-red-400 text-xs font-arabic mt-1">{errors.street}</p>}
            </div>
            
            <Field
              id="shipping-floor"
              label={t('step4.floor_label')}
              placeholder={t('step4.floor_placeholder')}
              value={form.floor}
              onChange={(v: string) => setForm({ ...form, floor: v })}
              error={errors.floor}
            />

            <Field
              id="shipping-building"
              label={t('step4.building_label')}
              placeholder={t('step4.optional')}
              value={form.buildingNo}
              onChange={(v: string) => setForm({ ...form, buildingNo: v })}
            />
            <Field
              id="shipping-notes"
              label={t('step4.notes_label')}
              placeholder={t('step4.optional')}
              value={form.notes}
              onChange={(v: string) => setForm({ ...form, notes: v })}
            />
          </>
        ) : (
          <div className="sm:col-span-2 p-4 bg-dark-700/50 border border-gold-500/30 rounded-xl space-y-4">
            <div>
              <label className="block font-arabic text-white/80 text-sm mb-2">{t('step4.pickup_location_label', 'نقطة الاستلام المتاحة')}</label>
              <select
                id="pickup-location"
                className="magic-input w-full"
                value={form.pickupLocation}
                onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}
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

      {/* Summary & Map: Automatically updates a mini summary and Google Maps view based on city/district to reassure the customer */}
      {form.deliveryMethod === 'delivery' && form.city && form.street && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-xl bg-dark-700 border border-white/10">
            <p className="font-arabic text-white/60 text-sm">
              📍 <strong className="text-white">{form.fullName || t('step4.recipient_fallback')}</strong> — {form.street}، {form.city}
              {form.buildingNo ? `، مبنى ${form.buildingNo}` : ''}
              {form.floor ? `، طابق ${form.floor}` : ''}
            </p>
          </div>
          
          {/* Map Preview */}
          <div className="w-full h-48 rounded-xl overflow-hidden border-2 border-gold-500/30">
            <iframe
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://maps.google.com/maps?q=${encodeURIComponent(form.city + ' ' + form.street)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        </div>
      )}

      {form.deliveryMethod === 'pickup' && form.pickupLocation && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-4 rounded-xl bg-dark-700 border border-white/10">
            <p className="font-arabic text-white/60 text-sm">
              📍 <strong className="text-white">{form.fullName || t('step4.recipient_fallback')}</strong> — {t('step4.self_pickup_summary', 'الاستلام من نقطة:')} <strong className="text-gold-500">{form.pickupLocation}</strong>
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5 nav-icon" />}>
          {t('wizard.prev_btn')}
        </MagicButton>
        <MagicButton
          id="step4-next-btn"
          fullWidth
          size="lg"
          onClick={handleNext}
          icon={<ChevronLeft className="w-5 h-5 nav-icon" />}
        >
          {t('step4.next_btn')}
        </MagicButton>
      </div>
    </div>
  );
}
