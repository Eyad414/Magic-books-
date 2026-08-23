import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { seriesBadge, seriesCounts } from '../utils/series';
import { adminApi } from '../api/adminApi';
import { objectPathToUrl } from '../api/mediaUrl';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Users, Settings, BookOpen, UserPlus, Eye, Package, Clock, CheckCircle, Trash2, Download, RefreshCw, Mail, User, Phone, Sparkles, AlertCircle, Search, Upload } from 'lucide-react';
import MagicButton from '../components/common/MagicButton';
import Modal from '../components/common/Modal';
import ActionButton from '../components/common/ActionButton';
import StatusBadge from '../components/common/StatusBadge';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { findStory } from '../data/stories';
import { SHOWCASE_CARDS, demoOnHomePage, demoOnStoriesPage, HOME_TAGS, type DemoVisibility, type HomeTag } from '../data/showcaseCards';
import { localizeName } from '../utils/translit';
import { formatMoney } from '../utils/money';

/**
 * Build failures are thrown by the backend in English (they are aimed at logs).
 * Showing them raw meant an Arabic dashboard displaying "childPhotoUrl is empty
 * — Gemini needs a reference photo." Map the ones we cause on purpose to the
 * dashboard's own language; anything unrecognised still shows verbatim, which
 * is better than hiding a real error behind a generic phrase.
 */
