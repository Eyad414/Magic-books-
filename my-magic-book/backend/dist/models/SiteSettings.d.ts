import mongoose, { Document } from 'mongoose';
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
export interface ISiteSettings extends Document {
    bookPackages: IBookPackage[];
    themes: ITheme[];
}
declare const _default: mongoose.Model<ISiteSettings, {}, {}, {}, mongoose.Document<unknown, {}, ISiteSettings, {}, {}> & ISiteSettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=SiteSettings.d.ts.map