interface StoryGeneratorOptions {
    childName: string;
    childAge: number;
    childGender: 'male' | 'female';
    theme: string;
    storyLength: 'short' | 'medium' | 'long';
    language: 'ar' | 'en' | 'he';
    customThemeNote?: string;
}
/**
 * Generates a personalized children's story.
 * Prefers Gemini (already configured for images, and ~free for text), then
 * Anthropic Claude, then a built-in mock story — so the wizard always works.
 * Text only — no image cost here. The paid image generation happens later,
 * after payment, in BookBuilder.
 */
export declare const generateStoryWithAI: (options: StoryGeneratorOptions) => Promise<string>;
export {};
//# sourceMappingURL=AI_Generator.d.ts.map