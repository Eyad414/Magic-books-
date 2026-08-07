/**
 * Reusable per-story "scene templates".
 *
 * A scene template captures everything about a story's illustrations EXCEPT the
 * child: the 13 page scenes (in the same order as the displayed text), the
 * cover scene, the back-cover portrait setting, and the art style. The child's
 * face is supplied at generation time from the paying customer's uploaded photo.
 *
 * This is what makes "swap the kid, keep the story" work: a new customer's book
 * re-runs these same scenes with their photo as the face reference. Nothing here
 * generates anything — it only produces prompt strings. The paid generation
 * still happens exclusively in BookBuilder, after payment.
 */
import { COLOR_GRADE } from './promptBuilder';

export interface SceneTemplate {
  style: 'photoreal' | 'cartoon';
  // ── Full story book (optional — a story can be coloring-only) ──
  /** Book title (Arabic) with [NAME] + {masc|fem} tokens. */
  titleAr?: string;
  /** What surrounds the hero on the front cover (themed world). */
  coverScene?: string;
  /** Back-cover portrait setting. */
  portraitScene?: string;
  /** 13 page texts (Arabic) with [NAME] + {masc|fem} tokens — kept next to the
   *  scenes so text and illustration can never drift out of order again. */
  pageTexts?: string[];
  /** 13 page scenes, in the SAME order as `pageTexts`. */
  pageScenes?: string[];
  /** 1-based page numbers whose scene contains a medal/trophy (extra "no lettering" guard). */
  medalPages?: number[];
  // ── Coloring-book variant: a colorful creative cover + 16 line-art page scenes ──
  coloringCoverScene?: string;
  coloringScenes?: string[];
  /** Colorful creative BACK cover (placed after page 16). */
  coloringBackCoverScene?: string;
}

/** Standard coloring-book length (interior pages, cover excluded). */
export const COLORING_PAGES = 16;

// Curated girl names (Arabic + transliterations). Deliberately EXCLUDES common
// unisex names (نور، ملك) so we never mis-flip a boy. Used only to CORRECT a
// gender that was left at the wizard's "male" default for an obvious girl name.
const FEMALE_NAMES = new Set(
  [
    'سارة', 'ساره', 'ريم', 'ريما', 'رؤى', 'لين', 'جنى', 'ميرا', 'تالا', 'سيلين',
    'ميسم', 'رهف', 'جودي', 'ريناد', 'لمار', 'دانة', 'دانه', 'جوري', 'شهد',
    'رزان', 'لينا', 'مايا', 'ميار', 'تولين', 'سما', 'يارا', 'ياره', 'ليان', 'روان',
    'هيا', 'رتاج', 'بيسان', 'إلين', 'ايلين', 'سيدرا', 'كادي', 'غلا',
    'sara', 'sarah', 'reem', 'rem', 'rima', 'reema', 'lin', 'lyn', 'jana', 'mira',
    'tala', 'celine', 'maysam', 'rahaf', 'judy', 'renad', 'lamar', 'dana',
    'joury', 'shahd', 'razan', 'lina', 'maya', 'mayar', 'sama', 'yara', 'layan',
    'rawan', 'haya', 'sidra', 'kadi',
  ].map((n) => n.toLowerCase())
);

/**
 * The gender to actually use for a child. The wizard defaults `childGender` to
 * 'male', so a girl whose order was never toggled ends up stored as male; this
 * corrects it when the name is an unambiguous girl name. Explicit 'female' is
 * always honored. Everything else keeps the stored value.
 */
export function resolveGender(childName: string | undefined, childGender: 'male' | 'female'): 'male' | 'female' {
  if (childGender === 'female') return 'female';
  const n = (childName || '').trim().toLowerCase();
  if (!n) return childGender;
  if (FEMALE_NAMES.has(n) || FEMALE_NAMES.has(n.split(/\s+/)[0])) return 'female';
  return childGender;
}

/** Resolves [NAME] + {masculine|feminine} tokens for a specific child. */
export function resolveTokens(text: string, childName: string, childGender: 'male' | 'female'): string {
  const gender = resolveGender(childName, childGender);
  return (text || '')
    .replace(/\[NAME\]/gi, childName)
    .replace(/\{\{\s*name\s*\}\}/gi, childName)
    .replace(/\{([^|{}]*)\|([^|{}]*)\}/g, (_m, masc, fem) => (gender === 'female' ? fem : masc));
}

