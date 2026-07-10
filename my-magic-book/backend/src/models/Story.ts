import mongoose, { Document, Schema } from 'mongoose';

export type StoryStatus = 'draft' | 'generating' | 'ready' | 'ordered';
export type StoryTheme = 'adventure' | 'space' | 'ocean' | 'forest' | 'princess' | 'superhero' | 'animals' | 'custom';
export type StoryMode = 'template' | 'ai';

/** One page of a handwritten template. Either text content or an illustration prompt. */
export interface StoryTemplatePage {
  type: 'text' | 'image';
  content?: string;  // template text with {{name}} / {name} / [NAME] placeholders
  prompt?: string;   // illustration prompt (also supports placeholders)
}

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  // Step 1: Child Details
  childName: string;
  childAge: string;
  childGender: 'male' | 'female';
  childPhotoUrl?: string;
  // Step 2: Story Config — `theme` is the id of an admin-defined theme from
  // SiteSettings.themes[]. The enum is intentionally relaxed to a string so
  // admins can add new themes without code changes.
  theme: string;
  storyLength: 'short' | 'medium' | 'long';
  language: 'ar' | 'en';
  customThemeNote?: string;
  // Authoring mode: which path was used to build the story
  mode: StoryMode;
  // Mode === 'template': the handwritten pages with {{name}} placeholders, copied
  // from frontend's STORY_TEMPLATES at create time. BookBuilder substitutes names
  // at PDF build time so changing the kid name doesn't require regeneration.
  templatePages?: StoryTemplatePage[];
  // Generated Content (mode === 'ai')
  generatedText?: string;
  coverImageUrl?: string;
  // Personalized illustrations — produced AFTER payment by BookBuilder using the
  // theme's scene template + this child's photo. GCS object paths.
  generatedImages?: string[];
  generatedCover?: string;
  generatedPortrait?: string;
  // Pro bundle: a SECOND artifact — the line-art coloring book — generated
  // alongside the color story. GCS object paths. Only set for 'pro' orders.
  coloringImages?: string[];
  coloringCover?: string;
  coloringBackCover?: string;
  status: StoryStatus;
  // Step 3: Customization
  coverColor?: string;
  fontStyle?: string;
  dedicationMessage?: string;
  addons?: string[];
  // Chosen book package id (e.g. 'color' = full-color book, 'coloring' = line-art
  // coloring book the child fills in). Decides the generation style after payment.
  bookPackage?: string;
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
    // Theme id from SiteSettings.themes[]. Validated at admin save time, not here.
    theme: { type: String, default: 'adventure' },
    storyLength: { type: String, enum: ['short', 'medium', 'long'], default: 'medium' },
    language: { type: String, enum: ['ar', 'en'], default: 'ar' },
    customThemeNote: { type: String },
    mode: { type: String, enum: ['template', 'ai'], default: 'template' },
    templatePages: { type: Schema.Types.Mixed, default: undefined },
    generatedText: { type: String },
    coverImageUrl: { type: String },
    generatedImages: { type: [String], default: undefined },
    generatedCover: { type: String, default: undefined },
    generatedPortrait: { type: String, default: undefined },
    coloringImages: { type: [String], default: undefined },
    coloringCover: { type: String, default: undefined },
    coloringBackCover: { type: String, default: undefined },
    status: {
      type: String,
      enum: ['draft', 'generating', 'ready', 'ordered'],
      default: 'draft',
    },
    coverColor: { type: String, default: '#1B1F5E' },
    fontStyle: { type: String, default: 'noto-kufi' },
    dedicationMessage: { type: String },
    addons: [{ type: String }],
    bookPackage: { type: String, default: 'color' },
    basePrice: { type: Number, default: 99 },
    totalPrice: { type: Number, default: 99 },
  },
  { timestamps: true }
);

export default mongoose.model<IStory>('Story', StorySchema);
