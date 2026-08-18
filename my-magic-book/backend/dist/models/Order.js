"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ShippingAddressSchema = new mongoose_1.Schema({
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
const OrderSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    storyId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Story', required: true },
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
}, { timestamps: true });
exports.default = mongoose_1.default.model('Order', OrderSchema);
//# sourceMappingURL=Order.js.map