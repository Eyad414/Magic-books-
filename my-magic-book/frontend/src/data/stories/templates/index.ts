import type { TemplatePage } from '../builder';

import { spaceStory } from './space';

// 1. You can write each story as a separate array
const adventureStory: TemplatePage[] = [
  { type: "text", content: "كان يا ما كان، طفل اسمه {{name}}، في مغامرة بالغابة..." },
  { type: "image", prompt: "A child named {{name}} in a magical forest..." },
  // ... rest of the 26 pages for adventure
];

const oceanStory: TemplatePage[] = [
  { type: "text", content: "غاص {{name}} في أعماق المحيط السحري..." },
  { type: "image", prompt: "A child named {{name}} swimming with glowing fish..." },
  // ... rest of the 26 pages for ocean
];

const schoolStory: TemplatePage[] = [
  { type: "text", content: "استيقظ {{name}} بنشاط كبير، وارتدى حقيبته المفضلة وانطلق نحو مدرسته الجميلة وهو يبتسم للكائنات من حوله." },
  { type: "image", prompt: "A bright morning, a child named {{name}} waking up happily, wearing a cute schoolbag, heading to school with a smile." },
  { type: "text", content: "عندما وصل {{name}}، تفاجأ بأن الألوان قد اختفت تماماً من لوحات وجدران المدرسة! كانت تبدو حزينة باللونين الأبيض والأسود." },
  { type: "image", prompt: "{{name}} standing in front of a school where all colors have disappeared, walls are black and white and look sad." },
  { type: "text", content: "لم يستسلم {{name}}، بل قرر أن يكتشف السر ويستخدم \"أقلامه السحرية\" ولطفه ليعيد الحياة والبهجة لمدرسته." },
  { type: "image", prompt: "{{name}} holding magical colored pens, determined to bring color back to the school." },
  { type: "text", content: "في فصل العلوم، وجد صديقه سامي حزيناً لأن تجربة البركان لم تنجح، فساعده {{name}} بلمسة ذكية من خياله لتنفجر الألوان مجدداً." },
  { type: "image", prompt: "In science class, {{name}} helping his friend Sami with a colorful science volcano experiment bursting with vibrant rainbow colors." },
  { type: "text", content: "دخل {{name}} المكتبة، فسمع الكتب تهمس بحزن، وتطلب من أحد أن يرتبها لتعود الحكايات والقصص إلى مكانها الصحيح." },
  { type: "image", prompt: "{{name}} standing inside a cozy library, hearing old dusty storybooks whispering sadly on messy shelves." },
  { type: "text", content: "نادى {{name}} زملاءه، وبدأوا جميعاً في ترتيب الكتب بانتظام وهم يغنون أجمل الألحان، ليعود الدفء إلى زوايا المكتبة." },
  { type: "image", prompt: "{{name}} and his school friends happily arranging books in the library together, singing and laughing." },
  { type: "text", content: "في ساحة اللعب، سمع {{name}} مواءً رقيقاً؛ لقد كانت هناك قطة صغيرة خائفة وعالقة فوق غصن شجرة المدرسة العالية." },
  { type: "image", prompt: "A small cute kitten stuck high up on a tall green tree in the school playground, looking scared." },
  { type: "text", content: "بلا تردد، جمع {{name}} المكعبات الملونة الكبيرة وبنى منها سلماً آمناً، وتلقى القطة بلطف ليعيدها إلى الأرض بسلام." },
  { type: "image", prompt: "{{name}} building a tall stair using colorful large play blocks to rescue the little kitten from the tree branch." },
  { type: "text", content: "في وقت الاستراحة، رأى {{name}} طفلاً جديداً يجلس بمفرده، فذهب إليه وتشارك معه طعامه، ليعرف أن اللطف هو القوة الخارقة الحقيقية." },
  { type: "image", prompt: "During recess, {{name}} sitting with a new lonely classmate, sharing his lunch box with a warm friendly smile." },
  { type: "text", content: "في حصة الفن، وبإذن من المعلمة، بدأ {{name}} يرسم أحلام التلاميذ على الجدران، وفجأة.. بدأت الألوان الزاهية تعود للمدرسة كلها!" },
  { type: "image", prompt: "In art class, {{name}} painting beautiful colorful dreams on the school wall with a paintbrush, colors spreading magically." },
  { type: "text", content: "في نهاية اليوم الدراسي، صفق الجميع بحرارة لـ {{name}}، وقدم له مدير المدرسة وسام \"البطل الصغير\" تقديراً لشجاعته وجمال روحه." },
  { type: "image", prompt: "A proud school assembly, the school principal presenting a shiny gold 'Little Hero' medal to {{name}} while everyone applauds." },
  { type: "text", content: "عاد {{name}} إلى البيت مسرعاً، وحكى لوالدته بفخر كيف أن المدرسة ليست مجرد دروس، بل هي مكان للمغامرة ومساعدة الآخرين." },
  { type: "image", prompt: "{{name}} running home happily, showing his shiny medal to his smiling mother in a warm cozy home." },
  { type: "text", content: "وضع {{name}} وسامه اللامع بجانب سريره، وأغلق عينيه وهو يتشوق ليوم دراسي جديد مليء بالمفاجآت السعيدة." },
  { type: "image", prompt: "{{name}} sleeping peacefully in his cozy bed at night, a shiny gold medal sitting on the nightstand next to him under starlight." },
];

// 2. Then, export them all together in one big "Dictionary" (Object)
// This way, you can easily fetch the correct story by its theme ID!
export const STORY_TEMPLATES: Record<string, TemplatePage[]> = {
  "adventure": adventureStory,
  "space": spaceStory,
  "ocean": oceanStory,
  "school_hero": schoolStory,
  "princess": [], // Add your princess array here
  "superhero": [], // Add your superhero array here
  "animals": [], // Add your animals array here
  // ... add all 20 of your themes here!
};
