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
    currency: string;
    paymentStatus: PaymentStatus;
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    illustrationsStatus: IllustrationsStatus;
    illustrationsError?: string;
    bookPdfUrl?: string;
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
declare const _default: mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Order.d.ts.map