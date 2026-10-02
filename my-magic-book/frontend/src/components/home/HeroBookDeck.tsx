import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../../api/publicApi';
import { toCardUrl } from '../../api/mediaUrl';
import { getThemeLabel } from '../../utils/themeLabel';

/**
 * The book in the hero, as a deck instead of a single cover.
 *
 * It was one fixed image for a shop with twenty-five stories. A visitor
 * arriving from a reel saw one cover and had no way to know there was a
 * Jerusalem story, a dabke story, dinosaurs or space behind it, and breadth is
 * what they came to judge.
 *
 * The list was briefly pinned to the six books drawn from one photograph, to
 * sit beside that photograph and prove they were all the same child. The
 * photograph has been taken off the home page, so the pinning has nothing left
 * to demonstrate — and spreading across the catalogue is what the hero is for.
 *
 * The first frame is a local webp: it is the page's largest image, it paints
 * without waiting on the media proxy, and swapping it for a fetched one would
 * trade the first impression for the fourth. The rest arrive afterwards.
 */

/** The opening frame: local, instant — a copy of theme_world_adventure's cover. */
const FIRST_SRC = '/showcase/hero-book.webp';
const FIRST_THEME = 'world_adventure';

/** Enough to read as a catalogue, few enough to come back round. */
const MAX_SLIDES = 7;

interface Slide {
  src: string;
  label: string;
}

const HOLD_MS = 3800;

export default function HeroBookDeck() {
  const { t, i18n } = useTranslation();
  const first = useMemo<Slide>(
    () => ({ src: FIRST_SRC, label: t(`step2.theme_${FIRST_THEME}`) }),
    [t, i18n.language],
  );
  const [slides, setSlides] = useState<Slide[]>([first]);
  const [at, setAt] = useState(0);
  const timer = useRef<number | null>(null);

  // Live covers, after the first paint. A failure here is not worth a broken
  // hero: the deck simply stays the one local cover it started with.
  useEffect(() => {
    let alive = true;
    publicApi
      .getSettings()
      .then((res) => {
        if (!alive) return;
        const themes = (res?.settings?.themes ?? []).filter(
          (th: any) => !th.isColoring && th.generatedCover,
        );
        // Spread across the catalogue rather than taking the first seven, which
        // are all school-and-space: the point of the deck is the range.
        const step = Math.max(1, Math.floor(themes.length / (MAX_SLIDES - 1)));
        const picked: Slide[] = [];
        for (let i = 0; i < themes.length && picked.length < MAX_SLIDES - 1; i += step) {
          const th = themes[i];
          picked.push({
            src: toCardUrl(th.generatedCover, 480),
            label: getThemeLabel(th, t as any, i18n.language),
          });
        }
        // Drop the duplicate of whatever the opening frame already shows.
        setSlides([first, ...picked.filter((x) => x.label !== first.label)]);
      })
      .catch(() => {/* keep the local cover */});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, first.label]);

  useEffect(() => {
    if (slides.length < 2) return;
    // Someone who has asked for less motion gets the cover, not a slideshow.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const tick = () => setAt((i) => (i + 1) % slides.length);
    const start = () => {
      stop();
      timer.current = window.setInterval(tick, HOLD_MS);
    };
    const stop = () => {
      if (timer.current !== null) window.clearInterval(timer.current);
      timer.current = null;
    };
    // A background tab should not burn through the deck; it also means the
    // visitor comes back to a cover rather than mid-fade.
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [slides.length]);

  const current = slides[at] ?? first;

  return (
    <div className="absolute inset-0">
      {slides.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={i === at ? s.label || t('hero.custom_story') : ''}
          aria-hidden={i !== at}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
            i === at ? 'opacity-100' : 'opacity-0'
          }`}
          // Only the opening frame is worth the priority; the rest arrive later
          // by definition and must not compete with it.
          fetchPriority={i === 0 ? 'high' : 'low'}
          loading={i === 0 ? 'eager' : 'lazy'}
          decoding={i === 0 ? 'sync' : 'async'}
          draggable={false}
        />
      ))}

      {/* The story's name, so the deck reads as a catalogue and not as one book
          that keeps changing. Hidden on the opening frame, which has none. */}
      <div
        className={`absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-dark-900 via-dark-900/55 to-transparent pointer-events-none transition-opacity duration-500 ${
          current.label ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="font-arabic font-black text-white text-sm text-center drop-shadow-lg line-clamp-1">
          {current.label}
        </p>
      </div>

      {/* Where you are in the deck. Small, and only once there is a deck. */}
      {slides.length > 1 && (
        <div className="absolute top-3 inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none">
          {slides.map((s, i) => (
            <span
              key={s.src}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === at ? 'w-5 bg-gold-500' : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
