import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { publicApi } from '../../api/publicApi';
import { toCardUrl } from '../../api/mediaUrl';
import { getThemeLabel } from '../../utils/themeLabel';

/**
 * The book half of the hero's "one photo → a printed book".
 *
 * Every cover here was drawn from the one photograph shown beside it — the six
 * stories re-shot from that child's face. That is the whole claim of the shop,
 * and it is the one thing the page never actually demonstrated: it showed a
 * cover, and a stranger had to take on faith that the child on it could be
 * theirs. Six different books from one snapshot is the proof.
 *
 * So this list is FIXED, not "whatever is ready". A cover drawn from some other
 * child would quietly turn the demonstration into a lie, which is exactly what
 * would happen if it pulled the newest themes instead.
 *
 * The first frame is a local webp: it is the page's largest image, it paints
 * without waiting on the media proxy, and swapping it for a fetched one would
 * trade the first impression for the fourth. The rest arrive afterwards.
 */

/** The opening frame: local, instant — a copy of theme_world_adventure's cover. */
const FIRST_SRC = '/showcase/hero-book.webp';
const FIRST_THEME = 'world_adventure';

/**
 * The stories drawn from the photograph beside them, in the order they show.
 * Adding a theme here without re-shooting it from that same photo breaks the
 * only thing this section is for.
 */
const FROM_THIS_PHOTO = [
  'world_adventure',
  'little_vet',
  'dabke',
  'jerusalem_tale',
  'jaffa_day',
  'oud_lesson',
] as const;

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
        const byId = new Map<string, any>(
          (res?.settings?.themes ?? []).map((th: any) => [th.id, th]),
        );
        // In the fixed order above, and only the ones still published: a story
        // the owner hides must leave the hero with it.
        const rest: Slide[] = [];
        for (const id of FROM_THIS_PHOTO) {
          if (id === FIRST_THEME) continue;
          const th = byId.get(id);
          if (!th?.generatedCover) continue;
          rest.push({
            src: toCardUrl(th.generatedCover, 480),
            label: getThemeLabel(th, t as any, i18n.language),
          });
        }
        setSlides([first, ...rest]);
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
