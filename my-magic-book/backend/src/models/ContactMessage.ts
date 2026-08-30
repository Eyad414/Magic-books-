import mongoose, { Document, Schema } from 'mongoose';

export interface IContactMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  /**
   * Whether the "you have a new message" email to the shop actually left.
   * A notification that fails silently means a customer sat waiting while
   * nobody knew they had written.
   */
  notified?: boolean;
  notifyReason?: string;
  createdAt: Date;
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    notified: { type: Boolean },
    notifyReason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);
