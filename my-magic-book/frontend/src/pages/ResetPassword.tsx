import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/authApi';
import MagicButton from '../components/common/MagicButton';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

/** Choose a new password, using the token from the emailed link. */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Checked here as well as on the server: the server never sees `confirm`,
    // so a mismatch would otherwise silently set the wrong password.
    if (form.password !== form.confirm) {
      toast.error(t('auth.reset_mismatch'));
      return;
    }
    setIsLoading(true);
    try {
      await authApi.resetPassword(token, form.password);
      // The API's messages are Arabic-only, so showing one to an English or
      // Hebrew reader swaps the language mid-flow. Ours is translated.
      toast.success(t('auth.reset_success'));
      navigate('/login');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('auth.reset_error'));
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
          {!token ? (
            // Reached without a token — someone opened /reset-password directly,
            // or a mail client mangled the link. Say so instead of showing a
            // form that cannot possibly work.
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-gold-500/80 mx-auto mb-4" />
              <h1 className="font-arabic font-black text-white text-2xl mb-3">{t('auth.reset_no_token_title')}</h1>
              <p className="font-arabic text-white/60 text-sm leading-relaxed mb-6">{t('auth.reset_no_token_desc')}</p>
              <Link to="/forgot-password" className="font-arabic text-gold-500 hover:underline font-bold text-sm">
                {t('auth.forgot_btn')}
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="font-arabic font-black text-white text-2xl mb-2">{t('auth.reset_title')}</h1>
                <p className="font-arabic text-white/50 text-sm">{t('auth.reset_desc')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">{t('auth.new_password')}</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="reset-password"
                      type={showPassword ? 'text' : 'password'}
                      className="magic-input pr-10 pl-10"
                      placeholder="********"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-arabic text-white/70 text-sm mb-2">{t('auth.confirm_password')}</label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                      id="reset-confirm"
                      type={showPassword ? 'text' : 'password'}
                      className="magic-input pr-10"
                      placeholder="********"
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <MagicButton id="reset-submit-btn" type="submit" fullWidth size="lg" isLoading={isLoading}>
                  {t('auth.reset_btn')}
                </MagicButton>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
