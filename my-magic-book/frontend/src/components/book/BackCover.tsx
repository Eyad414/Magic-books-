import { useTranslation } from 'react-i18next';
import type { StoryDefinition } from '../../data/stories/types';

interface BackCoverProps {
  childName: string;
  childPhoto: string;
  /** The 3 stories to show as "More Adventures" recommendations */
  recommendedStories: StoryDefinition[];
}

export default function BackCover({ childName, childPhoto, recommendedStories }: BackCoverProps) {
  const { t, i18n } = useTranslation();

  return (
    <section className="book-page back-cover" aria-label={t('storybook.back_cover_aria', 'الغلاف الخلفي')} dir={i18n.dir()}>

      {/* Background gradient */}
      <div className="bc-bg" aria-hidden="true" />

      {/* Child photo + greeting */}
      <div className="bc-hero">
        <div className="bc-photo-frame">
          <img
            src={childPhoto}
            alt={t('storybook.photo_alt', 'صورة {{name}}', { name: childName })}
            className="bc-photo"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=D4A937&color=0a1628&size=200&bold=true`;
            }}
          />
          <div className="bc-photo-glow" aria-hidden="true" />
        </div>
        <h2 className="bc-greeting">{t('storybook.congrats', 'أحسنت يا {{name}}! 🌟', { name: childName })}</h2>
        <p className="bc-sub">{t('storybook.completed_desc', 'أتممت قراءة قصتك السحرية — استمر في المغامرة!')}</p>
      </div>

      <div className="bc-divider" aria-hidden="true" />

      {/* Recommended stories */}
      <div className="bc-stories-section">
        <h3 className="bc-stories-head">{t('storybook.more_adventures', '✨ مغامرات أخرى تنتظرك')}</h3>
        <div className="bc-stories-grid">
          {recommendedStories.slice(0, 3).map((story) => (
            <div key={story.id} className="bc-story-card">
              <div className="bc-story-thumb-wrap">
                <img
                  src={story.thumbnail}
                  alt={t(`stories.${story.id}.title`, story.titleAr).replace(/\[NAME\]/gi, childName)}
                  className="bc-story-thumb"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      `https://placehold.co/120x120/111840/D4A937?text=🏮&font=sans`;
                  }}
                />
              </div>
              <p className="bc-story-title">
                {t(`stories.${story.id}.title`, story.titleAr).replace(/\[NAME\]/gi, childName)}
              </p>
              <p className="bc-story-tag">{t(`stories.${story.id}.tagline`, story.taglineAr)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bc-divider" aria-hidden="true" />

      {/* Footer */}
      <div className="bc-footer">
        <img src="/logo.png" alt="Magic Fanoose" className="bc-footer-logo" />
        <div className="bc-footer-text">
          <span className="bc-footer-brand">Magic Fanoose</span>
          <span className="bc-footer-url">🌐 MagicFanoose.com</span>
        </div>
      </div>

      <style>{`
        .back-cover {
          position: relative;
          background: linear-gradient(180deg, #0a1628 0%, #060d1a 60%, #03060e 100%);
          border: 1px solid rgba(212,169,55,0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 2.2rem 1.8rem;
          min-height: 580px;
          overflow: hidden;
          text-align: center;
          direction: rtl;
        }

        .back-cover[dir="ltr"] {
          direction: ltr;
        }
        .back-cover[dir="ltr"] .bc-footer-text {
          align-items: flex-start;
        }

        /* Background shimmer */
        .bc-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 50% 20%, rgba(212,169,55,0.08) 0%, transparent 65%);
          pointer-events: none;
        }

        /* Hero */
        .bc-hero {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.7rem;
        }
        .bc-photo-frame { position: relative; }
        .bc-photo {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #D4A937;
          box-shadow: 0 0 0 6px rgba(212,169,55,0.18);
        }
        .bc-photo-glow {
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,169,55,0.18) 0%, transparent 70%);
          pointer-events: none;
          animation: bc-pulse 3s ease-in-out infinite;
        }
        .bc-greeting {
          font-size: clamp(1.3rem, 4vw, 1.9rem);
          font-weight: 900;
          color: #D4A937;
          margin: 0;
        }
        .bc-sub {
          font-size: 0.88rem;
          color: rgba(255,255,255,0.55);
          margin: 0;
        }

        /* Divider */
        .bc-divider {
          position: relative;
          z-index: 1;
          width: 90%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,169,55,0.3), transparent);
        }

        /* Stories section */
        .bc-stories-section {
          position: relative;
          z-index: 1;
          width: 100%;
        }
        .bc-stories-head {
          font-size: 0.88rem;
          font-weight: 800;
          color: rgba(212,169,55,0.85);
          margin: 0 0 1rem;
        }
        .bc-stories-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.8rem;
        }
        .bc-story-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(212,169,55,0.15);
          border-radius: 12px;
          padding: 0.7rem 0.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.45rem;
          transition: border-color 0.2s, transform 0.2s;
        }
        .bc-story-card:hover {
          border-color: rgba(212,169,55,0.4);
          transform: translateY(-2px);
        }
        .bc-story-thumb-wrap {
          width: 64px;
          height: 64px;
          border-radius: 10px;
          overflow: hidden;
          border: 1.5px solid rgba(212,169,55,0.25);
          flex-shrink: 0;
        }
        .bc-story-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .bc-story-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: rgba(255,255,255,0.82);
          line-height: 1.4;
          margin: 0;
        }
        .bc-story-tag {
          font-size: 0.6rem;
          color: rgba(212,169,55,0.65);
          margin: 0;
          line-height: 1.3;
        }

        /* Footer */
        .bc-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: auto;
        }
        .bc-footer-logo {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          object-fit: contain;
          filter: drop-shadow(0 0 8px rgba(212,169,55,0.5));
        }
        .bc-footer-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.1rem;
        }
        .bc-footer-brand {
          font-size: 0.9rem;
          font-weight: 800;
          color: #D4A937;
        }
        .bc-footer-url {
          font-size: 0.72rem;
          color: rgba(212,169,55,0.6);
          font-weight: 600;
        }

        @keyframes bc-pulse {
          0%, 100% { opacity: 0.5; transform: scale(0.97); }
          50%       { opacity: 1;   transform: scale(1.03); }
        }
      `}</style>
    </section>
  );
}
