import mongoose, { Document, Schema } from 'mongoose';

export interface IBookPackage {
  id: string;
  label: string;
  price: number;
  emoji: string;
  desc: string;
  /** Admin toggle: when true the package is hidden from customers (Step 2 & 3). */
  hidden?: boolean;
  /**
   * Per-language overrides, same shape the themes use. `label`/`desc` hold the
   * Arabic the owner types in the dashboard; without these an English or
   * Hebrew customer kept seeing the built-in translation and never the rename.
   */
  titles?: { ar?: string; en?: string; he?: string };
  descriptions?: { ar?: string; en?: string; he?: string };
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
  /** Same idea for the description: Arabic stays in `desc`; `descriptions.en` /
   *  `descriptions.he` override it for those UI languages. */
  descriptions?: { ar?: string; en?: string; he?: string };
  pages?: any[];
  /** Admin-controlled gate: only `ready` themes are shown in the customer wizard. */
  ready: boolean;
  /**
   * Stories that belong together as a numbered set ("الجزء ١/٢"). `series` is
   * the shared key, `seriesPart` the order within it. A series with only one
   * ready part shows no badge — a lone "part 1" reads like a mistake.
   */
  series?: string;
  seriesName?: string;
  seriesPart?: number;
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
  /** A story's colouring artwork, separate from its story artwork. */
  coloringCover?: string;
  coloringImages?: string[];
  coloringBackCover?: string;
}

/** Editable "trust" counters shown on the home hero (admin-controlled). */
export interface IHomeStats {
  storiesCreated: string;
  happyFamilies: string;
  readyStories: string;
  rating: string;
}

/**
 * Per-card visibility for the built-in demo books. Those cards are hardcoded in
 * the frontend and have no Story document, so their "show on the home page" /
 * "show on the Stories page" toggles need somewhere to live. Keyed by the
 * card's `key` (e.g. 'lora-toycity').
 *
 * Demo books built from a REAL child's photo (Lora, Sara, Julia) default to
 * hidden on both surfaces — publishing a real child's face has to be a
 * deliberate click, never a default.
 */
export interface IDemoCardVisibility {
  home?: boolean;
  stories?: boolean;
}

/**
 * A discount code. `percent` takes part of the book's price; `freeDelivery`
 * waives the delivery fee instead — a different offer for when the margin on a
 * discount is too thin but the delivery can be absorbed.
 */
export interface ICoupon {
  code: string;
  type: 'percent' | 'freeDelivery';
  value: number;
  active: boolean;
}

export const DEFAULT_COUPONS: ICoupon[] = [
  { code: 'MAGIC20', type: 'percent', value: 20, active: true },
  { code: 'MAGIC50', type: 'percent', value: 50, active: true },
  { code: 'FANOOS', type: 'freeDelivery', value: 0, active: true },
];

export interface ISiteSettings extends Document {
  bookPackages: IBookPackage[];
  themes: ITheme[];
  coupons?: ICoupon[];
  demoCards?: Record<string, IDemoCardVisibility>;
  homeStats?: IHomeStats;
  /** Wizard step 1: show the "no photo" button so a customer can order without
   *  uploading a child photo. Off by default — the photo is required. */
  allowSkipPhoto?: boolean;
  /** Wizard step 2: offer the "write with AI" story mode. Off by default; the
   *  feature is finished but kept hidden until the owner wants it live. */
  aiModeEnabled?: boolean;
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
        titles: { ar: String, en: String, he: String },
        descriptions: { ar: String, en: String, he: String },
        price: { type: Number, required: true },
        emoji: { type: String, required: true },
        desc: { type: String, required: true },
        hidden: { type: Boolean, default: false },
      },
    ],
    themes: [
      {
        id: { type: String, required: true },
        emoji: { type: String, required: true },
        label: { type: String, required: true },
        desc: { type: String, required: true },
        titles: { type: Schema.Types.Mixed, default: undefined },
        descriptions: { type: Schema.Types.Mixed, default: undefined },
        pages: { type: Schema.Types.Mixed, default: [] },
        ready: { type: Boolean, default: false },
        // Series grouping — must be declared here, not just on ITheme, or
        // Mongoose drops them silently on save.
        series: { type: String, default: undefined },
        seriesName: { type: String, default: undefined },
        seriesPart: { type: Number, default: undefined },
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
        // A story's colouring artwork, kept apart from its story artwork so a
        // colouring build can never overwrite the pages customers see.
        coloringCover: { type: String, default: undefined },
        coloringImages: { type: [String], default: undefined },
        coloringBackCover: { type: String, default: undefined },
      },
    ],
    homeStats: {
      storiesCreated: { type: String, default: DEFAULT_HOME_STATS.storiesCreated },
      happyFamilies: { type: String, default: DEFAULT_HOME_STATS.happyFamilies },
      readyStories: { type: String, default: DEFAULT_HOME_STATS.readyStories },
      rating: { type: String, default: DEFAULT_HOME_STATS.rating },
    },
    coupons: {
      type: [{
        code: { type: String, required: true, uppercase: true, trim: true },
        type: { type: String, enum: ['percent', 'freeDelivery'], default: 'percent' },
        value: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
      }],
      default: DEFAULT_COUPONS,
    },
    demoCards: { type: Schema.Types.Mixed, default: {} },
    allowSkipPhoto: { type: Boolean, default: false },
    aiModeEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
