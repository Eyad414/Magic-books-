import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Make an in-page #anchor actually land on its section.
 *
 * The browser tries the anchor the moment the document arrives, which on a
 * single-page app is before React has rendered anything — the element does not
 * exist yet, the jump silently does nothing, and the visitor is left at the top
 * of the page wondering what the link was for.
 *
 * Two things this has to survive, both found by testing rather than reasoning:
 *
 *   A cold load needs more than one frame. A client-side navigation works with
 *   a single retry — the page is already laid out, only the hash changed — so
 *   testing it that way passes and hides the bug. On a cold load the section is
 *   still being laid out and images are still resolving, and a jump taken too
 *   early lands somewhere that is no longer the section.
 *
 *   It cannot be built on requestAnimationFrame. RAF is suspended in a hidden
 *   tab, so a link opened in a background tab would never scroll at all, and
 *   the visitor finds the top of the page when they switch to it. Timers keep
 *   running (throttled) where RAF does not, so the retry is on a timer and the
 *   scroll itself is instant rather than smooth — html sets scroll-behavior:
 *   smooth globally, and an animated jump fights the next retry.
 *
 * Written once because it was about to be copied a third time: /about links to
 * the home FAQ, and the wizard links to the policy's privacy section from the
 * photo upload.
 */
export function useHashScroll() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));

    let timer: ReturnType<typeof setTimeout>;
    let elapsed = 0;
    let lastTop: number | null = null;

    const tick = () => {
      const el = document.getElementById(id);
      if (el) {
        const top = Math.round(el.getBoundingClientRect().top + window.scrollY);
        // Jump every pass until the target stops moving: late images and fonts
        // reflow the page underneath, so the first correct-looking scroll is
        // often already stale. 'auto' because the page sets smooth globally.
        window.scrollTo({ top, behavior: 'auto' });
        if (lastTop !== null && Math.abs(top - lastTop) < 2) return; // settled
        lastTop = top;
      }
      elapsed += 100;
      if (elapsed < 3000) timer = setTimeout(tick, 100);
    };

    timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, [hash]);
}
