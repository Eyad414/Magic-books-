import mongoose, { Document, Schema } from 'mongoose';

export type StoryStatus = 'draft' | 'generating' | 'ready' | 'ordered';
export type StoryTheme = 'adventure' | 'space' | 'ocean' | 'forest' | 'princess' | 'superhero' | 'animals' | 'custom';

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  // Step 1: Child Details
  childName: string;
  childAge: number;
  childGender: 'male' | 'female';
  childPhotoUrl?: string;
  // Step 2: Story Config
  theme: StoryTheme;
  storyLength: 'short' | 'medium' | 'long';
  language: 'ar' | 'en';
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
    childAge: { type: Number, required: true, min: 1, max: 15 },
    childGender: { type: String, enum: ['male', 'female'], required: true },
    childPhotoUrl: { type: String },
    theme: {
      type: String,
      enum: ['adventure', 'space', 'ocean', 'forest', 'princess', 'superhero', 'animals', 'custom'],
      default: 'adventure',
    },
    storyLength: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
    language: { type: String, enum: ['ar', 'en'], default: 'ar' },
    customThemeNote: { type: String },
    generatedText: { type: String },
    coverImageUrl: { type: String },
    status: {
      type: String,
      enum: ['draft', 'generating', 'ready', 'ordered'],
      default: 'draft',
    },
    coverColor: { type: String, default: '#1B1F5E' },
    fontStyle: { type: String, default: 'noto-kufi' },
    dedicationMessage: { type: String },
    addons: [{ type: String }],
    basePrice: { type: Number, default: 99 },
    totalPrice: { type: Number, default: 99 },
  },
  { timestamps: true }
);

export default mongoose.model<IStory>('Story', StorySchema);
