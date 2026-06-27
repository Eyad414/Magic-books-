import { Request, Response } from 'express';
import Stripe from 'stripe';
import Order from '../models/Order';
import Story from '../models/Story';
import SiteSettings from '../models/SiteSettings';
import { buildBookForOrder } from '../services/BookBuilder';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any })
  : null;

// @route POST /api/orders/checkout
export const createCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { storyId, shippingAddress, paymentMethod, bookPackage } = req.body;

    const story = await Story.findById(storyId);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    // Resolve the price SERVER-SIDE from the chosen package so the client can't
    // tamper with it. Persist the package on the story — it decides the
    // generation style (color book vs line-art coloring book) after payment.
    let totalPrice = story.totalPrice || 99;
    if (bookPackage) {
      const settings = await SiteSettings.findOne();
      const pkg = (settings?.bookPackages || []).find((p: any) => p.id === bookPackage);
      if (pkg) totalPrice = pkg.price;
      story.bookPackage = bookPackage;
      story.totalPrice = totalPrice;
      await story.save();
    }

    const order = await Order.create({
      userId: user._id,
      storyId,
      shippingAddress,
      totalPrice,
      currency: 'SAR',
      paymentStatus: 'pending',
    });

    // Cash on delivery / self-pickup — no online payment. The order is placed
    // as pending and handled offline; generation triggers once an admin (or the
    // delivery confirmation) marks it paid via /admin/orders/:id/build.
    if (paymentMethod === 'cash') {
      res.json({ success: true, order, checkoutUrl: null, paymentMethod: 'cash' });
      return;
    }

    if (!stripe) {
      res.status(503).json({ success: false, message: 'الدفع غير مهيأ حالياً' });
      return;
    }

    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: 'sar',
            // SAR is a 2-decimal currency → amount is in halalas.
            unit_amount: Math.round(totalPrice * 100),
            product_data: {
              name: `كتاب ${story.childName} — ${story.theme}`,
              description: 'كتاب أطفال مخصّص من الفانوس السحري',
            },
          },
          quantity: 1,
        },
      ],
      // orderId on BOTH the session and the payment intent so either webhook
      // event (checkout.session.completed / payment_intent.succeeded) resolves it.
      metadata: { orderId: String(order._id) },
      payment_intent_data: { metadata: { orderId: String(order._id) } },
      success_url: `${frontend}/order/success?orderId=${order._id}`,
      cancel_url: `${frontend}/create?canceled=1`,
    });

    order.stripeSessionId = session.id;
    await order.save();

    res.json({ success: true, order, checkoutUrl: session.url });
  } catch (error: any) {
    console.error('[checkout] failed:', error?.message || error);
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