function buildErrorText(raw: string, t: (k: string, d?: any) => string): string {
  const e = (raw || '').toLowerCase();
  if (e.includes('childphotourl is empty')) {
    return t('admin.err_no_child_photo', 'لا توجد صورة للطفل — الرسومات تحتاج صورة مرجعية، والطلب أُنشئ بدونها.');
  }
  if (e.includes('quota') || e.includes('rate limit') || e.includes('429')) {
    return t('admin.err_quota', 'تم تجاوز حصة توليد الصور مؤقتاً — أعد المحاولة بعد قليل.');
  }
  if (e.includes('timeout') || e.includes('etimedout')) {
    return t('admin.err_timeout', 'انتهت مهلة التوليد قبل اكتمال الكتاب — أعد المحاولة.');
  }
  return raw;
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'team' | 'pricing' | 'stories' | 'orders' | 'showcase' | 'messages' | 'customers' | 'visitors'>('orders');
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

  const [confirmingPayId, setConfirmingPayId] = useState<string | null>(null);

  /**
   * Record that a card payment arrived. Separate from "Send to BookPod" on
   * purpose: that one also marks the order paid, but it immediately spends
   * money on generation and a print run, which is not what confirming a payment
   * should do. This only records the money; building stays a separate decision.
   */
  const handleConfirmPayment = async (order: any) => {
    if (confirmingPayId) return;
    const amount = `${order.totalPrice} ${order.currency === 'ILS' ? '₪' : order.currency}`;
    if (!window.confirm(t('admin.confirm_payment_ask', 'تأكيد أن الزبون دفع {{amount}} لهذا الطلب؟ لن يتم بناء الكتاب أو إرساله للطباعة الآن.', { amount }))) return;
    setConfirmingPayId(order._id);
    const toastId = toast.loading(t('admin.confirming_payment', 'جاري تأكيد الدفع...'));
    try {
      const res = await adminApi.confirmOrderPayment(order._id);
      if (res.success) {
        toast.success(
          res.alreadyPaid
            ? t('admin.already_paid', 'هذا الطلب مدفوع بالفعل')
            : t('admin.payment_confirmed', 'تم تأكيد الدفع ✅ الطلب جاهز للبناء'),
          { id: toastId },
        );
        await fetchOrders();
      } else {
        toast.error(res.message || t('admin.confirm_payment_failed', 'تعذّر تأكيد الدفع'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.confirm_payment_failed', 'تعذّر تأكيد الدفع'), { id: toastId });
    } finally {
      setConfirmingPayId(null);
    }
  };

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
  const submitReadyBook = async () => {
    if (!sendBook) return;
    const { childName, fullName, phone } = sendForm;
    if (!childName.trim() || !fullName.trim() || !phone.trim()) {
      toast.error(t('admin.send_needs_fields', 'اسم الطفل واسم المستلم ورقم الهاتف مطلوبة'));
      return;
    }
    if (!window.confirm(t('admin.send_confirm', 'إرسال هذا الكتاب إلى BookPod للطباعة؟ هذه طباعة حقيقية ومدفوعة.'))) return;

    setSendBusy(true);
    const toastId = toast.loading(t('admin.import_sending', 'جاري الإرسال إلى BookPod...'));
    try {
      const res = await adminApi.sendReadyThemeBook({
        theme: sendBook.id,
        childName: childName.trim(),
        // Only send a choice that was actually made; the server keeps the
        // default for this book type when a field is absent.
        ...(sendForm.printColor ? { printColor: sendForm.printColor } : {}),
        ...(sendForm.sheetType ? { sheetType: sendForm.sheetType } : {}),
        ...(sendForm.lamination ? { lamination: sendForm.lamination } : {}),
        shipping: { fullName: fullName.trim(), phone: phone.trim(), deliveryMethod: 'pickup', pickupLocation: 'القدس' },
      });
      if (res?.success) {
        toast.success(`${t('admin.sent_to_bookpod_ok', 'تم الإرسال إلى BookPod للطباعة ✅')}${res.jobId ? ` (#${res.jobId})` : ''}`, { id: toastId, duration: 8000 });
        setSendBook(null);
        loadPrintJobs();
      } else {
        toast.error(res?.message || t('admin.send_failed', 'فشل الإرسال إلى BookPod'), { id: toastId });
        loadPrintJobs();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.send_failed', 'فشل الإرسال إلى BookPod'), { id: toastId });
      // A failure is logged server-side now, so the panel can show it.
      loadPrintJobs();
    } finally {
      setSendBusy(false);
    }
  };

  // Visitors have their own page now, and their own fetch: opening it should
  // not depend on having opened the customers tab first.
  useEffect(() => {
    if (tab !== 'visitors') return;
    adminApi.getVisits(7)
      .then((r) => { if (r.success) { setVisits(r.visits); setVisitWeek(r.week || []); setBehaviour(r.behaviour || null); } })
      .catch(() => setVisits([]));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'customers') return;
    loadCustomers();
    const id = setInterval(loadCustomers, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // The messenger refreshes itself while it is open — a reply that arrives
  // while the owner is looking at the inbox should appear there, not on the
  // next manual reload.
  useEffect(() => {
    if (tab !== 'messages') return;
    loadConversations();
    if (!customers) loadCustomers();
    const id = setInterval(loadConversations, 20_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const loadCustomers = async () => {
    try {
      adminApi.getVisits(1)
        .then((r) => { if (r.success) { setVisits(r.visits); setVisitWeek(r.week || []); setBehaviour(r.behaviour || null); } })
        .catch(() => { /* the list is extra */ });
      const res = await adminApi.getCustomers();
      if (res.success) setCustomers(res);
      adminApi.getMessageCounts()
        .then((r) => { if (r?.success) setMsgCounts(r.byUser || {}); })
        .catch(() => { /* the badge is extra */ });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'تعذّر جلب قائمة العملاء');
    }
  };

  const loadPrintJobs = async () => {
    try {
      // Ask the printer first: a stored status is only true for as long as
      // nobody at BookPod touches the job.
      await adminApi.refreshPrintJobs().catch(() => { /* stale is better than nothing */ });
      const res = await adminApi.getPrintJobs(30);
      if (res.success) setPrintJobs(res.jobs);
    } catch { /* the log is informational; a failure here changes nothing */ }
  };

  const loadReadiness = async () => {
    if (readinessBusy) return;
    setReadinessBusy(true);
    const toastId = toast.loading(t('admin.readiness_checking', 'جاري فحص الكتب في المخزن...'));
    try {
      const res = await adminApi.getPrintReadiness();
      if (res.success) {
        setReadiness(res);
        loadPrintJobs();
        toast.success(
          t('admin.readiness_done', '{{ready}} من {{total}} كتاب جاهز للإرسال', { ready: res.readyCount, total: res.total }),
          { id: toastId },
        );
      } else {
        toast.error(res.message || 'فشل الفحص', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'فشل الفحص', { id: toastId });
    } finally {
      setReadinessBusy(false);
    }
  };

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

  /**
   * Build the colouring version of a story. There is nothing to author: the
   * scenes are the story's own, drawn as line art, so this is one confirm and
   * one wait.
   */
  const handleGenerateColoringFor = async (theme: any) => {
    if (!window.confirm(t('admin.coloring_cost_confirm', 'سيتم توليد ١٨ صورة (~$0.70). هل تريد المتابعة؟'))) return;
    setGeneratingThemeId(theme.id);
    const toastId = toast.loading('🖍️ ' + t('admin.generating', 'جاري التوليد...'));
    try {
      const res = await adminApi.generateThemeColoring(theme.id, {});
      if (res.success) {
        toast.success(
          t('admin.coloring_done', 'تم توليد كتاب التلوين — {{n}} صورة، بتكلفة ~${{c}}.', {
            n: res.imageCount ?? 0, c: res.estimatedCostUsd ?? '0',
          }),
          { id: toastId, duration: 8000 },
        );
        setSettings((prev: any) => ({
          ...prev,
          themes: prev.themes.map((th: any) => th.id === theme.id
            ? { ...th, coloringCover: res.coloringCover, coloringImages: res.coloringImages, coloringBackCover: res.coloringBackCover }
            : th),
        }));
      } else {
        toast.error(res.message || t('admin.coloring_failed', 'فشل توليد كتاب التلوين'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.coloring_failed', 'فشل توليد كتاب التلوين'), { id: toastId });
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

  // ── Import a finished book PDF and re-impose it onto a chosen trim ───────
  // For books the owner already has as a file. Rights are the owner's call —
  // the panel says so — because nothing here can check them.
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importTrim, setImportTrim] = useState({ w: 150, h: 220 });
  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importSend, setImportSend] = useState({
    name: '', phone: '', qty: 1,
    // Print choices for this submission; empty = BookPod's default for the book.
    printColor: '', sheetType: '', lamination: '',
  });
  const [importSending, setImportSending] = useState(false);
  const [importJob, setImportJob] = useState<any>(null);
  // A designed cover for an imported book: the importer's "cover" is page 1 of
  // the supplied PDF, which for a manuscript exported from Word is body text.
  const [importCover, setImportCover] = useState<any>(null);
  const [importCoverBusy, setImportCoverBusy] = useState(false);
  const [importSubject, setImportSubject] = useState('');

  // Real print job, real money — separate from importing, which is free and
  // repeatable, and gated behind its own confirmation.
  const handleDesignImportedCover = async () => {
    if (!importResult?.interiorPages) return;
    const title = importFile?.name?.replace(/\.pdf$/i, '') || 'Imported book';
    if (!window.confirm(t('admin.import_cover_confirm', 'تصميم غلاف جديد لهذا الكتاب؟ صورة واحدة مدفوعة (~$0.04).'))) return;
    setImportCoverBusy(true);
    const toastId = toast.loading(t('admin.import_cover_designing', 'جاري تصميم الغلاف...'));
    try {
      const res = await adminApi.designImportedCover({
        title,
        subject: importSubject.trim() || undefined,
        widthMm: importResult.widthMm,
        heightMm: importResult.heightMm,
        interiorPages: importResult.interiorPages,
      });
      if (res.success) {
        setImportCover(res);
        toast.success(t('admin.import_cover_done', 'تم تصميم الغلاف ✅ سيُرسل بدل الصفحة الأولى'), { id: toastId });
      } else {
        toast.error(res.message || 'فشل التصميم', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'فشل التصميم', { id: toastId });
    } finally {
      setImportCoverBusy(false);
    }
  };

  const handleUploadOwnCover = async (file: File | null) => {
    if (!file || !importResult?.interiorPages) return;
    setImportCoverBusy(true);
    const toastId = toast.loading(t('admin.import_cover_uploading', 'جاري رفع الغلاف...'));
    try {
      const res = await adminApi.uploadImportedCover(file, {
        title: importFile?.name?.replace(/\.pdf$/i, '') || 'Imported book',
        widthMm: importResult.widthMm,
        heightMm: importResult.heightMm,
        interiorPages: importResult.interiorPages,
      });
      if (res.success) {
        setImportCover(res);
        if (res.warning) toast(res.warning, { icon: '⚠️', duration: 7000 });
        toast.success(t('admin.import_cover_uploaded', 'تم رفع غلافك ✅ سيُرسل بدل الصفحة الأولى'), { id: toastId });
      } else {
        toast.error(res.message || 'فشل الرفع', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'فشل الرفع', { id: toastId });
    } finally {
      setImportCoverBusy(false);
    }
  };

  /**
   * Download the EXACT pair that would go to BookPod, so it can be opened and
   * checked first — the same habit the order cards support with "حفظ الملفات".
   * It deliberately reads the same values the send does, including a designed
   * or uploaded cover, so what is reviewed is what is printed.
   */
  /**
   * Which interior goes with the cover that is currently chosen.
   *
   * The importer splits page 1 off as the cover, so the default interior is
   * pages 2..N — right when the file really opens with a cover. The moment the
   * owner supplies or designs one, page 1 is a page of their BOOK, and sending
   * the split interior would drop it. So a custom cover ships the WHOLE file.
   */
  const importInterior = (): { path?: string; pages?: number; full: boolean } =>
    importCover
      ? { path: importResult?.objectPath, pages: importResult?.pageCount, full: true }
      : { path: importResult?.interiorPath, pages: importResult?.interiorPages, full: false };

  const handleSaveImportedFiles = () => {
    const coverPath = importCover?.coverPath || importResult?.coverPath;
    const interiorPath = importInterior().path;
    const base = (importFile?.name?.replace(/\.pdf$/i, '') || 'imported-book').slice(0, 40);
    const files = [
      { path: coverPath, name: `${base}-cover.pdf` },
      { path: interiorPath, name: `${base}-interior.pdf` },
    ].filter((f): f is { path: string; name: string } => !!f.path);
    if (!files.length) {
      toast.error(t('admin.no_files_yet', 'لا توجد ملفات بعد — أرسل الطلب للطباعة أولاً'));
      return;
    }
    files.forEach((f) => {
      const a = document.createElement('a');
      a.href = objectPathToUrl(f.path);
      a.download = f.name;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
    toast.success(t('admin.import_files_saved', 'تم تنزيل الغلاف والداخل — راجعهما قبل الإرسال'));
  };

  const handleSendImported = async () => {
    if (!importResult?.coverPath || !importResult?.interiorPath) return;
    if (!importSend.name.trim() || !importSend.phone.trim()) {
      toast.error(t('admin.import_need_contact', 'أدخل اسم المستلم ورقم الهاتف.'));
      return;
    }
    const interiorPath = importInterior().path;
    if (!interiorPath) { toast.error(t('admin.import_no_interior', 'لا يوجد ملف داخلي — استورد الكتاب أولاً.')); return; }
    if (!window.confirm(t('admin.import_confirm_send', 'إرسال {{n}} نسخة إلى BookPod للطباعة؟ هذه طباعة حقيقية ومدفوعة.', { n: importSend.qty }))) return;
    setImportSending(true);
    const toastId = toast.loading(t('admin.import_sending', 'جاري الإرسال إلى BookPod...'));
    try {
      const res = await adminApi.submitImportedBook({
        // A designed cover replaces page 1 — that is the whole point of it.
        coverPath: importCover?.coverPath || importResult.coverPath,
        // ...and then page 1 is a page of the book, not a cover, so the whole
        // file is the interior. Sending the split interior would drop it.
        interiorPath: interiorPath,
        title: importFile?.name?.replace(/\.pdf$/i, '') || 'Imported book',
        quantity: importSend.qty,
        widthMm: importResult.widthMm,
        heightMm: importResult.heightMm,
        name: importSend.name.trim(),
        phone: importSend.phone.trim(),
        ...(importSend.printColor ? { printColor: importSend.printColor } : {}),
        ...(importSend.sheetType ? { sheetType: importSend.sheetType } : {}),
        ...(importSend.lamination ? { lamination: importSend.lamination } : {}),
      });
      if (res.success) {
        setImportJob(res);
        toast.success(t('admin.import_sent', 'تم الإرسال — رقم الطلب لدى BookPod: {{id}}', { id: res.jobId }), { id: toastId });
      } else {
        toast.error(res.message || 'فشل الإرسال', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'فشل الإرسال', { id: toastId });
    } finally {
      setImportSending(false);
    }
  };

  const handleImportBook = async () => {
    if (!importFile) { toast.error(t('admin.import_pick_file', 'اختر ملف PDF أولاً.')); return; }
    setImportBusy(true);
    setImportResult(null);
    setImportJob(null);
    // A cover belongs to the book it was chosen for. Without this the next
    // import silently inherited the previous book's cover — both the review
    // download and the send would have used it.
    setImportCover(null);
    setImportSubject('');
    const toastId = toast.loading(t('admin.import_working', 'جاري تجهيز الملف للطباعة...'));
    try {
      const res = await adminApi.importBook(importFile, {
        widthMm: importTrim.w, heightMm: importTrim.h, bleedMm: 3,
        title: importFile.name.replace(/\.pdf$/i, ''),
      });
      if (res.success) {
        setImportResult(res);
        toast.success(t('admin.import_done', 'جاهز — {{n}} صفحة بمقاس {{w}}×{{h}} مم.', {
          n: res.pageCount, w: res.widthMm, h: res.heightMm,
        }), { id: toastId });
      } else {
        toast.error(res.message || 'فشل التجهيز', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'فشل التجهيز', { id: toastId });
    } finally {
      setImportBusy(false);
    }
  };

  // How many interior pages a coloring book has.

  // Coloring-book generation: per-theme reference photo + the typed scenes.



  

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


  // getLocalizedPkgLabel used to render this row's name in the dashboard's own
  // language. It is gone on purpose: an editable field must show the value it
  // saves, and this one saved to pkg.label (Arabic) whatever language it had
  // displayed. Customers still see translated names — getPackageLabel does that
  // in the wizard, where nothing is being edited.

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
  // Narrows الكتب الجاهزة to one public surface. null = show everything.
  // Series parts are shown to the OWNER only — customers see plain titles.
  const themeSerieses = useMemo(() => seriesCounts(settings?.themes || []), [settings]);
  const [bookFilter, setBookFilter] = useState<'home' | 'stories' | null>(null);
  // Free-text search over الكتب الجاهزة — the list is long enough that
  // scrolling for one book is slower than typing its name.
  const [bookSearch, setBookSearch] = useState('');
  // "Which books can I actually send to the printer?" — answered from storage,
  // because the theme record lists the object paths it EXPECTS and reads as
  // complete before anything is generated. Loaded on demand: it lists every
  // theme's folder, which is slower than a page render should be.
  const [readiness, setReadiness] = useState<any>(null);
  const [readinessBusy, setReadinessBusy] = useState(false);
  // A log of what was actually sent to the printer. Demo books and imported
  // PDFs kept no record at all, so when the boxes arrive there was nothing to
  // match them against — and when a send looked wrong, nothing to audit.
  const [printJobs, setPrintJobs] = useState<any[] | null>(null);
  // Who signed up and who came back — the dash could show orders but never people.
  const [customers, setCustomers] = useState<any | null>(null);
  // Who actually came to the site today — named where they signed in.
  const [visits, setVisits] = useState<any[] | null>(null);
  const [visitWeek, setVisitWeek] = useState<any[] | null>(null);
  /** What visitors looked at and where they stopped, not just how many came. */
  const [behaviour, setBehaviour] = useState<any | null>(null);
  // Sending a demo book is a real, paid print run, so it is deliberate: pick a
  // book, fill in who it ships to, confirm.
  const [sendBook, setSendBook] = useState<{ id: string; label?: string } | null>(null);
  const [sendForm, setSendForm] = useState({
    childName: '', fullName: '', phone: '',
    // Print choices. Empty means "whatever this kind of book normally uses",
    // which is what every job before this used.
    printColor: '', sheetType: '', lamination: '',
  });
  const [sendBusy, setSendBusy] = useState(false);
  // Free-text search over the ORDERS list. The card shows a short id like
  // #C496F510, which is the handle used to talk about an order — but there was
  // no way to look one up by it, so finding a specific order meant scrolling
  // the whole list. Matches the id, the customer and the child too, since the
  // question is usually "where is so-and-so's order".
  const [orderSearch, setOrderSearch] = useState('');
  // `${storyId|demoKey}:${surface}` while one publish toggle is in flight.
  const [visBusy, setVisBusy] = useState<string | null>(null);

  // A thread with one customer, opened from their row in the customers list.
  const [threadFor, setThreadFor] = useState<any | null>(null);
  const [thread, setThread] = useState<any[] | null>(null);
  const [threadBody, setThreadBody] = useState('');
  const [threadBusy, setThreadBusy] = useState(false);
  /** Unread counts per account, so a row can show that someone is waiting. */
  const [msgCounts, setMsgCounts] = useState<Record<string, any>>({});

  // The messenger: every conversation on the left, the open one on the right.
  const [convos, setConvos] = useState<any[] | null>(null);
  const [openConvo, setOpenConvo] = useState<any | null>(null);

  // Starting a conversation with someone who has never written to us. The
  // inbox only knows people with a thread, so the picker comes from the
  // customer list instead.
  const [newChatOpen, setNewChatOpen] = useState(false);

  const startChatWith = (userId: string) => {
    const c = (customers?.customers || []).find((x: any) => String(x._id || x.id) === String(userId));
    if (!c) return;
    setNewChatOpen(false);
    openConversation({ userId: String(c._id || c.id), name: c.name, email: c.email, waitingOnUs: 0 });
  };

  const loadConversations = async () => {
    try {
      const res = await adminApi.getConversations();
      if (res?.success) setConvos(res.conversations);
    } catch { setConvos([]); }
  };

  /** Open one conversation, and mark what they sent us as read. */
  const openConversation = async (c: any) => {
    setOpenConvo(c);
    setThread(null);
    setThreadFor({ _id: c.userId, id: c.userId, name: c.name });
    setThreadBody('');
    try {
      const res = await adminApi.getCustomerThread(c.userId);
      if (res?.success) setThread(res.messages);
      if (c.waitingOnUs > 0) {
        await adminApi.markThreadRead(c.userId);
        setConvos((prev) => (prev || []).map((x) => (x.userId === c.userId ? { ...x, waitingOnUs: 0 } : x)));
      }
    } catch { setThread([]); }
  };

  const openThread = async (c: any) => {
    const id = c._id || c.id;
    setThreadFor(threadFor && (threadFor._id || threadFor.id) === id ? null : c);
    setThread(null);
    setThreadBody('');
    if (threadFor && (threadFor._id || threadFor.id) === id) return;
    try {
      const res = await adminApi.getCustomerThread(id);
      if (res?.success) setThread(res.messages);
    } catch { setThread([]); }
  };

  const sendThreadMessage = async () => {
    if (!threadFor || !threadBody.trim() || threadBusy) return;
    setThreadBusy(true);
    const toastId = toast.loading(t('admin.msg_sending', 'جاري الإرسال...'));
    try {
      const id = threadFor._id || threadFor.id;
      const res = await adminApi.messageCustomer(id, threadBody.trim());
      if (!res?.success) throw new Error(res?.message);
      setThread((prev) => [...(prev || []), { id: res.message.id, body: threadBody.trim(), fromAdmin: true, readAt: null, createdAt: res.message.createdAt }]);
      setThreadBody('');
      // Keep the inbox in step: the row's preview and its ordering both just
      // changed, and re-reading is cheaper than trying to patch them by hand.
      if (tab === 'messages') loadConversations();
      // Say which actually happened. "Sent" over an email Resend refused would
      // leave the owner thinking the customer was told when they were not.
      toast.success(
        res.emailed
          ? t('admin.msg_sent_mail', 'تم الإرسال — وصلته إيميل كمان ✅')
          : res.emailReason === 'shared-sender'
            ? t('admin.msg_sent_no_mail', 'تم الإرسال — بيشوفها بحسابه. الإيميل ما انبعت (لازم توثيق النطاق بـ Resend).')
            : t('admin.msg_sent', 'تم الإرسال — بيشوفها لما يدخل حسابه ✅'),
        { id: toastId, duration: res.emailed ? 4000 : 7000 },
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.msg_failed', 'فشل الإرسال'), { id: toastId });
    } finally {
      setThreadBusy(false);
    }
  };

  // Sending a book into a customer's account: which book, and to whom.
  const [giftBook, setGiftBook] = useState<any | null>(null);
  const [giftUserId, setGiftUserId] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [giftBusy, setGiftBusy] = useState(false);

  /** The customer list is loaded by its own tab, so fetch it if it is missing. */
  const openGift = (b: any) => {
    setGiftBook(b);
    setGiftUserId('');
    setGiftNote('');
    if (!customers) loadCustomers();
  };

  const sendGift = async () => {
    if (!giftBook || !giftUserId || giftBusy) return;
    setGiftBusy(true);
    const toastId = toast.loading(t('admin.gift_sending', 'جاري الإرسال...'));
    try {
      const res = await adminApi.sendBookToCustomer({
        userId: giftUserId,
        childName: giftBook.childName,
        childGender: giftBook.childGender,
        theme: giftBook.theme,
        language: i18n.language,
        // A colouring book's artwork lives in its own fields, and the customer's
        // reader looks for it there — sending it as `cover`/`images` would show
        // the line art as if it were a story.
        ...(giftBook.isColoring
          ? { coloringCover: giftBook.cover, coloringImages: giftBook.images, coloringBackCover: giftBook.back }
          : { cover: giftBook.cover, images: giftBook.images, back: giftBook.back }),
        note: giftNote,
      });
      if (!res?.success) throw new Error(res?.message);
      toast.success(
        res.emailed
          ? t('admin.gift_sent_mail', 'تم إرسال الكتاب لحساب {{name}} — ووصلته رسالة وإيميل ✅', { name: res.customer?.name || '' })
          : t('admin.gift_sent', 'تم إرسال الكتاب لحساب {{name}} — والرسالة بتظهرله بحسابه ✅', { name: res.customer?.name || '' }),
        { id: toastId },
      );
      setGiftBook(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('admin.gift_failed', 'فشل الإرسال'), { id: toastId });
    } finally {
      setGiftBusy(false);
    }
  };

  /**
   * Every book in one list: the real stories customers/we generated, plus the
   * curated theme demos. They used to be two separate sections with different
   * shapes, so nothing could act on "all books" uniformly.
   */
  // A book is "mine" when its story belongs to the owner or anyone on the team;
  // everything else came from a real customer's order. Compared by user id, not
  // by name — the owner has more than one account (a personal and a business
  // one), and both must count as mine.
  const staffIds = useMemo(() => {
    const ids = new Set<string>();
    if (user?.id) ids.add(String(user.id));
    for (const m of team) if (m?._id) ids.add(String(m._id));
    return ids;
  }, [user, team]);

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
        // Demos have no owner and always count as the owner's own.
        isMine: staffIds.has(String(s.userId?._id || s.userId || '')),
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
        isMine: true,
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

    // The colouring books we have actually drawn. Their artwork lives on the
    // STORY theme — coloringCover / coloringImages / coloringBackCover — which
    // is neither a Story doc nor a showcase card, so neither list above could
    // see them and twenty sets sat in storage with nothing in الكتب الجاهزة
    // pointing at them. Cover-only sets are listed too: the cover is what the
    // shop card shows, and canPrint already separates a cover from a book.
    // Only the colouring THEMES already have a card of their own (زوو تلوين and
    // friends). Every story theme has a card too, but that card is its story —
    // excluding those would exclude every colouring book there is.
    const cardedColoringThemes = new Set(
      SHOWCASE_CARDS.filter((c) => c.themeId.includes('coloring')).map((c) => c.themeId),
    );
    const coloring = (settings?.themes || [])
      .filter((th: any) => (th.coloringCover || th.coloringImages?.length) && !cardedColoringThemes.has(th.id))
      .map((th: any) => ({
        key: `coloring-${th.id}`,
        isMine: true,
        childName: t('admin.coloring_book', 'كتاب تلوين'),
        theme: th.id,
        themeLabel: label(th.id),
        cover: th.coloringCover,
        back: th.coloringBackCover,
        images: th.coloringImages || [],
        // Show a PAGE, not the cover. A colouring book's cover is full colour
        // by design — it is the only coloured page in the book — so a row of
        // colour covers is indistinguishable from a row of stories, which is
        // the opposite of what this tab is being asked. The first line-art page
        // says what the book is at a glance. Printing still uses `cover`.
        thumb: th.coloringImages?.[0] || th.coloringCover,
        // No pages behind the cover: this is artwork for a shop card, not a
        // book anyone can print or colour, and it should not pretend otherwise.
        coverOnly: !th.coloringImages?.length,
        emoji: '🖍️',
        date: '',
        isDemo: true,
        isColoring: true,
        showcase: false,
        showcaseStories: false,
        homeTag: '',
        // No showcase card and no Story doc means no key to store a publish
        // flag against, and a toggle that saves nowhere is worse than no
        // toggle. These are viewable and printable from here; publishing one
        // means giving it a card first.
        noPublish: true,
        viewHref: `/coloring/${th.id}?name=${encodeURIComponent('باها')}`,
      }));

    return [...real, ...demos, ...coloring].map((b) => ({
      ...b,
      // The print build needs a cover, a back and at least one page.
      canPrint: !!b.cover && !!b.back && (b.images?.length ?? 0) > 0,
    }));
  }, [allStories, settings, t, i18n.language, staffIds]);

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

  const shownBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    return allBooks.filter((b: any) => {
      const onSurface = bookFilter === 'home' ? b.showcase : bookFilter === 'stories' ? b.showcaseStories : true;
      if (!onSurface) return false;
      if (!q) return true;
      // Match the child's name or the theme, in whatever script either is
      // written in — the owner may search "Baha" or "بهاء" for the same book.
      // Match what the owner can SEE. The card renders the name through
      // localizeName, so a book stored as "Baha" shows as بهاء on an Arabic
      // dashboard — searching بهاء found nothing, which looks broken.
      const shown = localizeName(b.childName || '', i18n.language);
      const hay = `${b.name || ''} ${b.childName || ''} ${shown} ${b.themeLabel || ''} ${b.theme || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allBooks, bookFilter, bookSearch, i18n.language]);

  /**
   * Orders matching the search box. Searching the SHORT id is the main case —
   * "#C496F510" is how an order gets referred to — so the id is matched with or
   * without the leading '#', in any case, and the full id works too.
   */
  const shownOrders = useMemo(() => {
    // Several orders get discussed together — "C496F510, 212CEB16, 2EE0257D" —
    // so pasting that whole list shows those three rather than nothing. Split on
    // commas and spaces, drop the '#', and match an order if it hits ANY term.
    const terms = orderSearch
      .toLowerCase()
      .split(/[\s,،]+/)
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);
    if (!terms.length) return orders;
    return orders.filter((o: any) => {
      const id = String(o._id || '');
      const child = o.storyId?.childName || '';
      const hay = [
        id,
        id.slice(-8),
        o.userId?.name,
        o.userId?.email,
        o.shippingAddress?.phone,
        o.shippingAddress?.fullName,
        child,
        localizeName(child, i18n.language),
        o.storyId?.theme,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return terms.some((term) => hay.includes(term));
    });
  }, [orders, orderSearch, i18n.language]);

  // Item 1: the owner's own books first, customers' orders in their own section
  // underneath — same cards, same buttons, just kept apart so the owner can tell
  // at a glance which books are real orders.
  const bookGroups = useMemo(() => [
    { id: 'mine', label: t('admin.books_mine', 'كتبي'), books: shownBooks.filter((b: any) => b.isMine) },
    { id: 'customers', label: t('admin.books_customers', 'كتب العملاء'), books: shownBooks.filter((b: any) => !b.isMine) },
  ].filter((g) => g.books.length > 0), [shownBooks, t]);

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
                { id: 'customers', label: t('admin.tab_customers', 'العملاء'), icon: Users },
                { id: 'visitors', label: t('admin.tab_visitors', 'الزوار'), icon: Eye },
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
                  <h2 className="font-arabic font-bold text-xl text-white">
                    {t('admin.orders_title')}
                    <span className="text-white/40 text-sm font-normal ms-2">
                      ({orders.length}{orderSearch.trim() ? ` · ${shownOrders.length}` : ''})
                    </span>
                  </h2>
                  <MagicButton onClick={fetchOrders} size="sm" variant="outline">{t('admin.refresh_data')}</MagicButton>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                  <input
                    type="text"
                    className="magic-input pe-10"
                    placeholder={t('admin.order_search_ph', 'ابحث برقم الطلب (#C496F510) أو اسم العميل أو الطفل…')}
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  {shownOrders.length === 0 && orderSearch.trim() ? (
                    <div className="text-center py-16 bg-white/5 rounded-3xl border border-dashed border-white/10">
                      <Search className="w-10 h-10 text-white/20 mx-auto mb-3" />
                      <p className="font-arabic text-white/40">
                        {t('admin.order_search_none', 'لا يوجد طلب مطابق لـ «{{q}}»', { q: orderSearch.trim() })}
                      </p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                      <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
                      <p className="font-arabic text-white/40">{t('admin.no_new_orders')}</p>
                    </div>
                  ) : (
                    shownOrders.map((order) => (
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
                              {order.bookpodStatus === 'cancelled' ? (
                                <StatusBadge tone="red" icon={AlertCircle}>{t('admin.bookpod_cancelled', 'أُلغي في المطبعة — يحتاج إرسالاً جديداً')}</StatusBadge>
                              ) : order.bookpodStatus === 'submitted' ? (
                                <StatusBadge tone="magic" icon={Package}>{t('admin.bookpod_in_production', 'قيد الإنتاج')}</StatusBadge>
                              ) : (
                                <StatusBadge tone="neutral" icon={Clock}>{t('admin.bookpod_pending', 'بانتظار الإرسال')}</StatusBadge>
                              )}
                              {/* A failed build looked identical to a healthy one
                                  waiting to be sent — one order sat 19 days that
                                  way. The reason was already on the order; it was
                                  just never shown. */}
                              {order.illustrationsStatus === 'failed' && (
                                <StatusBadge tone="red" icon={AlertCircle}>
                                  {t('admin.build_failed', 'فشل البناء')}
                                </StatusBadge>
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

                            {/* The backend has always recorded WHY a build died
                                (order.illustrationsError). Showing it turns a
                                silent "failed" into something actionable. */}
                            {order.illustrationsStatus === 'failed' && order.illustrationsError && (
                              <div className="mb-2.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                <p className="font-arabic text-red-300 text-xs leading-relaxed break-words" dir="auto">
                                  {buildErrorText(order.illustrationsError, t)}
                                </p>
                              </div>
                            )}

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
                                  <span className="w-4 text-center text-white/30 shrink-0">💰</span> {formatMoney(order.totalPrice, order.currency)}
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
                            {/* Card payments land in the BookPod account with no
                                webhook to tell us, so a person confirms them.
                                Shown only while the money is genuinely open —
                                a cash-on-delivery order is settled on delivery,
                                not here. */}
                            {order.paymentStatus === 'pending' && order.paymentMethod !== 'cash' && (
                              <ActionButton
                                variant="gold"
                                icon={CheckCircle}
                                active={confirmingPayId === order._id}
                                spin={confirmingPayId === order._id}
                                onClick={() => handleConfirmPayment(order)}
                                disabled={!!confirmingPayId}
                              >
                                {confirmingPayId === order._id
                                  ? t('admin.confirming_payment_short', 'جارٍ التأكيد...')
                                  : t('admin.confirm_payment', 'تأكيد الدفع')}
                              </ActionButton>
                            )}
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
            ) : tab === 'visitors' ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-arabic font-bold text-white text-lg">
                    👣 {t('admin.tab_visitors', 'الزوار')}
                  </h3>
                  <span className="font-arabic text-white/40 text-xs">
                    {t('admin.visitors_hint', 'مين دخل الموقع وشو تصفّح — بدون أسماء')}
                  </span>
                </div>
                {/* Whoever came, whether or not they ever made an account. The
                    customers tab answers "who signed up"; this answers "who
                    walked in", and they are different questions. */}
                {!visits ? (
                  <p className="font-arabic text-white/40 text-sm py-8 text-center">
                    {t('common.loading', 'جاري التحميل…')}
                  </p>
                ) : visits.length === 0 ? (
                  <p className="font-arabic text-white/40 text-sm py-8 text-center">
                    {t('admin.visitors_none', 'ما في زيارات مسجّلة بعد.')}
                  </p>
                ) : (
                  <div>
                      <div className="mt-5 pt-4 border-t border-white/10">
                        <p className="font-arabic text-white/70 text-[11px] font-bold mb-2">
                          👣 {t('admin.visits_week', 'آخر ٧ أيام')}
                        </p>

                        {/* Where people stop. Counted once per VISITOR per
                            step, so refreshing the wizard does not read as ten
                            people reaching it. */}
                        {behaviour && (
                          <div className="mb-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                              {[
                                { v: behaviour.visitors, l: t('admin.b_visitors', 'زائر') },
                                { v: behaviour.views, l: t('admin.b_views', 'صفحة') },
                                { v: behaviour.pagesPerVisitor, l: t('admin.b_per', 'صفحة/زائر') },
                                { v: behaviour.multiPage, l: t('admin.b_multi', 'تصفّح أكثر من صفحة') },
                              ].map((x, i) => (
                                <div key={i} className="text-center">
                                  <div className="font-arabic font-black text-white text-sm" dir="ltr">{x.v}</div>
                                  <div className="font-arabic text-white/40 text-[10px]">{x.l}</div>
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center gap-1.5 mb-2" dir="rtl">
                              {[
                                { n: behaviour.visitors, l: t('admin.f_visit', 'زار') },
                                { n: behaviour.funnel?.stories ?? 0, l: t('admin.f_stories', 'شاف القصص') },
                                { n: behaviour.funnel?.create ?? 0, l: t('admin.f_create', 'بلّش قصة') },
                                { n: behaviour.funnel?.checkout ?? 0, l: t('admin.f_checkout', 'وصل الدفع') },
                              ].map((st, i) => (
                                <div key={i} className="flex-1 text-center p-1.5 rounded-lg bg-black/20">
                                  <div className="font-arabic font-black text-gold-400 text-sm" dir="ltr">{st.n}</div>
                                  <div className="font-arabic text-white/45 text-[10px] leading-tight">{st.l}</div>
                                </div>
                              ))}
                            </div>

                            {behaviour.topPages?.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {behaviour.topPages.map((p: any) => (
                                  <span key={p.path} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-arabic text-[10px] text-white/55" dir="ltr">
                                    {p.path} · {p.visitors}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Seven days as bars — a spike or a dead week reads at
                            a glance, which a list of rows never does. */}
                        {visitWeek && visitWeek.length > 0 && (
                          <div className="flex items-end gap-1.5 h-16 mb-3" dir="ltr">
                            {visitWeek.map((d: any) => {
                              const peak = Math.max(...visitWeek.map((x: any) => x.visitors), 1);
                              return (
                                <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.visitors} زائر · ${d.views} صفحة`}>
                                  <div
                                    className="w-full rounded-t bg-gold-500/70"
                                    style={{ height: `${Math.max((d.visitors / peak) * 44, 3)}px` }}
                                  />
                                  <span className="text-[9px] text-white/35">{d.day.slice(5)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="space-y-1.5">
                          {visits.slice(0, 12).map((v: any, i: number) => (
                            <div key={i} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-arabic text-white/55">
                              <span className="text-white/35" dir="ltr">
                                {new Date(v.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {v.who ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
                                  {v.who.name || v.who.email}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                                  {t('admin.visits_anon', 'زائر بدون حساب')}
                                </span>
                              )}
                              <span className="text-white/40">{t('admin.visits_from', 'من')}: {v.source}</span>
                              {v.device && <span className="text-white/40">{v.device === 'mobile' ? '📱' : '💻'}</span>}
                              {v.lang && <span className="text-white/35 uppercase" dir="ltr">{v.lang}</span>}
                              {v.returning && (
                                <span className="px-1.5 py-0.5 rounded bg-magic-500/20 text-magic-200">
                                  {t('admin.visits_returning', 'رجع مرة ثانية')}
                                </span>
                              )}
                              <span className="text-white/40">
                                {t('admin.visits_pages', '{{n}} صفحة', { n: v.views })}
                              </span>
                              {v.paths?.length > 0 && (
                                <span className="text-white/30 truncate max-w-[45%]" dir="ltr" title={v.paths.join(' → ')}>
                                  {v.paths.slice(-3).join(' → ')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                  </div>
                )}
              </div>
            ) : tab === 'customers' ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-arabic font-bold text-white text-lg">
                    👥 {t('admin.tab_customers', 'العملاء')}
                    {customers && <span className="text-white/40 text-sm font-normal"> — {customers.summary.total}</span>}
                  </h3>
                  <button
                    onClick={loadCustomers}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white/80 border border-white/15 hover:bg-white/15 font-arabic text-sm font-bold"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {t('admin.customers_load', 'تحديث')}
                  </button>
                </div>

                <p className="font-arabic text-white/35 text-[11px] mb-3">
                  {t('admin.cust_online_hint', '«متصل الآن» = صاحب حساب فتح الموقع خلال آخر ٥ دقائق. الزائر بدون حساب لا يُحسب هنا. التحديث تلقائي كل ٣٠ ثانية.')}
                </p>

                {!customers ? (
                  <p className="font-arabic text-white/40 text-sm">{t('admin.customers_idle', 'جارٍ التحميل…')}</p>
                ) : (
                  <>
                    {/* The four numbers worth knowing before reading any row. */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                      {[
                        { v: customers.summary.online, l: t('admin.cust_online', 'متصل الآن'), live: true },
                        // Everyone who opened the site, account or not — the
                        // number the other three cannot see.
                        { v: customers.summary.visitorsToday ?? 0, l: t('admin.cust_visitors_today', 'زائر اليوم') },
                        { v: customers.summary.visitorsLast7 ?? 0, l: t('admin.cust_visitors_7', 'زائر هذا الأسبوع') },
                        { v: customers.summary.total, l: t('admin.cust_total', 'حساب') },
                      ].map((k) => (
                        <div key={k.l} className={`glass-card p-3 text-center ${k.live && k.v > 0 ? 'border-emerald-400/40' : ''}`}>
                          <div className={`font-arabic font-black text-2xl ${k.live && k.v > 0 ? 'text-emerald-400' : 'text-gold-500'}`} dir="ltr">{k.v}</div>
                          <div className="font-arabic text-white/45 text-[11px] mt-0.5 flex items-center justify-center gap-1">
                            {k.live && k.v > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                            {k.l}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="font-arabic text-white/45 text-[11px] mb-3">
                      {t('admin.cust_secondline', '{{views}} فتحة صفحة اليوم · {{logins}} دخلوا اليوم · {{buyers}} دفعوا فعلاً', {
                        views: customers.summary.viewsToday ?? 0,
                        logins: customers.summary.loginsToday,
                        buyers: customers.summary.buyers,
                      })}
                    </p>

                    {/* Who came today. A name appears only when that browser
                        is signed in — the rest stay as what they did, not who
                        they are. */}

                    <div className="space-y-2">
                      {customers.customers.map((c: any) => (
                        <div key={c._id} className="glass-card p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {c.online && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" title={t('admin.cust_online', 'متصل الآن')} />}
                                <span className="font-arabic font-bold text-white text-sm truncate">{c.name || '—'}</span>
                                {c.role === 'admin' && (
                                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-arabic">{t('admin.cust_admin', 'مدير')}</span>
                                )}
                                {c.paidOrders > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-arabic">
                                    {t('admin.cust_paid_badge', 'زبون')}
                                  </span>
                                )}
                              </div>
                              <a href={`mailto:${c.email}`} className="font-arabic text-white/50 text-[11px] hover:text-gold-500" dir="ltr">{c.email}</a>
                              {c.phone && <span className="font-arabic text-white/35 text-[11px] mr-2" dir="ltr">{c.phone}</span>}
                            </div>
                            <div className="text-left shrink-0">
                              {c.totalSpent > 0 && <div className="font-arabic font-black text-gold-500 text-lg" dir="ltr">{c.totalSpent}₪</div>}
                              <div className="font-arabic text-white/35 text-[11px]">
                                {t('admin.cust_orders', '{{n}} طلب', { n: c.orders })}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 pt-2 border-t border-white/10 font-arabic text-[11px] text-white/40">
                            <span>{t('admin.cust_joined', 'انضم')}: {new Date(c.createdAt).toLocaleDateString()}</span>
                            <span>
                              {t('admin.cust_last_login', 'آخر دخول')}:{' '}
                              {c.lastLoginAt ? new Date(c.lastLoginAt).toLocaleDateString() : t('admin.cust_never', 'لم يدخل بعد')}
                            </span>
                            {c.lastSeenAt && (
                              <span className={c.online ? 'text-emerald-300/80' : ''}>
                                {t('admin.cust_last_seen', 'آخر نشاط')}:{' '}
                                {c.online
                                  ? t('admin.cust_online', 'متصل الآن')
                                  : new Date(c.lastSeenAt).toLocaleString()}
                              </span>
                            )}
                            {/* What this account did on the site, not only what
                                it bought — days here, pages read, and where. */}
                            {c.visitDays > 0 && (
                              <span>
                                {t('admin.cust_visit_days', 'زار في {{d}} يوم · {{v}} صفحة', { d: c.visitDays, v: c.pageViews })}
                              </span>
                            )}
                            {c.device && <span>{c.device === 'mobile' ? '📱' : '💻'}</span>}
                            {c.lang && <span className="uppercase" dir="ltr">{c.lang}</span>}
                            {c.lastPages?.length > 0 && (
                              <span className="text-white/30 truncate max-w-[45%]" dir="ltr" title={c.lastPages.join(' → ')}>
                                {c.lastPages.join(' → ')}
                              </span>
                            )}
                            {c.recentLogins?.length > 1 && (
                              <span
                                className="text-white/35"
                                title={c.recentLogins.map((d: string) => new Date(d).toLocaleString()).join('\n')}
                              >
                                {t('admin.cust_login_times', 'آخر الدخولات: {{list}}', {
                                  list: c.recentLogins
                                    .slice(0, 3)
                                    .map((d: string) => new Date(d).toLocaleDateString())
                                    .join(' · '),
                                })}
                              </span>
                            )}
                            {/* Counting started the day this was added, so a
                                zero means "not since then", not "never". */}
                            {c.loginCount > 0 && <span>{t('admin.cust_logins', 'مرات الدخول')}: {c.loginCount}</span>}
                          </div>

                          {/* Writing to this person, and whether they read it. */}
                          <button
                            type="button"
                            onClick={() => openThread(c)}
                            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-arabic text-[11px] text-white/70 transition"
                          >
                            ✉️ {t('admin.cust_message', 'رسالة')}
                            {!!msgCounts[c._id]?.waitingOnUs && (
                              <span className="px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                                {msgCounts[c._id].waitingOnUs}
                              </span>
                            )}
                            {!!msgCounts[c._id]?.unreadByThem && (
                              <span
                                className="px-1.5 rounded-full bg-amber-500/25 text-amber-200 text-[10px]"
                                title={t('admin.cust_unread_by_them', 'أرسلتها ولسا ما فتحها')}
                              >
                                {t('admin.cust_not_opened', 'ما فتحها')}
                              </span>
                            )}
                          </button>

                          {threadFor && (threadFor._id || threadFor.id) === c._id && (
                            <div className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                              {thread === null ? (
                                <p className="font-arabic text-white/40 text-[11px]">{t('common.loading', 'جاري التحميل…')}</p>
                              ) : thread.length === 0 ? (
                                <p className="font-arabic text-white/40 text-[11px]">{t('admin.msg_none_yet', 'ما في رسائل مع هالعميل بعد.')}</p>
                              ) : (
                                <div className="space-y-2 max-h-56 overflow-y-auto mb-2">
                                  {thread.map((m: any) => (
                                    <div
                                      key={m.id}
                                      className={`p-2 rounded-xl ${m.fromAdmin ? 'bg-gold-500/10 border border-gold-500/20' : 'bg-white/10'}`}
                                    >
                                      <p className="font-arabic text-white/85 text-[12px] whitespace-pre-wrap">{m.body}</p>
                                      <p className="font-arabic text-white/35 text-[10px] mt-1">
                                        {m.fromAdmin ? t('admin.msg_you', 'أنت') : c.name}
                                        {' · '}
                                        {new Date(m.createdAt).toLocaleString()}
                                        {m.fromAdmin && (
                                          <span className={m.readAt ? ' text-emerald-300/70' : ' text-white/30'}>
                                            {' · '}
                                            {m.readAt
                                              ? t('admin.msg_read', 'قرأها ✓')
                                              : t('admin.msg_unread', 'لسا ما فتحها')}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <textarea
                                value={threadBody}
                                onChange={(e) => setThreadBody(e.target.value)}
                                rows={2}
                                placeholder={t('admin.msg_placeholder', 'اكتب رسالة لهالعميل…')}
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic placeholder:text-white/30"
                              />
                              <button
                                type="button"
                                onClick={sendThreadMessage}
                                disabled={!threadBody.trim() || threadBusy}
                                className="mt-1.5 w-full px-3 py-1.5 rounded-xl bg-gold-500 text-[#0a1628] font-arabic font-bold text-[11px] disabled:opacity-40"
                              >
                                {threadBusy ? t('admin.msg_sending', 'جاري الإرسال...') : t('admin.msg_send', 'إرسال')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : tab === 'messages' ? (
              <div>
                {/* The messenger: conversations with people who have an
                    account. Kept above the contact-form list because these can
                    be answered here — a contact-form message can only be read. */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-arabic font-bold text-white text-lg">
                    💬 {t('admin.chats_title', 'محادثات العملاء')}
                  </h3>
                  <div className="flex items-center gap-2">
                    {!!convos?.some((c) => c.waitingOnUs > 0) && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-bold font-arabic">
                        {t('admin.chats_waiting', '{{n}} بانتظار ردك', { n: convos.filter((c) => c.waitingOnUs > 0).length })}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setNewChatOpen((v) => !v)}
                      className="px-3 py-1.5 rounded-xl bg-gold-500/15 border border-gold-500/30 text-gold-300 font-arabic text-[11px] font-bold hover:bg-gold-500/25 transition"
                    >
                      ✚ {t('admin.chat_new', 'محادثة جديدة')}
                    </button>
                  </div>
                </div>

                {/* Write to anyone with an account, not only people who wrote
                    to us first. */}
                {newChatOpen && (
                  <div className="mb-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <select
                      defaultValue=""
                      onChange={(e) => e.target.value && startChatWith(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic"
                    >
                      <option value="">{t('admin.chat_pick_customer', 'اختر عميل لتبدأ معه محادثة…')}</option>
                      {(customers?.customers || []).map((c: any) => (
                        <option key={c._id || c.id} value={c._id || c.id} className="bg-[#0a1628]">
                          {c.name} — {c.email}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid gap-3 lg:grid-cols-[300px_minmax(0,1fr)] mb-8">
                  {/* Left: every conversation, newest first. */}
                  <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
                    {convos === null ? (
                      <p className="font-arabic text-white/40 text-xs p-3">{t('common.loading', 'جاري التحميل…')}</p>
                    ) : convos.length === 0 ? (
                      <p className="font-arabic text-white/40 text-xs p-3">
                        {t('admin.chats_none', 'ما في محادثات بعد. ابعت رسالة من تبويب العملاء لتبلّش وحدة.')}
                      </p>
                    ) : (
                      convos.map((c) => (
                        <button
                          key={c.userId}
                          type="button"
                          onClick={() => openConversation(c)}
                          className={`w-full text-right p-2.5 rounded-xl border transition ${
                            openConvo?.userId === c.userId
                              ? 'bg-gold-500/15 border-gold-500/40'
                              : 'bg-white/5 border-white/10 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-arabic font-bold text-white text-xs truncate">{c.name}</span>
                            {c.waitingOnUs > 0 && (
                              <span className="min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                                {c.waitingOnUs}
                              </span>
                            )}
                            <span className="ms-auto font-arabic text-white/30 text-[10px] shrink-0">
                              {new Date(c.lastAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-arabic text-white/45 text-[11px] truncate mt-0.5">
                            {c.lastFromAdmin ? `${t('admin.msg_you', 'أنت')}: ` : ''}{c.lastBody}
                          </p>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Right: the open conversation. */}
                  <div className="glass-card p-3 flex flex-col min-h-[18rem]">
                    {!openConvo ? (
                      <p className="font-arabic text-white/35 text-xs m-auto">
                        {t('admin.chats_pick', 'اختر محادثة لتقرأها وترد عليها')}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                          <div className="min-w-0">
                            <p className="font-arabic font-bold text-white text-sm truncate">{openConvo.name}</p>
                            <p className="font-arabic text-white/35 text-[11px] truncate" dir="ltr">{openConvo.email}</p>
                          </div>
                          <button
                            onClick={() => { setOpenConvo(null); setThread(null); }}
                            className="text-white/40 hover:text-white/80 text-xs font-arabic"
                          >
                            {t('common.close', 'إغلاق')}
                          </button>
                        </div>

                        <div className="flex-1 space-y-2 overflow-y-auto max-h-72 mb-2">
                          {thread === null ? (
                            <p className="font-arabic text-white/40 text-[11px]">{t('common.loading', 'جاري التحميل…')}</p>
                          ) : (
                            thread.map((m: any) => (
                              <div
                                key={m.id}
                                className={`p-2 rounded-xl max-w-[85%] ${
                                  m.fromAdmin
                                    ? 'bg-gold-500/15 border border-gold-500/25 ms-auto'
                                    : 'bg-white/10 me-auto'
                                }`}
                              >
                                <p className="font-arabic text-white/85 text-[12px] whitespace-pre-wrap">{m.body}</p>
                                {/* The book this message is about, if it came
                                    with one. Saying "here is your book" is only
                                    useful if the book is next to the words. */}
                                {m.book && (
                                  <Link
                                    to={m.book.isColoring ? `/book/${m.book.id}?view=coloring` : `/book/${m.book.id}`}
                                    className="mt-1.5 flex items-center gap-2 p-1.5 rounded-lg bg-black/20 border border-white/10 hover:border-gold-500/40 transition"
                                  >
                                    {m.book.cover && (
                                      <img src={objectPathToUrl(m.book.cover)} alt="" className="w-8 h-8 rounded object-cover" />
                                    )}
                                    <span className="font-arabic text-white/70 text-[11px] truncate">
                                      {m.book.isColoring ? '🖍️ ' : '📖 '}
                                      {m.book.childName}
                                    </span>
                                  </Link>
                                )}
                                <p className="font-arabic text-white/30 text-[10px] mt-1">
                                  {/* Who on the team answered. The customer
                                      never sees this — to them the shop is one
                                      voice — but the team needs to tell their
                                      own replies from a colleague's. */}
                                  {m.fromAdmin && m.adminName ? `${m.adminName} · ` : ''}
                                  {new Date(m.createdAt).toLocaleString()}
                                  {m.fromAdmin && (
                                    <span className={m.readAt ? ' text-emerald-300/70' : ''}>
                                      {' · '}{m.readAt ? t('admin.msg_read', 'قرأها ✓') : t('admin.msg_unread', 'لسا ما فتحها')}
                                    </span>
                                  )}
                                </p>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-2 items-end">
                          {/* A textarea, not an input: a message longer than a
                              greeting has paragraphs in it, and a single-line
                              input silently swallowed every line break — the
                              first two real messages went out as one run-on
                              blob. Enter still sends, shift+Enter breaks the
                              line, and the box grows to three rows. */}
                          <textarea
                            value={threadBody}
                            onChange={(e) => setThreadBody(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                if (threadBody.trim()) sendThreadMessage();
                              }
                            }}
                            rows={3}
                            placeholder={t('admin.msg_placeholder', 'اكتب رسالة لهالعميل… (shift+Enter لسطر جديد)')}
                            className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-white text-xs font-arabic placeholder:text-white/30 resize-y"
                          />
                          <button
                            type="button"
                            onClick={sendThreadMessage}
                            disabled={!threadBody.trim() || threadBusy}
                            className="px-4 py-2 rounded-xl bg-gold-500 text-[#0a1628] font-arabic font-bold text-xs disabled:opacity-40"
                          >
                            {threadBusy ? '…' : t('admin.msg_send', 'إرسال')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-arabic font-bold text-white text-lg">✉️ {t('admin.contact_form_title', 'رسائل نموذج التواصل')}</h3>
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
                        className="magic-input flex-1 min-w-[130px] sm:max-w-[190px] !py-1.5 text-sm"
                        title={t('admin.name')}
                        // Labelled like the EN/עב boxes beside it, because this
                        // one is the ARABIC name — it used to be titled just
                        // "Name" while DISPLAYING whatever language the dash was
                        // in and SAVING into the Arabic field. Editing it in
                        // Hebrew therefore overwrote the Arabic: 'ملف صوتي
                        // (Audio)' became '(Audio)', the leftover of the Hebrew
                        // 'קובץ שמע (Audio)' with the Hebrew words removed.
                        placeholder="ع"
                        dir="rtl"
                        value={pkg.label || ''}
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
                          className="magic-input flex-1 min-w-[72px] max-w-[104px] !py-1.5 text-sm"
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
                        className="magic-input flex-1 min-w-[70px] max-w-[86px] !py-1.5 text-sm text-center"
                        title={t('admin.price_sar')}
                        value={pkg.price}
                        onChange={(e) => {
                          const newPkgs = [...settings.bookPackages];
                          newPkgs[index].price = Number(e.target.value);
                          setSettings({ ...settings, bookPackages: newPkgs });
                        }}
                      />
                      {/* EN / HE descriptions — same rule as the names: blank
                          falls back to the built-in translation. */}
                      {(['en', 'he'] as const).map((lng) => (
                        <input
                          key={`desc-${lng}`}
                          type="text"
                          className="magic-input flex-1 min-w-[110px] max-w-[170px] !py-1.5 text-sm"
                          title={lng === 'en' ? t('admin.desc_en', 'الوصف بالإنجليزية') : t('admin.desc_he', 'الوصف بالعبرية')}
                          placeholder={lng === 'en' ? 'EN desc' : 'עב תיאור'}
                          value={pkg.descriptions?.[lng] || ''}
                          onChange={(e) => {
                            const newPkgs = [...settings.bookPackages];
                            newPkgs[index] = { ...newPkgs[index], descriptions: { ...(newPkgs[index].descriptions || {}), [lng]: e.target.value } };
                            setSettings({ ...settings, bookPackages: newPkgs });
                          }}
                        />
                      ))}
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

                {/* ── Import a finished book PDF onto a print trim ───────── */}
                <div className="mb-8 p-4 rounded-2xl bg-white/[0.04] border border-white/10">
                  <h3 className="font-arabic font-black text-white text-base mb-1 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-gold-500" /> {t('admin.import_title', 'استيراد كتاب جاهز')}
                  </h3>
                  <p className="font-arabic text-white/45 text-xs mb-3">
                    {t('admin.import_help', 'ارفع ملف PDF لكتاب جاهز، واختر المقاس المطلوب — نعيد ترتيبه بحواف طباعة ٣ مم ونعطيك ملفاً جاهزاً للطباعة.')}
                  </p>

                  {/* Nothing here can check who owns a book, so say it plainly
                      instead of implying the tool vetted anything. */}
                  <p className="font-arabic text-amber-300/90 text-[11px] mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    ⚠️ {t('admin.import_rights', 'استخدمه فقط لكتبك أو لكتاب تملك إذناً بطباعته. حقوق النشر مسؤوليتك.')}
                  </p>

                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block font-arabic text-white/60 text-xs mb-1">{t('admin.import_file', 'ملف الكتاب (PDF)')}</label>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => { setImportFile(e.target.files?.[0] || null); setImportResult(null); }}
                        className="text-xs text-white/60 file:mr-3 file:rounded-lg file:border-0 file:bg-gold-500/20 file:text-gold-300 file:px-3 file:py-1.5"
                      />
                    </div>
                    <div>
                      <label className="block font-arabic text-white/60 text-xs mb-1">{t('admin.import_trim', 'المقاس (مم)')}</label>
                      {/* dir=ltr on the whole group: a size is a left-to-right
                          pair, and on an RTL page the bidi algorithm was
                          reordering "150×220" so it read 220×150. */}
                      <div className="flex items-center gap-1" dir="ltr">
                        <input type="number" value={importTrim.w} onChange={(e) => setImportTrim({ ...importTrim, w: Number(e.target.value) })} className="magic-input !py-1.5 !px-2 text-sm w-[76px] text-center" />
                        <span className="text-white/30">×</span>
                        <input type="number" value={importTrim.h} onChange={(e) => setImportTrim({ ...importTrim, h: Number(e.target.value) })} className="magic-input !py-1.5 !px-2 text-sm w-[76px] text-center" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[[150, 220], [220, 220]].map(([w, h]) => (
                        <button
                          key={`${w}x${h}`}
                          type="button"
                          onClick={() => setImportTrim({ w, h })}
                          dir="ltr"
                          className={`px-2 py-1 rounded-lg font-arabic text-[11px] border transition ${
                            importTrim.w === w && importTrim.h === h
                              ? 'bg-gold-500/20 border-gold-500/50 text-gold-300'
                              : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
                          }`}
                        >
                          {w}×{h}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleImportBook}
                      disabled={importBusy || !importFile}
                      className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-[#0a1628] rounded-xl font-arabic font-bold text-sm hover:bg-gold-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      📐 {importBusy ? t('admin.import_working_short', 'جاري التجهيز...') : t('admin.import_go', 'جهّز للطباعة')}
                    </button>
                  </div>

                  {importResult && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                      <p className="font-arabic text-emerald-300 text-xs">
                        ✅ {t('admin.import_result', '{{n}} صفحة · الأصل {{sw}}×{{sh}} مم ← {{w}}×{{h}} مم (+٣ مم حواف)', {
                          n: importResult.pageCount, sw: importResult.sourceWidthMm, sh: importResult.sourceHeightMm,
                          w: importResult.widthMm, h: importResult.heightMm,
                        })}
                      </p>
                      {/* The margins move when the proportions differ — better
                          said here than discovered at the printer. */}
                      {importResult.aspectChanged && (
                        <p className="font-arabic text-amber-300/90 text-[11px]">
                          ⚠️ {t('admin.import_aspect', 'نسبة الصفحة اختلفت عن الأصل، لذا ستتغيّر الهوامش قليلاً. راجع الملف قبل الطباعة.')}
                        </p>
                      )}
                      <a
                        href={importResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-arabic text-xs transition"
                      >
                        <Download className="w-3.5 h-3.5" /> {t('admin.import_download', 'تحميل الملف الجاهز')}
                      </a>

                      {/* Send to BookPod. Needs the cover/interior split, which
                          a one-page PDF has no way to produce. */}
                      {importResult.coverPath && importResult.interiorPath && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                          <p className="font-arabic text-white/55 text-[11px]">
                            📦 {importCover
                              ? t('admin.import_send_title_own', 'إرسال إلى BookPod للطباعة — غلافك، والداخل كل الصفحات ({{n}}), استلام من المطبعة.', { n: importInterior().pages })
                              : t('admin.import_send_title', 'إرسال إلى BookPod للطباعة — الغلاف الصفحة ١، والداخل {{n}} صفحة، استلام من المطبعة.', { n: importResult.interiorPages })}
                          </p>
                          {/* Spelled out because it changes what gets printed:
                              with your own cover, page 1 is a page of the book. */}
                          {importCover && (
                            <p className="font-arabic text-emerald-300/80 text-[11px]">
                              ✅ {t('admin.import_keeps_all_pages', 'لن تُحذف أي صفحة — الصفحة الأولى تبقى داخل الكتاب لأن الغلاف صار ملفاً منفصلاً.')}
                            </p>
                          )}
                          {/* Design a real cover. Page 1 of a manuscript is body
                              text, so "the cover" is a page of paragraphs. */}
                          <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 space-y-2">
                            <p className="font-arabic text-white/70 text-[11px] font-bold">
                              🎨 {t('admin.import_cover_design_title', 'تصميم غلاف للكتاب')}
                            </p>
                            <p className="font-arabic text-white/45 text-[10px] leading-relaxed">
                              {t('admin.import_cover_design_desc', 'اكتب موضوع الكتاب بكلماتك، ونصمّم غلافاً كاملاً (وجه + كعب + ظهر) بمقاس الكتاب. صورة واحدة مدفوعة (~$0.04).')}
                            </p>
                            <div className="flex flex-wrap items-end gap-2">
                              <div className="flex-1 min-w-[180px]">
                                <label className="block font-arabic text-white/50 text-[10px] mb-1">{t('admin.import_cover_subject', 'موضوع الكتاب')}</label>
                                <input
                                  type="text"
                                  value={importSubject}
                                  onChange={(e) => setImportSubject(e.target.value)}
                                  placeholder={t('admin.import_cover_subject_ph', 'مثال: كتاب عن الفروق في التواصل بين الرجل والمرأة')}
                                  className="magic-input !py-1.5 text-sm w-full"
                                />
                              </div>
                              <button
                                onClick={handleDesignImportedCover}
                                disabled={importCoverBusy}
                                className="px-3 py-1.5 rounded-xl bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-400/30 hover:bg-fuchsia-500/25 font-arabic text-sm font-bold disabled:opacity-50"
                              >
                                {importCoverBusy
                                  ? t('admin.import_cover_designing_btn', 'جاري التصميم…')
                                  : t('admin.import_cover_design_btn', '🎨 صمّم الغلاف')}
                              </button>
                            </div>
                            {/* Or use the cover the owner already has. For a real
                                title this is usually the only cover that may
                                legitimately go on the book. */}
                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/10">
                              <span className="font-arabic text-white/45 text-[10px]">
                                {t('admin.import_cover_or_upload', 'أو ارفع غلافك الجاهز (PDF أو صورة):')}
                              </span>
                              <input
                                type="file"
                                accept="application/pdf,image/*"
                                disabled={importCoverBusy}
                                onChange={(e) => { handleUploadOwnCover(e.target.files?.[0] || null); e.target.value = ''; }}
                                className="text-[11px] font-arabic text-white/60 file:me-2 file:px-2.5 file:py-1 file:rounded-lg file:border-0 file:bg-gold-500/20 file:text-gold-300 file:font-bold file:cursor-pointer"
                              />
                            </div>

                            {importCover && (
                              <div className="pt-1">
                                {/* The whole flat sheet, big enough to actually
                                    check. It was a 64px thumbnail, which is no
                                    way to judge a cover you are about to pay to
                                    print — the fold, the spine text and the back
                                    were all invisible. Click opens it full size. */}
                                <a href={importCover.previewUrl} target="_blank" rel="noreferrer" className="block group">
                                  <img
                                    src={importCover.previewUrl}
                                    alt=""
                                    className="w-full max-h-72 object-contain rounded-xl border border-white/15 bg-black/40 group-hover:border-gold-500/50 transition"
                                  />
                                </a>
                                {/* Which third is which. RTL books are laid out
                                    front|spine|back, so the front is on the LEFT
                                    of the flat sheet — the opposite of what most
                                    people expect. */}
                                <div className="flex mt-1 mb-2 text-center font-arabic text-[10px] text-white/45" dir="ltr">
                                  <div className="flex-1">{importCover.rtl === false ? t('admin.cover_back', 'الظهر') : t('admin.cover_front', 'الوجه')}</div>
                                  <div className="w-16 text-gold-400/70">{t('admin.cover_spine', 'الكعب')}</div>
                                  <div className="flex-1">{importCover.rtl === false ? t('admin.cover_front', 'الوجه') : t('admin.cover_back', 'الظهر')}</div>
                                </div>
                                <div className="font-arabic text-emerald-300/90 text-[10px] leading-relaxed">
                                  {importCover.source === 'upload-pdf'
                                    ? t('admin.import_cover_ready_own', 'غلافك جاهز — سيُرسل كما هو بدل الصفحة الأولى.')
                                    : importCover.source === 'upload-image'
                                      ? t('admin.import_cover_ready_own_img', 'غلافك جاهز — رُتّب كغلاف كامل بدل الصفحة الأولى.')
                                      : t('admin.import_cover_ready', 'الغلاف جاهز — سيُرسل بدل الصفحة الأولى.')}
                                  {importCover.widthMm && (
                                    <span className="block text-white/35" dir="ltr">
                                      {importCover.widthMm}×{importCover.heightMm}mm{importCover.spineMm ? ` · spine ${importCover.spineMm}mm` : ''}
                                    </span>
                                  )}
                                  <button
                                    onClick={() => setImportCover(null)}
                                    className="mt-1 text-white/40 hover:text-white/70 underline"
                                  >
                                    {t('admin.import_cover_clear', 'تراجع — استخدم الصفحة الأولى')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* The wraparound caveat — only while page 1 is still the cover. */}
                          {!importCover && (
                            <p className="font-arabic text-amber-300/85 text-[11px]">
                              ⚠️ {t('admin.import_cover_note', 'الغلاف المرسل هو الوجه الأمامي فقط (بدون كعب أو ظهر). إن كان لديك غلاف كامل جهّزه وأرسله من BookPod مباشرة.')}
                            </p>
                          )}
                          <div className="flex flex-wrap items-end gap-2">
                            <div>
                              <label className="block font-arabic text-white/50 text-[10px] mb-1">{t('admin.import_recipient', 'اسم المستلم')}</label>
                              <input type="text" value={importSend.name} onChange={(e) => setImportSend({ ...importSend, name: e.target.value })} className="magic-input !py-1.5 text-sm max-w-[160px]" />
                            </div>
                            <div>
                              <label className="block font-arabic text-white/50 text-[10px] mb-1">{t('admin.import_phone', 'رقم الهاتف')}</label>
                              <input type="tel" value={importSend.phone} onChange={(e) => setImportSend({ ...importSend, phone: e.target.value })} className="magic-input !py-1.5 text-sm max-w-[140px]" dir="ltr" />
                            </div>
                            <div>
                              <label className="block font-arabic text-white/50 text-[10px] mb-1">{t('admin.import_qty', 'عدد النسخ')}</label>
                              <input type="number" min={1} value={importSend.qty} onChange={(e) => setImportSend({ ...importSend, qty: Math.max(1, Number(e.target.value) || 1) })} className="magic-input !py-1.5 !px-2 text-sm w-[70px] text-center" dir="ltr" />
                            </div>

                            {/* How this book is printed. The size already
                                comes from the trim chosen above; these are the
                                three BookPod also decides per book. Left on the
                                default, nothing changes. */}
                            <div>
                              <label className="block font-arabic text-white/50 text-[10px] mb-1">{t('admin.print_color_label', 'الطباعة')}</label>
                              <select
                                value={importSend.printColor}
                                onChange={(e) => setImportSend({ ...importSend, printColor: e.target.value })}
                                className="magic-input !py-1.5 !px-2 text-sm"
                              >
                                <option value="" className="bg-[#0a1628]">{t('admin.print_default_short', 'الافتراضي')}</option>
                                <option value="color" className="bg-[#0a1628]">{t('admin.print_color', 'ملوّن')}</option>
                                <option value="bw" className="bg-[#0a1628]">{t('admin.print_bw', 'أبيض وأسود')}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-arabic text-white/50 text-[10px] mb-1">{t('admin.paper_label', 'الورق')}</label>
                              <select
                                value={importSend.sheetType}
                                onChange={(e) => setImportSend({ ...importSend, sheetType: e.target.value })}
                                className="magic-input !py-1.5 !px-2 text-sm"
                              >
                                <option value="" className="bg-[#0a1628]">{t('admin.print_default_short', 'الافتراضي')}</option>
                                <option value="chromo170" className="bg-[#0a1628]">{t('admin.paper_chromo', 'كوشيه ١٧٠ غرام')}</option>
                                <option value="white110" className="bg-[#0a1628]">{t('admin.paper_white', 'أبيض عادي ١١٠ غرام')}</option>
                              </select>
                            </div>
                            <div>
                              <label className="block font-arabic text-white/50 text-[10px] mb-1">{t('admin.lam_label', 'الغلاف')}</label>
                              <select
                                value={importSend.lamination}
                                onChange={(e) => setImportSend({ ...importSend, lamination: e.target.value })}
                                className="magic-input !py-1.5 !px-2 text-sm"
                              >
                                <option value="" className="bg-[#0a1628]">{t('admin.print_default_short', 'الافتراضي')}</option>
                                <option value="matt" className="bg-[#0a1628]">{t('admin.lam_matt', 'مطفي (مات)')}</option>
                                <option value="flat" className="bg-[#0a1628]">{t('admin.lam_flat', 'لامع (flat)')}</option>
                                <option value="none" className="bg-[#0a1628]">{t('admin.lam_none', 'بدون تغليف')}</option>
                              </select>
                            </div>
                            <button
                              onClick={handleSendImported}
                              disabled={importSending}
                              className="flex items-center gap-1.5 px-3 py-2 bg-magic-600 hover:bg-magic-500 text-white rounded-xl font-arabic font-bold text-xs transition disabled:opacity-40"
                            >
                              <Package className="w-3.5 h-3.5" />
                              {importSending ? t('admin.sending', 'جارٍ الإرسال...') : t('admin.import_send_btn', 'إرسال إلى BookPod')}
                            </button>
                            {/* Check before you print: the exact pair that the
                                send would upload, including whichever cover is
                                active. Sits BEFORE the send button in reading
                                order for the same reason. */}
                            <button
                              onClick={handleSaveImportedFiles}
                              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/15 text-white/80 rounded-xl font-arabic font-bold text-xs transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                              {t('admin.import_save_files', 'حفظ الملفات للمراجعة')}
                            </button>
                          </div>
                          {importJob && (
                            <p className="font-arabic text-emerald-300 text-[11px]">
                              ✅ {t('admin.import_job', 'رقم الطلب لدى BookPod: {{id}} · {{n}} نسخة', { id: importJob.jobId, n: importJob.quantity })}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                    <FlagSwitch
                      on={!!settings.allowSkipPhoto}
                      label={t('admin.flag_skip_photo', 'السماح بالطلب بدون صورة الطفل')}
                      help={t('admin.flag_skip_photo_help', 'مطفأ = صورة الطفل إجبارية في الخطوة ١')}
                      onToggle={() => saveFlag('allowSkipPhoto', !settings.allowSkipPhoto)}
                    />
                    {/* Turning this on used to guarantee a failed build: the
                        illustrator needs a reference photo, so a photo-less order
                        was paid for and then died at the first page. Checkout now
                        refuses those orders, so the flag is safe but pointless —
                        say so rather than letting it look usable. */}
                    {!!settings.allowSkipPhoto && (
                      <div className="w-full px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/25 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="font-arabic text-red-300 text-xs leading-relaxed">
                          {t('admin.flag_skip_photo_warn', 'الرسومات تحتاج صورة الطفل. مع تفعيل هذا الخيار سيصل العميل إلى الدفع ثم يُرفض طلبه، لأن الكتاب لا يمكن إنشاؤه بدون صورة.')}
                        </p>
                      </div>
                    )}
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

                      {/* The series/part chip lived here. Removed on request —
                          the owner knows the order, and it crowded the row. The
                          series fields themselves stay on the theme. */}

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

                      {/* Build the colouring version of THIS story: same
                          sixteen scenes, drawn as line art. Nothing to write —
                          the story already says what happens on each page. */}
                      {/* Only offered once there is something to open — the
                          build button below is what creates it. */}
                      {!!theme.coloringImages?.length && (
                        <Link
                          to={`/book/${theme.id}?view=coloring`}
                          target="_blank"
                          className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 rounded-lg font-arabic text-xs transition-colors border border-amber-500/20"
                        >
                          <Eye className="w-3.5 h-3.5" /> {t('admin.view_coloring_short', 'عرض التلوين')}
                        </Link>
                      )}

                      <button
                        onClick={() => handleGenerateColoringFor(theme)}
                        disabled={generatingThemeId === theme.id}
                        title={t('admin.coloring_build_help', 'يولّد كتاب التلوين من مشاهد هذه القصة نفسها')}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg font-arabic text-xs transition-colors border border-amber-500/30 disabled:opacity-50"
                      >
                        🖍️ {theme.coloringCover
                          ? t('admin.coloring_rebuild', 'تلوين ↻')
                          : t('admin.coloring_build', 'كتاب تلوين')}
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

                      {/* Series/part, beside delete at the end of the row. Just
                          the link glyph and the part number — the row is already
                          crowded, and the full "سلسلة البحر · الجزء ٢" is one
                          hover away. Owner-facing only; customers see a plain
                          title. */}
                      {theme.seriesPart && seriesBadge(theme, themeSerieses, 'ar') && (
                        <span
                          className="shrink-0 w-7 h-7 inline-flex items-center justify-center gap-0.5 rounded-lg bg-gold-500/15 border border-gold-500/30 text-gold-400/90 font-arabic text-[11px] leading-none cursor-help"
                          title={`${theme.seriesName || ''} · ${seriesBadge(theme, themeSerieses, 'ar')}`}
                        >
                          🔗<span className="font-bold">{theme.seriesPart}</span>
                        </span>
                      )}
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

                {/* Colouring books are not authored here any more. A colouring
                    order is the STORY the customer picked, drawn as line art
                    with their own child in it — zoo pages for the zoo story —
                    so there is nothing separate to write or generate. */}
              </div>
            ) : tab === 'showcase' ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-arabic font-bold text-white text-lg">
                    📚 {t('admin.tab_showcase', 'الكتب الجاهزة')}
                    {/* Total, and how many the current filter is showing. */}
                    <span className="text-white/40 text-sm font-normal mr-2">
                      ({allBooks.length}{bookFilter || bookSearch.trim() ? ` · ${shownBooks.length}` : ''})
                    </span>
                  </h3>
                  <MagicButton onClick={fetchAllStories} size="sm" variant="outline">{t('admin.refresh_data')}</MagicButton>
                </div>
                <p className="font-arabic text-white/50 text-sm mb-3">
                  {t('admin.showcase_desc_v2', 'كل الكتب التي أنشأتها — اعرض الكتاب أو جهّز ملف الطباعة.')}
                </p>

                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-white/30 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" />
                  <input
                    type="search"
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    placeholder={t('admin.book_search_ph', 'ابحث باسم الطفل أو الموضوع…')}
                    className="magic-input !py-2 text-sm ps-9"
                  />
                </div>

                {/* ── Print readiness. Before paying for a print run, the one
                       question that matters is which books actually have every
                       image. The theme record cannot answer it: the seed writes
                       the expected paths, so a book reads as complete before
                       anything is generated. This asks storage. ── */}
                <div className="mb-6 p-4 rounded-2xl bg-emerald-500/[0.07] border-2 border-emerald-400/30">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h3 className="font-arabic font-black text-emerald-300 text-base flex items-center gap-2">
                      <Package className="w-4 h-4" /> {t('admin.readiness_title', 'جاهزية الكتب للطباعة')}
                      {readiness && (
                        <span className="font-arabic text-white/70 text-sm font-normal">
                          — {t('admin.readiness_count', '{{ready}} من {{total}} جاهز', { ready: readiness.readyCount, total: readiness.total })}
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={loadReadiness}
                      disabled={readinessBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/25 font-arabic text-sm font-bold disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${readinessBusy ? 'animate-spin' : ''}`} />
                      {readinessBusy ? t('admin.readiness_checking_btn', 'جاري الفحص…') : t('admin.readiness_check', 'افحص الآن')}
                    </button>
                  </div>
                  <p className="font-arabic text-white/45 text-[11px] leading-relaxed mb-2">
                    {t('admin.readiness_desc', 'يفحص الصور الموجودة فعلاً في المخزن (١٣ صفحة + غلاف + صورة ختامية) — لا الأسماء المسجلة في القصة.')}
                  </p>

                  {!readiness ? (
                    <p className="font-arabic text-white/35 text-xs">{t('admin.readiness_idle', 'اضغط «افحص الآن» لعرض القائمة.')}</p>
                  ) : (
                    <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                      {readiness.books.map((b: any) => (
                        <div
                          key={b.id}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-arabic flex items-center gap-2 ${
                            b.ready
                              ? 'bg-emerald-500/10 border-emerald-400/25 text-emerald-100'
                              : 'bg-amber-500/10 border-amber-400/30 text-amber-100'
                          }`}
                        >
                          {b.ready ? <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />}
                          <span className="flex-1 truncate">{b.label || b.id}</span>
                          {b.ready ? (
                            // Ready means the files exist — this is the only
                            // place that can act on that without hunting for
                            // the book in the viewer first.
                            <button
                              onClick={() => {
                                setSendBook({ id: b.id, label: b.label });
                                setSendForm({ childName: '', fullName: '', phone: '', printColor: '', sheetType: '', lamination: '' });
                              }}
                              className="shrink-0 px-2 py-0.5 rounded-lg bg-emerald-500/25 text-emerald-100 border border-emerald-400/40 hover:bg-emerald-500/40 font-bold"
                            >
                              📤 {t('admin.readiness_send', 'أرسل')}
                            </button>
                          ) : (
                            // The gaps by number — "11 of 13" does not say which
                            // page to regenerate.
                            <span className="text-amber-300/80 shrink-0 max-w-[55%] truncate" title={b.missing.join(' · ')}>
                              {b.missing.join(' · ')}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Deliberately a second step: a print run costs money, so the
                      book, the name printed inside it and who collects it are
                      all confirmed before anything is sent. */}
                  {/* Choose who gets the book. Sits above the print panel
                      because it is the cheaper, more common action: no paper,
                      no courier, nothing to undo at a printer. */}
                  {giftBook && (
                    <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-arabic text-emerald-100 text-xs font-bold">
                          🎁 {t('admin.gift_panel_title', 'إرسال «{{book}}» لحساب عميل', { book: giftBook.themeLabel || giftBook.childName })}
                        </p>
                        <button onClick={() => setGiftBook(null)} className="text-white/40 hover:text-white/80 text-xs font-arabic">
                          {t('common.cancel', 'إلغاء')}
                        </button>
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-2 mb-2">
                        <select
                          value={giftUserId}
                          onChange={(e) => setGiftUserId(e.target.value)}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic"
                        >
                          <option value="">{t('admin.gift_pick', 'اختر العميل…')}</option>
                          {(customers?.customers || []).map((c: any) => (
                            <option key={c._id || c.id} value={c._id || c.id} className="bg-[#0a1628]">
                              {c.name} — {c.email}
                            </option>
                          ))}
                        </select>
                        <input
                          value={giftNote}
                          onChange={(e) => setGiftNote(e.target.value)}
                          placeholder={t('admin.gift_note', 'رسالة بتوصله مع الكتاب (اختياري)')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic placeholder:text-white/30"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={sendGift}
                        disabled={!giftUserId || giftBusy}
                        className="w-full px-3 py-2 rounded-xl bg-emerald-500 text-[#0a1628] font-arabic font-bold text-xs disabled:opacity-40"
                      >
                        {giftBusy ? t('admin.gift_sending', 'جاري الإرسال...') : t('admin.gift_send', 'أرسل الكتاب لحسابه')}
                      </button>
                      <p className="font-arabic text-white/40 text-[10px] mt-1.5">
                        {t('admin.gift_hint2', 'الكتاب بيظهر بحسابه ويقدر يقرأه — بدون طلب وبدون دفع. وبتوصله رسالة بالمحادثة كمان.')}
                      </p>
                    </div>
                  )}

                  {sendBook && (
                    <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/30">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-arabic text-emerald-100 text-xs font-bold">
                          📤 {t('admin.send_panel_title', 'إرسال «{{book}}» للطباعة', { book: sendBook.label || sendBook.id })}
                        </p>
                        <button onClick={() => setSendBook(null)} className="text-white/40 hover:text-white/80 text-xs font-arabic">
                          {t('common.cancel', 'إلغاء')}
                        </button>
                      </div>
                      <div className="grid gap-1.5 sm:grid-cols-3 mb-2">
                        <input
                          value={sendForm.childName}
                          onChange={(e) => setSendForm({ ...sendForm, childName: e.target.value })}
                          placeholder={t('admin.send_child_name', 'اسم الطفل داخل الكتاب')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic placeholder:text-white/30"
                        />
                        <input
                          value={sendForm.fullName}
                          onChange={(e) => setSendForm({ ...sendForm, fullName: e.target.value })}
                          placeholder={t('admin.send_receiver', 'اسم المستلم')}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic placeholder:text-white/30"
                        />
                        <input
                          value={sendForm.phone}
                          onChange={(e) => setSendForm({ ...sendForm, phone: e.target.value })}
                          placeholder={t('admin.send_phone', 'رقم الهاتف')}
                          dir="ltr"
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic placeholder:text-white/30"
                        />
                      </div>

                      {/* How this copy is printed. Left on «حسب نوع الكتاب» it
                          behaves exactly as every job so far: a story in colour
                          on coated stock, a colouring book black-and-white on
                          plain paper. */}
                      <div className="grid gap-1.5 sm:grid-cols-3 mb-2">
                        <select
                          value={sendForm.printColor}
                          onChange={(e) => setSendForm({ ...sendForm, printColor: e.target.value })}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic"
                        >
                          <option value="" className="bg-[#0a1628]">{t('admin.print_color_default', 'الطباعة: حسب نوع الكتاب')}</option>
                          <option value="color" className="bg-[#0a1628]">{t('admin.print_color', 'ملوّن')}</option>
                          <option value="bw" className="bg-[#0a1628]">{t('admin.print_bw', 'أبيض وأسود')}</option>
                        </select>
                        <select
                          value={sendForm.sheetType}
                          onChange={(e) => setSendForm({ ...sendForm, sheetType: e.target.value })}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic"
                        >
                          <option value="" className="bg-[#0a1628]">{t('admin.paper_default', 'الورق: حسب نوع الكتاب')}</option>
                          <option value="chromo170" className="bg-[#0a1628]">{t('admin.paper_chromo', 'كوشيه ١٧٠ غرام')}</option>
                          <option value="white110" className="bg-[#0a1628]">{t('admin.paper_white', 'أبيض عادي ١١٠ غرام')}</option>
                        </select>
                        <select
                          value={sendForm.lamination}
                          onChange={(e) => setSendForm({ ...sendForm, lamination: e.target.value })}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 border border-white/15 text-white text-[11px] font-arabic"
                        >
                          <option value="" className="bg-[#0a1628]">{t('admin.lam_default', 'الغلاف: الافتراضي')}</option>
                          <option value="matt" className="bg-[#0a1628]">{t('admin.lam_matt', 'مطفي (مات)')}</option>
                          <option value="flat" className="bg-[#0a1628]">{t('admin.lam_flat', 'لامع (flat)')}</option>
                          <option value="none" className="bg-[#0a1628]">{t('admin.lam_none', 'بدون تغليف')}</option>
                        </select>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-arabic text-amber-200/70 text-[10px]">
                          ⚠️ {t('admin.send_cost_note', 'طباعة حقيقية ومدفوعة — نسخة واحدة، استلام من المطبعة في القدس.')}
                        </p>
                        <button
                          onClick={submitReadyBook}
                          disabled={sendBusy}
                          className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-500/30 text-emerald-50 border border-emerald-400/50 hover:bg-emerald-500/45 font-arabic text-[11px] font-bold disabled:opacity-50"
                        >
                          {sendBusy ? t('admin.import_sending', 'جاري الإرسال إلى BookPod...') : t('admin.send_now', 'إرسال إلى BookPod')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* What was actually SENT. Customer orders carry their BookPod
                      job on the order card; demo books and imported PDFs kept
                      nothing, so a print run left no trace anywhere. */}
                  {printJobs && printJobs.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="font-arabic text-white/70 text-[11px] font-bold mb-1.5">
                        📦 {t('admin.sent_log_title', 'آخر ما أُرسل للطباعة')}
                      </p>
                      <div className="space-y-1">
                        {printJobs.slice(0, 8).map((j: any) => (
                          <div key={j._id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-arabic text-white/60">
                            <span className="text-white/35" dir="ltr">{new Date(j.sentAt || j.createdAt).toLocaleDateString()}</span>
                            <span className="text-white/85 truncate max-w-[45%]">{j.title}</span>
                            {j.bookpodJobId && (
                              <span className="px-1.5 py-0.5 rounded bg-magic-500/20 text-magic-200" dir="ltr">#{j.bookpodJobId}</span>
                            )}
                            {j.quantity > 1 && <span className="text-white/40">× {j.quantity}</span>}
                            {j.coverSource && (
                              <span className="text-white/40">
                                {j.coverSource === 'page-1'
                                  ? t('admin.sent_cover_page1', 'الغلاف: الصفحة ١')
                                  : t('admin.sent_cover_own', 'الغلاف: ملف منفصل')}
                              </span>
                            )}
                            {/* BookPod's own word on the job, so a cancelled
                                send is never mistaken for one in progress. */}
                            {/* A send that never reached BookPod is the one
                                worth seeing first, not hiding. */}
                            {j.failed && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300" title={j.error || ''}>
                                {t('admin.sent_failed', 'لم يصل — فشل الإرسال')}
                              </span>
                            )}
                            {j.bookpodStatus && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  j.bookpodStatus === 'CANCELLED'
                                    ? 'bg-red-500/15 text-red-300/80'
                                    : j.bookpodStatus === 'READY_FOR_DELIVERY'
                                      ? 'bg-emerald-500/15 text-emerald-300/80'
                                      : 'bg-white/10 text-white/45'
                                }`}
                                dir="ltr"
                              >
                                {String(j.bookpodStatus).replace(/_/g, ' ').toLowerCase()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

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
                  <div className="space-y-6">
                  {bookGroups.map((g) => (
                  <div key={g.id}>
                  <h4 className="font-arabic font-bold text-white/70 text-sm mb-2 flex items-center gap-2">
                    {g.id === 'customers' ? '🧾' : '⭐'} {g.label}
                    <span className="text-white/35 font-normal">({g.books.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {g.books.map((b: any) => (
                      <div key={b.key} className="bg-dark-700/50 rounded-2xl border border-white/5 p-3 flex flex-col gap-2.5 hover:border-gold-500/30 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {(b.thumb || b.cover) ? (
                            <img
                              src={objectPathToUrl(b.thumb || b.cover)}
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
                            {/* Says out loud what the disabled print button only
                                implies: there is a cover here and nothing else. */}
                            {b.coverOnly && (
                              <p className="font-arabic text-amber-400/80 text-[11px]">
                                {t('admin.cover_only', 'غلاف فقط — بدون صفحات تلوين')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Publish toggles — every book with somewhere to save
                            the flag gets both. Green = live on that surface. */}
                        <div className={`grid grid-cols-2 gap-1.5 ${b.noPublish ? 'hidden' : ''}`}>
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

                        {/* Put this book into a customer's account. */}
                        <button
                          type="button"
                          onClick={() => openGift(b)}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-arabic font-bold text-xs transition"
                        >
                          🎁 {t('admin.book_gift', 'أرسله لحساب عميل')}
                        </button>
                      </div>
                    ))}
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
                            <span className="font-arabic text-white/60 text-xs whitespace-nowrap">{formatMoney(o.totalPrice, o.currency)}</span>
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
