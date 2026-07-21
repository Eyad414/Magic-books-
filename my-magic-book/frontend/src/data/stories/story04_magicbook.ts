import type { StoryDefinition } from './types';

// ─── The Magic Book Journey (رحلة الكتاب المسحور) ────────────────────────────
// A permanent showcase theme. The displayed body text comes from the admin
// theme.pages (customPages) + the stories.magic_book.* locale keys; this
// definition exists so findStory('magic_book') resolves correctly — otherwise
// the viewer falls back to STORIES[0] (zoo) and shows the WRONG cover title.

// 13 Arabic story pages ([NAME] placeholder). Kept in sync with the locale
// files (stories.magic_book.pages) and the scene template order.
const AR_PAGES: string[] = [
  'في غرفةٍ صغيرةٍ مليئةٍ بالألعاب، كان [NAME] يجلس وحيداً يقلّب صفحات كتابٍ قديمٍ وجده في الخزانة. وفجأةً بدأت الصفحات تلمع بضوءٍ ذهبيٍّ غريب!',
  '"يا إلهي!" صرخ [NAME]. سحب الضوءُ يده ببطء، وفي لمح البصر وجد نفسه يطير داخل دوّامةٍ من الألوان والكلمات الطائرة.',
  'سقط [NAME] بلطفٍ على أرضٍ مصنوعةٍ من الورق. كانت الأشجار هناك أقلام تلوينٍ ضخمة، والسماء مرسومةً بألوانٍ مائيةٍ زاهية.',
  'ظهر أرنبٌ صغيرٌ يرتدي نظارةً ويحمل ريشة رسم، وقال: "أهلاً بك يا [NAME] في عالم القصص! نحن بانتظارك منذ زمن."',
  'أخبر الأرنبُ [NAME] أنّ "لون السعادة" قد اختفى من الكتاب، وأنّ العالم يتحوّل إلى الأبيض والأسود، ولا يعيده إلا شجاعة طفلٍ حقيقي.',
  'بدأ [NAME] رحلته ووصل إلى "نهر الحبر الأزرق"، لكنّ الجسر كان مكسوراً. ففكّر بذكاء، وأمسك قلم رصاصٍ عملاقاً ورسم جسراً قوياً عبر به بسلام.',
  'في الغابة المظلمة، التقى [NAME] بومةً حكيمة سألته: "ما أقوى شيءٍ في العالم؟" فأجاب: "الخيال!". ابتسمت البومة وأعطته مفتاحاً مضيئاً.',
  'وصل [NAME] إلى جبل الحكايات. كان الطريق وعراً، لكنه تذكّر كلمات والدته عن الصبر، فواصل التسلّق حتى بلغ القمة.',
  'في القمة وجد [NAME] صندوقاً قديماً مغلقاً. استخدم المفتاح المضيء، وحين فتحه انطلقت آلاف الفراشات الملوّنة تلوّن كلّ ما تلمسه.',
  'بدأت الأشجار تكتسي بالأخضر، والأزهار بالأحمر، وعاد "لون السعادة" إلى العالم بفضل شجاعة [NAME].',
  'اجتمعت كلّ شخصيات الكتاب للاحتفال، ورقص الأرنب والبومة مع [NAME]، وشكروه لأنه أنقذ عالمهم من الاختفاء.',
  'قال الأرنب: "حان وقت العودة يا بطل، لكن تذكّر أنّ هذا الكتاب بيتك الثاني، وخيالك هو مفتاح الدخول." ولوّح [NAME] مودّعاً بينما ظهرت الدوّامة الذهبية لتأخذه.',
  'فتح [NAME] عينيه ليجد نفسه في غرفته والكتاب في حضنه. لم يعد يلمع، لكنّ قلبه امتلأ بالحماس. ابتسم وأغلقه، وهو يعلم أنّ مغامرته القادمة تسكن دائماً بين صفحات كتابه السحري.',
];

export const magicBookJourney: StoryDefinition = {
  id: 'magic_book',
  order: 4,
  titleAr: 'رحلة الكتاب السحري',
  taglineAr: 'مغامرة سحرية داخل عالم الكتب',
  moralAr: 'الخيال هو أقوى قوة في العالم، والشجاعة تعيد الألوان والسعادة إلى كل مكان.',
  questionsAr: [
    'ما هو أقوى شيءٍ ساعد [NAME] في رحلته؟',
    'ماذا تعلّمنا عن الشجاعة والصبر من قصة [NAME]؟',
    'لو كنت مكان [NAME]، ماذا كنت سترسم بالقلم السحري؟',
  ],
  conclusionAr: 'أنت بطلٌ حقيقي يا [NAME]، وخيالك هو مفتاح كل مغامرة! ✨',
  dedicationAr: 'إلى [NAME]، الطفل الذي يحمل عالماً كاملاً من الخيال بين يديه.',
  coverImage: '',
  thumbnail: '',
  // 26 body pages (13 text + 13 image, alternating). Only used as a fallback —
  // the live theme supplies its own customPages + generated illustrations.
  pages: AR_PAGES.flatMap((text, i) => [
    { pageNumber: i * 2 + 1, type: 'text' as const, text },
    { pageNumber: i * 2 + 2, type: 'image' as const, imageSrc: '', imageAlt: text },
  ]),
};
