import type { TemplatePage } from '../builder';

// ─── The Magic Book Journey (رحلة الكتاب المسحور) ────────────────────────────
// 13 text + 13 image pages ({{name}} placeholder). Registering this in
// STORY_TEMPLATES makes the theme selectable in "ready story" (template) mode —
// without it the wizard reports the theme as "under preparation". The actual
// illustrations are generated from the backend SCENE_TEMPLATES['magic_book']
// (photoreal scenes); these image prompts are a readable fallback.
export const magicBookStory: TemplatePage[] = [
  { type: 'text', content: 'في غرفةٍ صغيرةٍ مليئةٍ بالألعاب، كان {{name}} يجلس وحيداً يقلّب صفحات كتابٍ قديمٍ وجده في الخزانة. وفجأةً بدأت الصفحات تلمع بضوءٍ ذهبيٍّ غريب!' },
  { type: 'image', prompt: 'A child named {{name}} sitting on a cozy rug in a warm bedroom at night, holding a large old leather book whose pages glow with golden light, wonder on the face.' },
  { type: 'text', content: '"يا إلهي!" صرخ {{name}}. سحب الضوءُ يده ببطء، وفي لمح البصر وجد نفسه يطير داخل دوّامةٍ من الألوان والكلمات الطائرة.' },
  { type: 'image', prompt: 'A child named {{name}} joyfully floating inside a swirling magical vortex of golden light, colorful ribbons and glowing letters spiraling all around.' },
  { type: 'text', content: 'سقط {{name}} بلطفٍ على أرضٍ مصنوعةٍ من الورق. كانت الأشجار هناك أقلام تلوينٍ ضخمة، والسماء مرسومةً بألوانٍ مائيةٍ زاهية.' },
  { type: 'image', prompt: 'A child named {{name}} standing in awe in a surreal storybook world made of paper, with giant colorful crayons like trees, floating books and a bright watercolor sky.' },
  { type: 'text', content: 'ظهر أرنبٌ صغيرٌ يرتدي نظارةً ويحمل ريشة رسم، وقال: "أهلاً بك يا {{name}} في عالم القصص! نحن بانتظارك منذ زمن."' },
  { type: 'image', prompt: 'A child named {{name}} crouching and smiling at a small fluffy white rabbit wearing tiny round glasses on a mossy log in a sunlit magical glade.' },
  { type: 'text', content: 'أخبر الأرنبُ {{name}} أنّ "لون السعادة" قد اختفى من الكتاب، وأنّ العالم يتحوّل إلى الأبيض والأسود، ولا يعيده إلا شجاعة طفلٍ حقيقي.' },
  { type: 'image', prompt: 'A child named {{name}} in an enchanted garden that is half faded grey and half bursting with vivid glowing color, reaching toward the colorful side.' },
  { type: 'text', content: 'بدأ {{name}} رحلته ووصل إلى "نهر الحبر الأزرق"، لكنّ الجسر كان مكسوراً. ففكّر بذكاء، وأمسك قلم رصاصٍ عملاقاً ورسم جسراً قوياً عبر به بسلام.' },
  { type: 'image', prompt: 'A child named {{name}} kneeling by a glowing blue magical river, holding a giant pencil and drawing a bridge of light across the water.' },
  { type: 'text', content: 'في الغابة المظلمة، التقى {{name}} بومةً حكيمة سألته: "ما أقوى شيءٍ في العالم؟" فأجاب: "الخيال!". ابتسمت البومة وأعطته مفتاحاً مضيئاً.' },
  { type: 'image', prompt: 'A child named {{name}} in a misty enchanted forest at twilight, holding up a small glowing key toward a wise owl perched on a mossy branch.' },
  { type: 'text', content: 'وصل {{name}} إلى جبل الحكايات. كان الطريق وعراً، لكنه تذكّر كلمات والدته عن الصبر، فواصل التسلّق حتى بلغ القمة.' },
  { type: 'image', prompt: 'A child named {{name}} carefully climbing a huge towering mountain of old leather books, reaching toward a glowing feather quill at the very top.' },
  { type: 'text', content: 'في القمة وجد {{name}} صندوقاً قديماً مغلقاً. استخدم المفتاح المضيء، وحين فتحه انطلقت آلاف الفراشات الملوّنة تلوّن كلّ ما تلمسه.' },
  { type: 'image', prompt: 'A child named {{name}} on a rocky peak above the clouds at sunrise, opening an old treasure chest from which hundreds of glowing colorful butterflies stream up.' },
  { type: 'text', content: 'بدأت الأشجار تكتسي بالأخضر، والأزهار بالأحمر، وعاد "لون السعادة" إلى العالم بفضل شجاعة {{name}}.' },
  { type: 'image', prompt: 'A child named {{name}} at the center of a magical moment as vivid color and light sweep across the landscape, blooming flowers and glowing butterflies radiating out, arms lifted in joy.' },
  { type: 'text', content: 'اجتمعت كلّ شخصيات الكتاب للاحتفال، ورقص الأرنب والبومة مع {{name}}، وشكروه لأنه أنقذ عالمهم من الاختفاء.' },
  { type: 'image', prompt: 'A child named {{name}} laughing and dancing joyfully in a magical forest celebration with a white rabbit and a wise owl, glowing lanterns and confetti of light in the air.' },
  { type: 'text', content: 'قال الأرنب: "حان وقت العودة يا بطل، لكن تذكّر أنّ هذا الكتاب بيتك الثاني، وخيالك هو مفتاح الدخول." ولوّح {{name}} مودّعاً بينما ظهرت الدوّامة الذهبية لتأخذه.' },
  { type: 'image', prompt: 'A child named {{name}} on a grassy magical hill at dusk beside a glowing golden portal, waving goodbye, a white rabbit and owl beside, a faint glowing castle far away.' },
  { type: 'text', content: 'فتح {{name}} عينيه ليجد نفسه في غرفته والكتاب في حضنه. لم يعد يلمع، لكنّ قلبه امتلأ بالحماس. ابتسم وأغلقه، وهو يعلم أنّ مغامرته القادمة تسكن دائماً بين صفحات كتابه السحري.' },
  { type: 'image', prompt: 'A child named {{name}} back in the cozy bedroom at night, sitting on the rug holding the now-quiet old book with a happy content smile, soft moonlight.' },
];
