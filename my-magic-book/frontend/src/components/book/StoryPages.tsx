// ─── Story Body Pages ─────────────────────────────────────────────────────────
// Two sub-components: StoryTextPage & StoryImagePage.
// Used for pages 5-30 (26 pages, alternating text → image).

import starSvg from '../../assets/star-image-stroy 1.svg';

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

      {/* Floating sparkles */}
      <span className="stp-sparkle stp-sparkle--1" aria-hidden="true">✦</span>
      <span className="stp-sparkle stp-sparkle--2" aria-hidden="true">✦</span>
      <span className="stp-sparkle stp-sparkle--3" aria-hidden="true">✧</span>

      {/* Star container */}
      <div className="stp-star-wrapper">
        <img
          src={starSvg}
          alt=""
          aria-hidden="true"
          className="stp-star-bg-img"
        />

        {/* Story text sits above the star, constrained to the inner ellipse */}
        <div className="stp-content">
          <div className="stp-name-tag">{childName}</div>
          <p className="stp-text">{text}</p>
        </div>
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
          padding: 2.5rem 1.5rem;
          min-height: 480px;
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
          z-index: 5;
        }

        /* Star container */
        .stp-star-wrapper {
          position: relative;
          width: 100%;
          max-width: 460px;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
        }

        /* Star SVG background floats */
        .stp-star-bg-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          z-index: 0;
          animation: stp-float 5s ease-in-out infinite;
          filter: drop-shadow(0 8px 24px rgba(245,166,35,0.35));
          user-select: none;
          pointer-events: none;
        }

        /* Content sits in the inner golden area */
        .stp-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
          max-width: 62%;
          margin-top: -6%;
          animation: stp-text-in 0.5s ease-out both;
        }

        .stp-name-tag {
          background: rgba(59, 40, 0, 0.08);
          color: #5c4203;
          font-size: 0.72rem;
          font-weight: 800;
          padding: 3px 12px;
          border-radius: 999px;
          border: 1px solid rgba(59, 40, 0, 0.18);
          letter-spacing: 0.04em;
        }

        .stp-text {
          font-size: clamp(0.72rem, 2vw, 0.95rem);
          line-height: 1.65;
          color: #3B2800;
          font-weight: 700;
          direction: rtl;
        }

        /* Sparkles */
        .stp-sparkle {
          position: absolute;
          color: #F5C97A;
          pointer-events: none;
          z-index: 1;
          animation: stp-twinkle 3s ease-in-out infinite;
        }
        .stp-sparkle--1 { top: 15%;   left: 10%;   font-size: 1.2rem; animation-delay: 0s;   }
        .stp-sparkle--2 { top: 12%;   right: 12%;  font-size: 0.8rem; animation-delay: 1.2s; }
        .stp-sparkle--3 { bottom: 12%; left: 16%;  font-size: 0.9rem; animation-delay: 0.6s; }

        /* Divider */
        .stp-divider {
          position: relative;
          z-index: 1;
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #D4A937, transparent);
          border-radius: 999px;
        }

        /* Animations */
        @keyframes stp-float {
          0%, 100% { transform: translateY(0) rotate(-0.8deg); }
          50%       { transform: translateY(-6px) rotate(0.8deg); }
        }

        @keyframes stp-text-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }

        @keyframes stp-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
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
