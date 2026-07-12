import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api/adminApi';
import { uploadApi } from '../api/uploadApi';
import { objectPathToUrl } from '../api/mediaUrl';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Users, Settings, BookOpen, UserPlus, Eye, Package, Clock, CheckCircle, Trash2, Download, RefreshCw, Mail } from 'lucide-react';
import MagicButton from '../components/common/MagicButton';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { findStory } from '../data/stories';
import { SHOWCASE_CARDS } from '../data/showcaseCards';
import { localizeName } from '../utils/translit';

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'team' | 'pricing' | 'stories' | 'orders' | 'showcase' | 'messages'>('orders');
  const [team, setTeam] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  // New Admin Form
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  // Story Editor — separate draft state so we never corrupt settings while editing
  const [editingStory, setEditingStory] = useState<number | null>(null);
  const [draftPages, setDraftPages] = useState<{ text: string; imageSrc: string }[]>([]);

  // Which theme id is currently generating AI preview photos (for the spinner).
  const [generatingThemeId, setGeneratingThemeId] = useState<string | null>(null);
  // Which order id is currently being built/sent to print (for the spinner).
  const [buildingOrderId, setBuildingOrderId] = useState<string | null>(null);
  // Which order id is currently re-rendering its print files (for the spinner).
  const [rerenderingOrderId, setRerenderingOrderId] = useState<string | null>(null);
  // Which order's Pro coloring book is currently rebuilding/sending (spinner).
  const [coloringBusyId, setColoringBusyId] = useState<string | null>(null);

  // Admin: build the book + print files and send to BookPod. Generates ~15
  // images (costs money), so confirm first. markPaid fulfils cash/COD orders.
  const handleSendToBookPod = async (order: any) => {
    if (buildingOrderId) return;
    const already = order.illustrationsStatus === 'ready';
    const msg = already
      ? t('admin.confirm_resend', 'إعادة إرسال هذا الطلب إلى BookPod للطباعة؟')
      : t('admin.confirm_build', 'بناء الكتاب وإرساله إلى BookPod؟ سيتم توليد صور الكتاب (تكلفة على واجهة الذكاء الاصطناعي).');
    if (!window.confirm(msg)) return;
    setBuildingOrderId(order._id);
    const toastId = toast.loading(t('admin.sending_to_print', 'جاري بناء الكتاب وإرساله للطباعة... (قد يستغرق عدة دقائق)'));
    try {
      const res = await adminApi.buildOrder(order._id, { markPaid: true });
      if (res.success) {
        const jobId = res.order?.bookpodJobId;
        toast.success(
          jobId
            ? `${t('admin.sent_to_bookpod_ok', 'تم الإرسال إلى BookPod للطباعة ✅')} (#${jobId})`
            : t('admin.sent_to_print', 'تم بناء الكتاب وتجهيزه للطباعة ✅'),
          { id: toastId }
        );
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...res.order } : o)));
      } else {
        toast.error(res.message || t('admin.send_failed', 'فشل الإرسال للطباعة'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.send_failed', 'فشل الإرسال للطباعة'), { id: toastId });
    } finally {
      setBuildingOrderId(null);
    }
  };

  // Admin: rebuild the print PDFs from the order's already-generated images.
  // Free (no AI cost) and never re-submits to BookPod — used to bring an older
  // order up to the current print layout.
  const handleReRenderFiles = async (order: any) => {
    if (rerenderingOrderId || buildingOrderId) return;
    if (!window.confirm(t('admin.confirm_rerender', 'إعادة تجهيز ملفات الطباعة بالتصميم الجديد؟ (مجاني — بدون توليد صور جديدة)'))) return;
    setRerenderingOrderId(order._id);
    const toastId = toast.loading(t('admin.rerendering', 'جاري إعادة تجهيز ملفات الطباعة...'));
    try {
      const res = await adminApi.reRenderOrderFiles(order._id);
      if (res.success) {
        toast.success(t('admin.rerendered', 'تم تحديث ملفات الطباعة بالتصميم الجديد ✅'), { id: toastId });
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...res.order } : o)));
      } else {
        toast.error(res.message || t('admin.rerender_failed', 'فشل إعادة التجهيز'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.rerender_failed', 'فشل إعادة التجهيز'), { id: toastId });
    } finally {
      setRerenderingOrderId(null);
    }
  };

  // Pro bundle: rebuild the coloring book's print files (free — no generation).
  const handleReRenderColoring = async (order: any) => {
    if (coloringBusyId) return;
    if (!window.confirm(t('admin.confirm_rerender', 'إعادة تجهيز ملفات الطباعة بالتصميم الجديد؟ (مجاني — بدون توليد صور جديدة)'))) return;
    setColoringBusyId(order._id);
    const toastId = toast.loading(t('admin.coloring_rerendering', 'جاري إعادة تجهيز كتاب التلوين...'));
    try {
      const res = await adminApi.reRenderOrderColoring(order._id);
      if (res.success) {
        toast.success(t('admin.rerendered', 'تم تحديث ملفات الطباعة بالتصميم الجديد ✅'), { id: toastId });
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...res.order } : o)));
      } else {
        toast.error(res.message || t('admin.rerender_failed', 'فشل إعادة التجهيز'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.rerender_failed', 'فشل إعادة التجهيز'), { id: toastId });
    } finally {
      setColoringBusyId(null);
    }
  };

  // Pro bundle: submit the coloring book to BookPod (a separate, billable print job).
  const handleSubmitColoring = async (order: any) => {
    if (coloringBusyId) return;
    if (!window.confirm(t('admin.confirm_submit_coloring', 'إرسال كتاب التلوين إلى BookPod للطباعة؟ (طباعة حقيقية ومدفوعة — كتاب إضافي)'))) return;
    setColoringBusyId(order._id);
    const toastId = toast.loading(t('admin.coloring_sending', 'جاري إرسال كتاب التلوين إلى BookPod...'));
    try {
      const res = await adminApi.submitOrderColoring(order._id);
      if (res.success) {
        toast.success(t('admin.coloring_sent', 'تم إرسال كتاب التلوين إلى BookPod ✅'), { id: toastId });
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...res.order } : o)));
      } else {
        toast.error(res.message || t('admin.send_failed', 'فشل الإرسال للطباعة'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.send_failed', 'فشل الإرسال للطباعة'), { id: toastId });
    } finally {
      setColoringBusyId(null);
    }
  };

  // Admin-only: download the print-ready files (cover + interior PDFs) so they
  // can be archived or sent to a print shop manually.
  const handleSaveFolder = (order: any, kind: 'story' | 'coloring' = 'story') => {
    // Rebuild the link from the stored object path so old localhost-based URLs
    // (built before RENDER_EXTERNAL_URL) still resolve against the live API.
    const fixUrl = (url?: string): string | undefined => {
      if (!url) return url;
      try {
        const p = new URL(url, window.location.origin).searchParams.get('path');
        return p ? objectPathToUrl(p) : url;
      } catch { return url; }
    };
    const isColoring = kind === 'coloring';
    const coverUrl = isColoring ? order.coloringPrintCoverUrl : order.printCoverUrl;
    const interiorUrl = isColoring ? order.coloringPrintInteriorUrl : order.printInteriorUrl;
    const suffix = isColoring ? '-coloring' : '';
    const files = [
      { url: fixUrl(coverUrl), name: `order-${order._id.slice(-8)}${suffix}-cover.pdf` },
      { url: fixUrl(interiorUrl), name: `order-${order._id.slice(-8)}${suffix}-interior.pdf` },
    ].filter((f): f is { url: string; name: string } => !!f.url);
    if (files.length === 0) {
      toast.error(t('admin.no_files_yet', 'لا توجد ملفات بعد — أرسل الطلب للطباعة أولاً'));
      return;
    }
    files.forEach((f) => {
      const a = document.createElement('a');
      a.href = f.url;
      a.download = f.name;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    toast.success(t('admin.files_downloading', 'جاري تنزيل ملفات الطباعة 📁'));
  };

  const handleGeneratePhotoreal = async (themeId: string) => {
    setGeneratingThemeId(themeId);
    const toastId = toast.loading('📸 توليد قوالب واقعية + تبديل الوجه... (قد يستغرق عدة دقائق)');
    try {
      const res = await adminApi.generateThemePhotoreal(themeId);
      if (res.success) {
        toast.success(`تم (نمط واقعي) ✨ — ${res.swaps} تبديل، التكلفة ~$${res.estimatedCostUsd ?? 0}`, { id: toastId });
        setSettings((prev: any) => {
          if (!prev) return prev;
          const themes = prev.themes.map((th: any) =>
            th.id === themeId
              ? { ...th, generatedImages: res.generatedImages, generatedPortrait: res.generatedPortrait, generatedCover: res.generatedCover, previewStyle: 'photoreal' }
              : th
          );
          return { ...prev, themes };
        });
      } else {
        toast.error(res.message || 'فشل التوليد', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'فشل التوليد', { id: toastId });
    } finally {
      setGeneratingThemeId(null);
    }
  };

  const handleGenerateTheme = async (themeId: string, force = false) => {
    setGeneratingThemeId(themeId);
    const toastId = toast.loading('🎨 جاري توليد الصور بالذكاء الاصطناعي... (قد يستغرق دقيقتين)');
    try {
      const res = await adminApi.generateThemeIllustrations(themeId, { force });
      if (res.success) {
        const costMsg = res.cached
          ? 'تم تحميل الصور المحفوظة'
          : `تم توليد ${res.imageCount ?? ''} صورة ✨ (التكلفة ~$${res.estimatedCostUsd ?? '0'})`;
        toast.success(costMsg, { id: toastId });
        // Reflect the new images in local settings so the ✓ badge shows.
        setSettings((prev: any) => {
          if (!prev) return prev;
          const themes = prev.themes.map((th: any) =>
            th.id === themeId
              ? { ...th, generatedImages: res.generatedImages, generatedPortrait: res.generatedPortrait }
              : th
          );
          return { ...prev, themes };
        });
      } else {
        toast.error(res.message || 'فشل التوليد', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'فشل التوليد', { id: toastId });
    } finally {
      setGeneratingThemeId(null);
    }
  };

  // Coloring-book generation: per-theme reference photo + the typed scenes.
  const [coloringFiles, setColoringFiles] = useState<Record<string, File | null>>({});

  const handleGenerateColoring = async (theme: any) => {
    const scenes = (theme.coloringScenes || []).map((s: string) => (s || '').trim()).filter(Boolean);
    if (scenes.length < 1) { toast.error(t('admin.coloring_need_scenes', 'اكتب مشاهد الصفحات أولاً')); return; }
    if (!window.confirm(t('admin.coloring_cost_confirm', 'سيتم توليد ١٨ صورة (~$0.70). هل تريد المتابعة؟'))) return;
    setGeneratingThemeId(theme.id);
    const toastId = toast.loading('🎨 ' + t('admin.generating', 'جاري التوليد...'));
    try {
      let referencePhoto: string | undefined;
      const file = coloringFiles[theme.id];
      if (file) { const up = await uploadApi.childPhoto(file); referencePhoto = up.gcsUri; }
      const res = await adminApi.generateThemeColoring(theme.id, {
        coloringScenes: theme.coloringScenes || [],
        coloringCoverScene: theme.coloringCoverScene,
        coloringBackCoverScene: theme.coloringBackCoverScene,
        referencePhoto,
        childName: theme.label,
      });
      if (res.success) {
        toast.success(`✨ ${res.imageCount ?? ''} (~$${res.estimatedCostUsd ?? '0'})`, { id: toastId });
        setSettings((prev: any) => ({ ...prev, themes: prev.themes.map((th: any) => th.id === theme.id ? { ...th, generatedCover: res.generatedCover, generatedImages: res.generatedImages, generatedPortrait: res.generatedPortrait } : th) }));
      } else { toast.error(res.message || 'فشل التوليد', { id: toastId }); }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'فشل التوليد', { id: toastId });
    } finally {
      setGeneratingThemeId(null);
    }
  };

  // Helper to load default pages from the static story registry
  const loadDefaultPages = (themeId: string) => {
    const registryStory = findStory(themeId);
    if (registryStory) {
      const textPages = registryStory.pages.filter((p) => p.type === 'text');
      const imagePages = registryStory.pages.filter((p) => p.type === 'image');
      const len = Math.max(textPages.length, imagePages.length);
      const pages = [];
      for (let i = 0; i < len; i++) {
        pages.push({
          text: (textPages[i]?.text ?? '').replace(/\[NAME\]/g, '{{name}}'),
          imageSrc: imagePages[i]?.imageSrc ?? '',
        });
      }
      return pages;
    }
    return [];
  };

  // Open the editor: load pages from the DB. If DB is empty, pre-populate with default static pages!
  const openEditor = (index: number) => {
    const theme = settings.themes[index];
    let pages = [];
    if (theme.pages && theme.pages.length > 0) {
      pages = theme.pages.map((p: any) => ({ text: p.text || '', imageSrc: p.imageSrc || '' }));
    } else {
      pages = loadDefaultPages(theme.id);
    }
    setDraftPages(pages);
  };

  const deleteTheme = (index: number) => {
    if (window.confirm(t('admin.delete_confirm', 'هل أنت متأكد من رغبتك في حذف هذا الموضوع؟'))) {
      const newThemes = settings.themes.filter((_: any, idx: number) => idx !== index);
      setSettings({ ...settings, themes: newThemes });
      toast.success(t('admin.theme_deleted', 'تم حذف الموضوع بنجاح!'));
    }
  };

  const getLocalizedThemeLabel = (theme: any) => {
    const defaultArabicNames = ['مغامرة', 'مغامرة حديقة الحيوان', 'الفضاء', 'بطل المدرسة'];
    const isCustomized = theme.label && !defaultArabicNames.includes(theme.label);
    if (isCustomized) return theme.label;
    const key = `step2.theme_${theme.id}`;
    const translated = t(key);
    return translated !== key ? translated : theme.label;
  };

  const getLocalizedThemeDesc = (theme: any) => {
    const defaultArabicDescs = [
      'استكشاف ومغامرات مثيرة',
      'رحلة مثيرة بين الحيوانات اللطيفة',
      'رحلة بين النجوم والكواكب',
      'مساعدة الآخرين ونشر اللطف والألوان في المدرسة'
    ];
    const isCustomized = theme.desc && !defaultArabicDescs.includes(theme.desc);
    if (isCustomized) return theme.desc;
    const key = `step2.theme_${theme.id}_desc`;
    const translated = t(key);
    return translated !== key ? translated : theme.desc;
  };

  const getLocalizedPkgLabel = (pkg: any) => {
    const defaultArabicNames = ['قصة ملونة', 'دفتر تلوين', 'ملف صوتي (Audio)', 'نسخة رقمية (E-Book)', 'باقة Pro الشاملة'];
    const isCustomized = pkg.label && !defaultArabicNames.includes(pkg.label);
    if (isCustomized) return pkg.label;
    const key = `step3.pkg_${pkg.id}`;
    const translated = t(key);
    return translated !== key ? translated : pkg.label;
  };

  const getLocalizedPkgDesc = (pkg: any) => {
    const defaultArabicDescs = [
      'كتاب ملون بالكامل بجودة عالية',
      'رسومات غير ملونة جاهزة للتلوين',
      'تسجيل صوتي احترافي لقصتك',
      'كتاب إلكتروني للقراءة على الأجهزة',
      'جميع النسخ (الملون + التلوين + الصوتي + الرقمي)'
    ];
    const isCustomized = pkg.desc && !defaultArabicDescs.includes(pkg.desc);
    if (isCustomized) return pkg.desc;
    const key = `step3.pkg_${pkg.id}_desc`;
    const translated = t(key);
    return translated !== key ? translated : pkg.desc;
  };


  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated || user?.role !== 'admin') {
        navigate('/dashboard');
        toast.error(t('admin.unauthorized'));
      }
    }
  }, [isLoading, isAuthenticated, user, navigate]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchTeam();
      fetchSettings();
      fetchOrders();
      fetchMessages();
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

  const fetchOrders = async () => {
    try {
      const res = await adminApi.getAllOrders();
      if (res.success) setOrders(res.orders);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await adminApi.getMessages();
      if (res.success) setMessages(res.messages);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm(t('admin.confirm_delete_message', 'حذف هذه الرسالة؟'))) return;
    try {
      const res = await adminApi.deleteMessage(id);
      if (res.success) setMessages((prev) => prev.filter((m) => m._id !== id));
    } catch (err) {
      console.error(err);
      toast.error(t('admin.delete_failed', 'فشل الحذف'));
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingAdmin(true);
    try {
      const res = await adminApi.addAdmin({ email: adminForm.email });
      if (res.success) {
        toast.success(t('admin.add_admin_success'));
        setAdminForm({ name: '', email: '', password: '' });
        fetchTeam();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('admin.add_admin_fail'));
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (id: string, name: string) => {
    if (!window.confirm(t('admin.confirm_remove_admin', { name, defaultValue: `إزالة ${name} من فريق المشرفين؟` }))) return;
    try {
      const res = await adminApi.removeAdmin(id);
      if (res.success) {
        toast.success(t('admin.remove_admin_success', 'تمت الإزالة'));
        fetchTeam();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('admin.remove_admin_fail', 'فشل في الإزالة'));
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
      toast.error(t('admin.save_settings_fail'));
    }
  };

  if (isLoading || !settings) return <div className="min-h-screen pt-24 text-center text-white/50">{t('admin.loading')}</div>;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="glass-card p-4 sticky top-24 border-red-500/20">
            <h2 className="font-arabic font-bold text-red-400 mb-4 px-2 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> {t('admin.panel_title')}
            </h2>
            <div className="flex flex-col gap-2">
              {[
                { id: 'orders', label: t('admin.tab_orders'), icon: Package },
                { id: 'messages', label: t('admin.tab_messages', 'الرسائل'), icon: Mail },
                { id: 'showcase', label: t('admin.tab_showcase', 'الكتب الجاهزة'), icon: BookOpen },
                { id: 'stories', label: t('admin.tab_stories'), icon: BookOpen },
                { id: 'pricing', label: t('admin.tab_pricing'), icon: Settings },
                { id: 'team', label: t('admin.tab_team'), icon: Users },
              ].map((tItem) => (
                <button
                  key={tItem.id}
                  onClick={() => setTab(tItem.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-arabic font-medium text-sm transition-all ${
                    tab === tItem.id
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <tItem.icon className="w-4 h-4" />
                  {tItem.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="glass-card p-6 min-h-[500px]">
            {tab === 'orders' ? (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-arabic font-bold text-2xl text-white">{t('admin.orders_title')}</h2>
                  <MagicButton onClick={fetchOrders} size="sm" variant="outline">{t('admin.refresh_data')}</MagicButton>
                </div>

                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                      <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="font-arabic text-white/40">{t('admin.no_new_orders')}</p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div key={order._id} className="bg-dark-700/50 rounded-2xl border border-white/5 p-6 hover:border-gold-500/30 transition-all group">
                        <div className="flex flex-col lg:flex-row gap-6">
                          {/* Order Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="px-3 py-1 bg-gold-500/10 text-gold-500 rounded-lg text-xs font-bold font-mono">
                                #{order._id.slice(-8).toUpperCase()}
                              </div>
                              <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg ${
                                order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-gold-500/20 text-gold-500'
                              }`}>
                                {order.paymentStatus === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                {order.paymentStatus === 'paid' ? t('admin.paid') : t('admin.pending_payment')}
                              </div>
                              <div className="font-arabic text-white/40 text-xs italic">
                                {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-arabic text-white/50 text-xs mb-2">{t('admin.customer_info')}</h4>
                                <div className="font-arabic text-white font-bold">{order.userId?.name}</div>
                                <div className="text-white/40 text-sm font-sans">{order.userId?.email}</div>
                                <div className="text-white/40 text-sm font-sans">{order.shippingAddress?.phone}</div>
                              </div>
                              <div>
                                <h4 className="font-arabic text-white/50 text-xs mb-2">{t('admin.story_details')}</h4>
                                <div className="font-arabic text-gold-500 font-bold">{order.storyId?.childName || t('admin.no_name')}</div>
                                <div className="font-arabic text-white/60 text-sm">{t('admin.theme')} {order.storyId?.theme || '...'}</div>
                                <div className="font-arabic text-white/60 text-sm">{t('admin.amount')} {order.totalPrice} {order.currency}</div>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap lg:flex-col justify-center gap-3">
                            <Link
                              to={`/book/${order.storyId?._id}`}
                              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-dark-900 font-arabic font-bold text-sm hover:bg-gold-400 transition-all whitespace-nowrap shadow-lg shadow-gold-500/10"
                            >
                              <Eye className="w-4 h-4" />
                              {t('admin.view_story_review')}
                            </Link>
                            <button
                              onClick={() => handleSendToBookPod(order)}
                              disabled={buildingOrderId === order._id}
                              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-magic-500/20 text-magic-300 font-arabic font-bold text-sm hover:bg-magic-500/30 transition-all border border-magic-500/30 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {buildingOrderId === order._id ? (
                                <><Clock className="w-4 h-4 animate-spin" /> {t('admin.sending', 'جارٍ الإرسال...')}</>
                              ) : (
                                <><Package className="w-4 h-4" /> {t('admin.send_to_bookpod', 'إرسال إلى BookPod')}</>
                              )}
                            </button>
                            {/* Free re-render of print files from existing images */}
                            <button
                              onClick={() => handleReRenderFiles(order)}
                              disabled={order.illustrationsStatus !== 'ready' || rerenderingOrderId === order._id}
                              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/60 font-arabic font-bold text-sm hover:bg-white/10 transition-all border border-white/10 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {rerenderingOrderId === order._id ? (
                                <><RefreshCw className="w-4 h-4 animate-spin" /> {t('admin.rerendering_short', 'جارٍ التجهيز...')}</>
                              ) : (
                                <><RefreshCw className="w-4 h-4" /> {t('admin.rerender_files', 'إعادة تجهيز الملفات')}</>
                              )}
                            </button>
                            {/* Admin-only: download the print-ready files */}
                            <button
                              onClick={() => handleSaveFolder(order)}
                              disabled={!order.printInteriorUrl && !order.printCoverUrl}
                              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/60 font-arabic font-bold text-sm hover:bg-white/10 transition-all border border-white/10 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Download className="w-4 h-4" />
                              {t('admin.save_folder', 'حفظ الملفات')}
                            </button>

                            {/* PRO bundle: the coloring book — its own view / send / re-render / save */}
                            {order.storyId?.bookPackage === 'pro' && !!(order.storyId?.coloringImages?.length) && (
                              <div className="w-full mt-1 pt-3 border-t border-white/10 flex flex-wrap lg:flex-col justify-center gap-3">
                                <div className="w-full font-arabic text-white/50 text-xs font-bold text-center lg:text-right">🖍️ {t('admin.coloring_book', 'كتاب التلوين')}</div>
                                <Link
                                  to={`/book/${order.storyId?._id}?view=coloring`}
                                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gold-500 text-dark-900 font-arabic font-bold text-sm hover:bg-gold-400 transition-all whitespace-nowrap shadow-lg shadow-gold-500/10"
                                >
                                  <Eye className="w-4 h-4" />
                                  {t('admin.view_coloring', 'عرض كتاب التلوين')}
                                </Link>
                                <button
                                  onClick={() => handleSubmitColoring(order)}
                                  disabled={coloringBusyId === order._id}
                                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-magic-500/20 text-magic-300 font-arabic font-bold text-sm hover:bg-magic-500/30 transition-all border border-magic-500/30 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {coloringBusyId === order._id ? (
                                    <><Clock className="w-4 h-4 animate-spin" /> {t('admin.sending', 'جارٍ الإرسال...')}</>
                                  ) : (
                                    <><Package className="w-4 h-4" /> {t('admin.send_coloring', 'إرسال التلوين للطباعة')}</>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleReRenderColoring(order)}
                                  disabled={coloringBusyId === order._id}
                                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/60 font-arabic font-bold text-sm hover:bg-white/10 transition-all border border-white/10 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {coloringBusyId === order._id ? (
                                    <><RefreshCw className="w-4 h-4 animate-spin" /> {t('admin.rerendering_short', 'جارٍ التجهيز...')}</>
                                  ) : (
                                    <><RefreshCw className="w-4 h-4" /> {t('admin.rerender_files', 'إعادة تجهيز الملفات')}</>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleSaveFolder(order, 'coloring')}
                                  disabled={!order.coloringPrintInteriorUrl && !order.coloringPrintCoverUrl}
                                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/60 font-arabic font-bold text-sm hover:bg-white/10 transition-all border border-white/10 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Download className="w-4 h-4" />
                                  {t('admin.save_folder', 'حفظ الملفات')}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : tab === 'messages' ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-arabic font-bold text-white text-lg">✉️ {t('admin.tab_messages', 'الرسائل')}</h3>
                  <span className="font-arabic text-white/50 text-sm">{messages.length}</span>
                </div>
                {messages.length === 0 ? (
                  <p className="font-arabic text-white/50 text-sm py-10 text-center">{t('admin.no_messages', 'لا توجد رسائل بعد')}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((m) => (
                      <div key={m._id} className="bg-dark-700/50 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-arabic font-bold text-white text-sm">
                              {m.name}{m.subject ? <span className="text-gold-500"> · {m.subject}</span> : null}
                            </div>
                            <div className="font-arabic text-white/50 text-xs mt-0.5 flex flex-wrap gap-x-3">
                              <a href={`mailto:${m.email}`} className="hover:text-gold-500">{m.email}</a>
                              {m.phone ? <a href={`tel:${m.phone}`} className="hover:text-gold-500" dir="ltr">{m.phone}</a> : null}
                              {m.createdAt ? <span>{new Date(m.createdAt).toLocaleString()}</span> : null}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteMessage(m._id)} aria-label={t('admin.delete', 'حذف')} className="text-white/40 hover:text-red-400 shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="font-arabic text-white/80 text-sm mt-2 whitespace-pre-wrap leading-relaxed">{m.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : tab === 'team' ? (
              <div>
                <h2 className="font-arabic font-bold text-xl text-white mb-6">{t('admin.team_title')}</h2>
                
                <div className="bg-dark-700/50 p-5 rounded-2xl border border-white/5 mb-8">
                  <h3 className="font-arabic text-gold-500 font-bold mb-4 flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> {t('admin.add_new_admin')}
                  </h3>
                  {/* Promote an existing account to admin by email — no password
                      needed (they keep the one they signed up with). */}
                  <form onSubmit={handleAddAdmin} className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                    <div>
                      <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.email')}</label>
                      <input type="email" dir="ltr" className="magic-input w-full" placeholder="name@example.com" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} required />
                    </div>
                    <MagicButton type="submit" isLoading={isAddingAdmin}>{t('admin.add_admin_btn')}</MagicButton>
                  </form>
                  <p className="font-arabic text-white/40 text-xs mt-2">{t('admin.add_admin_hint', 'أدخل بريد شخص لديه حساب بالفعل، وسيصبح مشرفاً.')}</p>
                </div>

                <div className="space-y-3">
                  {team.map((admin) => (
                    <div key={admin._id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div>
                        <div className="font-arabic text-white font-bold">{admin.name}</div>
                        <div className="font-sans text-white/50 text-xs">{admin.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg">{t('admin.admin_role')}</div>
                        {String(admin._id) !== String((user as any)?.id) && (
                          <button
                            onClick={() => handleRemoveAdmin(admin._id, admin.name)}
                            title={t('admin.remove_admin', 'إزالة من الفريق')}
                            aria-label={t('admin.remove_admin', 'إزالة من الفريق')}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : tab === 'pricing' ? (
              <div>
                <h2 className="font-arabic font-bold text-xl text-white mb-6">{t('admin.pricing_title')}</h2>
                <div className="space-y-4">
                  {settings.bookPackages.map((pkg: any, index: number) => (
                    <div key={pkg.id} className="p-4 bg-white/5 rounded-xl border border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                      <div className="sm:col-span-1">
                        <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.name')}</label>
                        <input type="text" className="magic-input w-full" value={getLocalizedPkgLabel(pkg)} onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].label = e.target.value;
                          setSettings({...settings, bookPackages: newPkgs});
                        }} />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.price_sar')}</label>
                        <input type="number" className="magic-input w-full" value={pkg.price} onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].price = Number(e.target.value);
                          setSettings({...settings, bookPackages: newPkgs});
                        }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.description')}</label>
                        <input type="text" className="magic-input w-full" value={getLocalizedPkgDesc(pkg)} onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].desc = e.target.value;
                          setSettings({...settings, bookPackages: newPkgs});
                        }} />
                      </div>
                    </div>
                  ))}
                  <MagicButton onClick={() => saveSettings(settings)} className="mt-4">{t('admin.save_pricing')}</MagicButton>
                </div>
              </div>
            ) : tab === 'stories' ? (
              <div>
                <h2 className="font-arabic font-bold text-xl text-white mb-6">{t('admin.stories_title')}</h2>

                {/* ── Story books group (kept separate from coloring books) ── */}
                <h3 className="font-arabic font-bold text-lg text-white mb-1">
                  📚 {t('admin.story_books_title', 'القصص')}
                  <span className="text-white/40 text-sm font-normal mr-2">({settings.themes.filter((th: any) => !th.isColoring).length})</span>
                </h3>
                <p className="font-arabic text-white/50 text-sm mb-6">{t('admin.story_books_desc', 'قصص كاملة بالنص والصور (٣٤ صفحة)')}</p>
                <div className="space-y-4">
                  {settings.themes.map((theme: any, index: number) => theme.isColoring ? null : (
                    <div key={theme.id} className="p-4 bg-white/5 rounded-xl border border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                      <div className="sm:col-span-1">
                        <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.name')}</label>
                        <input type="text" className="magic-input w-full" value={getLocalizedThemeLabel(theme)} onChange={(e) => {
                          const newThemes = [...settings.themes];
                          newThemes[index].label = e.target.value;
                          setSettings({...settings, themes: newThemes});
                        }} />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.emoji_icon')}</label>
                        <input type="text" className="magic-input w-full text-center" value={theme.emoji} onChange={(e) => {
                          const newThemes = [...settings.themes];
                          newThemes[index].emoji = e.target.value;
                          setSettings({...settings, themes: newThemes});
                        }} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.description')}</label>
                        <input type="text" className="magic-input w-full" value={getLocalizedThemeDesc(theme)} onChange={(e) => {
                          const newThemes = [...settings.themes];
                          newThemes[index].desc = e.target.value;
                          setSettings({...settings, themes: newThemes});
                        }} />
                      </div>
                      <div className="sm:col-span-4 flex flex-wrap items-center gap-3 mt-2">
                        {/* Ready toggle — only `ready` themes appear in the customer wizard */}
                        <label
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-arabic text-sm cursor-pointer transition-colors border ${
                            theme.ready
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-white/60 border-white/10'
                          }`}
                          title={t('admin.ready_help', 'فعّل هذا الخيار لإظهار القصة للعملاء في خطوات الإنشاء')}
                        >
                          <input
                            type="checkbox"
                            className="accent-emerald-500"
                            checked={!!theme.ready}
                            onChange={(e) => {
                              const newThemes = [...settings.themes];
                              newThemes[index].ready = e.target.checked;
                              setSettings({ ...settings, themes: newThemes });
                            }}
                          />
                          {theme.ready
                            ? t('admin.ready_yes', 'جاهزة للعرض')
                            : t('admin.ready_no', 'مسودة (غير ظاهرة للعملاء)')}
                        </label>

                        {/* View the book — one clean language toggle instead of
                            several separate per-language buttons. */}
                        <div className="flex items-center gap-2 flex-wrap p-2 bg-white/5 rounded-xl border border-white/10">
                          <span className="flex items-center gap-1.5 text-white/70 font-arabic text-xs px-1">
                            <Eye className="w-4 h-4 text-gold-500" /> {t('admin.book_presentation', 'عرض الكتاب')}
                          </span>
                          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-dark-800 border border-white/10">
                            {[
                              { lng: 'ar', label: 'عربي', name: 'إياد' },
                              { lng: 'en', label: 'EN', name: 'Ahmad' },
                              { lng: 'he', label: 'עברית', name: 'עדי' },
                            ].map((o) => (
                              <Link
                                key={o.lng}
                                to={`/book/${theme.id}?name=${encodeURIComponent(o.name)}&lng=${o.lng}`}
                                target="_blank"
                                className="px-3 py-1.5 rounded-md text-xs font-bold text-white/70 hover:text-gold-500 hover:bg-white/5 transition-colors"
                              >
                                {o.label}
                              </Link>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => openEditor(index)}
                          className="flex items-center gap-2 px-4 py-2 bg-gold-500/20 hover:bg-gold-500/30 text-gold-500 rounded-xl font-arabic text-sm transition-colors border border-gold-500/30"
                        >
                          <BookOpen className="w-4 h-4" /> {t('admin.edit_content_story', 'تعديل محتوى القصة')}
                        </button>

                        {/* Generate AI photos */}
                        <button
                          onClick={() => handleGenerateTheme(theme.id, (theme.generatedImages?.length ?? 0) > 0)}
                          disabled={generatingThemeId === theme.id}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 rounded-xl font-arabic text-sm transition-colors border border-purple-500/30 disabled:opacity-50"
                          title={t('admin.generate_ai_help', 'توليد صور الذكاء الاصطناعي لهذه القصة')}
                        >
                          {generatingThemeId === theme.id
                            ? `⏳ ${t('admin.generating', 'جاري التوليد...')}`
                            : (theme.generatedImages?.length ?? 0) > 0
                              ? `✅ ${t('admin.regenerate_ai', 'إعادة توليد الصور')}`
                              : `🎨 ${t('admin.generate_ai', 'توليد صور AI')}`}
                        </button>

                        {/* Generate photoreal (face-swap) — Style B / Taletoons */}
                        <button
                          onClick={() => handleGeneratePhotoreal(theme.id)}
                          disabled={generatingThemeId === theme.id}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-xl font-arabic text-sm transition-colors border border-emerald-500/30 disabled:opacity-50"
                          title={t('admin.generate_photoreal_help', 'توليد قوالب واقعية وتبديل وجه الطفل (نمط Taletoons)')}
                        >
                          {theme.previewStyle === 'photoreal'
                            ? `📸 ${t('admin.regenerate_photoreal', 'إعادة النمط الواقعي')}`
                            : `📸 ${t('admin.generate_photoreal', 'نمط واقعي (تبديل الوجه)')}`}
                        </button>

                        <button 
                          onClick={() => deleteTheme(index)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-arabic text-sm transition-colors border border-red-500/30"
                          title={t('admin.delete_theme', 'حذف الموضوع')}
                        >
                          <Trash2 className="w-4 h-4" /> {t('admin.delete_theme', 'حذف الموضوع')}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => {
                     setSettings({
                       ...settings,
                       themes: [...settings.themes, { id: 'new_'+Date.now(), label: 'موضوع جديد', emoji: '✨', desc: 'وصف جديد', ready: false }]
                     })
                  }} className="text-gold-500 font-arabic text-sm hover:underline block mb-4">{t('admin.add_new_theme')}</button>
                  <MagicButton onClick={() => saveSettings(settings)}>{t('admin.save_themes')}</MagicButton>
                </div>

                {/* ── Coloring Books — kept SEPARATE from story themes ── */}
                {settings.themes.some((th: any) => th.isColoring) && (
                  <div className="mt-12 pt-8 border-t border-white/10">
                    <h2 className="font-arabic font-bold text-xl text-white mb-1">🖍️ {t('admin.coloring_books_title', 'كتب التلوين')}
                      <span className="text-white/40 text-sm font-normal mr-2">({settings.themes.filter((th: any) => th.isColoring).length})</span>
                    </h2>
                    <p className="font-arabic text-white/50 text-sm mb-6">{t('admin.coloring_books_desc', 'غلاف أمامي + ١٦ صفحة شخصيات + غلاف خلفي')}</p>
                    <div className="space-y-4">
                      {settings.themes.map((theme: any, index: number) => !theme.isColoring ? null : (
                        <div key={theme.id} className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                          <div className="sm:col-span-1">
                            <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.name')}</label>
                            <input type="text" className="magic-input w-full" value={theme.label} onChange={(e) => { const nt = [...settings.themes]; nt[index].label = e.target.value; setSettings({ ...settings, themes: nt }); }} />
                          </div>
                          <div className="sm:col-span-1">
                            <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.emoji_icon')}</label>
                            <input type="text" className="magic-input w-full text-center" value={theme.emoji} onChange={(e) => { const nt = [...settings.themes]; nt[index].emoji = e.target.value; setSettings({ ...settings, themes: nt }); }} />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.description')}</label>
                            <input type="text" className="magic-input w-full" value={theme.desc} onChange={(e) => { const nt = [...settings.themes]; nt[index].desc = e.target.value; setSettings({ ...settings, themes: nt }); }} />
                          </div>
                          {/* Scenes + reference photo for generating this coloring book */}
                          <div className="sm:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                            <div>
                              <label className="block font-arabic text-white/70 text-xs mb-1">{t('admin.coloring_scenes_label', 'مشاهد الصفحات (سطر لكل صفحة — ١٦ سطر)')}</label>
                              <textarea
                                rows={5}
                                dir="auto"
                                className="magic-input w-full text-sm leading-6"
                                placeholder={t('admin.coloring_scenes_ph', 'يركب الدراجة\nيبني المكعبات\n...')}
                                value={(theme.coloringScenes || []).join('\n')}
                                onChange={(e) => { const nt = [...settings.themes]; nt[index].coloringScenes = e.target.value.split('\n'); setSettings({ ...settings, themes: nt }); }}
                              />
                            </div>
                            <div className="space-y-2">
                              <input type="text" className="magic-input w-full text-sm" placeholder={t('admin.coloring_cover_ph', 'مشهد الغلاف الأمامي (مثال: يستكشف الحديقة)')} value={theme.coloringCoverScene || ''} onChange={(e) => { const nt = [...settings.themes]; nt[index].coloringCoverScene = e.target.value; setSettings({ ...settings, themes: nt }); }} />
                              <input type="text" className="magic-input w-full text-sm" placeholder={t('admin.coloring_back_ph', 'مشهد الغلاف الخلفي (مثال: يلوّح وداعاً)')} value={theme.coloringBackCoverScene || ''} onChange={(e) => { const nt = [...settings.themes]; nt[index].coloringBackCoverScene = e.target.value; setSettings({ ...settings, themes: nt }); }} />
                              <div>
                                <label className="block font-arabic text-white/60 text-xs mb-1">{t('admin.coloring_photo_label', 'صورة الطفل (مرجع)')}</label>
                                <input type="file" accept="image/*" className="text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500/20 file:text-amber-300 file:px-3 file:py-1" onChange={(e) => setColoringFiles((prev) => ({ ...prev, [theme.id]: e.target.files?.[0] || null }))} />
                              </div>
                            </div>
                          </div>

                          <div className="sm:col-span-4 flex flex-wrap items-center gap-3 mt-2">
                            <span className="font-arabic text-xs text-amber-300/80">{t('admin.coloring_pages_count', '{{count}} صفحة · غلاف أمامي وخلفي', { count: theme.generatedImages?.length ?? 0 })}</span>
                            <button
                              onClick={() => handleGenerateColoring(theme)}
                              disabled={generatingThemeId === theme.id}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600/80 hover:bg-purple-600 text-white rounded-xl font-arabic text-sm transition-colors disabled:opacity-50"
                            >
                              🎨 {generatingThemeId === theme.id ? t('admin.generating', 'جاري التوليد...') : t('admin.generate_coloring', 'توليد كتاب التلوين')}
                            </button>
                            <Link
                              to={`/coloring/${theme.id}?name=${i18n.language === 'en' ? 'Ahmad' : 'إياد'}`}
                              target="_blank"
                              className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 rounded-xl text-amber-300 font-arabic text-sm transition-colors border border-amber-500/30"
                            >
                              <Eye className="w-4 h-4" /> {t('admin.view_coloring', 'عرض كتاب التلوين')}
                            </Link>
                            <button
                              onClick={() => deleteTheme(index)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-arabic text-sm transition-colors border border-red-500/30"
                            >
                              <Trash2 className="w-4 h-4" /> {t('admin.delete_theme', 'حذف')}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => {
                      setSettings({
                        ...settings,
                        themes: [...settings.themes, { id: 'coloring_' + Date.now(), label: 'كتاب تلوين جديد', emoji: '🖍️', desc: 'كتاب تلوين جديد', ready: false, isColoring: true }]
                      })
                    }} className="text-amber-400 font-arabic text-sm hover:underline block mb-4 mt-4">{t('admin.add_new_theme')}</button>
                    <MagicButton onClick={() => saveSettings(settings)} className="mt-4">{t('admin.save_themes')}</MagicButton>
                  </div>
                )}
              </div>
            ) : tab === 'showcase' ? (
              <div>
                <h3 className="font-arabic font-bold text-white text-lg mb-2">📚 {t('admin.tab_showcase', 'الكتب الجاهزة')}</h3>
                <p className="font-arabic text-white/50 text-sm mb-5">{t('admin.showcase_desc', 'افتح أي كتاب لتنزيله (PDF) أو إرساله إلى BookPod للطباعة.')}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SHOWCASE_CARDS.map((card) => {
                    const isColoring = card.themeId.includes('coloring');
                    const href = isColoring
                      ? `/coloring/${card.themeId}?name=${encodeURIComponent(card.name)}`
                      : `/book/${card.themeId}?name=${encodeURIComponent(card.name)}&lng=ar${card.storyId ? `&pin=${card.storyId}` : ''}`;
                    return (
                      <div key={card.key} className="bg-dark-700/50 rounded-2xl border border-white/5 p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl">{card.emoji}</span>
                          <div>
                            <h4 className="font-arabic font-bold text-white">{localizeName(card.name, i18n.language)}</h4>
                            <p className="font-arabic text-gold-500 text-xs">{isColoring ? t('admin.coloring_book', 'كتاب تلوين') : t(`step2.theme_${card.themeId}`, card.themeId)}</p>
                          </div>
                        </div>
                        <Link to={href} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 text-[#0a1628] rounded-xl font-arabic font-bold text-sm hover:bg-gold-400 transition">
                          🖨️ {t('admin.open_to_print', 'افتح للطباعة / BookPod')}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

      </div>
      
      {/* Story Editor Modal */}
      {editingStory !== null && settings?.themes[editingStory] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-dark-900/90 backdrop-blur-sm" onClick={() => setEditingStory(null)} />
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-card p-8 border-gold-500/30 animate-scale-in">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-arabic font-black text-white text-2xl">
                تعديل قصة: {settings.themes[editingStory].label} {settings.themes[editingStory].emoji}
              </h2>
              <span className="text-white/40 text-sm font-arabic">{draftPages.length} صفحات</span>
            </div>

            <p className="font-arabic text-white/50 text-sm mb-6 bg-gold-500/10 border border-gold-500/20 rounded-xl px-4 py-3">
              💡 استخدم <code className="text-gold-400 font-mono">{'{{name}}'}</code> في النص وسيُستبدل باسم الطفل تلقائياً.
              {draftPages.length === 0 && <span className="block mt-1 text-white/40">إذا حفظت بصفحات فارغة، سيعرض الكتاب القصة الافتراضية الأصلية (الـ 32 صفحة).</span>}
            </p>

            {/* Pages List */}
            <div className="space-y-5">
              {draftPages.map((page, pIndex) => (
                <div key={pIndex} className="p-5 bg-white/5 rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-arabic font-bold text-gold-500">صفحة {pIndex + 1}</h4>
                    <button 
                      onClick={() => {
                        setDraftPages(prev => prev.filter((_, i) => i !== pIndex));
                      }}
                      className="text-red-400 text-xs hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      🗑 حذف الصفحة
                    </button>
                  </div>

                  {/* Text */}
                  <label className="block font-arabic text-white/60 text-xs mb-1">نص القصة</label>
                  <textarea
                    className="magic-input w-full min-h-[110px] mb-3 font-arabic leading-relaxed"
                    value={page.text}
                    onChange={(e) => {
                      const updated = [...draftPages];
                      updated[pIndex] = { ...updated[pIndex], text: e.target.value };
                      setDraftPages(updated);
                    }}
                    placeholder={`نص الصفحة ${pIndex + 1} — استخدم {{name}} لاسم الطفل`}
                  />

                  {/* Image URL */}
                  <label className="block font-arabic text-white/60 text-xs mb-1">رابط الصورة</label>
                  <input
                    type="text"
                    className="magic-input w-full font-mono text-sm"
                    dir="ltr"
                    value={page.imageSrc}
                    onChange={(e) => {
                      const updated = [...draftPages];
                      updated[pIndex] = { ...updated[pIndex], imageSrc: e.target.value };
                      setDraftPages(updated);
                    }}
                    placeholder="/images/story/page01.png  or  https://..."
                  />
                  {page.imageSrc && (
                    <img
                      src={page.imageSrc}
                      alt={`صفحة ${pIndex + 1}`}
                      className="mt-3 w-full max-h-48 object-cover rounded-xl opacity-80"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>
              ))}

              {draftPages.length === 0 && (
                <div className="text-center py-12 text-white/30 font-arabic">
                  لا توجد صفحات بعد. اضغط "إضافة صفحة" لتبدأ أو "استعادة القصة الافتراضية" بالأسفل.
                </div>
              )}
            </div>

            {/* Advanced Utilities Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  if (window.confirm("هل أنت متأكد من مسح وتفريغ كافة الصفحات؟ لن يتم مسح ملفات الكود، بل ستعود القصة للوضع الافتراضي عند الحفظ.")) {
                    setDraftPages([]);
                  }
                }}
                className="text-red-400 hover:text-red-300 text-sm font-arabic transition-colors flex items-center gap-1"
              >
                🗑 مسح كافة الصفحات وتفريغها
              </button>
              <button
                onClick={() => {
                  if (window.confirm("هل تريد استيراد جميع الصفحات الافتراضية للقصة الأصلية من الكود؟ سيؤدي ذلك لاستبدال تعديلاتك الحالية.")) {
                    const defaults = loadDefaultPages(settings.themes[editingStory].id);
                    setDraftPages(defaults);
                  }
                }}
                className="text-gold-500 hover:text-gold-400 text-sm font-arabic transition-colors flex items-center gap-1"
              >
                🔄 استيراد صفحات القصة الافتراضية (32 صفحة)
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-4 mt-6 pt-6 border-t border-white/10">
              <button
                onClick={() => {
                  setDraftPages(prev => [...prev, { text: '', imageSrc: '' }]);
                }}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white font-arabic hover:bg-white/10 transition-colors border border-white/10"
              >
                + إضافة صفحة جديدة
              </button>
              <button
                onClick={() => setEditingStory(null)}
                className="px-6 py-3 rounded-xl bg-white/5 text-white/50 font-arabic hover:bg-white/10 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  // Merge draft pages back into settings and save
                  const newThemes = settings.themes.map((t: any, i: number) =>
                    i === editingStory ? { ...t, pages: draftPages } : t
                  );
                  const newSettings = { ...settings, themes: newThemes };
                  saveSettings(newSettings);
                  setSettings(newSettings);
                  setEditingStory(null);
                }}
                className="flex-1 py-3 rounded-xl bg-gold-500 text-dark-900 font-bold font-arabic hover:bg-gold-400 transition-colors"
              >
                💾 حفظ الكل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
