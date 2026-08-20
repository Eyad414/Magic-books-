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
  /** When the RECIPIENT opened it. Absent = still unread. */
  readAt?: Date;
  /** Optionally about a specific book — a gift, or an order being discussed. */
  storyId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerMessageSchema = new Schema<ICustomerMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
    fromAdmin: { type: Boolean, required: true },
    readAt: { type: Date },
    storyId: { type: Schema.Types.ObjectId, ref: 'Story' },
  },
  { timestamps: true },
);

// Every read is "this person's messages, newest first".
CustomerMessageSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ICustomerMessage>('CustomerMessage', CustomerMessageSchema);
