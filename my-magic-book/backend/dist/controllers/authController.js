"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeMeAdmin = exports.getMe = exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const mailer_1 = require("../utils/mailer");
/** Reset links die after an hour — long enough to find the mail, short enough
 *  that an old one in an inbox is not a standing key to the account. */
const RESET_TTL_MS = 60 * 60 * 1000;
const hashResetToken = (token) => crypto_1.default.createHash('sha256').update(token).digest('hex');
const signToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: (process.env.JWT_EXPIRE || '7d'),
    });
};
// @route POST /api/auth/register
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            res.status(400).json({ success: false, message: 'يرجى تعبئة جميع الحقول المطلوبة' });
            return;
        }
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(409).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً' });
            return;
        }
        const user = await User_1.default.create({ name, email, passwordHash: password });
        const token = signToken(user._id.toString());
        res.status(201).json({
            success: true,
            message: 'تم التسجيل بنجاح!',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, location: user.location, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.register = register;
// @route POST /api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
            return;
        }
        const user = await User_1.default.findOne({ email }).select('+passwordHash');
        if (!user || !(await user.comparePassword(password))) {
            res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
            return;
        }
        const token = signToken(user._id.toString());
        user.lastLoginAt = new Date();
        user.loginCount = (user.loginCount || 0) + 1;
        await user.save();
        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح!',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, location: user.location, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.login = login;
// @route POST /api/auth/forgot-password
// Emails a reset link. Answers the same way whether or not the address has an
// account: a different message for "no such user" turns this endpoint into a
// way to test which of your customers' emails are registered.
const forgotPassword = async (req, res) => {
    const vague = 'إذا كان هذا البريد مسجلاً لدينا، فقد أرسلنا إليه رابط إعادة تعيين كلمة المرور.';
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email) {
            res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني' });
            return;
        }
        const user = await User_1.default.findOne({ email });
        if (user) {
            const token = crypto_1.default.randomBytes(32).toString('hex');
            user.resetTokenHash = hashResetToken(token);
            user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MS);
            await user.save();
            const base = (process.env.FRONTEND_URL || 'https://magicfanoos.com').replace(/\/$/, '');
            const sent = await (0, mailer_1.sendPasswordReset)({
                to: user.email,
                name: user.name,
                resetUrl: `${base}/reset-password?token=${token}`,
            });
            // The customer is told the same thing regardless, so a silent delivery
            // failure would look exactly like success to everyone. Say it here.
            if (!sent)
                console.error(`[auth] reset link for ${user.email} could NOT be emailed`);
        }
        else {
            // The caller is told the same thing either way, so from outside "no
            // account with that address" is indistinguishable from "sent". Without
            // this line the logs are silent too, and there is no way left to tell
            // why an expected mail never arrived.
            console.warn(`[auth] password reset requested for ${email} — no account with that address, nothing sent`);
        }
        res.json({ success: true, message: vague });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.forgotPassword = forgotPassword;
// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
    try {
        const token = String(req.body?.token || '').trim();
        const password = String(req.body?.password || '');
        if (!token || !password) {
            res.status(400).json({ success: false, message: 'الرابط أو كلمة المرور غير مكتملة' });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
            return;
        }
        // Looked up BY the hash, so a stolen database row still cannot be turned
        // back into a usable link. Expiry is part of the query, not a later check.
        const user = await User_1.default.findOne({
            resetTokenHash: hashResetToken(token),
            resetTokenExpires: { $gt: new Date() },
        }).select('+passwordHash +resetTokenHash +resetTokenExpires');
        if (!user) {
            res.status(400).json({ success: false, message: 'الرابط منتهي الصلاحية أو غير صالح — اطلب رابطاً جديداً' });
            return;
        }
        // The pre-save hook hashes this; assigning the plain password is the same
        // thing register() does.
        user.passwordHash = password;
        // One link, one use — otherwise the mail stays a working key to the account.
        user.resetTokenHash = undefined;
        user.resetTokenExpires = undefined;
        await user.save();
        res.json({ success: true, message: 'تم تغيير كلمة المرور — يمكنك تسجيل الدخول الآن' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.resetPassword = resetPassword;
// @route GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = req.user;
        res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, location: user.location, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.getMe = getMe;
// @route PUT /api/auth/make-admin — one-time admin bootstrap.
// Previously ANY logged-in user could self-promote to admin (privilege
// escalation). Now it only creates the FIRST admin and requires the
// ADMIN_SETUP_SECRET env var to be set and matched in the request body. Once an
// admin exists, further admins are added via the protected /admin/team endpoint.
const makeMeAdmin = async (req, res) => {
    try {
        const setupSecret = process.env.ADMIN_SETUP_SECRET;
        if (!setupSecret) {
            res.status(403).json({ success: false, message: 'تم تعطيل هذه العملية' });
            return;
        }
        if (req.body?.secret !== setupSecret) {
            res.status(403).json({ success: false, message: 'رمز الإعداد غير صحيح' });
            return;
        }
        const adminCount = await User_1.default.countDocuments({ role: 'admin' });
        if (adminCount > 0) {
            res.status(403).json({ success: false, message: 'يوجد مشرف بالفعل' });
            return;
        }
        const userId = req.user._id;
        const user = await User_1.default.findByIdAndUpdate(userId, { role: 'admin' }, { new: true });
        if (!user) {
            res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
            return;
        }
        res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.makeMeAdmin = makeMeAdmin;
//# sourceMappingURL=authController.js.map