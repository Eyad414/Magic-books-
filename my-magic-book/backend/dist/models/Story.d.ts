import mongoose, { Document } from 'mongoose';
export type StoryStatus = 'draft' | 'generating' | 'ready' | 'ordered';
export type StoryTheme = 'adventure' | 'space' | 'ocean' | 'forest' | 'princess' | 'superhero' | 'animals' | 'custom';
export type StoryMode = 'template' | 'ai';
/** One page of a handwritten template. Either text content or an illustration prompt. */
export interface StoryTemplatePage {
    type: 'text' | 'image';
    content?: string;
    prompt?: string;
}
export interface IStory extends Document {
    userId: mongoose.Types.ObjectId;
    childName: string;
    childAge: string;
    childGender: 'male' | 'female';
    childPhotoUrl?: string;
    theme: string;
    storyLength: 'short' | 'medium' | 'long';
    language: 'ar' | 'en';
    customThemeNote?: string;
    mode: StoryMode;
    templatePages?: StoryTemplatePage[];
    generatedText?: string;
    coverImageUrl?: string;
    generatedImages?: string[];
    generatedCover?: string;
    generatedPortrait?: string;
    status: StoryStatus;
    coverColor?: string;
    fontStyle?: string;
    dedicationMessage?: string;
    addons?: string[];
    bookPackage?: string;
    basePrice: number;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IStory, {}, {}, {}, mongoose.Document<unknown, {}, IStory, {}, {}> & IStory & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Story.d.ts.map