import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import MagicButton from '../components/common/MagicButton';
import { Mail, ArrowRight, MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

/**
 * Ask for a reset link.
 *
 * The confirmation deliberately does not say whether the address had an
 * account — the API answers the same way for both, and a page that said
 * "no such user" would give that away again.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('auth.forgot_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-dark-900 relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-navy-800/50 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="flex items-center gap-3 justify-center mb-8">
          <img
            src="/logo.png?v=7"
            alt="Magic Fanoos"
            className="h-14 w-auto object-contain drop-shadow-[0_0_12px_rgba(212,169,55,0.5)]"
          />
          <div className="flex flex-col leading-tight">
            <span className="font-brand font-bold text-gold-500 text-xl tracking-wider">Magic Fanoos</span>
            <span className="font-['Marhey'] font-bold text-gold-500/75 text-base">الفانوس السحري</span>
          </div>
        </Link>

        <div className="glass-card p-8">
          {sent ? (
            <div className="text-center">
              <MailCheck className="w-12 h-12 text-gold-500 mx-auto mb-4" />
              <h1 className="font-arabic font-black text-white text-2xl mb-3">{t('auth.forgot_sent_title')}</h1>
              <p className="font-arabic text-white/60 text-sm leading-relaxed mb-6">{t('auth.forgot_sent_desc')}</p>
              <Link to="/login" className="font-arabic text-gold-500 hover:underline font-bold text-sm">
                {t('auth.back_to_login')}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="font-arabic font-black text-white text-2xl mb-2">{t('auth.forgot_title')}</h1>
                <p className="font-arabic text-white/50 text-sm">{t('auth.forgot_desc')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="forgot-email"
                      type="email"
                      className="magic-input pr-10"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <MagicButton id="forgot-submit-btn" type="submit" fullWidth size="lg" isLoading={isLoading}>
                  {t('auth.forgot_btn')}
                </MagicButton>
              </form>

              <p className="font-arabic text-white/40 text-sm text-center mt-6">
                <Link to="/login" className="text-gold-500 hover:underline font-bold inline-flex items-center gap-1">
                  <ArrowRight className="w-4 h-4" />
                  {t('auth.back_to_login')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
