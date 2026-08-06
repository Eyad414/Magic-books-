import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStoryProgress } from '../context/StoryProgressContext';
import { storyApi } from '../api/storyApi';
import { orderApi } from '../api/orderApi';
import { userApi } from '../api/userApi';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Package, Plus, Clock, CheckCircle, Sparkles, User as UserIcon, Lock, Settings, ShieldAlert, Heart, Trash2, AlertTriangle, X, Eye, MapPin, Phone, Palette } from 'lucide-react';
import MagicButton from '../components/common/MagicButton';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { localizeName } from '../utils/translit';
import { SHOWCASE_CARDS } from '../data/showcaseCards';
import { loadFavorites } from '../utils/favorites';

// What each book package unlocks for the customer. Pro = everything.
const PACKAGE_INCLUDES: Record<string, string[]> = {
  color: ['story'],
  coloring: ['coloring'],
  ebook: ['ebook'],
  audio: ['audio'],
  pro: ['story', 'coloring', 'ebook', 'audio'],
};
const INCLUDE_META: Record<string, { emoji: string; key: string; fallback: string }> = {
  story: { emoji: '📖', key: 'dashboard.incl_story', fallback: 'القصة' },
  coloring: { emoji: '🖍️', key: 'dashboard.incl_coloring', fallback: 'كتاب تلوين' },
  ebook: { emoji: '📱', key: 'dashboard.incl_ebook', fallback: 'نسخة رقمية' },
  audio: { emoji: '🎧', key: 'dashboard.incl_audio', fallback: 'صوتي (قريباً)' },
};

