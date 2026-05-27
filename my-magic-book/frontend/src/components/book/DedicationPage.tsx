// ─── Page 4: Dedication Page ──────────────────────────────────────────────────
// Layout: child's photo (circular frame), dedication text, handwriting space.

import { useTranslation } from 'react-i18next';

interface DedicationPageProps {
  childName: string;
  childPhoto: string;   // URL / path to child photo
  dedicationText: string; // already has child's name baked in
}

export default function DedicationPage({ childName, childPhoto, dedicationText }: DedicationPageProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar' || i18n.language === 'he';
  
  return (
    <section 
      className="book-page dedication-page" 
      aria-label={t('storybook.dedication_page', 'صفحة الإهداء')}
      style={{ direction: isRtl ? 'rtl' : 'ltr' }}
    >

      {/* Decorative corner ornaments */}
      <span className="ded-corner ded-corner--tl" aria-hidden="true">✦</span>
      <span className="ded-corner ded-corner--tr" aria-hidden="true">✦</span>
      <span className="ded-corner ded-corner--bl" aria-hidden="true">✦</span>
      <span className="ded-corner ded-corner--br" aria-hidden="true">✦</span>

      {/* Child photo */}
      <div className="ded-photo-frame">
        <img
          src={childPhoto}
          alt={t('storybook.child_photo_alt', 'صورة {{name}}', { name: childName })}
          className="ded-photo"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=D4A937&color=0a1628&size=200&bold=true&font-size=0.4`;
          }}
        />
        <div className="ded-photo-ring" aria-hidden="true" />
      </div>

      {/* Title */}
      <h2 className="ded-heading">🌟 {t('storybook.special_dedication_title', 'إهداء خاص')} 🌟</h2>

      {/* Divider */}
      <div className="ded-divider" aria-hidden="true" />

      {/* Dedication text */}
      <p className="ded-text" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>{dedicationText}</p>

      {/* Handwriting lines — parents can write a personal message on the printed book */}
      <div className="ded-write-section">
        <p className="ded-write-label" style={{ textAlign: isRtl ? 'right' : 'left' }}>✍️ {t('storybook.custom_message_label', 'رسالتك الخاصة:')}</p>
        <div className="ded-lines">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ded-line" />
          ))}
        </div>
      </div>

      <style>{`
        .dedication-page {
          background: linear-gradient(145deg, #fdf8ee 0%, #fef3d0 50%, #fff8e1 100%);
          border: 3px solid #D4A937;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.4rem;
          padding: 2.5rem 2rem 2rem;
          min-height: 560px;
          position: relative;
          overflow: hidden;
          text-align: center;
        }

        /* Corners */
        .ded-corner {
          position: absolute;
          color: #D4A937;
          font-size: 1.4rem;
          opacity: 0.6;
        }
        .ded-corner--tl { top: 12px; left: 16px; }
        .ded-corner--tr { top: 12px; right: 16px; }
        .ded-corner--bl { bottom: 12px; left: 16px; }
        .ded-corner--br { bottom: 12px; right: 16px; }

        /* Photo */
        .ded-photo-frame {
          position: relative;
          width: 120px;
          height: 120px;
          flex-shrink: 0;
        }
        .ded-photo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid #D4A937;
          box-shadow: 0 0 0 6px rgba(212,169,55,0.18), 0 8px 24px rgba(0,0,0,0.15);
        }
        .ded-photo-ring {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 2px dashed rgba(212,169,55,0.45);
          animation: ded-spin 18s linear infinite;
        }

        /* Heading */
        .ded-heading {
          font-size: 1.3rem;
          font-weight: 900;
          color: #8B5E0A;
          margin: 0;
        }

        /* Divider */
        .ded-divider {
          width: 100px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #D4A937, transparent);
          border-radius: 999px;
          flex-shrink: 0;
        }

        /* Text */
        .ded-text {
          font-size: 1.05rem;
          line-height: 1.85;
          color: #3a2800;
          font-weight: 600;
          max-width: 360px;
          font-style: italic;
          direction: rtl;
        }

        /* Writing space */
        .ded-write-section {
          width: 100%;
          max-width: 380px;
          margin-top: auto;
        }
        .ded-write-label {
          font-size: 0.82rem;
          color: #8B5E0A;
          font-weight: 700;
          margin-bottom: 0.6rem;
          text-align: right;
        }
        .ded-lines { display: flex; flex-direction: column; gap: 10px; }
        .ded-line {
          width: 100%;
          height: 1px;
          background: rgba(212,169,55,0.4);
          border-bottom: 1.5px dashed rgba(139,94,10,0.3);
        }

        @keyframes ded-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
