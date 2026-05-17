import React from 'react';
import starSvg from '../../assets/star-image-stroy 1.svg';

// ─── Props ────────────────────────────────────────────────────────────────────
interface StarTextProps {
  /** The story text to display inside the star (already has [NAME] replaced) */
  text: string;
  /** Optional page number badge shown at the bottom of the star */
  pageNumber?: number;
}

// ─── StarText Component ───────────────────────────────────────────────────────
// Renders story text perfectly centered inside the star.svg background.
// The star image is a fixed layer; text floats above it inside the inner ellipse.
const StarText: React.FC<StarTextProps> = ({ text, pageNumber }) => {
  return (
    <div className="star-text-root">

      {/* ── Star SVG background ─────────────────────────────────────────── */}
      <img
        src={starSvg}
        alt=""
        aria-hidden="true"
        className="star-text-img"
      />

      {/* ── Story text — sits inside the pale inner area of the star ────── */}
      <p className="star-text-body" dir="auto">
        {text}
      </p>

      {/* ── Optional page number badge ───────────────────────────────────── */}
      {pageNumber !== undefined && (
        <span className="star-page-badge" aria-label={`Page ${pageNumber}`}>
          {pageNumber}
        </span>
      )}

      <style>{`
        /* Container: square, relative, centred content */
        .star-text-root {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Star fills the whole container */
        .star-text-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          z-index: 0;
          animation: st-float 5s ease-in-out infinite;
          filter: drop-shadow(0 6px 20px rgba(245,166,35,0.35));
          user-select: none;
          pointer-events: none;
        }

        /* Text sits above the star, constrained to the inner ellipse */
        .star-text-body {
          position: relative;
          z-index: 1;
          /* The star's inner pale area is roughly 52% of total width */
          max-width: 52%;
          text-align: center;
          /* Dark brown so it reads well on the warm gold parchment */
          color: #3B2800;
          font-family: 'Noto Kufi Arabic', 'Inter', sans-serif;
          font-size: clamp(0.72rem, 1.8vw, 0.95rem);
          font-weight: 700;
          line-height: 1.7;
          letter-spacing: 0.01em;
          /* Nudge up slightly — star's belly sits a little above centre */
          margin-top: -6%;
          animation: st-text-in 0.5s ease-out both;
        }

        /* Subtle page number badge at bottom-centre */
        .star-page-badge {
          position: absolute;
          bottom: 18%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2;
          background: rgba(245, 166, 35, 0.15);
          color: #7a5c00;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(245,166,35,0.3);
          letter-spacing: 0.05em;
          pointer-events: none;
        }

        /* ── Keyframes ──────────────────────────────────────────────────── */
        @keyframes st-float {
          0%, 100% { transform: translateY(0)  rotate(-0.8deg); }
          50%       { transform: translateY(-7px) rotate(0.8deg); }
        }

        @keyframes st-text-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
};

export default StarText;
