import { useTranslation } from 'react-i18next';

interface FanoosPageProps {
  /** Optional label for screen readers */
  label?: string;
}

export default function FanoosPage({ label }: FanoosPageProps) {
  const { t } = useTranslation();
  const resolvedLabel = label || t('storybook.fanoos_label', 'صفحة الفانوس');

  return (
    <section className="book-page fanoose-page" aria-label={resolvedLabel}>

      {/* Ambient glow orbs */}
      <div className="fp-orb fp-orb--1" aria-hidden="true" />
      <div className="fp-orb fp-orb--2" aria-hidden="true" />

      {/* Fanoose SVG illustration */}
      <div className="fp-fanoose" aria-hidden="true">
        <svg
          viewBox="0 0 200 260"
          xmlns="http://www.w3.org/2000/svg"
          className="fp-svg"
        >
          {/* Defs: glow + gradient */}
          <defs>
            <radialGradient id="fp-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"  stopColor="#ffe47a" stopOpacity="1" />
              <stop offset="60%" stopColor="#D4A937" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B5E0A" stopOpacity="0" />
            </radialGradient>
            <filter id="fp-blur">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* Glow halo behind lantern */}
          <ellipse cx="100" cy="155" rx="55" ry="55"
            fill="url(#fp-glow)" filter="url(#fp-blur)" opacity="0.55" />

          {/* Lantern body */}
          <rect x="70" y="100" width="60" height="90" rx="8"
            fill="#1a1000" stroke="#D4A937" strokeWidth="2.5" />

          {/* Glass panels (warm glow) */}
          <rect x="74" y="104" width="52" height="82" rx="6" fill="#D4A937" opacity="0.18" />
          {/* Inner flame glow */}
          <ellipse cx="100" cy="145" rx="18" ry="26" fill="#ffe47a" opacity="0.22" />

          {/* Decorative top crown */}
          <polygon points="80,100 100,78 120,100"
            fill="#D4A937" stroke="#8B5E0A" strokeWidth="1.5" />
          <circle cx="100" cy="75" r="5" fill="#D4A937" />
          <line x1="100" y1="70" x2="100" y2="50" stroke="#D4A937" strokeWidth="2.5"
            strokeLinecap="round" />
          <circle cx="100" cy="47" r="5" fill="#D4A937" />

          {/* Bottom base */}
          <rect x="78" y="190" width="44" height="8" rx="4"
            fill="#D4A937" opacity="0.9" />
          <rect x="84" y="198" width="32" height="6" rx="3"
            fill="#8B5E0A" opacity="0.7" />

          {/* Vertical decorative bars */}
          {[82, 94, 106, 118].map((x, i) => (
            <line key={i} x1={x} y1="104" x2={x} y2="186"
              stroke="#D4A937" strokeWidth="1" opacity="0.5" />
          ))}

          {/* Horizontal decorative bands */}
          <line x1="70" y1="140" x2="130" y2="140"
            stroke="#D4A937" strokeWidth="1.2" opacity="0.4" />
          <line x1="70" y1="155" x2="130" y2="155"
            stroke="#D4A937" strokeWidth="1.2" opacity="0.4" />

          {/* Magic smoke / sparkles rising from the top */}
          <path d="M100 45 Q94 35 100 25 Q106 15 100 5"
            fill="none" stroke="#00d4c8" strokeWidth="2" strokeLinecap="round"
            opacity="0.8" className="fp-smoke fp-smoke--1" />
          <path d="M94 42 Q88 30 95 20"
            fill="none" stroke="#00d4c8" strokeWidth="1.5" strokeLinecap="round"
            opacity="0.55" className="fp-smoke fp-smoke--2" />
          <path d="M106 42 Q112 30 105 20"
            fill="none" stroke="#00d4c8" strokeWidth="1.5" strokeLinecap="round"
            opacity="0.55" className="fp-smoke fp-smoke--3" />

          {/* Sparkle dots */}
          {[[92,18],[100,10],[108,16],[96,6],[104,8]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="1.8"
              fill="#00d4c8" opacity="0.7" className={`fp-spark fp-spark--${i}`} />
          ))}
        </svg>
      </div>

      {/* Caption */}
      <p className="fp-caption">{t('storybook.magic_fanoos_caption', '✦ فانوس السحر ✦')}</p>

      <style>{`
        .fanoose-page {
          background: radial-gradient(ellipse at center, #0d1a2e 0%, #050a15 100%);
          border: 1px solid rgba(212,169,55,0.18);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.5rem;
          padding: 3rem 2rem;
          min-height: 480px;
          position: relative;
          overflow: hidden;
        }

        /* Ambient glows */
        .fp-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(60px);
        }
        .fp-orb--1 {
          width: 260px; height: 260px;
          background: rgba(212,169,55,0.12);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: fp-breathe 4s ease-in-out infinite;
        }
        .fp-orb--2 {
          width: 140px; height: 140px;
          background: rgba(0,212,200,0.08);
          top: 20%; left: 55%;
          animation: fp-breathe 5s ease-in-out infinite reverse;
        }

        /* SVG */
        .fp-fanoose { position: relative; z-index: 1; }
        .fp-svg {
          width: clamp(160px, 40vw, 220px);
          height: auto;
          filter: drop-shadow(0 0 28px rgba(212,169,55,0.5));
        }

        /* Smoke animations */
        .fp-smoke--1 { animation: fp-rise 3s ease-in-out infinite; }
        .fp-smoke--2 { animation: fp-rise 3.4s ease-in-out infinite 0.5s; }
        .fp-smoke--3 { animation: fp-rise 3.8s ease-in-out infinite 1s; }

        /* Sparkle animations */
        .fp-spark--0 { animation: fp-sparkle 2s ease-in-out infinite; }
        .fp-spark--1 { animation: fp-sparkle 2.3s ease-in-out infinite 0.4s; }
        .fp-spark--2 { animation: fp-sparkle 1.8s ease-in-out infinite 0.8s; }
        .fp-spark--3 { animation: fp-sparkle 2.5s ease-in-out infinite 0.2s; }
        .fp-spark--4 { animation: fp-sparkle 2.1s ease-in-out infinite 1.1s; }

        /* Caption */
        .fp-caption {
          position: relative;
          z-index: 1;
          color: rgba(212,169,55,0.7);
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.2em;
        }

        @keyframes fp-breathe {
          0%, 100% { opacity: 0.6; transform: translate(-50%,-50%) scale(0.95); }
          50%       { opacity: 1;   transform: translate(-50%,-50%) scale(1.05); }
        }
        @keyframes fp-rise {
          0%   { opacity: 0.8; transform: translateY(0); }
          100% { opacity: 0;   transform: translateY(-18px); }
        }
        @keyframes fp-sparkle {
          0%, 100% { opacity: 0.2; r: 1.2; }
          50%       { opacity: 1;   r: 2.5; }
        }
      `}</style>
    </section>
  );
}
