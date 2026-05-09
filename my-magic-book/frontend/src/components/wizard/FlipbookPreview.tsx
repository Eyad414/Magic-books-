import HTMLFlipBook from 'react-pageflip';
import { useTranslation } from 'react-i18next';

interface Props {
  text: string;
  language?: 'ar' | 'en' | 'he';
}

interface PageData {
  pageNumber: number;
  type: 'text' | 'image' | 'cover';
  content: string;
  themeColor: string;
}

const storyData: PageData[] = [
  { pageNumber: 1, type: 'cover', content: 'إياد وعالم المرآة السحري', themeColor: '#1B1F5E' },
  { pageNumber: 2, type: 'image', content: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80', themeColor: '#E0F2FE' },
  { pageNumber: 3, type: 'text', content: 'فِي يَوْمٍ هَادِئٍ، وَجَدَ إِيَادٌ مِرْآةً قَدِيمَةً فِي العِلِّيَّةِ. كَانَتْ تَلْمَعُ بِأَلْوَانٍ غَرِيبَةٍ وَتَدْعُوهُ لِلاقْتِرَابِ مِنْهَا بِفُضُولٍ كَبِيرٍ.', themeColor: '#FDFCF0' },
  { pageNumber: 4, type: 'image', content: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80', themeColor: '#FEF3C7' },
  { pageNumber: 5, type: 'text', content: 'لَمَسَ إِيَادٌ زُجَاجَ المِرْآةِ، وَفَجْأَةً شَعَرَ بِجَسَدِهِ يَنْزَلِقُ لِلدَّاخِلِ! وَجَدَ نَفْسَهُ فِي عَالَمٍ مَقْلُوبٍ، حَيْثُ تَمْشِي الأَشْجَارُ وَتَطِيرُ الأَسْمَاكُ.', themeColor: '#F0F9FF' },
  { pageNumber: 6, type: 'image', content: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800&q=80', themeColor: '#ECFDF5' },
  { pageNumber: 7, type: 'text', content: 'قَابَلَ إِيَادٌ أَرْنَبًا يَرْتَدِي سَاعَةً كَبِيرَةً. قَالَ الأَرْنَبُ: "أَهْلًا بِكَ يَا إِيَادُ! هُنَا كُلُّ شَيْءٍ يَعْمَلُ بِالعَكْسِ، فَانْتَبِهْ لِخُطُوَاتِكَ السِّحْرِيَّةِ."', themeColor: '#FFF7ED' },
  { pageNumber: 8, type: 'image', content: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=800&q=80', themeColor: '#FFF1F2' },
  { pageNumber: 9, type: 'text', content: 'وَصَلَ إِيَادٌ إِلَى نَهْرٍ مِنَ الحَلِيبِ. كَانَتِ القِطَطُ تَصْطَادُ البَسْكُوتَ مِنَ المَاءِ وَتَغْنِي أَلْحَانًا جَمِيلَةً تُشْعِرُ القَلْبَ بِالسَّعَادَةِ وَالمَرَحِ.', themeColor: '#F8FAFC' },
  { pageNumber: 10, type: 'image', content: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80', themeColor: '#F1F5F9' },
  { pageNumber: 11, type: 'text', content: 'فِي الغَابَةِ، رَأَى إِيَادٌ فِيلًا صَغِيرًا يُحَاوِلُ الطَّيَرَانَ بِأُذُنَيْهِ. سَاعَدَهُ إِيَادٌ وَقَالَ لَهُ: "آمِنْ بِنَفْسِكَ، فَكُلُّ شَيْءٍ مُمْكِنٌ هُنَا."', themeColor: '#F5F3FF' },
  { pageNumber: 12, type: 'image', content: 'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800&q=80', themeColor: '#F3E8FF' },
  { pageNumber: 13, type: 'text', content: 'تَسَلَّقَ إِيَادٌ جَبَلًا مِنَ الشُّوكُولاتَةِ. عِنْدَ القِمَّةِ، وَجَدَ مِفْتَاحًا ذَهَبِيًّا مُعَلَّقًا بِخَيْطٍ مِنَ الحَرِيرِ اللَّامِعِ وَسَطَ السَّحَابِ الوَرْدِيِّ.', themeColor: '#FFFBEB' },
  { pageNumber: 14, type: 'image', content: 'https://images.unsplash.com/photo-1548509925-089304365b21?w=800&q=80', themeColor: '#FEF3C7' },
  { pageNumber: 15, type: 'text', content: 'ظَهَرَ قِرْدٌ حَزِينٌ يَحْمِلُ مِذْيَاعًا مَكْسُورًا. قَالَ القِرْدُ: "لا أَسْتَطِيعُ سَمَاعَ الميوزيك، هَلْ تُسَاعِدُنِي يَا صَدِيقِي الصَّغِيرَ إِيَادُ؟"', themeColor: '#F0FDFA' },
  { pageNumber: 16, type: 'image', content: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=800&q=80', themeColor: '#CCFBF1' },
  { pageNumber: 17, type: 'text', content: 'أَخَذَ إِيَادٌ المِذْيَاعَ وَأَصْلَحَهُ بِبَرَاعَةٍ. فَجْأَةً، انْطَلَقَتْ أَلْحَانٌ مَرِحَةٌ مَلأَتِ المَكَانَ، وَرَقَصَ القِرْدُ فَرَحًا وَشَكَرَ إِيَادَ كَثِيرًا.', themeColor: '#FEF2F2' },
  { pageNumber: 18, type: 'image', content: 'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=800&q=80', themeColor: '#FEE2E2' },
  { pageNumber: 19, type: 'text', content: 'أَهْدَى القِرْدُ إِيَادَ بَوْصَلَةً سِحْرِيَّةً. قَالَتِ البَوْصَلَةُ: "الطَّرِيقُ إِلَى المَنْزِلِ يَمُرُّ عَبْرَ قَصْرِ الكْرِيسْتَالِ حَيْثُ تَنَامُ المَلِكَةُ الطَّيِّبَةُ."', themeColor: '#F0F9FF' },
  { pageNumber: 20, type: 'image', content: 'https://images.unsplash.com/photo-1520038410233-7141be7e6f97?w=800&q=80', themeColor: '#E0F2FE' },
  { pageNumber: 21, type: 'text', content: 'مَشَى إِيَادٌ تَحْتَ مَطَرٍ مِنَ الحَلْوَى المُلَوَّنَةِ. كَانَ يَجْمَعُهَا فِي جَيْبِهِ وَيُوَزِّعُهَا عَلَى العَصَافِيرِ الَّتِي كَانَتْ تُغَرِّدُ بِاسْمِهِ.', themeColor: '#FDF4FF' },
  { pageNumber: 22, type: 'image', content: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=800&q=80', themeColor: '#FAE8FF' },
  { pageNumber: 23, type: 'text', content: 'وَصَلَ أَخِيرًا إِلَى قَصْرِ الكْرِيسْتَالِ. كَانَتِ الجُدْرَانُ تَعْكِسُ صُوَرَ أَحْلَامِهِ الجَمِيلَةِ، وَوَجَدَ المَلِكَةَ تَنْتَظِرُهُ بِابْتِسَامَةٍ حَنُونَةٍ وَرَائِعَةٍ.', themeColor: '#F5F3FF' },
  { pageNumber: 24, type: 'image', content: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?w=800&q=80', themeColor: '#EDE9FE' },
  { pageNumber: 25, type: 'text', content: 'قَالَتِ المَلِكَةُ: "لَقَدْ كُنْتَ طِفْلًا طَيِّبًا وَسَاعَدْتَ الجَمِيعَ. خُذْ هَذِهِ المِرْآةَ الصَّغِيرَةَ، فَهِيَ مِفْتَاحُ عَوْدَتِكَ إِلَى عَالَمِكَ الحَقِيقِيِّ."', themeColor: '#FFF7ED' },
  { pageNumber: 26, type: 'image', content: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=800&q=80', themeColor: '#FFEDD5' },
  { pageNumber: 27, type: 'text', content: 'شَكَرَ إِيَادٌ المَلِكَةَ وَنَظَرَ فِي المِرْآةِ. تَخَيَّلَ غُرْفَتَهُ وَسَرِيرَهُ وَأَلْعَابَهُ، وَفَجْأَةً بَدَأَ العَالَمُ السِّحْرِيُّ يَتَلَاشَى بِلُطْفٍ وَهُدُوءٍ.', themeColor: '#ECFDF5' },
  { pageNumber: 28, type: 'image', content: 'https://images.unsplash.com/photo-1521459467264-802e2ef3141f?w=800&q=80', themeColor: '#D1FAE5' },
  { pageNumber: 29, type: 'text', content: 'فَتَحَ إِيَادٌ عَيْنَيْهِ لِيَجِدَ نَفْسَهُ فِي العِلِّيَّةِ مَرَّةً أُخْرَى. كَانَتِ المِرْآةُ القَدِيمَةُ كَمَا هِيَ، لَكِنَّ قَلْبَهُ كَانَ مَلِيئًا بِالمَغَامَرَاتِ.', themeColor: '#F8FAFC' },
  { pageNumber: 30, type: 'image', content: 'https://images.unsplash.com/photo-1513584684374-8bdb74838a0f?w=800&q=80', themeColor: '#F1F5F9' },
  { pageNumber: 31, type: 'text', content: 'نَزَلَ إِيَادٌ لِيُخْبِرَ أُمَّهُ عَنْ رِحْلَتِهِ. اِبْتَسَمَتْ وَقَالَتْ: "الخَيَالُ يَا بُنَيَّ هُاوَ أَجْمَلُ جَنَاحٍ نَطِيرُ بِهِ بَعِيدًا عَنِ الأَرْضِ."', themeColor: '#FDFCF0' },
  { pageNumber: 32, type: 'image', content: 'https://images.unsplash.com/photo-1503431128947-61014bf19157?w=800&q=80', themeColor: '#1B1F5E' },
];

export default function FlipbookPreview({ text, language = 'ar' }: Props) {
  const { t } = useTranslation();
  const isRTL = language === 'ar' || language === 'he';
  const coverImageUrl = '/Users/eyad414/.gemini/antigravity/brain/64ff8c80-9c85-4e66-baf0-b3a20edda245/eyad_mirror_world_cover_1777159655080.png';

  // Use the provided text for the first text page if available
  const dynamicStoryData = [...storyData];
  if (text && dynamicStoryData[2]) {
    dynamicStoryData[2] = { ...dynamicStoryData[2], content: text };
  }

  // Old simple pages structure (not used, kept for reference)
  /*
  const oldPages = [
    { type: 'cover', content: t('nav.home_brand'), blurry: false },
    { type: 'content', content: '...', blurry: false },
    { type: 'content', content: '...', blurry: true },
    { type: 'content', content: '...', blurry: true },
  ];
  */

  return (
    <div className="w-full flex flex-col items-center justify-center py-6 overflow-hidden" dir="ltr">
      <div className="relative shadow-2xl" style={{ width: '100%', maxWidth: '700px' }}>
        {/* Removed middle spine shadow as requested */}

        {/* @ts-ignore */}
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
          flippingTime={1800} // speed of the flip
          className="flipbook-container"
        >
          {dynamicStoryData.map((page) => (
            <div 
              key={page.pageNumber} 
              className="relative overflow-hidden bg-white"
              style={{ backgroundColor: page.themeColor }}
            >
              {page.type === 'cover' ? (
                <div className="h-full w-full relative">
                  <img 
                    src={coverImageUrl} 
                    alt="Cover" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end pb-8 px-4">
                    <h2 className="font-arabic font-black text-gold-500 text-xl text-center leading-tight drop-shadow-md">
                      {page.content}
                    </h2>
                  </div>
                </div>
              ) : page.type === 'image' ? (
                <div className="h-full w-full">
                  <img 
                    src={page.content} 
                    alt={`Page ${page.pageNumber}`} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.05)] pointer-events-none" />
                </div>
              ) : (
                <div className="h-full w-full flex items-center justify-center p-4 relative">
                  {/* Star Shape (SVG-based) */}
                  <div className="relative z-10 w-full max-w-[90%] aspect-square flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full drop-shadow-lg" style={{ opacity: 0.9 }}>
                      <path d="M100,10 L120,75 L190,75 L135,115 L155,180 L100,145 L45,180 L65,115 L10,75 L80,75 Z" fill="#FFF8E1" stroke="#F5A623" strokeWidth="1.5" />
                    </svg>
                    <div className="relative z-20 px-6 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
                      <p className="font-arabic text-dark-900 text-xs sm:text-sm font-bold leading-relaxed">
                        {page.content}
                      </p>
                    </div>
                  </div>
                  {/* Page number */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-dark-900/20 font-bold text-[10px]">
                    {page.pageNumber}
                  </div>
                </div>
              )}
            </div>
          ))}
        </HTMLFlipBook>
      </div>
    </div>
  );
}

