import mongoose, { Document } from 'mongoose';
export interface IBookPackage {
    id: string;
    label: string;
    price: number;
    emoji: string;
    desc: string;
    /** Admin toggle: when true the package is hidden from customers (Step 2 & 3). */
    hidden?: boolean;
}
export interface ITheme {
    id: string;
    emoji: string;
    label: string;
    desc: string;
    /** Optional per-language story titles set by the admin. Arabic stays in
     *  `label`; `titles.en` / `titles.he` override the name for those UI
     *  languages (empty → falls back to the built-in localized name). */
    titles?: {
        ar?: string;
        en?: string;
        he?: string;
    };
    /** Same idea for the description: Arabic stays in `desc`; `descriptions.en` /
     *  `descriptions.he` override it for those UI languages. */
    descriptions?: {
        ar?: string;
        en?: string;
        he?: string;
    };
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
    /** Wizard step 1: show the "no photo" button so a customer can order without
     *  uploading a child photo. Off by default — the photo is required. */
    allowSkipPhoto?: boolean;
    /** Wizard step 2: offer the "write with AI" story mode. Off by default; the
     *  feature is finished but kept hidden until the owner wants it live. */
    aiModeEnabled?: boolean;
}
export declare const DEFAULT_HOME_STATS: IHomeStats;
declare const _default: mongoose.Model<ISiteSettings, {}, {}, {}, mongoose.Document<unknown, {}, ISiteSettings, {}, {}> & ISiteSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=SiteSettings.d.ts.map