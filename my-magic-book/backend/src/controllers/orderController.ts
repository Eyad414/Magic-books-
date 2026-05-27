import { Request, Response } from 'express';
import Order from '../models/Order';
import Story from '../models/Story';

// @route POST /api/orders/checkout
export const createCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { storyId, shippingAddress, bookPackage } = req.body;

    const story = await Story.findById(storyId);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    // Create order (Stripe integration will be added in Phase 2)
    const order = await Order.create({
      userId,
      storyId,
      bookPackage: bookPackage || 'color',
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
  // TODO Phase 2: Verify stripe signature & handle events
  res.json({ received: true });
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

// @route GET /api/orders/story/:storyId/access
// Returns whether the authenticated user has e-book / audio access for this story
export const getStoryAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { storyId } = req.params;

    // Find the most recent paid order for this story by this user
    const order = await Order.findOne({
      userId,
      storyId,
      paymentStatus: 'paid',
    }).sort({ createdAt: -1 });

    const pkg = order?.bookPackage || null;

    res.json({
      success: true,
      hasAccess: !!order,
      bookPackage: pkg,
      // Convenience flags
      hasEbook: pkg === 'ebook' || pkg === 'pro',
      hasAudio: pkg === 'audio' || pkg === 'pro',
      hasColorBook: pkg === 'color' || pkg === 'pro',
      hasColoringBook: pkg === 'coloring',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في التحقق من الصلاحية' });
  }
};
