/**
 * StoryTemplate — MongoDB model that caches pre-generated base-scene images
 * for each story.
 *
 * Admin generates base scenes ONCE; every subsequent child's story
 * re-uses the same backgrounds — only the face is swapped in.
 *
 * Indexed on `templateId` (e.g. "zoo_adventure").
 */

import mongoose, { Document, Schema } from 'mongoose';

export interface IBaseScenePage {
  pageIndex: number;     // 0-based index among the 13 image pages
  scenePrompt: string;   // Prompt used to generate this scene
  baseSceneUrl: string;  // Cloudinary URL of the pre-generated scene
}

export interface IStoryTemplate extends Document {
  templateId: string;                  // e.g. "zoo_adventure"
  titleAr: string;
  scenes: IBaseScenePage[];            // 13 entries when fully generated
  scenesGeneratedAt?: Date;
}

const BaseScenePageSchema = new Schema<IBaseScenePage>(
  {
    pageIndex:   { type: Number, required: true },
    scenePrompt: { type: String, required: true },
    baseSceneUrl:{ type: String, required: true },
  },
  { _id: false }
);

const StoryTemplateSchema = new Schema<IStoryTemplate>(
  {
    templateId:         { type: String, required: true, unique: true, index: true },
    titleAr:            { type: String, required: true },
    scenes:             { type: [BaseScenePageSchema], default: [] },
    scenesGeneratedAt:  { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IStoryTemplate>('StoryTemplate', StoryTemplateSchema);
