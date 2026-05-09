import { useState } from 'react';
import { contactApi } from '../api/orderApi';
import MagicButton from '../components/common/MagicButton';
import { Mail, Phone, Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function ContactUs() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await contactApi.submit(form);
      toast.success(t('contact.toast_success'));
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      toast.error(t('contact.toast_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="font-arabic font-black text-white mb-4">
            <span className="shimmer-text">{t('contact.title')}</span>
          </h1>
          <p className="font-arabic text-white/50 text-lg">
            {t('contact.desc')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-5">
            <h2 className="font-arabic font-bold text-white text-xl">{t('contact.info_title')}</h2>
            {[
              { icon: Mail, label: t('contact.info_email'), value: 'hello@mymagicbook.sa', href: 'mailto:hello@mymagicbook.sa' },
              { icon: Phone, label: t('contact.info_phone'), value: '+966 50 000 0000', href: 'tel:+966500000000' },
              { icon: MessageCircle, label: t('contact.info_whatsapp'), value: t('contact.whatsapp_value'), href: 'https://wa.me/966500000000' },
            ].map((item) => (
              <div key={item.label} className="glass-card p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-gold-500" />
                </div>
                <div>
                  <p className="font-arabic text-white/50 text-xs mb-1">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="font-arabic text-white font-medium text-sm hover:text-gold-500 transition-colors">
                      {item.value}
                    </a>
                  ) : (
                    <p className="font-arabic text-white font-medium text-sm">{item.value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Quick Response */}
            <div className="glass-card p-4">
              <h3 className="font-arabic font-bold text-white text-sm mb-3">{t('contact.quick_response_title')}</h3>
              <p className="font-arabic text-white/50 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: t('contact.quick_response_desc') }} />
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 glass-card p-8">
            <h2 className="font-arabic font-bold text-white text-xl mb-6">{t('contact.form_title')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">{t('contact.form_name')}</label>
                  <input
                    id="contact-name"
                    type="text"
                    className="magic-input"
                    placeholder={t('contact.form_name_ph')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">{t('contact.form_email')}</label>
                  <input
                    id="contact-email"
                    type="email"
                    className="magic-input"
                    placeholder={t('contact.form_email_ph')}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">{t('contact.form_phone')}</label>
                  <input
                    id="contact-phone"
                    type="tel"
                    className="magic-input"
                    placeholder={t('contact.form_phone_ph')}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">{t('contact.form_subject')}</label>
                  <select
                    id="contact-subject"
                    className="magic-input"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  >
                    <option value="">{t('contact.subject_ph')}</option>
                    <option value="استفسار عام">{t('contact.subject_opt_1')}</option>
                    <option value="مشكلة في الطلب">{t('contact.subject_opt_2')}</option>
                    <option value="مشكلة تقنية">{t('contact.subject_opt_3')}</option>
                    <option value="إلغاء أو استرداد">{t('contact.subject_opt_4')}</option>
                    <option value="اقتراح">{t('contact.subject_opt_5')}</option>
                    <option value="أخرى">{t('contact.subject_opt_6')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-arabic text-white/70 text-sm mb-2">{t('contact.form_message')}</label>
                <textarea
                  id="contact-message"
                  className="magic-input resize-none"
                  rows={5}
                  placeholder={t('contact.form_message_ph')}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  required
                />
              </div>
              <MagicButton
                id="contact-submit-btn"
                type="submit"
                fullWidth
                size="lg"
                isLoading={isLoading}
                icon={<Send className="w-4 h-4" />}
              >
                {t('contact.form_btn')}
              </MagicButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
