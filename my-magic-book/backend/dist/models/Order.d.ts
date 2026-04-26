import mongoose, { Document } from 'mongoose';
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
export interface IOrder extends Document {
    userId: mongoose.Types.ObjectId;
    storyId: mongoose.Types.ObjectId;
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
declare const _default: mongoose.Model<IOrder, {}, {}, {}, mongoose.Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Order.d.ts.map