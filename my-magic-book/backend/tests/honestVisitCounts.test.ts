import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isBotUserAgent } from '../src/utils/isBot';

/**
 * The visitor numbers are what the owner judges every change by, and they were
 * mostly not visitors.
 *
 * - The day Google read the 31 new story pages, the counter logged 31
 *   "visitors", one per page, exactly 78 seconds apart: the crawler runs the
 *   page's JavaScript, and the counter is that JavaScript.
 * - 42 of the 55 visits "from Google" since mid-August were the owner, signed
 *   in or on the same browser signed out, searching for their own shop.
 *
 * Crawlers are now screened by user agent (tested, never stored), and the
 * admin tab leaves out every browser that has ever signed in as an admin.
 */

const UA = {
  googlebotRender: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.122 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bingbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36',
  inspection: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 (compatible; Google-InspectionTool/1.0;)',
  headless: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/141.0.0.0 Safari/537.36',
  gptbot: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  instagramInApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.30.97 (iPhone15,3; iOS 18_6; ar_IL; ar; scale=3.00; 1290x2796; 650129870)',
  facebookInApp: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.38.104;FBBV/700000000;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.6;FBSS/3;FBCR/;FBID/phone;FBLC/ar_AR;FBOP/5]',
  whatsappAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36',
  cubotPhone: 'Mozilla/5.0 (Linux; Android 13; CUBOT_X70) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
  desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
};

describe('who counts as a visitor', () => {
  it('screens out crawlers that run the page', () => {
    for (const k of ['googlebotRender', 'bingbot', 'inspection', 'headless', 'gptbot'] as const) {
      expect(isBotUserAgent(UA[k]), k).toBe(true);
    }
  });

  it('counts people — including inside Instagram, Facebook and WhatsApp', () => {
    for (const k of ['iphone', 'androidChrome', 'instagramInApp', 'facebookInApp', 'whatsappAndroid', 'desktopChrome'] as const) {
      expect(isBotUserAgent(UA[k]), k).toBe(false);
    }
  });

  it('does not mistake a phone called CUBOT for a bot', () => {
    expect(isBotUserAgent(UA.cubotPhone)).toBe(false);
  });

  it('treats a request with no user agent as not a browser', () => {
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent('')).toBe(true);
  });
});

describe('the visit counter and the admin tab', () => {
  const ctrl = fs.readFileSync(path.join(__dirname, '../src/controllers/adminController.ts'), 'utf8');
  const track = ctrl.slice(ctrl.indexOf('export const trackVisit'), ctrl.indexOf('export const listVisits'));
  const list = ctrl.slice(ctrl.indexOf('export const listVisits'), ctrl.indexOf('export const checkCoupon'));

  it('screens crawlers before writing anything', () => {
    expect(track.indexOf('isBotUserAgent')).toBeGreaterThan(-1);
    expect(track.indexOf('isBotUserAgent')).toBeLessThan(track.indexOf('Visit.updateOne'));
  });

  it('never stores the user agent', () => {
    expect(track).not.toMatch(/userAgent\s*[:,]|ua\s*[:,]|\$set[^}]*agent/i);
  });

  it('leaves the owner\'s own browsers out of every number, and says how many', () => {
    expect(list).toContain("role: 'admin'");
    // The list, the seven-day chart and the funnel all filter on it.
    expect(list.match(/\.\.\.notOwner/g)?.length).toBeGreaterThanOrEqual(3);
    expect(list).toContain('ownerExcluded');
  });

  it('the page skips automated browsers before it sends anything', () => {
    const rec = fs.readFileSync(path.join(__dirname, '../../frontend/src/api/recordVisit.ts'), 'utf8');
    expect(rec.indexOf('navigator.webdriver')).toBeLessThan(rec.indexOf('trackVisit('));
  });
});
