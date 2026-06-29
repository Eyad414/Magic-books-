import HTMLFlipBook from 'react-pageflip';
import { detectGender, applyGenderTokens } from '../../utils/gender';
import { localizeName } from '../../utils/translit';

export interface PreviewPage {
  type: 'cover' | 'text' | 'lock';
  title?: string;
  content?: string;
}

/**
 * Builds a short, language-aware teaser of the SELECTED theme's real story:
 * cover + the first two pages + a "locked" page. The full story stays hidden
 * until after payment.
 */
export function buildThemePreview(opts: {
  theme: string;
  language: 'ar' | 'en' | 'he';
  childName?: string;
  childGender?: 'male' | 'female';
  i18n: any;
}): PreviewPage[] {
  const { theme, language, childName = '', childGender, i18n } = opts;
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
    return [
      { type: 'cover', title: ft('step2.preview_generic_title', 'قصة سحرية') },
      { type: 'lock', content: lockMsg },
    ];
  }
  const textPages: PreviewPage[] = Object.keys(pagesObj)
    .sort((a, b) => Number(a) - Number(b))
    .slice(0, 2)
    .map((k) => ({ type: 'text', content: personalize(pagesObj[k]) }));
  return [{ type: 'cover', title: personalize(titleRaw) }, ...textPages, { type: 'lock', content: lockMsg }];
}

interface Props {
  /** Cover + first story pages + a "locked" page for the chosen theme. */
  pages?: PreviewPage[];
  /** Legacy: a block of story text — rendered as cover + 1 teaser page + lock. */
  text?: string;
  language?: 'ar' | 'en' | 'he';
}

// A small, language-aware teaser of the SELECTED theme's real story.
// We intentionally show only the cover + the first couple of pages, then a
// lock page — the full story is revealed only after payment.
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

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 overflow-hidden" dir="ltr">
      <div className="relative shadow-2xl" style={{ width: '100%', maxWidth: '700px' }}>
        {/* @ts-ignore — react-pageflip has loose types */}
        <HTMLFlipBook
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
              ) : page.type === 'lock' ? (
                <div
                  className="h-full w-full flex flex-col items-center justify-center text-center px-5"
                  style={{ background: 'linear-gradient(160deg, #0d1a2e 0%, #050a15 100%)' }}
                  dir={dir}
                >
                  <div className="text-4xl mb-3">🔒</div>
                  <p className="font-arabic text-gold-400 text-xs sm:text-sm font-bold leading-relaxed max-w-[85%]">{page.content}</p>
                </div>
              ) : (
                <div
                  className="h-full w-full flex items-center justify-center px-5 py-4 relative"
                  style={{ background: '#fdfaf0' }}
                  dir={dir}
                >
                  <p className="font-arabic text-dark-900 text-xs sm:text-sm font-bold leading-relaxed text-center">{page.content}</p>
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
