import { useTranslation } from 'react-i18next';

interface BackCoverProps {
  childName: string;
  childPhoto: string;
  /** Kept for compatibility (the teasers now show the logo, not the avatar). */
  avatarPhoto?: string;
  /** Current story id — used to exclude this theme from the "more adventures" teasers. */
  currentStoryId?: string;
}

// "More adventures" teasers — three other stories the child can get next.
//
// Keyed by the REAL theme id, so a teaser can only point at a story that
// exists. The old list offered "superhero", which is not a theme and never was:
// children were being shown a book nobody can order.
//
// MUST stay in step with BACK_TEASERS in backend PrintService.ts — the printed
// back cover is built there, and a customer who reads online then opens the
// parcel should find the same three titles.
const ALL_TEASERS = [
  { id: 'space',              emoji: '🚀', fallback: 'في الفضاء' },
  { id: 'school_hero',        emoji: '🏫', fallback: 'في المدرسة' },
  { id: 'zoo_adventure',      emoji: '🦁', fallback: 'في حديقة الحيوانات' },
  { id: 'ocean_adventure',    emoji: '🌊', fallback: 'في أعماق المحيط' },
  { id: 'deep_sea',           emoji: '🐋', fallback: 'في أعماق البحر' },
  { id: 'dinosaur_adventure', emoji: '🦕', fallback: 'مع الديناصورات' },
  { id: 'world_adventure',    emoji: '🌍', fallback: 'حول العالم' },
  { id: 'pirate_adventure',   emoji: '🏴', fallback: 'مع القراصنة والكنز' },
  { id: 'magic_book',         emoji: '📖', fallback: 'في رحلة الكتاب السحري' },
  { id: 'little_chef',        emoji: '🍳', fallback: 'في المطبخ' },
  { id: 'little_engineer',    emoji: '🛠️', fallback: 'في عالم البناء' },
  { id: 'castle_guardian',    emoji: '🏰', fallback: 'في القلعة التاريخية' },
  { id: 'toy_city',           emoji: '🤖', fallback: 'في مدينة الألعاب' },
  { id: 'future_hero',        emoji: '💼', fallback: 'في عالم المهن' },
  { id: 'first_grade',        emoji: '✏️', fallback: 'في الصف الأول' },
  { id: 'happy_kindergarten', emoji: '🧸', fallback: 'في الروضة' },
  { id: 'big_brother',        emoji: '👶', fallback: 'مع المولود الجديد' },
  { id: 'ramadan_first',      emoji: '🌙', fallback: 'في أول رمضان' },
  { id: 'eid_first',          emoji: '🎁', fallback: 'في أول عيد' },
  { id: 'jerusalem_tale',     emoji: '🕌', fallback: 'في القدس' },
  { id: 'little_vet',         emoji: '🐾', fallback: 'في عيادة الحيوانات' },
  { id: 'olive_harvest',        emoji: '🫒', fallback: 'في موسم الزيتون' },
  { id: 'palestinian_thobe',    emoji: '🧵', fallback: 'وحكاية الثوب' },
  { id: 'maamoul_day',          emoji: '🍪', fallback: 'ويوم المعمول' },
  { id: 'my_birthday',          emoji: '🎂', fallback: 'في عيد ميلاده' },
];

/** Colouring and photoreal variants share their parent's teaser. */
const baseTheme = (t?: string) => String(t || '').replace(/_(coloring|real|photoreal)$/, '');

/**
 * Deterministic PRNG — the same one PrintService uses, seeded the same way.
 *
 * Stable, not merely random: reshuffling on every render would mean a reload
 * silently changed which stories the book advertises, and the printed cover
 * would disagree with the screen.
 */
function teaserRng(seedText: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) { h ^= seedText.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickTeasers(currentStoryId: string, childName: string) {
  const base = baseTheme(currentStoryId);
  const pool = ALL_TEASERS.filter((t) => t.id !== base);
  const rand = teaserRng(`${childName}|${base}`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export default function BackCover({ childName, childPhoto, currentStoryId }: BackCoverProps) {
  const { t, i18n } = useTranslation();
  const teasers = pickTeasers(currentStoryId || '', childName);

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

      {/* Recommended stories — each card shows the brand logo + the story name */}
      <div className="bc-stories-section">
        <h3 className="bc-stories-head">{t('storybook.more_adventures', '✨ مغامرات أخرى تنتظرك')}</h3>
        <div className="bc-stories-grid">
          {teasers.map((tz) => (
            <div key={tz.id} className="bc-story-card">
              <div className="bc-story-thumb-wrap">
                <div className="bc-story-thumb-clip">
                  <img src="/logo.png?v=7" alt="Magic Fanoos" className="bc-story-logo" decoding="async" />
                </div>
                <span className="bc-story-emoji" aria-hidden="true">{tz.emoji}</span>
              </div>
              <p className="bc-story-title">{childName} {t(`storybook.teaser_${tz.id}`, tz.fallback)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bc-divider" aria-hidden="true" />

      {/* Footer */}
      <div className="bc-footer">
        <img src="/logo.png?v=7" alt="Magic Fanoos" className="bc-footer-logo" />
        <div className="bc-footer-text">
          <span className="bc-footer-brand">Magic Fanoos</span>
          <span className="bc-footer-url">🌐 MagicFanoos.com</span>
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
        .back-cover[dir="ltr"] { direction: ltr; }
        .back-cover[dir="ltr"] .bc-footer-text { align-items: center; }

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
        .bc-stories-section { position: relative; z-index: 1; width: 100%; }
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
          position: relative;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }
        .bc-story-thumb-clip {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          overflow: hidden;
          border: 1.5px solid rgba(212,169,55,0.3);
          background: radial-gradient(circle at 50% 45%, #11233f 0%, #0a1628 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bc-story-logo {
          width: 92%;
          height: 92%;
          object-fit: contain;
          filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
        }
        .bc-story-emoji {
          position: absolute;
          bottom: -3px;
          right: -3px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          background: #0a1628;
          border: 1.5px solid rgba(212,169,55,0.5);
          border-radius: 50%;
          z-index: 2;
        }
        .bc-story-title {
          font-size: 0.7rem;
          font-weight: 700;
          color: rgba(255,255,255,0.82);
          line-height: 1.4;
          margin: 0;
        }

        /* Footer */
        .bc-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          margin-top: auto;
          width: 100%;
        }
        .bc-footer-logo {
          width: 42px;
          height: 42px;
          object-fit: contain;
          filter: drop-shadow(0 0 8px rgba(212,169,55,0.5));
        }
        .bc-footer-text {
          display: flex;
          flex-direction: column;
          align-items: center;
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
      `}</style>
    </section>
  );
}
