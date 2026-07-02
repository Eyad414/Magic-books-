import { useTranslation } from 'react-i18next';

interface FanoosPageProps {
  /** Optional label for screen readers (e.g. "lantern of the beginning/end") */
  label?: string;
  /** Illustration/logo to show */
  image?: string;
}

export default function FanoosPage({ label, image = '/logo.png' }: FanoosPageProps) {
  const { t } = useTranslation();
  const resolvedLabel = label || t('storybook.fanoos_label', 'صفحة الفانوس');

  return (
    <section className="book-page fanoose-page" aria-label={resolvedLabel}>
      <img src={image} alt="Magic Fanoos" className="fp-logo-img" />
      <style>{`
        .fanoose-page {
          background: radial-gradient(ellipse at center, #1a2440 0%, #0a1020 100%);
          border: 1px solid rgba(212,169,55,0.18);
          min-height: 480px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          overflow: hidden;
        }
        .fp-logo-img {
          max-width: 94%;
          max-height: 90%;
          width: auto;
          height: auto;
          object-fit: contain;
          border-radius: 14px;
          filter: drop-shadow(0 10px 34px rgba(0,0,0,0.55));
        }
      `}</style>
    </section>
  );
}
