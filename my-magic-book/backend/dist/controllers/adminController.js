"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllOrders = exports.updateSettings = exports.getSettings = exports.getTeam = exports.addAdmin = exports.deleteStory = exports.updateStory = exports.getAllStories = void 0;
const User_1 = __importDefault(require("../models/User"));
const Story_1 = __importDefault(require("../models/Story"));
const Order_1 = __importDefault(require("../models/Order"));
const SiteSettings_1 = __importDefault(require("../models/SiteSettings"));
// @route GET /api/admin/stories
// @desc Get all stories from all users
const getAllStories = async (req, res) => {
    try {
        const stories = await Story_1.default.find().sort({ createdAt: -1 }).populate('userId', 'name email');
        res.json({ success: true, stories });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في جلب القصص' });
    }
};
exports.getAllStories = getAllStories;
// @route PUT /api/admin/stories/:id
// @desc Update any story
const updateStory = async (req, res) => {
    try {
        const story = await Story_1.default.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
        if (!story) {
            res.status(404).json({ success: false, message: 'القصة غير موجودة' });
            return;
        }
        res.json({ success: true, story });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في تحديث القصة' });
    }
};
exports.updateStory = updateStory;
// @route DELETE /api/admin/stories/:id
// @desc Delete a story
const deleteStory = async (req, res) => {
    try {
        const story = await Story_1.default.findByIdAndDelete(req.params.id);
        if (!story) {
            res.status(404).json({ success: false, message: 'القصة غير موجودة' });
            return;
        }
        res.json({ success: true, message: 'تم حذف القصة بنجاح' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في حذف القصة' });
    }
};
exports.deleteStory = deleteStory;
// @route POST /api/admin/team
const addAdmin = async (req, res) => {
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
        const admin = await User_1.default.create({ name, email, passwordHash: password, role: 'admin' });
        res.status(201).json({
            success: true,
            message: 'تم إضافة مسؤول جديد للفريق!',
            admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.addAdmin = addAdmin;
// @route GET /api/admin/team
const getTeam = async (req, res) => {
    try {
        const admins = await User_1.default.find({ role: 'admin' }).select('-passwordHash');
        res.json({ success: true, admins });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.getTeam = getTeam;
// @route GET /api/admin/settings
const getSettings = async (req, res) => {
    try {
        let settings = await SiteSettings_1.default.findOne();
        if (!settings) {
            // Default settings if none exist
            settings = await SiteSettings_1.default.create({
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
                    { id: 'ocean', emoji: '🌊', label: 'المحيط', desc: 'عالم سحري تحت الماء' },
                    { id: 'school_hero', emoji: '🏫', label: 'بطل المدرسة', desc: 'مساعدة الآخرين ونشر اللطف والألوان في المدرسة' },
                ]
            });
        }
        else {
            // Dynamically auto-inject school_hero if it's not present in existing settings
            const hasSchool = settings.themes.some((t) => t.id === 'school_hero');
            if (!hasSchool) {
                settings.themes.push({
                    id: 'school_hero',
                    emoji: '🏫',
                    label: 'بطل المدرسة',
                    desc: 'مساعدة الآخرين ونشر اللطف والألوان في المدرسة',
                    pages: [
                        { text: "استيقظ {{name}} بنشاط كبير، وارتدى حقيبته المفضلة وانطلق نحو مدرسته الجميلة وهو يبتسم للكائنات من حوله.", imageSrc: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop" },
                        { text: "عندما وصل {{name}}، تفاجأ بأن الألوان قد اختفت تماماً من لوحات وجدران المدرسة! كانت تبدو حزينة باللونين الأبيض والأسود.", imageSrc: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop" },
                        { text: "لم يستسلم {{name}}، بل قرر أن يكتشف السر ويستخدم \"أقلامه السحرية\" ولطفه ليعيد الحياة والبهجة لمدرسته.", imageSrc: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800&auto=format&fit=crop" },
                        { text: "في فصل العلوم، وجد صديقه سامي حزيناً لأن تجربة البركان لم تنجح، فساعده {{name}} بلمسة ذكية من خياله لتنفجر الألوان مجدداً.", imageSrc: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=800&auto=format&fit=crop" },
                        { text: "دخل {{name}} المكتبة، فسمع الكتب تهمس بحزن، وتطلب من أحد أن يرتبها لتعود الحكايات والقصص إلى مكانها الصحيح.", imageSrc: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=800&auto=format&fit=crop" },
                        { text: "نادى {{name}} زملاءه، وبدأوا جميعاً in ترتيب الكتب بانتظام وهم يغنون أجمل الألحان، ليعود الدفء إلى زوايا المكتبة.", imageSrc: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop" },
                        { text: "في ساحة اللعب، سمع {{name}} مواءً رقيقاً؛ لقد كانت هناك قطة صغيرة خائفة وعالقة فوق غصن شجرة المدرسة العالية.", imageSrc: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=800&auto=format&fit=crop" },
                        { text: "بلا تردد، جمع {{name}} المكعبات الملونة الكبيرة وبنى منها سلماً آمناً، وتلقى القطة بلطف ليعيدها إلى الأرض بسلام.", imageSrc: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?q=80&w=800&auto=format&fit=crop" },
                        { text: "في وقت الاستراحة، رأى {{name}} طفلاً جديداً يجلس بمفرده، فذهب إليه وتشارك معه طعامه، ليعرف أن اللطف هو القوة الخارقة الحقيقية.", imageSrc: "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=800&auto=format&fit=crop" },
                        { text: "في حصة الفن، وبإذن من المعلمة، بدأ {{name}} يرسم أحلام التلاميذ على الجدران، وفجأة.. بدأت الألوان الزاهية تعود للمدرسة كلها!", imageSrc: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800&auto=format&fit=crop" },
                        { text: "في نهاية اليوم الدراسي، صفق الجميع بحرارة لـ {{name}}، وقدم له مدير المدرسة وسام \"البطل الصغير\" تقديراً لشجاعته وجمال روحه.", imageSrc: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop" },
                        { text: "عاد {{name}} إلى البيت مسرعاً، وحكى لوالدته بفخر كيف أن المدرسة ليست مجرد دروس، بل هي مكان للمغامرة ومساعدة الآخرين.", imageSrc: "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=800&auto=format&fit=crop" },
                        { text: "وضع {{name}} وسامه اللامع بجانب سريره، وأغلق عينيه وهو يتشوق ليوم دراسي جديد مليء بالمفاجآت السعيدة.", imageSrc: "https://images.unsplash.com/photo-1505678261036-a3fcc5e884ee?q=80&w=800&auto=format&fit=crop" }
                    ]
                });
                settings.markModified('themes');
                await settings.save();
            }
        }
        res.json({ success: true, settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.getSettings = getSettings;
// @route PUT /api/admin/settings
const updateSettings = async (req, res) => {
    try {
        const { bookPackages, themes } = req.body;
        let settings = await SiteSettings_1.default.findOne();
        if (!settings) {
            settings = new SiteSettings_1.default({ bookPackages, themes });
        }
        else {
            if (bookPackages) {
                settings.bookPackages = bookPackages;
                settings.markModified('bookPackages');
            }
            if (themes) {
                settings.themes = themes;
                settings.markModified('themes');
            }
        }
        await settings.save();
        res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح', settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
};
exports.updateSettings = updateSettings;
// @route GET /api/admin/orders
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order_1.default.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'name email')
            .populate('storyId');
        res.json({ success: true, orders });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'فشل في جلب الطلبات' });
    }
};
exports.getAllOrders = getAllOrders;
//# sourceMappingURL=adminController.js.map