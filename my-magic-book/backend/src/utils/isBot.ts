/**
 * Is this request from a crawler rather than a person?
 *
 * The visit counter runs in the page's own JavaScript, and search engines run
 * that JavaScript when they render a page — so the day Google read the new
 * story pages, the dashboard counted 31 "visitors", one per page, eighty
 * seconds apart. The owner judges every change by that number.
 *
 * The user agent is only TESTED here, never stored (see models/Visit.ts). The
 * word boundaries matter: a bare /bot/ also matches phone models such as
 * "CUBOT_X30", and those are people. Deliberately absent: WhatsApp, Instagram
 * and Facebook's in-app browsers — a parent opening a shared link inside them
 * is exactly the visitor this counter exists for (their link-preview fetchers
 * never run the page's JavaScript, so they never reach it anyway).
 */
const BOT_UA = new RegExp(
  [
    String.raw`(?:bot|crawler|spider|scraper)\b`,
    'slurp', 'headlesschrome', 'lighthouse', 'google-inspectiontool', 'googleother',
    'google-read-aloud', 'mediapartners-google', 'adsbot', 'apis-google', 'feedfetcher',
    'facebookexternalhit', 'facebookcatalog', 'skypeuripreview',
    'bingpreview', 'yandex', 'baiduspider', 'petalbot', 'bytespider', 'semrush', 'ahrefs',
    'gptbot', 'chatgpt-user', 'oai-searchbot', 'claudebot', 'claude-web', 'perplexity',
    'applebot', 'duckduckgo', 'phantomjs', 'puppeteer', 'playwright', 'python-requests',
    'curl/', 'wget/', 'node-fetch', 'axios/',
  ].join('|'),
  'i',
);

export function isBotUserAgent(ua: string | undefined | null): boolean {
  if (!ua) return true; // every real browser sends one
  return BOT_UA.test(ua);
}
