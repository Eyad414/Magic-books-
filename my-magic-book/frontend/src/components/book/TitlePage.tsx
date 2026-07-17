// ─── Page 2: Inside Title Page ────────────────────────────────────────────────
// Layout: no background photo. Centered story title + logo + brand name.
// Dark navy / starfield aesthetic.

import { useTranslation } from 'react-i18next';

interface TitlePageProps {
  storyTitle: string;   // already has child's name baked in
  childName: string;
}

export default function TitlePage({ storyTitle, childName }: TitlePageProps) {
  const { t } = useTranslation();
  
  return (
    <section className="book-page title-page" aria-label={t('storybook.title_page_label', 'صفحة العنوان الداخلية')}>

      {/* Decorative twinkling stars */}
      <div className="tp-stars" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="tp-star"
            style={{ '--i': i } as React.CSSProperties}
          >✦</span>
        ))}
      </div>

      {/* Logo + brand */}
      <div className="tp-brand">
        <img src="/logo.png?v=7" alt="Magic Fanoos" className="tp-logo" />
        <span className="tp-brand-name">Magic Fanoos</span>
      </div>

      {/* Divider */}
      <div className="tp-divider" aria-hidden="true" />

      {/* Story title */}
      <div className="tp-center">
        <p className="tp-presents">✦ {t('title_page.presents', 'يُقدّم لـ')} {childName} ✦</p>
        <h1 className="tp-title">{storyTitle}</h1>
        <p className="tp-tagline">{t('title_page.dedicated_to_you', 'قصة مُهداة إليك وحدك')}</p>
      </div>

      {/* Bottom divider */}
      <div className="tp-divider tp-divider--bottom" aria-hidden="true" />
      <p className="tp-website">MagicFanoos.com</p>

      <style>{`
        .title-page {
          background: linear-gradient(160deg, #050a15 0%, #0a1628 50%, #0e1f3d 100%);
          border: 1px solid rgba(212,169,55,0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.2rem;
          padding: 3rem 2rem;
          min-height: 520px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        /* Stars */
        .tp-stars { position: absolute; inset: 0; pointer-events: none; }
        .tp-star {
          position: absolute;
          color: #D4A937;
          font-size: clamp(0.5rem, 1.2vw, 0.85rem);
          animation: tp-twinkle 4s ease-in-out infinite;
          animation-delay: calc(var(--i) * 0.25s);
          top: calc(5% + (var(--i) * 5.2%));
          left: calc(3% + (var(--i) * 5.6%));
          opacity: 0.4;
        }

        /* Brand row */
        .tp-brand {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .tp-logo {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          object-fit: contain;
          filter: drop-shadow(0 0 16px rgba(212,169,55,0.6));
        }
        .tp-brand-name {
          font-size: 1rem;
          font-weight: 800;
          color: #D4A937;
          letter-spacing: 0.12em;
        }

        /* Dividers */
        .tp-divider {
          position: relative;
          z-index: 1;
          width: 80px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #D4A937, transparent);
          border-radius: 999px;
        }
        .tp-divider--bottom { width: 120px; margin-top: auto; }

        /* Center content */
        .tp-center {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
        }
        .tp-presents {
          font-size: 0.8rem;
          color: rgba(212,169,55,0.7);
          font-weight: 600;
          letter-spacing: 0.1em;
        }
        .tp-title {
          font-size: clamp(1.6rem, 5vw, 2.6rem);
          font-weight: 900;
          color: #fff;
          line-height: 1.25;
          max-width: 420px;
          background: linear-gradient(135deg, #fff 30%, #D4A937 70%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .tp-tagline {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.45);
          font-weight: 500;
        }
        .tp-website {
          position: relative;
          z-index: 1;
          font-size: 0.72rem;
          color: rgba(212,169,55,0.5);
          letter-spacing: 0.1em;
          font-weight: 600;
        }

        @keyframes tp-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50%       { opacity: 0.8; transform: scale(1.2); }
        }
      `}</style>
    </section>
  );
}
