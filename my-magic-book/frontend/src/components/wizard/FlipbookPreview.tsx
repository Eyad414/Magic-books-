import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import HTMLFlipBook from 'react-pageflip';
import { resolveGender, applyGenderTokens } from '../../utils/gender';
import { localizeName } from '../../utils/translit';

// Rotating page background colors for the decorative text pages.
const PAGE_COLORS = ['#F2607A', '#7C5CE0', '#159B8A', '#2E7BD6', '#E17055', '#3FA34D'];

// "More adventures" teasers on the back cover — kept in sync with BackCover.tsx
// so the preview advertises the same next stories as the printed book.
const ALL_TEASERS = [
  { id: 'space', emoji: '🚀', fallback: 'في الفضاء' },
  { id: 'school', emoji: '🏫', fallback: 'في المدرسة' },
  { id: 'zoo', emoji: '🦁', fallback: 'في حديقة الحيوانات' },
  { id: 'ocean', emoji: '🌊', fallback: 'في أعماق المحيط' },
  { id: 'dinosaurs', emoji: '🦖', fallback: 'في عالم الديناصورات' },
  { id: 'world', emoji: '🌍', fallback: 'حول العالم' },
  { id: 'superhero', emoji: '⚡', fallback: 'بطلاً خارقاً' },
];
const TEASER_EXCLUDE: Record<string, string> = { zoo_adventure: 'zoo', space: 'space', school_hero: 'school' };

