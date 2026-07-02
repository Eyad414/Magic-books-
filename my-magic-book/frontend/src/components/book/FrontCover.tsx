// ─── Page 1: Front Cover ──────────────────────────────────────────────────────
// Taletoons-style full-bleed cover:
//   • The kid photo/scene FILLS the entire cover (no circle frame)
//   • A soft gradient at the bottom keeps the title readable
//   • Story title overlaid near the bottom
//   • Small "Magic Fanoos" brand line at the very bottom (logo + tagline)
//
// `coverImage` should be the generated full-scene cover when available; we fall
// back to the kid portrait, then the theme background, then an avatar.

import { useTranslation } from 'react-i18next';

interface FrontCoverProps {
  childName: string;
  storyTitle: string;   // e.g. "مغامرة سارة في حديقة الحيوانات"
  coverImage: string;   // theme background (fallback)
  childPhoto?: string;  // generated portrait / scene — preferred as the full-bleed image
}

export default function FrontCover({ childName, storyTitle, coverImage, childPhoto }: FrontCoverProps) {
  const { t } = useTranslation();
  const fallbackPhoto = `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=D4A937&color=0a1628&size=600&bold=true&font-size=0.4`;
  // Prefer the generated kid image; otherwise the theme art; otherwise avatar.
  const heroImage = childPhoto || coverImage || fallbackPhoto;

  return (
    <section className="book-page book-page--cover" aria-label="الغلاف الأمامي">

      {/* ── Full-bleed hero image ── */}
      <img
        src={heroImage}
        alt={childName}
        className="cover-fullimg"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackPhoto; }}
      />

      {/* Readability gradient over the bottom third */}
      <div className="cover-scrim" aria-hidden="true" />

      {/* ── Title + brand, overlaid at the bottom ── */}
      <div className="cover-overlay-content">
        <h1 className="cover-title">{storyTitle}</h1>

        <div className="cover-brand">
          <img src="/logo.png" alt="" className="cover-brand-logo" />
          <div className="cover-brand-text">
            <span className="cover-brand-name">Magic Fanoos</span>
            <span className="cover-brand-tag">{t('storybook.cover_brand_tag', 'قصة بتصميم شخصي من Magic Fanoos')}</span>
          </div>
        </div>
      </div>

      <style>{`
        .book-page--cover {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;            /* square like the printed 220×220 book */
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0,0,0,0.55);
        }

        /* Full-bleed image */
        .cover-fullimg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 35%;   /* favor the face */
          z-index: 0;
        }

        /* Bottom scrim for text legibility */
        .cover-scrim {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(
            to top,
            rgba(8,14,28,0.92) 0%,
            rgba(8,14,28,0.72) 18%,
            rgba(8,14,28,0.25) 38%,
            rgba(8,14,28,0) 55%
          );
        }

        /* Overlaid content */
        .cover-overlay-content {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem 1.5rem 1.8rem;
          text-align: center;
        }
        .cover-title {
          margin: 0;
          font-size: clamp(1.8rem, 6vw, 3rem);
          font-weight: 900;
          line-height: 1.15;
          color: #ffffff;
          text-shadow: 0 3px 16px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.9);
        }

        /* Brand line (Taletoons-style) */
        .cover-brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .cover-brand-logo {
          width: 34px;
          height: 34px;
          object-fit: contain;
          border-radius: 50%;
          filter: drop-shadow(0 0 8px rgba(212,169,55,0.7));
        }
        .cover-brand-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.2;
        }
        .cover-brand-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #f3d98f;
          letter-spacing: 0.04em;
        }
        .cover-brand-tag {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.75);
        }
      `}</style>
    </section>
  );
}
