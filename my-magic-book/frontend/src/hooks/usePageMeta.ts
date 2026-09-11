import { useEffect } from 'react';

const SUFFIX = 'Magic Fanoos | ماجيك فانوس';
const DEFAULT_TITLE = 'Magic Fanoos | ماجيك فانوس — قصص مخصصة لطفلك';

/** Set an attribute, returning what was there so it can be put back. */
function swap(el: Element | null, attr: string, value?: string): string | null {
  if (!el || !value) return null;
  const previous = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return previous;
}

/**
 * Give a page its own title, description, canonical URL and share preview.
 *
 * Every route rendered the one <title> baked into index.html, so a search
 * result for the stories page, the contact page and the home page all read
 * identically — and the page that actually shows the books said nothing about
 * them.
 *
 * The canonical matters more than the title did. index.html hard-codes it to
 * the bare domain, and nothing ever changed it, so /stories, /create, /about,
 * /contact and /policy each told Google "the real page is the home page" —
 * which is an instruction not to index them at all. Per-page titles cannot help
 * a page Google has been told to fold away.
 *
 * og:* and twitter:* are the same tags a WhatsApp or Facebook share reads, and
 * they were stuck on the home page's wording too: every link the owner posted
 * previewed identically no matter which page it pointed at.
 *
 * Everything is restored on unmount so a page without its own meta never
 * inherits the last one's.
 */
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    const full = title.includes(SUFFIX) ? title : `${title} | ${SUFFIX}`;
    const previousTitle = document.title;
    document.title = full;

    // Query strings are for the app (?lng=, ?name=), never a separate page to
    // index — a canonical carrying them would split one page into many.
    const url = `${window.location.origin}${window.location.pathname}`;

    const targets: [Element | null, string, string | undefined][] = [
      [document.querySelector('meta[name="description"]'), 'content', description],
      [document.querySelector('link[rel="canonical"]'), 'href', url],
      [document.querySelector('meta[property="og:url"]'), 'content', url],
      [document.querySelector('meta[property="og:title"]'), 'content', full],
      [document.querySelector('meta[property="og:description"]'), 'content', description],
      [document.querySelector('meta[name="twitter:title"]'), 'content', full],
      [document.querySelector('meta[name="twitter:description"]'), 'content', description],
    ];
    const previous = targets.map(([el, attr, value]) => swap(el, attr, value));

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      targets.forEach(([el, attr], i) => {
        const was = previous[i];
        if (el && was !== null) el.setAttribute(attr, was);
      });
    };
  }, [title, description]);
}