/** Themes that have a hand-tuned scene template. Keyed by theme id. */
export const SCENE_TEMPLATES: Record<string, SceneTemplate> = {
  // ── Zoo (مغامرة في حديقة الحيوانات) — scenes match the live locale text order.
  // ── Dinosaurs (مغامرة مع الديناصورات) — friendly prehistoric adventure with
  //    a decision page (4) and a seek-and-find page (8).
  dinosaur_adventure: {
    style: 'photoreal',
    titleAr: 'مُغَامَرَةُ [NAME] مَعَ الدِّينَاصُورَاتِ',
    pageTexts: [
      'بَيْنَمَا كَانَ{|تْ} [NAME] {يَلْعَبُ|تَلْعَبُ} فِي الْحَدِيقَةِ، عَثَرَ{|تْ} عَلَى حَجَرٍ يَلْمَعُ يُشْبِهُ بَيْضَةً ضَخْمَةً. وَبِمُجَرَّدِ أَنْ لَمَسَ{هُ|تْهُ}، اهْتَزَّتِ الْأَرْضُ وَاخْتَفَتِ الْحَدِيقَةُ!',
      'وَجَدَ{|تْ} [NAME] نَفْسَ{هُ|هَا} وَسْطَ غَابَةِ مَا قَبْلَ التَّارِيخِ، أَشْجَارُهَا أَطْوَلُ مِنْ نَاطِحَاتِ السَّحَابِ، وَسَمِعَ{|تْ} خُطُوَاتٍ ضَخْمَةً تَهُزُّ الْمَكَانَ.',
      'ظَهَرَ دِينَاصُورُ (تِي رِيكْس) ضَخْمٌ! لَكِنَّهُ لَمْ يَكُنْ مُخِيفاً، بَلْ كَانَ يَرْتَدِي وِشَاحاً أَخْضَرَ وَيَبْحَثُ عَنْ نَظَّارَتِهِ الْمَفْقُودَةِ بِحُزْنٍ.',
      'قَالَ تْرِيكْس: "أَنَا لَا أَرَى جَيِّداً بِدُونِ نَظَّارَتِي!" نَظَرَ{|تْ} [NAME] حَوْلَ{هُ|هَا} وَتَسَاءَلَ{|تْ}: "يَا بَطَل{|ةَ}! هَلْ نَرْكَبُ عَلَى ظَهْرِ تْرِيكْس لِنَبْحَثَ مِنَ الْأَرْضِ، أَمْ نَطْلُبُ مُسَاعَدَةَ الدِّينَاصُورِ الطَّائِرِ بْتِيرُودَاكْتِيل لِنَبْحَثَ مِنَ السَّمَاءِ؟"',
      'قَفَزَ{|تْ} [NAME] عَلَى ظَهْرِ تْرِيكْس بِكُلِّ شَجَاعَةٍ، وَبَدَأُوا يَمْشُونَ وَسْطَ الْغَابَةِ لِاسْتِكْشَافِ الْأَمَاكِنِ الْعَالِيَةِ بِفَضْلِ نَظَرِهِ الْقَوِيِّ.',
      'وَصَلُوا إِلَى بُحَيْرَةٍ زَرْقَاءَ، وَرَأَ{ى|تْ} [NAME] النَّظَّارَةَ عَالِقَةً فَوْقَ شَجَرَةِ مَوْزٍ عِمْلَاقَةٍ. اِسْتَخْدَمَ{|تْ} غُصْناً طَوِيلاً وَحَبْلاً مَتِيناً وَسَحَبَ{هَا|تْهَا} بِذَكَاءٍ.',
      'اِرْتَدَى الدِّينَاصُورُ نَظَّارَتَهُ وَصَرَخَ فَرَحاً: "شُكْراً يَا [NAME]! الْآنَ أَسْتَطِيعُ رُؤْيَةَ أَصْدِقَائِي الصِّغَارِ وَالْأَلْوَانَ مِنْ جَدِيدٍ!"',
      'أَخَذَ تْرِيكْس صَدِيقَ{هُ|تَهُ} إِلَى كَهْفٍ سِرِّيٍّ مَلِيءٍ بِالرُّسُومَاتِ الْقَدِيمَةِ وَالرُّمُوزِ الْعَجِيبَةِ. يَا بَطَل{|ةَ}! هَلْ {يُمْكِنُكَ|يُمْكِنُكِ} الْعُثُورُ عَلَى بَيْضَةِ الدِّينَاصُورِ الْمُنَقَّطَةِ الْمُخْتَبِئَةِ بَيْنَ الصُّخُورِ؟',
      'اِحْتِفَالاً بِذَكَاءِ [NAME]، قَطَفَتْ {لَهُ|لَهَا} الدِّينَاصُورَاتُ أَكْبَرَ حَبَّةِ فَرَاوِلَةٍ فِي الْعَالَمِ، كَانَتْ بِحَجْمِ الْبِطِّيخَةِ وَلَذِيذَةً جِدّاً!',
      'نَظَرَ{|تْ} [NAME] إِلَى الْجَبَلِ الْبَعِيدِ وَرَأَ{ى|تْ} بُرْكَاناً عَجِيباً يَخْرُجُ مِنْهُ فَقَاعَاتُ صَابُونٍ مُلَوَّنَةٌ بَدَلاً مِنَ الْحُمَمِ، فَضَحِكَ{|تْ} كَثِيراً عَلَى الْمَنْظَرِ.',
      'أَعْطَى تْرِيكْس [NAME] حَجَراً صَغِيراً مَنْقُوشاً عَلَيْهِ صُورَةُ قَلْبٍ، لِ{يَتَذَكَّرَ|تَتَذَكَّرَ} دَائِماً أَنَّ{هُ|هَا} بَطَل{ٌ|ةٌ} حَقِيقِي{ٌّ|َّةٌ} وَصَدِيق{ٌ|َةٌ} لِلدِّينَاصُورَاتِ.',
      'أَغْمَضَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} وَتَمَنَّ{ى|تْ} الْعَوْدَةَ إِلَى الْمَنْزِلِ، فَبَدَأَتْ أَشْجَارُ الْغَابَةِ تَتَلَاشَى بِبُطْءٍ وَصَوْتُ الدِّينَاصُورِ يُوَدِّعُ{هُ|هَا} بِلُطْفٍ.',
      'فَتَحَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} لِ{يَجِدَ|تَجِدَ} نَفْسَ{هُ|هَا} فِي حَدِيقَةِ الْمَنْزِلِ وَمَعَ{هُ|هَا} الْحَجَرُ الْمَنْقُوشُ، وَه{ُوَ|ِيَ} {يَعْلَمُ|تَعْلَمُ} أَنَّ الِاسْتِكْشَافَ وَالشَّجَاعَةَ {يَجْعَلَانِهِ|يَجْعَلَانِهَا} {يَخُوضُ|تَخُوضُ} أَجْمَلَ الْمُغَامَرَاتِ.',
    ],
    pageScenes: [
      'crouching in a sunny home garden, holding a large glowing stone shaped like a huge egg that shimmers with golden light, wide-eyed with wonder',
      'standing amazed in a lush prehistoric jungle, colossal trees far taller than skyscrapers, giant ferns and mist, warm shafts of light',
      'meeting an enormous friendly T-Rex wearing a green scarf, the dinosaur squinting sadly and searching the ground for something',
      'standing between a big friendly T-Rex on one side and a colorful flying pterodactyl on the other, hand on chin, thinking hard about which to choose',
      'riding bravely on the back of the friendly green-scarfed T-Rex, walking through the prehistoric forest, arms up with joy',
      'at the edge of a bright blue lake, using a long branch and a sturdy rope to reach a pair of glasses stuck high in a giant banana tree',
      'joyfully handing the glasses to the delighted T-Rex who now wears them and beams with a huge happy smile',
      'exploring a torch-lit secret cave, walls covered with ancient dinosaur cave paintings and curious symbols, a spotted dinosaur egg tucked among the rocks',
      'sitting with friendly dinosaurs at a fruit feast, holding a giant strawberry the size of a watermelon with both hands, laughing',
      'pointing at a distant volcano that puffs colorful soap bubbles instead of lava into the sky, laughing with delight',
      'receiving a small carved stone with a heart on it from the friendly T-Rex, warm golden sunset light, tender moment',
      'eyes closed making a wish, the prehistoric forest softly glowing and fading around, the T-Rex waving goodbye gently',
      'back in the sunny home garden holding the small carved heart stone, smiling proudly, dinosaur-shaped clouds in the sky',
    ],
    coverScene: 'standing proudly in a lush prehistoric jungle with friendly colorful dinosaurs behind, a big smiling T-Rex wearing a green scarf and round glasses leaning in, giant ferns and golden adventure light',
    portraitScene: 'in the prehistoric jungle holding the small carved heart stone, friendly dinosaur silhouettes softly blurred behind',
    medalPages: [11],
  },
  zoo_adventure: {
    style: 'photoreal',
    titleAr: 'مغامرة [NAME] في حديقة الحيوانات',
    pageTexts: [
      'في صباح مشرق، استيقظ{|ت} [NAME] مبكرًا وه{و|ي} {ي|ت}قفز من الفرح، فاليوم يوم الرحلة إلى حديقة الحيوانات!',
      'وصل{|ت} [NAME] إلى البوابة الكبيرة وسمع{|ت} أصواتًا غريبة وجميلة من داخل الحديقة.',
      'رأ{ى|ت} [NAME] الزرافة الطويلة ترفع رقبتها نحو السماء وتأكل أوراق الشجر بهدوء.',
      'وبالقرب من البحيرة، شاهد{|ت} [NAME] قرداً صغيراً ذكياً يقفز على الأشجار ويلوح بيده مبتسماً.',
      'وفجأة، سمع{|ت} [NAME] زئير الأسد القوي وهو يجلس بهيبة وفخر على صخرته العالية.',
      'وقف{|ت} [NAME] مندهش{اً|ةً} وه{و|ي} {ي|ت}راقب الببغاوات الملونة تحلق في السماء وتغرد بأجمل الألحان.',
      'وعند بركة الماء، رأ{ى|ت} [NAME] الفيل الضخم يرش الماء بخرطومه الطويل بسعادة ومرح.',
      'مرت سلحفاة قديمة وحكيمة من أمام [NAME] وهي تمشي ببطء وتحمل درعها القوي وتبتسم.',
      'ابتسم{|ت} [NAME] لطيور الفلامنجو الوردية الجميلة وهي تقف برقة على رجل واحدة في الماء الضحل.',
      'شاهد{|ت} [NAME] حيوان الكنغر يقفز بسرعة وهو يحمل طفله الصغير داخل كيسه الدافئ بأمان.',
      'وتحت ظلال الأشجار الكثيفة، رأ{ى|ت} [NAME] دب الباندا الكبير يتناول عيدان الخيزران الخضراء بهدوء.',
      'ومع غروب الشمس، قدّم حارس الحديقة لـ [NAME] وسام «صديق الحيوانات الشجاع» تقديراً للطف{ه|ها} وشجاعت{ه|ها}.',
      'عاد{|ت} [NAME] إلى البيت مسرور{اً|ةً} وه{و|ي} {ي|ت}حمل الوسام فخور{اً|ةً}، متشوق{اً|ةً} ل{ي|ت}حكي مغامرات{ه|ها} مع الحيوانات لعائلت{ه|ها}.',
    ],
    coverScene:
      'dressed as a cute little zoo explorer in a beige safari vest, holding a magnifying glass up near one eye with a big joyful smile. Around the child: a lush sunny zoo full of friendly animals — a gentle elephant, a colorful parrot on a branch, tall giraffes and a peeking little monkey among green leafy trees, warm golden sunlight filling the frame',
    portraitScene:
      'with a warm natural smile looking at the camera, wearing a beige safari explorer vest, soft green sunny zoo bokeh background',
    pageScenes: [
      'in cozy pajamas, waking up happily in bed in warm morning sunlight, jumping with excitement, a cute zoo-animal backpack on the floor nearby',
      'wearing a beige safari explorer vest, standing in front of a big beautiful zoo entrance gate, curious and excited, lush green trees behind',
      'wearing a safari vest, looking up in wonder at a tall friendly giraffe reaching for green leaves on a tree, sunny lush zoo',
      'wearing a safari vest, watching and laughing happily as a smart little monkey jumps on tree branches near a lake and waves its hand, lush green zoo',
      'wearing a safari vest, watching in awe from a safe distance behind railings as a majestic lion sits proudly and roars on a tall rock, warm sunlight',
      'wearing a safari vest, looking up amazed and pointing as colorful parrots fly across the bright sky and sing, leafy zoo',
      'wearing a safari vest, laughing with joy near a big friendly elephant happily spraying water from its long trunk by a pond',
      'wearing a safari vest, crouching down to look closely and smiling at an old wise tortoise walking slowly carrying its strong shell',
      'wearing a safari vest, smiling warmly at beautiful elegant pink flamingos standing gracefully on one leg in shallow water',
      'wearing a safari vest, watching with excitement a kangaroo hopping with its tiny baby joey peeking out of its warm pouch',
      'wearing a safari vest, watching quietly and happily a big cuddly panda calmly eating green bamboo under leafy tree shade',
      'wearing a safari vest, at golden sunset receiving a shiny medal from a kind friendly zoo keeper, both smiling, lush zoo background',
      'back home in a cozy warm living room, holding a shiny medal and smiling proudly, excited to share the adventure',
    ],
    medalPages: [12, 13],
    coloringCoverScene:
      'as a cheerful little zoo explorer in a safari vest and hat holding a magnifying glass, surrounded by lots of happy friendly zoo animals — a giraffe, a lion, an elephant, a monkey, a parrot and a zebra — among green trees and balloons, bright cheerful playful colors',
    coloringScenes: [
      'a happy little zoo explorer in a safari vest and hat, waving hello with a big smile at a fun zoo entrance gate',
      'looking up with wonder at a tall friendly giraffe bending down to say hello',
      'standing next to a big gentle elephant that is happily spraying water from its trunk',
      'laughing as a playful little monkey hangs upside down from a tree branch above',
      'standing proudly beside a friendly smiling lion resting on a big rock',
      'pointing up happily at three colorful parrots flying and singing in the sky',
      'watching a group of elegant flamingos standing on one leg in a pond',
      'smiling at a kangaroo with a tiny baby joey peeking out of its pouch',
      'sitting near a cuddly panda that is munching on a bamboo stick',
      'gently petting a friendly striped zebra in the zoo',
      'giggling at a row of waddling penguins by the water',
      'watching a big happy hippo with its mouth wide open in a pool',
      'holding out a hand to feed a sweet little spotted deer',
      'admiring a beautiful peacock spreading its big fan of feathers',
      'hugging a soft fluffy bunny rabbit with a happy smile',
      'waving goodbye at the zoo gate while holding colorful balloons, surrounded by friendly animals',
    ],
    coloringBackCoverScene:
      'waving goodbye with a big happy smile while holding colorful balloons, with a friendly giraffe, lion and monkey waving too, confetti in the air, bright cheerful colors, open friendly space at the bottom',
  },

  // ── Space (مغامرة في الفضاء) — matches the photoreal space book.
  space: {
    style: 'photoreal',
    titleAr: 'مغامرة [NAME] في الفضاء',
    pageTexts: [
      'كان{|ت} [NAME] {ي|ت}حلم دائماً بالنجوم. وفي ليلة هادئة، تحوّل سرير{ه|ها} فجأة إلى مركبة فضائية متطورة مليئة بالأزرار اللامعة!',
      'بكل حماس، ضغط{|ت} [NAME] على الزر الأحمر الكبير، وانطلقت المركبة بسرعة البرق نحو السماء الزرقاء الداكنة.',
      'فجأة، طار كل شيء في الغرفة! وبسبب انعدام الجاذبية، أصبح{|ت} [NAME] {ي|ت}سبح في الهواء كأن{ه|ها} سمكة محاطة بالنجوم.',
      'نظر{|ت} [NAME] من النافذة الكبيرة، ورأ{ى|ت} كوكب الأرض من بعيد يبدو مثل كرة زجاجية زرقاء جميلة وصغيرة جداً.',
      'هبطت المركبة بهدوء على كوكب غريب مغطى بالرمال البنفسجية الناعمة، وكان كل شيء من حوله يلمع بهدوء.',
      'من خلف إحدى الصخور، ظهر مخلوق فضائي صغير ولطيف، يملك عيوناً واسعة ولامعة، وبدأ يلوح لـ [NAME] بترحيب.',
      'لم يتكلم المخلوق، لكنه رسم في الهواء بيديه صورة قلب كبير، فعرف{|ت} [NAME] على الفور أنه يريد أن يكون صديق{ه|ها}.',
      'أشار الصديق الفضائي بحزن إلى حفرة عميقة؛ لقد سقط فيها حجر الطاقة الذي يمنح كوكبه الحياة والنور.',
      'بلا تردد، ربط{|ت} [NAME] نفس{ه|ها} بحبل القفز السحري، ونزل{|ت} إلى الحفرة المظلمة بكل شجاعة لاستعادة الحجر.',
      'عندما أخرج{|ت} [NAME] الحجر ووضع{|ت}ه في مكانه، أضاء الكوكب كله فجأة بأنوار زاهية تشبه الألعاب النارية الملونة.',
      'تقديراً لشجاعت{ه|ها}، قدّم المخلوق الفضائي لـ [NAME] نجمة صغيرة تلمع في الظلام لتتذكر{ه|ها} دائماً، ثم حان وقت الوداع.',
      'عادت المركبة الفضائية لتنطلق بالبطل{|ة} الصغير{|ة} نحو الأرض، مارةً بسحب ملونة وناعمة تشبه غزل البنات.',
      'استيقظ{|ت} [NAME] في سرير{ه|ها}، ونظر{|ت} إلى يد{ه|ها} ل{ي|ت}جد النجمة الصغيرة لا تزال تلمع! فابتسم{|ت} وه{و|ي} {ي|ت}علم أن الشجاعة تفتح لنا أسرار الكون.',
    ],
    coverScene:
      'dressed in a cute child astronaut outfit. Around the child a dreamy realistic outer-space world: glowing friendly planets, a rocket, twinkling stars and a colorful nebula filling the frame',
    portraitScene:
      'with a warm natural smile looking at the camera, wearing a child astronaut outfit, soft dreamy starry-space bokeh background',
    pageScenes: [
      'in cozy pajamas, sitting on a glowing high-tech bed that is transforming into a small spaceship, a starry night sky outside the bedroom window, amazed happy expression',
      'in a child astronaut outfit inside a spaceship cockpit, pressing a big glowing red button, bright stars zooming past the window, excited',
      'in a child astronaut outfit floating weightlessly in zero gravity inside a spaceship, surrounded by gently floating toys and twinkling stars, laughing',
      'in a child astronaut outfit looking out of a large round spaceship window at planet Earth far away, a beautiful glowing blue marble in space, wonder on the face',
      'in a child astronaut suit stepping onto a magical alien planet with glowing purple sand and sparkling crystals, a small shiny spaceship nearby',
      'meeting a cute friendly little alien with big shiny eyes peeking from behind a glowing purple rock and waving hello, smiling, purple alien planet',
      'watching happily as a cute friendly alien draws a glowing heart shape in the air with its hands, magical purple planet at twilight',
      'looking worried but kind as a sad cute little alien points down into a dark deep crater on the purple planet, asking for help',
      'a brave child in an astronaut suit climbing carefully down into a dark crater using a glowing magical rope, determined expression',
      'happily placing a glowing energy stone onto a pedestal as the whole alien planet suddenly lights up with bright colorful neon lights like fireworks',
      'gently receiving a small glowing star from the cute alien as a farewell gift, warm emotional goodbye, glowing planet background',
      'inside the little spaceship soaring home through swirling cotton-candy space clouds, a big beautiful glowing planet Earth ahead filling the view with blue oceans, soft white clouds and warm golden sunrise light along the curved horizon, a sparkling comet streaking alongside the ship, the child pressing happily against the round window with wide wonder-filled eyes and a joyful smile, cinematic dreamy magical glow',
      'back in cozy pajamas, waking up in bed in the morning sunlight, looking with delight at a small glowing star resting in an open hand, joyful smile',
    ],
    coloringCoverScene:
      'as a cheerful little astronaut in a space suit and helmet, floating joyfully in the middle surrounded by lots of friendly smiling planets, twinkling stars, a cute rocket, a little waving alien and colorful floating balloons, a big festive joyful full composition that fills the cover, bright cheerful saturated playful colors',
    coloringScenes: [
      'a happy little astronaut in a space suit and helmet, waving with a big smile next to a cute little rocket ship',
      'floating weightlessly among lots of stars and friendly planets, laughing with joy',
      'looking out of a round spaceship window at a smiling planet Earth far away',
      'standing on the moon next to a little planted flag, giving a thumbs up',
      'meeting a cute friendly little alien with big eyes who is waving hello',
      'happily high-fiving the cute smiling alien friend',
      'holding a big glowing star in both hands with a delighted smile',
      'riding on a friendly shooting star streaking across the sky',
      'steering the little spaceship through a fun field of stars and comets',
      'standing beside a big friendly smiling planet with rings (like Saturn)',
      'sharing a warm goodbye hug with the cute alien friend',
      'waving from the window of a cute rocket ship blasting off with a trail of stars',
      'looking through a telescope up at the twinkling stars and planets',
      'planting a little flag on top of a tiny round planet',
      'bouncing happily on the moon with low gravity, stars all around',
      'back home in bed at night, holding a small glowing star and smiling, dreaming of space',
    ],
    coloringBackCoverScene:
      'waving goodbye with a big happy smile from a cute rocket window, friendly smiling planets and stars around, a little alien waving too, colorful confetti, bright cheerful colors, open space at the bottom',
  },

  // ── The Magic Book Journey (رحلة الكتاب المسحور) — a permanent showcase theme.
  //    Every scene is a REALISTIC cinematic magical environment (NOT flat paper /
  //    crayon cartoon worlds) so the photoreal child fits naturally, the same way
  //    the zoo book works. Keeps the story beats but renders them photoreal.
  magic_book: {
    style: 'photoreal',
    titleAr: 'رحلة الكتاب السحري',
    pageTexts: [
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
    ],
    coverScene:
      'holding a large open antique leather storybook from which a warm river of golden sparkling light and tiny glowing stars gently swirls upward, a big joyful wonder-filled smile. Around the child a warm enchanted library-forest bathed in golden magical light — glowing floating books, soft warm bokeh, cozy amber glow filling the whole frame (bright and warm, NOT a dark night sky)',
    portraitScene:
      'with a warm natural smile looking at the camera, gently holding a small glowing storybook, soft warm golden magical bokeh background',
    pageScenes: [
      'sitting cross-legged on a cozy rug in a warm softly-lit child\'s bedroom at night, holding a large old leather book whose open pages glow with warm golden light on the face, wonder and delight, a small bedside lamp glowing nearby',
      'the whole child clearly visible head to toe with both arms and hands open, free and empty (NOT holding any object at all), joyfully spinning and soaring upward through a spectacular swirling magical portal that erupts from a glowing open book below — a whirling tunnel of rainbow light and golden sparks, flying storybook pages, hundreds of glowing letters and tiny sparkling story-worlds (little stars, moons and dreamy silhouettes) streaming all around, the whole room dissolving into a dreamy swirling cosmos of color, cinematic dynamic low-angle, breathtaking sense of motion, weightlessness and wonder',
      'standing in awe with open empty hands inside an astonishing surreal storybook world — the ground made of soft rolling sheets of paper, enormous colorful crayons standing tall like trees, giant open books floating in the distance, and a dreamy sky swirling with bright watercolor paint, rich cinematic photorealistic detail, magical and imaginative',
      'crouching down and smiling warmly at a small fluffy REAL white rabbit wearing tiny round glasses, sitting on a mossy log in a sunlit magical forest glade, soft warm light, realistic fur',
      'standing in an enchanted garden that is dramatically split — one side softly faded and grey, the other bursting with vivid glowing flowers and rich color — reaching wonderingly toward the colorful side, cinematic dramatic light, photoreal on both sides',
      'kneeling at the edge of a glowing blue magical river in an enchanted forest, holding a giant ornate wooden pencil and drawing a softly glowing bridge of light arcing across the water, determined focused smile, cinematic',
      'in a misty enchanted forest at twilight, holding up a small glowing golden key toward a wise owl perched on a mossy branch, warm magical rim light, cinematic photoreal',
      'carefully climbing a huge towering mountain of old leather books, reaching upward toward a glowing feather quill resting at the very top, dramatic warm cinematic light, magical dust in the air',
      'standing on a rocky peak above soft clouds at golden sunrise, having just opened an old ornate treasure chest from which hundreds of glowing colorful butterflies stream up into the sky, awe and joy, cinematic',
      'standing at the center of a magical moment as vivid color and glowing light sweep dramatically across the whole landscape — one side still soft and pale grey, the other exploding into rich greens, reds and golds with blooming flowers and streams of glowing butterflies radiating outward, arms lifted high in pure joy, dynamic breathtaking cinematic',
      'laughing and dancing joyfully in a magical forest celebration, a friendly fluffy white rabbit and a gentle wise owl happily dancing and playing around, warm glowing lanterns and little flags strung between the trees, floating golden sparks and glowing confetti of light filling the air, festive lively movement, cinematic',
      'standing on a grassy magical hill at dusk beside a warm glowing golden swirl of light (a gentle magical portal), waving goodbye with a soft smile, a small white rabbit and an owl beside, a faint glowing castle far in the distance, cinematic photoreal',
      'back in the cozy bedroom at night, sitting on the rug holding the now-quiet old book against the chest with a happy content smile, soft moonlight and warm lamp light, calm and cozy',
    ],
  },

  // ── School (بطل المدرسة) — coloring-only entry (school's full story book is
  //    generated via the cartoon preview path; here we add its coloring set).
  school_hero: {
    style: 'photoreal',
    coloringCoverScene:
      'as a cheerful school kid with a backpack standing happily in the middle, surrounded by lots of fun colorful school things — open books, pencils, crayons, a chalkboard, a paint palette, a school building, smiling friends and colorful floating balloons, a big festive joyful full composition that fills the cover, bright cheerful saturated playful colors',
    coloringScenes: [
      'a happy child with a school backpack, waving with a big smile in front of a friendly school building',
      'sitting at a school desk with books and pencils, smiling and ready to learn',
      'standing at a big chalkboard drawing happily with chalk',
      'sitting and reading a big open storybook with a delighted face',
      'painting a colorful picture at an easel with a paintbrush',
      'sliding down a fun playground slide with arms up, laughing',
      'kicking a ball happily in the schoolyard',
      'sharing a box of crayons with a smiling friend at a table',
      'raising a hand high in class with an eager happy smile',
      'eating lunch at a table with two happy friends',
      'watching a fun little science volcano experiment bubble over',
      'arranging books neatly on a tall library shelf',
      'receiving a big gold star sticker from a kind smiling teacher',
      'planting a small flower in the school garden with a trowel',
      'proudly holding up a round medal on a ribbon with a big smile',
      'waving goodbye at the school gate with a couple of cheerful friends',
    ],
    coloringBackCoverScene:
      'waving goodbye with a big happy smile in front of the school, a couple of friends waving too, books, a backpack, colorful balloons and confetti, bright cheerful colors, open space at the bottom',
  },
  // ── Pirate Treasure (مغامرة [NAME] وكنز القراصنة) — a brave little captain sails to a tropical
  //    island to find hidden treasure, learning courage and kindness. Realistic
  //    cinematic ocean/island scenes so the photoreal child fits naturally.
  pirate_adventure: {
    style: 'photoreal',
    titleAr: "مغامرة [NAME] وكنز القراصنة",
    pageTexts: [
      "في صباح مشمس، وجد{|ت} [NAME] زجاجة قديمة على الشاطئ، وبداخلها خريطة كنز! ففرح{|ت} كثيرا وقرر{|ت} أن {يصبح|تصبح} {قبطانا|قبطانة} للقراصنة.",
      "ركب{|ت} [NAME] سفينة خشبية صغيرة ذات شراع أبيض، ورفع{|ت} الراية، وأبحر{|ت} في البحر الأزرق وه{و|ي} {ي|ت}شعر بالشجاعة.",
      "حط ببغاء ملون لطيف على كتف [NAME]، وأخذ يغرد بفرح، فأصبح رفيقا وفيا في الرحلة.",
      "فجأة تجمعت الغيوم الداكنة وتمايلت السفينة بين الأمواج العالية. أمسك{|ت} [NAME] عجلة القيادة بقوة وقاد{|ت} بشجاعة عبر العاصفة.",
      "هدأ البحر، ووصل{|ت} [NAME] إلى جزيرة خضراء غامضة ذات نخيل عال ورمال ذهبية.",
      "قفز دلفين لطيف من الماء، وبأصوات ودودة، أشار إلى [NAME] نحو طريق خفي على الجزيرة.",
      "تبع{|ت} [NAME] الخريطة عبر الغابة، وعبر{|ت} جسرا حبليا متمايلا فوق نهر متلألئ بكل شجاعة.",
      "في نهاية الطريق، وجد{|ت} [NAME] كهفا مظلما تحرسه سلحفاة عجوز طيبة، سألت{ه|ها}: \"ما الأقوى من الذهب؟\"",
      "فكر{|ت} [NAME] قليلا ثم أجاب{|ت}: \"القلب الطيب!\" فابتسمت السلحفاة وفتحت باب الكهف.",
      "بالداخل، رأ{ى|ت} [NAME] صندوق كنز كبيرا، لكن{ه|ها} سمع{|ت} سلطعونا صغيرا عالقا تحت صخرة، فتوقف{|ت} ل{ي|ت}حرره أولا.",
      "شكر{ه|ها} السلطعون ممتنا، وأرا{ه|ها} المفتاح الذهبي. فتح{|ت} [NAME] الصندوق: فتلألأ بالعملات الذهبية وتاج لامع!",
      "على الشاطئ، احتفل{|ت} [NAME] مع الببغاء والدلفين والسلطعون، وتقاسم{|ت} الكنز معهم وه{و|ي} {ي|ت}ضحك بفرح.",
      "ومع غروب الشمس، أبحر{|ت} [NAME] عائد{ا|ة} إلى البيت مرتدي{ا|ة} التاج، محتفظ{ا|ة} بعملة ذهبية، {ي|ت}حلم بالمغامرة القادمة.",
    ],
    coverScene:
      "dressed in a cute little pirate captain outfit with a red bandana and a small toy sword, standing proudly at the wheel of a small wooden ship holding a treasure map; around the child a dreamy realistic ocean world: turquoise sea, a tropical treasure island, a colorful parrot, sparkling gold coins and a glowing golden sunset filling the frame",
    portraitScene:
      "with a warm natural smile looking at the camera, wearing a cute pirate captain hat and a red bandana, soft dreamy tropical beach and ocean bokeh background",
    medalPages: [11],
    pageScenes: [
      "in casual summer clothes kneeling on a sunny sandy beach, holding an old glass bottle with a rolled-up treasure map inside, turquoise sea behind, excited delighted expression",
      "dressed as a cute little pirate captain raising a white sail and a pirate flag on a small wooden ship, deep blue sea all around, brave proud smile",
      "as a little pirate captain on the ship deck with a colorful friendly parrot perched on the shoulder, both looking happy, open blue ocean, warm sunlight",
      "as a little pirate captain gripping the ship's wheel tightly, steering through big ocean waves under dramatic dark storm clouds, determined brave face, cinematic but child-friendly",
      "as a little pirate captain stepping off the ship onto a beautiful tropical island with tall palm trees and golden sand, calm turquoise water, wonder on the face",
      "as a little pirate captain crouching at the water's edge as a friendly smiling dolphin leaps from the sea and points the way, sparkling ocean, joyful",
      "as a little pirate captain carefully crossing a wobbly rope bridge over a sparkling jungle river, holding a treasure map, lush green jungle, brave concentrated expression",
      "as a little pirate captain standing at the mouth of a dark cave guarded by a big kind old sea turtle, faint glowing treasure hints inside, curious respectful expression, tropical jungle",
      "as a little pirate captain smiling and answering the wise old turtle as the stone cave door glows and slowly opens, warm magical light, hopeful expression",
      "as a little pirate captain inside a glittering treasure cave, kneeling to gently free a cute little crab trapped under a small rock, a big glowing treasure chest nearby, caring expression",
      "as a little pirate captain joyfully opening a big treasure chest that glows with gold coins and a shiny crown, a grateful little crab beside, sparkling cave, delighted amazed face",
      "as a little pirate captain celebrating on the sunny beach with a colorful parrot, a friendly dolphin in the water and a little crab, sharing shiny gold coins, laughing with pure joy",
      "as a little pirate captain wearing a golden crown, sailing the small ship home across a calm sea at a beautiful golden sunset, holding one gold coin, peaceful happy dreamy smile",
    ],
    coloringCoverScene:
      "as a cheerful little pirate captain with a big hat and a treasure map, standing proudly in the middle surrounded by a smiling parrot, a friendly dolphin, gold coins, a treasure chest, a little ship and a palm-tree island, a big festive joyful full composition that fills the cover, bright cheerful playful colors",
    coloringScenes: [
      "a happy little pirate captain waving with a big smile, holding a treasure map",
      "standing proudly at the wheel of a cute little pirate ship",
      "with a colorful parrot friend sitting on the shoulder, both smiling",
      "sailing the little ship over friendly ocean waves",
      "waving at a smiling dolphin jumping out of the water",
      "stepping onto a tropical island with palm trees, with a big smile",
      "following footprints on the sand while holding a treasure map",
      "crossing a rope bridge over a river, having fun",
      "meeting a big friendly smiling sea turtle at a cave",
      "gently helping a cute little crab out from under a rock",
      "opening a big treasure chest full of coins with a delighted smile",
      "wearing a treasure crown and holding a gold coin, cheering",
      "high-fiving the parrot and the crab in celebration",
      "sitting on a treasure chest with the parrot, smiling",
      "looking through a spyglass from the ship toward the island",
      "sailing home at sunset with the crown, waving goodbye happily",
    ],
    coloringBackCoverScene:
      "waving goodbye with a big happy smile from the little pirate ship, a smiling parrot and dolphin nearby, gold coins and a treasure chest, a palm-tree island in the distance, bright cheerful colors, open space at the bottom",
  },
};

