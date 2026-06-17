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

      {/* Hero: large centered kid portrait */}
      <div className="bc-hero">
        <div className="bc-photo-frame">
          <div className="bc-photo-ring" aria-hidden="true" />
          <img
            src={childPhoto}
            alt={t('storybook.photo_alt', 'صورة {{name}}', { name: childName })}
            className="bc-photo"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                `https://ui-avatars.com/api/?name=${encodeURIComponent(childName)}&background=D4A937&color=0a1628&size=400&bold=true`;
            }}
          />
          <span className="bc-sparkle bc-sparkle--1" aria-hidden="true">✦</span>
          <span className="bc-sparkle bc-sparkle--2" aria-hidden="true">✧</span>
          <span className="bc-sparkle bc-sparkle--3" aria-hidden="true">✦</span>
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
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .bc-photo-frame {
          position: relative;
          width: 210px;
          height: 210px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bc-photo-ring {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, #D4A937, #fff3c4, #D4A937, #b88c20, #D4A937);
          filter: blur(2px);
          animation: bc-spin 8s linear infinite;
        }
        .bc-photo {
          position: relative;
          z-index: 1;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          object-fit: cover;
          object-position: center 30%;
          border: 5px solid #0a1628;
          box-shadow: 0 14px 40px rgba(0,0,0,0.6);
        }
        .bc-sparkle {
          position: absolute;
          z-index: 2;
          color: #fff3c4;
          font-size: 1.1rem;
          filter: drop-shadow(0 0 6px rgba(212,169,55,0.8));
          animation: bc-twinkle 2.6s ease-in-out infinite;
        }
        .bc-sparkle--1 { top: 2%; right: 8%; animation-delay: 0s; }
        .bc-sparkle--2 { bottom: 6%; left: 4%; animation-delay: 0.8s; }
        .bc-sparkle--3 { top: 40%; left: -6%; animation-delay: 1.6s; }
        .bc-greeting {
          font-size: clamp(1.4rem, 4.5vw, 2.1rem);
          font-weight: 900;
          color: #D4A937;
          margin: 0;
        }
        .bc-sub {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.6);
          margin: 0;
          max-width: 320px;
        }
        @keyframes bc-spin { to { transform: rotate(360deg); } }
        @keyframes bc-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 1;   transform: scale(1.25); }
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
