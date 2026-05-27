"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitContact = void 0;
const ContactMessage_1 = __importDefault(require("../models/ContactMessage"));
const mailer_1 = require("../utils/mailer");
// @route POST /api/contact
const submitContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            res.status(400).json({ success: false, message: 'يرجى تعبئة جميع الحقول المطلوبة' });
            return;
        }
        const contact = await ContactMessage_1.default.create({ name, email, phone, subject, message });
        // Send admin notification email asynchronously (non-blocking)
        (0, mailer_1.sendAdminNotification)({ name, email, phone, subject, message }).catch(err => {
            console.error('Failed to notify admin via email:', err);
        });
        res.status(201).json({
            success: true,
            message: 'تم استلام رسالتك! سنتواصل معك قريباً 💌',
            contactId: contact._id,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في إرسال الرسالة' });
    }
};
exports.submitContact = submitContact;
//# sourceMappingURL=contactController.js.map