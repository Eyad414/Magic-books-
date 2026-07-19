import mongoose, { Document, Schema } from 'mongoose';

export interface IBookPackage {
  id: string;
  label: string;
  price: number;
  emoji: string;
  desc: string;
}

export interface ITheme {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  /** Optional per-language story titles set by the admin. Arabic stays in
   *  `label`; `titles.en` / `titles.he` override the name for those UI
   *  languages (empty → falls back to the built-in localized name). */
  titles?: { ar?: string; en?: string; he?: string };
  pages?: any[];
  /** Admin-controlled gate: only `ready` themes are shown in the customer wizard. */
  ready: boolean;
  /** Cached Nano-Banana preview images (GCS object paths), one per body image page. */
  generatedImages?: string[];
  /** Cached Nano-Banana back-cover portrait (GCS object path). */
  generatedPortrait?: string;
  /** Cached Nano-Banana full-scene front-cover image (GCS object path). */
  generatedCover?: string;
  /** Style-B: cached one-time PHOTOREALISTIC template scenes (face gets swapped onto these). */
  photorealTemplates?: string[];
  photorealCover?: string;
  photorealPortrait?: string;
  /** Which style is currently shown: 'cartoon' (3D gen) or 'photoreal' (face-swap). */
  previewStyle?: 'cartoon' | 'photoreal';
  /** True for coloring-book themes (line-art) — kept separate from story themes in admin. */
  isColoring?: boolean;
  /** Admin-typed coloring-book scenes: the 16 page scenes + the colored cover/back scenes. */
  coloringScenes?: string[];
  coloringCoverScene?: string;
  coloringBackCoverScene?: string;
}

/** Editable "trust" counters shown on the home hero (admin-controlled). */
export interface IHomeStats {
  storiesCreated: string;
  happyFamilies: string;
  readyStories: string;
  rating: string;
}

export interface ISiteSettings extends Document {
  bookPackages: IBookPackage[];
  themes: ITheme[];
  homeStats?: IHomeStats;
}

export const DEFAULT_HOME_STATS: IHomeStats = {
  storiesCreated: '+500',
  happyFamilies: '+100',
  readyStories: '+20',
  rating: '5 ⭐',
};

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    bookPackages: [
      {
        id: { type: String, required: true },
        label: { type: String, required: true },
        price: { type: Number, required: true },
        emoji: { type: String, required: true },
        desc: { type: String, required: true },
      },
    ],
    themes: [
      {
        id: { type: String, required: true },
        emoji: { type: String, required: true },
        label: { type: String, required: true },
        desc: { type: String, required: true },
        titles: { type: Schema.Types.Mixed, default: undefined },
        pages: { type: Schema.Types.Mixed, default: [] },
        ready: { type: Boolean, default: false },
        generatedImages: { type: [String], default: undefined },
        generatedPortrait: { type: String, default: undefined },
        generatedCover: { type: String, default: undefined },
        photorealTemplates: { type: [String], default: undefined },
        photorealCover: { type: String, default: undefined },
        photorealPortrait: { type: String, default: undefined },
        previewStyle: { type: String, default: undefined },
        isColoring: { type: Boolean, default: false },
        coloringScenes: { type: [String], default: undefined },
        coloringCoverScene: { type: String, default: undefined },
        coloringBackCoverScene: { type: String, default: undefined },
      },
    ],
    homeStats: {
      storiesCreated: { type: String, default: DEFAULT_HOME_STATS.storiesCreated },
      happyFamilies: { type: String, default: DEFAULT_HOME_STATS.happyFamilies },
      readyStories: { type: String, default: DEFAULT_HOME_STATS.readyStories },
      rating: { type: String, default: DEFAULT_HOME_STATS.rating },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
