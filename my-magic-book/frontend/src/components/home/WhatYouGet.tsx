import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles, Globe, Truck, Camera, Heart } from 'lucide-react';
import { usePackages } from '../../hooks/usePackages';

/**
 * What the parcel actually contains, and what it costs.
 *
 * The home page described a feeling and never once said what arrives or what
 * it costs — a visitor had to enter the wizard and reach step three to find a
 * price. That is a lot to ask for a 130 ₪ considered purchase, and the funnel
 * agrees: of nineteen visitors, thirteen left before the stories page.
 *
 * Prices come from usePackages, the same source checkout prices by, so this
 * can never advertise a number the server will not honour — the bug that had
 * the wizard quoting 60 ₪ for a 130 ₪ book.
 */
export default function WhatYouGet() {
  const { t } = useTranslation();
  const { packages, pricesReady } = usePackages();

  const printed = packages.find((p) => p.id === 'color');
  const digital = packages.find((p) => p.id === 'ebook');

  const items = [
    { icon: Camera, k: 'wyg_photo', d: 'صورة طفلك تتحوّل إلى شخصية كرتونية في كل صفحة' },
    { icon: BookOpen, k: 'wyg_pages', d: '١٣ لوحة مرسومة خصيصاً لقصته، مطبوعة بغلاف مقوّى' },
    { icon: Sparkles, k: 'wyg_name', d: 'اسم طفلك داخل النص نفسه — هو البطل، لا القارئ فقط' },
    { icon: Globe, k: 'wyg_langs', d: 'بالعربية أو الإنجليزية أو العبرية' },
    { icon: Truck, k: 'wyg_delivery', d: 'يصل إلى باب بيتك خلال ٥ إلى ٨ أيام' },
    { icon: Heart, k: 'wyg_preview', d: 'تعاين القصة والغلاف مجاناً قبل أن تدفع' },
  ];

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <p className="font-arabic text-gold-500 text-xs font-bold tracking-wider mb-2">
          {t('home.wyg_eyebrow', 'ما الذي ستستلمه فعلاً')}
        </p>
        <h2 className="font-arabic font-black text-white text-2xl sm:text-3xl">
          {t('home.wyg_title', 'كتاب حقيقي، بغلاف مقوّى، واسم طفلك في كل صفحة')}
        </h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* What is in the parcel */}
        <ul className="lg:col-span-3 grid sm:grid-cols-2 gap-2.5">
          {items.map(({ icon: Icon, k, d }) => (
            <li
              key={k}
              className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-gold-500/30 transition-colors"
            >
              <span className="shrink-0 w-9 h-9 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center">
                <Icon className="w-4 h-4 text-gold-500" />
              </span>
              <span className="font-arabic text-white/75 text-sm leading-relaxed">{t(`home.${k}`, d)}</span>
            </li>
          ))}
        </ul>

        {/* The price, stated plainly instead of hidden three steps deep */}
        <div className="lg:col-span-2 rounded-2xl p-5 bg-gradient-to-b from-gold-500/15 to-transparent border border-gold-500/30 flex flex-col">
          <p className="font-arabic text-white/60 text-xs mb-1">
            {t('home.wyg_price_label', 'الكتاب المطبوع الملوّن')}
          </p>
          <div className="flex items-end gap-2 mb-1">
            {pricesReady && printed?.price != null ? (
              <>
                <span className="font-arabic font-black text-gold-500 text-4xl leading-none" dir="ltr">{printed.price}</span>
                <span className="font-arabic text-gold-500/80 text-lg mb-0.5">₪</span>
              </>
            ) : (
              <span className="inline-block h-9 w-24 rounded-lg bg-gold-500/20 animate-pulse" />
            )}
          </div>
          <p className="font-arabic text-white/45 text-[11px] mb-4">
            {t('home.wyg_delivery_note_v2', 'شامل التوصيل — لا رسوم إضافية')}
          </p>

          {digital && (
            <p className="font-arabic text-white/55 text-xs mb-4 pb-4 border-b border-white/10">
              {t('home.wyg_digital', 'تفضّل نسخة رقمية؟')}{' '}
              {pricesReady && digital.price != null
                ? <span className="text-white/80 font-bold" dir="ltr">{digital.price} ₪</span>
                : <span className="inline-block h-3 w-10 rounded bg-white/15 animate-pulse align-middle" />}
            </p>
          )}

          <Link
            to="/create"
            className="mt-auto inline-flex items-center justify-center min-h-[48px] px-5 rounded-2xl bg-magic-gradient text-dark-900 font-arabic font-black text-sm shadow-lg shadow-gold-500/20 hover:brightness-110 transition-all"
          >
            {t('home.wyg_cta', '✨ ابدأ قصة طفلك')}
          </Link>
          <p className="font-arabic text-white/35 text-[10px] text-center mt-2">
            {t('home.wyg_no_risk', 'المعاينة مجانية — لا تدفع قبل أن ترى القصة')}
          </p>
        </div>
      </div>
    </section>
  );
}
