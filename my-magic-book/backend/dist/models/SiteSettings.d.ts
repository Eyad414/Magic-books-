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