import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../api/adminApi';
import { uploadApi } from '../api/uploadApi';
import { objectPathToUrl } from '../api/mediaUrl';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Users, Settings, BookOpen, UserPlus, Eye, Package, Clock, CheckCircle, Trash2, Download, RefreshCw, Mail, User, Phone, Sparkles } from 'lucide-react';
import MagicButton from '../components/common/MagicButton';
import Modal from '../components/common/Modal';
import ActionButton from '../components/common/ActionButton';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { findStory } from '../data/stories';
import { SHOWCASE_CARDS, demoOnHomePage, demoOnStoriesPage, HOME_TAGS, type DemoVisibility, type HomeTag } from '../data/showcaseCards';
import { seriesBadge, seriesCounts } from '../utils/series';
import { localizeName } from '../utils/translit';

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'team' | 'pricing' | 'stories' | 'orders' | 'showcase' | 'messages'>('orders');
  const [team, setTeam] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  // Every story ever generated — powers the "ready books" tab.
  const [allStories, setAllStories] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  // Live build progress per order id, driven by polling the background build.
  const [buildProgress, setBuildProgress] = useState<Record<string, { pct: number; stage: string }>>({});
  const [settings, setSettings] = useState<any>(null);
  // Customer profile modal (opened from a message).
  const [customer, setCustomer] = useState<any>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  
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
  // Which order's child gender is currently being toggled (boy/girl pill).
  const [genderUpdatingId, setGenderUpdatingId] = useState<string | null>(null);
  // Which order's Pro coloring book is currently rebuilding/sending (spinner).
  const [coloringBusyId, setColoringBusyId] = useState<string | null>(null);
  // Which order is currently being BUILT (generate + prepare, no BookPod send).
  const [buildOnlyId, setBuildOnlyId] = useState<string | null>(null);
  // Orders already built this session — their Build button stays "done" (locked)
  // so it can't be clicked again by accident.
  const [builtOrderIds, setBuiltOrderIds] = useState<Set<string>>(new Set());

  // Admin: build the book + print files and send to BookPod. Generates ~15
  // images (costs money), so confirm first. markPaid fulfils cash/COD orders.
  /**
   * Follow a background build to completion. The build no longer runs inside the
   * HTTP request (it was being killed mid-flight and surfacing as a CORS error),
   * so we poll its status and drive the progress bar from it.
   */
  const pollBuild = (orderId: string, toastId: string, successMsg: string): Promise<void> =>
    new Promise((resolve) => {
      const started = Date.now();
      const handle: { id: number | undefined } = { id: undefined };
      const stop = () => {
        if (handle.id) window.clearTimeout(handle.id);
        setBuildProgress((prev) => { const next = { ...prev }; delete next[orderId]; return next; });
      };
      const tick = async () => {
        try {
          const s = await adminApi.buildStatus(orderId);
          setBuildProgress((prev) => ({ ...prev, [orderId]: { pct: s.progress || 0, stage: s.stage || '' } }));
          if (s.status === 'ready') {
            toast.success(successMsg, { id: toastId });
            stop(); await fetchOrders(); resolve(); return;
          }
          if (s.status === 'failed') {
            toast.error(s.error || t('admin.build_failed', 'فشل بناء الكتاب'), { id: toastId });
            stop(); await fetchOrders(); resolve(); return;
          }
        } catch { /* transient network blip — keep polling */ }
        if (Date.now() - started > 20 * 60 * 1000) {
          toast.error(t('admin.build_timeout', 'انتهت مهلة المتابعة — حدّث الصفحة لمعرفة الحالة'), { id: toastId });
          stop(); resolve(); return;
        }
        handle.id = window.setTimeout(tick, 3000);
      };
      handle.id = window.setTimeout(tick, 1200);
    });

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
        setBuildProgress((prev) => ({ ...prev, [order._id]: { pct: 0, stage: '' } }));
        await pollBuild(order._id, toastId, t('admin.sent_to_print', 'تم بناء الكتاب وتجهيزه للطباعة ✅'));
      } else {
        toast.error(res.message || t('admin.send_failed', 'فشل الإرسال للطباعة'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.send_failed', 'فشل الإرسال للطباعة'), { id: toastId });
    } finally {
      setBuildingOrderId(null);
    }
  };

  // Admin: BUILD the book (generate images + prepare print files) WITHOUT
  // submitting to BookPod — so it can be reviewed before the billable send.
  const handleBuildOnly = async (order: any) => {
    if (buildOnlyId || buildingOrderId) return;
    const already = order.illustrationsStatus === 'ready';
    const msg = already
      ? t('admin.confirm_rebuild_files', 'الكتاب مبني بالفعل. أعد تجهيز ملفات الطباعة للمراجعة؟ (مجاني)')
      : t('admin.confirm_build_only', 'بناء الكتاب للمراجعة (توليد الصور + تجهيز الملفات) بدون الإرسال إلى BookPod؟ (تكلفة توليد على واجهة الذكاء الاصطناعي)');
    if (!window.confirm(msg)) return;
    setBuildOnlyId(order._id);
    const toastId = toast.loading(t('admin.building_only', 'جاري بناء الكتاب للمراجعة... (قد يستغرق عدة دقائق)'));
    try {
      const res = await adminApi.buildOrder(order._id, { markPaid: true, buildOnly: true });
      if (res.success) {
        setBuildProgress((prev) => ({ ...prev, [order._id]: { pct: 0, stage: '' } }));
        await pollBuild(order._id, toastId, t('admin.built_for_review', 'تم بناء الكتاب ✅ راجعه ثم أرسله إلى BookPod'));
        setBuiltOrderIds((prev) => new Set(prev).add(order._id));
      } else {
        toast.error(res.message || t('admin.build_failed', 'فشل بناء الكتاب'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.build_failed', 'فشل بناء الكتاب'), { id: toastId });
    } finally {
      setBuildOnlyId(null);
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
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...res.order, storyId: o.storyId } : o)));
      } else {
        toast.error(res.message || t('admin.rerender_failed', 'فشل إعادة التجهيز'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.rerender_failed', 'فشل إعادة التجهيز'), { id: toastId });
    } finally {
      setRerenderingOrderId(null);
    }
  };

  // Flip the child's stored gender (boy⇄girl) on the linked story, then the admin
  // re-renders to update the book text. Fixes an order saved with the wrong
  // gender (the wizard defaults to male) when the name isn't auto-detected.
  const handleToggleGender = async (order: any) => {
    const storyId = order.storyId?._id;
    if (!storyId || genderUpdatingId) return;
    const next = order.storyId?.childGender === 'female' ? 'male' : 'female';
    setGenderUpdatingId(order._id);
    try {
      await adminApi.updateStory(storyId, { childGender: next });
      setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, storyId: { ...o.storyId, childGender: next } } : o)));
      toast.success(
        (next === 'female'
          ? t('admin.gender_set_girl', 'تم التعيين: بنت 👧')
          : t('admin.gender_set_boy', 'تم التعيين: ولد 👦')) +
          ' — ' + t('admin.gender_rerender_hint', 'أعِد تجهيز الملفات لتحديث الكتاب')
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.gender_failed', 'فشل تغيير الجنس'));
    } finally {
      setGenderUpdatingId(null);
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
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...res.order, storyId: o.storyId } : o)));
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
        setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, ...res.order, storyId: o.storyId } : o)));
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
    setEditingStory(index); // open the editor modal (it only renders when this is non-null)
  };

  const deleteTheme = (index: number) => {
    if (window.confirm(t('admin.delete_confirm', 'هل أنت متأكد من رغبتك في حذف هذا الموضوع؟'))) {
      const newThemes = settings.themes.filter((_: any, idx: number) => idx !== index);
      setSettings({ ...settings, themes: newThemes });
      toast.success(t('admin.theme_deleted', 'تم حذف الموضوع بنجاح!'));
    }
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
      fetchAllStories();
    }
  }, [user]);

  const fetchAllStories = async () => {
    setStoriesLoading(true);
    try {
      const res = await adminApi.getAllStories();
      if (res.success) setAllStories(res.stories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setStoriesLoading(false);
    }
  };

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

  // Open the full customer profile for a message sender (account + books + messages).
  const openCustomer = async (email: string) => {
    if (!email) return;
    setCustomerLoading(true);
    setCustomer({ email }); // opens the modal with a loading state
    try {
      const res = await adminApi.getCustomer(email);
      if (res.success) setCustomer(res.customer);
      else { toast.error(t('admin.customer_load_failed', 'تعذّر تحميل بيانات العميل')); setCustomer(null); }
    } catch (err) {
      console.error(err);
      toast.error(t('admin.customer_load_failed', 'تعذّر تحميل بيانات العميل'));
      setCustomer(null);
    } finally {
      setCustomerLoading(false);
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

  // Publish/unpublish a real book on the public home page. Optimistic, rolled
  // back if the save fails.
  /**
   * Publish/unpublish one book on one public surface. Real books carry the flag
   * on their Story document; demo cards have none, so theirs lives in
   * settings.demoCards keyed by the card key. One handler either way so both
   * kinds of card behave identically in the UI.
   */
  const toggleVisibility = async (book: any, surface: 'home' | 'stories') => {
    const field = surface === 'home' ? 'showcase' : 'showcaseStories';
    const next = !book[field];
    const busyKey = book.storyId || book.demoKey;
    setVisBusy(`${busyKey}:${surface}`);

    const okMsg = surface === 'home'
      ? (next ? t('admin.showcase_added', 'تمت إضافة الكتاب للصفحة الرئيسية ✅') : t('admin.showcase_removed', 'تمت إزالة الكتاب من الصفحة الرئيسية'))
      : (next ? t('admin.stories_added', 'تمت إضافة الكتاب لصفحة القصص ✅') : t('admin.stories_removed', 'تمت إزالة الكتاب من صفحة القصص'));

    try {
      if (book.isDemo) {
        const merged = { ...(settings.demoCards || {}) };
        merged[book.demoKey] = { ...(merged[book.demoKey] || {}), [surface]: next };
        setSettings({ ...settings, demoCards: merged });
        const res = await adminApi.updateSettings({ demoCards: { [book.demoKey]: merged[book.demoKey] } });
        if (!res.success) throw new Error();
      } else {
        setAllStories((prev) => prev.map((x) => (x._id === book.storyId ? { ...x, [field]: next } : x)));
        const res = await adminApi.updateStory(book.storyId, { [field]: next });
        if (!res.success) throw new Error();
      }
      toast.success(okMsg);
    } catch {
      if (book.isDemo) setSettings((prev: any) => ({ ...prev }));
      else setAllStories((prev) => prev.map((x) => (x._id === book.storyId ? { ...x, [field]: !next } : x)));
      toast.error(t('admin.save_settings_fail'));
    } finally {
      setVisBusy(null);
    }
  };

  // Cash-on-delivery orders are confirmed orders, not unpaid ones. Showing
  // "بانتظار الدفع" for them was wrong — that wording belongs to card checkouts
  // that genuinely haven't completed.
  const isSettled = (o: any) => o?.paymentStatus === 'paid' || o?.paymentMethod === 'cash';
  const payLabel = (o: any) =>
    o?.paymentStatus === 'paid' ? t('admin.paid')
    : o?.paymentMethod === 'cash' ? t('admin.paid_cash', 'مدفوع نقداً عند الاستلام')
    : t('admin.pending_payment');

  const [printingBookKey, setPrintingBookKey] = useState<string | null>(null);
  // Stories & Themes: preview the book as a boy or a girl. Only affects the
  // ع/EN/עב preview links, never any saved data.
  const [previewGender, setPreviewGender] = useState<'male' | 'female'>('male');
  // Series parts are shown to the OWNER only — customers see plain titles.
  const themeSerieses = useMemo(() => seriesCounts(settings?.themes || []), [settings]);
  // Narrows الكتب الجاهزة to one public surface. null = show everything.
  const [bookFilter, setBookFilter] = useState<'home' | 'stories' | null>(null);
  // `${storyId|demoKey}:${surface}` while one publish toggle is in flight.
  const [visBusy, setVisBusy] = useState<string | null>(null);

  /**
   * Every book in one list: the real stories customers/we generated, plus the
   * curated theme demos. They used to be two separate sections with different
   * shapes, so nothing could act on "all books" uniformly.
   */
  const allBooks = useMemo(() => {
    const themeById: Record<string, any> = {};
    for (const th of (settings?.themes || [])) themeById[th.id] = th;
    const label = (id: string) => t(`step2.theme_${id}`, { defaultValue: themeById[id]?.label || id }) as string;
    const dateOf = (d?: string) => d ? new Date(d).toLocaleDateString(
      i18n.language === 'ar' ? 'ar-EG' : i18n.language === 'he' ? 'he-IL' : 'en-US') : '';

    // Real generated stories (a customer order, or one we built).
    const real = allStories
      .filter((s: any) => (s?.generatedImages?.length ?? 0) > 0 || s?.generatedCover)
      .map((s: any) => ({
        key: `story-${s._id}`,
        storyId: s._id,
        showcase: !!s.showcase,
        showcaseStories: !!s.showcaseStories,
        homeTag: s.homeTag || '',
        childName: s.childName,
        childGender: s.childGender,
        theme: s.theme,
        themeLabel: String(s.bookPackage || '').includes('coloring') || String(s.theme || '').includes('coloring')
          ? t('admin.coloring_book', 'كتاب تلوين') : label(s.theme),
        cover: s.generatedCover || s.generatedImages?.[0],
        back: s.generatedPortrait,
        images: s.generatedImages || [],
        childPhoto: s.childPhotoUrl,
        mode: s.mode,
        date: dateOf(s.createdAt),
        isDemo: false,
        isColoring: String(s.bookPackage || '').includes('coloring'),
        viewHref: String(s.bookPackage || '').includes('coloring') ? `/book/${s._id}?view=coloring` : `/book/${s._id}`,
      }));

    const vis: DemoVisibility = settings?.demoCards || {};

    // Curated theme demos — their artwork lives on the theme, not a Story doc.
    const demos = SHOWCASE_CARDS.map((c) => {
      const th = themeById[c.themeId] || {};
      const isColoring = c.themeId.includes('coloring');
      const base = c.storyId && c.storyId.startsWith('theme_') ? null : c.storyId;
      const folder = base ? `magic-fanoose/generated/${base}` : null;
      return {
        key: `demo-${c.key}`,
        childName: c.name,
        theme: c.themeId,
        themeLabel: isColoring ? t('admin.coloring_book', 'كتاب تلوين') : label(c.themeId),
        cover: folder ? `${folder}/page-00.png` : th.generatedCover,
        back: folder ? `${folder}/page-99.png` : th.generatedPortrait,
        images: folder
          ? Array.from({ length: 13 }, (_, i) => `${folder}/page-${String(i + 1).padStart(2, '0')}.png`)
          : (th.generatedImages || []),
        emoji: c.emoji,
        date: '',
        isDemo: true,
        demoKey: c.key,
        // Demo cards have no Story doc, so their visibility lives in settings.
        // These are the EFFECTIVE states — an unticked demo is still live on the
        // Stories page by default, so the button must reflect that, not the raw
        // flag. Books made from a real child's photo stay hidden until ticked.
        showcase: demoOnHomePage(c, vis),
        showcaseStories: demoOnStoriesPage(c, vis),
        homeTag: vis[c.key]?.tag || '',
        isColoring,
        viewHref: isColoring
          ? `/coloring/${c.themeId}?name=${encodeURIComponent(c.name)}`
          : `/book/${c.themeId}?name=${encodeURIComponent(c.name)}&lng=ar${c.storyId ? `&pin=${c.storyId}` : ''}`,
      };
    });

    return [...real, ...demos].map((b) => ({
      ...b,
      // The print build needs a cover, a back and at least one page.
      canPrint: !!b.cover && !!b.back && (b.images?.length ?? 0) > 0,
    }));
  }, [allStories, settings, t, i18n.language]);

  /** Build this book's print-ready PDFs and open them. Never submits to BookPod. */
  const handlePrintBook = async (b: any) => {
    if (printingBookKey) return;
    setPrintingBookKey(b.key);
    const toastId = toast.loading(t('admin.book_printing_toast', '📄 جاري تجهيز ملف الطباعة... (قد يستغرق دقيقة)'));
    try {
      const res = await adminApi.buildPreviewPrint({
        theme: b.theme,
        childName: b.childName || 'الطفل',
        childGender: b.childGender,
        language: i18n.language,
        coverPath: b.cover,
        backPath: b.back,
        imagePaths: b.images,
        childPhotoPath: b.childPhoto,
        isColoring: b.isColoring,
      });
      if (res?.success && res.interiorPath) {
        toast.success(t('admin.book_print_ok', 'تم تجهيز ملف الطباعة ✅'), { id: toastId });
        for (const p of [res.interiorPath, res.coverPath].filter(Boolean)) {
          window.open(objectPathToUrl(p), '_blank');
        }
      } else {
        toast.error(res?.message || t('admin.book_print_fail', 'فشل تجهيز ملف الطباعة'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.book_print_fail', 'فشل تجهيز ملف الطباعة'), { id: toastId });
    } finally {
      setPrintingBookKey(null);
    }
  };

  // Wizard feature switch: flip it locally, persist just that one flag, and
  // roll back if the save fails.
  /** Set (or clear, by re-picking the same one) the book's home-page badge. */
  const setHomeTag = async (book: any, tag: HomeTag) => {
    const next: HomeTag | '' = book.homeTag === tag ? '' : tag;
    setVisBusy(`${book.storyId || book.demoKey}:tag`);
    try {
      if (book.isDemo) {
        const merged = { ...(settings.demoCards || {}) };
        merged[book.demoKey] = { ...(merged[book.demoKey] || {}), tag: next || undefined };
        setSettings({ ...settings, demoCards: merged });
        const res = await adminApi.updateSettings({ demoCards: { [book.demoKey]: merged[book.demoKey] } });
        if (!res.success) throw new Error();
      } else {
        setAllStories((prev) => prev.map((x) => (x._id === book.storyId ? { ...x, homeTag: next } : x)));
        const res = await adminApi.updateStory(book.storyId, { homeTag: next || null });
        if (!res.success) throw new Error();
      }
      toast.success(t('admin.save_settings_ok', 'تم الحفظ'));
    } catch {
      toast.error(t('admin.save_settings_fail'));
      fetchAllStories();
    } finally {
      setVisBusy(null);
    }
  };

  const shownBooks = useMemo(
    () => allBooks.filter((b: any) =>
      bookFilter === 'home' ? b.showcase : bookFilter === 'stories' ? b.showcaseStories : true),
    [allBooks, bookFilter],
  );

  const saveFlag = async (key: 'allowSkipPhoto' | 'aiModeEnabled', value: boolean) => {
    setSettings({ ...settings, [key]: value });
    try {
      const res = await adminApi.updateSettings({ [key]: value });
      if (!res.success) throw new Error();
      toast.success(t('admin.save_settings_ok', 'تم الحفظ'));
    } catch {
      setSettings({ ...settings, [key]: !value });
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
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-arabic font-bold text-xl text-white">{t('admin.orders_title')}</h2>
                  <MagicButton onClick={fetchOrders} size="sm" variant="outline">{t('admin.refresh_data')}</MagicButton>
                </div>

                <div className="space-y-3">
                  {orders.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                      <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="font-arabic text-white/40">{t('admin.no_new_orders')}</p>
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div key={order._id} className="bg-dark-700/50 rounded-2xl border border-white/5 p-3.5 hover:border-gold-500/30 transition-all group">
                        <div className="flex flex-col gap-3">
                          {/* Order Info */}
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2.5">
                              <div className="px-2 py-0.5 bg-gold-500/10 text-gold-500 rounded-lg text-xs font-bold font-mono">
                                #{order._id.slice(-8).toUpperCase()}
                              </div>
                              <StatusBadge tone={isSettled(order) ? 'green' : 'gold'} icon={isSettled(order) ? CheckCircle : Clock}>
                                {payLabel(order)}
                              </StatusBadge>
                              {/* BookPod production status: sent (in production) vs not yet sent */}
                              {order.bookpodStatus === 'submitted' ? (
                                <StatusBadge tone="magic" icon={Package}>{t('admin.bookpod_in_production', 'قيد الإنتاج')}</StatusBadge>
                              ) : (
                                <StatusBadge tone="neutral" icon={Clock}>{t('admin.bookpod_pending', 'بانتظار الإرسال')}</StatusBadge>
                              )}
                              {order.storyId?.bookPackage === 'pro' ? (
                                <div className="flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-lg bg-gradient-to-l from-gold-400 to-amber-500 text-dark-900 shadow-lg shadow-gold-500/40">
                                  ✨ PRO
                                </div>
                              ) : order.storyId?.bookPackage ? (
                                <div className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white/10 text-white/70 font-arabic">
                                  {t(`step3.pkg_${order.storyId.bookPackage}`, order.storyId.bookPackage) as string}
                                </div>
                              ) : null}
                              <div className="font-arabic text-white/40 text-xs italic">
                                {new Date(order.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : i18n.language === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {/* Customer */}
                              <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 space-y-1.5">
                                <h4 className="font-arabic text-white/40 text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-gold-500/80" /> {t('admin.customer_info')}
                                </h4>
                                <div className="flex items-center gap-2 font-arabic text-white font-bold text-sm">
                                  <User className="w-4 h-4 text-white/30 shrink-0" /> {order.userId?.name || '—'}
                                </div>
                                {order.userId?.email && (
                                  <a href={`mailto:${order.userId.email}`} dir="ltr" className="flex items-center gap-2 text-white/50 text-sm font-sans hover:text-gold-400 transition-colors truncate">
                                    <Mail className="w-4 h-4 text-white/30 shrink-0" /> <span className="truncate">{order.userId.email}</span>
                                  </a>
                                )}
                                {order.shippingAddress?.phone && (
                                  <div className="flex items-center gap-2 text-white/50 text-sm font-sans" dir="ltr">
                                    <Phone className="w-4 h-4 text-white/30 shrink-0" /> {order.shippingAddress.phone}
                                  </div>
                                )}
                              </div>
                              {/* Story */}
                              <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 space-y-1.5">
                                <h4 className="font-arabic text-white/40 text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                                  <BookOpen className="w-3.5 h-3.5 text-gold-500/80" /> {t('admin.story_details')}
                                </h4>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-arabic text-gold-500 font-bold text-sm">{order.storyId?.childName || t('admin.no_name')}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleGender(order)}
                                    disabled={genderUpdatingId === order._id || !order.storyId?._id}
                                    title={t('admin.toggle_gender_hint', 'اضغط لتبديل جنس الطفل (ولد/بنت)، ثم أعِد تجهيز الملفات')}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-arabic border border-white/15 text-white/80 hover:border-gold-500/50 hover:text-gold-400 transition-all disabled:opacity-50 disabled:cursor-wait"
                                  >
                                    {genderUpdatingId === order._id
                                      ? '…'
                                      : order.storyId?.childGender === 'female'
                                      ? t('admin.gender_girl', '👧 بنت')
                                      : t('admin.gender_boy', '👦 ولد')}
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 font-arabic text-white/60 text-sm">
                                  <Sparkles className="w-4 h-4 text-white/30 shrink-0" /> {order.storyId?.theme ? (t(`step2.theme_${order.storyId.theme}`, { defaultValue: order.storyId.theme }) as string) : '...'}
                                </div>
                                <div className="flex items-center gap-2 font-arabic text-white font-bold text-sm">
                                  <span className="w-4 text-center text-white/30 shrink-0">💰</span> {order.totalPrice} {order.currency}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Live build progress — real percentage from the
                              background build, not an open-ended spinner. */}
                          {buildProgress[order._id] && (
                            <div className="rounded-xl bg-purple-500/10 border border-purple-500/30 px-3 py-2" role="status" aria-live="polite">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-arabic text-purple-200 text-xs font-bold">
                                  🎨 {buildProgress[order._id].stage || t('admin.building_book', 'جاري بناء الكتاب…')}
                                </span>
                                <span className="font-mono text-purple-200 text-xs font-bold">
                                  {buildProgress[order._id].pct}%
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-l from-purple-400 via-fuchsia-300 to-purple-500 transition-[width] duration-500"
                                  style={{ width: `${buildProgress[order._id].pct}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Actions — grouped under a labelled divider (wraps on narrow screens) */}
                          <div className="pt-2.5 border-t border-white/5">
                            <div className="flex flex-wrap items-center gap-1.5">
                            <ActionButton variant="gold" icon={Eye} to={`/book/${order.storyId?._id}`}>
                              {t('admin.view_story_review')}
                            </ActionButton>
                            {/* While ANY of these actions runs for this order, all three lock so
                                you can't press twice or trigger a conflicting action. The active
                                one shows a clear "working" state (ring + brighter), not just dimmed. */}
                            {(() => { const orderBusy = buildOnlyId === order._id || buildingOrderId === order._id || rerenderingOrderId === order._id; const isBuilt = builtOrderIds.has(order._id); return (<>
                            {/* Build the book for review — generate + prepare files, WITHOUT sending to
                                BookPod. Once built this session it locks as "تم البناء ✅". */}
                            <ActionButton
                              variant="emerald"
                              active={buildOnlyId === order._id}
                              spin={buildOnlyId === order._id}
                              icon={buildOnlyId === order._id ? Clock : isBuilt ? CheckCircle : BookOpen}
                              onClick={() => handleBuildOnly(order)}
                              disabled={orderBusy || isBuilt}
                              className={isBuilt && buildOnlyId !== order._id ? '!bg-emerald-500/25 !text-emerald-200 !border-emerald-500/40 !ring-0 cursor-default' : ''}
                            >
                              {buildOnlyId === order._id ? t('admin.building_short', 'جارٍ البناء...') : isBuilt ? t('admin.built_done', 'تم البناء ✅') : t('admin.build_book', 'بناء الكتاب للمراجعة')}
                            </ActionButton>
                            <ActionButton
                              variant="magic"
                              active={buildingOrderId === order._id}
                              spin={buildingOrderId === order._id}
                              icon={buildingOrderId === order._id ? Clock : Package}
                              onClick={() => handleSendToBookPod(order)}
                              disabled={orderBusy}
                            >
                              {buildingOrderId === order._id ? t('admin.sending', 'جارٍ الإرسال...') : t('admin.send_to_bookpod', 'إرسال إلى BookPod')}
                            </ActionButton>
                            {/* Free re-render of print files from existing images */}
                            <ActionButton
                              variant="ghost"
                              active={rerenderingOrderId === order._id}
                              spin={rerenderingOrderId === order._id}
                              icon={RefreshCw}
                              onClick={() => handleReRenderFiles(order)}
                              disabled={order.illustrationsStatus !== 'ready' || orderBusy}
                            >
                              {rerenderingOrderId === order._id ? t('admin.rerendering_short', 'جارٍ التجهيز...') : t('admin.rerender_files', 'إعادة تجهيز الملفات')}
                            </ActionButton>
                            </>); })()}
                            {/* Admin-only: download the print-ready files */}
                            <ActionButton variant="ghost" icon={Download} onClick={() => handleSaveFolder(order)} disabled={!order.printInteriorUrl && !order.printCoverUrl}>
                              {t('admin.save_folder', 'حفظ الملفات')}
                            </ActionButton>

                            {/* PRO bundle: the coloring book — its own view / send / re-render / save */}
                            {order.storyId?.bookPackage === 'pro' && !!(order.storyId?.coloringImages?.length) && (
                              <div className="w-full mt-1 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                                <div className="w-full font-arabic text-white/50 text-xs font-bold text-center lg:text-right">🖍️ {t('admin.coloring_book', 'كتاب التلوين')}</div>
                                <ActionButton variant="gold" icon={Eye} to={`/book/${order.storyId?._id}?view=coloring`}>
                                  {t('admin.view_coloring', 'عرض كتاب التلوين')}
                                </ActionButton>
                                <ActionButton
                                  variant="magic"
                                  active={coloringBusyId === order._id}
                                  spin={coloringBusyId === order._id}
                                  icon={coloringBusyId === order._id ? Clock : Package}
                                  onClick={() => handleSubmitColoring(order)}
                                  disabled={coloringBusyId === order._id}
                                >
                                  {coloringBusyId === order._id ? t('admin.sending', 'جارٍ الإرسال...') : t('admin.send_coloring', 'إرسال التلوين للطباعة')}
                                </ActionButton>
                                <ActionButton
                                  variant="ghost"
                                  active={coloringBusyId === order._id}
                                  spin={coloringBusyId === order._id}
                                  icon={RefreshCw}
                                  onClick={() => handleReRenderColoring(order)}
                                  disabled={coloringBusyId === order._id}
                                >
                                  {coloringBusyId === order._id ? t('admin.rerendering_short', 'جارٍ التجهيز...') : t('admin.rerender_files', 'إعادة تجهيز الملفات')}
                                </ActionButton>
                                <ActionButton variant="ghost" icon={Download} onClick={() => handleSaveFolder(order, 'coloring')} disabled={!order.coloringPrintInteriorUrl && !order.coloringPrintCoverUrl}>
                                  {t('admin.save_folder', 'حفظ الملفات')}
                                </ActionButton>
                              </div>
                            )}
                            </div>
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
                      <div
                        key={m._id}
                        onClick={() => openCustomer(m.email)}
                        className="bg-dark-700/50 border border-white/10 rounded-2xl p-4 cursor-pointer hover:border-gold-500/40 hover:bg-dark-700 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-arabic font-bold text-white text-sm">
                              {m.name}{m.subject ? <span className="text-gold-500"> · {m.subject}</span> : null}
                            </div>
                            <div className="font-arabic text-white/50 text-xs mt-0.5 flex flex-wrap gap-x-3">
                              <a href={`mailto:${m.email}`} onClick={(e) => e.stopPropagation()} className="hover:text-gold-500">{m.email}</a>
                              {m.phone ? <a href={`tel:${m.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-gold-500" dir="ltr">{m.phone}</a> : null}
                              {m.createdAt ? <span>{new Date(m.createdAt).toLocaleString()}</span> : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="hidden sm:flex items-center gap-1 text-gold-500/80 text-xs font-arabic">
                              <Eye className="w-3.5 h-3.5" /> {t('admin.view_account', 'عرض الحساب')}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(m._id); }} aria-label={t('admin.delete', 'حذف')} className="text-white/40 hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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
                <div className="space-y-2">
                  {settings.bookPackages.map((pkg: any, index: number) => (
                    /* One compact row per package — name, price, description and
                       the visibility pill inline, matching Stories & Themes. */
                    <div key={pkg.id} className="px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex flex-wrap items-center gap-1.5">
                      <input
                        type="text"
                        className="magic-input flex-1 min-w-[110px] sm:max-w-[150px] !py-1.5 text-sm"
                        title={t('admin.name')}
                        placeholder={t('admin.name')}
                        value={getLocalizedPkgLabel(pkg)}
                        onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].label = e.target.value;
                          setSettings({ ...settings, bookPackages: newPkgs });
                        }}
                      />
                      {/* EN / HE names. The main field above is the Arabic the
                          owner types; without these two, a rename never reached
                          an English or Hebrew customer. Blank = use the built-in
                          translation, so leaving them empty changes nothing. */}
                      {(['en', 'he'] as const).map((lng) => (
                        <input
                          key={lng}
                          type="text"
                          className="magic-input w-[104px] !py-1.5 text-sm"
                          title={lng === 'en' ? t('admin.name_en', 'الاسم بالإنجليزية') : t('admin.name_he', 'الاسم بالعبرية')}
                          placeholder={lng === 'en' ? 'EN' : 'עב'}
                          value={pkg.titles?.[lng] || ''}
                          onChange={(e) => {
                            const newPkgs = [...settings.bookPackages];
                            newPkgs[index] = { ...newPkgs[index], titles: { ...(newPkgs[index].titles || {}), [lng]: e.target.value } };
                            setSettings({ ...settings, bookPackages: newPkgs });
                          }}
                        />
                      ))}
                      <input
                        type="number"
                        className="magic-input w-[86px] !py-1.5 text-sm text-center"
                        title={t('admin.price_sar')}
                        value={pkg.price}
                        onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].price = Number(e.target.value);
                          setSettings({ ...settings, bookPackages: newPkgs });
                        }}
                      />
                      <input
                        type="text"
                        className="magic-input flex-[2] min-w-[150px] !py-1.5 text-sm"
                        title={t('admin.description')}
                        placeholder={t('admin.description')}
                        value={getLocalizedPkgDesc(pkg)}
                        onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].desc = e.target.value;
                          setSettings({ ...settings, bookPackages: newPkgs });
                        }}
                      />
                      {/* Hide this package from customers (Step 2 & 3) */}
                      <label
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg font-arabic text-xs cursor-pointer border transition-colors ${pkg.hidden ? 'bg-white/5 text-white/50 border-white/10' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'}`}
                        title={pkg.hidden ? t('admin.pkg_hidden', 'مخفية عن العملاء (اضغط للإظهار)') : t('admin.pkg_visible', 'ظاهرة للعملاء (اضغط للإخفاء)')}
                      >
                        <input
                          type="checkbox"
                          className="accent-emerald-500"
                          checked={!pkg.hidden}
                          onChange={(e) => {
                            const newPkgs = [...settings.bookPackages];
                            newPkgs[index].hidden = !e.target.checked;
                            setSettings({ ...settings, bookPackages: newPkgs });
                          }}
                        />
                        {pkg.hidden ? t('admin.pkg_hidden_short', 'مخفية') : t('admin.pkg_visible_short', 'ظاهرة')}
                      </label>
                    </div>
                  ))}

                  {/* Home hero stats — editable trust counters shown on the landing page */}
                  <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                    <h3 className="font-arabic font-bold text-white mb-1">{t('admin.home_stats_title', 'أرقام الصفحة الرئيسية')}</h3>
                    <p className="font-arabic text-white/40 text-xs mb-4">{t('admin.home_stats_hint', 'الأرقام التي تظهر تحت العنوان في الصفحة الرئيسية')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { key: 'storiesCreated', label: t('hero.stats_stories_created'), def: '+500' },
                        { key: 'happyFamilies', label: t('hero.stats_happy_families'), def: '+100' },
                        { key: 'readyStories', label: t('hero.stats_ready_stories'), def: '+20' },
                        { key: 'rating', label: t('hero.stats_rating'), def: '5 ⭐' },
                      ].map((s) => (
                        <div key={s.key}>
                          <label className="block font-arabic text-white/70 text-xs mb-1">{s.label}</label>
                          <input
                            type="text"
                            dir="ltr"
                            className="magic-input w-full text-center"
                            value={settings.homeStats?.[s.key] ?? s.def}
                            onChange={(e) => setSettings({ ...settings, homeStats: { ...(settings.homeStats || {}), [s.key]: e.target.value } })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <MagicButton onClick={() => saveSettings(settings)} className="mt-4">{t('admin.save_pricing')}</MagicButton>
                </div>
              </div>
            ) : tab === 'stories' ? (
              <div>
                <h2 className="font-arabic font-bold text-xl text-white mb-6">{t('admin.stories_title')}</h2>

                {/* ── Wizard switches: features hidden from customers until the
                       owner turns them back on. Saved on click. Deliberately
                       gold-bordered — the earlier white/5 card was invisible
                       against the dark dashboard and got scrolled past. ── */}
                <div className="mb-8 p-4 rounded-2xl bg-gold-500/[0.07] border-2 border-gold-500/40 shadow-[0_0_20px_rgba(212,169,55,0.10)]">
                  <h3 className="font-arabic font-black text-gold-500 text-base mb-1 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> {t('admin.wizard_flags_title', 'خيارات خطوات الإنشاء')}
                  </h3>
                  <p className="font-arabic text-white/45 text-xs mb-3">
                    {t('admin.wizard_flags_help', 'تحكّم بما يظهر للعميل في خطوات إنشاء القصة.')}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <FlagSwitch
                      on={!!settings.allowSkipPhoto}
                      label={t('admin.flag_skip_photo', 'السماح بالطلب بدون صورة الطفل')}
                      help={t('admin.flag_skip_photo_help', 'مطفأ = صورة الطفل إجبارية في الخطوة ١')}
                      onToggle={() => saveFlag('allowSkipPhoto', !settings.allowSkipPhoto)}
                    />
                    <FlagSwitch
                      on={!!settings.aiModeEnabled}
                      label={t('admin.flag_ai_mode', 'إظهار «بالذكاء الاصطناعي» في الخطوة ٢')}
                      help={t('admin.flag_ai_mode_help', 'مطفأ = العميل يرى القصص الجاهزة فقط')}
                      onToggle={() => saveFlag('aiModeEnabled', !settings.aiModeEnabled)}
                    />
                  </div>
                </div>

                {/* ── Story books group (kept separate from coloring books) ── */}
                <h3 className="font-arabic font-bold text-lg text-white mb-1">
                  📚 {t('admin.story_books_title', 'القصص')}
                  <span className="text-white/40 text-sm font-normal mr-2">({settings.themes.filter((th: any) => !th.isColoring).length})</span>
                </h3>
                <p className="font-arabic text-white/50 text-sm mb-3">{t('admin.story_books_desc', 'قصص كاملة بالنص والصور (٣٤ صفحة)')}</p>

                {/* Preview as a boy or a girl. Every story carries
                    {masculine|feminine} tokens, so the two read differently —
                    this is the quickest way to check a girl's book does not
                    come out masculine. Also swaps the sample name. */}
                <div className="mb-6 flex items-center gap-2 flex-wrap">
                  <span className="font-arabic text-white/50 text-xs">{t('admin.preview_as', 'عاين القصة كـ')}</span>
                  {([
                    { g: 'male' as const, label: `👦 ${t('admin.boy', 'ولد')}` },
                    { g: 'female' as const, label: `👧 ${t('admin.girl', 'بنت')}` },
                  ]).map((o) => (
                    <button
                      key={o.g}
                      type="button"
                      aria-pressed={previewGender === o.g}
                      onClick={() => setPreviewGender(o.g)}
                      className={`px-3 py-1 rounded-lg font-arabic text-xs border transition-colors ${
                        previewGender === o.g
                          ? 'bg-gold-500/20 border-gold-500/50 text-gold-300'
                          : 'bg-white/5 border-white/10 text-white/55 hover:border-white/25'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                  <span className="font-arabic text-white/35 text-[11px]">
                    {t('admin.preview_as_help', 'يغيّر الاسم والصياغة في أزرار المعاينة (ع / EN / עב)')}
                  </span>
                </div>
                <div className="space-y-4">
                  {settings.themes.map((theme: any, index: number) => theme.isColoring ? null : (
                    <div key={theme.id} className="px-3 py-2 bg-white/5 rounded-xl border border-white/10 flex flex-wrap items-center gap-1.5">
                      {/* Name sits inline with the actions — one compact row per story */}
                      <input
                        type="text"
                        className="magic-input flex-1 min-w-[140px] sm:max-w-[210px] !py-1.5 text-sm"
                        title={t('admin.story_name', 'اسم القصة')}
                        placeholder={t('admin.story_name', 'اسم القصة')}
                        value={theme.label || ''}
                        onChange={(e) => {
                          const newThemes = [...settings.themes];
                          newThemes[index].label = e.target.value;
                          setSettings({ ...settings, themes: newThemes });
                        }}
                      />

                      {/* Which series this story belongs to, and where in it.
                          Owner-facing only — the customer sees a plain title. */}
                      {seriesBadge(theme, themeSerieses, 'ar') && (
                        <span
                          className="px-2 py-1 rounded-lg font-arabic text-xs bg-gold-500/15 border border-gold-500/30 text-gold-400/90 whitespace-nowrap"
                          title={theme.seriesName || ''}
                        >
                          🔗 {theme.seriesName} · {seriesBadge(theme, themeSerieses, 'ar')}
                        </span>
                      )}

                      {/* Ready toggle — only `ready` themes appear in the customer wizard */}
                      <label
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg font-arabic text-xs cursor-pointer transition-colors border ${
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
                          ? t('admin.ready_short', 'جاهزة')
                          : t('admin.draft_short', 'مسودة')}
                      </label>

                      {/* View the book in each language */}
                      <div className="flex items-center gap-0.5 px-1 py-0.5 rounded-lg bg-dark-800 border border-white/10">
                        <Eye className="w-3.5 h-3.5 text-gold-500 shrink-0" />
                        {(previewGender === 'female'
                          ? [
                              { lng: 'ar', label: 'ع', name: 'سارة' },
                              { lng: 'en', label: 'EN', name: 'Sara' },
                              { lng: 'he', label: 'עב', name: 'שרה' },
                            ]
                          : [
                              { lng: 'ar', label: 'ع', name: 'إياد' },
                              { lng: 'en', label: 'EN', name: 'Ahmad' },
                              { lng: 'he', label: 'עב', name: 'עדי' },
                            ]
                        ).map((o) => (
                          <Link
                            key={o.lng}
                            to={`/book/${theme.id}?name=${encodeURIComponent(o.name)}&lng=${o.lng}&gender=${previewGender}`}
                            target="_blank"
                            className="px-1.5 py-0.5 rounded text-xs font-bold text-white/70 hover:text-gold-500 hover:bg-white/5 transition-colors"
                          >
                            {o.label}
                          </Link>
                        ))}
                      </div>

                      <button
                        onClick={() => openEditor(index)}
                        className="flex items-center gap-1 px-2 py-1 bg-gold-500/20 hover:bg-gold-500/30 text-gold-500 rounded-lg font-arabic text-xs transition-colors border border-gold-500/30"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> {t('admin.edit_short', 'تعديل')}
                      </button>

                      {/* Generate AI photos */}
                      <button
                        onClick={() => handleGenerateTheme(theme.id, (theme.generatedImages?.length ?? 0) > 0)}
                        disabled={generatingThemeId === theme.id}
                        className="flex items-center gap-1 px-2 py-1 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 rounded-lg font-arabic text-xs transition-colors border border-purple-500/30 disabled:opacity-50"
                        title={t('admin.generate_ai_help', 'توليد صور الذكاء الاصطناعي لهذه القصة')}
                      >
                        {generatingThemeId === theme.id
                          ? `⏳ ${t('admin.generating_short', 'جاري...')}`
                          : (theme.generatedImages?.length ?? 0) > 0
                            ? `✅ ${t('admin.regen_short', 'الصور')}`
                            : `🎨 ${t('admin.regen_short', 'الصور')}`}
                      </button>

                      {/* Generate photoreal (face-swap) — Style B / Taletoons */}
                      <button
                        onClick={() => handleGeneratePhotoreal(theme.id)}
                        disabled={generatingThemeId === theme.id}
                        className="flex items-center gap-1 px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-lg font-arabic text-xs transition-colors border border-emerald-500/30 disabled:opacity-50"
                        title={t('admin.generate_photoreal_help', 'توليد قوالب واقعية وتبديل وجه الطفل (نمط Taletoons)')}
                      >
                        📸 {t('admin.faceswap_short', 'تبديل الوجه')}
                      </button>

                      <button
                        onClick={() => deleteTheme(index)}
                        className="flex items-center gap-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-arabic text-xs transition-colors border border-red-500/30"
                        title={t('admin.delete_theme', 'حذف الموضوع')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => {
                     setSettings({
                       ...settings,
                       themes: [...settings.themes, { id: 'new_'+Date.now(), label: t('admin.new_story_default', 'قصة جديدة'), emoji: '✨', desc: '', ready: false }]
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
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-arabic font-bold text-white text-lg">
                    📚 {t('admin.tab_showcase', 'الكتب الجاهزة')}
                    {/* Total, and how many the current filter is showing. */}
                    <span className="text-white/40 text-sm font-normal mr-2">
                      ({allBooks.length}{bookFilter ? ` · ${shownBooks.length}` : ''})
                    </span>
                  </h3>
                  <MagicButton onClick={fetchAllStories} size="sm" variant="outline">{t('admin.refresh_data')}</MagicButton>
                </div>
                <p className="font-arabic text-white/50 text-sm mb-4">
                  {t('admin.showcase_desc_v2', 'كل الكتب التي أنشأتها — اعرض الكتاب أو جهّز ملف الطباعة.')}
                </p>

                {/* What the public actually sees right now, so the owner does not
                    have to read every card's toggles to find out. Each panel is
                    also a filter: click it to narrow the grid to just that
                    surface, click again to go back to everything. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {([
                    { id: 'home' as const, icon: '🏠', title: t('admin.live_home', 'على الصفحة الرئيسية'),
                      books: allBooks.filter((b: any) => b.showcase),
                      empty: t('admin.live_home_empty', 'لا شيء مختار — تظهر البطاقات الافتراضية') },
                    { id: 'stories' as const, icon: '📚', title: t('admin.live_stories', 'على صفحة القصص'),
                      books: allBooks.filter((b: any) => b.showcaseStories),
                      empty: t('admin.live_stories_empty', 'لا شيء — الصفحة فارغة') },
                  ]).map((g) => {
                    const active = bookFilter === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setBookFilter(active ? null : g.id)}
                        title={t('admin.filter_hint', 'اضغط لعرض هذه الكتب فقط')}
                        className={`text-start rounded-xl border p-3 transition-colors ${
                          active
                            ? 'border-gold-500/60 bg-gold-500/10'
                            : 'border-white/10 bg-white/5 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-arabic font-bold text-white/80 text-xs">{g.icon} {g.title}</span>
                          <span className={`font-arabic text-[11px] px-2 py-0.5 rounded-full border ${
                            g.books.length
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                              : 'bg-white/5 border-white/10 text-white/40'
                          }`}>{g.books.length}</span>
                        </div>
                        {g.books.length === 0 ? (
                          <p className="font-arabic text-white/35 text-[11px]">{g.empty}</p>
                        ) : (
                          <p className="font-arabic text-white/55 text-[11px] leading-relaxed">
                            {g.books.map((b: any) => `${b.childName} — ${b.themeLabel}`).join(' · ')}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {bookFilter && (
                  <button
                    type="button"
                    onClick={() => setBookFilter(null)}
                    className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/15 text-white/70 hover:border-white/35 font-arabic text-[11px] transition-colors"
                  >
                    ✕ {t('admin.filter_clear', 'عرض كل الكتب')} ({allBooks.length})
                  </button>
                )}

                {storiesLoading ? (
                  <p className="font-arabic text-white/40 text-sm py-6 text-center">{t('admin.loading')}</p>
                ) : allBooks.length === 0 ? (
                  <p className="font-arabic text-white/40 text-sm py-6 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                    {t('admin.showcase_no_generated', 'لا توجد كتب مُنشأة بعد — أنشئ قصة وستظهر هنا.')}
                  </p>
                ) : shownBooks.length === 0 ? (
                  <p className="font-arabic text-white/40 text-sm py-6 text-center bg-white/5 rounded-xl border border-dashed border-white/10">
                    {bookFilter === 'home'
                      ? t('admin.filter_none_home', 'لا يوجد كتاب على الصفحة الرئيسية بعد — اضغط 🏠 على أي كتاب لإضافته.')
                      : t('admin.filter_none_stories', 'لا يوجد كتاب على صفحة القصص بعد — اضغط 📚 على أي كتاب لإضافته.')}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {shownBooks.map((b: any) => (
                      <div key={b.key} className="bg-dark-700/50 rounded-2xl border border-white/5 p-3 flex flex-col gap-2.5 hover:border-gold-500/30 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {b.cover ? (
                            <img
                              src={objectPathToUrl(b.cover)}
                              alt=""
                              loading="lazy"
                              className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                            />
                          ) : (
                            <span className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xl shrink-0">{b.emoji || '📖'}</span>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-arabic font-bold text-white text-sm truncate">{localizeName(b.childName || '—', i18n.language)}</h4>
                            <p className="font-arabic text-gold-500 text-xs truncate">{b.themeLabel}</p>
                            <p className="font-arabic text-white/35 text-[11px]">
                              {b.isDemo ? t('admin.book_demo', 'كتاب عرض') : t('admin.book_customer', 'كتاب عميل')}
                              {b.date ? ` · ${b.date}` : ''}{b.mode === 'ai' ? ' · AI' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Publish toggles — every book gets both, demo or not.
                            Green = live on that public surface. */}
                        <div className="grid grid-cols-2 gap-1.5">
                          {([
                            { surface: 'home' as const, on: !!b.showcase, icon: '🏠',
                              labelOn: t('admin.showcase_on', 'ظاهر في الرئيسية'),
                              labelOff: t('admin.showcase_off', 'أظهره في الرئيسية') },
                            { surface: 'stories' as const, on: !!b.showcaseStories, icon: '📚',
                              labelOn: t('admin.stories_on', 'ظاهر في صفحة القصص'),
                              labelOff: t('admin.stories_off', 'أظهره في صفحة القصص') },
                          ]).map((s) => (
                            <button
                              key={s.surface}
                              type="button"
                              role="switch"
                              aria-checked={s.on}
                              onClick={() => toggleVisibility(b, s.surface)}
                              disabled={visBusy === `${b.storyId || b.demoKey}:${s.surface}`}
                              className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg font-arabic text-[11px] border transition-colors disabled:opacity-50 ${
                                s.on
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                  : 'bg-white/5 border-white/10 text-white/55 hover:border-white/25'
                              }`}
                            >
                              {s.icon} {s.on ? s.labelOn : s.labelOff}
                            </button>
                          ))}
                        </div>

                        {/* Badge on the home-page card. Only meaningful once the
                            book is actually on the home page, so it appears with
                            the toggle. Re-picking the active one clears it. */}
                        {b.showcase && (
                          <div className="grid grid-cols-3 gap-1.5">
                            {HOME_TAGS.map((tag) => {
                              const on = b.homeTag === tag;
                              const label = tag === 'bestseller'
                                ? t('bestsellers.tag_best_seller', 'الأكثر مبيعاً')
                                : tag === 'new'
                                  ? t('bestsellers.tag_new', 'جديد')
                                  : t('bestsellers.tag_featured', 'مميز');
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => setHomeTag(b, tag)}
                                  disabled={visBusy === `${b.storyId || b.demoKey}:tag`}
                                  title={t('admin.tag_hint', 'الشارة على بطاقة الصفحة الرئيسية')}
                                  className={`px-1.5 py-1 rounded-lg font-arabic text-[10px] border transition-colors disabled:opacity-50 ${
                                    on
                                      ? 'bg-gold-500/20 border-gold-500/50 text-gold-300'
                                      : 'bg-white/5 border-white/10 text-white/45 hover:border-white/25'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            to={b.viewHref}
                            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-white/5 hover:bg-white/10 text-white/80 border border-white/15 rounded-xl font-arabic font-bold text-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> {t('admin.book_show', 'عرض')}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handlePrintBook(b)}
                            disabled={printingBookKey === b.key || !b.canPrint}
                            title={b.canPrint ? t('admin.book_print_help', 'تجهيز ملف الطباعة (PDF) وفتحه') : t('admin.book_print_missing', 'ينقص هذا الكتاب صور — لا يمكن تجهيز الطباعة')}
                            className="flex items-center justify-center gap-1.5 px-2 py-2 bg-gold-500 text-[#0a1628] rounded-xl font-arabic font-bold text-xs hover:bg-gold-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {printingBookKey === b.key
                              ? `⏳ ${t('admin.book_printing', 'جاري...')}`
                              : <>🖨️ {t('admin.book_print', 'طباعة')}</>}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Customer profile modal — opened by clicking a message. */}
      {customer && (
        <Modal onClose={() => setCustomer(null)} closeLabel={t('admin.close', 'إغلاق')}>

            <h3 className="font-arabic font-black text-white text-xl mb-1 pr-10">
              👤 {customer.user?.name || customer.email}
            </h3>
            <a href={`mailto:${customer.email}`} className="font-sans text-gold-500 text-sm hover:underline" dir="ltr">{customer.email}</a>

            {customerLoading ? (
              <p className="font-arabic text-white/50 text-center py-10">{t('admin.loading')}</p>
            ) : (
              <div className="mt-5 space-y-5">
                {/* Stat tiles */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { n: customer.ordersCount ?? 0, label: t('admin.books_label', 'الكتب') },
                    { n: customer.storiesCount ?? 0, label: t('admin.stories_label', 'القصص') },
                    { n: customer.messagesCount ?? 0, label: t('admin.messages_label', 'الرسائل') },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-3 text-center">
                      <div className="font-arabic font-black text-gold-500 text-2xl">{s.n}</div>
                      <div className="font-arabic text-white/50 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Account details */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <h4 className="font-arabic text-white/50 text-xs mb-3">{t('admin.customer_account', 'حساب العميل')}</h4>
                  {customer.user ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 font-arabic text-sm">
                      <div className="text-white/60">{t('admin.name')}: <span className="text-white font-bold">{customer.user.name}</span></div>
                      {customer.user.phone && <div className="text-white/60" dir="ltr">{t('admin.phone_label', 'الهاتف')}: <span className="text-white">{customer.user.phone}</span></div>}
                      {customer.user.location && <div className="text-white/60">{t('admin.location_label', 'الموقع')}: <span className="text-white">{customer.user.location}</span></div>}
                      <div className="text-white/60">{t('admin.role_label', 'الصلاحية')}: <span className="text-white">{customer.user.role}</span></div>
                      {customer.user.createdAt && <div className="text-white/60">{t('admin.registered_label', 'مسجّل منذ')}: <span className="text-white">{new Date(customer.user.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : i18n.language === 'he' ? 'he-IL' : 'en-US')}</span></div>}
                      {customer.user.lastLoginAt && <div className="text-white/60">{t('admin.last_login_label', 'آخر دخول')}: <span className="text-white">{new Date(customer.user.lastLoginAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : i18n.language === 'he' ? 'he-IL' : 'en-US')}</span></div>}
                    </div>
                  ) : (
                    <p className="font-arabic text-white/40 text-sm">{t('admin.no_account', 'لا يوجد حساب مسجّل بهذا البريد (رسالة من زائر).')}</p>
                  )}
                </div>

                {/* Orders / books */}
                <div>
                  <h4 className="font-arabic text-white/50 text-xs mb-2">📦 {t('admin.orders_title')} ({customer.ordersCount ?? 0})</h4>
                  {customer.orders?.length ? (
                    <div className="flex flex-col gap-2">
                      {customer.orders.map((o: any) => (
                        <div key={o._id} className="bg-dark-700/60 rounded-xl border border-white/5 p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-arabic text-white text-sm font-bold truncate">
                              {o.storyId?.childName || t('admin.no_name')}
                              {o.storyId?.theme && <span className="text-white/40 font-normal"> · {t(`step2.theme_${o.storyId.theme}`, { defaultValue: o.storyId.theme }) as string}</span>}
                            </div>
                            <div className="font-arabic text-white/40 text-xs mt-0.5">
                              {o.storyId?.bookPackage ? (t(`step3.pkg_${o.storyId.bookPackage}`, { defaultValue: o.storyId.bookPackage }) as string) : ''} · {new Date(o.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-EG' : i18n.language === 'he' ? 'he-IL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isSettled(o) ? 'bg-green-500/20 text-green-400' : 'bg-gold-500/20 text-gold-500'}`}>
                              {payLabel(o)}
                            </span>
                            <span className="font-arabic text-white/60 text-xs whitespace-nowrap">{o.totalPrice} {o.currency}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-arabic text-white/40 text-sm">{t('admin.no_orders_customer', 'لا توجد طلبات لهذا العميل.')}</p>
                  )}
                </div>

                {/* Their messages */}
                <div>
                  <h4 className="font-arabic text-white/50 text-xs mb-2">✉️ {t('admin.tab_messages', 'الرسائل')} ({customer.messagesCount ?? 0})</h4>
                  <div className="flex flex-col gap-2">
                    {customer.messages?.map((mm: any) => (
                      <div key={mm._id} className="bg-dark-700/60 rounded-xl border border-white/5 p-3">
                        <div className="font-arabic text-gold-500 text-xs font-bold">{mm.subject || '—'} <span className="text-white/30 font-normal">· {new Date(mm.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : i18n.language === 'he' ? 'he-IL' : 'en-US')}</span></div>
                        <p className="font-arabic text-white/70 text-sm mt-1 whitespace-pre-wrap leading-relaxed">{mm.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
        </Modal>
      )}
    </div>
  );
}

/** Compact on/off switch for a single owner-controlled wizard feature. */
function FlagSwitch({ on, label, help, onToggle }: { on: boolean; label: string; help: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`flex-1 flex items-start gap-2.5 text-right p-2.5 rounded-lg border transition-colors ${
        on ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-white/5 border-white/10 hover:border-white/25'
      }`}
    >
      <span className={`relative shrink-0 mt-0.5 w-9 h-5 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-white/20'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span className="min-w-0">
        <span className="block font-arabic text-white text-xs font-bold leading-snug">{label}</span>
        <span className="block font-arabic text-white/45 text-[11px] mt-0.5 leading-snug">{help}</span>
      </span>
    </button>
  );
}
