import { Request, Response } from 'express';
import User from '../models/User';
import Story from '../models/Story';
import Order from '../models/Order';
import SiteSettings from '../models/SiteSettings';
import { buildBookForOrder } from '../services/BookBuilder';
import { generateIllustration, COST_PER_IMAGE_USD } from '../services/ImageGenerator';
import { buildIllustrationPrompt, buildPhotorealPrompt, buildCoverPrompt } from '../services/promptBuilder';
import { swapFace } from '../services/FaceSwapService';
import { buildScenePrompt, buildColoringCoverPrompt, buildColoringBackCoverPrompt, COLORING_PAGES } from '../services/sceneTemplates';

// The kid photo (already in the bucket) used as the reference face for ADMIN
// PREVIEW generation only. Real customer orders use the customer's own photo.
const PREVIEW_REFERENCE_PHOTO =
  process.env.PREVIEW_REFERENCE_PHOTO ||
  'gs://first-webapp-storage/magic-fanoose/child-photos/93a8030b-750b-4f91-943d-0d1423a09137.jpeg';

const PREVIEW_IMAGE_PAGES = 13;

function substituteName(s: string, name: string): string {
  return (s || '')
    .replace(/\[NAME\]/gi, name)
    .replace(/\{\{\s*name\s*\}\}/gi, name)
    .replace(/\{\s*name\s*\}/gi, name);
}

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
          { id: 'adventure', emoji: '🗺️', label: 'مغامرة', desc: 'استكشاف ومغامرات مثيرة', ready: false },
          { id: 'space', emoji: '🚀', label: 'الفضاء', desc: 'رحلات بين النجوم والكواكب', ready: false },
          { id: 'ocean', emoji: '🌊', label: 'المحيط', desc: 'عالم سحري تحت الماء', ready: false },
          { id: 'school_hero', emoji: '🏫', label: 'بطل المدرسة', desc: 'مساعدة الآخرين ونشر اللطف والألوان في المدرسة', ready: true },
        ]
      });
    } else {
      // Dynamically auto-inject school_hero if it's not present in existing settings
      const hasSchool = settings.themes.some((t: any) => t.id === 'school_hero');
      if (!hasSchool) {
        settings.themes.push({
          id: 'school_hero',
          emoji: '🏫',
          label: 'بطل المدرسة',
          desc: 'مساعدة الآخرين ونشر اللطف والألوان في المدرسة',
          ready: true,
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route GET /api/public/settings
// @desc  Customer-facing settings: hides unready themes so half-finished stories
//        never appear in the wizard.
export const getPublicSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await SiteSettings.findOne();
    if (!settings) {
      res.json({ success: true, settings: { bookPackages: [], themes: [] } });
      return;
    }
    const filtered = {
      bookPackages: settings.bookPackages,
      themes: settings.themes.filter((t: any) => t.ready === true),
    };
    res.json({ success: true, settings: filtered });
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route GET /api/admin/orders
export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .populate('storyId');
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الطلبات' });
  }
};

// @route POST /api/admin/orders/:id/build
// @desc  Manually mark an order paid (if needed) and kick the BookBuilder.
//        This is the pre-Stripe escape hatch — use only after confirming the
//        customer paid by another channel.
export const buildOrderBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: 'order not found' });
      return;
    }
    if (order.paymentStatus !== 'paid') {
      if (req.body?.markPaid === true) {
        order.paymentStatus = 'paid';
        await order.save();
      } else {
        res.status(409).json({
          success: false,
          message: `order ${order._id} is ${order.paymentStatus}. POST {markPaid:true} to override.`,
        });
        return;
      }
    }
    // Run synchronously so the admin sees success/failure in the response.
    const updated = await buildBookForOrder(String(order._id));
    res.json({ success: true, order: updated });
  } catch (err: any) {
    console.error('buildOrderBook failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/admin/themes/:themeId/generate-illustrations
// @desc  ADMIN PREVIEW ONLY. Generates 13 body illustrations + 1 back-cover
//        portrait for a theme via Nano Banana, using the bucket reference photo.
//        Caches the GCS object paths on the theme so reopening the book is free.
//        Real customer orders generate per-order via BookBuilder (different path).
export const generatePreviewIllustrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { themeId } = req.params;
    const force = req.body?.force === true;

    const settings = await SiteSettings.findOne();
    if (!settings) {
      res.status(404).json({ success: false, message: 'settings not found' });
      return;
    }
    const theme: any = settings.themes.find((t: any) => t.id === themeId);
    if (!theme) {
      res.status(404).json({ success: false, message: `theme ${themeId} not found` });
      return;
    }

    // Already generated? Return the cache unless force-refresh requested.
    if (!force && theme.generatedImages && theme.generatedImages.length > 0) {
      res.json({
        success: true,
        cached: true,
        generatedImages: theme.generatedImages,
        generatedPortrait: theme.generatedPortrait,
        generatedCover: theme.generatedCover,
      });
      return;
    }

    const childName = req.body?.childName || theme.label || 'الطفل';

    // Pull the text from the theme's pages (text entries only).
    const textPages: string[] = (theme.pages || [])
      .filter((p: any) => p && (p.text || typeof p === 'string'))
      .map((p: any) => substituteName(p.text || p, childName));

    const generatedImages: string[] = [];
    for (let i = 0; i < PREVIEW_IMAGE_PAGES; i++) {
      const pageText = textPages[i] || textPages[textPages.length - 1] || `${childName} ${theme.label}`;
      const prompt = buildIllustrationPrompt({
        pageText,
        childName,
        childAge: '5',
        childGender: 'male',
        theme: themeId,
        language: 'ar',
        pageNumber: i + 1,
      });
      const stored = await generateIllustration(prompt, PREVIEW_REFERENCE_PHOTO, {
        storyId: `theme_${themeId}`,
        pageNumber: i + 1,
      });
      generatedImages.push(stored.objectPath);
    }

    // Persist the body images immediately so a later portrait/cover hiccup
    // can't waste the 13 we already paid for.
    theme.generatedImages = generatedImages;
    settings.markModified('themes');
    await settings.save();

    // Back-cover hero portrait — a clean, smiling close-up of the kid.
    const portraitPrompt =
      `High-quality 3D rendered Pixar / DreamWorks style children's book back-cover portrait of ${childName}, ` +
      `a happy 5-year-old with a photorealistic recognizable face that closely matches the reference photo, ` +
      `warm smile, looking at the camera, soft cinematic studio lighting, gentle bokeh background in the ${theme.label} theme, ` +
      `rich vibrant saturated colors, professional CGI render quality. Centered. No text, no watermark.`;
    try {
      const portrait = await generateIllustration(portraitPrompt, PREVIEW_REFERENCE_PHOTO, {
        storyId: `theme_${themeId}`,
        pageNumber: 99,
      });
      theme.generatedPortrait = portrait.objectPath;
    } catch (e: any) {
      console.warn('[generatePreview] portrait failed:', e.message);
    }

    // Full-scene front cover — the hero kid inside the themed world (Taletoons
    // style). Uses concrete per-theme background objects (zoo => animals,
    // school => classroom/blackboard, space => planets/rocket, etc.).
    const coverPrompt = buildCoverPrompt({
      childName,
      childGender: 'male',
      theme: themeId,
    });
    try {
      const cover = await generateIllustration(coverPrompt, PREVIEW_REFERENCE_PHOTO, {
        storyId: `theme_${themeId}`,
        pageNumber: 0,
      });
      theme.generatedCover = cover.objectPath;
    } catch (e: any) {
      console.warn('[generatePreview] cover failed:', e.message);
    }

    settings.markModified('themes');
    await settings.save();

    // Count what we actually produced this run for the cost estimate.
    const imageCount =
      generatedImages.length +
      (theme.generatedPortrait ? 1 : 0) +
      (theme.generatedCover ? 1 : 0);
    const estimatedCostUsd = Number((imageCount * COST_PER_IMAGE_USD).toFixed(2));

    res.json({
      success: true,
      cached: false,
      generatedImages,
      generatedPortrait: theme.generatedPortrait,
      generatedCover: theme.generatedCover,
      imageCount,
      estimatedCostUsd,
    });
  } catch (err: any) {
    console.error('generatePreviewIllustrations failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/admin/themes/:themeId/generate-photoreal
// @desc  STYLE B (Taletoons): (1) generate/cache 13 PHOTOREALISTIC template scenes
//        for the theme [one-time], (2) face-swap the reference photo onto each +
//        cover + portrait, (3) store the swapped results as the displayed images.
//        Templates are cached so re-runs only re-swap (cheap/free).
/**
 * Generate a COLORING-BOOK preview for a theme: a colored front cover + 16
 * line-art pages + a colored back cover, using the admin-typed scenes and an
 * uploaded reference photo. Only runs when the admin clicks "Generate" (paid).
 */
export const generateColoringPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { themeId } = req.params;
    const settings = await SiteSettings.findOne();
    if (!settings) { res.status(404).json({ success: false, message: 'settings not found' }); return; }
    const theme: any = settings.themes.find((t: any) => t.id === themeId);
    if (!theme) { res.status(404).json({ success: false, message: `theme ${themeId} not found` }); return; }

    // Scenes: prefer the ones sent in the request (just typed), else saved ones.
    const scenes: string[] = ((req.body?.coloringScenes && req.body.coloringScenes.length)
      ? req.body.coloringScenes : theme.coloringScenes) || [];
    const cleanScenes = scenes.map((s: string) => (s || '').trim()).filter(Boolean);
    if (cleanScenes.length < 1) {
      res.status(400).json({ success: false, message: 'Add the page scenes before generating.' });
      return;
    }
    const coverScene: string = req.body?.coloringCoverScene || theme.coloringCoverScene || `exploring ${theme.label}`;
    const backScene: string = req.body?.coloringBackCoverScene || theme.coloringBackCoverScene || 'waving goodbye happily';
    const referencePhoto: string = req.body?.referencePhoto || PREVIEW_REFERENCE_PHOTO;
    const childName: string = req.body?.childName || theme.label || 'الطفل';
    const childGender: 'male' | 'female' = req.body?.childGender === 'female' ? 'female' : 'male';

    // Persist the scenes + mark as coloring so they survive.
    theme.coloringScenes = scenes;
    theme.coloringCoverScene = coverScene;
    theme.coloringBackCoverScene = backScene;
    theme.isColoring = true;

    // 1) colored front cover
    const cover = await generateIllustration(
      buildColoringCoverPrompt(coverScene, childName, childGender),
      referencePhoto, { storyId: `theme_${themeId}`, pageNumber: 0 });

    // 2) 16 line-art pages
    const generatedImages: string[] = [];
    for (let i = 0; i < COLORING_PAGES; i++) {
      const scene = cleanScenes[i] || cleanScenes[cleanScenes.length - 1];
      const img = await generateIllustration(
        buildScenePrompt('page', scene, childName, childGender, { coloring: true }),
        referencePhoto, { storyId: `theme_${themeId}`, pageNumber: i + 1 });
      generatedImages.push(img.objectPath);
    }

    // 3) colored back cover
    const back = await generateIllustration(
      buildColoringBackCoverPrompt(backScene, childName, childGender),
      referencePhoto, { storyId: `theme_${themeId}`, pageNumber: 98 });

    theme.generatedCover = cover.objectPath;
    theme.generatedImages = generatedImages;
    theme.generatedPortrait = back.objectPath;
    settings.markModified('themes');
    await settings.save();

    const imageCount = generatedImages.length + 2;
    res.json({
      success: true,
      cached: false,
      imageCount,
      estimatedCostUsd: Number((imageCount * COST_PER_IMAGE_USD).toFixed(2)),
      generatedCover: theme.generatedCover,
      generatedImages: theme.generatedImages,
      generatedPortrait: theme.generatedPortrait,
    });
  } catch (err: any) {
    console.error('[generateColoringPreview]', err);
    res.status(500).json({ success: false, message: err.message || 'generation failed' });
  }
};

export const generatePhotorealPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const { themeId } = req.params;
    const forceTemplates = req.body?.forceTemplates === true;

    const settings = await SiteSettings.findOne();
    if (!settings) {
      res.status(404).json({ success: false, message: 'settings not found' });
      return;
    }
    const theme: any = settings.themes.find((t: any) => t.id === themeId);
    if (!theme) {
      res.status(404).json({ success: false, message: `theme ${themeId} not found` });
      return;
    }

    const childName = req.body?.childName || theme.label || 'الطفل';
    const referencePhoto: string = req.body?.referencePhoto || PREVIEW_REFERENCE_PHOTO;
    const textPages: string[] = (theme.pages || [])
      .filter((p: any) => p && (p.text || typeof p === 'string'))
      .map((p: any) => substituteName(p.text || p, childName));

    // ── Step 1: photoreal templates (one-time, cached) ──────────────────────
    let templatesGenerated = 0;
    if (forceTemplates || !theme.photorealTemplates || theme.photorealTemplates.length === 0) {
      const templates: string[] = [];
      for (let i = 0; i < PREVIEW_IMAGE_PAGES; i++) {
        const prompt = buildPhotorealPrompt({
          pageText: textPages[i] || textPages[textPages.length - 1] || `${childName} ${theme.label}`,
          childName, childAge: '5', childGender: 'male',
          theme: theme.label, language: 'ar', pageNumber: i + 1,
        });
        const t = await generateIllustration(prompt, referencePhoto, { storyId: `tmpl_${themeId}`, pageNumber: i + 1 });
        templates.push(t.objectPath);
        templatesGenerated++;
      }
      // cover + portrait templates
      const coverT = await generateIllustration(
        buildPhotorealPrompt({ pageText: `${childName} hero portrait`, childName, childAge: '5', childGender: 'male', theme: theme.label, language: 'ar', pageNumber: 0 }),
        referencePhoto, { storyId: `tmpl_${themeId}`, pageNumber: 0 });
      const portraitT = await generateIllustration(
        buildPhotorealPrompt({ pageText: `${childName} close-up smiling portrait`, childName, childAge: '5', childGender: 'male', theme: theme.label, language: 'ar', pageNumber: 99 }),
        referencePhoto, { storyId: `tmpl_${themeId}`, pageNumber: 99 });
      templatesGenerated += 2;

      theme.photorealTemplates = templates;
      theme.photorealCover = coverT.objectPath;
      theme.photorealPortrait = portraitT.objectPath;
      settings.markModified('themes');
      await settings.save();
    }

    // ── Step 2: face-swap the real photo onto every template ────────────────
    const swappedImages: string[] = [];
    for (let i = 0; i < theme.photorealTemplates.length; i++) {
      const sw = await swapFace(referencePhoto, `gs://${process.env.GCS_BUCKET_NAME}/${theme.photorealTemplates[i]}`, {
        storyId: `sb_${themeId}`, pageNumber: i + 1,
      });
      swappedImages.push(sw.objectPath);
    }
    let swapCover: string | undefined;
    let swapPortrait: string | undefined;
    if (theme.photorealCover) {
      const c = await swapFace(referencePhoto, `gs://${process.env.GCS_BUCKET_NAME}/${theme.photorealCover}`, { storyId: `sb_${themeId}`, pageNumber: 0 });
      swapCover = c.objectPath;
    }
    if (theme.photorealPortrait) {
      const p = await swapFace(referencePhoto, `gs://${process.env.GCS_BUCKET_NAME}/${theme.photorealPortrait}`, { storyId: `sb_${themeId}`, pageNumber: 98 });
      swapPortrait = p.objectPath;
    }

    // ── Step 3: store swapped results in the display fields ──────────────────
    theme.generatedImages = swappedImages;
    theme.generatedCover = swapCover;
    theme.generatedPortrait = swapPortrait;
    theme.previewStyle = 'photoreal';
    settings.markModified('themes');
    await settings.save();

    res.json({
      success: true,
      style: 'photoreal',
      templatesGenerated,            // Gemini images produced this run (cost)
      swaps: swappedImages.length + (swapCover ? 1 : 0) + (swapPortrait ? 1 : 0),
      estimatedCostUsd: Number((templatesGenerated * COST_PER_IMAGE_USD).toFixed(2)),
      generatedImages: swappedImages,
      generatedCover: swapCover,
      generatedPortrait: swapPortrait,
    });
  } catch (err: any) {
    console.error('generatePhotorealPreview failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
