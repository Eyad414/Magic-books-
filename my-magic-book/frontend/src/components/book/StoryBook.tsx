// ─── StoryBook — Main Orchestrator ────────────────────────────────────────────
// Renders all 34 pages in the correct order for a given story + child data.
// Admin-only: protected by AdminBookGuard in App.tsx.
//
// PRINT FORMAT: 220mm × 220mm square (Tali Toons style).
// Click "🖨️ طباعة الكتاب" to open the browser print dialog — every .book-page
// becomes its own 220mm×220mm page automatically via @page + print CSS.

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
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

// ── Helper ─────────────────────────────────────────────────────────────────────
function replaceName(text: string, name: string): string {
  if (!text) return '';
  return text
    .replace(/\[NAME\]/gi, name)
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\s*name\s*\}/gi, name);
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface StoryBookProps {
  storyId?:      string;   // Story ID from STORIES registry
  childName?:    string;   // Child's display name
  childPhoto?:   string;   // URL / path to child's photo
  audioUrl?:     string;   // URL encoded into final-page QR
  showNameInput?: boolean; // Show the demo name input bar
  customPages?:  any[];    // Dynamically overridden story pages from database
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function StoryBook({
  storyId        = 'zoo_adventure',
  childName: initialName = 'إياد',
  childPhoto     = '',
  audioUrl,
  showNameInput  = true,
  customPages    = undefined,
}: StoryBookProps) {

  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.email === 'eyadat720@gmail.com';

  // ── Editable name (demo — remove in production) ────────────────────────────
  const [childName, setChildName] = useState(initialName);

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

  const storyTitle  = useMemo(() => replaceName(translatedTitle,     childName), [translatedTitle, childName]);
  const dedication  = useMemo(() => replaceName(translatedDedication, childName), [translatedDedication, childName]);
  const moral       = useMemo(() => replaceName(translatedMoral,      childName), [translatedMoral, childName]);
  const conclusion  = useMemo(() => replaceName(translatedConclusion, childName), [translatedConclusion, childName]);

  const questions   = useMemo(() => {
    return story.questionsAr.map((q, idx) => {
      const qKey = `stories.${story.id}.questions.${idx}`;
      const translatedQ = t(qKey);
      const activeQ = translatedQ && translatedQ !== qKey ? translatedQ : q;
      return replaceName(activeQ, childName);
    });
  }, [story, childName, t]);

  // ── Pick 3 recommended stories ────────────────────────────────────────────
  const recommended = useMemo(
    () => STORIES.filter((s) => s.id !== story.id).slice(0, 3),
    [story],
  );

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
                value={childName}
                onChange={(e) => setChildName(e.target.value || 'الطفل')}
                placeholder={t('storybook.placeholder_name', 'اكتب الاسم هنا')}
                className="sb-name-input"
                maxLength={30}
              />
              <span className="sb-story-badge">{storyTitle.replace('[NAME]', '…')}</span>
            </div>
          )}

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

      {/* 1 — Front Cover */}
      <FrontCover childName={childName} storyTitle={storyTitle} coverImage={story.coverImage} />

      {/* 2 — Inside Title Page */}
      <TitlePage storyTitle={storyTitle} childName={childName} />

      {/* 3 — Fanoose Separator */}
      <FanoosPage label="فانوس البداية" />

      {/* 4 — Dedication */}
      <DedicationPage childName={childName} childPhoto={resolvedPhoto} dedicationText={dedication} />

      {/* 5–30 — 26 Story Body Pages */}
      <div className="sb-body-pages">
        {customPages && customPages.length > 0 ? (
          customPages.map((page, idx) => (
            <div key={`custom-page-${idx}`} style={{ display: 'contents' }}>
              <StoryTextPage
                pageNumber={idx * 2 + 1}
                text={replaceName(page.text || '', childName)}
                childName={childName}
              />
              <StoryImagePage
                pageNumber={idx * 2 + 2}
                imageSrc={page.imageSrc || ''}
                imageAlt={replaceName(page.text || '', childName)}
              />
            </div>
          ))
        ) : (
          story.pages.map((page) => {
            if (page.type === 'text' && page.text) {
              // Check if a localized translation exists for this page number
              const pageKey = `stories.${story.id}.pages.${page.pageNumber}`;
              const translatedPage = t(pageKey);
              const activeText = translatedPage && translatedPage !== pageKey ? translatedPage : page.text;
              
              return (
                <StoryTextPage
                  key={page.pageNumber}
                  pageNumber={page.pageNumber}
                  text={replaceName(activeText, childName)}
                  childName={childName}
                />
              );
            }
            if (page.type === 'image') {
              return (
                <StoryImagePage
                  key={page.pageNumber}
                  pageNumber={page.pageNumber}
                  imageSrc={page.imageSrc ?? ''}
                  imageAlt={replaceName(page.imageAlt ?? '', childName)}
                />
              );
            }
            return null;
          })
        )}
      </div>

      {/* 31 — Fanoose Separator */}
      <FanoosPage label="فانوس النهاية" />

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

      {/* 34 — Back Cover */}
      <BackCover childName={childName} childPhoto={resolvedPhoto} recommendedStories={recommended} />

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
