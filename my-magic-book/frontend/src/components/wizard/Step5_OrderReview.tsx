import { useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import { useAuth } from '../../context/AuthContext';
import MagicButton from '../common/MagicButton';
import { ChevronRight, CreditCard, Shield, Package, CheckCircle } from 'lucide-react';
import { orderApi } from '../../api/orderApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Props Interface: Needs only 'onPrev' as 'onNext' is dynamically handled by Checkout submissions
interface Props { onPrev: () => void; }

// Constant: Packages needed to correctly calculate and display the final checkout total price
const BOOK_PACKAGES = [
  { id: 'color', label: 'كتاب ملون', price: 65 },
  { id: 'coloring', label: 'دفتر تلوين', price: 45 },
  { id: 'pro', label: 'باقة Pro (النسختين)', price: 100 },
];

export default function Step5_OrderReview({ onPrev }: Props) { // To move back to the previous page in the steps
  const { progress, resetProgress } = useStoryProgress(); // To access User Choices in the steps

  // Context: Authentication state to ensure user is logged in before paying
  const { isAuthenticated } = useAuth();

  // Hook: Used for forcefully redirecting the user to login or dashboard paths
  const navigate = useNavigate();

  // Local State: Tracks if the final checkout API request is ongoing
  const [isProcessing, setIsProcessing] = useState(false);

  // Local State: Tracks if the order was successfully completed to display the success UI
  const [isSuccess, setIsSuccess] = useState(false);

  // Destructures the main wizard progress into component properties for easier rendering
  const { childDetails, storyConfig, bookCustomization, shippingAddress } = progress;

  // Derived State: Finding the total price again based on the saved customization selected in Step 3
  const selectedPkg = BOOK_PACKAGES.find(p => p.id === bookCustomization?.bookPackage) || BOOK_PACKAGES[0];
  const deliveryFee = 30;
  const totalPrice = selectedPkg.price + deliveryFee;

  // Function: Handles the final submission, ensures the user is logged in, and submits the order to backend API
  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error('يرجى تسجيل الدخول أولاً');
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
      toast.success('تم تسجيل طلبك بنجاح! سيتواصل معك فريقنا قريباً 🎉');
      setTimeout(() => {
        resetProgress();
        navigate('/dashboard');
      }, 3000);
    } catch (err) {
      toast.error('حدث خطأ — يرجى المحاولة مجدداً');
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
        <h2 className="font-arabic font-black text-white text-2xl">طلبك في الطريق! 🚀</h2>
        <p className="font-arabic text-white/60">سيصلك كتابك السحري خلال ٣-٤ أيام عمل</p>
        <div className="text-5xl animate-bounce-slow">📚✨</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🚀</div>
        <h2 className="font-arabic font-bold text-white text-xl mb-1">مراجعة الطلب</h2>
        <p className="font-arabic text-white/50 text-sm">تأكد من تفاصيل طلبك قبل الدفع</p>
      </div>

      <div className="space-y-4">
        {/* Story Info: Displays a summary of the choices made in Step 1 and Step 2 */}
        <div className="p-4 rounded-xl bg-dark-700 border border-white/10 space-y-2">
          <h3 className="font-arabic font-bold text-white text-sm mb-3 flex items-center gap-2">
            <span>📖</span> تفاصيل القصة
          </h3>
          <Row label="بطل القصة" value={childDetails.childName || '-'} />
          <Row label="الجنس" value={childDetails.childGender === 'female' ? 'بنت 👧' : 'ولد 👦'} />
          <Row label="عمر البطل" value={childDetails.childAge ? `${childDetails.childAge} سنوات` : '-'} />
          <Row label="موضوع القصة" value={storyConfig?.theme || 'مغامرة'} />
          <Row label="لغة القصة" value={storyConfig?.language === 'en' ? 'إنجليزية 🇬🇧' : storyConfig?.language === 'he' ? 'عبرية 🇮🇱' : 'عربية 🇸🇦'} />
        </div>

        {/* Customization: Displays the choices made in Step 3 regarding the physical book attributes */}
        <div className="p-4 rounded-xl bg-dark-700 border border-white/10 space-y-2">
          <h3 className="font-arabic font-bold text-white text-sm mb-3 flex items-center gap-2">
            <span>🎨</span> تخصيص الكتاب
          </h3>
          <div className="flex items-center gap-3">
            <span className="font-arabic text-white/50 text-sm">لون الغلاف:</span>
            <div className="w-6 h-6 rounded-lg border border-white/20" style={{ background: bookCustomization?.coverColor }} />
          </div>
          <Row label="نوع الباقة" value={selectedPkg.label} />
        </div>

        {/* Shipping: Displays the address gathered in Step 4 */}
        <div className="p-4 rounded-xl bg-dark-700 border border-white/10 space-y-2">
          <h3 className="font-arabic font-bold text-white text-sm mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" /> عنوان الشحن
          </h3>
          <Row label="المستلم" value={shippingAddress?.fullName || '-'} />
          <Row label="الهاتف" value={shippingAddress?.phone || '-'} />
          <Row label="العنوان" value={`${shippingAddress?.district}، ${shippingAddress?.city}`} />
        </div>

        {/* Price: Calculates the total cost before final checkout API call is made */}
        <div className="p-4 rounded-xl bg-gradient-to-l from-gold-500/20 to-gold-500/5 border border-gold-500/30 space-y-2">
          <h3 className="font-arabic font-bold text-white text-sm mb-3">💰 ملخص الأسعار</h3>
          <Row label={selectedPkg.label} value={`${selectedPkg.price} ₪`} />
          <Row label="رسوم التوصيل" value={`${deliveryFee} ₪`} />
          <div className="border-t border-gold-500/30 pt-2 flex items-center justify-between">
            <span className="font-arabic font-black text-white text-lg">الإجمالي</span>
            <span className="font-arabic font-black text-gold-500 text-2xl">{totalPrice} ₪</span>
          </div>
        </div>
      </div>

      {/* Security badge */}
      <div className="flex items-center gap-2 justify-center text-white/30">
        <Shield className="w-4 h-4 text-green-500" />
        <span className="font-arabic text-xs">دفع آمن ومشفر عبر Stripe</span>
      </div>

      <div className="flex gap-3">
        <MagicButton variant="outline" size="lg" onClick={onPrev} icon={<ChevronRight className="w-5 h-5" />}>
          السابق
        </MagicButton>
        <MagicButton
          id="checkout-btn"
          fullWidth
          size="lg"
          onClick={handleCheckout}
          isLoading={isProcessing}
          icon={<CreditCard className="w-5 h-5" />}
        >
          {isAuthenticated ? `ادفع ${totalPrice} ₪ الآن` : 'سجّل دخولك للدفع'}
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
