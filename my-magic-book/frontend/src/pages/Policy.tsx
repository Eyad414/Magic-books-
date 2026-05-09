import { Link } from 'react-router-dom';
import { Lock, Eye, Shield, FileText, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Section = ({ id, icon: Icon, title, children }: any) => (
  <section id={id} className="mb-10">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gold-500" />
      </div>
      <h2 className="font-arabic font-bold text-white text-xl">{title}</h2>
    </div>
    <div className="glass-card p-6">
      <div className="font-arabic text-white/60 text-sm leading-relaxed space-y-3">{children}</div>
    </div>
  </section>
);

export default function Policy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-arabic font-black text-white mb-4">
            <span className="shimmer-text">{t('policy.title')}</span>
          </h1>
          <p className="font-arabic text-white/50">{t('policy.last_updated')}</p>
        </div>

        <Section id="privacy" icon={Lock} title={t('policy.privacy_title')}>
          <p>{t('policy.privacy_content_1')}</p>
          <p><strong className="text-white">{t('policy.privacy_content_2').split(':')[0]}:</strong> {t('policy.privacy_content_2').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.privacy_content_3').split(':')[0]}:</strong> {t('policy.privacy_content_3').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.privacy_content_4').split(':')[0]}:</strong> {t('policy.privacy_content_4').split(':')[1]}</p>
        </Section>

        <Section id="terms" icon={FileText} title={t('policy.terms_title')}>
          <p><strong className="text-white">{t('policy.terms_content_1').split(':')[0]}:</strong> {t('policy.terms_content_1').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.terms_content_2').split(':')[0]}:</strong> {t('policy.terms_content_2').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.terms_content_3').split(':')[0]}:</strong> {t('policy.terms_content_3').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.terms_content_4').split(':')[0]}:</strong> {t('policy.terms_content_4').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.terms_content_5').split(':')[0]}:</strong> {t('policy.terms_content_5').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.terms_content_6').split(':')[0]}:</strong> {t('policy.terms_content_6').split(':')[1]}</p>
        </Section>

        <Section id="refund" icon={Eye} title={t('policy.refund_title')}>
          <p>{t('policy.refund_content_1')}</p>
          <p><strong className="text-white">{t('policy.refund_content_2').split(':')[0]}:</strong> {t('policy.refund_content_2').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.refund_content_3').split(':')[0]}:</strong> {t('policy.refund_content_3').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.refund_content_4').split(':')[0]}:</strong> {t('policy.refund_content_4').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.refund_content_5').split(':')[0]}:</strong> {t('policy.refund_content_5').split(':')[1]}</p>
          <p>{t('policy.refund_contact')} <a href="mailto:support@mymagicbook.sa" className="text-gold-500 hover:underline">support@mymagicbook.sa</a></p>
        </Section>

        <Section id="shipping" icon={Shield} title={t('policy.shipping_title')}>
          <p><strong className="text-white">{t('policy.shipping_content_1').split(':')[0]}:</strong> {t('policy.shipping_content_1').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.shipping_content_2').split(':')[0]}:</strong> {t('policy.shipping_content_2').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.shipping_content_3').split(':')[0]}:</strong> {t('policy.shipping_content_3').split(':')[1]}</p>
        </Section>

        <Section id="payment" icon={CreditCard} title={t('policy.payment_title')}>
          <p><strong className="text-white">{t('policy.payment_content_1').split(':')[0]}:</strong> {t('policy.payment_content_1').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.payment_content_2').split(':')[0]}:</strong> {t('policy.payment_content_2').split(':')[1]}</p>
        </Section>

        <Section id="data-deletion" icon={Lock} title={t('policy.data_deletion_title')}>
          <p><strong className="text-white">{t('policy.data_deletion_content_1').split(':')[0]}:</strong> {t('policy.data_deletion_content_1').split(':')[1]}</p>
          <p><strong className="text-white">{t('policy.data_deletion_content_2').split(':')[0]}:</strong> {t('policy.data_deletion_content_2').split(':')[1]}</p>
        </Section>

        <div className="text-center mt-10">
          <p className="font-arabic text-white/30 text-sm mb-4">{t('policy.footer_question')}</p>
          <Link to="/contact" className="font-arabic text-gold-500 hover:underline text-sm">
            {t('policy.footer_contact')}
          </Link>
        </div>
      </div>
    </div>
  );
}
