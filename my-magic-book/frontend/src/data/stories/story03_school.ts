import type { StoryDefinition } from './types';

// ─── Story 03: بطل المدرسة (School Hero) ─────────────────────────────────────
export const schoolAdventure: StoryDefinition = {
  id: 'school_hero',
  order: 3,
  titleAr: 'مغامرة [NAME]: بطل المدرسة',
  taglineAr: 'اللطف هو القوة الخارقة الحقيقية',
  moralAr: 'المدرسة ليست مجرد دروس، بل هي مكان للمغامرة والتعاون ومساعدة الآخرين باللطف والمحبة.',
  questionsAr: [
    'كيف أعاد [NAME] الألوان لمدرسته؟',
    'ماذا فعل [NAME] لإنقاذ القطة الصغيرة؟',
    'كيف يمكنك أنت أيضاً أن تكون بطلاً في مدرستك؟',
  ],
  conclusionAr: 'أنت بطل رائع يا [NAME]! تذكر دائماً أن اللطف يجعل العالم أكثر جمالاً وألواناً. 🏆✨',
  dedicationAr: 'إلى بطلنا الصغير [NAME]، الذي يثبت لنا كل يوم أن القوة الحقيقية تبدأ من مساعدة الآخرين ونشر الابتسامة.',
  coverImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop',
  thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=200&auto=format&fit=crop',
  pages: [
    // ── Spread 1 ──
    {
      pageNumber: 1, type: 'text',
      text: 'استيقظ [NAME] بنشاط كبير، وارتدى حقيبته المفضلة وانطلق نحو مدرسته الجميلة وهو يبتسم للكائنات من حوله.',
    },
    {
      pageNumber: 2, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop',
      imageAlt: '[NAME] يستيقظ سعيداً ويذهب للمدرسة',
    },
    
    // ── Spread 2 ──
    {
      pageNumber: 3, type: 'text',
      text: 'عندما وصل [NAME]، تفاجأ بأن الألوان قد اختفت تماماً من لوحات وجدران المدرسة! كانت تبدو حزينة باللونين الأبيض والأسود.',
    },
    {
      pageNumber: 4, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
      imageAlt: 'المدرسة بدون ألوان وتظهر باللون الأبيض والأسود',
    },

    // ── Spread 3 ──
    {
      pageNumber: 5, type: 'text',
      text: 'لم يستسلم [NAME]، بل قرر أن يكتشف السر ويستخدم "أقلامه السحرية" ولطفه ليعيد الحياة والبهجة لمدرسته.',
    },
    {
      pageNumber: 6, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800&auto=format&fit=crop',
      imageAlt: '[NAME] يقرر استخدام أقلام التلوين السحرية لإنقاذ المدرسة',
    },

    // ── Spread 4 ──
    {
      pageNumber: 7, type: 'text',
      text: 'في فصل العلوم، وجد صديقه سامي حزيناً لأن تجربة البركان لم تنجح، فساعده [NAME] بلمسة ذكية من خياله لتنفجر الألوان مجدداً.',
    },
    {
      pageNumber: 8, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop',
      imageAlt: 'تجربة بركان العلوم تنفجر بألوان قوس قزح السحرية',
    },

    // ── Spread 5 ──
    {
      pageNumber: 9, type: 'text',
      text: 'دخل [NAME] المكتبة، فسمع الكتب تهمس بحزن، وتطلب من أحد أن يرتبها لتعود الحكايات والقصص إلى مكانها الصحيح.',
    },
    {
      pageNumber: 10, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=800&auto=format&fit=crop',
      imageAlt: '[NAME] يسمع الكتب تهمس بحزن في المكتبة غير المرتبة',
    },

    // ── Spread 6 ──
    {
      pageNumber: 11, type: 'text',
      text: 'نادى [NAME] زملاءه، وبدأوا جميعاً في ترتيب الكتب بانتظام وهم يغنون أجمل الألحان، ليعود الدفء إلى زوايا المكتبة.',
    },
    {
      pageNumber: 12, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop',
      imageAlt: '[NAME] وأصدقاؤه يرتبون المكتبة ويغنون بسعادة',
    },

    // ── Spread 7 ──
    {
      pageNumber: 13, type: 'text',
      text: 'في ساحة اللعب، سمع [NAME] مواءً رقيقاً؛ لقد كانت هناك قطة صغيرة خائفة وعالقة فوق غصن شجرة المدرسة العالية.',
    },
    {
      pageNumber: 14, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=800&auto=format&fit=crop',
      imageAlt: 'قطة صغيرة خائفة وعالقة فوق غصن شجرة المدرسة العالية',
    },

    // ── Spread 8 ──
    {
      pageNumber: 15, type: 'text',
      text: 'بلا تردد، جمع [NAME] المكعبات الملونة الكبيرة وبنى منها سلماً آمناً، وتلقى القطة بلطف ليعيدها إلى الأرض بسلام.',
    },
    {
      pageNumber: 16, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?q=80&w=800&auto=format&fit=crop',
      imageAlt: '[NAME] يبني سلماً من المكعبات وينقذ القطة بلطف',
    },

    // ── Spread 9 ──
    {
      pageNumber: 17, type: 'text',
      text: 'في وقت الاستراحة، رأى [NAME] طفلاً جديداً يجلس بمفرده، فذهب إليه وتشارك معه طعامه، ليعرف أن اللطف هو القوة الخارقة الحقيقية.',
    },
    {
      pageNumber: 18, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=800&auto=format&fit=crop',
      imageAlt: '[NAME] يشارك طعامه مع زميل جديد وحيد في الاستراحة',
    },

    // ── Spread 10 ──
    {
      pageNumber: 19, type: 'text',
      text: 'في حصة الفن، وبإذن من المعلمة، بدأ [NAME] يرسم أحلام التلاميذ على الجدران، وفجأة.. بدأت الألوان الزاهية تعود للمدرسة كلها!',
    },
    {
      pageNumber: 20, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800&auto=format&fit=crop',
      imageAlt: 'الألوان الزاهية تعود وتملأ أرجاء وجدران المدرسة مجدداً',
    },

    // ── Spread 11 ──
    {
      pageNumber: 21, type: 'text',
      text: 'في نهاية اليوم الدراسي، صفق الجميع بحرارة لـ [NAME]، وقدم له مدير المدرسة وسام "البطل الصغير" تقديراً لشجاعته وجمال روحه.',
    },
    {
      pageNumber: 22, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop',
      imageAlt: 'المدير يكرم [NAME] بوسام البطل الصغير أمام الجميع',
    },

    // ── Spread 12 ──
    {
      pageNumber: 23, type: 'text',
      text: 'عاد [NAME] إلى البيت مسرعاً، وحكى لوالدته بفخر كيف أن المدرسة ليست مجرد دروس، بل هي مكان للمغامرة ومساعدة الآخرين.',
    },
    {
      pageNumber: 24, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop',
      imageAlt: '[NAME] يروي مغامراته السعيدة لوالدته في البيت بفخر',
    },

    // ── Spread 13 ──
    {
      pageNumber: 25, type: 'text',
      text: 'وضع [NAME] وسامه اللامع بجانب سريره، وأغلق عينيه وهو يتشوق ليوم دراسي جديد مليء بالمفاجآت السعيدة.',
    },
    {
      pageNumber: 26, type: 'image',
      imageSrc: 'https://images.unsplash.com/photo-1505678261036-a3fcc5e884ee?q=80&w=800&auto=format&fit=crop',
      imageAlt: '[NAME] ينام بسلام ووسامه يلمع بجانب سريره تحت ضوء النجوم',
    },
  ]
};
