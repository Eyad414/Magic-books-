import { useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import MagicButton from '../common/MagicButton';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

// Props Interface: Contains callbacks to navigate through the wizard
interface Props { onNext: () => void; onPrev: () => void; }

// Constant: List of supported cities for shipping validation and dropdowns
const SUPPORTED_CITIES = [
  'القدس', 'تل أبيب', 'حيفا', 'يافا', 'الناصرة', 'عكا', 'بئر السبع',
  'الرملة', 'اللد', 'ريشون لتسيون', 'أسدود', 'نتانيا', 'الخضيرة',
  'رام الله', 'نابلس', 'الخليل', 'بيت لحم', 'جنين', 'طولكرم', 'قلقيلية', 'أريحا'
];

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
  
  // Local State: Stores the shipping delivery form inputs locally before validation
  const [form, setForm] = useState({
    fullName: progress.shippingAddress?.fullName || '',
    phone: progress.shippingAddress?.phone || '',
    city: progress.shippingAddress?.city || '',
    district: progress.shippingAddress?.district || '',
    street: progress.shippingAddress?.street || '',

    buildingNo: progress.shippingAddress?.buildingNo || '',
    postalCode: progress.shippingAddress?.postalCode || '',
    country: progress.shippingAddress?.country || 'SA',
  });
  
  // Local State: Manages validation error strings per input field
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Function: Validates the shipping address ensuring all mandatory fields are filled out
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = 'يرجى إدخال الاسم الكامل';
    if (!form.phone.trim()) errs.phone = 'يرجى إدخال رقم الهاتف';
    if (!form.city.trim()) errs.city = 'يرجى اختيار المدينة';
    if (!form.district.trim()) errs.district = 'يرجى إدخال الحي';
    if (!form.street.trim()) errs.street = 'يرجى إدخال اسم الشارع';
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
        <h2 className="font-arabic font-bold text-white text-xl mb-1">عنوان الشحن</h2>
        <p className="font-arabic text-white/50 text-sm">أدخل عنوانك بدقة حتى يصل كتابك في الوقت المحدد</p>
      </div>

      {/* Shipping Estimate Banner: Shows delivery expectations to build trust and urgency */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-magic-500/10 border border-magic-500/20">
        <MapPin className="w-5 h-5 text-magic-400 flex-shrink-0" />
        <p className="font-arabic text-white/70 text-sm">
          🚚 شحن مجاني للطلبات التي تحتوي على ٣ قصص أو أكثر — التوصيل خلال ٣-٤ أيام عمل
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          id="shipping-fullname"
          label="الاسم الكامل *"
          placeholder="الاسم كما في الهوية"
          value={form.fullName}
          onChange={(v: string) => setForm({ ...form, fullName: v })}
          error={errors.fullName}
        />
        <Field
          id="shipping-phone"
          label="رقم الهاتف *"
          placeholder="05XXXXXXXX"
          type="tel"
          value={form.phone}
          onChange={(v: string) => setForm({ ...form, phone: v.replace(/\D/g, '') })}
          error={errors.phone}
        />

        {/* City Dropdown: Helps standardizing the locations to valid Saudi cities for courier integration */}
        <div>
          <label className="block font-arabic text-white/80 text-sm mb-2">المدينة *</label>
          <select
            id="shipping-city"
            className="magic-input"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          >
            <option value="">اختر المدينة</option>
            {SUPPORTED_CITIES.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
          {errors.city && <p className="text-red-400 text-xs font-arabic mt-1">{errors.city}</p>}
        </div>

        <Field
          id="shipping-district"
          label="الحي *"
          placeholder="اسم الحي"
          value={form.district}
          onChange={(v: string) => setForm({ ...form, district: v })}
          error={errors.district}
        />
        <div className="sm:col-span-2">
          <Field
            id="shipping-street"
            label="اسم الشارع *"
            placeholder="اسم الشارع والمنطقة"
            value={form.street}
            onChange={(v: string) => setForm({ ...form, street: v })}
            error={errors.street}
          />
        </div>
        <Field
          id="shipping-building"
          label="رقم المبنى / الشقة"
          placeholder="اختياري"
          value={form.buildingNo}
          onChange={(v: string) => setForm({ ...form, buildingNo: v })}
        />
        <Field
          id="shipping-postal"
          label="الرمز البريدي"
          placeholder="مثال: 12345"
          value={form.postalCode}
          onChange={(v: string) => setForm({ ...form, postalCode: v })}
        />
      </div>

      {/* Summary & Map: Automatically updates a mini summary and Google Maps view based on city/district to reassure the customer */}
      {form.city && form.district && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-dark-700 border border-white/10">
            <p className="font-arabic text-white/60 text-sm">
              📍 <strong className="text-white">{form.fullName || 'المستلم'}</strong> — {form.district}، {form.city}
              {form.buildingNo ? `، مبنى ${form.buildingNo}` : ''}
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
              src={`https://maps.google.com/maps?q=${encodeURIComponent(form.city + ' ' + form.district)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5" />}>
          السابق
        </MagicButton>
        <MagicButton
          id="step4-next-btn"
          fullWidth
          size="lg"
          onClick={handleNext}
          icon={<ChevronLeft className="w-5 h-5" />}
        >
          التالي — مراجعة الطلب
        </MagicButton>
      </div>
    </div>
  );
}
