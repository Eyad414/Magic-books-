interface StoryGeneratorOptions {
  childName: string;
  childAge: number;
  childGender: 'male' | 'female';
  theme: string;
  storyLength: 'short' | 'medium' | 'long';
  language: 'ar' | 'en' | 'he';
  customThemeNote?: string;
}

const STORY_LENGTH_MAP = {
  short: 300,
  medium: 600,
  long: 1000,
};

const THEME_LABELS_AR: Record<string, string> = {
  adventure: 'المغامرة والاستكشاف',
  space: 'الفضاء والنجوم',
  ocean: 'البحر والمحيط',
  forest: 'الغابة والحيوانات',
  princess: 'الأميرات والقصور',
  superhero: 'الأبطال الخارقين',
  animals: 'الحيوانات المحبوبة',
  custom: 'موضوع خاص',
};

/** Builds the per-language prompt for the AI model. */
function buildPrompt(o: StoryGeneratorOptions): string {
  const { childName, childAge, childGender, theme, storyLength, language, customThemeNote } = o;
  const wordCount = STORY_LENGTH_MAP[storyLength];
  if (language === 'ar') {
    const pronoun = childGender === 'male' ? 'هو' : 'هي';
    return `اكتب قصة أطفال سحرية مخصصة لطفل اسمه ${childName}، عمره ${childAge} سنوات، وضميره ${pronoun}.
موضوع القصة: ${THEME_LABELS_AR[theme] || customThemeNote || 'مغامرة سحرية'}.
${customThemeNote ? `ملاحظة إضافية: ${customThemeNote}` : ''}
اكتب القصة باللغة العربية الفصحى البسيطة المناسبة للأطفال.
الطول المطلوب: حوالي ${wordCount} كلمة.
اجعل القصة ممتعة، تعليمية، وتحتوي على ${childName} كبطل رئيسي.
لا تعلّق على القصة، ابدأ مباشرة بالنص فقط.`;
  }
  if (language === 'he') {
    const pronoun = childGender === 'male' ? 'הוא' : 'היא';
    return `כתוב סיפור ילדים קסום ומותאם אישית לילד בשם ${childName}, בן ${childAge}, בלשון ${pronoun}.
נושא הסיפור: ${theme}. ${customThemeNote ? `הערה: ${customThemeNote}` : ''}
כתוב בעברית פשוטה ומתאימה לגיל הילד.
אורך רצוי: כ-${wordCount} מילים.
${childName} הוא הגיבור הראשי. התחל ישירות בטקסט הסיפור, ללא הקדמות.`;
  }
  const pronoun = childGender === 'male' ? 'he' : 'she';
  return `Write a magical personalized children's story for a child named ${childName}, age ${childAge}, using ${pronoun} pronouns.
Story theme: ${theme}. ${customThemeNote ? `Additional note: ${customThemeNote}` : ''}
Write in simple, age-appropriate English. Target length: ~${wordCount} words.
Make ${childName} the main hero. Start directly with the story text, no commentary.`;
}

/**
 * Generates a personalized children's story.
 * Prefers Gemini (already configured for images, and ~free for text), then
 * Anthropic Claude, then a built-in mock story — so the wizard always works.
 * Text only — no image cost here. The paid image generation happens later,
 * after payment, in BookBuilder.
 */
export const generateStoryWithAI = async (options: StoryGeneratorOptions): Promise<string> => {
  const { childName, theme, language } = options;
  const prompt = buildPrompt(options);

  // 1) Gemini (preferred — uses the existing GEMINI_API_KEY; text is ~free).
  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const res = await ai.models.generateContent({
        model: process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      const text =
        (res as any).text ||
        (res.candidates?.[0]?.content?.parts ?? [])
          .map((p: any) => p.text)
          .filter(Boolean)
          .join('');
      if (text && text.trim()) return text.trim();
      console.warn('[AI_Generator] Gemini returned empty text, falling back.');
    } catch (err) {
      console.error('[AI_Generator] Gemini generation failed:', err);
    }
  }

  // 2) Anthropic Claude (if a real key is configured).
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const message = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: Math.floor(STORY_LENGTH_MAP[options.storyLength] * 2),
        messages: [{ role: 'user', content: prompt }],
      });
      const content = message.content[0];
      if (content.type === 'text' && content.text.trim()) return content.text.trim();
    } catch (error) {
      console.error('[AI_Generator] Anthropic generation failed:', error);
    }
  }

  // 3) Offline fallback so the preview never breaks.
  console.log('⚠️  No AI provider available — returning mock story');
  return getMockStory(childName, theme, language);
};

