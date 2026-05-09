import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const signToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: (process.env.JWT_EXPIRE || '7d') as any,
  });
};

// @route POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'يرجى تعبئة جميع الحقول المطلوبة' });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقاً' });
      return;
    }

    const user = await User.create({ name, email, passwordHash: password });
    const token = signToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'تم التسجيل بنجاح!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, location: user.location, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور' });
      return;
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ success: false, message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
      return;
    }

    const token = signToken(user._id.toString());

    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح!',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, location: user.location, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route GET /api/auth/me
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, location: user.location, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route PUT /api/auth/make-admin (Temporary endpoint for setup)
export const makeMeAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const user = await User.findByIdAndUpdate(userId, { role: 'admin' }, { new: true });
    if (!user) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      return;
    }
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};
