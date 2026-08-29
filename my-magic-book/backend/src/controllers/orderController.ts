import { Request, Response } from 'express';
import Stripe from 'stripe';
import Order from '../models/Order';
import Story from '../models/Story';
import SiteSettings from '../models/SiteSettings';
import { resolveCoupon, priceOrder } from '../services/Pricing';
import { buildBookForOrder } from '../services/BookBuilder';
import { streamObject } from '../services/StorageService';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any })
  : null;

// @route POST /api/orders/checkout
export const createCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { storyId, shippingAddress, paymentMethod, bookPackage , couponCode } = req.body;

    const story = await Story.findById(storyId);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    // Every package illustrates the child, and the illustrator needs a reference
    // photo — ImageGenerator throws "childPhotoUrl is empty" on the first page
    // otherwise. Without this check the customer pays first and the build dies
    // afterwards, which is exactly what happened to order 57E628CB: paid, then
    // failed at 0% and sat there. Refuse the order instead of taking money for a
    // book that cannot be produced. This is the backstop for the dashboard's
    // "allow ordering without a photo" flag, which would otherwise reintroduce
    // the same guaranteed failure the moment it is switched on.
    if (!String(story.childPhotoUrl || '').trim()) {
      res.status(400).json({
        success: false,
        message: 'نحتاج صورة الطفل لإنشاء الرسومات — ارجع إلى الخطوة الأولى وأضف صورة قبل إتمام الطلب.',
        code: 'CHILD_PHOTO_REQUIRED',
      });
      return;
    }

    // Resolve the price SERVER-SIDE from the chosen package so the client can't
    // tamper with it. Persist the package on the story — it decides the
    // generation style (color book vs line-art coloring book) after payment.
    let basePrice = story.totalPrice || 99;
    if (bookPackage) {
      const settings = await SiteSettings.findOne();
      const pkg = (settings?.bookPackages || []).find((p: any) => p.id === bookPackage);
      if (pkg) basePrice = pkg.price;
      story.bookPackage = bookPackage;
      story.totalPrice = basePrice;
      await story.save();
    }

    // The discount used to live only in the browser: a customer saw 50% off and
    // was then charged full price, because the code never reached the server.
    // It travels with the order now and is applied here, from the same list the
    // checkout checked it against.
    const coupon = await resolveCoupon(couponCode);
    const price = priceOrder({
      basePrice,
      bookPackage: bookPackage || story.bookPackage,
      deliveryMethod: shippingAddress?.deliveryMethod,
      coupon,
    });
    const totalPrice = price.total;

    const order = await Order.create({
      userId: user._id,
      storyId,
      shippingAddress,
      totalPrice,
      basePrice: price.basePrice,
      discountAmount: price.discount,
      deliveryFee: price.deliveryFee,
      couponCode: price.couponCode,
      currency: 'ILS',
      paymentMethod: paymentMethod === 'cash' ? 'cash' : 'card',
      paymentStatus: 'pending',
    });

    // Cash on delivery / self-pickup — no online payment. The order is placed
    // as pending and handled offline; generation triggers once an admin (or the
    // delivery confirmation) marks it paid via /admin/orders/:id/build.
    if (paymentMethod === 'cash') {
      res.json({ success: true, order, checkoutUrl: null, paymentMethod: 'cash' });
      return;
    }

    // ── BookPod hosted checkout ────────────────────────────────────────────
    // The customer pays on BookPod's own page, so card details never reach this
    // server and the store stays out of PCI scope. Their API has no endpoint
    // that mints a payment link, so the URL they give us is configured once and
    // the order's id rides along as the reference — the same id BookPod echoes
    // back as external_id, which is how PaymentPoller already matches a payment
    // to an order without a webhook.
    //
    // Unset until BookPod supplies the link; the wizard hides card payment
    // entirely in that case, so nobody can reach this branch by accident.
    const bookPodPayUrl = (process.env.BOOKPOD_PAYMENT_URL || '').trim();
    if (bookPodPayUrl) {
      const sep = bookPodPayUrl.includes('?') ? '&' : '?';
      const checkoutUrl =
        `${bookPodPayUrl}${sep}reference=${encodeURIComponent(String(order._id))}` +
        `&amount=${encodeURIComponent(String(totalPrice))}`;
      res.json({ success: true, order, checkoutUrl, paymentMethod: 'card', provider: 'bookpod' });
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
            currency: 'ils',
            // ILS is a 2-decimal currency → amount is in agorot.
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
      // bookPackage lives on the Story, and the order-details view shows it —
      // without it here the customer's "الباقة" row rendered as a dash.
      .populate('storyId', 'childName theme coverImageUrl status bookPackage')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الطلبات' });
  }
};

/**
 * GET /api/orders/:id/ebook
 *
 * Hand the buyer of a digital copy the actual file.
 *
 * The E-Book package is sold as "كتاب إلكتروني للقراءة على الأجهزة" — a book
 * you keep — but the PDF the build already produces was reachable only from
 * the admin dashboard, so the customer paid for a file and received a web
 * page. This closes that gap.
 *
 * Four things are checked here rather than in the UI, because a hidden button
 * is not access control:
 *   1. the order belongs to the person asking,
 *   2. it is paid,
 *   3. the package actually includes a digital copy,
 *   4. the stored path is inside our own bucket prefix — streamObject would
 *      otherwise happily proxy anything the URL named.
 */
export const downloadMyEbook = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = String((req as any).user._id);
    const order: any = await Order.findById(req.params.id)
      .populate('storyId', 'childName bookPackage')
      .lean();

    if (!order || String(order.userId) !== userId) {
      // Same answer for "not yours" as for "does not exist": an owner check
      // that distinguishes them tells a stranger which order ids are real.
      res.status(404).json({ success: false, message: 'الطلب غير موجود' });
      return;
    }
    if (order.paymentStatus !== 'paid') {
      res.status(403).json({ success: false, message: 'هذا الطلب غير مدفوع بعد.' });
      return;
    }

    const pkg = String(order.storyId?.bookPackage || '');
    if (pkg !== 'ebook' && pkg !== 'pro') {
      res.status(403).json({ success: false, message: 'باقتك لا تشمل نسخة رقمية.' });
      return;
    }

    const uri = String(order.bookPdfUrl || '');
    if (!uri) {
      res.status(409).json({ success: false, message: 'الكتاب لسه ما خلص تجهيزه. جرّب بعد شوي.' });
      return;
    }

    // gs://bucket/object → object
    const objectPath = uri.startsWith('gs://')
      ? uri.slice('gs://'.length).split('/').slice(1).join('/')
      : uri;
    if (!objectPath.startsWith('magic-fanoose/')) {
      console.error('[downloadMyEbook] refused path outside our prefix:', objectPath);
      res.status(500).json({ success: false, message: 'تعذّر تحميل الملف.' });
      return;
    }

    const child = String(order.storyId?.childName || 'book').replace(/[^\p{L}\p{N}_-]+/gu, '-');
    res.setHeader('Content-Disposition', `attachment; filename="${child}.pdf"; filename*=UTF-8''${encodeURIComponent(child)}.pdf`);
    await streamObject(objectPath, res, req);
  } catch (err: any) {
    console.error('[downloadMyEbook]', err?.message || err);
    if (!res.headersSent) res.status(500).json({ success: false, message: 'تعذّر تحميل الملف.' });
  }
};