const getMockStory = (childName: string, theme: string, language: 'ar' | 'en' | 'he'): string => {
  if (language === 'ar') {
    return `في مملكة بعيدة، حيث تتلألأ النجوم كالألماس في السماء، كان يعيش طفل شجاع اسمه ${childName}.

كان ${childName} يحلم دائماً بالمغامرات الكبيرة، ويتطلع في كل يوم إلى أفق الجبال البعيدة يتساءل: "ماذا يا ترى يوجد خلف تلك الجبال الشامخة؟"

في يوم جميل من أيام الربيع، استيقظ ${childName} باكراً ووجد أمام بابه طيراً صغيراً ذهبي الريش، يحمل في منقاره رسالة لامعة مكتوب عليها: "القلب الشجاع يجد طريقه دائماً."

قرر ${childName} أن يتبع الطائر الذهبي، فانطلق في رحلة عجيبة عبر الغابات الخضراء والأنهار الفضية. في طريقه، قابل أصدقاء جدداً: أرنباً حكيماً يعرف أسرار النباتات، وسلحفاة عجوزاً تحكي قصص الأجداد.

علّمه الأرنب أن الصبر كنز، وعلّمته السلحفاة أن التأني يوصل إلى الهدف. واجه ${childName} تحديات كثيرة في رحلته، لكنه في كل مرة تذكّر كلمات أصدقائه وتغلب على الصعاب.

في نهاية المطاف، وصل ${childName} إلى قصر النجوم، حيث وجد الكنز الحقيقي: ليس ذهباً ولا جواهر، بل حكمة عظيمة وقلب مليء بالمحبة.

عاد ${childName} إلى قريته وهو يحمل في قلبه درساً لا ينسى: الشجاعة والمحبة والصبر هي أعظم الكنوز في العالم.`;
  }
  if (language === 'he') {
    return `בממלכה רחוקה, שבה הכוכבים נצצו כיהלומים בשמיים, חי ילד אמיץ בשם ${childName}.

${childName} תמיד חלם על הרפתקאות גדולות, והביט מדי יום אל ההרים הרחוקים ותהה מה מסתתר מעברם.

בוקר אביבי אחד מצא ${childName} ליד הדלת ציפור זהובה קטנה, ובמקורה פתק נוצץ: "לב אמיץ תמיד מוצא את דרכו."

${childName} עקב אחר הציפור ויצא למסע מופלא דרך יערות ירוקים ונהרות כסופים, ופגש חברים חדשים שלימדו אותו על סבלנות ואומץ.

בסוף המסע הגיע ${childName} אל ארמון הכוכבים, ושם מצא את האוצר האמיתי: לא זהב ולא אבני חן, אלא חוכמה גדולה ולב מלא אהבה.

${childName} חזר הביתה עם לקח שלעולם לא יישכח: אומץ, אהבה וסבלנות הם האוצרות הגדולים בעולם.`;
  }
  return `Once upon a time, in a land where stars danced and rivers sang, there lived a brave and curious child named ${childName}.

${childName} had always dreamed of great adventures, gazing each day at the distant mountains and wondering: "What magical things could be hiding beyond those peaks?"

One bright spring morning, ${childName} woke up early to find a tiny golden bird at the door, carrying a glowing message that read: "A brave heart always finds its way."

${childName} decided to follow the golden bird and embarked on a wonderful journey through emerald forests and silver streams, meeting new friends who taught lessons of patience and courage.

At last, ${childName} reached the Palace of Stars, where the real treasure waited—not gold or jewels, but great wisdom and a heart full of love.

${childName} returned home carrying a lesson never to forget: courage, love, and patience are the greatest treasures in the world.`;
};
