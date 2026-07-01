import { useState, useEffect } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { detectGender, applyGenderTokens } from '../../utils/gender';
import { localizeName } from '../../utils/translit';

export interface PreviewPage {
  type: 'cover' | 'text' | 'lock';
  title?: string;
  content?: string;
  /** Sample illustration (Baha) for this page, already a loadable URL. */
  image?: string;
  /** Blurred (locked) page — readable only after payment. */
  blur?: boolean;
}

/**
 * Builds a short, language-aware teaser of the SELECTED theme's real story:
 * cover + the first ~30% of pages readable, the rest blurred, then a "locked"
 * page. Illustrated with the theme's sample (Baha) images when available. The
 * full story stays hidden until after payment.
 */
export function buildThemePreview(opts: {
  theme: string;
  language: 'ar' | 'en' | 'he';
  childName?: string;
  childGender?: 'male' | 'female';
  coverImage?: string;
  pageImages?: string[];
  i18n: any;
}): PreviewPage[] {
  const { theme, language, childName = '', childGender, coverImage, pageImages = [], i18n } = opts;
  const name = localizeName(
    childName || (language === 'ar' ? 'طفلك' : language === 'he' ? 'הילד' : 'your child'),
    language,
  );
  const gender = childGender || detectGender(childName);
  const ft = i18n.getFixedT(language);
  const personalize = (s: string) => applyGenderTokens((s || '').replace(/\[NAME\]/gi, name), gender);

  const lockMsg = ft('step2.preview_locked', '🔒 يظهر باقي القصة بعد إتمام الطلب');
  const titleRaw = ft(`stories.${theme}.title`, '') as string;
  const pagesObj = ft(`stories.${theme}.pages`, { returnObjects: true }) as Record<string, string> | string;

  if (!titleRaw || typeof pagesObj !== 'object') {
    // No scripted story text for this theme — still show an illustrated teaser
    // from the sample images (first ~30% visible, the rest blurred).
    if (pageImages.length) {
      const readable = Math.max(1, Math.ceil(pageImages.length * 0.3));
      const imgPages: PreviewPage[] = pageImages.map((img, idx): PreviewPage => ({
        type: 'text', image: img, content: '', blur: idx >= readable,
      }));
      return [
        { type: 'cover', title: ft('step2.preview_generic_title', 'قصة سحرية'), image: coverImage },
        ...imgPages,
        { type: 'lock', content: lockMsg },
      ];
    }
    return [
      { type: 'cover', title: ft('step2.preview_generic_title', 'قصة سحرية'), image: coverImage },
      { type: 'lock', content: lockMsg },
    ];
  }
  // Show the first ~30% of the story readable; blur the rest until the end.
  // Like the real book: each story page is a TEXT page + its own IMAGE page
  // (separate sheets), not text overlaid on the photo.
  const allKeys = Object.keys(pagesObj).sort((a, b) => Number(a) - Number(b));
  const readable = Math.max(1, Math.ceil(allKeys.length * 0.3));
  const bodyPages: PreviewPage[] = [];
  allKeys.forEach((k, idx) => {
    const locked = idx >= readable;
    bodyPages.push({ type: 'text', content: personalize(pagesObj[k]), blur: locked });
    if (pageImages[idx]) bodyPages.push({ type: 'text', image: pageImages[idx], blur: locked });
  });
  return [{ type: 'cover', title: personalize(titleRaw), image: coverImage }, ...bodyPages, { type: 'lock', content: lockMsg }];
}

interface Props {
  /** Cover + first story pages + a "locked" page for the chosen theme. */
  pages?: PreviewPage[];
  /** Legacy: a block of story text — rendered as cover + 1 teaser page + lock. */
  text?: string;
  language?: 'ar' | 'en' | 'he';
}

