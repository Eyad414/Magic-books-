import { useState } from 'react';
import StarText from './StarText';

// ─── Types ────────────────────────────────────────────────────────────────────
interface StoryPageData {
  id: number;             // 1 → 32
  type: 'text' | 'image';
  /** Story text with [NAME] placeholder (only for type:"text") */
  text?: string;
  /** Path / URL to the illustration (only for type:"image") */
  imageSrc?: string;
  /** Alt text for the illustration */
  imageAlt?: string;
}

// ─── 32-page Story Data ───────────────────────────────────────────────────────
// Odd pages  (1,3,5…31) → text  displayed inside the star
// Even pages (2,4,6…32) → illustration (drop your Nano Banana 2 images in /src/assets/illustrations/)
//
// Every text entry is ~20 Arabic words with [NAME] as the name placeholder.
const RAW_PAGES: StoryPageData[] = [
  // ── Page 1 ──
  {
    id: 1, type: 'text',
    text: 'في يومٍ مشرق، كان [NAME] يلعب في الحديقة حين لمع ضوءٌ ذهبيٌّ ساحرٌ من بين الأشجار فجذب انتباهه.',
  },
  // ── Page 2 ──
  {
    id: 2, type: 'image',
    imageSrc: '/src/assets/illustrations/page-02.png',
    imageAlt: 'طفل يلعب في الحديقة ويرى ضوءًا ذهبيًّا',
  },
  // ── Page 3 ──
  {
    id: 3, type: 'text',
    text: 'اقترب [NAME] بخطواتٍ خفيفة من مصدر الضوء، فوجد فانوسًا ذهبيًّا صغيرًا يتوهج بألوان السحر.',
  },
  // ── Page 4 ──
  {
    id: 4, type: 'image',
    imageSrc: '/src/assets/illustrations/page-04.png',
    imageAlt: 'فانوس ذهبي ساحر بين الأشجار',
  },
  // ── Page 5 ──
  {
    id: 5, type: 'text',
    text: 'لمس [NAME] الفانوس بيديه الصغيرتين برفق، فانطلق منه دخانٌ ملوّنٌ وظهر جنيٌّ لطيفٌ يبتسم.',
  },
  // ── Page 6 ──
  {
    id: 6, type: 'image',
    imageSrc: '/src/assets/illustrations/page-06.png',
    imageAlt: 'جني يخرج من الفانوس بابتسامة',
  },
  // ── Page 7 ──
  {
    id: 7, type: 'text',
    text: 'قال الجني بصوتٍ دافئ: "أهلًا يا [NAME]! أنا جنيُّ الفانوس، وجئتُ لأصحبك في مغامرة لن تُنسى."',
  },
  // ── Page 8 ──
  {
    id: 8, type: 'image',
    imageSrc: '/src/assets/illustrations/page-08.png',
    imageAlt: 'الجني يتحدث مع [NAME] بحنان',
  },
  // ── Page 9 ──
  {
    id: 9, type: 'text',
    text: 'حلَّق [NAME] والجنيُّ فوق السحاب الأبيض، ورأيا مدنًا من الذهب تلمع تحت أشعة الشمس المشرقة.',
  },
  // ── Page 10 ──
  {
    id: 10, type: 'image',
    imageSrc: '/src/assets/illustrations/page-10.png',
    imageAlt: 'طفل يطير فوق السحاب ويرى مدنًا ذهبية',
  },
  // ── Page 11 ──
  {
    id: 11, type: 'text',
    text: 'هبط [NAME] في غابةٍ سحريةٍ تملؤها الفراشات الملوّنة وورودٌ عطرةٌ تُغنّي أغاني الفرح.',
  },
  // ── Page 12 ──
  {
    id: 12, type: 'image',
    imageSrc: '/src/assets/illustrations/page-12.png',
    imageAlt: 'غابة سحرية بها فراشات ملونة وورود',
  },
  // ── Page 13 ──
  {
    id: 13, type: 'text',
    text: 'قابل [NAME] أرنبًا أبيض يرتدي تاجًا صغيرًا، ودعاه بحفاوةٍ لزيارة قصر الحيوانات السعيدة.',
  },
  // ── Page 14 ──
  {
    id: 14, type: 'image',
    imageSrc: '/src/assets/illustrations/page-14.png',
    imageAlt: 'أرنب أبيض يرتدي تاجًا ويدعو الطفل',
  },
  // ── Page 15 ──
  {
    id: 15, type: 'text',
    text: 'رقص [NAME] مع الحيوانات طوال الليل، وتعلّم أن الفرح الحقيقي يكبر حين يُشارَك مع الآخرين.',
  },
  // ── Page 16 ──
  {
    id: 16, type: 'image',
    imageSrc: '/src/assets/illustrations/page-16.png',
    imageAlt: 'الطفل يرقص مع الحيوانات في القصر',
  },
  // ── Page 17 ──
  {
    id: 17, type: 'text',
    text: 'أهدى [NAME] وردةً سحريةً لأصغر دبٍّ في القصر، فأضاءت قلوبهم وامتلأت الغابة بالضحكات.',
  },
  // ── Page 18 ──
  {
    id: 18, type: 'image',
    imageSrc: '/src/assets/illustrations/page-18.png',
    imageAlt: 'الطفل يهدي وردة لدب صغير',
  },
  // ── Page 19 ──
  {
    id: 19, type: 'text',
    text: 'طلب الجنيُّ من [NAME] أن يختار أمنيةً واحدة، ففكَّر طويلًا ثم قال: "أريد السعادة لعائلتي."',
  },
  // ── Page 20 ──
  {
    id: 20, type: 'image',
    imageSrc: '/src/assets/illustrations/page-20.png',
    imageAlt: 'الطفل يفكر في أمنيته أمام الجني',
  },
  // ── Page 21 ──
  {
    id: 21, type: 'text',
    text: 'ابتسم الجنيُّ وقال: "قلبُك كبير يا [NAME]! هذه الأمنية ستجعل كل من تحبهم يشعرون بالدفء."',
  },
  // ── Page 22 ──
  {
    id: 22, type: 'image',
    imageSrc: '/src/assets/illustrations/page-22.png',
    imageAlt: 'الجني يبتسم وينفذ الأمنية',
  },
  // ── Page 23 ──
  {
    id: 23, type: 'text',
    text: 'عاد [NAME] إلى بيته يحمل في قلبه ذكرياتٍ جميلةً من مغامرةٍ سحريةٍ لن تفارق خياله أبدًا.',
  },
  // ── Page 24 ──
  {
    id: 24, type: 'image',
    imageSrc: '/src/assets/illustrations/page-24.png',
    imageAlt: 'الطفل يعود إلى بيته سعيدًا',
  },
  // ── Page 25 ──
  {
    id: 25, type: 'text',
    text: 'قبل النوم، نظر [NAME] إلى النجوم وشكر الفانوس السحري على يومٍ مليءٍ بالبهجة والعجب.',
  },
  // ── Page 26 ──
  {
    id: 26, type: 'image',
    imageSrc: '/src/assets/illustrations/page-26.png',
    imageAlt: 'الطفل ينظر إلى النجوم قبل النوم',
  },
  // ── Page 27 ──
  {
    id: 27, type: 'text',
    text: 'في الحلم، زار [NAME] نهرًا من النور حيث تسبح الأسماك الذهبية وتُغنّي أغاني السلام والمحبة.',
  },
  // ── Page 28 ──
  {
    id: 28, type: 'image',
    imageSrc: '/src/assets/illustrations/page-28.png',
    imageAlt: 'نهر من النور بأسماك ذهبية في الحلم',
  },
  // ── Page 29 ──
  {
    id: 29, type: 'text',
    text: 'أدرك [NAME] أن الخير الذي يزرعه في قلبه يتحول إلى سحرٍ حقيقيٍّ يُسعد كل من حوله.',
  },
  // ── Page 30 ──
  {
    id: 30, type: 'image',
    imageSrc: '/src/assets/illustrations/page-30.png',
    imageAlt: 'الطفل يزرع الخير ويضيء العالم من حوله',
  },
  // ── Page 31 ──
  {
    id: 31, type: 'text',
    text: 'استيقظ [NAME] في الصباح وهو يبتسم، عازمًا أن يملأ كلَّ يومٍ جديدٍ بالحب والمغامرات الجميلة.',
  },
  // ── Page 32 ──
  {
    id: 32, type: 'image',
    imageSrc: '/src/assets/illustrations/page-32.png',
    imageAlt: 'الطفل يستيقظ مبتسمًا في صباح جديد',
  },
];

