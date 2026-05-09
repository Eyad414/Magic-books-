import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api/adminApi';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Users, Settings, BookOpen, UserPlus } from 'lucide-react';
import MagicButton from '../components/common/MagicButton';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'team' | 'pricing' | 'stories'>('team');
  const [team, setTeam] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  // New Admin Form
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== 'admin') {
        navigate('/dashboard');
        toast.error('غير مصرح لك بالدخول إلى هذه الصفحة');
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTeam();
      fetchSettings();
    }
  }, [user]);

  const fetchTeam = async () => {
    try {
      const res = await adminApi.getTeam();
      if (res.success) setTeam(res.admins);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await adminApi.getSettings();
      if (res.success) setSettings(res.settings);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingAdmin(true);
    try {
      const res = await adminApi.addAdmin(adminForm);
      if (res.success) {
        toast.success(res.message);
        setAdminForm({ name: '', email: '', password: '' });
        fetchTeam();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل في إضافة المسؤول');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      const res = await adminApi.updateSettings(newSettings);
      if (res.success) {
        toast.success(res.message);
        setSettings(res.settings);
      }
    } catch (err: any) {
      toast.error('فشل في حفظ الإعدادات');
    }
  };

  if (isLoading || !settings) return <div className="min-h-screen pt-24 text-center text-white/50">جاري التحميل...</div>;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="glass-card p-4 sticky top-24 border-red-500/20">
            <h2 className="font-arabic font-bold text-red-400 mb-4 px-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> لوحة الإدارة
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { id: 'team', label: 'فريق العمل', icon: Users },
                { id: 'pricing', label: 'الأسعار والباقات', icon: Settings },
                { id: 'stories', label: 'القصص والمواضيع', icon: BookOpen },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-arabic font-medium text-sm transition-all ${
                    tab === t.id
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="glass-card p-6 min-h-[500px]">
            {tab === 'team' ? (
              <div>
                <h2 className="font-arabic font-bold text-xl text-white mb-6">إدارة فريق العمل</h2>
                
                <div className="bg-dark-700/50 p-5 rounded-2xl border border-white/5 mb-8">
                  <h3 className="font-arabic text-gold-500 font-bold mb-4 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> إضافة مسؤول جديد
                  </h3>
                  <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">الاسم</label>
                      <input type="text" className="magic-input w-full" value={adminForm.name} onChange={e => setAdminForm({...adminForm, name: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">البريد</label>
                      <input type="email" dir="ltr" className="magic-input w-full" value={adminForm.email} onChange={e => setAdminForm({...adminForm, email: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">كلمة المرور</label>
                      <input type="password" dir="ltr" className="magic-input w-full" value={adminForm.password} onChange={e => setAdminForm({...adminForm, password: e.target.value})} required />
                    </div>
                    <MagicButton type="submit" isLoading={isAddingAdmin} className="sm:col-span-3">إضافة مسؤول</MagicButton>
                  </form>
                </div>

                <div className="space-y-3">
                  {team.map((admin) => (
                    <div key={admin._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <div className="font-arabic text-white font-bold">{admin.name}</div>
                        <div className="font-sans text-white/50 text-xs">{admin.email}</div>
                      </div>
                      <div className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg">Admin</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : tab === 'pricing' ? (
              <div>
                <h2 className="font-arabic font-bold text-xl text-white mb-6">إدارة الأسعار والباقات</h2>
                <div className="space-y-4">
                  {settings.bookPackages.map((pkg: any, index: number) => (
                    <div key={pkg.id} className="p-4 bg-white/5 rounded-xl border border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                      <div className="sm:col-span-1">
                        <label className="block font-arabic text-white/70 text-xs mb-1">الاسم</label>
                        <input type="text" className="magic-input w-full" value={pkg.label} onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].label = e.target.value;
                          setSettings({...settings, bookPackages: newPkgs});
                        }} />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block font-arabic text-white/70 text-xs mb-1">السعر (ريال/شيكل)</label>
                        <input type="number" className="magic-input w-full" value={pkg.price} onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].price = Number(e.target.value);
                          setSettings({...settings, bookPackages: newPkgs});
                        }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-arabic text-white/70 text-xs mb-1">الوصف</label>
                        <input type="text" className="magic-input w-full" value={pkg.desc} onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].desc = e.target.value;
                          setSettings({...settings, bookPackages: newPkgs});
                        }} />
                      </div>
                    </div>
                  ))}
                  <MagicButton onClick={() => saveSettings(settings)} className="mt-4">حفظ أسعار الباقات</MagicButton>
                </div>
              </div>
            ) : tab === 'stories' ? (
              <div>
                <h2 className="font-arabic font-bold text-xl text-white mb-6">إدارة القصص والمواضيع</h2>
                <div className="space-y-4">
                  {settings.themes.map((theme: any, index: number) => (
                    <div key={theme.id} className="p-4 bg-white/5 rounded-xl border border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                      <div className="sm:col-span-1">
                        <label className="block font-arabic text-white/70 text-xs mb-1">الاسم</label>
                        <input type="text" className="magic-input w-full" value={theme.label} onChange={(e) => {
                          const newThemes = [...settings.themes];
                          newThemes[index].label = e.target.value;
                          setSettings({...settings, themes: newThemes});
                        }} />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block font-arabic text-white/70 text-xs mb-1">الأيقونة (Emoji)</label>
                        <input type="text" className="magic-input w-full text-center" value={theme.emoji} onChange={(e) => {
                          const newThemes = [...settings.themes];
                          newThemes[index].emoji = e.target.value;
                          setSettings({...settings, themes: newThemes});
                        }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-arabic text-white/70 text-xs mb-1">الوصف</label>
                        <input type="text" className="magic-input w-full" value={theme.desc} onChange={(e) => {
                          const newThemes = [...settings.themes];
                          newThemes[index].desc = e.target.value;
                          setSettings({...settings, themes: newThemes});
                        }} />
                      </div>
                    </div>
                  ))}
                  <button onClick={() => {
                     setSettings({
                       ...settings,
                       themes: [...settings.themes, { id: 'new_'+Date.now(), label: 'موضوع جديد', emoji: '✨', desc: 'وصف جديد' }]
                     })
                  }} className="text-gold-500 font-arabic text-sm hover:underline block mb-4">+ إضافة موضوع جديد</button>
                  <MagicButton onClick={() => saveSettings(settings)}>حفظ المواضيع</MagicButton>
                </div>
              </div>
            ) : null}
          </div>
        </div>

      </div>
    </div>
  );
}