/** The face-anchoring clause shared by every prompt kind. */
function faceClause(childName: string, childGender: 'male' | 'female'): string {
  const child = childGender === 'female' ? 'girl' : 'boy';
  return (
    `A real 5-year-old ${child} named ${childName} whose face EXACTLY matches the reference photo — ` +
    `identical facial features, skin tone, eyebrows, hair and natural smile`
  );
}

const PHOTOREAL_TAIL =
  'Real natural skin texture and hair, soft warm cinematic lighting, shot like a real professional DSLR ' +
  'photograph, shallow depth of field, sharp focus on the face. Photorealistic — looks like a REAL photo, ' +
  'NOT a cartoon, NOT a 3D render, NOT an illustration.';

const NO_TEXT = 'No text, no letters, no numbers, no signs, no watermark.';
const NO_MEDAL_TEXT =
  'IMPORTANT: any award medal is a plain smooth BLANK shiny gold disc with a ribbon and absolutely NO letters, ' +
  'writing, numbers or symbols on it.';

/**
 * Turns a stored scene + a specific child into a final image-generation prompt.
 * `kind` selects cover / portrait / body-page framing. The child's actual face
 * comes from the reference photo passed to the image generator, not from here.
 */
export function buildScenePrompt(
  kind: 'cover' | 'portrait' | 'page',
  scene: string,
  childName: string,
  childGender: 'male' | 'female',
  opts: { medal?: boolean; coloring?: boolean } = {}
): string {
  const base = faceClause(childName, childGender);
  const child = childGender === 'female' ? 'girl' : 'boy';

  // Coloring-book page: clean black-and-white line art the child can color in,
  // with their own recognizable character (the "drawings are the same as the kid").
  if (opts.coloring) {
    let cp =
      `Black-and-white LINE ART coloring book page for young children, full-page composition. A clean, ` +
      `bold-outlined cartoon line drawing (NO color, NO shading, NO grey fills, pure white background) of a ` +
      `cheerful 5-year-old ${child} whose face, hairstyle and features clearly resemble the reference photo. ` +
      `Scene: the ${child} ${scene}. The drawing is LARGE and FILLS the entire page edge to edge — the main ` +
      `character and the scene are big and centered, taking up almost the whole frame with only a thin border. ` +
      `Thick clear bold black outlines, simple friendly shapes that are easy for a small child to color with ` +
      `crayons. Strictly black outlines on a white background — absolutely NO colors and NO grayscale shading. ` +
      `Square 1:1, fills the frame. ${NO_TEXT}`;
    if (opts.medal) cp += ' ' + NO_MEDAL_TEXT;
    return cp;
  }

  let p: string;
  if (kind === 'cover') {
    p =
      `Ultra-photorealistic, lifelike children's book FRONT COVER photograph. ${base}, shown waist-up and ` +
      `centered as the smiling hero, ${scene}. ${PHOTOREAL_TAIL} ${COLOR_GRADE} Square 1:1. ${NO_TEXT}`;
  } else if (kind === 'portrait') {
    p =
      `Ultra-photorealistic, lifelike children's book back-cover portrait photograph. ${base}, ${scene}. ` +
      `${PHOTOREAL_TAIL} ${COLOR_GRADE} Centered, square 1:1. ${NO_TEXT}`;
  } else {
    p =
      `Ultra-photorealistic, lifelike children's book illustration photograph. ${base}. ` +
      `Scene: the ${child} ${scene}. ${PHOTOREAL_TAIL} ${COLOR_GRADE} Square 1:1. ${NO_TEXT}`;
  }
  if (opts.medal) p += ' ' + NO_MEDAL_TEXT;
  return p;
}

