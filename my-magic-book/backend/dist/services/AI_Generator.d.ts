interface StoryGeneratorOptions {
    childName: string;
    childAge: number;
    childGender: 'male' | 'female';
    theme: string;
    storyLength: 'short' | 'medium' | 'long';
    language: 'ar' | 'en';
    customThemeNote?: string;
}
/**
 * Generates a personalized children's story using Anthropic Claude API.
 * Falls back to a mock story if the API key is not configured.
 */
export declare const generateStoryWithAI: (options: StoryGeneratorOptions) => Promise<string>;
export {};
//# sourceMappingURL=AI_Generator.d.ts.map