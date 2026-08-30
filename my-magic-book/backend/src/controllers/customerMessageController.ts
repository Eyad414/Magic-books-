import { Request, Response } from 'express';
import CustomerMessage from '../models/CustomerMessage';
import User from '../models/User';
import Story from '../models/Story';
import { sendCustomerMessageEmail, sendAdminNotification } from '../utils/mailer';


/**
 * The book a message is about, shrunk to what a chat bubble needs. Sent with
 * both sides of the conversation: a message saying "here is your book" is only
 * useful if the book is one tap away from it.
 */
async function attachBooks(messages: any[]): Promise<Record<string, any>> {
  const ids = messages.map((m) => m.storyId).filter(Boolean);
  if (!ids.length) return {};
  const stories = await Story.find({ _id: { $in: ids } })
    .select('childName theme generatedCover coloringCover coloringImages')
    .lean();
  const byId: Record<string, any> = {};
  for (const st of stories as any[]) {
    const isColoring = !st.generatedCover && (st.coloringCover || st.coloringImages?.length);
    byId[String(st._id)] = {
      id: String(st._id),
      childName: st.childName,
      theme: st.theme,
      cover: st.generatedCover || st.coloringCover || '',
      isColoring: !!isColoring,
    };
  }
  return byId;
}

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
    const customer = await User.findById(req.params.userId).select('_id name email').lean();
    if (!customer) {
      res.status(404).json({ success: false, message: 'العميل غير موجود' });
      return;
    }
    const admin = (req as any).user;
    const msg = await CustomerMessage.create({
      userId: customer._id,
      body,
      fromAdmin: true,
      adminId: admin?._id,
      adminName: admin?.name,
      storyId: req.body?.storyId || undefined,
    });
    // Nudge them by email so they know to come and look. The message is saved
    // either way — a mail failure must never cost the owner the message they
    // just wrote — but the result is reported honestly rather than assumed.
    const mail = (customer as any).email
      ? await sendCustomerMessageEmail({ to: (customer as any).email, name: (customer as any).name, preview: body })
      : { sent: false, reason: 'no-email' };

    // Kept against the message, so the thread can show it later rather than
    // only in the toast the owner saw once and closed.
    await CustomerMessage.updateOne(
      { _id: msg._id },
      { $set: { emailed: mail.sent, emailReason: mail.sent ? undefined : (mail as any).reason } },
    ).catch(() => { /* the message stands either way */ });

    res.json({
      success: true,
      message: { id: String(msg._id), createdAt: msg.createdAt },
      emailed: mail.sent,
      emailReason: mail.sent ? undefined : mail.reason,
    });
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
    const books = await attachBooks(messages);
    res.json({
      success: true,
      messages: messages.map((m: any) => ({
        id: String(m._id),
        body: m.body,
        fromAdmin: m.fromAdmin,
        adminName: m.adminName || '',
        book: m.storyId ? books[String(m.storyId)] || null : null,
        readAt: m.readAt || null,
        emailed: m.emailed,
        emailReason: m.emailReason || null,
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

/**
 * GET /api/admin/conversations
 *
 * The inbox: one row per customer who has a thread, newest first, with the
 * last thing said and how much is waiting. Built as an aggregate rather than
 * "fetch every message and group in the dashboard" — that would send the whole
 * message history to the browser to render a list of names.
 */
export const listConversations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await CustomerMessage.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: '$userId',
        lastBody: { $first: '$body' },
        lastAt: { $first: '$createdAt' },
        lastFromAdmin: { $first: '$fromAdmin' },
        total: { $sum: 1 },
        waitingOnUs: { $sum: { $cond: [{ $and: [{ $eq: ['$fromAdmin', false] }, { $not: ['$readAt'] }] }, 1, 0] } },
        unreadByThem: { $sum: { $cond: [{ $and: [{ $eq: ['$fromAdmin', true] }, { $not: ['$readAt'] }] }, 1, 0] } },
      } },
      { $sort: { lastAt: -1 } },
      { $limit: 100 },
    ]);

    const users = await User.find({ _id: { $in: rows.map((r) => r._id) } })
      .select('name email').lean();
    const byId: Record<string, any> = {};
    for (const u of users) byId[String(u._id)] = u;

    res.json({
      success: true,
      conversations: rows.map((r) => ({
        userId: String(r._id),
        name: byId[String(r._id)]?.name || '—',
        email: byId[String(r._id)]?.email || '',
        lastBody: r.lastBody,
        lastAt: r.lastAt,
        lastFromAdmin: r.lastFromAdmin,
        total: r.total,
        waitingOnUs: r.waitingOnUs,
        unreadByThem: r.unreadByThem,
      })),
      waiting: rows.reduce((a, r) => a + (r.waitingOnUs > 0 ? 1 : 0), 0),
    });
  } catch (err: any) {
    console.error('[listConversations]', err);
    res.status(500).json({ success: false, message: err.message || 'تعذّر جلب المحادثات' });
  }
};

/** POST /api/admin/customers/:userId/messages/read — we have read their side. */
export const markThreadRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const r = await CustomerMessage.updateMany(
      { userId: req.params.userId, fromAdmin: false, readAt: { $exists: false } },
      { $set: { readAt: new Date() } },
    );
    res.json({ success: true, marked: r.modifiedCount });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'تعذّر' });
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
    const books = await attachBooks(messages);
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
        book: m.storyId ? books[String(m.storyId)] || null : null,
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
    const user = (req as any).user;
    const msg = await CustomerMessage.create({
      userId: user._id,
      body,
      fromAdmin: false,
    });

    // Tell the shop by email. A message that only appears in the dashboard is
    // a message nobody sees until someone happens to open the dashboard, and a
    // customer waiting on an answer does not know that is what they are
    // waiting for. This one CAN be delivered today: it goes to the address the
    // Resend account was registered with, which is the one address the shared
    // sender is allowed to reach.
    sendAdminNotification({
      name: user.name || 'عميل',
      email: user.email || '',
      subject: 'رسالة جديدة من عميل في حسابه',
      message: body,
    }).catch((e) => console.error('[replyToShop] admin email failed:', e?.message || e));

    res.json({ success: true, message: { id: String(msg._id), createdAt: msg.createdAt } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'فشل الإرسال' });
  }
};
