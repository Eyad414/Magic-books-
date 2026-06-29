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
import { toDisplayUrl } from '../../api/mediaUrl';
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
import { detectGender, applyGenderTokens, DEMO_NAMES, type Gender } from '../../utils/gender';
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
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StoryBook({
  storyId        = 'zoo_adventure',
  childName: initialName = 'إياد',
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
}: StoryBookProps) {

  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.email === 'eyadat720@gmail.com';
  const [isGenerating, setIsGenerating] = useState(false);

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

  // ── Editable name (demo — remove in production) ────────────────────────────
  const [typedName, setTypedName] = useState(initialName);
  const [demoGender, setDemoGender] = useState<Gender | undefined>(childGender);
  // Gender: explicit (wizard) wins, then a demo override, then detect from name.
  const gender: Gender = childGender || demoGender || detectGender(typedName);
  // The displayed name follows the site language (Arabic→بهاء, English→Baha,
  // Hebrew→בהאא). The input keeps whatever the parent typed (typedName).
  const childName = useMemo(() => localizeName(typedName, i18n.language), [typedName, i18n.language]);

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
    `https://magicfanoose.com/stories/${story.id}?child=${encodeURIComponent(childName)}`;

  // ── Print handler ─────────────────────────────────────────────────────────
  const handlePrint = () => window.print();

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
                onChange={(e) => setTypedName(e.target.value || 'الطفل')}
                placeholder={t('storybook.placeholder_name', 'اكتب الاسم هنا')}
                className="sb-name-input"
                maxLength={30}
              />
              <span className="sb-story-badge">{storyTitle.replace('[NAME]', '…')}</span>
            </div>
          )}

          {/* Demo name quick-picks (boys / girls) to preview gender agreement */}
          {showNameInput && (
            <div className="sb-demo-names">
              {DEMO_NAMES.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => { setTypedName(d.name); setDemoGender(d.gender); }}
                  className={`sb-demo-chip ${d.gender === 'female' ? 'sb-demo-chip--f' : 'sb-demo-chip--m'} ${typedName === d.name ? 'sb-demo-chip--active' : ''}`}
                >
                  {d.gender === 'female' ? '👧' : '👦'} {d.name}
                </button>
              ))}
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

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="sb-print-btn"
            aria-label="طباعة الكتاب بحجم 220×220 ملم"
          >
            🖨️ {t('storybook.print_book', 'طباعة الكتاب')}
            <span className="sb-print-size">220 × 220 mm</span>
          </button>

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

      {/* 3 — Fanoose Separator */}
      <FanoosPage label={t('storybook.fanoos_start', 'فانوس البداية')} image="/logo-main.jpg" />

      {/* 4 — Dedication — uses the real uploaded photo (like the back cover), not the AI avatar */}
      <DedicationPage childName={childName} childPhoto={realPhoto || resolvedPhoto} dedicationText={dedication} />

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

      {/* 31 — Fanoose Separator */}
      <FanoosPage label={t('storybook.fanoos_end', 'فانوس النهاية')} image="/logo-main.jpg" />

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
      <BackCover childName={childName} childPhoto={realPhoto || backCoverPhoto || resolvedPhoto} avatarPhoto={coverScene || backCoverPhoto} currentStoryId={story.id} />

      {/* ══════════════════════════════════════════════════════════════════════
          STYLES — Screen + Print
      ══════════════════════════════════════════════════════════════════════ */}
      <style>{`
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

          /* Reset screen layout */
          .sb-root {
            max-width: 100%;
            width: 220mm;
            padding: 0;
            gap: 0;
            margin: 0;
          }

          /* Each page = exactly one printed sheet */
          .book-page {
            width: 220mm;
            height: 220mm;
            min-height: 220mm;
            max-height: 220mm;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
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

          /* Body pages: reset the screen grid gap */
          .sb-body-pages {
            display: contents; /* let children be direct children of sb-root for page-break */
          }

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
