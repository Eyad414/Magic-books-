"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
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
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
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
        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح!',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.login = login;
// @route GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = req.user;
        res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.getMe = getMe;
//# sourceMappingURL=authController.js.map