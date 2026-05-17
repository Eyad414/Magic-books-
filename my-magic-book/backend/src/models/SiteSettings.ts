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
  pages?: any[];
}

export interface ISiteSettings extends Document {
  bookPackages: IBookPackage[];
  themes: ITheme[];
}

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
        pages: { type: Schema.Types.Mixed, default: [] },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model<ISiteSettings>('SiteSettings', SiteSettingsSchema);