export default function Dashboard() {
  const { user, isAuthenticated, isLoading, updateUser, logout } = useAuth();
  const { resetProgress } = useStoryProgress();
  const navigate = useNavigate();
  const [stories, setStories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [tab, setTab] = useState<'stories' | 'orders' | 'favorites' | 'profile' | 'settings'>('stories');
  const [detailsOrder, setDetailsOrder] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(true);
  const { t, i18n } = useTranslation();

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
      
      // Scoped to THIS account — a fresh account must never inherit the
      // favourites of whoever used the browser before.
      setFavoriteIds(loadFavorites(user?.id));
    }
  }, [isAuthenticated, user?.id]);

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

  const favoriteStories = SHOWCASE_CARDS.filter((card) => favoriteIds.includes(card.key));

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
                          {/* What this package unlocks (Pro = all). */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {(PACKAGE_INCLUDES[story.bookPackage || 'color'] || ['story']).map((inc) => {
                              const meta = INCLUDE_META[inc];
                              return (
                                <span key={inc} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70 font-arabic text-[10px] font-bold">
                                  <span aria-hidden="true">{meta.emoji}</span>{t(meta.key, meta.fallback)}
                                </span>
                              );
                            })}
                          </div>
                          <div className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
                            <div className={`flex items-center gap-1.5 ${status.color} bg-white/5 px-2.5 py-1.5 rounded-lg`}>
                              <status.icon className="w-3.5 h-3.5" />
                              <span className="font-arabic text-xs font-bold">{status.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Pro bundle: the bundled coloring book (if generated). */}
                              {story.coloringImages?.length ? (
                                <Link
                                  to={`/book/${story._id}?view=coloring`}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors font-arabic font-bold text-xs"
                                >
                                  <span aria-hidden="true">🖍️</span>
                                  {t('dashboard.coloring_book', 'كتاب التلوين')}
                                </Link>
                              ) : null}
                              <Link
                                to={`/book/${story._id}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500 text-dark-900 hover:bg-gold-400 transition-colors font-arabic font-bold text-xs shadow-lg shadow-gold-500/20"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                {t('dashboard.read_story', 'اقرأ القصة')}
                              </Link>
                            </div>
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
                        <StatusBadge
                          tone={order.illustrationsStatus === 'failed' ? 'red' : 'magic'}
                          icon={order.illustrationsStatus === 'failed' ? undefined : Clock}
                          spin={order.illustrationsStatus !== 'failed'}
                          className="self-start sm:self-center"
                        >
                          {order.illustrationsStatus === 'failed' ? t('dashboard.order_failed', 'مشكلة في الإنشاء') : t('dashboard.order_preparing', 'قيد التحضير...')}
                        </StatusBadge>
                      )}
                      <StatusBadge tone={order.paymentStatus === 'paid' ? 'green' : 'gold'} className="self-start sm:self-center">
                        {order.paymentStatus === 'paid' ? t('dashboard.paid') : t('dashboard.pending')}
                      </StatusBadge>
                      {/* Order details — always available */}
                      <button
                        onClick={() => setDetailsOrder(order)}
                        className="self-start sm:self-center inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 font-arabic font-bold text-sm hover:bg-white/10 hover:border-gold-500/40 hover:text-gold-400 transition whitespace-nowrap"
                      >
                        <Eye className="w-4 h-4" /> {t('dashboard.details_btn', 'التفاصيل')}
                      </button>
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
                  {favoriteStories.map((card) => (
                    <Link to="/stories" key={card.key} className="bg-dark-700/50 rounded-2xl border border-white/5 p-5 hover:-translate-y-1 transition-transform group">
                      <div className="text-4xl mb-3 group-hover:animate-bounce-slow transition-all">{card.emoji}</div>
                      <h3 className="font-arabic font-bold text-white text-lg mb-1">{localizeName(card.name, i18n.language)}</h3>
                      <p className="font-arabic text-gold-500 text-xs">{t(`step2.theme_${card.themeId}`)}</p>
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
            ) : null}
          </div>
        </div>

      </div>

      {/* Order details modal */}
      {detailsOrder && (
        <Modal onClose={() => setDetailsOrder(null)} size="max-w-lg">
          {(() => {
            const o = detailsOrder;
            const story = typeof o.storyId === 'object' && o.storyId ? o.storyId : null;
            const sh = o.shippingAddress || {};
            const paid = o.paymentStatus === 'paid';
            const themeLabel = story?.theme ? (t(`step2.theme_${story.theme}`, { defaultValue: story.theme }) as string) : '—';
            const pkgLabel = o.bookPackage ? (t(`step3.pkg_${o.bookPackage}`, { defaultValue: o.bookPackage }) as string) : '—';
            const Row = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) => (
              <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
                <Icon className="w-4 h-4 text-gold-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-arabic text-white/40 text-xs">{label}</div>
                  <div className="font-arabic text-white text-sm font-bold break-words">{value || '—'}</div>
                </div>
              </div>
            );
            return (
              <>
                <h3 className="font-arabic font-black text-white text-xl mb-3 pr-10">📦 {t('dashboard.order_details', 'تفاصيل الطلب')}</h3>
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <span className="font-mono text-gold-500 text-sm bg-gold-500/10 px-2 py-0.5 rounded">#{o._id.slice(-8).toUpperCase()}</span>
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-arabic font-bold ${paid ? 'bg-green-500/20 text-green-400' : 'bg-gold-500/20 text-gold-500'}`}>
                    {paid ? t('dashboard.paid') : t('dashboard.pending')}
                  </span>
                  {paid && o.illustrationsStatus && o.illustrationsStatus !== 'ready' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-arabic font-bold bg-magic-500/20 text-magic-300">
                      {o.illustrationsStatus === 'failed' ? t('dashboard.order_failed', 'مشكلة في الإنشاء') : t('dashboard.order_preparing', 'قيد التحضير...')}
                    </span>
                  )}
                  {o.illustrationsStatus === 'ready' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-arabic font-bold bg-green-500/20 text-green-400">✅ {t('dashboard.order_ready', 'جاهز')}</span>
                  )}
                </div>

                <div className="rounded-xl bg-white/5 border border-white/10 px-4 mb-4">
                  <Row icon={UserIcon} label={t('dashboard.child', 'الطفل')} value={story?.childName ? localizeName(story.childName, i18n.language) : undefined} />
                  <Row icon={Sparkles} label={t('dashboard.theme', 'الموضوع')} value={themeLabel} />
                  <Row icon={Palette} label={t('dashboard.package', 'الباقة')} value={pkgLabel} />
                  <Row icon={Package} label={t('dashboard.total', 'الإجمالي')} value={`${o.totalPrice} ₪`} />
                  <Row icon={Clock} label={t('dashboard.order_date_label', 'تاريخ الطلب')} value={new Date(o.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : i18n.language === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })} />
                </div>

                <h4 className="font-arabic text-white/50 text-xs mb-2">{sh.deliveryMethod === 'pickup' ? t('dashboard.pickup', 'الاستلام') : t('dashboard.shipping', 'الشحن')}</h4>
                <div className="rounded-xl bg-white/5 border border-white/10 px-4">
                  {sh.deliveryMethod === 'pickup' ? (
                    <Row icon={MapPin} label={t('dashboard.pickup_location', 'نقطة الاستلام')} value={sh.pickupLocation} />
                  ) : (
                    <>
                      <Row icon={UserIcon} label={t('dashboard.recipient', 'المستلم')} value={sh.fullName} />
                      <Row icon={Phone} label={t('dashboard.phone', 'الهاتف')} value={sh.phone} />
                      <Row icon={MapPin} label={t('dashboard.address', 'العنوان')} value={[sh.city, sh.district, sh.street, sh.buildingNo].filter(Boolean).join('، ')} />
                    </>
                  )}
                </div>

                {o.illustrationsStatus === 'ready' && story?._id && (
                  <Link to={`/book/${story._id}`} onClick={() => setDetailsOrder(null)} className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gold-500 text-[#0a1628] font-arabic font-bold hover:bg-gold-400 transition">
                    📖 {t('dashboard.view_book', 'تصفّح الكتاب')}
                  </Link>
                )}
              </>
            );
          })()}
        </Modal>
      )}

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


