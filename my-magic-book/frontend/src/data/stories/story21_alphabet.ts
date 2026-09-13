import type { StoryDefinition } from './types';

// Registered in index.ts so findStory('alphabet_abc') resolves — without it the
// viewer silently falls back to STORIES[0].
//
// Not a narrative like the other twenty: twenty-six English letters, two to a
// page across the same thirteen illustrated pages the rest of the books use.
// The Arabic line names the letter and glosses the word, because the buyer here
// is an Arabic-speaking parent teaching a child English.
//
// The LETTERS are typeset by the layout, never drawn by the illustrator — every
// scene prompt in sceneTemplates carries an explicit "no writing anywhere"
// clause. Gemini has form for inventing signage (an Arabic book once came back
// with a shop reading "SWEET DREAMS"), and here that would collide with the one
// thing the page exists to teach.

const AR_PAGES: string[] = [
  'A — تُفَّاحَة Apple · B — كُرَة Ball',
  'C — قِطَّة Cat · D — كَلْب Dog',
  'E — فِيل Elephant · F — سَمَكَة Fish',
  'G — زَرَافَة Giraffe · H — قُبَّعَة Hat',
  'I — بُوظَة Ice cream · J — بَرْطَمَان Jar',
  'K — طَائِرَة وَرَقِيَّة Kite · L — أَسَد Lion',
  'M — قَمَر Moon · N — عُشّ Nest',
  'O — بُرْتُقَالَة Orange · P — بَطْرِيق Penguin',
  'Q — لِحَاف Quilt · R — أَرْنَب Rabbit',
  'S — شَمْس Sun · T — شَجَرَة Tree',
  'U — مِظَلَّة Umbrella · V — كَمَان Violin',
  'W — حُوت Whale · X — إِكْسِيلُوفُون Xylophone',
  'Y — يُويُو Yo-yo · Z — حِمَار وَحْشِيّ Zebra',
];

export const alphabetAbc: StoryDefinition = {
  id: 'alphabet_abc',
  order: 21,
  titleAr: 'أَبْجَدِيَّةُ [NAME]',
  taglineAr: 'سِتَّةٌ وَعِشْرُونَ حَرْفاً، وَ[NAME] {بَطَلُهَا|بَطَلَتُهَا} فِي كُلِّ صَفْحَة',
  moralAr: 'كُلُّ حَرْفٍ بَابٌ صَغِيرٌ — وَمَنْ {فَتَحَهَا|فَتَحَتْهَا} كُلَّهَا {قَرَأَ|قَرَأَتْ} الدُّنْيَا.',
  questionsAr: [
    'أَيُّ حَرْفٍ يَبْدَأُ بِهِ اسْمُ{كَ|كِ}؟',
    'مَا هُوَ الشَّيْءُ الْمُفَضَّلُ {لَدَيْكَ|لَدَيْكِ} فِي الْكِتَاب؟',
    'هَلْ {تَسْتَطِيعُ|تَسْتَطِيعِينَ} أَنْ {تَجِدَ|تَجِدِي} شَيْئاً فِي الْبَيْتِ يَبْدَأُ بِحَرْفِ B؟',
    'أَيُّ حَيَوَانٍ فِي الْكِتَابِ {أَعْجَبَكَ|أَعْجَبَكِ} أَكْثَر؟',
  ],
  conclusionAr: 'أَحْسَنْ{تَ|تِ} يَا [NAME]! {عَرَفْتَ|عَرَفْتِ} الْحُرُوفَ مِنَ A إِلَى Z. 🔤✨',
  dedicationAr: 'إِلَى [NAME]، {الَّذِي|الَّتِي} {يَتَعَلَّمُ|تَتَعَلَّمُ} حَرْفاً جَدِيداً كُلَّ يَوْم — هَذَا الْكِتَابُ {لَكَ|لَكِ} {وَحْدَكَ|وَحْدَكِ}.',
  coverImage: '',
  thumbnail: '',
  pages: AR_PAGES.flatMap((text, i) => [
    { pageNumber: i * 2 + 1, type: 'text' as const, text },
    { pageNumber: i * 2 + 2, type: 'image' as const, imageSrc: '', imageAlt: text },
  ]),
};
