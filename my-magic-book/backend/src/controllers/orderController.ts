import { Request, Response } from 'express';
import Stripe from 'stripe';
import Order from '../models/Order';
import Story from '../models/Story';
import { buildBookForOrder } from '../services/BookBuilder';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any })
  : null;

// @route POST /api/orders/checkout
export const createCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { storyId, shippingAddress } = req.body;

    const story = await Story.findById(storyId);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    // Create order (Stripe integration will be added in Phase 2)
    const order = await Order.create({
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في إنشاء الطلب' });
  }
};

// @route POST /api/orders/webhook (Stripe)
export const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    res.status(503).json({ received: false, message: 'stripe not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string | undefined;
  if (!sig) {
    res.status(400).json({ received: false, message: 'missing stripe-signature' });
    return;
  }

  let event: Stripe.Event;
  try {
    // server.ts mounts express.raw() on this route so req.body is the raw Buffer.
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[stripe] signature verification failed:', err.message);
    res.status(400).json({ received: false, message: err.message });
    return;
  }

  // Acknowledge immediately, then do the real work async. Stripe retries on
  // non-2xx so we must respond in <30s; BookBuilder can take much longer.
  res.json({ received: true });

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      const obj = event.data.object as any;
      const orderId: string | undefined = obj.metadata?.orderId;
      if (!orderId) {
        console.warn('[stripe] event without orderId metadata:', event.type, event.id);
        return;
      }
      const order = await Order.findById(orderId);
      if (!order) {
        console.warn(`[stripe] order ${orderId} not found for event ${event.id}`);
        return;
      }
      if (order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        order.stripeSessionId = obj.id || order.stripeSessionId;
        order.stripePaymentIntentId = obj.payment_intent || order.stripePaymentIntentId;
        await order.save();
      }
      // Fire-and-forget — failures land in order.illustrationsStatus='failed'.
      buildBookForOrder(orderId).catch((err) =>
        console.error(`[BookBuilder] async failure for order ${orderId}:`, err)
      );
    } else if (event.type === 'payment_intent.payment_failed') {
      const obj = event.data.object as any;
      const orderId: string | undefined = obj.metadata?.orderId;
      if (orderId) {
        await Order.findByIdAndUpdate(orderId, { paymentStatus: 'failed' });
      }
    }
  } catch (err) {
    console.error('[stripe] webhook handler error:', err);
  }
};

// @route GET /api/orders/my
export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const orders = await Order.find({ userId })
      .populate('storyId', 'childName theme coverImageUrl status')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الطلبات' });
  }
};
