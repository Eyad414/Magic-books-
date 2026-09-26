import { publicApi } from './publicApi';

/**
 * Record that this browser reached a screen.
 *
 * Lived inside App's router effect, which meant only real URL changes were
 * ever recorded — and the four wizard steps all sit at /create. The dashboard
 * could say three people started a story and could not say whether they left
 * at the child's name, the photo, or the account wall, which is the only part
 * worth knowing. The wizard now reports its own steps through here.
 */
export function recordVisit(
  path: string,
  extra: { userId?: string; lang?: string; device?: 'mobile' | 'desktop' } = {}
): void {
  let visitorId: string | null = null;
  try {
    visitorId = localStorage.getItem('mmb_visitor');
    if (!visitorId) {
      visitorId = (crypto.randomUUID?.() || String(Math.random()).slice(2)) as string;
      localStorage.setItem('mmb_visitor', visitorId);
    }
  } catch {
    // Private windows and blocked storage: count the view without a stable id
    // rather than dropping it.
    visitorId = (crypto.randomUUID?.() || String(Math.random()).slice(2)) as string;
  }

  publicApi
    .trackVisit(visitorId, path, {
      referrer: document.referrer,
      device: window.innerWidth < 768 ? 'mobile' : 'desktop',
      ...extra,
    })
    .catch(() => { /* a lost page view is not worth retrying */ });
}
