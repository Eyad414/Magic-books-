import mongoose, { Document, Schema } from 'mongoose';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type IllustrationsStatus = 'pending' | 'generating' | 'ready' | 'failed';

export interface IShippingAddress {
  fullName: string;
  phone: string;
  // Address fields are required only for home delivery; self-pickup orders
  // carry just a pickupLocation, so these stay optional at the schema level
  // (the checkout form validates the right ones per delivery method).
  city?: string;
  district?: string;
  street?: string;
  buildingNo?: string;
  postalCode?: string;
  floor?: string;
  notes?: string;
  country: string;
  deliveryMethod?: 'delivery' | 'pickup';
  pickupLocation?: string;
}

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  storyId: mongoose.Types.ObjectId;
  shippingAddress: IShippingAddress;
  totalPrice: number;
  currency: string;
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  illustrationsStatus: IllustrationsStatus;
  illustrationsError?: string;
  bookPdfUrl?: string;
  // Print-ready files for BookPod (wraparound cover + interior) and job tracking.
  printCoverUrl?: string;
  printInteriorUrl?: string;
  printInteriorPages?: number;
  bookpodJobId?: string;
  bookpodStatus?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingAddressSchema = new Schema<IShippingAddress>({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  // Optional so self-pickup orders (which only set pickupLocation) validate.
  city: { type: String },
  district: { type: String },
  street: { type: String },
  buildingNo: { type: String },
  postalCode: { type: String },
  floor: { type: String },
  notes: { type: String },
  country: { type: String, required: true, default: 'SA' },
  deliveryMethod: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
  pickupLocation: { type: String },
});

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
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
    illustrationsStatus: {
      type: String,
      enum: ['pending', 'generating', 'ready', 'failed'],
      default: 'pending',
    },
    illustrationsError: { type: String },
    bookPdfUrl: { type: String },
    printCoverUrl: { type: String },
    printInteriorUrl: { type: String },
    printInteriorPages: { type: Number },
    bookpodJobId: { type: String },
    bookpodStatus: { type: String },
    trackingNumber: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
