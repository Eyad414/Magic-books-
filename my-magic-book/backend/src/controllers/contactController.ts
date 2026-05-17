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

    // Send admin notification email asynchronously (non-blocking)
    sendAdminNotification({ name, email, phone, subject, message }).catch(err => {
      console.error('Failed to notify admin via email:', err);
    });

    res.status(201).json({
      success: true,
      message: 'تم استلام رسالتك! سنتواصل معك قريباً 💌',
      contactId: contact._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في إرسال الرسالة' });
  }
};
