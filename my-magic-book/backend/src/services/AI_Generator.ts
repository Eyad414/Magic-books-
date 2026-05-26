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

/**
 * Generates a personalized children's story using Anthropic Claude API.
 * Falls back to a mock story if the API key is not configured.
 */
export const generateStoryWithAI = async (options: StoryGeneratorOptions): Promise<string> => {
  const { childName, childAge, childGender, theme, storyLength, language, customThemeNote } = options;
  const wordCount = STORY_LENGTH_MAP[storyLength];
  const pronoun = childGender === 'male' ? (language === 'ar' ? 'هو' : 'he') : (language === 'ar' ? 'هي' : 'she');

  // Check if Anthropic API key is configured
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_anthropic_api_key_here') {
    console.log('⚠️  Anthropic API key not configured — returning mock story');
    return getMockStory(childName, theme, language);
  }

  try {
    // Dynamic import to avoid errors when package not installed
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = language === 'ar'
      ? `اكتب قصة أطفال سحرية مخصصة لطفل اسمه ${childName}، عمره ${childAge} سنوات، وضميره ${pronoun}.
         موضوع القصة: ${THEME_LABELS_AR[theme] || customThemeNote || 'مغامرة سحرية'}.
         ${customThemeNote ? `ملاحظة إضافية: ${customThemeNote}` : ''}
         اكتب القصة باللغة العربية الفصحى البسيطة المناسبة للأطفال.
         الطول المطلوب: حوالي ${wordCount} كلمة.
         أجعل القصة ممتعة، تعليمية، وتحتوي على ${childName} كبطل رئيسي.
         لا تعلق على القصة، ابدأ مباشرة بالنص فقط.`
      : `Write a magical personalized children's story for a child named ${childName}, age ${childAge}, using ${pronoun} pronouns.
         Story theme: ${theme}. ${customThemeNote ? `Additional note: ${customThemeNote}` : ''}
         Write in simple, age-appropriate English. Target length: ~${wordCount} words.
         Make ${childName} the main hero. Start directly with the story text, no commentary.`;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: Math.floor(wordCount * 2),
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : getMockStory(childName, theme, language);
  } catch (error) {
    console.error('AI generation error:', error);
    return getMockStory(childName, theme, language);
  }
};

const getMockStory = (childName: string, theme: string, language: 'ar' | 'en' | 'he'): string => {
  if (language === 'ar') {
    return `في مملكة بعيدة، حيث تتلألأ النجوم كالألماس في السماء، كان يعيش طفل شجاع اسمه ${childName}.

كان ${childName} يحلم دائماً بالمغامرات الكبيرة، ويتطلع في كل يوم إلى أفق الجبال البعيدة يتساءل: "ماذا يا ترى يوجد خلف تلك الجبال الشامخة؟"

في يوم جميل من أيام الربيع، استيقظ ${childName} باكراً ووجد أمام بابه طيراً صغيراً ذهبي الريش، يحمل في منقاره رسالة لامعة مكتوب عليها: "القلب الشجاع يجد طريقه دائماً."

قرر ${childName} أن يتبع الطائر الذهبي، فانطلق في رحلة عجيبة عبر الغابات الخضراء والأنهار الفضية. في طريقه، قابل أصدقاء جدداً: أرنباً حكيماً يعرف أسرار النباتات، وسلحفاة عجوزاً تحكي قصص الأجداد.

علّمه الأرنب أن الصبر كنز، وعلّمته السلحفاة أن التأني يوصل إلى الهدف. واجه ${childName} تحديات كثيرة في رحلته، لكنه في كل مرة تذكّر كلمات أصدقائه وتغلب على الصعاب.

في نهاية المطاف، وصل ${childName} إلى قصر النجوم، حيث وجد الكنز الحقيقي: ليس ذهباً ولا جواهر، بل حكمة عظيمة وقلب مليء بالمحبة.

عاد ${childName} إلى قريته وهو يحمل في قلبه درساً لا ينسى: الشجاعة والمحبة والصبر هي أعظم الكنوز في العالم.

وعاش ${childName} وأصحابه بسعادة وهناء، يشاركون من حولهم دفء القلب ونور الحكمة.`;
  }

  return `Once upon a time, in a land where stars danced and rivers sang, there lived a brave and curious child named ${childName}.

${childName} had always dreamed of great adventures, gazing each day at the distant mountains and wondering: "What magical things could be hiding beyond those peaks?"

One bright spring morning, ${childName} woke up early to find a tiny golden bird at the door, carrying a glowing message that read: "A brave heart always finds its way."

${childName} decided to follow the golden bird and embarked on a wonderful journey through emerald forests and silver streams. Along the way, ${childName} met new friends: a wise rabbit who knew the secrets of plants, and an old tortoise who told stories of ancient times.

The rabbit taught ${childName} that patience is a treasure, and the tortoise showed that taking time leads to reaching your goal. ${childName} faced many challenges, but each time remembered the words of dear friends and overcame every obstacle.

At last, ${childName} reached the Palace of Stars, where the real treasure waited—not gold or jewels, but great wisdom and a heart full of love.

${childName} returned home carrying a lesson never to forget: courage, love, and patience are the greatest treasures in the world.

And so ${childName} and all their friends lived happily ever after, sharing warmth and wisdom with everyone around them.`;
};