export function getSceneTemplate(themeId: string): SceneTemplate | undefined {
  return SCENE_TEMPLATES[themeId];
}

/** Creative FULL-COLOR cartoon cover for a coloring book (the only colored page). */
export function buildColoringCoverPrompt(scene: string, childName: string, childGender: 'male' | 'female'): string {
  const child = childGender === 'female' ? 'girl' : 'boy';
  return (
    `A fun, colorful, vibrant CARTOON coloring-book FRONT COVER for young children, square 1:1. ` +
    `A cheerful happy 5-year-old ${child} ${scene}. The child's face and hairstyle clearly resemble the ` +
    `reference photo. Bright cheerful saturated colors, bold clean playful cartoon style, joyful, lots of ` +
    `color and fun friendly details, big open inviting composition. Professional children's coloring-book ` +
    `cover art. ${NO_TEXT}`
  );
}

/** Creative FULL-COLOR cartoon BACK cover for a coloring book (after page 16). */
export function buildColoringBackCoverPrompt(scene: string, childName: string, childGender: 'male' | 'female'): string {
  const child = childGender === 'female' ? 'girl' : 'boy';
  return (
    `A fun, colorful, vibrant CARTOON coloring-book BACK COVER for young children, square 1:1. ` +
    `A cheerful happy 5-year-old ${child} ${scene}. The child's face and hairstyle clearly resemble the ` +
    `reference photo. Bright cheerful saturated colors, bold clean playful cartoon style, joyful farewell ` +
    `mood, lots of color and fun friendly details. Professional children's coloring-book back-cover art. ${NO_TEXT}`
  );
}
