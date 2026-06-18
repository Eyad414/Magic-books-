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

// White fluffy cloud with a tall solid core so text stays fully inside.
const CLOUD_BG =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 240' preserveAspectRatio='none'%3E%3Cg fill='%23ffffff'%3E%3Cellipse cx='78' cy='95' rx='66' ry='62'/%3E%3Cellipse cx='150' cy='62' rx='84' ry='60'/%3E%3Cellipse cx='222' cy='95' rx='66' ry='62'/%3E%3Cellipse cx='70' cy='150' rx='58' ry='60'/%3E%3Cellipse cx='230' cy='150' rx='58' ry='60'/%3E%3Cellipse cx='110' cy='192' rx='66' ry='56'/%3E%3Cellipse cx='190' cy='192' rx='66' ry='56'/%3E%3Crect x='40' y='80' width='220' height='130' rx='55'/%3E%3C/g%3E%3C/svg%3E\")";

export function StoryTextPage({ pageNumber, text, childName }: StoryTextPageProps) {
  const pageColor = PAGE_COLORS[Math.floor(pageNumber / 2) % PAGE_COLORS.length];

  return (
    <section
      className="book-page story-text-page"
      aria-label={`صفحة النص ${pageNumber}`}
      style={{ ['--page-color' as any]: pageColor }}
    >
      {/* Page number badge */}
      <span className="stp-badge">{pageNumber}</span>

      {/* Cloud text bubble */}
      <div className="stp-cloud" aria-label={childName}>
        <div className="stp-content">
          <p className="stp-text">{text}</p>
        </div>
      </div>

      <style>{`
        .story-text-page {
          background:
            radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,0.18) 0%, transparent 55%),
            var(--page-color, #F2607A);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 2rem;
          min-height: 480px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }

        /* Cloud bubble */
        .stp-cloud {
          position: relative;
          width: 100%;
          max-width: 440px;
          background-image: ${CLOUD_BG};
          background-size: 100% 100%;
          background-repeat: no-repeat;
          filter: drop-shadow(0 14px 28px rgba(0,0,0,0.25));
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5.5rem 3.2rem;
          animation: stp-float 6s ease-in-out infinite;
        }

        /* Page badge */
        .stp-badge {
          position: absolute;
          bottom: 14px;
          left: 18px;
          background: rgba(255,255,255,0.85);
          color: #333;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 999px;
          border: 1px solid rgba(212,169,55,0.3);
          z-index: 5;
        }

        /* Content inside the cloud */
        .stp-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.7rem;
          width: 100%;
          max-width: 68%;
          animation: stp-text-in 0.5s ease-out both;
        }

        .stp-text {
          font-size: clamp(0.9rem, 2.5vw, 1.2rem);
          line-height: 1.9;
          color: #2b2b2b;
          font-weight: 700;
          direction: rtl;
          margin: 0;
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
