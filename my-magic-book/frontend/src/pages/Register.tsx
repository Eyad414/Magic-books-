import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MagicButton from '../components/common/MagicButton';
import { BookOpen, Mail, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    if (form.password.length < 6) {
      toast.error('كلمة المرور يجب أن تكون ٦ أحرف على الأقل');
      return;
    }
    setIsLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success(`مرحباً ${form.name}! تم إنشاء حسابك ✨`);
      navigate('/create');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'فشل في إنشاء الحساب');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-dark-900 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/3 w-80 h-80 bg-magic-500/15 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-800 to-magic-500 flex items-center justify-center shadow-magic-glow">
            <BookOpen className="w-6 h-6 text-gold-500" />
          </div>
          <div>
            <div className="font-arabic font-black text-gold-500 text-xl">كتابي السحري</div>
          </div>
        </Link>

        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="font-arabic font-black text-white text-2xl mb-2">أنشئ حسابك</h1>
            <p className="font-arabic text-white/50 text-sm">انضم وابدأ رحلة القصص السحرية</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-arabic text-white/70 text-sm mb-2">الاسم الكامل</label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="register-name"
                  type="text"
                  className="magic-input pr-10"
                  placeholder="اسمك الكامل"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block font-arabic text-white/70 text-sm mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="register-email"
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
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  className="magic-input pr-10 pl-10"
                  placeholder="٦ أحرف على الأقل"
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
            <div>
              <label className="block font-arabic text-white/70 text-sm mb-2">تأكيد كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  className="magic-input pr-10"
                  placeholder="أعد كلمة المرور"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
              </div>
            </div>

            <MagicButton
              id="register-submit-btn"
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              icon={<Sparkles className="w-4 h-4" />}
              className="mt-2"
            >
              إنشاء الحساب
            </MagicButton>
          </form>

          <p className="font-arabic text-white/40 text-sm text-center mt-6">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="text-gold-500 hover:underline font-bold">
              سجّل دخولك
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
