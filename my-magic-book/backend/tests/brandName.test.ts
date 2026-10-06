import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * The shop is «ماجيك فانوس» — the name on the logo — not «الفانوس السحري».
 *
 * The logo was redrawn to read "magic fanoos", and the owner chose the Arabic
 * transliteration over the translation, so the footer, About page, privacy
 * policy, dashboard and every customer email now say the same thing the logo
 * does. Hebrew follows the same decision (מג'יק פאנוס, not הפאנוס הקסום).
 *
 * The old name is NOT gone: parents who heard it still search for it, so it
 * stays in index.html as a hidden alternate name for search engines — and only
 * there. The story text keeps its own magic lantern, which is a character, not
 * the shop.
 */

const root = path.resolve(__dirname, '../..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const OLD_AR = 'الفانوس السحري';
const OLD_HE = 'הפאנוס הקסום';

describe('the shop is called by the name on its logo', () => {
  it('no customer-facing translation uses the old name', () => {
    for (const lang of ['ar', 'he', 'en']) {
      const s = read(`frontend/src/locales/${lang}/translation.json`);
      expect(s, `${lang} still says ${OLD_AR}`).not.toContain(OLD_AR);
      expect(s, `${lang} still says ${OLD_HE}`).not.toContain(OLD_HE);
    }
  });

  it('the footer, privacy policy and shop messages use the new name', () => {
    const ar = JSON.parse(read('frontend/src/locales/ar/translation.json'));
    expect(ar.footer.copyright).toContain('ماجيك فانوس');
    expect(ar.policy.privacy_content_1).toContain('ماجيك فانوس');
    expect(ar.dashboard.msg_from_shop).toContain('ماجيك فانوس');
    const he = JSON.parse(read('frontend/src/locales/he/translation.json'));
    expect(he.footer.copyright).toContain("מג'יק פאנוס");
  });

  it('customer emails and gift messages use the new name', () => {
    for (const f of ['backend/src/utils/mailer.ts', 'backend/src/services/BirthdayCoupon.ts', 'backend/src/controllers/orderController.ts']) {
      const s = read(f);
      expect(s, f).not.toContain(OLD_AR);
    }
    expect(read('backend/src/utils/mailer.ts')).toContain('ماجيك فانوس');
  });

  it('keeps the old name for search engines, so people who search it still find the shop', () => {
    const html = read('frontend/index.html');
    expect(html).toMatch(/"alternateName":\s*\[[^\]]*"الفانوس السحري"/);
    expect(html).toMatch(/"alternateName":\s*\[[^\]]*"ماجيك فانوس"/);
  });
});
