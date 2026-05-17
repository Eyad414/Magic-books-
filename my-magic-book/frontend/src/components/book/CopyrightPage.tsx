// ─── Page 8: Copyright / Info Page ───────────────────────────────────────────
// Layout: website, email, policy links, QR code to website.

export default function CopyrightPage() {
  const websiteUrl = 'https://magicfanoose.com';

  return (
    <section className="book-page copyright-page" aria-label="صفحة حقوق النشر">

      {/* Logo */}
      <div className="cp-logo-row">
        <img src="/logo.png" alt="Magic Fanoose" className="cp-logo" />
        <span className="cp-brand">Magic Fanoose</span>
      </div>

      <div className="cp-divider" aria-hidden="true" />

      {/* Website & contact */}
      <div className="cp-info">
        <div className="cp-info-row">
          <span className="cp-info-icon">🌐</span>
          <a href={websiteUrl} className="cp-link">MagicFanoose.com</a>
        </div>
        <div className="cp-info-row">
          <span className="cp-info-icon">📧</span>
          <a href="mailto:support@magicfanoose.com" className="cp-link">support@magicfanoose.com</a>
        </div>
      </div>

      <div className="cp-divider cp-divider--sm" aria-hidden="true" />

      {/* Policy links */}
      <div className="cp-policy">
        <h3 className="cp-policy-head">سياسات المنصة</h3>
        <div className="cp-policy-links">
          {[
            { label: 'سياسة الخصوصية', anchor: '#privacy' },
            { label: 'شروط الاستخدام', anchor: '#terms' },
            { label: 'سياسة الدفع', anchor: '#payment' },
            { label: 'حذف البيانات', anchor: '#data-deletion' },
          ].map(({ label, anchor }) => (
            <a
              key={anchor}
              href={`${websiteUrl}/policy${anchor}`}
              className="cp-policy-link"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      <div className="cp-divider" aria-hidden="true" />

      {/* QR code to website */}
      <div className="cp-qr-row">
        <div className="cp-qr-text">
          <p className="cp-qr-label">🏮 زر موقعنا</p>
          <p className="cp-qr-sub">امسح الكود لزيارة MagicFanoose.com واكتشاف المزيد من القصص</p>
        </div>
        <div className="cp-qr-box" aria-label="QR code لموقع MagicFanoose.com">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(websiteUrl)}&bgcolor=0a1628&color=D4A937`}
            alt="QR code"
            className="cp-qr-img"
            loading="lazy"
          />
        </div>
      </div>

      <div className="cp-divider cp-divider--sm" aria-hidden="true" />

      {/* Copyright notice */}
      <p className="cp-copy">
        © {new Date().getFullYear()} Magic Fanoose. جميع الحقوق محفوظة.<br />
        هذه القصة مُولَّدة بواسطة الذكاء الاصطناعي وتم تخصيصها خصيصًا لطفلك.
      </p>

      <style>{`
        .copyright-page {
          background: linear-gradient(160deg, #0a1628 0%, #050a15 100%);
          border: 1px solid rgba(212,169,55,0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.4rem;
          padding: 2.5rem 2rem;
          min-height: 520px;
          text-align: center;
          direction: rtl;
        }

        /* Logo */
        .cp-logo-row {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .cp-logo {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: contain;
          filter: drop-shadow(0 0 14px rgba(212,169,55,0.55));
        }
        .cp-brand {
          font-size: 1rem;
          font-weight: 800;
          color: #D4A937;
          letter-spacing: 0.12em;
        }

        /* Dividers */
        .cp-divider {
          width: 100%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(212,169,55,0.3), transparent);
        }
        .cp-divider--sm { width: 70%; }

        /* Info rows */
        .cp-info { display: flex; flex-direction: column; gap: 0.55rem; }
        .cp-info-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .cp-info-icon { font-size: 1rem; }
        .cp-link {
          color: rgba(212,169,55,0.85);
          font-size: 0.9rem;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.2s;
          direction: ltr;
        }
        .cp-link:hover { color: #D4A937; }

        /* Policy */
        .cp-policy-head {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.4);
          font-weight: 600;
          margin: 0 0 0.65rem;
          letter-spacing: 0.08em;
        }
        .cp-policy-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.5rem;
        }
        .cp-policy-link {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
          border: 1px solid rgba(212,169,55,0.2);
          border-radius: 999px;
          padding: 3px 12px;
          text-decoration: none;
          transition: all 0.2s;
        }
        .cp-policy-link:hover {
          color: #D4A937;
          border-color: rgba(212,169,55,0.5);
        }

        /* QR row */
        .cp-qr-row {
          display: flex;
          align-items: center;
          gap: 1.2rem;
          background: rgba(212,169,55,0.06);
          border: 1px solid rgba(212,169,55,0.18);
          border-radius: 14px;
          padding: 1rem 1.2rem;
          width: 100%;
          max-width: 360px;
        }
        .cp-qr-text { flex: 1; text-align: right; }
        .cp-qr-label {
          font-size: 0.9rem;
          font-weight: 800;
          color: #D4A937;
          margin: 0 0 0.25rem;
        }
        .cp-qr-sub {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.45);
          margin: 0;
          line-height: 1.5;
        }
        .cp-qr-box {
          flex-shrink: 0;
          background: #fff;
          padding: 4px;
          border-radius: 8px;
        }
        .cp-qr-img { width: 76px; height: 76px; display: block; border-radius: 4px; }

        /* Copyright */
        .cp-copy {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.3);
          line-height: 1.7;
          margin: 0;
        }
      `}</style>
    </section>
  );
}
