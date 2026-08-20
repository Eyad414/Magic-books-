import mongoose, { Document, Schema } from 'mongoose';

/**
 * One row per visitor per day.
 *
 * The customers tab could only ever count people who made an account, which is
 * the last step, not the first — someone who reads the whole site and leaves
 * was invisible. This counts the visit itself.
 *
 * Deliberately thin: a random id the browser makes up and keeps, the day, and
 * how many pages were seen. No IP address, no user agent, nothing that
 * identifies a person — the question is "how many", not "who".
 */
export interface IVisit extends Document {
  /** Random id generated in the browser and kept in localStorage. */
  visitorId: string;
  /** YYYY-MM-DD, so a day's uniques is a count of rows. */
  day: string;
  views: number;
  /** Where they landed first that day — tells you what is bringing people in. */
  landing?: string;
  /** Pages seen that day, in order, capped. Answers "what were they after". */
  paths?: string[];
  /**
   * Which site sent them: instagram, google, tiktok… Taken from the referrer's
   * HOST only, never the full URL — the path of the page someone came from can
   * carry their search terms or their own identity.
   */
  source?: string;
  /**
   * The account, once this browser signs in. This is the only way a visitor
   * gets a name: they tell us who they are by logging in. Nothing here tries
   * to identify a visitor who does not.
   */
  userId?: mongoose.Types.ObjectId;
  /** Which language the site was being read in — ar, en or he. */
  lang?: string;
  /** 'mobile' or 'desktop', reported by the page from its own screen width.
   *  Deliberately not parsed from the user agent, which is far more telling. */
  device?: string;
  /** This browser has visited on an earlier day. */
  returning?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VisitSchema = new Schema<IVisit>(
  {
    visitorId: { type: String, required: true },
    day: { type: String, required: true },
    views: { type: Number, default: 1 },
    landing: { type: String },
    paths: { type: [String], default: undefined },
    source: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    lang: { type: String },
    device: { type: String },
    returning: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One row per visitor per day, and the upsert relies on it.
VisitSchema.index({ visitorId: 1, day: 1 }, { unique: true });
VisitSchema.index({ day: -1 });

export default mongoose.model<IVisit>('Visit', VisitSchema);
