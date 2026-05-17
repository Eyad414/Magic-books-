// ─── Story Body Pages ─────────────────────────────────────────────────────────
// Two sub-components: StoryTextPage & StoryImagePage.
// Used for pages 5-30 (26 pages, alternating text → image).

// ── Text page ─────────────────────────────────────────────────────────────────
interface StoryTextPageProps {
  pageNumber: number;
  text: string;        // already has child's name baked in
  childName: string;
}

export function StoryTextPage({ pageNumber, text, childName }: StoryTextPageProps) {
  return (
    <section
      className="book-page story-text-page"
      aria-label={`صفحة النص ${pageNumber}`}
    >
      {/* Page number badge */}
      <span className="stp-badge">{pageNumber}</span>

      {/* Decorative star ornament */}
      <div className="stp-star-ornament" aria-hidden="true">
        <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" className="stp-star-svg">
          <polygon
            points="60,5 74,45 115,45 83,70 95,110 60,88 25,110 37,70 5,45 46,45"
            fill="none"
            stroke="#D4A937"
            strokeWidth="2"
            opacity="0.35"
          />
        </svg>
      </div>

      {/* Story text */}
      <div className="stp-content">
        <div className="stp-name-tag">{childName}</div>
        <p className="stp-text">{text}</p>
      </div>

      {/* Bottom ornament */}
      <div className="stp-divider" aria-hidden="true" />

      <style>{`
        .story-text-page {
          background: linear-gradient(145deg, #0d0f1a 0%, #111840 100%);
          border: 1px solid rgba(212,169,55,0.18);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.2rem;
          padding: 2.5rem 2rem;
          min-height: 380px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }

        /* Page badge */
        .stp-badge {
          position: absolute;
          bottom: 14px;
          left: 18px;
          background: rgba(212,169,55,0.12);
          color: #D4A937;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px solid rgba(212,169,55,0.3);
        }

        /* Star ornament (background) */
        .stp-star-ornament {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .stp-star-svg {
          width: clamp(180px, 55%, 280px);
          height: auto;
          opacity: 0.5;
        }

        /* Content */
        .stp-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.9rem;
          max-width: 380px;
        }
        .stp-name-tag {
          background: rgba(212,169,55,0.15);
          color: #D4A937;
          font-size: 0.78rem;
          font-weight: 800;
          padding: 4px 16px;
          border-radius: 999px;
          border: 1px solid rgba(212,169,55,0.35);
          letter-spacing: 0.06em;
        }
        .stp-text {
          font-size: clamp(1rem, 3vw, 1.2rem);
          line-height: 1.9;
          color: rgba(255,255,255,0.9);
          font-weight: 600;
          direction: rtl;
        }

        /* Divider */
        .stp-divider {
          position: relative;
          z-index: 1;
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #D4A937, transparent);
          border-radius: 999px;
        }
      `}</style>
    </section>
  );
}

// ── Image page ────────────────────────────────────────────────────────────────
interface StoryImagePageProps {
  pageNumber: number;
  imageSrc: string;
  imageAlt: string;   // already has child's name baked in
}

export function StoryImagePage({ pageNumber, imageSrc, imageAlt }: StoryImagePageProps) {
  const fallbackSrc = `https://placehold.co/480x360/111840/D4A937?text=Page+${pageNumber}&font=sans`;

  return (
    <section
      className="book-page story-image-page"
      aria-label={`صفحة الصورة ${pageNumber}`}
    >
      <div className="sip-img-wrapper">
        <img
          src={imageSrc || fallbackSrc}
          alt={imageAlt}
          className="sip-img"
          loading="lazy"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement;
            if (el.src !== fallbackSrc) el.src = fallbackSrc;
          }}
        />
        <span className="sip-badge" aria-label={`صفحة ${pageNumber}`}>{pageNumber}</span>
      </div>

      <style>{`
        .story-image-page {
          background: #060a12;
          border: 1px solid rgba(212,169,55,0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          min-height: 380px;
          position: relative;
        }

        .sip-img-wrapper {
          position: relative;
          width: 100%;
          max-width: 440px;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        }
        .sip-img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
          transition: transform 0.35s ease;
        }
        .sip-img:hover { transform: scale(1.025); }

        .sip-badge {
          position: absolute;
          bottom: 10px;
          left: 12px;
          background: rgba(10,22,40,0.78);
          color: #D4A937;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px solid rgba(212,169,55,0.35);
          backdrop-filter: blur(6px);
        }
      `}</style>
    </section>
  );
}
