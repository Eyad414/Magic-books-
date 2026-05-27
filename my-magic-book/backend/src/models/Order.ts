import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface IShippingAddress {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  street: string;
  buildingNo?: string;
  postalCode?: string;
  country: string;
}

// Package IDs: 'color' | 'coloring' | 'audio' | 'ebook' | 'pro'
export type BookPackage = 'color' | 'coloring' | 'audio' | 'ebook' | 'pro';

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  storyId: mongoose.Types.ObjectId;
  bookPackage: BookPackage;         // which package the customer purchased
  shippingAddress: IShippingAddress;
  totalPrice: number;
  currency: string;
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingAddressSchema = new Schema<IShippingAddress>({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  street: { type: String, required: true },
  buildingNo: { type: String },
  postalCode: { type: String },
  country: { type: String, required: true, default: 'SA' },
});

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    bookPackage: {
      type: String,
      enum: ['color', 'coloring', 'audio', 'ebook', 'pro'],
      default: 'color',
    },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    totalPrice: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    trackingNumber: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
