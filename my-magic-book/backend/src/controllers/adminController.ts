import { Request, Response } from 'express';
import User from '../models/User';
import Story from '../models/Story';
import SiteSettings from '../models/SiteSettings';

// @route GET /api/admin/stories
// @desc Get all stories from all users
export const getAllStories = async (req: Request, res: Response): Promise<void> => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 }).populate('userId', 'name email');
    res.json({ success: true, stories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب القصص' });
  }
};

// @route PUT /api/admin/stories/:id
// @desc Update any story
export const updateStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }
    res.json({ success: true, story });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في تحديث القصة' });
  }
};

// @route DELETE /api/admin/stories/:id
// @desc Delete a story
export const deleteStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await Story.findByIdAndDelete(req.params.id);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }
    res.json({ success: true, message: 'تم حذف القصة بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في حذف القصة' });
  }
};

// @route POST /api/admin/team
export const addAdmin = async (req: Request, res: Response): Promise<void> => {
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

    const admin = await User.create({ name, email, passwordHash: password, role: 'admin' });
    
    res.status(201).json({
      success: true,
      message: 'تم إضافة مسؤول جديد للفريق!',
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route GET /api/admin/team
export const getTeam = async (req: Request, res: Response): Promise<void> => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-passwordHash');
    res.json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route GET /api/admin/settings
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    let settings = await SiteSettings.findOne();
    if (!settings) {
      // Default settings if none exist
      settings = await SiteSettings.create({
        bookPackages: [
          { id: 'color', label: 'قصة ملونة', price: 65, emoji: '🌈', desc: 'كتاب ملون بالكامل بجودة عالية' },
          { id: 'coloring', label: 'دفتر تلوين', price: 50, emoji: '🖍️', desc: 'رسومات غير ملونة جاهزة للتلوين' },
          { id: 'audio', label: 'ملف صوتي (Audio)', price: 30, emoji: '🎧', desc: 'تسجيل صوتي احترافي لقصتك' },
          { id: 'ebook', label: 'نسخة رقمية (E-Book)', price: 40, emoji: '📱', desc: 'كتاب إلكتروني للقراءة على الأجهزة' },
          { id: 'pro', label: 'باقة Pro الشاملة', price: 100, emoji: '✨', desc: 'جميع النسخ (الملون + التلوين + الصوتي + الرقمي)' },
        ],
        themes: [
          { id: 'adventure', emoji: '🗺️', label: 'مغامرة', desc: 'استكشاف ومغامرات مثيرة' },
          { id: 'space', emoji: '🚀', label: 'الفضاء', desc: 'رحلات بين النجوم والكواكب' },
        ]
      });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route PUT /api/admin/settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookPackages, themes } = req.body;
    let settings = await SiteSettings.findOne();
    
    if (!settings) {
      settings = new SiteSettings({ bookPackages, themes });
    } else {
      if (bookPackages) settings.bookPackages = bookPackages;
      if (themes) settings.themes = themes;
    }
    
    await settings.save();
    res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح', settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};
