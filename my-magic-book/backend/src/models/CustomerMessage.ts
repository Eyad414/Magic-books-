import mongoose, { Document, Schema } from 'mongoose';

/**
 * A message between the shop and one customer, in either direction.
 *
 * ContactMessage is a different thing: someone filling in the contact form,
 * identified only by the email they typed, with no account behind it and no way
 * to answer inside the site. This is attached to an ACCOUNT, so the customer
 * sees it when they sign in, and the owner can see whether they read it.
 */
export interface ICustomerMessage extends Document {
  /** The customer's account. Both directions hang off the same person. */
  userId: mongoose.Types.ObjectId;
  body: string;
  /** true = the shop wrote it, false = the customer replied. */
  fromAdmin: boolean;
  /**
   * WHICH admin wrote it. The inbox is shared by the whole team, so without
   * this a reply is anonymous and nobody can tell their own answer from a
   * colleague's — or see that two people answered the same person twice.
   * The customer never sees it: to them the shop speaks with one voice.
   */
  adminId?: mongoose.Types.ObjectId;
  adminName?: string;
  /** When the RECIPIENT opened it. Absent = still unread. */
  readAt?: Date;
  /** Optionally about a specific book — a gift, or an order being discussed. */
  storyId?: mongoose.Types.ObjectId;
  /**
   * Whether the nudge email actually left, and why not when it did not.
   *
   * Without this the owner cannot tell a message that reached someone from one
   * that only ever sat in an account nobody opened — which is exactly how a
   * customer on iCloud goes quiet and looks like they ignored you.
   */
  emailed?: boolean;
  emailReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerMessageSchema = new Schema<ICustomerMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
    fromAdmin: { type: Boolean, required: true },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    adminName: { type: String },
    readAt: { type: Date },
    storyId: { type: Schema.Types.ObjectId, ref: 'Story' },
    emailed: { type: Boolean },
    emailReason: { type: String },
  },
  { timestamps: true },
);

// Every read is "this person's messages, newest first".
CustomerMessageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ICustomerMessage>('CustomerMessage', CustomerMessageSchema);
