import { Request, Response } from 'express';
import ContactMessage from '../models/ContactMessage';
import { sendAdminNotification } from '../utils/mailer';

// @route POST /api/contact
export const submitContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ success: false, message: 'يرجى تعبئة جميع الحقول المطلوبة' });
      return;
    }

    const contact = await ContactMessage.create({ name, email, phone, subject, message });

    // Awaited, not fired and forgotten. The customer is told "we got it"
    // either way — that part is true the moment it is stored — but the shop
    // needs to know whether anyone was actually alerted, or a message sits
    // unread while the sender assumes it was received.
    const notice = await sendAdminNotification({ name, email, phone, subject, message })
      .catch((err: any) => {
        console.error('Failed to notify admin via email:', err?.message || err);
        return { sent: false, reason: err?.message || 'error' };
      });
    await ContactMessage.updateOne(
      { _id: contact._id },
      { $set: { notified: (notice as any)?.sent === true, notifyReason: (notice as any)?.reason } },
    ).catch(() => { /* the message itself is stored; the flag is secondary */ });

    res.status(201).json({
      success: true,
      message: 'تم استلام رسالتك! سنتواصل معك قريباً 💌',
      contactId: contact._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في إرسال الرسالة' });
  }
};
