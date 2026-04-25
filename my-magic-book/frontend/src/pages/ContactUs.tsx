import { useState } from 'react';
import { contactApi } from '../api/orderApi';
import MagicButton from '../components/common/MagicButton';
import { Mail, Phone, Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactUs() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await contactApi.submit(form);
      toast.success('تم إرسال رسالتك! سيتواصل معك فريقنا قريباً 💌');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      toast.error('فشل في إرسال الرسالة — يرجى المحاولة مجدداً');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h1 className="font-arabic font-black text-white mb-4">
            <span className="shimmer-text">تواصل معنا</span>
          </h1>
          <p className="font-arabic text-white/50 text-lg">
            نحن هنا لمساعدتك! لا تتردد في التواصل معنا بأي وقت
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-5">
            <h2 className="font-arabic font-bold text-white text-xl">معلومات التواصل</h2>
            {[
              { icon: Mail, label: 'البريد الإلكتروني', value: 'hello@mymagicbook.sa', href: 'mailto:hello@mymagicbook.sa' },
              { icon: Phone, label: 'رقم الهاتف', value: '+966 50 000 0000', href: 'tel:+966500000000' },
              { icon: MessageCircle, label: 'واتساب', value: 'تواصل عبر واتساب', href: 'https://wa.me/966500000000' },
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
              <h3 className="font-arabic font-bold text-white text-sm mb-3">💬 متواجدون دائماً</h3>
              <p className="font-arabic text-white/50 text-xs leading-relaxed">
                نعمل على مدار الساعة (24/7) لخدمتكم.<br />
                سيتم الرد على استفسارك في أقرب وقت ممكن.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 glass-card p-8">
            <h2 className="font-arabic font-bold text-white text-xl mb-6">أرسل لنا رسالة</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">الاسم *</label>
                  <input
                    id="contact-name"
                    type="text"
                    className="magic-input"
                    placeholder="اسمك الكامل"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">البريد الإلكتروني *</label>
                  <input
                    id="contact-email"
                    type="email"
                    className="magic-input"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">رقم الهاتف</label>
                  <input
                    id="contact-phone"
                    type="tel"
                    className="magic-input"
                    placeholder="05XXXXXXXX"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">الموضوع *</label>
                  <select
                    id="contact-subject"
                    className="magic-input"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    required
                  >
                    <option value="">اختر الموضوع</option>
                    <option value="استفسار عام">استفسار عام</option>
                    <option value="مشكلة في الطلب">مشكلة في الطلب</option>
                    <option value="مشكلة تقنية">مشكلة تقنية</option>
                    <option value="إلغاء أو استرداد">إلغاء أو استرداد</option>
                    <option value="اقتراح">اقتراح</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-arabic text-white/70 text-sm mb-2">الرسالة *</label>
                <textarea
                  id="contact-message"
                  className="magic-input resize-none"
                  rows={5}
                  placeholder="اكتب رسالتك هنا..."
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
                إرسال الرسالة
              </MagicButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