// ─── Helper: replace [NAME] across any string ─────────────────────────────────
function replaceName(text: string, name: string): string {
  if (!text) return '';
  return text
    .replace(/\[NAME\]/gi, name)
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\s*name\s*\}/gi, name);
}

// ─── MagicFanoosBook Component ────────────────────────────────────────────────
export default function MagicFanoosBook() {

  // ── Child's name — drives all 32 pages and the cover title ──────────────
  const [childName, setChildName] = useState<string>('Eyad');

  // ── Apply the name replacement to every text page ───────────────────────
  const pages: StoryPageData[] = RAW_PAGES.map((p) => ({
    ...p,
    text: p.text ? replaceName(p.text, childName) : undefined,
    imageAlt: p.imageAlt ? replaceName(p.imageAlt, childName) : undefined,
  }));

  return ( 
    <div className="mfb-root" dir="rtl">

      {/* ── Name input (demo control — remove when driven by Step 1 context) ── */}
      <div className="mfb-name-bar">
        <label htmlFor="mfb-name-input" className="mfb-name-label">
          ✨ اسم الطفل:
        </label>
        <input
          id="mfb-name-input"
          type="text"
          value={childName}
          onChange={(e) => setChildName(e.target.value || 'الطفل')}
          placeholder="اكتب الاسم هنا"
          className="mfb-name-input"
          maxLength={30}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          COVER PAGE — title updates automatically with childName
      ════════════════════════════════════════════════════════════════════ */}
      <section className="mfb-cover" aria-label="غلاف الكتاب">
        <div className="mfb-cover-stars" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="mfb-cover-star" style={{ '--i': i } as React.CSSProperties}>✦</span>
          ))}
        </div>
        <div className="mfb-cover-inner">
          <p className="mfb-cover-sub">فانوس ماجيك يُقدّم</p>
          {/* Cover title — updates live when childName changes */}
          <h1 className="mfb-cover-title">
            مغامرة <span className="mfb-cover-name">{childName}</span>
          </h1>
          <p className="mfb-cover-sub mfb-cover-tagline">رحلة سحرية لن تُنسى</p>
          <div className="mfb-cover-divider" aria-hidden="true" />
          <p className="mfb-cover-brand">✦ Magic Fanoos ✦</p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          32 STORY PAGES
          Odd  (id 1,3,5…31) → StarText component
          Even (id 2,4,6…32) → Illustration image
      ════════════════════════════════════════════════════════════════════ */}
      <div className="mfb-pages">
        {pages.map((page) => {

          const isOdd = page.id % 2 !== 0; // odd → text page

          return (
            <section
              key={page.id}
              className={`mfb-page ${isOdd ? 'mfb-page--text' : 'mfb-page--image'}`}
              aria-label={`صفحة ${page.id}`}
            >
              {/* ── ODD: Star + text ─────────────────────────────────── */}
              {isOdd && page.text && (
                <div className="mfb-star-wrapper">
                  <StarText
                    text={page.text}
                    pageNumber={page.id}
                  />
                </div>
              )}

              {/* ── EVEN: Story illustration ─────────────────────────── */}
              {!isOdd && (
                <div className="mfb-illustration-wrapper">
                  <img
                    src={page.imageSrc}
                    alt={page.imageAlt ?? `صورة الصفحة ${page.id}`}
                    className="mfb-illustration"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback placeholder while real images aren't ready
                      const el = e.currentTarget as HTMLImageElement;
                      el.src = `https://placehold.co/480x480/1B1F5E/F5A623?text=صفحة+${page.id}&font=sans`;
                    }}
                  />
                  <span className="mfb-img-page-badge" aria-label={`صفحة ${page.id}`}>
                    {page.id}
                  </span>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          END PAGE
      ════════════════════════════════════════════════════════════════════ */}
      <section className="mfb-end" aria-label="نهاية القصة">
        <p className="mfb-end-text">النهاية</p>
        <p className="mfb-end-name">بطولة: <strong>{childName}</strong></p>
        <p className="mfb-end-brand">✦ Magic Fanoos ✦</p>
      </section>

      {/* ── Styles ─────────────────────────────────────────────────────────── */}
      <style>{`
        /* ── Root ──────────────────────────────────────────────────────── */
        .mfb-root {
          width: 100%;
          max-width: 640px;
          margin: 0 auto;
          font-family: 'Noto Kufi Arabic', 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          padding: 1.5rem;
        }

        /* ── Name control bar ─────────────────────────────────────────── */
        .mfb-name-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(27,31,94,0.55);
          border: 1px solid rgba(245,166,35,0.25);
          border-radius: 14px;
          padding: 0.75rem 1.25rem;
          backdrop-filter: blur(12px);
        }
        .mfb-name-label {
          color: #F5A623;
          font-weight: 700;
          font-size: 0.9rem;
          white-space: nowrap;
        }
        .mfb-name-input {
          flex: 1;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(245,166,35,0.3);
          border-radius: 8px;
          color: #e8eaf6;
          padding: 0.4rem 0.75rem;
          font-family: inherit;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s;
          text-align: right;
        }
        .mfb-name-input:focus { border-color: #F5A623; }

        /* ── Cover page ───────────────────────────────────────────────── */
        .mfb-cover {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          background: linear-gradient(160deg, #0D0F1A 0%, #1B1F5E 55%, #3B1F7A 100%);
          border: 1px solid rgba(245,166,35,0.2);
          padding: 3.5rem 2rem;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .mfb-cover-stars {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .mfb-cover-star {
          position: absolute;
          color: #F5C97A;
          font-size: clamp(0.6rem, 1.5vw, 1rem);
          animation: mfb-twinkle 3s ease-in-out infinite;
          animation-delay: calc(var(--i) * 0.3s);
          top: calc(10% + (var(--i) * 7%));
          left: calc(5% + (var(--i) * 8%));
          opacity: 0.6;
        }
        .mfb-cover-inner { position: relative; z-index: 1; }
        .mfb-cover-sub {
          color: rgba(245,166,35,0.7);
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          margin-bottom: 0.5rem;
        }
        .mfb-cover-title {
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 900;
          color: #fff;
          line-height: 1.2;
          margin: 0.25rem 0 0.75rem;
        }
        /* Child's name inside the cover title — gold shimmer */
        .mfb-cover-name {
          background: linear-gradient(90deg, #F5A623, #fff8e1, #F5A623);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: mfb-shimmer 3s linear infinite;
        }
        .mfb-cover-tagline {
          font-size: 1rem;
          color: rgba(255,255,255,0.55);
          margin-top: 0;
        }
        .mfb-cover-divider {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #F5A623, transparent);
          margin: 1.2rem auto;
          border-radius: 999px;
        }
        .mfb-cover-brand {
          color: #F5A623;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.12em;
        }

        /* ── Pages grid ───────────────────────────────────────────────── */
        .mfb-pages {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        /* ── Individual page ──────────────────────────────────────────── */
        .mfb-page {
          border-radius: 20px;
          overflow: hidden;
          background: linear-gradient(145deg, #0D0F1A, #1B1F5E);
          border: 1px solid rgba(245,166,35,0.1);
          padding: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ── Text page ────────────────────────────────────────────────── */
        .mfb-star-wrapper {
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
        }

        /* ── Image page ───────────────────────────────────────────────── */
        .mfb-illustration-wrapper {
          position: relative;
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          border-radius: 16px;
          overflow: hidden;
        }
        .mfb-illustration {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 16px;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        .mfb-illustration:hover { transform: scale(1.02); }
        .mfb-img-page-badge {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(13,15,26,0.75);
          color: #F5A623;
          font-size: 0.7rem;
          font-weight: 800;
          padding: 2px 10px;
          border-radius: 999px;
          border: 1px solid rgba(245,166,35,0.35);
          backdrop-filter: blur(6px);
        }

        /* ── End page ─────────────────────────────────────────────────── */
        .mfb-end {
          text-align: center;
          padding: 2.5rem 1rem;
          border-radius: 20px;
          background: linear-gradient(160deg, #0D0F1A, #1B1F5E, #3B1F7A);
          border: 1px solid rgba(245,166,35,0.2);
        }
        .mfb-end-text {
          font-size: 2rem;
          font-weight: 900;
          color: #F5A623;
          margin-bottom: 0.5rem;
        }
        .mfb-end-name {
          color: rgba(255,255,255,0.7);
          font-size: 1rem;
          margin-bottom: 1rem;
        }
        .mfb-end-name strong { color: #F5A623; }
        .mfb-end-brand {
          color: rgba(245,166,35,0.5);
          font-size: 0.8rem;
          letter-spacing: 0.15em;
          font-weight: 700;
        }

        /* ── Keyframes ────────────────────────────────────────────────── */
        @keyframes mfb-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%       { opacity: 0.9; transform: scale(1.2); }
        }
        @keyframes mfb-shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}
