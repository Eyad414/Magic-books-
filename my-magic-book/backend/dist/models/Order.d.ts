import mongoose, { Document } from 'mongoose';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type IllustrationsStatus = 'pending' | 'generating' | 'ready' | 'failed';
export interface IShippingAddress {
    fullName: string;
    phone: string;
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
    /** What the total is made of, so an order can be explained later. */
    basePrice?: number;
    discountAmount?: number;
    deliveryFee?: number;
    couponCode?: string;
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
    printCoverUrl?: string;
    printInteriorUrl?: string;
    printInteriorPages?: number;
    bookpodJobId?: string;
    bookpodStatus?: string;
    coloringPrintCoverUrl?: string;
    coloringPrintInteriorUrl?: string;
    coloringBookpodJobId?: string;
    trackingNumber?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Order.d.ts.map