// A small, language-aware teaser of the SELECTED theme's real story.
// We intentionally show only the cover + the first ~30% of pages, blur the
// rest, then a lock page — the full story is revealed only after payment.
export default function FlipbookPreview({ pages, text, language = 'ar' }: Props) {
  const dir = language === 'ar' || language === 'he' ? 'rtl' : 'ltr';
  const lock =
    language === 'en' ? '🔒 The rest of the story unlocks after checkout'
    : language === 'he' ? '🔒 שאר הסיפור ייחשף לאחר התשלום'
    : '🔒 يظهر باقي القصة بعد إتمام الطلب';
  const resolved: PreviewPage[] = pages && pages.length
    ? pages
    : [
        { type: 'cover', title: 'Magic Fanoose' },
        ...(text ? [{ type: 'text' as const, content: text.slice(0, 340) }] : []),
        { type: 'lock', content: lock },
      ];

  // react-pageflip measures its container on mount; when the wizard navigates
  // to this step the container isn't laid out yet, so the book renders blank
  // until a resize/reload. Remount once after layout settles + nudge a resize.
  const [flipKey, setFlipKey] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      setFlipKey((k) => k + 1);
      window.dispatchEvent(new Event('resize'));
    }, 60);
    return () => clearTimeout(t);
  }, [resolved.length, language]);

  const hideOnError = (e: any) => { e.currentTarget.style.display = 'none'; };

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 overflow-hidden" dir="ltr">
      <div className="relative shadow-2xl" style={{ width: '100%', maxWidth: '700px' }}>
        {/* @ts-ignore — react-pageflip has loose types */}
        <HTMLFlipBook
          key={flipKey}
          width={250}
          height={250}
          size="stretch"
          minWidth={180}
          maxWidth={280}
          minHeight={180}
          maxHeight={280}
          maxShadowOpacity={0.5}
          showCover={true}
          mobileScrollSupport={true}
          usePortrait={false}
          flippingTime={1200}
          className="flipbook-container"
        >
          {resolved.map((page, i) => (
            <div key={i} className="relative overflow-hidden">
              {page.type === 'cover' ? (
                page.image ? (
                  <div className="h-full w-full relative" style={{ background: '#0a1426' }} dir={dir}>
                    <img src={page.image} alt="" className="absolute inset-0 w-full h-full object-cover" onError={hideOnError} />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(5,10,21,0.92) 0%, rgba(5,10,21,0.05) 42%, rgba(5,10,21,0.45) 100%)' }} />
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                      <img src="/logo.png" alt="" className="w-6 h-6 object-contain" />
                      <span className="font-brand text-gold-500 text-[11px] tracking-wide">Magic Fanoose</span>
                    </div>
                    <h3 className="absolute bottom-4 left-0 right-0 px-4 font-arabic font-black text-white text-base leading-snug text-center drop-shadow-lg">{page.title}</h3>
                  </div>
                ) : (
                  <div
                    className="h-full w-full flex flex-col items-center justify-center text-center px-5"
                    style={{ background: 'radial-gradient(ellipse at 50% 28%, #17294a 0%, #0a1426 68%, #050a15 100%)' }}
                    dir={dir}
                  >
                    <img src="/logo.png" alt="" className="w-16 h-16 object-contain mb-2 drop-shadow-[0_0_12px_rgba(212,169,55,0.5)]" />
                    <span className="font-brand text-gold-500 text-sm tracking-wide">Magic Fanoose</span>
                    <div className="w-10 h-px bg-gold-500/50 my-2.5" />
                    <h3 className="font-arabic font-black text-white text-base leading-snug">{page.title}</h3>
                  </div>
                )
              ) : page.type === 'lock' ? (
                <div
                  className="h-full w-full flex flex-col items-center justify-center text-center px-5"
                  style={{ background: 'linear-gradient(160deg, #0d1a2e 0%, #050a15 100%)' }}
                  dir={dir}
                >
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="font-arabic text-gold-400 text-xs sm:text-sm font-bold leading-relaxed max-w-[85%]">{page.content}</p>
                </div>
              ) : page.image ? (
                /* Full-bleed illustration page (its own sheet, no text overlay —
                   the story text lives on its own page). */
                <div className="h-full w-full relative" style={{ background: '#0a1426' }} dir={dir}>
                  <img
                    src={page.image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={page.blur ? { filter: 'blur(5px)' } : undefined}
                    onError={hideOnError}
                  />
                  {page.content && (
                  <div className="absolute bottom-0 left-0 right-0 px-3 pt-6 pb-2" style={{ background: 'linear-gradient(to top, rgba(5,10,21,0.94) 0%, rgba(5,10,21,0) 100%)' }}>
                    <p
                      className="font-arabic text-white text-[11px] sm:text-xs font-bold leading-snug text-center drop-shadow"
                      style={page.blur ? { filter: 'blur(4px)', userSelect: 'none' } : undefined}
                    >
                      {page.content}
                    </p>
                  </div>
                  )}
                  {page.blur && (
                    <div className="absolute inset-0 flex items-center justify-center bg-dark-900/25">
                      <span className="text-3xl drop-shadow">🔒</span>
                    </div>
                  )}
                  <span className="absolute top-2 right-2 text-white/40 font-bold text-[10px]">{i}</span>
                </div>
              ) : (
                /* Text-only fallback (theme has no sample images yet) */
                <div
                  className="h-full w-full flex items-center justify-center px-5 py-4 relative"
                  style={{ background: '#fdfaf0' }}
                  dir={dir}
                >
                  <p
                    className="font-arabic text-dark-900 text-xs sm:text-sm font-bold leading-relaxed text-center"
                    style={page.blur ? { filter: 'blur(4.5px)', userSelect: 'none' } : undefined}
                  >
                    {page.content}
                  </p>
                  {page.blur && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/25 backdrop-blur-[1px]">
                      <span className="text-2xl drop-shadow">🔒</span>
                    </div>
                  )}
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-dark-900/20 font-bold text-[10px]">{i}</span>
                </div>
              )}
            </div>
          ))}
        </HTMLFlipBook>
      </div>
    </div>
  );
}
