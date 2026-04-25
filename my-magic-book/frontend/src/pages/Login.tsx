import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MagicButton from '../components/common/MagicButton';
import { BookOpen, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('مرحباً بعودتك! ✨');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'البريد أو كلمة المرور غير صحيحة');
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-800 to-magic-500 flex items-center justify-center shadow-magic-glow">
            <BookOpen className="w-6 h-6 text-gold-500" />
          </div>
          <div className="font-arabic font-black text-gold-500 text-xl">كتابي السحري</div>
        </Link>

        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="font-arabic font-black text-white text-2xl mb-2">مرحباً بعودتك</h1>
            <p className="font-arabic text-white/50 text-sm">سجّل دخولك لمتابعة قصصك السحرية</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-arabic text-white/70 text-sm mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="login-email"
                  type="email"
                  className="magic-input pr-10"
                  placeholder="email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  dir="ltr"
                />
              </div>
            </div>
            <div>
              <label className="block font-arabic text-white/70 text-sm mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="magic-input pr-10 pl-10"
                  placeholder="كلمة المرور"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
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

            <MagicButton
              id="login-submit-btn"
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
            >
              تسجيل الدخول
            </MagicButton>
          </form>

          <p className="font-arabic text-white/40 text-sm text-center mt-6">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-gold-500 hover:underline font-bold">
              أنشئ حساباً مجانياً
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
