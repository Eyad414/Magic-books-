import { useTranslation } from 'react-i18next';

interface FanoosPageProps {
  /** Optional label for screen readers (e.g. "lantern of the beginning/end") */
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

      {/* Magic Fanoose logo (the lantern) */}
      <div className="fp-logo-wrap">
        <img src="/logo.png" alt="Magic Fanoose" className="fp-logo" />
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
          gap: 1.6rem;
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
          width: 280px; height: 280px;
          background: rgba(212,169,55,0.14);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation: fp-breathe 4s ease-in-out infinite;
        }
        .fp-orb--2 {
          width: 150px; height: 150px;
          background: rgba(0,212,200,0.08);
          top: 22%; left: 55%;
          animation: fp-breathe 5s ease-in-out infinite reverse;
        }

        /* Logo */
        .fp-logo-wrap { position: relative; z-index: 1; }
        .fp-logo {
          width: clamp(180px, 44vw, 250px);
          height: auto;
          filter: drop-shadow(0 0 30px rgba(212,169,55,0.45));
          animation: fp-float 4.5s ease-in-out infinite;
        }

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
        @keyframes fp-float {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>
    </section>
  );
}
