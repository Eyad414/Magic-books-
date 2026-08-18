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
  /** How the customer chose to pay. Cash/COD orders must not be shown as
   *  "awaiting payment" — that wording is for card checkouts. */
  paymentMethod?: 'cash' | 'card';
  paidAt?: Date;
  paidConfirmedBy?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  illustrationsStatus: IllustrationsStatus;
  illustrationsError?: string;
  /** 0-100 while a book is building, so the dashboard can show a real bar. */
  buildProgress?: number;
  /** Human label for the current step, e.g. "الصفحة ٤ من ١٣". */
  buildStage?: string;
  bookPdfUrl?: string;
  // Print-ready files for BookPod (wraparound cover + interior) and job tracking.
  printCoverUrl?: string;
  printInteriorUrl?: string;
  printInteriorPages?: number;
  bookpodJobId?: string;
  bookpodStatus?: string;
  // Pro bundle: a SECOND printed book — the coloring book — with its own files + job.
  coloringPrintCoverUrl?: string;
  coloringPrintInteriorUrl?: string;
  coloringBookpodJobId?: string;
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
  country: { type: String, required: true, default: 'IL' },
  deliveryMethod: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
  pickupLocation: { type: String },
});

const OrderSchema = new Schema<IOrder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storyId: { type: Schema.Types.ObjectId, ref: 'Story', required: true },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    totalPrice: { type: Number, required: true },
    // The store sells in Israel and always has: a 70 here has always meant 70
    // shekels. It was labelled SAR from an early Saudi-market assumption, so
    // every order card read "70 SAR" for a price nobody ever charged in riyals.
    currency: { type: String, default: 'ILS' },
    paymentMethod: { type: String, enum: ['cash', 'card'], default: 'card' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    // Who confirmed a payment by hand, and when. BookPod has no webhook and no
    // lookup for a reference that has no print job yet, so a card payment is
    // confirmed by a person reading their BookPod account. That is fine, but it
    // must leave a trace: "why is this order paid" needs an answer later.
    paidAt: { type: Date },
    paidConfirmedBy: { type: String },
    stripeSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    illustrationsStatus: {
      type: String,
      enum: ['pending', 'generating', 'ready', 'failed'],
      default: 'pending',
    },
    illustrationsError: { type: String },
    buildProgress: { type: Number, default: 0 },
    buildStage: { type: String },
    bookPdfUrl: { type: String },
    printCoverUrl: { type: String },
    printInteriorUrl: { type: String },
    printInteriorPages: { type: Number },
    bookpodJobId: { type: String },
    bookpodStatus: { type: String },
    coloringPrintCoverUrl: { type: String },
    coloringPrintInteriorUrl: { type: String },
    coloringBookpodJobId: { type: String },
    trackingNumber: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IOrder>('Order', OrderSchema);