export interface PreviewPage {
  type: 'cover' | 'text' | 'lock' | 'final' | 'back' | 'title' | 'dedication' | 'policy';
  title?: string;
  content?: string;
  /** Sample illustration (Baha) for this page, already a loadable URL. */
  image?: string;
  /** Blurred (locked) page — readable only after payment. */
  blur?: boolean;
  /** Closing pages — the same fields the printed FinalStoryPage/BackCover use. */
  moral?: string;
  questions?: string[];
  conclusion?: string;
  childName?: string;
  teasers?: { id: string; emoji: string; label: string }[];
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
  /** The book's closing portrait (page-99) — shown on the back cover. */
  portraitImage?: string;
  i18n: any;
  /** Admin full preview: show the WHOLE book readable, no blur, no lock page. */
  full?: boolean;
}): PreviewPage[] {
  const { theme, language, childName = '', childGender, coverImage, pageImages = [], portraitImage, i18n, full = false } = opts;
  const name = localizeName(
    childName || (language === 'ar' ? 'طفلك' : language === 'he' ? 'הילד' : 'your child'),
    language,
  );
  const gender = resolveGender(childName, childGender);
  const ft = i18n.getFixedT(language);
  const personalize = (s: string) => applyGenderTokens((s || '').replace(/\[NAME\]/gi, name), gender);

  const lockMsg = ft('step2.preview_locked', '🔒 يظهر باقي القصة بعد إتمام الطلب');
  const titleRaw = ft(`stories.${theme}.title`, '') as string;
  const pagesObj = ft(`stories.${theme}.pages`, { returnObjects: true }) as Record<string, string> | string;

  /**
   * Title for a theme with no scripted story of its own (the coloring books).
   * It used to fall back to a generic "قصة سحرية", so Hamza's and Yosef's covers
   * carried no name at all — the whole point is the child seeing themselves.
   */
  const fallbackTitle = personalize(
    theme.includes('coloring')
      ? (ft('step2.preview_coloring_title', 'كتاب تلوين [NAME]') as string)
      : (ft('step2.preview_story_title', 'قصة [NAME]') as string),
  );
  const bookTitle = personalize(titleRaw) || fallbackTitle;

  /**
   * The sheets the printed book OPENS with, before the story starts: the inside
   * title page and the dedication. The printed book also has a lantern logo
   * separator on each side of the story, but it reads as filler at preview
   * size, so the preview skips both.
   */
  const openingPages = (): PreviewPage[] => {
    const dedication = personalize((ft(`stories.${theme}.dedication`, '') as string) || '');
    return [
      { type: 'title', title: bookTitle, childName: name },
      // Coloring books have no dedication text — skip rather than show an empty sheet.
      ...(dedication
        ? [{ type: 'dedication', content: dedication, image: portraitImage, childName: name } as PreviewPage]
        : []),
    ];
  };

  /**
   * The sheets the printed book ENDS on, mirroring FinalStoryPage,
   * CopyrightPage and BackCover. Only appended to a FULL preview — a locked
   * teaser must not give the ending away.
   */
  const closingPages = (): PreviewPage[] => {
    // `questions` is a JSON array in ar but an object ({"0":…}) in en/he, so
    // an Array.isArray test alone silently drops them in two of three locales.
    const rawQuestions = ft(`stories.${theme}.questions`, { returnObjects: true });
    const questionList: unknown[] = Array.isArray(rawQuestions)
      ? rawQuestions
      : rawQuestions && typeof rawQuestions === 'object'
        ? Object.keys(rawQuestions as object)
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => (rawQuestions as Record<string, unknown>)[k])
        : [];
    const questions = questionList.filter((q): q is string => typeof q === 'string').map(personalize);
    // Never recommend the theme they just read (same rule as BackCover).
    const teasers = ALL_TEASERS
      .filter((tz) => tz.id !== (TEASER_EXCLUDE[theme] || ''))
      .slice(0, 3)
      .map((tz) => ({ id: tz.id, emoji: tz.emoji, label: ft(`storybook.teaser_${tz.id}`, tz.fallback) as string }));

    return [
      {
        type: 'final',
        title: bookTitle,
        content: ft('storybook.end_story', '✦ نهاية القصة ✦') as string,
        moral: personalize((ft(`stories.${theme}.moral`, '') as string) || ''),
        questions,
        conclusion: personalize((ft(`stories.${theme}.conclusion`, '') as string) || ''),
        childName: name,
      },
      { type: 'policy' },
      {
        type: 'back',
        title: ft('storybook.congrats', 'أحسنت يا {{name}}! 🌟', { name }) as string,
        content: ft('storybook.completed_desc', 'أتممت قراءة قصتك السحرية — استمر في المغامرة!') as string,
        image: portraitImage,
        childName: name,
        teasers,
      },
    ];
  };

  if (!titleRaw || typeof pagesObj !== 'object') {
    // No scripted story text for this theme — still show an illustrated teaser
    // from the sample images (first ~30% visible, the rest blurred).
    if (pageImages.length) {
      const readable = full ? pageImages.length : Math.max(1, Math.ceil(pageImages.length * 0.3));
      const imgPages: PreviewPage[] = pageImages.map((img, idx): PreviewPage => ({
        type: 'text', image: img, content: '', blur: idx >= readable,
      }));
      return [
        { type: 'cover', title: fallbackTitle, image: coverImage },
        ...(full ? openingPages() : []),
        ...imgPages,
        ...(full ? closingPages() : [{ type: 'lock', content: lockMsg } as PreviewPage]),
      ];
    }
    return [
      { type: 'cover', title: fallbackTitle, image: coverImage },
      { type: 'lock', content: lockMsg },
    ];
  }
  // Show the first ~30% of the story readable; blur the rest until the end.
  // Like the real book: each story page is a TEXT page + its own IMAGE page
  // (separate sheets), not text overlaid on the photo.
  const allKeys = Object.keys(pagesObj).sort((a, b) => Number(a) - Number(b));
  const readable = full ? allKeys.length : Math.max(1, Math.ceil(allKeys.length * 0.3));
  const bodyPages: PreviewPage[] = [];
  allKeys.forEach((k, idx) => {
    const locked = idx >= readable;
    bodyPages.push({ type: 'text', content: personalize(pagesObj[k]), blur: locked });
    if (pageImages[idx]) bodyPages.push({ type: 'text', image: pageImages[idx], blur: locked });
  });
  return [
    { type: 'cover', title: bookTitle, image: coverImage },
    ...(full ? openingPages() : []),
    ...bodyPages,
    ...(full ? closingPages() : [{ type: 'lock', content: lockMsg } as PreviewPage]),
  ];
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
  // The closing sheets reuse the printed book's own section headings.
  const { t: ftLocal } = useTranslation();
  const lock =
    language === 'en' ? '🔒 The rest of the story unlocks after checkout'
    : language === 'he' ? '🔒 שאר הסיפור ייחשף לאחר התשלום'
    : '🔒 يظهر باقي القصة بعد إتمام الطلب';
  const resolved: PreviewPage[] = pages && pages.length
    ? pages
    : [
        { type: 'cover', title: 'Magic Fanoos' },
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
      <style>{`
        .fbp-textpage { height:100%; width:100%; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; padding:14px;
          background: radial-gradient(130% 100% at 50% -10%, rgba(255,255,255,0.28) 0%, transparent 55%), radial-gradient(80% 60% at 50% 115%, rgba(0,0,0,0.18) 0%, transparent 60%), var(--pc, #F2607A); }
        .fbp-spark { position:absolute; color:rgba(255,255,255,0.85); text-shadow:0 0 6px rgba(255,255,255,0.7); font-size:9px; z-index:1; pointer-events:none; animation: fbp-tw 3s ease-in-out infinite; }
        .fbp-card { position:relative; width:100%; max-width:205px; background: radial-gradient(120% 90% at 50% 0%, #fffdf8 0%, #fdf4dd 70%, #f8ead0 100%);
          border-radius:16px; padding:22px 14px 16px; box-shadow: 0 10px 24px rgba(0,0,0,0.28), 0 0 0 1.5px rgba(255,255,255,0.6) inset; z-index:2; }
        .fbp-card::before { content:''; position:absolute; inset:7px; border:1.5px dashed rgba(201,150,40,0.55); border-radius:11px; pointer-events:none; }
        .fbp-lantern { position:absolute; top:-14px; left:50%; transform:translateX(-50%); width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:15px;
          border-radius:50%; background: radial-gradient(circle at 50% 35%, #fff6da, #f3d98f 70%, #d4a937); box-shadow: 0 0 12px rgba(212,169,55,0.85), 0 3px 8px rgba(0,0,0,0.25); border:2px solid #fff; z-index:3; }
        .fbp-corner { position:absolute; color:rgba(201,150,40,0.8); font-size:8px; z-index:3; }
        .fbp-divider { width:44px; height:2px; margin:0 auto 8px; border-radius:999px; background: linear-gradient(90deg, transparent, #d4a937, transparent); }
        .fbp-text { font-family:'Noto Kufi Arabic','Inter',sans-serif; color:#3a2c10; font-weight:700; font-size:11px; line-height:1.7; text-align:center; position:relative; z-index:1; }
        .fbp-num { position:absolute; bottom:6px; left:8px; background: linear-gradient(135deg, #fff6da, #f3d98f); color:#6b4a00; font-size:8px; font-weight:800; padding:1px 6px; border-radius:999px; z-index:4; }
        /* Closing sheet — FinalStoryPage compressed to a preview sheet */
        .fbp-close { font-family:'Noto Kufi Arabic','Inter',sans-serif; }
        .fbp-clabel { color:rgba(212,169,55,0.7); font-size:6.5px; letter-spacing:0.15em; font-weight:700; }
        .fbp-ctitle { font-size:11px; font-weight:900; margin:1px 0 0; line-height:1.35;
          background:linear-gradient(135deg,#fff 30%,#D4A937 70%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
        .fbp-cdiv { width:100%; height:1px; background:linear-gradient(90deg, transparent, rgba(212,169,55,0.35), transparent); flex:none; }
        .fbp-cdiv--sm { width:60%; margin:0 auto; }
        .fbp-chead { color:#D4A937; font-size:7.5px; font-weight:800; margin:0 0 3px; }
        .fbp-cmoral { color:rgba(255,255,255,0.82); font-size:7px; line-height:1.6; font-weight:500;
          background:rgba(212,169,55,0.06); border-inline-start:2px solid #D4A937; padding:3px 5px; border-radius:0 5px 5px 0; margin:0; }
        .fbp-cbody { color:rgba(255,255,255,0.85); font-size:7px; line-height:1.6; font-weight:600; margin:0 0 2px; }
        .fbp-cstar { color:#D4A937; font-size:8px; font-weight:900; margin:0; }
        .fbp-qlist { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:2px; }
        .fbp-qitem { color:rgba(255,255,255,0.75); font-size:6.5px; line-height:1.55; padding-inline-start:8px; position:relative; }
        .fbp-qitem::before { content:"◆"; position:absolute; inset-inline-start:0; color:#D4A937; font-size:4.5px; top:3px; }
        @keyframes fbp-tw { 0%,100%{opacity:0.35; transform:scale(0.8);} 50%{opacity:1; transform:scale(1.1);} }
      `}</style>
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
                      <img src="/logo.png?v=7" alt="" className="w-6 h-6 object-contain" />
                      <span className="font-brand text-gold-500 text-[11px] tracking-wide">Magic Fanoos</span>
                    </div>
                    <h3 className="absolute bottom-4 left-0 right-0 px-4 font-arabic font-black text-white text-base leading-snug text-center drop-shadow-lg">{page.title}</h3>
                  </div>
                ) : (
                  <div
                    className="h-full w-full flex flex-col items-center justify-center text-center px-5"
                    style={{ background: 'radial-gradient(ellipse at 50% 28%, #17294a 0%, #0a1426 68%, #050a15 100%)' }}
                    dir={dir}
                  >
                    <img src="/logo.png?v=7" alt="" className="w-16 h-16 object-contain mb-2 drop-shadow-[0_0_12px_rgba(212,169,55,0.5)]" />
                    <span className="font-brand text-gold-500 text-sm tracking-wide">Magic Fanoos</span>
                    <div className="w-10 h-px bg-gold-500/50 my-2.5" />
                    <h3 className="font-arabic font-black text-white text-base leading-snug">{page.title}</h3>
                  </div>
                )
              ) : page.type === 'title' ? (
                /* Inside title page — logo, brand, "presents [NAME]", title. */
                <div
                  className="h-full w-full flex flex-col items-center justify-center text-center px-5 relative overflow-hidden"
                  style={{ background: 'radial-gradient(ellipse at 50% 30%, #17294a 0%, #0a1426 68%, #050a15 100%)' }}
                  dir={dir}
                >
                  <span className="fbp-spark" style={{ top: '14%', left: '16%' }}>✦</span>
                  <span className="fbp-spark" style={{ top: '76%', right: '14%', animationDelay: '1.2s' }}>✦</span>
                  <img src="/logo.png?v=7" alt="" className="w-11 h-11 object-contain mb-1 drop-shadow-[0_0_12px_rgba(212,169,55,0.5)]" />
                  <span className="font-brand text-gold-500 text-[11px] tracking-wide">Magic Fanoos</span>
                  <div className="fbp-cdiv my-2" />
                  <p className="font-arabic text-gold-400/85 text-[8px] mb-1">
                    ✦ {ftLocal('title_page.presents', 'يُقدّم لـ')} {page.childName} ✦
                  </p>
                  <h3 className="font-arabic font-black text-white text-[12px] leading-snug max-w-[88%]">{page.title}</h3>
                </div>
              ) : page.type === 'dedication' ? (
                /* Dedication — the child's photo in a gold frame + the message. */
                <div
                  className="h-full w-full flex flex-col items-center justify-center text-center px-5 relative"
                  style={{ background: 'radial-gradient(ellipse at 50% 25%, #1a2440 0%, #0a1020 100%)' }}
                  dir={dir}
                >
                  <span className="fbp-corner" style={{ top: '8px', left: '9px' }}>✦</span>
                  <span className="fbp-corner" style={{ top: '8px', right: '9px' }}>✦</span>
                  <span className="fbp-corner" style={{ bottom: '8px', left: '9px' }}>✦</span>
                  <span className="fbp-corner" style={{ bottom: '8px', right: '9px' }}>✦</span>
                  {page.image && (
                    <img
                      src={page.image}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover border-2 border-gold-500/70 shadow-[0_0_14px_rgba(212,169,55,0.4)] mb-2.5"
                      onError={hideOnError}
                    />
                  )}
                  <p className="font-arabic text-white/85 text-[8px] leading-relaxed max-w-[86%]">{page.content}</p>
                </div>
              ) : page.type === 'policy' ? (
                /* Copyright / policy sheet — the printed CopyrightPage in brief. */
                <div
                  className="h-full w-full flex flex-col items-center justify-center text-center px-4 gap-1"
                  style={{ background: 'linear-gradient(165deg, #0a1628 0%, #050a15 100%)' }}
                  dir={dir}
                >
                  <div className="flex items-center gap-1.5">
                    <img src="/logo.png?v=7" alt="" className="w-6 h-6 object-contain" />
                    <span className="font-brand text-gold-500 text-[10px] tracking-wide">Magic Fanoos</span>
                  </div>
                  <div className="fbp-cdiv" />
                  <p className="font-arabic text-gold-300/80 text-[7px]">✦ MagicFanoos.com</p>
                  <p className="font-arabic text-gold-300/80 text-[7px]">✦ magicfanoose@gmail.com</p>
                  <div className="fbp-cdiv fbp-cdiv--sm" />
                  <p className="font-arabic text-white/60 text-[6.5px] leading-relaxed max-w-[92%]">
                    <strong className="text-white/80">{ftLocal('storybook.policy_content', 'سياسة المحتوى')}:</strong>{' '}
                    {ftLocal('storybook.policy_content_text', 'القصة والصور مخصّصة لطفلك للاستخدام العائلي فقط، ولا يجوز إعادة بيعها أو توزيعها تجاريًا.')}
                  </p>
                  <p className="font-arabic text-white/60 text-[6.5px] leading-relaxed max-w-[92%] mt-1">
                    <strong className="text-white/80">{ftLocal('storybook.policy_printing', 'سياسة الطباعة')}:</strong>{' '}
                    {ftLocal('storybook.policy_printing_text', '')}
                  </p>
                </div>
              ) : page.type === 'final' ? (
                /* Closing page — same sections as the printed FinalStoryPage:
                   end label, title, moral, discussion questions, conclusion. */
                <div
                  className="fbp-close h-full w-full flex flex-col justify-center gap-1.5 px-3.5 py-3 overflow-hidden"
                  style={{ background: 'linear-gradient(160deg, #0a1628 0%, #111840 60%, #0d0f1a 100%)' }}
                  dir={dir}
                >
                  <div className="text-center">
                    <span className="fbp-clabel">{page.content}</span>
                    <h3 className="fbp-ctitle">{page.title}</h3>
                  </div>
                  <div className="fbp-cdiv" />

                  {page.moral && (
                    <div>
                      <h4 className="fbp-chead">✦ {ftLocal('storybook.moral_title', 'العبر المستفادة من القصة')}</h4>
                      <p className="fbp-cmoral">{page.moral}</p>
                    </div>
                  )}

                  {!!page.questions?.length && (
                    <>
                      <div className="fbp-cdiv fbp-cdiv--sm" />
                      <div>
                        <h4 className="fbp-chead">✦ {ftLocal('storybook.questions_title', 'أسئلة ممتعة للمناقشة مع طفلك:')}</h4>
                        <ul className="fbp-qlist">
                          {page.questions.slice(0, 3).map((q, qi) => (
                            <li key={qi} className="fbp-qitem">{q}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  <div className="fbp-cdiv fbp-cdiv--sm" />
                  <div className="text-center">
                    {page.conclusion && <p className="fbp-cbody">{page.conclusion}</p>}
                    <p className="fbp-cstar">
                      {ftLocal('storybook.well_done', '⭐ أحسنت يا {{name}}! ⭐', { name: page.childName })}
                    </p>
                  </div>
                </div>
              ) : page.type === 'back' ? (
                /* Back cover — the printed BackCover in miniature: portrait,
                   congratulations, the "more adventures" teasers, brand footer. */
                <div
                  className="h-full w-full flex flex-col items-center justify-center px-3 py-3 text-center overflow-hidden"
                  style={{ background: 'linear-gradient(180deg, #0a1628 0%, #060d1a 60%, #03060e 100%)' }}
                  dir={dir}
                >
                  <div className="relative mb-1.5">
                    <img
                      src={page.image || '/logo.png?v=7'}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover border-2 border-gold-500/70 shadow-[0_0_14px_rgba(212,169,55,0.45)]"
                      onError={hideOnError}
                    />
                    <span className="absolute -top-1 -right-1 text-gold-400 text-[8px]">✦</span>
                    <span className="absolute -bottom-1 -left-1 text-gold-400 text-[8px]">✧</span>
                  </div>
                  <h3 className="font-arabic font-black text-gold-500 text-[10px] leading-snug">{page.title}</h3>
                  <p className="font-arabic text-white/55 text-[8px] leading-snug mt-0.5 max-w-[92%]">{page.content}</p>

                  {!!page.teasers?.length && (
                    <>
                      <div className="fbp-cdiv" />
                      <h4 className="font-arabic text-gold-400/90 text-[8px] font-bold mb-1">
                        {ftLocal('storybook.more_adventures', '✨ مغامرات أخرى تنتظرك')}
                      </h4>
                      <div className="grid grid-cols-3 gap-1 w-full px-1">
                        {page.teasers.map((tz) => (
                          <div key={tz.id} className="rounded-md bg-white/[0.06] border border-gold-500/20 p-1 flex flex-col items-center gap-0.5">
                            <span className="text-[11px] leading-none">{tz.emoji}</span>
                            <span className="font-arabic text-white/60 text-[6.5px] leading-tight">{page.childName} {tz.label}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="fbp-cdiv" />
                  <div className="flex items-center gap-1.5">
                    <img src="/logo.png?v=7" alt="" className="w-5 h-5 object-contain" />
                    <div className="flex flex-col items-start leading-none">
                      <span className="font-brand text-gold-500 text-[9px] tracking-wide">Magic Fanoos</span>
                      <span className="font-arabic text-white/30 text-[7px] mt-0.5">🌐 MagicFanoos.com</span>
                    </div>
                  </div>
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
                /* Decorative story-text page — magic-lantern gold card on a
                   colored page (mirrors the real book's StoryTextPage). */
                <div className="fbp-textpage" style={{ ['--pc' as any]: PAGE_COLORS[Math.floor(i / 2) % PAGE_COLORS.length] }} dir={dir}>
                  <span className="fbp-spark" style={{ top: '10%', left: '13%' }}>✦</span>
                  <span className="fbp-spark" style={{ top: '78%', left: '84%', animationDelay: '1s' }}>✦</span>
                  <span className="fbp-spark" style={{ top: '20%', right: '11%', animationDelay: '1.8s' }}>✦</span>
                  <span className="fbp-spark" style={{ bottom: '13%', left: '18%', animationDelay: '0.6s' }}>✦</span>
                  <div className="fbp-card">
                    <div className="fbp-lantern">🏮</div>
                    <span className="fbp-corner" style={{ top: '6px', left: '8px' }}>✦</span>
                    <span className="fbp-corner" style={{ top: '6px', right: '8px' }}>✦</span>
                    <span className="fbp-corner" style={{ bottom: '6px', left: '8px' }}>✦</span>
                    <span className="fbp-corner" style={{ bottom: '6px', right: '8px' }}>✦</span>
                    <div className="fbp-divider" />
                    <p className="fbp-text" style={page.blur ? { filter: 'blur(4px)', userSelect: 'none' } : undefined}>{page.content}</p>
                  </div>
                  {page.blur && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl drop-shadow">🔒</span>
                    </div>
                  )}
                  <span className="fbp-num">{i}</span>
                </div>
              )}
            </div>
          ))}
        </HTMLFlipBook>
      </div>
    </div>
  );
}
