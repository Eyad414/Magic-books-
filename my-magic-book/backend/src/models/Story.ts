import mongoose, { Document, Schema } from 'mongoose';

export type StoryStatus = 'draft' | 'generating' | 'illustrating' | 'ready' | 'ordered';
// Open-ended string so any theme from the frontend is accepted
export type StoryTheme = string;

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  // Step 1: Child Details
  childName: string;
  childAge: string;
  childGender: 'male' | 'female';
  childPhotoUrl?: string;
  // Step 2: Story Config
  theme: StoryTheme;
  storyLength: 'short' | 'medium' | 'long';
  language: 'ar' | 'en' | 'he';
  customThemeNote?: string;
  // Generated Content
  generatedText?: string;
  coverImageUrl?: string;
  status: StoryStatus;
  // Step 3: Customization
  coverColor?: string;
  fontStyle?: string;
  dedicationMessage?: string;
  addons?: string[];
  // Illustration pipeline
  storyTemplateId?: string;
  illustrationUrls: string[];
  illustrationStatus: 'pending' | 'generating' | 'done' | 'failed';
  illustrationError?: string;
  // Pricing
  basePrice: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    childName: { type: String, required: true, trim: true },
    childAge: { type: String, required: true },
    childGender: { type: String, enum: ['male', 'female'], required: true },
    childPhotoUrl: { type: String },
    // No enum restriction — any theme string is valid
    theme:        { type: String, default: 'adventure' },
    storyLength:  { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
    language:     { type: String, enum: ['ar', 'en', 'he'], default: 'ar' },
    customThemeNote: { type: String },
    generatedText:   { type: String },
    coverImageUrl:   { type: String },
    status: {
      type: String,
      enum: ['draft', 'generating', 'illustrating', 'ready', 'ordered'],
      default: 'draft',
    },
    storyTemplateId: { type: String },
    illustrationUrls: { type: [String], default: [] },
    illustrationStatus: {
      type: String,
      enum: ['pending', 'generating', 'done', 'failed'],
      default: 'pending',
    },
    illustrationError: { type: String },
    coverColor:   { type: String, default: '#1B1F5E' },
    fontStyle:    { type: String, default: 'noto-kufi' },
    dedicationMessage: { type: String },
    addons: [{ type: String }],
    basePrice:  { type: Number, default: 99 },
    totalPrice: { type: Number, default: 99 },
  },
  { timestamps: true }
);

export default mongoose.model<IStory>('Story', StorySchema);
