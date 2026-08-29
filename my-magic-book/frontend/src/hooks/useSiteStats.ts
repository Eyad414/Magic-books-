import { useEffect, useState } from 'react';
import { publicApi } from '../api/publicApi';

/**
 * The trust counters, counted from the database.
 *
 * There is one source on purpose. The Home hero read these from
 * `/public/stats` while the About page read `settings.homeStats` — figures an
 * admin types by hand — so the same site told a parent "39 stories" on one page
 * and "+300 stories" on the next. Whichever number they believed, the site had
 * lied to them once. Anything that shows these figures uses this hook.
 *
 * Until the request lands, the placeholder is an em dash rather than a
 * plausible-looking number: an empty slot for a heartbeat is honest, a wrong
 * number is not.
 */
export interface SiteStats {
  /** Stories created, whatever their state. */
  storiesCreated: string;
  /** Distinct children who have starred in one. */
  happyFamilies: string;
  /** Stories fully built and ready to read. */
  readyStories: string;
  /** Languages the shop actually publishes in. */
  languages: string;
}

const PLACEHOLDER: SiteStats = {
  storiesCreated: '—',
  happyFamilies: '—',
  readyStories: '—',
  languages: '—',
};

export function useSiteStats(): SiteStats {
  const [stats, setStats] = useState<SiteStats>(PLACEHOLDER);

  useEffect(() => {
    let alive = true;
    publicApi.getStats()
      .then((res) => {
        if (!alive || !res?.stats) return;
        const { books, children, ready, languages } = res.stats;
        setStats({
          storiesCreated: books == null ? '—' : String(books),
          happyFamilies: children == null ? '—' : String(children),
          readyStories: ready == null ? '—' : String(ready),
          languages: languages == null ? '—' : String(languages),
        });
      })
      // Keep the placeholders. A failed count must never fall back to a
      // flattering guess.
      .catch(() => { /* nothing to do: the em dashes stay */ });
    return () => { alive = false; };
  }, []);

  return stats;
}
