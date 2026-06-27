import type { StoryDefinition } from './types';

// ─── Story 01: مغامرة في حديقة الحيوانات ─────────────────────────────────────
export const zooAdventure: StoryDefinition = {
  id: 'zoo_adventure',
  order: 1,
  titleAr: 'مغامرة [NAME] في حديقة الحيوانات',
  taglineAr: 'رحلة لا تُنسى بين الحيوانات',
  moralAr: 'الطبيعة مليئة بالعجائب، وكل مخلوق يستحق المحبة والاحترام.',
  questionsAr: [
    'ما هو الحيوان الذي أعجبك أكثر في القصة؟',
    'ماذا تعلمنا عن الاهتمام بالحيوانات؟',
    'لو زرت حديقة الحيوانات، أي حيوان تود أن تراه أولاً ولماذا؟',
  ],
  conclusionAr: 'أحسنت يا [NAME]! أنت الآن صديق الحيوانات وحارسها الأمين. 🦁',
  dedicationAr:
    'إلى [NAME]، {الذي|التي} {يملأ|تملأ} حياتنا بالبهجة والدهشة كل يوم — هذه القصة لك وحدك.',
  coverImage: '/illustrations/zoo_adventure/cover.png',
  thumbnail: '/illustrations/zoo_adventure/thumb.png',
  pages: [
    // ── Page 01 — Text ──
    {
      pageNumber: 1, type: 'text',
      text: 'في صباح مشرق، استيقظ [NAME] مبكرًا وهو يقفز من الفرح، فاليوم يوم الرحلة إلى حديقة الحيوانات!',
    },
    // ── Page 02 — Image ──
    {
      pageNumber: 2, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p02.png',
      imageAlt: '[NAME] يستيقظ مبتسمًا في الصباح',
    },
    // ── Page 03 — Text ──
    {
      pageNumber: 3, type: 'text',
      text: 'وصل [NAME] إلى البوابة الكبيرة وسمع أصواتًا غريبة وجميلة من داخل الحديقة.',
    },
    // ── Page 04 — Image ──
    {
      pageNumber: 4, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p04.png',
      imageAlt: 'بوابة حديقة الحيوانات الكبيرة',
    },
    // ── Page 05 — Text ──
    {
      pageNumber: 5, type: 'text',
      text: 'رأى [NAME] الزرافة الطويلة ترفع رقبتها نحو السماء وتأكل أوراق الشجر بهدوء.',
    },
    // ── Page 06 — Image ──
    {
      pageNumber: 6, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p06.png',
      imageAlt: 'زرافة طويلة تأكل أوراق الشجر',
    },
    // ── Page 07 — Text ──
    {
      pageNumber: 7, type: 'text',
      text: 'اقترب [NAME] من حوض الأسماك الملونة فأضحك التقاء أعينهم الصغيرة بعينيه الفضوليتين.',
    },
    // ── Page 08 — Image ──
    {
      pageNumber: 8, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p08.png',
      imageAlt: 'أسماك ملونة في الحوض',
    },
    // ── Page 09 — Text ──
    {
      pageNumber: 9, type: 'text',
      text: 'أطعم [NAME] الببغاء الأخضر ببعض البذور، فقال الببغاء: "شكرًا يا صديقي!"',
    },
    // ── Page 10 — Image ──
    {
      pageNumber: 10, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p10.png',
      imageAlt: 'ببغاء أخضر يأكل من يد الطفل',
    },
    // ── Page 11 — Text ──
    {
      pageNumber: 11, type: 'text',
      text: 'شاهد [NAME] الأسد يستلقي في الشمس بكل كبرياء، وبدا وكأنه ملك عظيم.',
    },
    // ── Page 12 — Image ──
    {
      pageNumber: 12, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p12.png',
      imageAlt: 'أسد يستلقي في الشمس',
    },
    // ── Page 13 — Text ──
    {
      pageNumber: 13, type: 'text',
      text: 'ضحك [NAME] حين رأى القرود تلعب وتتأرجح على الأشجار بخفة ورشاقة.',
    },
    // ── Page 14 — Image ──
    {
      pageNumber: 14, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p14.png',
      imageAlt: 'قرود تتأرجح على الأشجار',
    },
    // ── Page 15 — Text ──
    {
      pageNumber: 15, type: 'text',
      text: 'جلس [NAME] أمام بركة الفلامنجو الوردي وتساءل كيف تستطيع هذه الطيور الوقوف على ساق واحدة.',
    },
    // ── Page 16 — Image ──
    {
      pageNumber: 16, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p16.png',
      imageAlt: 'طيور فلامنجو وردية في البركة',
    },
    // ── Page 17 — Text ──
    {
      pageNumber: 17, type: 'text',
      text: 'رسم [NAME] صورة الفيل الكبير في كراسته وقرر أن يقرأ عنه أكثر حين يعود للبيت.',
    },
    // ── Page 18 — Image ──
    {
      pageNumber: 18, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p18.png',
      imageAlt: 'الطفل يرسم الفيل في كراسته',
    },
    // ── Page 19 — Text ──
    {
      pageNumber: 19, type: 'text',
      text: 'عند الغروب، أمسك [NAME] بيد والديه وشعر بالامتنان لكل هذه الذكريات الجميلة.',
    },
    // ── Page 20 — Image ──
    {
      pageNumber: 20, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p20.png',
      imageAlt: 'عائلة سعيدة عند الغروب في الحديقة',
    },
    // ── Page 21 — Text ──
    {
      pageNumber: 21, type: 'text',
      text: 'وعد [NAME] نفسه بأن يحافظ على البيئة ويحب الحيوانات ويرعاها دائمًا.',
    },
    // ── Page 22 — Image ──
    {
      pageNumber: 22, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p22.png',
      imageAlt: 'الطفل يعقد وعدًا بالمحافظة على البيئة',
    },
    // ── Page 23 — Text ──
    {
      pageNumber: 23, type: 'text',
      text: 'في الطريق إلى البيت، أخبر [NAME] والديه عن كل ما رآه بحماس لا يتوقف.',
    },
    // ── Page 24 — Image ──
    {
      pageNumber: 24, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p24.png',
      imageAlt: 'الطفل يحكي لوالديه في السيارة',
    },
    // ── Page 25 — Text ──
    {
      pageNumber: 25, type: 'text',
      text: 'نام [NAME] وفي ذهنه صور الحيوانات، يحلم بمغامرات جديدة في الغابات والمحيطات البعيدة.',
    },
    // ── Page 26 — Image ──
    {
      pageNumber: 26, type: 'image',
      imageSrc: '/illustrations/zoo_adventure/p26.png',
      imageAlt: '[NAME] ينام حالمًا بالحيوانات',
    },
  ],
};
