import { useTranslation } from 'react-i18next';

export default function CopyrightPage() {
  const { t, i18n } = useTranslation();
  const websiteUrl = 'https://magicfanoose.com';

  return (
    <section className="book-page copyright-page" aria-label={t('storybook.copyright_page_aria', 'صفحة حقوق النشر')} dir={i18n.dir()}>

      {/* Logo */}
      <div className="cp-logo-row">
        <img src="/logo.png" alt="Magic Fanoos" className="cp-logo" />
        <span className="cp-brand">Magic Fanoos</span>
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
          <a href="mailto:magicfanoose@gmail.com" className="cp-link">magicfanoose@gmail.com</a>
        </div>
      </div>

      <div className="cp-divider cp-divider--sm" aria-hidden="true" />

      {/* Concise policy — printed so readers see it without going online */}
      <div className="cp-policy">
        <div className="cp-policy-text">
          <p>
            <strong>{t('storybook.policy_content', 'سياسة المحتوى')}:</strong>{' '}
            {t('storybook.policy_content_text', 'القصة والصور مخصّصة لطفلك للاستخدام العائلي فقط، ولا يجوز إعادة بيعها أو توزيعها تجاريًا.')}
          </p>
          <p>
            <strong>{t('storybook.policy_printing', 'سياسة الطباعة')}:</strong>{' '}
            {t('storybook.policy_printing_text', 'المنتج مطبوع خصيصًا لطفلك، لذا لا يمكن استرجاعه بعد بدء الطباعة. نضمن جودة الطباعة — تواصل معنا لأي مشكلة.')}
          </p>
        </div>
      </div>

      <div className="cp-divider" aria-hidden="true" />

      {/* QR code to website */}
      <div className="cp-qr-row">
        <div className="cp-qr-text">
          <p className="cp-qr-label">{t('storybook.visit_website', '🏮 زر موقعنا')}</p>
          <p className="cp-qr-sub">{t('storybook.scan_website', 'امسح الكود لزيارة MagicFanoose.com واكتشاف المزيد من القصص')}</p>
        </div>
        <div className="cp-qr-box" aria-label={t('storybook.qr_website_aria', 'QR code لموقع MagicFanoose.com')}>
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
        © {new Date().getFullYear()} Magic Fanoos. {t('storybook.all_rights_reserved', 'جميع الحقوق محفوظة.')}<br />
        {t('storybook.ai_generated_notice', 'هذه القصة مُولَّدة بواسطة الذكاء الاصطناعي وتم تخصيصها خصيصًا لطفلك.')}
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

        .copyright-page[dir="ltr"] {
          direction: ltr;
        }
        .copyright-page[dir="ltr"] .cp-qr-text {
          text-align: left;
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
        .cp-policy-text {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 440px;
          text-align: right;
        }
        .copyright-page[dir="ltr"] .cp-policy-text { text-align: left; }
        .cp-policy-text p {
          font-size: 0.7rem;
          color: rgba(255,255,255,0.55);
          line-height: 1.6;
          margin: 0;
        }
        .cp-policy-text strong { color: rgba(212,169,55,0.9); font-weight: 800; }

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
