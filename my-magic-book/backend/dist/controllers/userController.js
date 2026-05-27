"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateProfile = void 0;
const User_1 = __importDefault(require("../models/User"));
// @route PUT /api/user/profile
const updateProfile = async (req, res) => {
    try {
        const { name, email, phone, location } = req.body;
        const userId = req.user._id;
        const user = await User_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
            return;
        }
        if (email && email !== user.email) {
            const existingEmail = await User_1.default.findOne({ email });
            if (existingEmail) {
                res.status(409).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً لحساب آخر' });
                return;
            }
            user.email = email;
        }
        if (name)
            user.name = name;
        if (phone !== undefined)
            user.phone = phone;
        if (location !== undefined)
            user.location = location;
        await user.save();
        res.json({
            success: true,
            message: 'تم تحديث البيانات بنجاح',
            user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, location: user.location, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.updateProfile = updateProfile;
// @route PUT /api/user/password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;
        if (!currentPassword || !newPassword) {
            res.status(400).json({ success: false, message: 'يرجى إدخال كلمة المرور الحالية والجديدة' });
            return;
        }
        if (newPassword.length < 6) {
            res.status(400).json({ success: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
            return;
        }
        const user = await User_1.default.findById(userId).select('+passwordHash');
        if (!user) {
            res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
            return;
        }
        if (!(await user.comparePassword(currentPassword))) {
            res.status(401).json({ success: false, message: 'كلمة المرور الحالية غير صحيحة' });
            return;
        }
        user.passwordHash = newPassword;
        await user.save();
        res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=userController.js.map