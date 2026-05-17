// ─── Story Builder ─────────────────────────────────────────────────────────────
// This utility builds a dynamic story book array, replacing placeholders
// with the actual child's name, and attaching the child's photo and prompt
// for Nano Banana image generation.

export interface TemplatePage {
  type: 'text' | 'image';
  content?: string;
  prompt?: string;
}

export function buildBook(
  storyPages: TemplatePage[], 
  customerName: string, 
  childPhoto: string
) {
  return storyPages.map(page => {
    // 1. If it is a text page, replace {{name}} with the actual name
    if (page.type === 'text') {
      const replaced = (page.content || '')
        .replace(/\[NAME\]/gi, customerName)
        .replace(/\{\{\s*name\s*\}\}/gi, customerName)
        .replace(/\{\s*name\s*\}/gi, customerName);
      return {
        type: 'text',
        content: replaced
      };
    }
    
    // 2. If it is an image page, attach the prompt and the uploaded photo
    if (page.type === 'image') {
      const replacedPrompt = (page.prompt || '')
        .replace(/\[NAME\]/gi, customerName)
        .replace(/\{\{\s*name\s*\}\}/gi, customerName)
        .replace(/\{\s*name\s*\}/gi, customerName);
      return {
        type: 'image',
        // This photo will be sent to Nano Banana as reference
        childPhoto: childPhoto,
        prompt: replacedPrompt
      };
    }

    return page;
  });
}
