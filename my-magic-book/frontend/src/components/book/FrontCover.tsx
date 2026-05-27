// ─── Page 1: Front Cover ─────────────────────────────────────────────────────
// Layout (220 × 220 mm square — real printed-book format):
//   • Full-bleed theme illustration as background (FIXED per theme, never changes per child)
//   • Child photo centred in a glowing gold star-frame
//   • Story title + child name in bold Arabic below photo
//   • Magic Fanoose logo + website in the footer strip
//
// When a different child orders the SAME theme story:
//   → background stays identical (same illustration)
//   → only childPhoto + childName change

interface FrontCoverProps {
  childName:  string;
  storyTitle: string;   // e.g. "إياد في مغامرة الفضاء"
  coverImage: string;   // URL of the theme background illustration
  childPhoto?: string;  // URL of child's uploaded photo
}

export default function FrontCover({
  childName,
  storyTitle,
  coverImage,
  childPhoto = '',
}: FrontCoverProps) {

  // Fallback avatar when no photo supplied
  const photoSrc = childPhoto ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=D4A937&color=0a1628&size=400&bold=true&font-size=0.4`;

  return (
    <section className="book-page fc-root" aria-label="الغلاف الأمامي">

      {/* ── 1. Full-bleed theme illustration (fixed per theme) ─────────────── */}
      <div className="fc-bg" aria-hidden="true">
        <img
          src={coverImage}
          alt=""
          className="fc-bg-img"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=800&auto=format&fit=crop';
          }}
        />
        {/* Top gradient — logo area stays legible */}
        <div className="fc-overlay-top" />
        {/* Bottom gradient — title area stays legible */}
        <div className="fc-overlay-bottom" />
        {/* Very subtle center vignette so photo pops */}
        <div className="fc-vignette" />
      </div>

      {/* ── 2. Top branding strip ─────────────────────────────────────────── */}
      <div className="fc-top-strip" aria-hidden="true">
        <img src="/logo.png" alt="Magic Fanoose" className="fc-top-logo"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <span className="fc-top-brand">Magic Fanoose</span>
        <span className="fc-top-presents">يُقدّم</span>
      </div>

      {/* ── 3. Centre — child photo + story title ─────────────────────────── */}
      <div className="fc-center">

        {/* Decorative outer ring */}
        <div className="fc-ring-outer" aria-hidden="true" />

        {/* Decorative inner ring */}
        <div className="fc-ring-inner" aria-hidden="true" />

        {/* Gold star / sunburst behind photo */}
        <div className="fc-sunburst" aria-hidden="true">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="fc-ray"
              style={{ transform: `rotate(${i * 22.5}deg)` }}
            />
          ))}
        </div>

        {/* Child photo */}
        <div className="fc-photo-wrap">
          <img
            src={photoSrc}
            alt={childName}
            className="fc-photo"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=D4A937&color=0a1628&size=400&bold=true`;
            }}
          />
          {/* Shiny arc overlay on photo */}
          <div className="fc-photo-shine" aria-hidden="true" />
        </div>

        {/* Story title block */}
        <div className="fc-title-block">
          <p className="fc-subtitle">✦ قصة مخصصة لـ ✦</p>
          <h1 className="fc-child-name">{childName}</h1>
          <p className="fc-story-title">{storyTitle.replace(childName, '').trim() || storyTitle}</p>
        </div>

      </div>

      {/* ── 4. Bottom footer strip ────────────────────────────────────────── */}
      <div className="fc-footer">
        <div className="fc-footer-inner">
          <img src="/logo.png" alt="Magic Fanoose" className="fc-footer-logo"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="fc-footer-text">
            <span className="fc-footer-brand">Magic Fanoose</span>
            <span className="fc-footer-url">🌐 MagicFanoose.com</span>
          </div>
          <div className="fc-footer-badge">كتاب شخصي</div>
        </div>
      </div>

      {/* ── Styles ────────────────────────────────────────────────────────── */}
      <style>{`
        /* Root — square, real-book proportions */
        .fc-root {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;          /* 220 × 220 mm when printed */
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: stretch;
          box-shadow:
            0 32px 80px rgba(0,0,0,0.65),
            0 0 0 3px rgba(212,169,55,0.5),
            inset 0 0 0 1px rgba(212,169,55,0.15);
        }

        /* ── Background ── */
        .fc-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .fc-bg-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center center;
        }
        .fc-overlay-top {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 28%;
          background: linear-gradient(to bottom, rgba(5,12,30,0.88) 0%, transparent 100%);
        }
        .fc-overlay-bottom {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 42%;
          background: linear-gradient(to top, rgba(5,12,30,0.95) 0%, rgba(5,12,30,0.6) 55%, transparent 100%);
        }
        .fc-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 38%, rgba(5,12,30,0.3) 100%);
        }

        /* ── Top strip ── */
        .fc-top-strip {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.7rem 1.2rem 0.4rem;
        }
        .fc-top-logo {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: contain;
          filter: drop-shadow(0 0 8px rgba(212,169,55,0.8));
        }
        .fc-top-brand {
          font-size: clamp(0.65rem, 2.5vw, 0.85rem);
          font-weight: 800;
          color: #D4A937;
          letter-spacing: 0.08em;
        }
        .fc-top-presents {
          font-size: clamp(0.6rem, 2vw, 0.75rem);
          color: rgba(255,255,255,0.7);
          font-weight: 600;
        }

        /* ── Centre ── */
        .fc-center {
          position: relative;
          z-index: 2;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 0 1rem;
        }

        /* Decorative rings */
        .fc-ring-outer,
        .fc-ring-inner {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .fc-ring-outer {
          width: clamp(155px, 48%, 210px);
          aspect-ratio: 1;
          border: 2px solid rgba(212,169,55,0.25);
          animation: fc-ring-spin 18s linear infinite;
        }
        .fc-ring-inner {
          width: clamp(130px, 40%, 180px);
          aspect-ratio: 1;
          border: 1.5px dashed rgba(212,169,55,0.18);
          animation: fc-ring-spin 12s linear infinite reverse;
        }
        @keyframes fc-ring-spin {
          to { transform: rotate(360deg); }
        }

        /* Sunburst */
        .fc-sunburst {
          position: absolute;
          width: clamp(120px, 38%, 170px);
          aspect-ratio: 1;
          pointer-events: none;
        }
        .fc-ray {
          position: absolute;
          top: 50%; left: 50%;
          width: 2px;
          height: 50%;
          margin-left: -1px;
          transform-origin: bottom center;
          background: linear-gradient(to top, rgba(212,169,55,0.35), transparent);
        }

        /* Photo frame */
        .fc-photo-wrap {
          position: relative;
          width: clamp(90px, 28%, 130px);
          aspect-ratio: 1;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #D4A937;
          box-shadow:
            0 0 0 5px rgba(212,169,55,0.2),
            0 0 0 9px rgba(212,169,55,0.08),
            0 12px 40px rgba(0,0,0,0.55),
            0 0 30px rgba(212,169,55,0.3);
          z-index: 2;
          flex-shrink: 0;
        }
        .fc-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }
        .fc-photo-shine {
          position: absolute;
          top: -20%;
          left: -20%;
          width: 60%;
          height: 60%;
          background: radial-gradient(ellipse at center, rgba(255,255,255,0.25) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
        }

        /* Title block */
        .fc-title-block {
          margin-top: 0.7rem;
          text-align: center;
          z-index: 2;
        }
        .fc-subtitle {
          font-size: clamp(0.55rem, 1.8vw, 0.72rem);
          color: rgba(212,169,55,0.75);
          letter-spacing: 0.1em;
          margin: 0 0 0.2rem;
          font-weight: 600;
        }
        .fc-child-name {
          font-size: clamp(1.6rem, 6vw, 2.8rem);
          font-weight: 900;
          line-height: 1;
          margin: 0 0 0.25rem;
          /* Gold shimmer text */
          background: linear-gradient(135deg, #fff8dc 0%, #D4A937 40%, #ffe082 60%, #D4A937 80%, #fff8dc 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: fc-shimmer 4s linear infinite;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.6));
        }
        .fc-story-title {
          font-size: clamp(0.7rem, 2.5vw, 1.1rem);
          color: rgba(255,255,255,0.9);
          font-weight: 700;
          line-height: 1.3;
          text-shadow: 0 1px 6px rgba(0,0,0,0.8);
          margin: 0;
        }
        @keyframes fc-shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }

        /* ── Footer strip ── */
        .fc-footer {
          position: relative;
          z-index: 2;
          background: rgba(5,12,30,0.82);
          border-top: 1px solid rgba(212,169,55,0.35);
          padding: 0.5rem 1rem;
          backdrop-filter: blur(10px);
        }
        .fc-footer-inner {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          justify-content: space-between;
        }
        .fc-footer-logo {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          object-fit: contain;
          filter: drop-shadow(0 0 6px rgba(212,169,55,0.6));
          flex-shrink: 0;
        }
        .fc-footer-text {
          display: flex;
          flex-direction: column;
          gap: 0.05rem;
          flex: 1;
        }
        .fc-footer-brand {
          font-size: clamp(0.55rem, 1.8vw, 0.72rem);
          font-weight: 800;
          color: #D4A937;
          line-height: 1.2;
        }
        .fc-footer-url {
          font-size: clamp(0.48rem, 1.5vw, 0.62rem);
          color: rgba(212,169,55,0.6);
          font-weight: 600;
          line-height: 1.2;
        }
        .fc-footer-badge {
          font-size: clamp(0.5rem, 1.6vw, 0.65rem);
          background: rgba(212,169,55,0.15);
          border: 1px solid rgba(212,169,55,0.3);
          border-radius: 6px;
          padding: 0.15rem 0.5rem;
          color: rgba(212,169,55,0.85);
          font-weight: 700;
          white-space: nowrap;
          flex-shrink: 0;
        }
      `}</style>
    </section>
  );
}
