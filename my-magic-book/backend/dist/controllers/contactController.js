"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitContact = void 0;
const ContactMessage_1 = __importDefault(require("../models/ContactMessage"));
// @route POST /api/contact
const submitContact = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            res.status(400).json({ success: false, message: 'يرجى تعبئة جميع الحقول المطلوبة' });
            return;
        }
        const contact = await ContactMessage_1.default.create({ name, email, phone, subject, message });
        // TODO Phase 3: Send confirmation email via Nodemailer
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