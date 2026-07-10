// ─── StoryBook — Main Orchestrator ────────────────────────────────────────────
// Renders all 34 pages in the correct order for a given story + child data.
// Admin-only: protected by AdminBookGuard in App.tsx.
//
// PRINT FORMAT: 220mm × 220mm square (Tali Toons style).
// Click "🖨️ طباعة الكتاب" to open the browser print dialog — every .book-page
// becomes its own 220mm×220mm page automatically via @page + print CSS.

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { adminApi } from '../../api/adminApi';
import { uploadApi } from '../../api/uploadApi';
import { toDisplayUrl, objectPathToUrl } from '../../api/mediaUrl';
import FrontCover        from './FrontCover';
import TitlePage         from './TitlePage';
import FanoosPage        from './FanoosPage';
import DedicationPage    from './DedicationPage';
import { StoryTextPage, StoryImagePage } from './StoryPages';
import FinalStoryPage    from './FinalStoryPage';
import CopyrightPage     from './CopyrightPage';
import BackCover         from './BackCover';
import { STORIES, findStory } from '../../data/stories';
import type { StoryDefinition } from '../../data/stories/types';
import { detectGender, applyGenderTokens, type Gender } from '../../utils/gender';
import { localizeName } from '../../utils/translit';

// ── Helper ─────────────────────────────────────────────────────────────────────
// Substitutes the name AND resolves Arabic gender tokens {masc|fem}.
function personalize(text: string, name: string, gender: Gender): string {
  if (!text) return '';
  const named = text
    .replace(/\[NAME\]/gi, name)
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\s*name\s*\}/gi, name);
  return applyGenderTokens(named, gender);
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface StoryBookProps {
  storyId?:      string;   // Story ID from STORIES registry
  childName?:    string;   // Child's display name
  childGender?:  Gender;   // From the wizard; if omitted we detect from the name
  childPhoto?:   string;   // URL / path to child's photo
  realPhoto?:    string;   // The actual uploaded kid photo (used in the back-cover circle)
  coverScene?:   string;   // Generated full-scene front-cover image (preferred on the cover)
  backCoverPhoto?: string; // Generated portrait for the back cover (falls back to childPhoto)
  audioUrl?:     string;   // URL encoded into final-page QR
  showNameInput?: boolean; // Show the demo name input bar
  customPages?:  any[];    // Dynamically overridden story pages from database
  generatedImages?: string[];                                              // Browser-ready AI image URLs, one per body image page
  onGenerated?: (images: string[], portrait: string, cover?: string) => void; // Called after a successful generation
  // Raw GCS object paths (NOT display URLs) for the "Download print-ready PDF"
  // button — the backend needs the real object paths to fetch + compose the PDF.
  rawCoverPath?: string;
  rawBackPath?: string;
  rawImagePaths?: string[];
  rawChildPhotoPath?: string;
  // A fixed REAL child photo (raw GCS path) to pre-set on the back cover — e.g.
  // Lora's showcase book always opens with her real photo, no manual upload.
  realPhotoPath?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StoryBook({
  storyId        = 'zoo_adventure',
  childName: initialName = 'بهاء',
  childGender,
  childPhoto     = '',
  realPhoto      = '',
  coverScene     = '',
  backCoverPhoto = '',
  audioUrl,
  showNameInput  = true,
  customPages    = undefined,
  generatedImages = [],
  onGenerated,
  rawCoverPath,
  rawBackPath,
  rawImagePaths,
  rawChildPhotoPath,
  realPhotoPath = '',
}: StoryBookProps) {

  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.email === 'eyadat720@gmail.com';
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // "Send to BookPod" shipping form (billable — physical print).
  const [showBookPod, setShowBookPod] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ship, setShip] = useState({ fullName: '', phone: '', city: '', street: '', buildingNo: '', deliveryMethod: 'delivery' as 'delivery' | 'pickup' });
  // Admin-uploaded REAL child photo for the back cover (overrides the AI portrait).
  // uploadedPhotoPath = raw GCS objectPath (for the print/BookPod build);
  // uploadedPhotoUrl  = signed URL (for the on-screen preview).
  const [uploadedPhotoPath, setUploadedPhotoPath] = useState(realPhotoPath);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState(realPhotoPath ? toDisplayUrl(realPhotoPath) : '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Generate (or refresh) the Nano-Banana preview illustrations for this theme.
  const handleGenerate = async (force = false) => {
    setIsGenerating(true);
    const toastId = toast.loading('🎨 جاري توليد الصور بالذكاء الاصطناعي... (قد يستغرق دقيقتين)');
    try {
      const res = await adminApi.generateThemeIllustrations(storyId, { force, childName });
      if (res.success) {
        const costMsg = res.cached
          ? 'تم تحميل الصور المحفوظة'
          : `تم توليد ${res.imageCount ?? ''} صورة ✨ (التكلفة ~$${res.estimatedCostUsd ?? '0'})`;
        toast.success(costMsg, { id: toastId });
        onGenerated?.(
          (res.generatedImages || []).map(toDisplayUrl),
          res.generatedPortrait || '',
          res.generatedCover || ''
        );
      } else {
        toast.error(res.message || 'فشل التوليد', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'فشل التوليد', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Editable child name ────────────────────────────────────────────────────
  const [typedName, setTypedName] = useState(initialName);
  // Gender: explicit (from the wizard) wins, else detect from the name.
  const gender: Gender = childGender || detectGender(typedName);
  // The displayed name follows the site language (Arabic→بهاء, English→Baha,
  // Hebrew→בהאא). The input keeps whatever the parent typed (typedName).
  const childName = useMemo(() => localizeName(typedName || 'بهاء', i18n.language), [typedName, i18n.language]);

  // ── Look up the story ──────────────────────────────────────────────────────
  const story: StoryDefinition = useMemo(
    () => findStory(storyId) ?? STORIES[0],
    [storyId],
  );

  // ── Resolve localized static story fields ──────────────────────────────────
  const translatedTitle = useMemo(() => t(`stories.${story.id}.title`, story.titleAr), [story.id, story.titleAr, t]);
  const translatedDedication = useMemo(() => t(`stories.${story.id}.dedication`, story.dedicationAr), [story.id, story.dedicationAr, t]);
  const translatedMoral = useMemo(() => t(`stories.${story.id}.moral`, story.moralAr), [story.id, story.moralAr, t]);
  const translatedConclusion = useMemo(() => t(`stories.${story.id}.conclusion`, story.conclusionAr), [story.id, story.conclusionAr, t]);

  const storyTitle  = useMemo(() => personalize(translatedTitle,     childName, gender), [translatedTitle, childName, gender]);
  const dedication  = useMemo(() => personalize(translatedDedication, childName, gender), [translatedDedication, childName, gender]);
  const moral       = useMemo(() => personalize(translatedMoral,      childName, gender), [translatedMoral, childName, gender]);
  const conclusion  = useMemo(() => personalize(translatedConclusion, childName, gender), [translatedConclusion, childName, gender]);

  const questions   = useMemo(() => {
    return story.questionsAr.map((q, idx) => {
      const qKey = `stories.${story.id}.questions.${idx}`;
      const translatedQ = t(qKey);
      const activeQ = translatedQ && translatedQ !== qKey ? translatedQ : q;
      return personalize(activeQ, childName, gender);
    });
  }, [story, childName, gender, t]);

  // ── Resolve photo & audio ─────────────────────────────────────────────────
  const resolvedPhoto = childPhoto ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=D4A937&color=0a1628&size=300&bold=true`;
  const resolvedAudio = audioUrl ||
    `https://magicfanoos.com/stories/${story.id}?child=${encodeURIComponent(childName)}`;

  // A real uploaded photo (if the admin added one) wins over the AI portrait for
  // the back-cover circle & dedication — both on screen and in the print build.
  const backCoverPhotoUrl = uploadedPhotoUrl || realPhoto;
  const effectiveChildPhotoPath = uploadedPhotoPath || rawChildPhotoPath;

  // ── Upload a REAL child photo for the back cover ──────────────────────────
  const handleUploadRealPhoto = async (file?: File) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    const toastId = toast.loading(t('storybook.uploading_photo', '📷 جاري رفع صورة الطفل...'));
    try {
      const res = await uploadApi.childPhoto(file);
      if (res?.success && res.objectPath) {
        setUploadedPhotoPath(res.objectPath);
        setUploadedPhotoUrl(res.signedUrl || toDisplayUrl(res.objectPath));
        toast.success(t('storybook.photo_uploaded', 'تم رفع الصورة الحقيقية ✅ ستظهر على الغلاف الخلفي'), { id: toastId });
      } else {
        toast.error(t('storybook.photo_upload_failed', 'فشل رفع الصورة'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('storybook.photo_upload_failed', 'فشل رفع الصورة'), { id: toastId });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // ── Download handler ──────────────────────────────────────────────────────
  // Builds the print-ready PDF (cover + interior, 220×220mm) on the server from
  // the generated illustrations, then downloads it. Same quality that BookPod
  // prints — but nothing is submitted to BookPod here.
  const handleDownload = async () => {
    if (!rawCoverPath || !rawBackPath || !(rawImagePaths && rawImagePaths.length)) {
      toast.error(t('storybook.no_images_yet', 'لا توجد صور مولّدة بعد — ولّد صور الكتاب أولاً 🎨'));
      return;
    }
    setIsDownloading(true);
    const toastId = toast.loading(t('storybook.preparing_pdf', '📄 جاري تجهيز ملف الطباعة... (قد يستغرق حتى دقيقة)'));
    try {
      const res = await adminApi.buildPreviewPrint({
        theme: story.id,
        childName,
        childGender: gender,
        language: i18n.language,
        coverPath: rawCoverPath,
        backPath: rawBackPath,
        imagePaths: rawImagePaths,
        childPhotoPath: effectiveChildPhotoPath,
      });
      if (res?.success && res.interiorPath) {
        const safe = (childName || 'book').replace(/[^\p{L}\p{N}_-]+/gu, '_');
        const files = [
          { path: res.interiorPath, name: `${safe}-interior.pdf` },
          { path: res.coverPath, name: `${safe}-cover.pdf` },
        ].filter((f) => f.path);
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
        toast.success(t('storybook.pdf_ready', 'تم تجهيز ملف الطباعة ✅ (الغلاف + المحتوى)'), { id: toastId });
      } else {
        toast.error(res?.message || t('storybook.pdf_failed', 'فشل تجهيز ملف الطباعة'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('storybook.pdf_failed', 'فشل تجهيز ملف الطباعة'), { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  };

  // Send to BookPod — build + submit a REAL, billable print order. Guarded by the
  // shipping form + a confirm() so it never fires accidentally.
  const handleSubmitBookPod = async () => {
    if (!rawCoverPath || !rawBackPath || !(rawImagePaths && rawImagePaths.length)) {
      toast.error(t('storybook.no_images_yet', 'لا توجد صور مولّدة بعد — ولّد صور الكتاب أولاً 🎨'));
      return;
    }
    if (!ship.fullName.trim() || !ship.phone.trim()) {
      toast.error(t('storybook.ship_required', 'يرجى إدخال الاسم ورقم الهاتف'));
      return;
    }
    if (!window.confirm(t('storybook.bookpod_confirm', `إرسال هذا الكتاب إلى BookPod للطباعة والشحن إلى «${ship.fullName}»؟\nهذه عملية طباعة حقيقية ومدفوعة.`))) return;
    setIsSubmitting(true);
    const toastId = toast.loading(t('storybook.bookpod_sending', '📤 جاري التجهيز والإرسال إلى BookPod...'));
    try {
      const res = await adminApi.submitToBookPod({
        theme: story.id,
        childName,
        childGender: gender,
        language: i18n.language,
        coverPath: rawCoverPath,
        backPath: rawBackPath,
        imagePaths: rawImagePaths,
        childPhotoPath: effectiveChildPhotoPath,
        shipping: ship,
      });
      if (res?.success) {
        toast.success(`${t('storybook.bookpod_ok', 'تم الإرسال إلى BookPod للطباعة ✅')}${res.jobId ? ` (#${res.jobId})` : ''}`, { id: toastId });
        setShowBookPod(false);
      } else {
        toast.error(res?.message || t('storybook.bookpod_failed', 'فشل الإرسال إلى BookPod'), { id: toastId });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || t('storybook.bookpod_failed', 'فشل الإرسال إلى BookPod'), { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sb-root" dir={i18n.dir()}>

      {/* ── Admin toolbar (hidden on print) ────────────────────────────────── */}
      {isAdmin && (
        <div className="sb-toolbar no-print">

          {/* Name input */}
          {showNameInput && (
            <div className="sb-name-bar">
              <label htmlFor="sb-name-input" className="sb-name-label">{t('storybook.child_name', '✨ اسم الطفل:')}</label>
              <input
                id="sb-name-input"
                type="text"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                placeholder={t('storybook.placeholder_name', '✍️ اكتب اسم الطفل هنا')}
                className="sb-name-input"
                maxLength={30}
              />
              <span className="sb-story-badge">{storyTitle.replace('[NAME]', '…')}</span>
            </div>
          )}

          {/* Generate AI photos button */}
          <div className="sb-gen-row">
            <button
              onClick={() => handleGenerate(false)}
              className="sb-gen-btn"
              disabled={isGenerating}
            >
              {isGenerating
                ? `⏳ ${t('storybook.generating', 'جاري التوليد...')}`
                : `🎨 ${t('storybook.generate_ai', 'توليد صور الذكاء الاصطناعي')}`}
            </button>
            {generatedImages.length > 0 && !isGenerating && (
              <button onClick={() => handleGenerate(true)} className="sb-regen-btn" title="إعادة التوليد">
                ♻️ {t('storybook.regenerate', 'إعادة التوليد')}
              </button>
            )}
          </div>

          {/* Download the print-ready PDF (server build) */}
          <button
            onClick={handleDownload}
            className="sb-print-btn"
            disabled={isDownloading}
            aria-label="تحميل ملف الطباعة PDF"
          >
            {isDownloading
              ? `⏳ ${t('storybook.preparing_short', 'جاري التجهيز...')}`
              : `⬇️ ${t('storybook.download_pdf', 'تحميل ملف الطباعة (PDF)')}`}
            <span className="sb-print-size">220 × 220 mm</span>
          </button>

          {/* Upload a REAL child photo for the back cover (overrides AI portrait) */}
          <label
            className="sb-regen-btn"
            style={{ width: '100%', textAlign: 'center', cursor: isUploadingPhoto ? 'wait' : 'pointer', display: 'block' }}
            title={t('storybook.upload_real_photo_hint', 'ارفع صورة حقيقية للطفل لتظهر على الغلاف الخلفي والإهداء')}
          >
            {isUploadingPhoto
              ? `⏳ ${t('storybook.uploading_short', 'جاري الرفع...')}`
              : uploadedPhotoUrl
                ? `✅ ${t('storybook.real_photo_set', 'تم تعيين صورة حقيقية (اضغط للتغيير)')}`
                : `📷 ${t('storybook.upload_real_photo', 'رفع صورة حقيقية للطفل (الغلاف الخلفي)')}`}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              disabled={isUploadingPhoto}
              onChange={(e) => { handleUploadRealPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }}
            />
          </label>

          {/* Send to BookPod for printing — opens a shipping form (billable) */}
          <button
            onClick={() => setShowBookPod((v) => !v)}
            className="sb-regen-btn"
            style={{ width: '100%' }}
            disabled={isSubmitting}
            aria-label="إرسال إلى BookPod للطباعة"
          >
            📤 {t('storybook.send_bookpod', 'إرسال إلى BookPod للطباعة')}
          </button>

          {/* BookPod shipping form (billable — real print + ship) */}
          {showBookPod && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(212,169,55,0.08)', border: '1px solid rgba(212,169,55,0.3)', borderRadius: '12px', padding: '0.85rem' }}>
              <div style={{ color: '#D4A937', fontWeight: 800, fontSize: '0.9rem' }}>📦 {t('storybook.bookpod_ship', 'بيانات الشحن — طباعة عبر BookPod')}</div>
              <input className="sb-name-input" placeholder={t('storybook.bp_name', 'الاسم الكامل للمستلم *')} value={ship.fullName} onChange={(e) => setShip({ ...ship, fullName: e.target.value })} />
              <input className="sb-name-input" placeholder={t('storybook.bp_phone', 'رقم الهاتف *')} value={ship.phone} onChange={(e) => setShip({ ...ship, phone: e.target.value })} />
              <input className="sb-name-input" placeholder={t('storybook.bp_city', 'المدينة')} value={ship.city} onChange={(e) => setShip({ ...ship, city: e.target.value })} />
              <input className="sb-name-input" placeholder={t('storybook.bp_street', 'الشارع')} value={ship.street} onChange={(e) => setShip({ ...ship, street: e.target.value })} />
              <input className="sb-name-input" placeholder={t('storybook.bp_building', 'رقم المبنى')} value={ship.buildingNo} onChange={(e) => setShip({ ...ship, buildingNo: e.target.value })} />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleSubmitBookPod} className="sb-print-btn" disabled={isSubmitting} style={{ flex: 1 }}>
                  {isSubmitting ? `⏳ ${t('storybook.bookpod_sending_short', 'جاري الإرسال...')}` : `✅ ${t('storybook.bookpod_confirm_btn', 'تأكيد والإرسال للطباعة')}`}
                </button>
                <button onClick={() => setShowBookPod(false)} className="sb-regen-btn" disabled={isSubmitting}>{t('storybook.cancel', 'إلغاء')}</button>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(242,96,122,0.95)', fontWeight: 600 }}>⚠️ {t('storybook.bookpod_note', 'طباعة حقيقية ومدفوعة — سيُطبع كتاب ويُشحن للعنوان أعلاه.')}</div>
            </div>
          )}

          {/* Info strip */}
          <div className="sb-info-strip">
            <span>📄 {t('storybook.pages_count', '34 صفحة')}</span>
            <span>·</span>
            <span>🖊️ {t('storybook.story_title', 'قصة')}: {storyTitle}</span>
            <span>·</span>
            <span>👦 {childName}</span>
          </div>
        </div>
      )}

      {/* ══════════════════════ ALL 34 PAGES ═══════════════════════════════════ */}

      {/* 1 — Front Cover (prefer the full-scene generated cover) */}
      {/* Front cover shows the AI avatar/portrait (not the raw real photo) */}
      <FrontCover childName={childName} storyTitle={storyTitle} coverImage={story.coverImage} childPhoto={coverScene || backCoverPhoto || resolvedPhoto} />

      {/* 2 — Inside Title Page */}
      <TitlePage storyTitle={storyTitle} childName={childName} />

      {/* 3 — Fanoos Separator */}
      <FanoosPage label={t('storybook.fanoos_start', 'فانوس البداية')} image="/logo.png" />

      {/* 4 — Dedication — uses the real uploaded photo (like the back cover), not the AI avatar */}
      <DedicationPage childName={childName} childPhoto={backCoverPhotoUrl || resolvedPhoto} dedicationText={dedication} />

      {/* 5–30 — 26 Story Body Pages */}
      <div className="sb-body-pages">
        {customPages && customPages.length > 0 ? (
          customPages.map((page, idx) => (
            <div key={`custom-page-${idx}`} style={{ display: 'contents' }}>
              <StoryTextPage
                pageNumber={idx * 2 + 1}
                text={personalize(page.text || '', childName, gender)}
                childName={childName}
              />
              <StoryImagePage
                pageNumber={idx * 2 + 2}
                /* Prefer the AI-generated illustration for this page; fall back to the template image. */
                imageSrc={generatedImages[idx] || page.imageSrc || ''}
                imageAlt={personalize(page.text || '', childName, gender)}
              />
            </div>
          ))
        ) : (
          (() => {
            // Track image pages so AI-generated illustrations override the
            // static template placeholders (1st image page -> generatedImages[0]).
            let imageIdx = -1;
            return story.pages.map((page) => {
              if (page.type === 'text' && page.text) {
                // Check if a localized translation exists for this page number
                const pageKey = `stories.${story.id}.pages.${page.pageNumber}`;
                const translatedPage = t(pageKey);
                const activeText = translatedPage && translatedPage !== pageKey ? translatedPage : page.text;

                return (
                  <StoryTextPage
                    key={page.pageNumber}
                    pageNumber={page.pageNumber}
                    text={personalize(activeText, childName, gender)}
                    childName={childName}
                  />
                );
              }
              if (page.type === 'image') {
                imageIdx += 1;
                return (
                  <StoryImagePage
                    key={page.pageNumber}
                    pageNumber={page.pageNumber}
                    /* Prefer the AI-generated illustration; fall back to the template image. */
                    imageSrc={generatedImages[imageIdx] || page.imageSrc || ''}
                    imageAlt={personalize(page.imageAlt ?? '', childName, gender)}
                  />
                );
              }
              return null;
            });
          })()
        )}
      </div>

      {/* 31 — Fanoos Separator */}
      <FanoosPage label={t('storybook.fanoos_end', 'فانوس النهاية')} image="/logo.png" />

      {/* 32 — Final Story Page */}
      <FinalStoryPage
        storyTitle={storyTitle}
        moralText={moral}
        questions={questions}
        conclusionText={conclusion}
        audioUrl={resolvedAudio}
        childName={childName}
      />

      {/* 33 — Copyright Page */}
      <CopyrightPage />

      {/* 34 — Back Cover (real uploaded photo in the circle, not avatar/portrait) */}
      <BackCover childName={childName} childPhoto={backCoverPhotoUrl || backCoverPhoto || resolvedPhoto} avatarPhoto={coverScene || backCoverPhoto} currentStoryId={story.id} />

      {/* ══════════════════════════════════════════════════════════════════════
          STYLES — Screen + Print
      ══════════════════════════════════════════════════════════════════════ */}
      <style>{`
        /* Top-level @page (most reliable placement for "Save as PDF"):
           every printed sheet is a 220mm x 220mm square with no margin. */
        @page { size: 220mm 220mm; margin: 0; }

        /* ───────────────────────────────────────────────────────────────────
           SCREEN STYLES
        ─────────────────────────────────────────────────────────────────── */

        .sb-root {
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
          font-family: 'Noto Kufi Arabic', 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding: 1.5rem;
        }

        /* Shared page base */
        .book-page {
          border-radius: 20px;
          overflow: hidden;
          width: 100%;
        }

        /* Body pages */
        .sb-body-pages {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        /* ── Toolbar ── */
        .sb-toolbar {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: rgba(10,22,40,0.85);
          border: 1px solid rgba(212,169,55,0.25);
          border-radius: 16px;
          padding: 1rem 1.25rem;
          backdrop-filter: blur(12px);
          position: sticky;
          top: 80px;
          z-index: 40;
        }

        /* Name bar */
        .sb-name-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .sb-name-label {
          color: #D4A937;
          font-weight: 700;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .sb-name-input {
          flex: 1;
          min-width: 120px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(212,169,55,0.3);
          border-radius: 8px;
          color: #e8eaf6;
          padding: 0.4rem 0.75rem;
          font-family: inherit;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
          text-align: right;
        }
        .sb-name-input:focus { border-color: #D4A937; }
        .sb-story-badge {
          font-size: 0.72rem;
          color: rgba(212,169,55,0.6);
          border: 1px solid rgba(212,169,55,0.2);
          border-radius: 999px;
          padding: 3px 10px;
          white-space: nowrap;
        }

        /* Demo name chips */
        .sb-demo-names { display: flex; flex-wrap: wrap; gap: 0.4rem; }
        .sb-demo-chip {
          font-family: inherit;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s;
        }
        .sb-demo-chip--m { background: rgba(106,174,214,0.12); color: #8fc3e6; border-color: rgba(106,174,214,0.3); }
        .sb-demo-chip--f { background: rgba(242,96,122,0.12); color: #f5a3b4; border-color: rgba(242,96,122,0.3); }
        .sb-demo-chip--active { outline: 2px solid #D4A937; }
        .sb-demo-chip:hover { filter: brightness(1.2); }

        /* Generate AI buttons */
        .sb-gen-row { display: flex; gap: 0.5rem; }
        .sb-gen-btn {
          flex: 1;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          color: #fff;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 800;
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          box-shadow: 0 4px 16px rgba(124,58,237,0.4);
        }
        .sb-gen-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(124,58,237,0.55); }
        .sb-gen-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .sb-regen-btn {
          background: rgba(255,255,255,0.06);
          color: rgba(212,169,55,0.9);
          border: 1px solid rgba(212,169,55,0.3);
          border-radius: 12px;
          padding: 0.6rem 1rem;
          font-family: inherit;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .sb-regen-btn:hover { background: rgba(255,255,255,0.1); }

        /* Print button */
        .sb-print-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          background: linear-gradient(135deg, #D4A937, #b88c20);
          color: #0a1628;
          font-family: inherit;
          font-size: 0.95rem;
          font-weight: 800;
          padding: 0.65rem 1.5rem;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          width: 100%;
          box-shadow: 0 4px 16px rgba(212,169,55,0.35);
        }
        .sb-print-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(212,169,55,0.5);
        }
        .sb-print-btn:active { transform: translateY(0); }
        .sb-print-size {
          font-size: 0.72rem;
          background: rgba(10,22,40,0.2);
          border-radius: 6px;
          padding: 2px 8px;
          font-weight: 600;
        }

        /* Info strip */
        .sb-info-strip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          font-size: 0.72rem;
          color: rgba(212,169,55,0.55);
          font-weight: 600;
        }

        /* ───────────────────────────────────────────────────────────────────
           PRINT STYLES — 220mm × 220mm square, one page per .book-page
        ─────────────────────────────────────────────────────────────────── */

        @media print {

          /* Page size: 220mm × 220mm square, no margin (bleed to edge) */
          @page {
            size: 220mm 220mm;
            margin: 0;
          }

          /* Hide everything by default */
          body * { visibility: hidden; }

          /* Show the book root and all its children */
          .sb-root,
          .sb-root * { visibility: visible; }

          /* Reset screen layout. IMPORTANT: switch off flex — page breaks
             (page-break-after) are ignored on flex items, which made pages
             flow together instead of one-per-sheet. */
          html, body { margin: 0 !important; padding: 0 !important; }
          .sb-root {
            display: block !important;
            max-width: none;
            width: 220mm;
            padding: 0;
            gap: 0;
            margin: 0;
          }

          /* Each page = exactly one printed sheet. NOTE: no page-break-inside:
             avoid here — an element that is exactly one page tall can be bumped
             to the next sheet by sub-pixel rounding, leaving blank sheets.
             overflow:hidden already clips any content to its own 220mm sheet. */
          .book-page {
            width: 220mm;
            height: 220mm;
            min-height: 220mm;
            max-height: 220mm;
            page-break-after: always;
            break-after: page;
          }
          /* No trailing blank sheet after the very last page */
          .book-page:last-child {
            page-break-after: auto;
            break-after: auto;
            border-radius: 0;          /* No rounded corners on print */
            overflow: hidden;
            box-shadow: none;
            border: none;
            position: relative;
          }

          /* White page keeps its background */
          .sb-white-page {
            background: #ffffff !important;
            min-height: 220mm;
          }

          /* Body pages must be block-level (not flex/contents) so each
             .book-page inside them breaks onto its own sheet. */
          .sb-body-pages { display: block !important; }
          .sb-body-pages > div { display: block !important; }

          /* Hide the admin toolbar on print */
          .no-print { display: none !important; }

          /* Make all images render fully without lazy loading delay */
          img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

          /* Ensure colors are preserved in print (no browser color adjustment) */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
