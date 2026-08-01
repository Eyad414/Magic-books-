import type { StoryDefinition } from './types';

// ─── Story 05: [NAME] والسر المخبأ في مدينة الألعاب ──────────────────────────
export const toyCityAdventure: StoryDefinition = {
  id: 'toy_city',
  order: 5,
  titleAr: '[NAME] والسر المخبأ في مدينة الألعاب',
  taglineAr: 'كل لعبة تخفي سرًا سحريًا بداخلها',
  moralAr: 'عندما تعتني{|ي} بألعابك وتحب{|ي}ها بصدق، فإنها تمنحك سحرًا لا ينتهي. اللطف والشجاعة يفتحان أبواباً لا تُرى!',
  questionsAr: [
    'كيف ساعد{|ت} [NAME] روبوت تيكي ليعمل مجدداً؟',
    'ماذا تعلّمنا عن الاعتناء بالألعاب من هذه القصة؟',
    'لو زرت{|ي} مدينة الألعاب السحرية، أي مغامرة تختار{|ين} أولاً ولماذا؟',
  ],
  conclusionAr: 'أحسنت{|ي} يا [NAME]! أنت الآن حارس{ة} ألعابك الأمين{ة} وصديق{ة} تيكي إلى الأبد! 🤖✨',
  dedicationAr:
    'إلى [NAME]، {الذي|التي} {يملأ|تملأ} حياتنا بالبهجة والدهشة كل يوم — هذه القصة لك وحدك، لأن قلبك يخفي مدينة سحرية بأكملها.',
  coverImage: '/illustrations/toy_city/cover.webp',
  thumbnail: '/illustrations/toy_city/thumb.webp',
  pages: [
    // ── Spread 1 ──
    {
      pageNumber: 1, type: 'text',
      text: 'بينما كان{|ت} [NAME] يرتب{|ترتب} غرفته، أضاءت سيارة السباق الصغيرة بنور ذهبي وفتحت باباً سحرياً سحبه{|ها} إلى "مدينة الألعاب"!',
    },
    {
      pageNumber: 2, type: 'image',
      imageSrc: '/illustrations/toy_city/p02.webp',
      imageAlt: '[NAME] يكتشف الباب السحري الذهبي في غرفته',
    },

    // ── Spread 2 ──
    {
      pageNumber: 3, type: 'text',
      text: 'سقط{|ت} [NAME] بلطف على شارع مصنوع من مسارات السباق السريعة، وكانت البيوت حوله{|ها} مبنية من مكعبات "الليغو" الملونة.',
    },
    {
      pageNumber: 4, type: 'image',
      imageSrc: '/illustrations/toy_city/p04.webp',
      imageAlt: '[NAME] يصل إلى مدينة الألعاب ذات الشوارع والبيوت الملونة',
    },

    // ── Spread 3 ──
    {
      pageNumber: 5, type: 'text',
      text: 'قابل{|ت} [NAME] روبوتاً صغيراً يدعى "تيكي" كان متوقفاً عن الحركة. قال تيكي بصوت ضعيف: "أحتاج إلى بطارية الابتسامات لأعمل من جديد!"',
    },
    {
      pageNumber: 6, type: 'image',
      imageSrc: '/illustrations/toy_city/p06.webp',
      imageAlt: '[NAME] يجلس بجانب روبوت تيكي المتوقف بلطف واهتمام',
    },

    // ── Spread 4 — Decision Page ──
    {
      pageNumber: 7, type: 'text',
      text: 'أشار تيكي إلى طريقين: "يا بطل! هل نركب قطار الدببة السريع أم نتسلق برج المكعبات العالي لنصل للقمة؟" اختر{|ي} طريقك بذكاء يا [NAME]!',
    },
    {
      pageNumber: 8, type: 'image',
      imageSrc: '/illustrations/toy_city/p08.webp',
      imageAlt: '[NAME] وتيكي أمام طريقين: القطار وبرج المكعبات',
    },

    // ── Spread 5 ──
    {
      pageNumber: 9, type: 'text',
      text: 'قرر{|ت} [NAME] تسلق برج المكعبات. عندما بدأ البرج يهتز، أسرعت الطائرات الورقية وأمسكت بيده{|يدها} ليصل{|لتصل} للقمة بكل شجاعة.',
    },
    {
      pageNumber: 10, type: 'image',
      imageSrc: '/illustrations/toy_city/p10.webp',
      imageAlt: '[NAME] يتسلق برج المكعبات بمساعدة الطائرات الورقية السحرية',
    },

    // ── Spread 6 ──
    {
      pageNumber: 11, type: 'text',
      text: 'وجد{|ت} [NAME] البطارية في أعلى البرج لكنها كانت مطفأة. تذكر{|ت} كلام تيكي، فابتسم{|ت} لها بصدق، وفجأة أضاءت البطارية بأنوار ملونة!',
    },
    {
      pageNumber: 12, type: 'image',
      imageSrc: '/illustrations/toy_city/p12.webp',
      imageAlt: 'بطارية الابتسامات تضيء بألوان قوس قزح بفضل ابتسامة [NAME]',
    },

    // ── Spread 7 ──
    {
      pageNumber: 13, type: 'text',
      text: 'ركض{|ت} [NAME] وأعطى{|أعطت} البطارية لتيكي، فقفز الروبوت فرحاً وبدأ يرقص ويشكر صديقه{|ها} الذكي{|الذكية}.',
    },
    {
      pageNumber: 14, type: 'image',
      imageSrc: '/illustrations/toy_city/p14.webp',
      imageAlt: 'تيكي يقفز فرحاً ويرقص بعد أن أعطاه [NAME] البطارية السحرية',
    },

    // ── Spread 8 — Seek & Find Page ──
    {
      pageNumber: 15, type: 'text',
      text: 'أخذه{|ها} تيكي في جولة داخل مصنع الألعاب العجيب حيث تتحول الأفكار إلى ألعاب حقيقية. يا بطل! هل يمكنك العثور على المفتاح الفضي الصغير المخفي بين الآلات؟',
    },
    {
      pageNumber: 16, type: 'image',
      imageSrc: '/illustrations/toy_city/p16.webp',
      imageAlt: '[NAME] وتيكي يستكشفان مصنع الألعاب السحري — هل تجد المفتاح الفضي؟',
    },

    // ── Spread 9 ──
    {
      pageNumber: 17, type: 'text',
      text: 'وجد{|ت} [NAME] عروسة قماشية مكسورة وحزينة، فاستخدم{|ت} ذكاءه{|ها} الهندسي ومهارته{|ها} وقام{|قامت} بإصلاحها بهدوء ولطف.',
    },
    {
      pageNumber: 18, type: 'image',
      imageSrc: '/illustrations/toy_city/p18.webp',
      imageAlt: '[NAME] يصلح العروسة القماشية الحزينة بلطف ومهارة',
    },

    // ── Spread 10 ──
    {
      pageNumber: 19, type: 'text',
      text: 'ابتسمت العروسة وقدمت لـ [NAME] "مفتاح الألعاب الذهبي" الذي يمنحه{|ها} القدرة على العناية بألعابه{|ها} دائماً.',
    },
    {
      pageNumber: 20, type: 'image',
      imageSrc: '/illustrations/toy_city/p20.webp',
      imageAlt: 'العروسة تقدم مفتاح الألعاب الذهبي السحري لـ [NAME]',
    },

    // ── Spread 11 ──
    {
      pageNumber: 21, type: 'text',
      text: 'احتفالاً بـ [NAME]، نظمت المدينة سباقاً خرافياً، وكان بطلنا هو السائق{|ة} الأول{|ى} لسيارة طائرة في السماء!',
    },
    {
      pageNumber: 22, type: 'image',
      imageSrc: '/illustrations/toy_city/p22.webp',
      imageAlt: '[NAME] يقود سيارة طائرة فوق مدينة الألعاب احتفالاً بانتصاره',
    },

    // ── Spread 12 ──
    {
      pageNumber: 23, type: 'text',
      text: 'قال تيكي وهو يودعه{|ها}: "عندما تشتاق{|ين} إلينا يا [NAME]، فقط احتضن{|ي} ألعابك بقوة، وسنلتقي في الأحلام!"',
    },
    {
      pageNumber: 24, type: 'image',
      imageSrc: '/illustrations/toy_city/p24.webp',
      imageAlt: '[NAME] وتيكي يودعان بعضهما بدفء في مدينة الألعاب',
    },

    // ── Spread 13 ──
    {
      pageNumber: 25, type: 'text',
      text: 'فتح{|ت} [NAME] عينيه{|يها} ليجد{|لتجد} نفسه{|ها} في غرفته{|ها} يمسك{|تمسك} بـ "مفتاح الألعاب"، ومنذ ذلك اليوم أصبح{|ت} يعتني{|تعتني} بألعابه{|ها} جيداً لأن لكل لعبة روحاً وسحراً خاصاً.',
    },
    {
      pageNumber: 26, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
      imageAlt: '[NAME] يستيقظ في غرفته يمسك بمفتاح الألعاب الذهبي بابتسامة سعيدة',
    },
  ],
};
