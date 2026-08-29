import mongoose, { Document, Schema } from 'mongoose';

/**
 * A record of every book sent to the printer.
 *
 * Customer orders keep their BookPod job on the Order, but the other two ways
 * a book reaches BookPod kept nothing: a demo/showcase book printed from the
 * dashboard, and an imported PDF. Both returned a job number to the browser and
 * forgot it. When nineteen demo books went to print there was no way to say
 * what had been sent, with which cover, or when — and when a cover looked wrong
 * on BookPod's side there was nothing to audit against.
 *
 * This is a log, not state: nothing reads it to make decisions, so a failed
 * write must never block a submission that already went through.
 */
export type PrintJobSource = 'theme' | 'imported' | 'order';

export interface IPrintJob extends Document {
  source: PrintJobSource;
  title: string;
  /** Theme id for a demo book; the uploaded file name for an imported one. */
  reference?: string;
  coverPath?: string;
  interiorPath?: string;
  interiorPages?: number;
  quantity: number;
  widthMm?: number;
  heightMm?: number;
  /** Which cover went: the book's own page 1, a designed one, or an upload. */
  coverSource?: 'page-1' | 'designed' | 'uploaded' | 'generated';
  bookpodJobId?: string;
  bookpodBookId?: string;
  shippingName?: string;
  shippingPhone?: string;
  submittedBy?: string;
  /** BookPod's own status the last time we looked: IN_PROCESS, CANCELLED, ... */
  bookpodStatus?: string;
  /** Sumit document number from a card payment — the reconciliation key. */
  paymentReference?: string;
  paidAt?: Date;
  /**
   * Reconstructed from BookPod's order list rather than captured at send time,
   * so it carries only what BookPod knows — no file paths, no cover source.
   */
  backfilled?: boolean;
  /** When the book actually went. On a backfilled row createdAt is just today. */
  sentAt?: Date;
  /**
   * Set when the send did NOT reach BookPod. Failures are logged too: a send
   * that failed used to leave nothing at all, which is exactly the case that
   * later can't be explained.
   */
  failed?: boolean;
  error?: string;
  createdAt: Date;
}

const PrintJobSchema = new Schema<IPrintJob>(
  {
    source: { type: String, enum: ['theme', 'imported', 'order'], required: true },
    title: { type: String, required: true, trim: true },
    reference: { type: String, trim: true },
    coverPath: { type: String },
    interiorPath: { type: String },
    interiorPages: { type: Number },
    quantity: { type: Number, default: 1 },
    widthMm: { type: Number },
    heightMm: { type: Number },
    coverSource: { type: String, enum: ['page-1', 'designed', 'uploaded', 'generated'] },
    bookpodJobId: { type: String },
    bookpodBookId: { type: String },
    shippingName: { type: String },
    shippingPhone: { type: String },
    submittedBy: { type: String },
    bookpodStatus: { type: String },
    paymentReference: { type: String },
    paidAt: { type: Date },
    backfilled: { type: Boolean, default: false },
    sentAt: { type: Date },
    failed: { type: Boolean, default: false },
    error: { type: String },
  },
  { timestamps: true },
);

// The dashboard only ever asks for the most recent sends.
PrintJobSchema.index({ sentAt: -1 });

export default mongoose.model<IPrintJob>('PrintJob', PrintJobSchema);
