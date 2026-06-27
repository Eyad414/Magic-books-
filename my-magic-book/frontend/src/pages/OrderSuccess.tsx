import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { orderApi } from '../api/orderApi';

type OrderState = {
  _id: string;
  paymentStatus?: string;
  illustrationsStatus?: 'pending' | 'generating' | 'ready' | 'failed';
  storyId?: any;
};

export default function OrderSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const { i18n } = useTranslation();
  const [order, setOrder] = useState<OrderState | null>(null);

  // Poll the order so the customer sees payment → "preparing" → "ready" live.
  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await orderApi.getMyOrders();
        const found = (res.orders || []).find((o: any) => o._id === orderId);
        if (active && found) setOrder(found);
      } catch { /* keep polling */ }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { active = false; clearInterval(id); };
  }, [orderId]);

  const status = order?.illustrationsStatus;
  const ready = status === 'ready';
  const failed = status === 'failed';
  const storyId = typeof order?.storyId === 'object' ? order?.storyId?._id : order?.storyId;

  return (
    <div className="min-h-screen bg-[#03060e] flex items-center justify-center px-4 py-24" dir={i18n.dir()}>
      <div className="max-w-md w-full text-center bg-[#0a1426] border border-gold-500/25 rounded-3xl p-8 space-y-5 shadow-2xl">
        <div className="text-6xl">{failed ? '⚠️' : ready ? '🎉' : '✅'}</div>

        <h1 className="font-arabic font-black text-2xl text-white">
          {failed ? 'حدثت مشكلة' : 'تم الدفع بنجاح!'}
        </h1>

        <p className="font-arabic text-white/70 leading-relaxed">
          {failed
            ? 'واجهنا مشكلة أثناء إنشاء الكتاب. لا تقلق — فريقنا سيتواصل معك، ولن تُحتسب أي رسوم إضافية.'
            : ready
              ? 'كتاب طفلك السحري جاهز! 🪄'
              : 'شكراً لك ❤️ نقوم الآن بإنشاء كتاب طفلك المخصّص بالذكاء الاصطناعي. تستغرق العملية بضع دقائق.'}
        </p>

        {/* Live status pill */}
        {!failed && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/30">
            {!ready && (
              <span className="w-3 h-3 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
            )}
            <span className="font-arabic text-sm text-gold-400">
              {ready ? 'الكتاب جاهز ✨' : status === 'generating' ? 'جاري الرسم...' : 'قيد التحضير...'}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2">
          {ready && storyId && (
            <Link
              to={`/book/${storyId}`}
              className="w-full py-3 rounded-xl bg-gold-500 text-[#0a1628] font-arabic font-bold hover:bg-gold-400 transition"
            >
              📖 تصفّح كتاب طفلك
            </Link>
          )}
          <Link
            to="/dashboard"
            className="w-full py-3 rounded-xl border border-gold-500/40 text-gold-400 font-arabic font-bold hover:bg-gold-500/10 transition"
          >
            الذهاب إلى قصصي وطلباتي
          </Link>
        </div>

        {orderId && (
          <p className="font-arabic text-white/30 text-xs">رقم الطلب: {orderId.slice(-8)}</p>
        )}
      </div>
    </div>
  );
}
