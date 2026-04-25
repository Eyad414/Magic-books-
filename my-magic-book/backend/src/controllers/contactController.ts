import { Request, Response } from 'express';
import ContactMessage from '../models/ContactMessage';

// @route POST /api/contact
export const submitContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ success: false, message: 'يرجى تعبئة جميع الحقول المطلوبة' });
      return;
    }

    const contact = await ContactMessage.create({ name, email, phone, subject, message });

    // TODO Phase 3: Send confirmation email via Nodemailer

    res.status(201).json({
      success: true,
      message: 'تم استلام رسالتك! سنتواصل معك قريباً 💌',
      contactId: contact._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في إرسال الرسالة' });
  }
};
