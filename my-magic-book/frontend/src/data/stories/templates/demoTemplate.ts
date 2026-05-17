import type { TemplatePage } from '../builder';

export const demoTemplate: TemplatePage[] = [
  {
    type: "text",
    content: "كان يا ما كان، طفل اسمه {{name}}، كان يحب المغامرات كثيراً و يحلم باكتشاف العوالم المخفية."
  },
  {
    type: "image",
    prompt: "A child named {{name}} in a magical enchanted forest, vibrant colors, children's book illustration style, soft lighting" 
  },
  {
    type: "text", 
    content: "في يوم من الأيام، قرر {{name}} أن يذهب إلى الغابة السحرية، حيث تلتقي الأشجار العملاقة بالسحب."
  },
  {
    type: "image",
    prompt: "A child looking up at giant glowing trees in a magical forest, children's book illustration style"
  },
  {
    type: "text",
    content: "هناك، التقى {{name}} بتنين صغير لطيف يحب اللعب."
  },
  {
    type: "image",
    prompt: "A child meeting a friendly small green dragon, smiling, playing together, children's book illustration style"
  }
  // يمكنك إضافة باقي الـ 26 صفحة هنا (13 نص، 13 صورة)
];
