// ─── Page 34: Back Cover ─────────────────────────────────────────────────────
// Layout (220 × 220 mm square — real printed-book format):
//   • Dark premium background matching the book brand
//   • "Congratulations" message + child's name
//   • Barcode / QR placeholder strip
//   • "More Adventures" recommended stories (3 cards)
//   • Magic Fanoose logo + website
//
// Fixed design — only childName + childPhoto change per order.

import { useTranslation } from 'react-i18next';
import type { StoryDefinition } from '../../data/stories/types';

interface BackCoverProps {
  childName: string;
  childPhoto: string;
  recommendedStories: StoryDefinition[];
}

export default function BackCover({ childName, childPhoto, recommendedStories }: BackCoverProps) {
  const { t, i18n } = useTranslation();

  const photoSrc = childPhoto ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=D4A937&color=0a1628&size=300&bold=true`;

  return (
    <section
      className="book-page bc-root"
      aria-label={t('storybook.back_cover_aria', 'الغلاف الخلفي')}
      dir={i18n.dir()}
    >
      {/* ── Ambient background ─────────────────────────────────────────────── */}
      <div className="bc-ambient" aria-hidden="true">
        <div className="bc-glow bc-glow-1" />
        <div className="bc-glow bc-glow-2" />
        <div className="bc-glow bc-glow-3" />
        <div className="bc-stars" />
      </div>

      {/* ── Gold top border ────────────────────────────────────────────────── */}
      <div className="bc-top-border" aria-hidden="true" />

      {/* ── Logo header ───────────────────────────────────────────────────── */}
      <div className="bc-header">
        <img
          src="/logo.png"
          alt="Magic Fanoose"
          className="bc-header-logo"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <span className="bc-header-brand">Magic Fanoose</span>
      </div>

      {/* ── Hero — child photo + message ───────────────────────────────────── */}
      <div className="bc-hero">
        <div className="bc-photo-wrap">
          <img
            src={photoSrc}
            alt={childName}
            className="bc-photo"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=D4A937&color=0a1628&size=200&bold=true`;
            }}
          />
          <div className="bc-photo-ring" aria-hidden="true" />
          {/* Star badge */}
          <div className="bc-star-badge" aria-hidden="true">⭐</div>
        </div>

        <div className="bc-message-block">
          <h2 className="bc-congrats">
            {t('storybook.congrats', 'أحسنت يا {{name}}!', { name: childName })} 🌟
          </h2>
          <p className="bc-sub">
            {t('storybook.completed_desc', 'أتممت قراءة قصتك السحرية — استمر في المغامرة!')}
          </p>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="bc-divider" aria-hidden="true" />

      {/* ── Recommended stories ───────────────────────────────────────────── */}
      <div className="bc-stories">
        <p className="bc-stories-label">
          ✨ {t('storybook.more_adventures', 'مغامرات أخرى تنتظرك')}
        </p>
        <div className="bc-stories-grid">
          {recommendedStories.slice(0, 3).map((story) => {
            const title = t(`stories.${story.id}.title`, story.titleAr).replace(/\[NAME\]/gi, '...');
            return (
              <div key={story.id} className="bc-story-card">
                <div className="bc-thumb-wrap">
                  <img
                    src={story.thumbnail}
                    alt={title}
                    className="bc-thumb"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://placehold.co/80x80/111840/D4A937?text=🏮';
                    }}
                  />
                </div>
                <p className="bc-card-title">{title}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────────── */}
      <div className="bc-divider" aria-hidden="true" />

      {/* ── Footer strip ─────────────────────────────────────────────────── */}
      <div className="bc-footer">
        <div className="bc-footer-left">
          <img
            src="/logo.png"
            alt="Magic Fanoose"
            className="bc-footer-logo"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <p className="bc-footer-brand">Magic Fanoose</p>
            <p className="bc-footer-url">🌐 MagicFanoose.com</p>
          </div>
        </div>
        {/* Barcode placeholder (printed books have ISBN/barcode here) */}
        <div className="bc-barcode" aria-hidden="true">
          <div className="bc-barcode-lines">
            {[...Array(18)].map((_, i) => (
              <div
                key={i}
                className="bc-barcode-line"
                style={{ width: i % 3 === 0 ? '3px' : '2px' }}
              />
            ))}
          </div>
          <p className="bc-barcode-text">MagicFanoose</p>
        </div>
      </div>

      {/* ── Gold bottom border ─────────────────────────────────────────────── */}
      <div className="bc-bottom-border" aria-hidden="true" />

      <style>{`
        .bc-root {
          position: relative;
          aspect-ratio: 1 / 1;
          background: linear-gradient(160deg, #070d1e 0%, #0a1628 45%, #040810 100%);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 0;
          box-shadow:
            0 32px 80px rgba(0,0,0,0.65),
            0 0 0 3px rgba(212,169,55,0.4),
            inset 0 0 0 1px rgba(212,169,55,0.1);
        }

        /* Ambient glows */
        .bc-ambient { position: absolute; inset: 0; pointer-events: none; }
        .bc-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.5;
        }
        .bc-glow-1 {
          width: 40%; height: 40%;
          top: -10%; right: 10%;
          background: radial-gradient(circle, rgba(212,169,55,0.12) 0%, transparent 70%);
          animation: bc-drift 8s ease-in-out infinite;
        }
        .bc-glow-2 {
          width: 35%; height: 35%;
          bottom: 15%; left: 5%;
          background: radial-gradient(circle, rgba(100,100,255,0.08) 0%, transparent 70%);
          animation: bc-drift 11s ease-in-out infinite reverse;
        }
        .bc-glow-3 {
          width: 50%; height: 30%;
          bottom: 0; right: 20%;
          background: radial-gradient(ellipse, rgba(212,169,55,0.07) 0%, transparent 70%);
        }
        @keyframes bc-drift {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(5%, 8%); }
        }

        /* Stars (tiny dots) */
        .bc-stars {
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(1.5px 1.5px at 10% 15%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 30% 40%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 55% 20%, rgba(255,255,255,0.35) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.25) 0%, transparent 100%),
            radial-gradient(1px 1px at 85% 30%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 20% 75%, rgba(255,255,255,0.2) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 80%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 45% 88%, rgba(255,255,255,0.2) 0%, transparent 100%);
        }

        /* Top/bottom gold borders */
        .bc-top-border,
        .bc-bottom-border {
          height: 3px;
          background: linear-gradient(90deg, transparent, #D4A937, rgba(255,238,160,0.8), #D4A937, transparent);
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        /* Header */
        .bc-header {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem 0.3rem;
        }
        .bc-header-logo {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          filter: drop-shadow(0 0 6px rgba(212,169,55,0.6));
        }
        .bc-header-brand {
          font-size: clamp(0.65rem, 2.2vw, 0.82rem);
          font-weight: 800;
          color: rgba(212,169,55,0.8);
          letter-spacing: 0.08em;
        }

        /* Hero section */
        .bc-hero {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          padding: 0.4rem 1rem 0.5rem;
        }
        .bc-photo-wrap {
          position: relative;
          width: clamp(60px, 18%, 90px);
          aspect-ratio: 1;
          flex-shrink: 0;
        }
        .bc-photo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          object-position: center top;
          border: 2.5px solid #D4A937;
        }
        .bc-photo-ring {
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          border: 1.5px solid rgba(212,169,55,0.3);
          pointer-events: none;
        }
        .bc-star-badge {
          position: absolute;
          bottom: -2px;
          right: -2px;
          font-size: 0.9rem;
          background: #D4A937;
          width: 20px; height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .bc-message-block { text-align: center; }
        .bc-congrats {
          font-size: clamp(0.85rem, 3vw, 1.25rem);
          font-weight: 900;
          color: #D4A937;
          margin: 0 0 0.2rem;
        }
        .bc-sub {
          font-size: clamp(0.58rem, 1.9vw, 0.75rem);
          color: rgba(255,255,255,0.5);
          margin: 0;
        }

        /* Divider */
        .bc-divider {
          position: relative;
          z-index: 2;
          height: 1px;
          margin: 0 5%;
          background: linear-gradient(90deg, transparent, rgba(212,169,55,0.3), transparent);
          flex-shrink: 0;
        }

        /* Recommended stories */
        .bc-stories {
          position: relative;
          z-index: 2;
          padding: 0.5rem 0.8rem;
          flex: 1;
        }
        .bc-stories-label {
          font-size: clamp(0.55rem, 1.8vw, 0.7rem);
          font-weight: 800;
          color: rgba(212,169,55,0.75);
          margin: 0 0 0.5rem;
          text-align: center;
        }
        .bc-stories-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }
        .bc-story-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(212,169,55,0.12);
          border-radius: 8px;
          padding: 0.4rem 0.3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
        }
        .bc-thumb-wrap {
          width: clamp(36px, 10%, 50px);
          aspect-ratio: 1;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid rgba(212,169,55,0.2);
          flex-shrink: 0;
        }
        .bc-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .bc-card-title {
          font-size: clamp(0.5rem, 1.6vw, 0.62rem);
          font-weight: 700;
          color: rgba(255,255,255,0.75);
          text-align: center;
          line-height: 1.3;
          margin: 0;
        }

        /* Footer */
        .bc-footer {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.45rem 0.9rem;
          background: rgba(5,12,30,0.6);
          border-top: 1px solid rgba(212,169,55,0.15);
        }
        .bc-footer-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .bc-footer-logo {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          filter: drop-shadow(0 0 5px rgba(212,169,55,0.5));
        }
        .bc-footer-brand {
          font-size: clamp(0.52rem, 1.7vw, 0.68rem);
          font-weight: 800;
          color: #D4A937;
          margin: 0;
          line-height: 1.2;
        }
        .bc-footer-url {
          font-size: clamp(0.45rem, 1.5vw, 0.58rem);
          color: rgba(212,169,55,0.55);
          margin: 0;
          line-height: 1.2;
        }

        /* Barcode placeholder */
        .bc-barcode {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.15rem;
        }
        .bc-barcode-lines {
          display: flex;
          align-items: stretch;
          gap: 1.5px;
          height: 22px;
        }
        .bc-barcode-line {
          background: rgba(255,255,255,0.5);
          border-radius: 1px;
        }
        .bc-barcode-text {
          font-size: 0.42rem;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.1em;
          margin: 0;
          font-family: monospace;
        }
      `}</style>
    </section>
  );
}
