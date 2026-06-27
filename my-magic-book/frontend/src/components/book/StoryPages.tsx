// ─── Story Body Pages ─────────────────────────────────────────────────────────
// Two sub-components: StoryTextPage & StoryImagePage.
// Used for pages 5-30 (26 pages, alternating text → image).


// ── Text page ─────────────────────────────────────────────────────────────────
interface StoryTextPageProps {
  pageNumber: number;
  text: string;        // already has child's name baked in
  childName: string;
}

// Solid page colors cycled per page, Taletoons-style.
const PAGE_COLORS = ['#F2607A', '#3FB8AF', '#F5B945', '#8E7CC3', '#6AAED6', '#7BC67E'];

// Decorative floating sparkles scattered on the colored page around the card.
const SPARKLES = [
  { top: '10%', left: '12%', size: '1.1rem', delay: '0s' },
  { top: '16%', left: '82%', size: '0.8rem', delay: '0.8s' },
  { top: '34%', left: '6%', size: '0.7rem', delay: '1.6s' },
  { top: '70%', left: '88%', size: '1rem', delay: '0.4s' },
  { top: '82%', left: '14%', size: '0.85rem', delay: '1.2s' },
  { top: '88%', left: '70%', size: '0.7rem', delay: '2s' },
];

export function StoryTextPage({ pageNumber, text, childName }: StoryTextPageProps) {
  const pageColor = PAGE_COLORS[Math.floor(pageNumber / 2) % PAGE_COLORS.length];

  return (
    <section
      className="book-page story-text-page"
      aria-label={`صفحة النص ${pageNumber}`}
      style={{ ['--page-color' as any]: pageColor }}
    >
      {/* Twinkling sparkles on the colored page */}
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="stp-sparkle"
          aria-hidden="true"
          style={{ top: s.top, left: s.left, fontSize: s.size, animationDelay: s.delay }}
        >
          ✦
        </span>
      ))}

      {/* Page number badge */}
      <span className="stp-badge">{pageNumber}</span>

      {/* ── Magic-lantern story card ── */}
      <div className="stp-card" aria-label={childName}>
        {/* Glowing lantern emblem hugging the top edge */}
        <div className="stp-lantern" aria-hidden="true">🏮</div>

        {/* Decorative corner flourishes */}
        <span className="stp-corner stp-corner--tl" aria-hidden="true">✦</span>
        <span className="stp-corner stp-corner--tr" aria-hidden="true">✦</span>
        <span className="stp-corner stp-corner--bl" aria-hidden="true">✦</span>
        <span className="stp-corner stp-corner--br" aria-hidden="true">✦</span>

        {/* Small gold divider under the lantern */}
        <div className="stp-divider" aria-hidden="true" />

        <div className="stp-content">
          <p className="stp-text">{text}</p>
        </div>
      </div>

      <style>{`
        .story-text-page {
          background:
            radial-gradient(130% 100% at 50% -10%, rgba(255,255,255,0.28) 0%, transparent 55%),
            radial-gradient(80% 60% at 50% 115%, rgba(0,0,0,0.18) 0%, transparent 60%),
            var(--page-color, #F2607A);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.8rem 2rem;
          min-height: 480px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }

        /* Sparkles */
        .stp-sparkle {
          position: absolute;
          color: rgba(255,255,255,0.85);
          text-shadow: 0 0 8px rgba(255,255,255,0.7);
          z-index: 1;
          animation: stp-twinkle 3s ease-in-out infinite;
          pointer-events: none;
        }

        /* ── Story card ── */
        .stp-card {
          position: relative;
          width: 100%;
          max-width: 430px;
          background:
            radial-gradient(120% 90% at 50% 0%, #fffdf8 0%, #fdf4dd 70%, #f8ead0 100%);
          border-radius: 30px;
          padding: 3.4rem 2.4rem 2.6rem;
          box-shadow:
            0 22px 48px rgba(0,0,0,0.28),
            0 0 0 2px rgba(255,255,255,0.6) inset;
          z-index: 2;
          animation: stp-float 6s ease-in-out infinite, stp-card-in 0.6s ease-out both;
        }
        /* Dashed gold inner frame */
        .stp-card::before {
          content: '';
          position: absolute;
          inset: 12px;
          border: 2px dashed rgba(201,150,40,0.55);
          border-radius: 20px;
          pointer-events: none;
        }
        /* Soft gold outer halo */
        .stp-card::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 36px;
          background: linear-gradient(135deg, rgba(212,169,55,0.5), rgba(255,225,150,0.15), rgba(212,169,55,0.5));
          z-index: -1;
          filter: blur(8px);
        }

        /* Lantern emblem */
        .stp-lantern {
          position: absolute;
          top: -26px;
          left: 50%;
          transform: translateX(-50%);
          width: 54px;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.7rem;
          border-radius: 50%;
          background: radial-gradient(circle at 50% 35%, #fff6da, #f3d98f 70%, #d4a937);
          box-shadow: 0 0 18px rgba(212,169,55,0.85), 0 6px 14px rgba(0,0,0,0.25);
          border: 2px solid #fff;
          z-index: 3;
          animation: stp-glow 3.5s ease-in-out infinite;
        }

        /* Corner flourishes */
        .stp-corner {
          position: absolute;
          color: rgba(201,150,40,0.8);
          font-size: 0.85rem;
          z-index: 3;
        }
        .stp-corner--tl { top: 18px; left: 22px; }
        .stp-corner--tr { top: 18px; right: 22px; }
        .stp-corner--bl { bottom: 18px; left: 22px; }
        .stp-corner--br { bottom: 18px; right: 22px; }

        /* Divider */
        .stp-divider {
          width: 70px;
          height: 3px;
          margin: 0 auto 1rem;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, #d4a937, transparent);
        }

        /* Page badge */
        .stp-badge {
          position: absolute;
          bottom: 14px;
          left: 18px;
          background: linear-gradient(135deg, #fff6da, #f3d98f);
          color: #6b4a00;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 3px 11px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 2px 6px rgba(0,0,0,0.18);
          z-index: 5;
        }

        /* Content */
        .stp-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
        }

        .stp-text {
          font-size: clamp(0.95rem, 2.6vw, 1.22rem);
          line-height: 2;
          color: #4a3206;
          font-weight: 700;
          direction: rtl;
          margin: 0;
          text-shadow: 0 1px 0 rgba(255,255,255,0.6);
        }

        /* Animations */
        @keyframes stp-float {
          0%, 100% { transform: translateY(0) rotate(-0.6deg); }
          50%       { transform: translateY(-7px) rotate(0.6deg); }
        }
        @keyframes stp-card-in {
          from { opacity: 0; transform: translateY(14px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1);       }
        }
        @keyframes stp-glow {
          0%, 100% { box-shadow: 0 0 14px rgba(212,169,55,0.7), 0 6px 14px rgba(0,0,0,0.25); }
          50%       { box-shadow: 0 0 26px rgba(212,169,55,1), 0 6px 14px rgba(0,0,0,0.25); }
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
        /* Full-bleed photo page (Taletoons style) */
        .story-image-page {
          background: #060a12;
          position: relative;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          padding: 0;
        }

        .sip-img-wrapper {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .sip-img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .sip-badge {
          position: absolute;
          bottom: 12px;
          left: 14px;
          background: rgba(10,22,40,0.7);
          color: #fff;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 999px;
          backdrop-filter: blur(6px);
          z-index: 2;
        }
      `}</style>
    </section>
  );
}
