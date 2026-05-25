/**
 * Scene definitions for each story template.
 *
 * Each story has exactly 13 scenes (one per illustration page).
 * The prompts describe the BACKGROUND and CONTEXT — the child character
 * should be partially visible / back-facing so the face-swap has a target.
 *
 * [NAME] is replaced at runtime with the child's actual name.
 */

export interface SceneDefinition {
  pageIndex: number;    // 0-based (0 = first image page in the story)
  scenePrompt: string;  // Prompt for fal.ai flux/schnell base scene generation
  textPageRef: string;  // Summary of the matching text page (for reference)
}

export interface StoryScenes {
  templateId: string;
  titleAr: string;
  scenes: SceneDefinition[];
}

export const STORY_SCENES: StoryScenes[] = [

  /* ─── Story 01: حديقة الحيوانات ──────────────────────────────────────────── */
  {
    templateId: 'zoo_adventure',
    titleAr: 'مغامرة [NAME] في حديقة الحيوانات',
    scenes: [
      { pageIndex: 0, textPageRef: 'الاستيقاظ مبكراً يوم الرحلة',
        scenePrompt: 'A child seen from behind, looking out a bright window at sunrise, bedroom with colorful curtains, warm morning light, children\'s book cartoon style' },
      { pageIndex: 1, textPageRef: 'الوصول إلى بوابة الحديقة',
        scenePrompt: 'A large colorful zoo entrance gate with animals painted on it, a small child standing in front looking up in wonder, sunny day, Arabic cultural style architecture' },
      { pageIndex: 2, textPageRef: 'الزرافة الطويلة',
        scenePrompt: 'A tall giraffe eating leaves from a tall tree, a small child standing nearby looking up amazed, colorful zoo background, cartoon illustration style' },
      { pageIndex: 3, textPageRef: 'حوض الأسماك الملونة',
        scenePrompt: 'A large fish tank with colorful tropical fish swimming, a child pressing their face against the glass with excitement, bright aquarium lighting' },
      { pageIndex: 4, textPageRef: 'إطعام الببغاء',
        scenePrompt: 'A bright green parrot on a wooden perch, a child\'s small hand holding seeds toward the bird, tropical plants in the background, warm light' },
      { pageIndex: 5, textPageRef: 'الأسد في الشمس',
        scenePrompt: 'A majestic lion lying on a warm rock in sunlight, a child behind a fence watching in awe, golden savanna background, children\'s book style' },
      { pageIndex: 6, textPageRef: 'القرود تتأرجح',
        scenePrompt: 'Playful monkeys swinging on colorful ropes and branches, a child laughing while watching, jungle enclosure with trees and ropes' },
      { pageIndex: 7, textPageRef: 'طيور الفلامنجو',
        scenePrompt: 'A group of pink flamingos standing on one leg in a shallow pond, a child sitting on a bench watching them, peaceful zoo garden setting' },
      { pageIndex: 8, textPageRef: 'رسم الفيل',
        scenePrompt: 'A large friendly elephant with big ears, a child sitting on a bench nearby sketching in a notebook, afternoon golden light in zoo' },
      { pageIndex: 9, textPageRef: 'الغروب مع الأهل',
        scenePrompt: 'A family walking hand-in-hand at zoo during sunset, warm orange sky, zoo pathways with trees and animal enclosures in background' },
      { pageIndex: 10, textPageRef: 'الوعد بحماية الطبيعة',
        scenePrompt: 'A child raising their hand as if making a promise, colorful nature and animals behind them, determined and happy expression, warm lighting' },
      { pageIndex: 11, textPageRef: 'حكاية في السيارة',
        scenePrompt: 'View from back seat of a car, child animatedly telling a story to parents in front, window showing passing trees and street lights at dusk' },
      { pageIndex: 12, textPageRef: 'الحلم بالمغامرات',
        scenePrompt: 'A child peacefully sleeping in a cozy bed, dream bubble above showing colorful animals dancing, stars visible through bedroom window, nighttime' },
    ],
  },

  /* ─── Story 02: الفضاء والنجوم ───────────────────────────────────────────── */
  {
    templateId: 'space_adventure',
    titleAr: 'رحلة [NAME] إلى النجوم',
    scenes: [
      { pageIndex: 0, textPageRef: 'النظر إلى السماء ليلاً',
        scenePrompt: 'A child lying on grass at night looking up at a breathtaking starry sky, milky way visible, garden setting, magical nighttime atmosphere' },
      { pageIndex: 1, textPageRef: 'اكتشاف مركبة الفضاء',
        scenePrompt: 'A shiny colorful rocket ship in a garden backyard glowing with magical light, a child approaching it with wide eyes, nighttime with stars' },
      { pageIndex: 2, textPageRef: 'الانطلاق إلى الفضاء',
        scenePrompt: 'A colorful rocket launching into space with fire and sparkles, earth visible below getting smaller, starry space background' },
      { pageIndex: 3, textPageRef: 'المرور بجانب القمر',
        scenePrompt: 'A rocket flying past a large glowing moon, craters visible, stars all around, earth in the distant background, beautiful space scene' },
      { pageIndex: 4, textPageRef: 'لقاء الكواكب',
        scenePrompt: 'Colorful planets in a row — Saturn with rings, Jupiter with stripes, a small rocket passing between them, magical space illustration' },
      { pageIndex: 5, textPageRef: 'الهبوط على كوكب أخضر',
        scenePrompt: 'A rocket landing on a small green alien planet with strange glowing plants and purple sky with two moons, magical and friendly atmosphere' },
      { pageIndex: 6, textPageRef: 'مقابلة كائنات فضائية صديقة',
        scenePrompt: 'Small friendly colorful alien creatures on a planet surface, waving hello, cute and harmless, colorful alien landscape, stars in background' },
      { pageIndex: 7, textPageRef: 'استكشاف الكوكب',
        scenePrompt: 'A child in a cute space suit exploring an alien planet surface, colorful rocks and glowing crystals, friendly alien plants, wonder and excitement' },
      { pageIndex: 8, textPageRef: 'تبادل الهدايا مع الكائنات',
        scenePrompt: 'A child in space suit holding a gift, small friendly aliens holding their own gifts, exchanging presents on alien planet surface, warm glowing light' },
      { pageIndex: 9, textPageRef: 'رؤية الأرض من بعيد',
        scenePrompt: 'View of beautiful blue Earth from space, a child in space suit floating near the rocket looking at Earth in awe, stars and space background' },
      { pageIndex: 10, textPageRef: 'العودة إلى البيت',
        scenePrompt: 'A rocket re-entering Earth atmosphere with golden glow, continent outlines visible below, beautiful sunrise colors in space' },
      { pageIndex: 11, textPageRef: 'الهبوط في الحديقة',
        scenePrompt: 'A rocket gently landing in a garden backyard with soft smoke, golden morning light, house and trees visible, neighborhood street' },
      { pageIndex: 12, textPageRef: 'الحلم بالنجوم',
        scenePrompt: 'A child in pajamas sleeping with arms around a toy rocket, window shows starry sky with a shooting star, cozy bedroom, nighttime' },
    ],
  },

  /* ─── Story 03: البطل في المدرسة ─────────────────────────────────────────── */
  {
    templateId: 'school_hero',
    titleAr: 'بطولة [NAME] في المدرسة',
    scenes: [
      { pageIndex: 0, textPageRef: 'الاستعداد للمدرسة',
        scenePrompt: 'A bright colorful classroom with Arabic writing on chalkboard, empty desks with school supplies, morning sunlight through windows, welcoming atmosphere' },
      { pageIndex: 1, textPageRef: 'الوصول إلى المدرسة',
        scenePrompt: 'Colorful school building entrance with children arriving, trees and flowers around, Arabic school gate, sunny morning, welcoming atmosphere' },
      { pageIndex: 2, textPageRef: 'أول يوم في الفصل',
        scenePrompt: 'Inside a colorful classroom, teacher at whiteboard, desks with supplies, Arabic letters on wall, warm sunlight, friendly class environment' },
      { pageIndex: 3, textPageRef: 'تعلم القراءة',
        scenePrompt: 'A child sitting at a desk holding an open book, colorful Arabic letters on pages, classroom background, warm learning atmosphere' },
      { pageIndex: 4, textPageRef: 'اكتشاف موهبة الرسم',
        scenePrompt: 'Art supplies scattered on a table, colorful drawings pinned to wall, a child\'s painting being admired, art class room, warm creative atmosphere' },
      { pageIndex: 5, textPageRef: 'مساعدة صديق',
        scenePrompt: 'Two children sitting together at a desk, one helping the other with schoolwork, warm friendship, classroom setting, afternoon light' },
      { pageIndex: 6, textPageRef: 'وقت الاستراحة',
        scenePrompt: 'Colorful school playground with swings and slides, children playing, trees providing shade, sunny day, joyful school recess scene' },
      { pageIndex: 7, textPageRef: 'العرض التقديمي',
        scenePrompt: 'A small stage at the front of classroom, drawing on whiteboard, teacher and students in audience, spotlights, excited presenting atmosphere' },
      { pageIndex: 8, textPageRef: 'الفوز بالمسابقة',
        scenePrompt: 'A podium with first place ribbon/trophy, colorful classroom decorations, balloons, cheering classmates in background, celebration' },
      { pageIndex: 9, textPageRef: 'شهادة التقدير',
        scenePrompt: 'A colorful certificate with gold star being held up, proud moment, classroom with smiling teacher and students in background' },
      { pageIndex: 10, textPageRef: 'إخبار الأهل بالخبر',
        scenePrompt: 'A child running home through neighborhood street holding certificate, afternoon golden light, houses and trees, excited running pose' },
      { pageIndex: 11, textPageRef: 'احتفال عائلي',
        scenePrompt: 'A warm family dinner table with food, balloons, and smiles, cozy home setting, Arabic home decoration, warm evening light' },
      { pageIndex: 12, textPageRef: 'حلم المستقبل',
        scenePrompt: 'A child sleeping with a certificate on their nightstand, dream bubble showing them as a doctor/engineer/artist, stars visible through window' },
    ],
  },

  /* ─── Default fallback scenes (used when templateId not found) ─────────────── */
  {
    templateId: 'adventure',
    titleAr: 'مغامرة [NAME] السحرية',
    scenes: Array.from({ length: 13 }, (_, i) => ({
      pageIndex: i,
      textPageRef: `مشهد ${i + 1}`,
      scenePrompt: `Children's book illustration scene ${i + 1} of 13: a magical adventure in a colorful fantasy world, a child hero exploring with wonder, warm colors, friendly atmosphere, square format`,
    })),
  },
];

/** Lookup helper — falls back to 'adventure' template */
export function getScenesForTemplate(templateId: string): StoryScenes {
  return (
    STORY_SCENES.find((s) => s.templateId === templateId) ||
    STORY_SCENES.find((s) => s.templateId === 'adventure')!
  );
}
