import { useState } from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import { useAuth } from '../../context/AuthContext';
import MagicButton from '../common/MagicButton';
import { ChevronRight, CreditCard, Shield, CheckCircle } from 'lucide-react';
import { orderApi } from '../../api/orderApi';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCheckoutTotals } from '../../hooks/useCheckoutTotals';

/**
 * Step 4 — payment only.
 *
 * Shipping details and the order review live in step 3; this screen exists so
 * paying is its own step rather than the tail of a long form. It is also where
 * BookPod's hosted checkout will be handed off to: when their payment link
 * arrives, this redirects there instead of placing a cash order, and card
 * details never touch this site.
 */
interface Props { onPrev: () => void; }

// Online gateways aren't live yet — cash on delivery is the only real option.
const ONLINE_PAYMENTS_ENABLED = false;

export default function Step4_Payment({ onPrev }: Props) {
  const { progress, resetProgress } = useStoryProgress();
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const { storyConfig, bookCustomization, shippingAddress } = progress;
  const isPickup = shippingAddress?.deliveryMethod === 'pickup';

  const { selectedPkg, deliveryFee, discountedBase, totalPrice } = useCheckoutTotals({
    bookPackage: bookCustomization?.bookPackage,
    isPickup,
  });

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'applepay' | 'cash'>(
    ONLINE_PAYMENTS_ENABLED ? 'card' : 'cash',
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error(t('step5.err_login'));
      navigate('/login');
      return;
    }
    // Step 3 already validated and saved the address; if it is somehow missing,
    // send the customer back rather than submitting an undeliverable order.
    if (!shippingAddress?.fullName || !shippingAddress?.phone) {
      toast.error(t('checkout.err_shipping', 'يرجى إكمال بيانات الشحن أولاً'));
      onPrev();
      return;
    }
    setIsProcessing(true);
    try {
      const res = await orderApi.createCheckout({
        storyId: storyConfig?.storyId,
        shippingAddress,
        totalPrice,
        paymentMethod,
        bookPackage: bookCustomization?.bookPackage,
      });
      // When an online gateway is live this carries the hosted payment URL —
      // BookPod's page included. The customer pays there, never here.
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
        return;
      }
      setIsSuccess(true);
      toast.success(t('step5.success_toast'));
      setTimeout(() => { resetProgress(); navigate('/dashboard'); }, 3000);
    } catch (err: any) {
      // Some rejections are deliberate and tell the customer what to fix (a
      // story with no photo cannot be illustrated). Show the server's words.
      const serverMsg = err?.response?.data?.message;
      toast.error(serverMsg || t('step5.err_general'));
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
          <span className="shimmer-text">{t('payment.title', 'الدفع')}</span>
        </h2>
        <p className="font-arabic text-white/50 text-sm">
          {t('payment.desc', 'اختر طريقة الدفع لإتمام طلبك.')}
        </p>
      </div>

      {/* What is being paid for — short, since step 3 has the full review. */}
      <div className="p-3 rounded-xl bg-dark-700 border border-white/10 space-y-1.5">
        <Row label={selectedPkg?.label || ''} value={`${discountedBase} ₪`} />
        <Row
          label={t('step5.delivery_fee')}
          value={deliveryFee === 0 ? `${t('step3.free_delivery', 'مجاني')} 🎉` : `${deliveryFee} ₪`}
        />
        <div className="mt-1 flex items-center justify-between rounded-xl bg-gold-500/15 border border-gold-500/40 px-3 py-2.5">
          <span className="font-arabic font-black text-white text-lg">{t('step5.total')}</span>
          <span className="font-arabic font-black text-gold-500 text-2xl drop-shadow-[0_0_10px_rgba(212,169,55,0.4)]">{totalPrice} ₪</span>
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
              // "on pickup" is wrong for a home delivery — that customer is
              // paying the courier at the door, and is being charged a
              // delivery fee two lines above.
              {
                id: 'cash',
                label: isPickup ? t('step5.cash', 'نقدًا عند الاستلام') : t('step5.cash_delivery', 'نقدًا عند التوصيل'),
                icon: '💵',
                soon: false,
              },
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
            💵 {isPickup
              ? t('step5.cash_note', 'سيتم تحصيل المبلغ نقدًا عند استلام الطلب من نقطة الاستلام.')
              : t('step5.cash_note_delivery', 'سيتم تحصيل المبلغ نقدًا عند توصيل الطلب إلى عنوانك.')}
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
