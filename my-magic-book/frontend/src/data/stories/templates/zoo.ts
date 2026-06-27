import type { TemplatePage } from '../builder';

// Zoo story — text order matches the live locale + backend scene template, so
// text and illustrations stay aligned (waking → gate → giraffe → monkey → lion
// → parrots → elephant → turtle → flamingos → kangaroo → panda → medal → home).
export const zooStory: TemplatePage[] = [
  { type: 'text', content: 'في صباح مشرق، استيقظ {{name}} مبكرًا وهو يقفز من الفرح، فاليوم يوم الرحلة إلى حديقة الحيوانات!' },
  { type: 'image', prompt: 'A child named {{name}} waking up happily in bed in warm morning sunlight, a cute zoo-animal backpack nearby.' },
  { type: 'text', content: 'وصل {{name}} إلى البوابة الكبيرة وسمع أصواتًا غريبة وجميلة من داخل الحديقة.' },
  { type: 'image', prompt: 'A child named {{name}} standing in front of a big beautiful zoo entrance gate, curious and excited, lush green trees.' },
  { type: 'text', content: 'رأى {{name}} الزرافة الطويلة ترفع رقبتها نحو السماء وتأكل أوراق الشجر بهدوء.' },
  { type: 'image', prompt: 'A child named {{name}} looking up in wonder at a tall friendly giraffe eating leaves from a tree, sunny zoo.' },
  { type: 'text', content: 'وبالقرب من البحيرة، شاهد {{name}} قرداً صغيراً ذكياً يقفز على الأشجار ويلوح بيده مبتسماً.' },
  { type: 'image', prompt: 'A child named {{name}} watching a smart little monkey jumping on branches near a lake and waving, laughing happily.' },
  { type: 'text', content: 'وفجأة، سمع {{name}} زئير الأسد القوي وهو يجلس بهيبة وفخر على صخرته العالية.' },
  { type: 'image', prompt: 'A child named {{name}} watching a majestic lion roaring proudly on a tall rock from a safe distance.' },
  { type: 'text', content: 'وقف {{name}} مندهشاً وهو يراقب الببغاوات الملونة تحلق في السماء وتغرد بأجمل الألحان.' },
  { type: 'image', prompt: 'A child named {{name}} looking up amazed at colorful parrots flying across the bright sky and singing.' },
  { type: 'text', content: 'وعند بركة الماء، رأى {{name}} الفيل الضخم يرش الماء بخرطومه الطويل بسعادة ومرح.' },
  { type: 'image', prompt: 'A child named {{name}} laughing near a big friendly elephant spraying water with its trunk by a pond.' },
  { type: 'text', content: 'مرت سلحفاة قديمة وحكيمة من أمام {{name}} وهي تمشي ببطء وتحمل درعها القوي وتبتسم.' },
  { type: 'image', prompt: 'A child named {{name}} crouching to look closely at an old wise tortoise walking slowly with its shell.' },
  { type: 'text', content: 'ابتسم {{name}} لطيور الفلامنجو الوردية الجميلة وهي تقف برقة على رجل واحدة في الماء الضحل.' },
  { type: 'image', prompt: 'A child named {{name}} smiling at elegant pink flamingos standing on one leg in shallow water.' },
  { type: 'text', content: 'شاهد {{name}} حيوان الكنغر يقفز بسرعة وهو يحمل طفله الصغير داخل كيسه الدافئ بأمان.' },
  { type: 'image', prompt: 'A child named {{name}} watching a kangaroo hopping with its baby joey peeking from its pouch.' },
  { type: 'text', content: 'وتحت ظلال الأشجار الكثيفة، رأى {{name}} دب الباندا الكبير يتناول عيدان الخيزران الخضراء بهدوء.' },
  { type: 'image', prompt: 'A child named {{name}} watching a big cuddly panda calmly eating green bamboo under shady trees.' },
  { type: 'text', content: 'ومع غروب الشمس، قدّم حارس الحديقة لـ {{name}} وسام «صديق الحيوانات الشجاع» تقديراً للطفه وشجاعته.' },
  { type: 'image', prompt: 'At sunset, a friendly zoo keeper giving a shiny blank gold medal to a happy proud child named {{name}}.' },
  { type: 'text', content: 'عاد {{name}} إلى البيت مسروراً وهو يحمل الوسام فخوراً، متشوقاً ليحكي مغامراته مع الحيوانات لعائلته.' },
  { type: 'image', prompt: 'A happy proud child named {{name}} back home in a cozy living room holding a shiny medal and smiling.' },
];
