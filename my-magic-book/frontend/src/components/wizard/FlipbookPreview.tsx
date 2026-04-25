import HTMLFlipBook from 'react-pageflip';

interface Props {
  text: string;
  language?: 'ar' | 'en' | 'he';
}

export default function FlipbookPreview({ text, language = 'ar' }: Props) {
  const isRTL = language === 'ar' || language === 'he';
  const words = text ? text.split(' ') : [];
  const previewWords = words.slice(0, Math.max(20, Math.floor(words.length * 0.3)));
  
  const pages = [
    { type: 'cover', content: 'كتابي السحري', blurry: false },
    { type: 'content', content: previewWords.join(' '), blurry: false },
    { type: 'content', content: 'باقي القصة العجيبة ستأخذك في رحلة مذهلة مع الأصدقاء الجدد والمغامرات الشيقة...', blurry: true },
    { type: 'content', content: 'حيث الألوان الساحرة والأسرار التي نكتشفها معاً في نهاية الطريق...', blurry: true },
  ];

  return (
    <div className="w-full flex justify-center py-6 overflow-hidden" dir="ltr">
      {/* @ts-ignore - react-pageflip types mismatch with React 18 */}
      <HTMLFlipBook
        width={280}
        height={380}
        size="stretch"
        minWidth={200}
        maxWidth={350}
        minHeight={300}
        maxHeight={450}
        maxShadowOpacity={0.5}
        showCover={true}
        mobileScrollSupport={true}
        className="flipbook-container drop-shadow-2xl"
      >
        {pages.map((page, i) => (
          <div key={i} className={`page-content border border-dark-900/10 shadow-sm ${page.type === 'cover' ? 'bg-gradient-to-br from-navy-800 to-magic-500 text-gold-500' : 'bg-neutral-50 text-dark-900'} p-6 rounded-r-md`}>
            {page.type === 'cover' && (
               <div className="absolute left-0 top-0 w-4 h-full bg-black/20" />
            )}
            <div className={`h-full font-arabic leading-relaxed flex flex-col justify-center ${page.blurry ? 'blur-md select-none opacity-60' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
              {page.type === 'cover' ? (
                 <div className="flex flex-col items-center justify-center h-full border-2 border-gold-500/30 rounded-lg p-4">
                    <span className="text-4xl mb-4">✨</span>
                    <h2 className="text-2xl font-black text-center leading-relaxed text-white">{page.content}</h2>
                 </div>
              ) : (
                <p className="text-lg text-center">{page.content}</p>
              )}
            </div>
            {page.type === 'content' && (
              <div className="absolute bottom-3 text-xs opacity-30 w-full text-center left-0 flex justify-center items-center gap-2">
                {page.blurry && <span className="text-[10px]">🔒</span>}
                {i}
              </div>
            )}
          </div>
        ))}
      </HTMLFlipBook>
    </div>
  );
}
