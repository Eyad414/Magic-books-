import { useTranslation } from 'react-i18next';

interface FanoosPageProps {
  /** Optional label for screen readers (e.g. "lantern of the beginning/end") */
  label?: string;
  /** Lantern illustration to show (defaults to the "start" lantern) */
  image?: string;
}

export default function FanoosPage({ label, image = '/lantern-start.jpg' }: FanoosPageProps) {
  const { t } = useTranslation();
  const resolvedLabel = label || t('storybook.fanoos_label', 'صفحة الفانوس');

  return (
    <section className="book-page fanoose-page" aria-label={resolvedLabel}>

      {/* Big kid-friendly lantern illustration (fills the page) */}
      <img src={image} alt="" className="fp-lantern" aria-hidden="true" />

      {/* Soft scrim so the caption stays readable */}
      <div className="fp-scrim" aria-hidden="true" />

      {/* Caption */}
      <p className="fp-caption">{t('storybook.magic_fanoos_caption', '✦ فانوس السحر ✦')}</p>

      <style>{`
        .fanoose-page {
          position: relative;
          background: #0a1626;
          border: 1px solid rgba(212,169,55,0.18);
          min-height: 480px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: hidden;
        }
        .fp-lantern {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .fp-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 62%, rgba(5,10,21,0.78) 100%);
          pointer-events: none;
        }
        .fp-caption {
          position: relative;
          z-index: 1;
          margin: 0 0 1.6rem;
          color: rgba(255,243,196,0.92);
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.22em;
          text-shadow: 0 2px 12px rgba(0,0,0,0.85);
        }
      `}</style>
    </section>
  );
}
