import type { StoryDefinition } from './types';
import { spaceStory } from './templates/space';

// We map our new TemplatePage format to the StoryDefinition format needed by the frontend Flipbook.
export const spaceAdventure: StoryDefinition = {
  id: 'space',
  order: 2,
  titleAr: 'مغامرة [NAME] في الفضاء',
  taglineAr: 'رحلة سحرية بين النجوم',
  moralAr: 'الشجاعة تفتح لنا أبواب عوالم جديدة، والكون مليء بالأسرار الجميلة.',
  questionsAr: [
    'كيف ساعد [NAME] الصديق الفضائي؟',
    'ماذا رأى [NAME] من نافذة المركبة؟',
    'لو سافرت إلى الفضاء، ماذا تود أن تكتشف؟',
  ],
  conclusionAr: 'أنت بطل حقيقي يا [NAME]، سواء على الأرض أو بين النجوم! 🚀',
  dedicationAr: 'إلى [NAME]، بطلنا الشجاع الذي يصل طموحه إلى الفضاء الواسع.',
  coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop', // Space placeholder
  thumbnail: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=200&auto=format&fit=crop',
  pages: spaceStory.map((page, index) => {
    // Convert TemplatePage to StoryBodyPage
    if (page.type === 'text') {
      return {
        pageNumber: index + 1,
        type: 'text',
        // Replace {{name}} back to [NAME] for the frontend viewer compatibility
        text: page.content?.replace(/\{\{name\}\}/g, '[NAME]'),
      };
    } else {
      return {
        pageNumber: index + 1,
        type: 'image',
        // Use a generic space placeholder until Nano Banana is hooked up
        imageSrc: `https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800&q=80&random=${index}`,
        imageAlt: page.prompt?.replace(/\{\{name\}\}/g, '[NAME]'),
      };
    }
  }),
};
