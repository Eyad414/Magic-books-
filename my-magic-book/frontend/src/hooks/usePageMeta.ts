import { useEffect } from 'react';

const SUFFIX = 'Magic Fanoos | ماجيك فانوس';
const DEFAULT_TITLE = 'Magic Fanoos | ماجيك فانوس — قصص مخصصة لطفلك';

/**
 * Give a page its own title and description.
 *
 * Every route rendered the one <title> baked into index.html, so a search
 * result for the stories page, the contact page and the home page all read
 * identically — and the page that actually shows the books said nothing about
 * them. Restores the default on unmount so a page without its own meta never
 * inherits the last one's.
 */
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title.includes(SUFFIX) ? title : `${title} | ${SUFFIX}`;

    const tag = document.querySelector('meta[name="description"]');
    const previousDesc = tag?.getAttribute('content') || null;
    if (description && tag) tag.setAttribute('content', description);

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      if (description && tag && previousDesc !== null) tag.setAttribute('content', previousDesc);
    };
  }, [title, description]);
}
