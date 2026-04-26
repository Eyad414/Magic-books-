"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyOrders = exports.stripeWebhook = exports.createCheckout = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Story_1 = __importDefault(require("../models/Story"));
// @route POST /api/orders/checkout
const createCheckout = async (req, res) => {
    try {
        const userId = req.user._id;
        const { storyId, shippingAddress } = req.body;
        const story = await Story_1.default.findById(storyId);
        if (!story) {
            res.status(404).json({ success: false, message: 'القصة غير موجودة' });
            return;
        }
        // Create order (Stripe integration will be added in Phase 2)
        const order = await Order_1.default.create({
            userId,
            storyId,
            shippingAddress,
            totalPrice: story.totalPrice || 99,
            currency: 'SAR',
            paymentStatus: 'pending',
        });
        // TODO Phase 2: Create Stripe checkout session
        // const session = await createStripeSession(order, story);
        // res.json({ success: true, checkoutUrl: session.url, order });
        res.json({
            success: true,
            order,
            message: 'تم إنشاء الطلب — سيتم ربط الدفع في المرحلة القادمة',
            checkoutUrl: null,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في إنشاء الطلب' });
    }
};
exports.createCheckout = createCheckout;
// @route POST /api/orders/webhook (Stripe)
const stripeWebhook = async (req, res) => {
    // TODO Phase 2: Verify stripe signature & handle events
    res.json({ received: true });
};
exports.stripeWebhook = stripeWebhook;
// @route GET /api/orders/my
const getMyOrders = async (req, res) => {
    try {
        const userId = req.user._id;
        const orders = await Order_1.default.find({ userId })
            .populate('storyId', 'childName theme coverImageUrl status')
            .sort({ createdAt: -1 });
        res.json({ success: true, orders });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في جلب الطلبات' });
    }
};
exports.getMyOrders = getMyOrders;
//# sourceMappingURL=orderController.js.map