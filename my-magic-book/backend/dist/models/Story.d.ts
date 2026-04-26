import mongoose, { Document } from 'mongoose';
export type StoryStatus = 'draft' | 'generating' | 'ready' | 'ordered';
export type StoryTheme = 'adventure' | 'space' | 'ocean' | 'forest' | 'princess' | 'superhero' | 'animals' | 'custom';
export interface IStory extends Document {
    userId: mongoose.Types.ObjectId;
    childName: string;
    childAge: number;
    childGender: 'male' | 'female';
    childPhotoUrl?: string;
    theme: StoryTheme;
    storyLength: 'short' | 'medium' | 'long';
    language: 'ar' | 'en';
    customThemeNote?: string;
    generatedText?: string;
    coverImageUrl?: string;
    status: StoryStatus;
    coverColor?: string;
    fontStyle?: string;
    dedicationMessage?: string;
    addons?: string[];
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