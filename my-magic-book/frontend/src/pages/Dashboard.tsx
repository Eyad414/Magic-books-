import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStoryProgress } from '../context/StoryProgressContext';
import { storyApi } from '../api/storyApi';
import { orderApi } from '../api/orderApi';
import { userApi } from '../api/userApi';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Package, Plus, Clock, CheckCircle, Sparkles, User as UserIcon, Lock, Settings, MessageSquare, ShieldAlert, Heart, Trash2, AlertTriangle, X } from 'lucide-react';
import MagicButton from '../components/common/MagicButton';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const SAMPLE_STORIES = [
  { id: 99, childName: 'إياد', theme: 'space', emoji: '🚀', color: ['#1B1F5E', '#6C3FC5'], rating: 5.0, previewText: 'كان إياد يحلم دائماً بالنجوم. وفي ليلة هادئة، تحول سريره فجأة إلى مركبة فضائية متطورة مليئة بالأزرار اللامعة!...' },
  { id: 1, childName: 'محمد', theme: 'adventure', emoji: '🗺️', color: ['#1B1F5E', '#6C3FC5'], rating: 5.0, previewText: 'في صحراء لا حدود لها، انطلق محمد بشجاعة لم يعرفها أحد من قبل. كان قلبه يدق بسرعة وعيناه تلمعان بفضول المستكشف...' },
  { id: 2, childName: 'سارة', theme: 'princess', emoji: '👸', color: ['#4a148c', '#6a1b9a'], rating: 4.9, previewText: 'في مملكة حيث تتساقط الورود من السماء، كانت الأميرة سارة تنتظر مغامرة تختلف عن كل ما رأته...' },
  { id: 3, childName: 'علي', theme: 'space', emoji: '🚀', color: ['#006064', '#00838f'], rating: 5.0, previewText: 'ارتفعت مركبة الفضاء وعلي يمسك بها بكلتا يديه، أمامه الكون اللامتناهي وقلبه مليء بالتساؤلات...' },
  { id: 4, childName: 'ريم', theme: 'ocean', emoji: '🌊', color: ['#1a237e', '#283593'], rating: 4.8, previewText: 'غاصت ريم تحت الماء لأول مرة، وما رأته عيناها لم تتخيله في أجمل أحلامها — عالم يتلألأ...' },
  { id: 5, childName: 'خالد', theme: 'superhero', emoji: '⚡', color: ['#1b5e20', '#2e7d32'], rating: 5.0, previewText: 'اكتشف خالد قوته الخارقة في يوم عادي، لكن مع القوة جاءت مسؤولية لم يكن يتوقعها...' },
  { id: 6, childName: 'نورة', theme: 'forest', emoji: '🌿', color: ['#bf360c', '#d84315'], rating: 4.9, previewText: 'دخلت نورة الغابة السرية التي لم يدخلها أحد من القرية، وفوجئت بصوت يناديها بالاسم...' },
  { id: 7, childName: 'يوسف', theme: 'dinosaurs', emoji: '🦖', color: ['#33691e', '#558b2f'], rating: 5.0, previewText: 'عاد يوسف بالزمن إلى عصر العمالقة، حيث كانت الديناصورات تمشي بجانبه وهو يبحث عن ممر العودة...' },
  { id: 8, childName: 'ليان', theme: 'robots', emoji: '🤖', color: ['#263238', '#455a64'], rating: 4.7, previewText: 'في مختبر سري، قامت ليان بتشغيل روبوتها الصغير لأول مرة، لتبدأ رحلة من البرمجة والمرح الذكي...' },
  { id: 9, childName: 'حمزة', theme: 'cooking', emoji: '👨‍🍳', color: ['#e65100', '#ef6c00'], rating: 4.9, previewText: 'وضع حمزة قبعة الطباخ وبدأ في خلط المكونات السحرية، ليكتشف أن أكلته تعطي من يتذوقها قدرات خاصة...' },
  { id: 10, childName: 'جنى', theme: 'music', emoji: '🎸', color: ['#311b92', '#512da8'], rating: 5.0, previewText: 'عزفت جنى على قيثارتها القديمة، وفجأة بدأت الأشجار ترقص والعصافير تغني معها ألحان الأمل...' },
  { id: 11, childName: 'أحمد', theme: 'animals', emoji: '🦁', color: ['#f57f17', '#fbc02d'], rating: 4.8, previewText: 'انطلق أحمد في رحلة إلى الأدغال، ليكتشف أنه الوحيد الذي يستطيع فهم لغة الحيوانات ومساعدتهم...' },
  { id: 12, childName: 'سلمى', theme: 'magic', emoji: '🪄', color: ['#4a148c', '#7b1fa2'], rating: 5.0, previewText: 'لوحت سلمى بعصاها السحرية، وتحول كل شيء حولها إلى عالم من الحلوى والغيوم الوردية الطائرة...' },
  { id: 13, childName: 'زيد', theme: 'space', emoji: '👨‍🚀', color: ['#0d47a1', '#1976d2'], rating: 5.0, previewText: 'الفضاء - الجزء الأول: هبط زيد على سطح القمر ليجد مدينة مخفية تسكنها كائنات من نور...' },
  { id: 14, childName: 'زيد', theme: 'space', emoji: '🛸', color: ['#01579b', '#0288d1'], rating: 4.9, previewText: 'الفضاء - الجزء الثاني: انطلق زيد بمركبته الجديدة نحو الثقب الأسود ليكتشف بوابة لعالم موازي...' },
  { id: 15, childName: 'تالا', theme: 'adventure', emoji: '🎒', color: ['#e65100', '#fb8c00'], rating: 4.8, previewText: 'مغامرة المدرسة: وجدت تالا خريطة كنز مخفية داخل حقيبتها المدرسية، لتبدأ رحلة البحث بين الفصول...' },
  { id: 16, childName: 'سيف', theme: 'adventure', emoji: '🏫', color: ['#1b5e20', '#43a047'], rating: 5.0, previewText: 'أول يوم في المدرسة: لم يكن يوماً عادياً لسيف، فقد اكتشف أن مدرسته تطير فوق السحاب كلما دق الجرس...' },
  { id: 17, childName: 'لورا', theme: 'ocean', emoji: '🧜‍♀️', color: ['#006064', '#00acc1'], rating: 4.9, previewText: 'مملكة الأعماق: اكتشفت لورا مدينة تحت الماء حيث البيوت من لؤلؤ والحدائق من مرجان ملون...' },
  { id: 18, childName: 'عمر', theme: 'magic', emoji: '🚗', color: ['#4a148c', '#9c27b0'], rating: 5.0, previewText: 'السيارة الطائرة: حول عمر سيارته اللعبة إلى سيارة حقيقية تطير فوق الزحام وتأخذه إلى بلاد العجائب...' },
];

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, updateUser, logout } = useAuth();
  const { resetProgress } = useStoryProgress();
  const navigate = useNavigate();
  const [stories, setStories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [tab, setTab] = useState<'stories' | 'orders' | 'favorites' | 'profile' | 'settings' | 'messages'>('stories');
  const [isFetching, setIsFetching] = useState(true);
  const { t } = useTranslation();

  // Profile form state
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', location: '' });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Password form state
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isSavingPass, setIsSavingPass] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login');
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || ''
      });
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      Promise.all([storyApi.getMyStories(), orderApi.getMyOrders()])
        .then(([storiesRes, ordersRes]) => {
          setStories(storiesRes.stories || []);
          setOrders(ordersRes.orders || []);
        })
        .catch(() => {})
        .finally(() => setIsFetching(false));
      
      const saved = localStorage.getItem('favorite_stories');
      if (saved) setFavoriteIds(JSON.parse(saved));
    }
  }, [isAuthenticated]);

  const handleStartStory = (e: React.MouseEvent) => {
    e.preventDefault();
    resetProgress();
    navigate('/create');
  };

  const handleDeleteStory = async (id: string, name: string) => {
    if (!window.confirm(t('dashboard.confirm_delete_story', { name, defaultValue: `حذف قصة ${name}؟ لا يمكن التراجع.` }))) return;
    try {
      await storyApi.remove(id);
      setStories((prev) => prev.filter((s) => s._id !== id));
      toast.success(t('dashboard.story_deleted', 'تم حذف القصة'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('dashboard.story_delete_failed', 'فشل في حذف القصة'));
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await userApi.updateProfile(profileForm);
      if (res.success) {
        toast.success(res.message);
        updateUser(res.user);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('dashboard.error_update'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error(t('dashboard.error_password_match'));
      return;
    }
    setIsSavingPass(true);
    try {
      const res = await userApi.changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      if (res.success) {
        toast.success(res.message);
        setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('dashboard.error_password_change'));
    } finally {
      setIsSavingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    setIsDeleting(true);
    try {
      await userApi.deleteAccount();
      toast.success('Account deleted successfully');
      logout();
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: t('dashboard.status_draft'), color: 'text-white/50', icon: Clock },
    generating: { label: t('dashboard.status_generating'), color: 'text-magic-400', icon: Sparkles },
    ready: { label: t('dashboard.status_ready'), color: 'text-green-400', icon: CheckCircle },
    ordered: { label: t('dashboard.status_ordered'), color: 'text-gold-500', icon: Package },
  };

  const favoriteStories = SAMPLE_STORIES.filter(story => favoriteIds.includes(story.id));

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="glass-card p-4 sticky top-24">
            <div className="flex flex-col gap-2">
              {[
                { id: 'stories', label: t('dashboard.tab_stories'), icon: BookOpen },
                { id: 'orders', label: t('dashboard.tab_orders'), icon: Package },
                { id: 'favorites', label: t('dashboard.tab_favorites'), icon: Heart },
                { id: 'profile', label: t('dashboard.tab_profile'), icon: UserIcon },
                { id: 'settings', label: t('dashboard.tab_settings'), icon: Settings },
                { id: 'messages', label: t('dashboard.tab_messages'), icon: MessageSquare },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-arabic font-medium text-sm transition-all ${
                    tab === t.id
                      ? 'bg-gold-500/20 text-gold-500 border border-gold-500/30'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}

              {user?.role === 'admin' && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <Link
                    to="/admin"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-arabic font-medium text-sm hover:bg-red-500/30 transition-all"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    {t('dashboard.admin_panel')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="font-arabic font-black text-white text-3xl">
                {t('dashboard.welcome')} <span className="shimmer-text">{user?.name?.split(' ')[0]}</span> 👋
              </h1>
              <div className="font-arabic text-white/50 mt-2 text-xs flex gap-4">
                <span>✨ {t('dashboard.register_date')} {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('dashboard.not_available')}</span>
                <span>🕒 {t('dashboard.last_login')} {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : t('dashboard.now')}</span>
              </div>
            </div>
            {tab === 'stories' && (
              <MagicButton id="dashboard-create-btn" onClick={handleStartStory} icon={<Plus className="w-4 h-4" />}>
                {t('dashboard.new_story')}
              </MagicButton>
            )}
          </div>

          {/* Tab Content */}
          <div className="glass-card p-6 min-h-[400px]">
            {isFetching && (tab === 'stories' || tab === 'orders') ? (
              <div className="text-center py-16">
                <div className="book-loader mx-auto mb-4" />
                <p className="font-arabic text-white/50 text-sm">{t('dashboard.loading')}</p>
              </div>
            ) : tab === 'stories' ? (
              <>
                {stories.length === 0 ? (
                  <EmptyState emoji="📖" title={t('dashboard.empty_stories_title')} desc={t('dashboard.empty_stories_desc')} cta={t('dashboard.empty_stories_cta')} onClick={handleStartStory} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {stories.map((story) => {
                      const status = statusMap[story.status] || statusMap.draft;
                      return (
                        <div key={story._id} className="relative bg-dark-700/50 rounded-2xl border border-white/5 p-5 hover:-translate-y-1 transition-transform group flex flex-col">
                          <button
                            type="button"
                            onClick={() => handleDeleteStory(story._id, story.childName)}
                            aria-label={t('dashboard.delete_story', 'حذف القصة')}
                            title={t('dashboard.delete_story', 'حذف القصة')}
                            className="absolute top-3 z-10 ltr:right-3 rtl:left-3 w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📚</div>
                          <h3 className="font-arabic font-bold text-white text-lg mb-1">{story.childName}</h3>
                          <p className="font-arabic text-white/40 text-xs mb-3">{story.theme} • {new Date(story.createdAt).toLocaleDateString()}</p>
                          <div className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
                            <div className={`flex items-center gap-1.5 ${status.color} bg-white/5 px-2.5 py-1.5 rounded-lg`}>
                              <status.icon className="w-3.5 h-3.5" />
                              <span className="font-arabic text-xs font-bold">{status.label}</span>
                            </div>
                            <Link 
                              to={`/book/${story._id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500 text-dark-900 hover:bg-gold-400 transition-colors font-arabic font-bold text-xs shadow-lg shadow-gold-500/20"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              {t('dashboard.admin_special_btn')}
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : tab === 'orders' ? (
              orders.length === 0 ? (
                <EmptyState emoji="📦" title={t('dashboard.empty_orders_title')} desc={t('dashboard.empty_orders_desc')} cta={t('dashboard.empty_stories_cta')} onClick={handleStartStory} />
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order._id} className="bg-dark-700/50 rounded-2xl border border-white/5 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="text-3xl hidden sm:block">📦</div>
                      <div className="flex-1">
                        <p className="font-arabic font-bold text-white">
                          {t('dashboard.order_num')} <span className="text-gold-500 font-mono text-sm">{order._id.slice(-8).toUpperCase()}</span>
                        </p>
                        <p className="font-arabic text-white/50 text-xs mt-1">
                          {new Date(order.createdAt).toLocaleDateString()} · {order.totalPrice} ₪
                        </p>
                      </div>
                      {/* Book build status (after payment) */}
                      {order.paymentStatus === 'paid' && order.illustrationsStatus && order.illustrationsStatus !== 'ready' && (
                        <div className="self-start sm:self-center px-3 py-1 rounded-lg text-xs font-arabic font-bold bg-magic-500/20 text-magic-300 inline-flex items-center gap-1.5">
                          {order.illustrationsStatus !== 'failed' && <span className="w-2.5 h-2.5 rounded-full border-2 border-magic-300 border-t-transparent animate-spin" />}
                          {order.illustrationsStatus === 'failed' ? t('dashboard.order_failed', 'مشكلة في الإنشاء') : t('dashboard.order_preparing', 'قيد التحضير...')}
                        </div>
                      )}
                      <div className={`self-start sm:self-center px-3 py-1 rounded-lg text-xs font-arabic font-bold ${order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-gold-500/20 text-gold-500'}`}>
                        {order.paymentStatus === 'paid' ? t('dashboard.paid') : t('dashboard.pending')}
                      </div>
                      {/* View the finished book */}
                      {order.illustrationsStatus === 'ready' && (typeof order.storyId === 'object' ? order.storyId?._id : order.storyId) && (
                        <Link
                          to={`/book/${typeof order.storyId === 'object' ? order.storyId?._id : order.storyId}`}
                          className="self-start sm:self-center px-4 py-2 rounded-xl bg-gold-500 text-[#0a1628] font-arabic font-bold text-sm hover:bg-gold-400 transition whitespace-nowrap"
                        >
                          📖 {t('dashboard.view_book', 'تصفّح الكتاب')}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : tab === 'favorites' ? (
              favoriteStories.length === 0 ? (
                <EmptyState emoji="❤️" title={t('dashboard.empty_favorites_title')} desc={t('dashboard.empty_favorites_desc')} cta={t('dashboard.empty_stories_cta')} onClick={() => navigate('/stories')} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {favoriteStories.map((story) => (
                    <Link to="/stories" key={story.id} className="bg-dark-700/50 rounded-2xl border border-white/5 p-5 hover:-translate-y-1 transition-transform group">
                      <div className="text-4xl mb-3 group-hover:animate-bounce-slow transition-all">{story.emoji}</div>
                      <h3 className="font-arabic font-bold text-white text-lg mb-1">{t('stories_page.story_title', { name: t(`stories_page.samples.${story.id}_name`, { defaultValue: story.childName }) })}</h3>
                      <p className="font-arabic text-gold-500 text-xs">{t(`step2.theme_${story.theme}`)}</p>
                    </Link>
                  ))}
                </div>
              )
            ) : tab === 'profile' ? (
              <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Personal Info */}
                <div>
                  <h2 className="font-arabic font-bold text-xl text-white mb-6 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-gold-500" /> {t('dashboard.personal_info')}
                  </h2>
                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">{t('dashboard.label_name')}</label>
                      <input type="text" className="magic-input w-full" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">{t('dashboard.label_email')}</label>
                      <input type="email" dir="ltr" className="magic-input w-full" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">{t('dashboard.label_phone')}</label>
                      <input type="tel" dir="ltr" className="magic-input w-full" placeholder="+966 5X XXX XXXX" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />
                    </div>
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">{t('dashboard.label_location')}</label>
                      <input type="text" className="magic-input w-full" value={profileForm.location} onChange={e => setProfileForm({...profileForm, location: e.target.value})} />
                    </div>
                    <MagicButton type="submit" isLoading={isSavingProfile} className="mt-4">{t('dashboard.save_changes')}</MagicButton>
                  </form>
                </div>

                {/* Change Password */}
                <div className="pt-8 md:pt-0 md:border-r border-white/10 md:pr-12">
                  <h2 className="font-arabic font-bold text-xl text-white mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gold-500" /> {t('dashboard.change_password_title')}
                  </h2>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">{t('dashboard.current_password')}</label>
                      <input type="password" dir="ltr" className="magic-input w-full" value={passForm.currentPassword} onChange={e => setPassForm({...passForm, currentPassword: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">{t('dashboard.new_password')}</label>
                      <input type="password" dir="ltr" className="magic-input w-full" placeholder="******" value={passForm.newPassword} onChange={e => setPassForm({...passForm, newPassword: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">{t('dashboard.confirm_new_password')}</label>
                      <input type="password" dir="ltr" className="magic-input w-full" value={passForm.confirmPassword} onChange={e => setPassForm({...passForm, confirmPassword: e.target.value})} required />
                    </div>
                    <MagicButton type="submit" isLoading={isSavingPass} className="mt-4">{t('dashboard.update_password')}</MagicButton>
                  </form>
                </div>
              </div>
            ) : tab === 'settings' ? (
              <div className="max-w-2xl">
                <h2 className="font-arabic font-bold text-xl text-white mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-gold-500" /> {t('dashboard.settings_title')}
                </h2>
                <p className="font-arabic text-white/50 text-sm mb-8">{t('dashboard.settings_desc')}</p>

                <div className="space-y-6">
                  {/* Account Deletion Section */}
                  <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-arabic font-bold text-red-500 text-lg mb-2">
                          {t('dashboard.delete_account_title')}
                        </h3>
                        <p className="font-arabic text-white/50 text-sm leading-relaxed mb-6">
                          {t('dashboard.delete_account_desc')}
                        </p>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500 text-white font-arabic font-bold text-sm hover:bg-red-600 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          {t('dashboard.delete_account_btn')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : tab === 'messages' ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="font-arabic font-bold text-white text-lg">{t('dashboard.messages_title')}</h3>
                <p className="font-arabic text-white/50 text-sm mt-2">{t('dashboard.messages_desc')}</p>
              </div>
            ) : null}
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-md glass-card p-8 border-red-500/30 animate-scale-in">
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/5 text-white/50 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="font-arabic font-black text-white text-2xl mb-2">
                {t('dashboard.delete_account_title')}
              </h2>
              <p className="font-arabic text-white/50 text-sm">
                {t('dashboard.delete_account_desc')}
              </p>
            </div>

            <div className="space-y-4">
              <p className="font-arabic text-white/70 text-sm text-center">
                {t('dashboard.delete_confirm_instruction', { word: 'DELETE' })}
              </p>
              <input
                type="text"
                dir="ltr"
                className="magic-input w-full text-center font-bold tracking-widest placeholder:tracking-normal placeholder:font-normal"
                placeholder="DELETE"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
              />
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className="w-full py-4 rounded-xl bg-red-500 text-white font-arabic font-bold text-lg hover:bg-red-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
              >
                {isDeleting ? t('dashboard.loading') : t('dashboard.delete_account_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ emoji, title, desc, cta, onClick }: any) {
  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">{emoji}</div>
      <h3 className="font-arabic font-bold text-white text-xl mb-2">{title}</h3>
      <p className="font-arabic text-white/50 text-sm mb-6">{desc}</p>
      <MagicButton size="lg" onClick={onClick}>{cta}</MagicButton>
    </div>
  );
}


