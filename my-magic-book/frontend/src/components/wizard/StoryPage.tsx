import React from 'react';
import { useStoryProgress } from '../../context/StoryProgressContext';
import starImage from '../../assets/star-image-stroy 1.svg';

// ─── Props ────────────────────────────────────────────────────────────────────
// All three props are optional because StoryPage can also read them straight
// from the global StoryProgressContext (whatever the customer typed in Step 1).
// If a prop is passed explicitly it takes priority over the context value.
interface StoryPageProps {
  /** Override the child's name (defaults to what was entered in Step 1) */
  childName?: string;
  /**
   * Override the photo source (defaults to the photo uploaded in Step 1).
   * Accepts any URL / object-URL / import path.
   */
  childPhoto?: string;
  /**
   * Optional custom story text.
   * When omitted the default 20-word template is used with the child's name.
   */
  pageText?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
const StoryPage: React.FC<StoryPageProps> = ({
  childName: nameProp,
  childPhoto: photoProp,
  pageText,
}) => {
  // Pull whatever the customer entered in Step 1 from the global context
  const { progress } = useStoryProgress();
  const contextName  = progress.childDetails.childName  ?? '';
  const contextPhoto = progress.childDetails.childPhotoUrl ?? '';

  // Explicit props take priority; fall back to context values
  const childName  = nameProp  || contextName  || 'الطفل'; // Arabic fallback label
  const childPhoto = photoProp || contextPhoto;

  // ── Story text: template literal — re-evaluates whenever childName changes ──
  // Default is exactly 20 words with the child's name embedded.
  const storyText =
    pageText ??
    `في ليلة ساحرة، وجد ${childName} نجمة متوهجة منحته ثلاث أمنيات وغيّرت حياته إلى الأبد.`;

  return (
    <div className="story-page" aria-label={`Story page for ${childName}`}>

      {/* ── Child photo ──────────────────────────────────────────────────── */}
      {childPhoto && (
        <div className="story-photo-wrapper">
          <img
            src={childPhoto}
            alt={`${childName}`}
            className="story-photo"
            onError={(e) => {
              // Graceful fallback: initials avatar when the image can't load
              (e.currentTarget as HTMLImageElement).src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=F5A623&color=0D0F1A&size=200&bold=true&font-size=0.4`;
            }}
          />
          {/* Animated dashed ring around the avatar */}
          <div className="story-photo-ring" aria-hidden="true" />
        </div>
      )}

      {/* ── Text container — star PNG is the background ──────────────────── */}
      <div className="story-text-container">
        {/*
          The original star image exported from Figma.
          It sits as an absolutely-positioned layer behind the text.
        */}
        <img
          src={starImage}
          alt=""
          aria-hidden="true"
          className="story-star-bg"
        />

        {/* Story paragraph — floats above the star's inner golden area */}
        <p className="story-text" dir="auto">
          {storyText}
        </p>
      </div>

      {/* ── Floating sparkles ────────────────────────────────────────────── */}
      <span className="story-sparkle story-sparkle--1" aria-hidden="true">✦</span>
      <span className="story-sparkle story-sparkle--2" aria-hidden="true">✦</span>
      <span className="story-sparkle story-sparkle--3" aria-hidden="true">✧</span>

      <style>{`
        /* ── Page wrapper ─────────────────────────────────────────────────── */
        .story-page {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 2rem 1.5rem 2rem;
          min-height: 520px;
          background: linear-gradient(160deg, #0D0F1A 0%, #1B1F5E 55%, #3B1F7A 100%);
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0,0,0,0.6), 0 0 40px rgba(108,63,197,0.25);
          font-family: 'Noto Kufi Arabic', 'Inter', sans-serif;
        }

        /* ── Child photo ──────────────────────────────────────────────────── */
        .story-photo-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          flex-shrink: 0;
          z-index: 2;
        }

        .story-photo {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #F5A623;
          box-shadow: 0 0 0 6px rgba(245,166,35,0.2), 0 8px 30px rgba(0,0,0,0.5);
          display: block;
          animation: sp-photo-enter 0.6s cubic-bezier(0.34,1.56,0.64,1) both;
        }

        /* Slow-spinning dashed ring behind the avatar */
        .story-photo-ring {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          border: 2px dashed rgba(245,166,35,0.45);
          animation: sp-spin 12s linear infinite;
        }

        /* ── Text container ───────────────────────────────────────────────── */
        .story-text-container {
          position: relative;
          width: 100%;
          max-width: 380px;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Height proportional to the star image (roughly square) */
          aspect-ratio: 1 / 1;
          z-index: 2;
        }

        /* The original Figma star PNG fills the entire container */
        .story-star-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: contain;
          z-index: 0;
          animation: sp-float 5s ease-in-out infinite;
          filter: drop-shadow(0 8px 28px rgba(245,166,35,0.4));
        }

        /* Story text — sits inside the pale inner area of the star */
        .story-text {
          position: relative;
          z-index: 1;
          /* Constrain to the inner golden ellipse of the star shape */
          max-width: 52%;
          text-align: center;
          color: #3B2800;
          font-size: clamp(0.78rem, 2vw, 0.97rem);
          font-weight: 700;
          line-height: 1.65;
          letter-spacing: 0.01em;
          animation: sp-text-enter 0.7s 0.2s ease-out both;
          /* Nudge text slightly upward to sit in the star's belly */
          margin-top: -8%;
        }

        /* ── Floating sparkles ────────────────────────────────────────────── */
        .story-sparkle {
          position: absolute;
          color: #F5C97A;
          pointer-events: none;
          animation: sp-twinkle 3s ease-in-out infinite;
        }
        .story-sparkle--1 { top: 12%;   left: 6%;    font-size: 1.3rem; animation-delay: 0s;   }
        .story-sparkle--2 { top: 10%;   right: 7%;   font-size: 0.9rem; animation-delay: 1.1s; }
        .story-sparkle--3 { bottom: 6%; left: 14%;   font-size: 1rem;   animation-delay: 0.6s; }

        /* ── Keyframes ────────────────────────────────────────────────────── */
        @keyframes sp-float {
          0%, 100% { transform: translateY(0px)  rotate(-1deg); }
          50%       { transform: translateY(-8px) rotate(1deg);  }
        }
        @keyframes sp-spin {
          from { transform: rotate(0deg);   }
          to   { transform: rotate(360deg); }
        }
        @keyframes sp-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes sp-photo-enter {
          from { opacity: 0; transform: scale(0.6) rotate(-10deg); }
          to   { opacity: 1; transform: scale(1)   rotate(0deg);   }
        }
        @keyframes sp-text-enter {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>
    </div>
  );
};

export default StoryPage;
