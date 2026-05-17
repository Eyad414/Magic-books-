// ─── Page 7: Final Story Page ─────────────────────────────────────────────────
// Layout: story title, moral/lesson text, parent questions, conclusion, QR code.

interface FinalStoryPageProps {
  storyTitle: string;
  moralText: string;
  questions: string[];
  conclusionText: string;
  /** URL encoded into the QR — points to the story's audio/video */
  audioUrl?: string;
  childName: string;
}

export default function FinalStoryPage({
  storyTitle,
  moralText,
  questions,
  conclusionText,
  audioUrl = 'https://magicfanoose.com',
  childName,
}: FinalStoryPageProps) {
  return (
    <section className="book-page final-story-page" aria-label="الصفحة الختامية للقصة">

      {/* Header: story title */}
      <div className="fsp-header">
        <span className="fsp-label">✦ نهاية القصة ✦</span>
        <h2 className="fsp-title">{storyTitle}</h2>
      </div>

      <div className="fsp-divider" aria-hidden="true" />

      {/* Moral */}
      <div className="fsp-moral">
        <h3 className="fsp-section-head">💡 الدرس المستفاد</h3>
        <p className="fsp-moral-text">{moralText}</p>
      </div>

      <div className="fsp-divider fsp-divider--sm" aria-hidden="true" />

      {/* Questions for parent */}
      <div className="fsp-questions">
        <h3 className="fsp-section-head">🤔 أسئلة للتفكير معًا</h3>
        <ol className="fsp-q-list">
          {questions.map((q, i) => (
            <li key={i} className="fsp-q-item">{q}</li>
          ))}
        </ol>
      </div>

      <div className="fsp-divider fsp-divider--sm" aria-hidden="true" />

      {/* Conclusion */}
      <div className="fsp-conclusion">
        <p className="fsp-conclusion-text">{conclusionText}</p>
        <p className="fsp-child-star">⭐ أحسنت يا {childName}! ⭐</p>
      </div>

      <div className="fsp-divider" aria-hidden="true" />

      {/* QR Code row */}
      <div className="fsp-qr-row">
        <div className="fsp-qr-info">
          <p className="fsp-qr-label">📱 استمع لمغامرتك</p>
          <p className="fsp-qr-sub">امسح الكود لسماع قصة {childName} بصوت ساحر!</p>
        </div>
        {/* QR placeholder — replace src with real QR image in production */}
        <div className="fsp-qr-box" aria-label="QR code">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(audioUrl)}&bgcolor=0a1628&color=D4A937`}
            alt="QR code لرابط القصة الصوتية"
            className="fsp-qr-img"
            loading="lazy"
          />
        </div>
      </div>

      <style>{`
        .final-story-page {
          background: linear-gradient(160deg, #0a1628 0%, #111840 60%, #0d0f1a 100%);
          border: 1px solid rgba(212,169,55,0.22);
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          padding: 2.2rem 1.8rem;
          min-height: 560px;
          position: relative;
          overflow: hidden;
          direction: rtl;
        }

        /* Header */
        .fsp-header { text-align: center; }
        .fsp-label {
          font-size: 0.72rem;
          color: rgba(212,169,55,0.7);
          letter-spacing: 0.15em;
          font-weight: 700;
        }
        .fsp-title {
          font-size: clamp(1.2rem, 4vw, 1.8rem);
          font-weight: 900;
          color: #fff;
          margin: 0.3rem 0 0;
          background: linear-gradient(135deg, #fff 30%, #D4A937 70%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Dividers */
        .fsp-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,169,55,0.35), transparent);
        }
        .fsp-divider--sm { width: 60%; margin: 0 auto; }

        /* Section headings */
        .fsp-section-head {
          font-size: 0.88rem;
          font-weight: 800;
          color: #D4A937;
          margin: 0 0 0.55rem;
        }

        /* Moral */
        .fsp-moral-text {
          font-size: 0.95rem;
          line-height: 1.8;
          color: rgba(255,255,255,0.82);
          font-weight: 500;
          background: rgba(212,169,55,0.06);
          border-right: 3px solid #D4A937;
          padding: 0.6rem 0.9rem;
          border-radius: 0 8px 8px 0;
        }

        /* Questions */
        .fsp-q-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .fsp-q-item {
          font-size: 0.88rem;
          color: rgba(255,255,255,0.75);
          line-height: 1.65;
          padding-right: 1.1rem;
          position: relative;
        }
        .fsp-q-item::before {
          content: "◆";
          position: absolute;
          right: 0;
          color: #D4A937;
          font-size: 0.6rem;
          top: 0.35rem;
        }

        /* Conclusion */
        .fsp-conclusion { text-align: center; }
        .fsp-conclusion-text {
          font-size: 1rem;
          color: rgba(255,255,255,0.85);
          font-weight: 600;
          line-height: 1.7;
          margin: 0 0 0.5rem;
        }
        .fsp-child-star {
          font-size: 1.05rem;
          font-weight: 900;
          color: #D4A937;
          margin: 0;
        }

        /* QR row */
        .fsp-qr-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          background: rgba(212,169,55,0.06);
          border: 1px solid rgba(212,169,55,0.2);
          border-radius: 14px;
          padding: 1rem 1.2rem;
          margin-top: auto;
        }
        .fsp-qr-info { flex: 1; }
        .fsp-qr-label {
          font-size: 0.9rem;
          font-weight: 800;
          color: #D4A937;
          margin: 0 0 0.25rem;
        }
        .fsp-qr-sub {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.55);
          margin: 0;
          line-height: 1.5;
        }
        .fsp-qr-box {
          flex-shrink: 0;
          background: #fff;
          padding: 4px;
          border-radius: 8px;
        }
        .fsp-qr-img {
          width: 80px;
          height: 80px;
          display: block;
          border-radius: 4px;
        }
      `}</style>
    </section>
  );
}
