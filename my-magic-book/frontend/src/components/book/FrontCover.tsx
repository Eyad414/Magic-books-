// ─── Page 1: Front Cover ──────────────────────────────────────────────────────
// Layout: story photo fills the background, child's name as centered hero title,
// MagicFanoose.com in the footer strip.

interface FrontCoverProps {
  childName: string;
  storyTitle: string;   // e.g. "مغامرة في حديقة الحيوانات"
  coverImage: string;   // URL / path to the full-bleed cover illustration
}

export default function FrontCover({ childName, storyTitle, coverImage }: FrontCoverProps) {
  return (
    <section className="book-page book-page--cover" aria-label="الغلاف الأمامي">

      {/* ── Background illustration — full-bleed ── */}
      <div className="cover-bg" aria-hidden="true">
        <img
          src={coverImage}
          alt=""
          className="cover-bg-img"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              'https://placehold.co/800x1100/0a1628/D4A937?text=🏮';
          }}
        />
        {/* Gradient overlay so text stays readable */}
        <div className="cover-overlay" />
      </div>

      {/* ── Centered title block ── */}
      <div className="cover-content">
        <div className="cover-logo-row">
          <img src="/logo.png" alt="Magic Fanoose" className="cover-logo" />
        </div>

        <div className="cover-title-block">
          <p className="cover-presents">✦ Magic Fanoose يُقدّم ✦</p>
          <h1 className="cover-name">{childName}</h1>
          <p className="cover-story-title">{storyTitle}</p>
        </div>
      </div>

      {/* ── Footer strip ── */}
      <div className="cover-footer">
        <span className="cover-website">🌐 MagicFanoose.com</span>
      </div>

      <style>{`
        .book-page--cover {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 4;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 24px 80px rgba(0,0,0,0.55);
        }

        /* Background */
        .cover-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .cover-bg-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }
        .cover-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10,22,40,0.35) 0%,
            rgba(10,22,40,0.15) 35%,
            rgba(10,22,40,0.65) 70%,
            rgba(10,22,40,0.92) 100%
          );
        }

        /* Content */
        .cover-content {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding: 1.5rem 1.5rem 2rem;
          text-align: center;
        }
        .cover-logo-row {
          position: absolute;
          top: 1.2rem;
          left: 50%;
          transform: translateX(-50%);
        }
        .cover-logo {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          object-fit: contain;
          filter: drop-shadow(0 0 12px rgba(212,169,55,0.7));
        }
        .cover-title-block {
          width: 100%;
        }
        .cover-presents {
          font-size: 0.75rem;
          color: rgba(212,169,55,0.8);
          letter-spacing: 0.12em;
          font-weight: 600;
          margin-bottom: 0.4rem;
        }
        .cover-name {
          font-size: clamp(2.2rem, 7vw, 3.6rem);
          font-weight: 900;
          line-height: 1.1;
          background: linear-gradient(135deg, #fff8dc 0%, #D4A937 50%, #fff8dc 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: cover-shimmer 3s linear infinite;
          margin: 0 0 0.35rem;
          text-shadow: none;
        }
        .cover-story-title {
          font-size: clamp(1rem, 3vw, 1.4rem);
          color: rgba(255,255,255,0.88);
          font-weight: 700;
          line-height: 1.35;
        }

        /* Footer strip */
        .cover-footer {
          position: relative;
          z-index: 1;
          background: rgba(10,22,40,0.72);
          border-top: 1px solid rgba(212,169,55,0.3);
          padding: 0.55rem 1.5rem;
          text-align: center;
          backdrop-filter: blur(8px);
        }
        .cover-website {
          font-size: 0.78rem;
          color: rgba(212,169,55,0.9);
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        @keyframes cover-shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </section>
  );
}
