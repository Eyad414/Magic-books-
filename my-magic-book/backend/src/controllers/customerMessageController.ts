import { Request, Response } from 'express';
import CustomerMessage from '../models/CustomerMessage';
import User from '../models/User';

/* ── the shop's side ─────────────────────────────────────────────────────── */

/**
 * POST /api/admin/customers/:userId/message
 * Write to one customer. They see it next time they sign in.
 */
export const sendMessageToCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = String(req.body?.body || '').trim();
    if (!body) {
      res.status(400).json({ success: false, message: 'الرسالة فارغة' });
      return;
    }
    const customer = await User.findById(req.params.userId).select('_id name').lean();
    if (!customer) {
      res.status(404).json({ success: false, message: 'العميل غير موجود' });
      return;
    }
    const msg = await CustomerMessage.create({
      userId: customer._id,
      body,
      fromAdmin: true,
      storyId: req.body?.storyId || undefined,
    });
    res.json({ success: true, message: { id: String(msg._id), createdAt: msg.createdAt } });
  } catch (err: any) {
    console.error('[sendMessageToCustomer]', err);
    res.status(500).json({ success: false, message: err.message || 'فشل الإرسال' });
  }
};

/**
 * GET /api/admin/customers/:userId/messages
 * The whole thread with one person, and whether they have read what we sent.
 */
export const getCustomerThread = async (req: Request, res: Response): Promise<void> => {
  try {
    const messages = await CustomerMessage.find({ userId: req.params.userId })
      .sort({ createdAt: 1 })
      .lean();
    res.json({
      success: true,
      messages: messages.map((m: any) => ({
        id: String(m._id),
        body: m.body,
        fromAdmin: m.fromAdmin,
        readAt: m.readAt || null,
        createdAt: m.createdAt,
      })),
      // What the owner actually wants at a glance: did they read it, and is
      // anything from them still waiting on us.
      unreadFromCustomer: messages.filter((m: any) => !m.fromAdmin && !m.readAt).length,
      unreadByCustomer: messages.filter((m: any) => m.fromAdmin && !m.readAt).length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'تعذّر جلب المحادثة' });
  }
};

/** Unread-from-customer counts for every account, for the customers list. */
export const messageCounts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await CustomerMessage.aggregate([
      { $group: {
        _id: '$userId',
        total: { $sum: 1 },
        waitingOnUs: { $sum: { $cond: [{ $and: [{ $eq: ['$fromAdmin', false] }, { $not: ['$readAt'] }] }, 1, 0] } },
        unreadByThem: { $sum: { $cond: [{ $and: [{ $eq: ['$fromAdmin', true] }, { $not: ['$readAt'] }] }, 1, 0] } },
      } },
    ]);
    const byUser: Record<string, any> = {};
    for (const r of rows) byUser[String(r._id)] = { total: r.total, waitingOnUs: r.waitingOnUs, unreadByThem: r.unreadByThem };
    res.json({ success: true, byUser });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'تعذّر الجلب' });
  }
};

/* ── the customer's side ─────────────────────────────────────────────────── */

/**
 * GET /api/messages/my
 * Reading the list marks the shop's messages as read — that IS opening them,
 * and it is what tells the owner the message landed.
 */
export const getMyMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const messages = await CustomerMessage.find({ userId }).sort({ createdAt: 1 }).lean();
    await CustomerMessage.updateMany(
      { userId, fromAdmin: true, readAt: { $exists: false } },
      { $set: { readAt: new Date() } },
    );
    res.json({
      success: true,
      messages: messages.map((m: any) => ({
        id: String(m._id),
        body: m.body,
        fromAdmin: m.fromAdmin,
        createdAt: m.createdAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'تعذّر جلب الرسائل' });
  }
};

/**
 * GET /api/messages/unread
 * Just the badge. Cheap enough to call on every page load, and deliberately
 * does NOT mark anything read — seeing that you have mail is not reading it.
 */
export const getMyUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const count = await CustomerMessage.countDocuments({ userId, fromAdmin: true, readAt: { $exists: false } });
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'تعذّر الجلب' });
  }
};

/** POST /api/messages — the customer writes back. */
export const replyToShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = String(req.body?.body || '').trim();
    if (!body) {
      res.status(400).json({ success: false, message: 'الرسالة فارغة' });
      return;
    }
    const msg = await CustomerMessage.create({
      userId: (req as any).user._id,
      body,
      fromAdmin: false,
    });
    res.json({ success: true, message: { id: String(msg._id), createdAt: msg.createdAt } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'فشل الإرسال' });
  }
};
