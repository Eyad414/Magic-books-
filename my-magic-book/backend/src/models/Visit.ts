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
  /** Set once the visitor signs in, so visits can be tied to sign-ups. */
  registered?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VisitSchema = new Schema<IVisit>(
  {
    visitorId: { type: String, required: true },
    day: { type: String, required: true },
    views: { type: Number, default: 1 },
    landing: { type: String },
    registered: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// One row per visitor per day, and the upsert relies on it.
VisitSchema.index({ visitorId: 1, day: 1 }, { unique: true });
VisitSchema.index({ day: -1 });

export default mongoose.model<IVisit>('Visit', VisitSchema);
