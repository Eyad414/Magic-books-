import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

/**
 * The questions that stop a 130 ₪ purchase, answered before they are asked.
 *
 * Of the visitors who reach this site, most never open the wizard at all —
 * and the page gave them nowhere to resolve a doubt. Every answer below is a
 * fact about how the shop actually works today, taken from the code that runs
 * it: the free preview before payment, the three languages, cash on delivery
 * or Bit transfer, and delivery included in the price since 2026-09-29.
 *
 * Deliberately not here: anything about refunds or reprints. There is no such
 * policy in the system yet, and inventing one on the home page would be a
 * promise the shop has not made.
 */

export default function HomeFaq() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);

  const QA: { q: string; a: string; href?: string; hrefLabel?: string }[] = [
    {
      q: t('home.faq_q_preview', 'أشوف القصة قبل ما أدفع؟'),
      a: t('home.faq_a_preview', 'نعم. تختار القصة وترفع صورة طفلك، وتشوف الغلاف والصفحات كاملة قبل أي دفع. إذا ما أعجبتك، ما تدفع.'),
    },
    {
      q: t('home.faq_q_photo', 'ليش تحتاجون صورة طفلي؟ وين تروح؟'),
      a: t('home.faq_a_photo', 'الصورة تتحوّل إلى شخصية مرسومة تظهر في كل صفحة — هذا هو الكتاب. تُستخدم لكتابك فقط، ولا تظهر على الموقع ولا تُشارك مع أحد.'),
    },
    {
      q: t('home.faq_q_lang', 'بأي لغة تكون القصة؟'),
      a: t('home.faq_a_lang', 'العربية أو الإنجليزية أو العبرية — تختار اللغة قبل ما نبني الكتاب، والنص كله يُكتب بها.'),
    },
    {
      q: t('home.faq_q_age', 'مناسب لأي عمر؟'),
      a: t('home.faq_a_age', 'من سنة إلى عشر سنوات. تختار الفئة العمرية ونضبط طول الجمل والكلمات على أساسها.'),
    },
    {
      q: t('home.faq_q_pay', 'كيف أدفع؟'),
      a: t('home.faq_a_pay', 'نقداً عند الاستلام، أو تحويل عبر Bit من أي مكان. التوصيل مشمول بالسعر — ما في رسوم إضافية.'),
    },
    {
      q: t('home.faq_q_time', 'قدّيش بيوخذ وقت؟'),
      a: t('home.faq_a_time', 'من خمسة إلى ثمانية أيام حتى يوصل الكتاب المطبوع. النسخة الرقمية تكون جاهزة بعد ما نبني الكتاب.'),
    },
    {
      // Straight from the refund policy, not written fresh here: a 24-hour
      // cancellation before production starts, and a free replacement for
      // damage or our own mistake. I left this question out when I built the
      // FAQ because I believed the shop had no refund policy — it has had one
      // all along on /policy, and it is better than the site was letting on.
      // Kept deliberately narrow so it cannot promise more than that page does.
      q: t('home.faq_q_refund', 'وإذا صار خطأ، أو ما وصل الكتاب منيح؟'),
      a: t(
        'home.faq_a_refund',
        'إذا وصل الكتاب تالفاً أو كان في خطأ من طرفنا، منستبدله مجاناً. وبتقدر تلغي الطلب وتسترد كامل المبلغ خلال ٢٤ ساعة ما دام الإنتاج ما بلّش — بعد ما تبدأ الطباعة ما بنقدر نلغي، لأن الكتاب مطبوع خصيصاً لطفلك.',
      ),
      href: '/policy#refund',
      hrefLabel: t('home.faq_refund_link', 'اقرأ سياسة الاسترداد كاملة'),
    },
  ];

  return (
    // id + scroll-mt: the About page links here, and without the offset the
    // heading lands behind the fixed header.
    <section id="faq" className="max-w-3xl mx-auto px-4 sm:px-6 py-10 scroll-mt-24">
      <div className="text-center mb-6">
        <h2 className="font-arabic font-black text-white text-2xl sm:text-3xl">
          {t('home.faq_title', 'أسئلة قبل ما تبدأ')}
        </h2>
      </div>

      <div className="space-y-2">
        {QA.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.q}
              className={`rounded-2xl border transition-colors ${
                isOpen ? 'bg-white/[0.06] border-gold-500/30' : 'bg-white/[0.03] border-white/10 hover:border-white/25'
              }`}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-3 text-start px-4 py-3.5 min-h-[52px]"
              >
                <span className={`font-arabic font-bold text-sm ${isOpen ? 'text-gold-500' : 'text-white/85'}`}>
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
                    isOpen ? 'rotate-180 text-gold-500' : 'text-white/35'
                  }`}
                />
              </button>
              {/* Grid-rows animation: height auto cannot be transitioned, and a
                  fixed max-height clips the longer answers on a phone. */}
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden px-4 pb-4">
                  <p className="font-arabic text-white/60 text-[13px] leading-relaxed">{item.a}</p>
                  {item.href && (
                    <Link
                      to={item.href}
                      className="inline-flex items-center gap-1 mt-2 font-arabic text-gold-500 text-[12px] font-bold hover:underline"
                    >
                      {item.hrefLabel} ←
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
