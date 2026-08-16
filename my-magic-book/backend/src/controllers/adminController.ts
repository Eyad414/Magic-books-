import { Request, Response } from 'express';
import User from '../models/User';
import Story from '../models/Story';
import Order from '../models/Order';
import SiteSettings, { DEFAULT_HOME_STATS } from '../models/SiteSettings';
import ContactMessage from '../models/ContactMessage';
import { pollPaymentsOnce } from '../services/PaymentPoller';
import { arabicStoryPages, buildBookForOrder, reRenderPrintFilesForOrder, submitOrderToBookPod, reRenderColoringForOrder, submitColoringForOrder, buildPreviewPrintFiles, submitPreviewToBookPod } from '../services/BookBuilder';
import { generateIllustration, COST_PER_IMAGE_USD } from '../services/ImageGenerator';
import { buildIllustrationPrompt, buildPhotorealPrompt, buildCoverPrompt } from '../services/promptBuilder';
import { swapFace } from '../services/FaceSwapService';
import { buildScenePrompt, buildColoringCoverPrompt, buildColoringBackCoverPrompt, COLORING_PAGES, SCENE_TEMPLATES } from '../services/sceneTemplates';
import { reimposePdf, splitCoverInterior } from '../services/BookImportService';
import { uploadBuffer, pdfFolderPath, listObjects, deleteObject } from '../services/StorageService';
import { submitPrintJob, isBookPodConfigured } from '../services/BookPodService';

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

// @route GET /api/admin/messages
// @desc List customer contact-form messages (newest first) for the admin inbox
export const listMessages = async (_req: Request, res: Response): Promise<void> => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, messages });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route DELETE /api/admin/messages/:id
// @desc Remove a contact message from the inbox
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route GET /api/admin/customer?email=<email>
// @desc  Full customer profile for a contact message: their account (if
//        registered), their orders/books, their stories, and all their
//        messages — so the admin can see everything about one person.
export const getCustomerByEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = String(req.query.email || '').toLowerCase().trim();
    if (!email) { res.status(400).json({ success: false, message: 'email required' }); return; }

    const user = await User.findOne({ email }).select('-passwordHash').lean();
    const messages = await ContactMessage.find({ email }).sort({ createdAt: -1 }).lean();

    let orders: any[] = [];
    let storiesCount = 0;
    if (user) {
      orders = await Order.find({ userId: user._id })
        .populate('storyId', 'childName theme bookPackage')
        .sort({ createdAt: -1 })
        .lean();
      storiesCount = await Story.countDocuments({ userId: user._id });
    }

    res.json({
      success: true,
      customer: {
        email,
        user,               // null if this sender never created an account
        orders,
        ordersCount: orders.length,
        storiesCount,
        messages,
        messagesCount: messages.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

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
// Promote an EXISTING registered user to admin by email. No password here —
// the person keeps the password they signed up with (the owner never sees it).
export const addAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'يرجى إدخال البريد الإلكتروني' });
      return;
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      res.status(404).json({ success: false, message: 'هذا البريد غير مسجّل — اطلب من الشخص إنشاء حساب أولاً' });
      return;
    }
    if (user.role === 'admin') {
      res.status(409).json({ success: false, message: 'هذا المستخدم مسؤول بالفعل' });
      return;
    }

    user.role = 'admin';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'تمت إضافة المسؤول للفريق!',
      admin: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// Remove someone from the admin team (demote to a normal user; keep the account).
export const removeAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const requesterId = String((req as any).user._id);
    if (id === requesterId) {
      res.status(400).json({ success: false, message: 'لا يمكنك إزالة نفسك' });
      return;
    }
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
      return;
    }
    user.role = 'user';
    await user.save();
    res.json({ success: true });
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

      // Auto-inject / repair the "magic_book" theme (story text lives in
      // translation.json stories.magic_book; these pages drive image prompts).
      // Its demo illustrations (Baha) are pre-generated in GCS.
      const mbFolder = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
      const mbCover = `${mbFolder}/generated/theme_magic_book/page-00.png`;
      const mbImages = Array.from({ length: 13 }, (_, i) => `${mbFolder}/generated/theme_magic_book/page-${String(i + 1).padStart(2, '0')}.png`);
      const mbTheme: any = settings.themes.find((t: any) => t.id === 'magic_book');
      if (mbTheme && (!mbTheme.generatedImages || mbTheme.generatedImages.length === 0)) {
        // Theme already exists but has no demo images yet — attach them.
        mbTheme.generatedCover = mbCover;
        mbTheme.generatedImages = mbImages;
        mbTheme.generatedPortrait = mbCover;
        mbTheme.ready = true;
        settings.markModified('themes');
        await settings.save();
      }
      if (!mbTheme) {
        settings.themes.push({
          id: 'magic_book',
          emoji: '📖',
          label: 'رحلة الكتاب المسحور',
          desc: 'مغامرة سحرية داخل عالم الكتب لإعادة الألوان والسعادة',
          ready: true,
          generatedCover: mbCover,
          generatedImages: mbImages,
          generatedPortrait: mbCover,
          pages: [
            { text: "في غرفةٍ صغيرةٍ مليئةٍ بالألعاب، كان {{name}} يجلس وحيداً يقلّب صفحات كتابٍ قديمٍ وجده في الخزانة. وفجأةً بدأت الصفحات تلمع بضوءٍ ذهبيٍّ غريب!", imageSrc: "" },
            { text: "\"يا إلهي!\" صرخ {{name}}. سحب الضوءُ يده ببطء، وفي لمح البصر وجد نفسه يطير داخل دوّامةٍ من الألوان والكلمات الطائرة.", imageSrc: "" },
            { text: "سقط {{name}} بلطفٍ على أرضٍ مصنوعةٍ من الورق. كانت الأشجار هناك أقلام تلوينٍ ضخمة، والسماء مرسومةً بألوانٍ مائيةٍ زاهية.", imageSrc: "" },
            { text: "ظهر أرنبٌ صغيرٌ يرتدي نظارةً ويحمل ريشة رسم، وقال: \"أهلاً بك يا {{name}} في عالم القصص! نحن بانتظارك منذ زمن.\"", imageSrc: "" },
            { text: "أخبر الأرنبُ {{name}} أنّ \"لون السعادة\" قد اختفى من الكتاب، وأنّ العالم يتحوّل إلى الأبيض والأسود، ولا يعيده إلا شجاعة طفلٍ حقيقي.", imageSrc: "" },
            { text: "بدأ {{name}} رحلته ووصل إلى \"نهر الحبر الأزرق\"، لكنّ الجسر كان مكسوراً. ففكّر بذكاء، وأمسك قلم رصاصٍ عملاقاً ورسم جسراً قوياً عبر به بسلام.", imageSrc: "" },
            { text: "في الغابة المظلمة، التقى {{name}} بومةً حكيمة سألته: \"ما أقوى شيءٍ في العالم؟\" فأجاب: \"الخيال!\". ابتسمت البومة وأعطته مفتاحاً مضيئاً.", imageSrc: "" },
            { text: "وصل {{name}} إلى جبل الحكايات. كان الطريق وعراً، لكنه تذكّر كلمات والدته عن الصبر، فواصل التسلّق حتى بلغ القمة.", imageSrc: "" },
            { text: "في القمة وجد {{name}} صندوقاً قديماً مغلقاً. استخدم المفتاح المضيء، وحين فتحه انطلقت آلاف الفراشات الملوّنة تلوّن كلّ ما تلمسه.", imageSrc: "" },
            { text: "بدأت الأشجار تكتسي بالأخضر، والأزهار بالأحمر، وعاد \"لون السعادة\" إلى العالم بفضل شجاعة {{name}}.", imageSrc: "" },
            { text: "اجتمعت كلّ شخصيات الكتاب للاحتفال، ورقص الأرنب والبومة مع {{name}}، وشكروه لأنه أنقذ عالمهم من الاختفاء.", imageSrc: "" },
            { text: "قال الأرنب: \"حان وقت العودة يا بطل، لكن تذكّر أنّ هذا الكتاب بيتك الثاني، وخيالك هو مفتاح الدخول.\" ولوّح {{name}} مودّعاً بينما ظهرت الدوّامة الذهبية لتأخذه.", imageSrc: "" },
            { text: "فتح {{name}} عينيه ليجد نفسه في غرفته والكتاب في حضنه. لم يعد يلمع، لكنّ قلبه امتلأ بالحماس. ابتسم وأغلقه، وهو يعلم أنّ مغامرته القادمة تسكن دائماً بين صفحات كتابه السحري.", imageSrc: "" }
          ]
        });
        settings.markModified('themes');
        await settings.save();
      }
      // Ocean Adventure — seeded as a DRAFT with no artwork; the owner presses
      // 🎨 when they want to pay for the images, then ticks "جاهزة" to publish.
      // Re-applied while it stays a draft so text edits in code reach the dash.
      const OCEAN_PAGES = [
        { text: "كَانَ{|تْ} [NAME] {يَلْعَبُ|تَلْعَبُ} عَلَى الشَّاطِئِ، فَوَجَدَ{|تْ} صَدَفَةً كَبِيرَةً تَلْمَعُ. وَضَعَ{هَا|تْهَا} عَلَى أُذُنِ{هِ|هَا}... فَسَمِعَ{|تْ} أُغْنِيَةً جَمِيلَةً، وَسَحَبَتْ{هُ|هَا} مَوْجَةٌ لَطِيفَةٌ إِلَى الْمَاءِ!", imageSrc: "" },
        { text: "فَتَحَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} تَحْتَ الْمَاءِ، وَه{ُوَ|ِيَ} {يَتَنَفَّسُ|تَتَنَفَّسُ} {وَيَتَكَلَّمُ|وَتَتَكَلَّمُ}! حَوْلَ{هُ|هَا} أَسْمَاكٌ مُلَوَّنَةٌ وَمَرْجَانٌ يُضِيءُ مِثْلَ الْمَصَابِيحِ.", imageSrc: "" },
        { text: "اِقْتَرَبَ حُوتٌ أَزْرَقُ ضَخْمٌ اسْمُهُ فُقَاعَة. لَكِنَّهُ لَطِيفٌ وَلَيْسَ مُخِيفاً. قَالَ بِحُزْنٍ: \"ضَاعَتْ أُغْنِيَتِي، وَلَا أَسْتَطِيعُ أَنْ أُنَادِيَ عَائِلَتِي!\"", imageSrc: "" },
        { text: "قَالَ فُقَاعَة: \"أُغْنِيَتِي فِي مَكَانٍ مَا فِي الْمُحِيطِ!\" فَكَّرَ{|تْ} [NAME] وَقَالَ{|تْ}: \"يَا بَطَل{|ةَ}! هَلْ نَبْحَثُ فِي الْوَادِي الْعَمِيقِ الْمُظْلِمِ، أَمْ نَرْكَبُ التَّيَّارَ السَّرِيعَ إِلَى حَدِيقَةِ الْمَرْجَانِ؟\"", imageSrc: "" },
        { text: "رَكِبَ{|تْ} [NAME] عَلَى ظَهْرِ فُقَاعَة بِشَجَاعَةٍ، وَسَبَحَا مَعاً بَيْنَ الْأَسْمَاكِ، وَالْفَقَاقِيعُ تَتَرَاقَصُ حَوْلَهُمَا.", imageSrc: "" },
        { text: "وَصَلَا إِلَى حَدِيقَةِ الْمَرْجَانِ، فَرَأَ{ى|تْ} [NAME] الصَّدَفَةَ الذَّهَبِيَّةَ دَاخِلَ مَغَارَةٍ ضَيِّقَةٍ. دَخَلَ{|تْ} بِهُدُوءٍ وَأَخْرَجَ{هَا|تْهَا} بِذَكَاءٍ.", imageSrc: "" },
        { text: "فَتَحَ فُقَاعَة فَمَهُ وَغَنَّى! رَجَعَتْ أُغْنِيَتُهُ، فَصَاحَ بِفَرَحٍ: \"شُكْراً يَا [NAME]! الْآنَ تَسْمَعُنِي عَائِلَتِي!\"", imageSrc: "" },
        { text: "أَخَذَ فُقَاعَة صَدِيقَ{هُ|تَهُ} إِلَى مَغَارَةٍ مَلِيئَةٍ بِالْمَرْجَانِ الْمُلَوَّنِ وَاللَّآلِئِ. يَا بَطَل{|ةَ}! هَلْ {تَجِدُ|تَجِدِينَ} حِصَانَ الْبَحْرِ الصَّغِيرَ الْمُخْتَبِئَ بَيْنَ الْمَرْجَانِ؟", imageSrc: "" },
        { text: "فَرِحَتِ الْأَسْمَاكُ بِذَكَاءِ [NAME]، وَرَقَصَتْ حَوْلَ{هُ|هَا}، وَقَدَّمَتْ {لَهُ|لَهَا} أَكْبَرَ لُؤْلُؤَةٍ فِي الْبَحْرِ!", imageSrc: "" },
        { text: "نَظَرَ{|تْ} [NAME] إِلَى الْأَعْلَى، فَرَأَ{ى|تْ} سَلَاحِفَ كَبِيرَةً تَسْبَحُ بِبُطْءٍ بَيْنَ أَشِعَّةِ الشَّمْسِ، وَقَنَادِيلَ بَحْرٍ تُضِيءُ مِثْلَ النُّجُومِ.", imageSrc: "" },
        { text: "أَعْطَى فُقَاعَة [NAME] صَدَفَةً صَغِيرَةً تُغَنِّي، لِ{يَتَذَكَّرَ|تَتَذَكَّرَ} دَائِماً أَنَّ{هُ|هَا} بَطَل{ٌ|ةٌ} وَصَدِيق{ٌ|َةٌ} لِلْبَحْرِ.", imageSrc: "" },
        { text: "أَغْمَضَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} وَتَمَنَّ{ى|تْ} الْعَوْدَةَ إِلَى الشَّاطِئِ. اِرْتَفَعَ{|تْ} بِبُطْءٍ مَعَ الْفَقَاقِيعِ، وَفُقَاعَة {يُوَدِّعُهُ|يُوَدِّعُهَا} بِأُغْنِيَةٍ جَمِيلَةٍ.", imageSrc: "" },
        { text: "فَتَحَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} عَلَى الشَّاطِئِ، وَالصَّدَفَةُ الصَّغِيرَةُ فِي يَدِ{هِ|هَا}. {عَرَفَ|عَرَفَتْ} أَنَّ مُسَاعَدَةَ الْأَصْدِقَاءِ تَصْنَعُ أَجْمَلَ الْمُغَامَرَاتِ!", imageSrc: "" },
      ];
      const oceanFolder = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
      const oceanBase = `${oceanFolder}/generated/theme_ocean_adventure`;
      const oceanArt = {
        generatedCover: `${oceanBase}/page-00.png`,
        generatedImages: Array.from({ length: 13 }, (_, i) => `${oceanBase}/page-${String(i + 1).padStart(2, '0')}.png`),
        generatedPortrait: `${oceanBase}/page-99.png`,
      };
      const oceanTheme: any = settings.themes.find((t: any) => t.id === 'ocean_adventure');
      if (!oceanTheme) {
        settings.themes.push({
          id: 'ocean_adventure', emoji: '🐋',
          label: 'مغامرة في أعماق المحيط', desc: 'رحلة ساحرة إلى عالم البحر',
          ready: true, pages: OCEAN_PAGES, ...oceanArt,
          series: 'sea', seriesName: 'سلسلة البحر', seriesPart: 1,
        });
        settings.markModified('themes');
        await settings.save();
      } else if (!oceanTheme.ready || !oceanTheme.generatedCover || oceanTheme.series !== 'sea' ||
                 JSON.stringify(oceanTheme.pages || []) !== JSON.stringify(OCEAN_PAGES)) {
        // Publish it and keep text/artwork in sync with the code.
        oceanTheme.ready = true;
        oceanTheme.pages = OCEAN_PAGES;
        oceanTheme.series = 'sea';
        oceanTheme.seriesName = 'سلسلة البحر';
        oceanTheme.seriesPart = 1;
        Object.assign(oceanTheme, oceanArt);
        settings.markModified('themes');
        await settings.save();
      }

      // Dinosaur Adventure — seeded so it shows up in the dashboard's Stories &
      // Themes tab. Left ready:false and with no demo images: the owner generates
      // the artwork with the 🎨 button, reviews it, then ticks "جاهزة" to publish.
      // Never re-seeded once present, so admin edits are not overwritten.
      const DINO_PAGES = [
        { text: "كَانَ{|تْ} [NAME] {يَلْعَبُ|تَلْعَبُ} فِي الْحَدِيقَةِ، فَوَجَدَ{|تْ} حَجَراً لَامِعاً كَبَيْضَةٍ كَبِيرَةٍ. لَمَسَ{هُ|تْهُ}... فَاهْتَزَّتِ الْأَرْضُ وَاخْتَفَتِ الْحَدِيقَةُ!", imageSrc: "" },
        { text: "فَتَحَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} فِي غَابَةٍ عَجِيبَةٍ، أَشْجَارُهَا عَالِيَةٌ جِدّاً. وَسَمِعَ{|تْ} خُطُوَاتٍ كَبِيرَةً تَهُزُّ الْأَرْضَ!", imageSrc: "" },
        { text: "ظَهَرَ دِينَاصُورٌ ضَخْمٌ اسْمُهُ تْرِيكْس! لَكِنَّهُ لَطِيفٌ وَلَيْسَ مُخِيفاً. يَلْبَسُ وِشَاحاً أَخْضَرَ، وَيَبْحَثُ بِحُزْنٍ عَنْ نَظَّارَتِهِ الضَّائِعَةِ.", imageSrc: "" },
        { text: "قَالَ تْرِيكْس: \"لَا أَرَى جَيِّداً بِدُونِ نَظَّارَتِي!\" فَكَّرَ{|تْ} [NAME] وَقَالَ{|تْ}: \"يَا بَطَل{|ةَ}! هَلْ نَبْحَثُ عَنْهَا مِنَ الْأَرْضِ عَلَى ظَهْرِ تْرِيكْس، أَمْ مِنَ السَّمَاءِ مَعَ الدِّينَاصُورِ الطَّائِرِ؟\"", imageSrc: "" },
        { text: "صَعِدَ{|تْ} [NAME] عَلَى ظَهْرِ تْرِيكْس بِشَجَاعَةٍ، وَمَشَيَا مَعاً فِي الْغَابَةِ يَبْحَثَانِ فِي كُلِّ مَكَانٍ.", imageSrc: "" },
        { text: "وَصَلَا إِلَى بُحَيْرَةٍ زَرْقَاءَ، فَرَأَ{ى|تْ} [NAME] النَّظَّارَةَ فَوْقَ شَجَرَةٍ عَالِيَةٍ! أَخَذَ{|تْ} غُصْناً طَوِيلاً وَأَنْزَلَ{هَا|تْهَا} بِذَكَاءٍ.", imageSrc: "" },
        { text: "لَبِسَ تْرِيكْس نَظَّارَتَهُ وَصَاحَ بِفَرَحٍ: \"شُكْراً يَا [NAME]! الْآنَ أَرَى أَصْدِقَائِي وَالْأَلْوَانَ مِنْ جَدِيدٍ!\"", imageSrc: "" },
        { text: "أَخَذَ تْرِيكْس صَدِيقَ{هُ|تَهُ} إِلَى كَهْفٍ سِرِّيٍّ فِيهِ رُسُومَاتٌ قَدِيمَةٌ عَجِيبَةٌ. يَا بَطَل{|ةَ}! هَلْ {تَجِدُ|تَجِدِينَ} بَيْضَةَ الدِّينَاصُورِ الْمُنَقَّطَةَ بَيْنَ الصُّخُورِ؟", imageSrc: "" },
        { text: "فَرِحَتِ الدِّينَاصُورَاتُ بِذَكَاءِ [NAME]، وَقَطَفَتْ {لَهُ|لَهَا} أَكْبَرَ فَرَاوْلَةٍ فِي الْعَالَمِ! كَانَتْ بِحَجْمِ الْبِطِّيخَةِ وَلَذِيذَةً جِدّاً.", imageSrc: "" },
        { text: "نَظَرَ{|تْ} [NAME] إِلَى الْجَبَلِ الْبَعِيدِ، فَرَأَ{ى|تْ} بُرْكَاناً عَجِيباً يَخْرُجُ مِنْهُ فَقَاقِيعُ صَابُونٍ مُلَوَّنَةٌ بَدَلاً مِنَ النَّارِ! فَضَحِكَ{|تْ} كَثِيراً.", imageSrc: "" },
        { text: "أَعْطَى تْرِيكْس [NAME] حَجَراً صَغِيراً عَلَيْهِ رَسْمُ قَلْبٍ، لِ{يَتَذَكَّرَ|تَتَذَكَّرَ} دَائِماً أَنَّ{هُ|هَا} بَطَل{ٌ|ةٌ} وَصَدِيق{ٌ|َةٌ} لِلدِّينَاصُورَاتِ.", imageSrc: "" },
        { text: "أَغْمَضَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} وَتَمَنَّ{ى|تْ} الْعَوْدَةَ إِلَى الْبَيْتِ. بَدَأَتِ الْأَشْجَارُ تَخْتَفِي بِبُطْءٍ، وَتْرِيكْس يُوَدِّعُ{هُ|هَا} بِلُطْفٍ.", imageSrc: "" },
        { text: "فَتَحَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} فِي حَدِيقَةِ الْبَيْتِ، وَالْحَجَرُ الصَّغِيرُ فِي يَدِ{هِ|هَا}. {عَرَفَ|عَرَفَتْ} أَنَّ الشَّجَاعَةَ تَقُودُ إِلَى أَجْمَلِ الْمُغَامَرَاتِ!", imageSrc: "" },
      ];
      const dinoFolder = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
      const dinoBase = `${dinoFolder}/generated/theme_dinosaur_adventure`;
      const dinoArt = {
        generatedCover: `${dinoBase}/page-00.png`,
        generatedImages: Array.from({ length: 13 }, (_, i) => `${dinoBase}/page-${String(i + 1).padStart(2, '0')}.png`),
        generatedPortrait: `${dinoBase}/page-99.png`,
      };
      const dinoTheme: any = settings.themes.find((t: any) => t.id === 'dinosaur_adventure');
      if (!dinoTheme) {
        settings.themes.push({
          id: 'dinosaur_adventure', emoji: '🦕',
          label: 'مغامرة مع الديناصورات', desc: 'رحلة عجيبة إلى عالم ما قبل التاريخ',
          ready: true, pages: DINO_PAGES, ...dinoArt,
        });
        settings.markModified('themes');
        await settings.save();
      } else if (!dinoTheme.ready || !dinoTheme.generatedCover ||
                 JSON.stringify(dinoTheme.pages || []) !== JSON.stringify(DINO_PAGES)) {
        // Publish it and keep text/artwork in sync with the code.
        dinoTheme.ready = true;
        dinoTheme.pages = DINO_PAGES;
        Object.assign(dinoTheme, dinoArt);
        settings.markModified('themes');
        await settings.save();
      }

      // Toy City — showcase story promoted to a real orderable theme. Scene
      // template lives in sceneTemplates.ts; text mirrors the ar locale.
      const TOY_PAGES = [
        { text: "بَيْنَمَا كَان{َ|َتْ} [NAME] {يُرَتِّبُ|تُرَتِّبُ} غُرْفَتَ{هُ|هَا}، أَضَاءَتْ سَيَّارَةُ السِّبَاقِ الصَّغِيرَةُ بِنُورٍ ذَهَبِيٍّ وَفَتَحَتْ بَابًا سِحْرِيًّا سَحَبَ{هُ|هَا} إِلَى مَدِينَةِ الْأَلْعَابِ!", imageSrc: "" },
        { text: "سَقَطَ{|تْ} [NAME] بِلُطْفٍ عَلَى شَارِعٍ مَصْنُوعٍ مِنْ مَسَارَاتِ السِّبَاقِ السَّرِيعَةِ، وَكَانَتِ الْبُيُوتُ حَوْلَ{هُ|هَا} مَبْنِيَّةً مِنْ مُكَعَّبَاتِ اللِّيغُو الْمُلَوَّنَةِ.", imageSrc: "" },
        { text: "قَابَلَ{|تْ} [NAME] رُوبُوتًا صَغِيرًا يُدْعَى تِيكِي كَانَ مُتَوَقِّفًا عَنِ الْحَرَكَةِ. قَالَ تِيكِي بِصَوْتٍ ضَعِيفٍ: أَحْتَاجُ إِلَى بَطَّارِيَةِ الِابْتِسَامَاتِ لِأَعْمَلَ مِنْ جَدِيدٍ!", imageSrc: "" },
        { text: "أَشَارَ تِيكِي إِلَى طَرِيقَيْنِ: يَا بَطَلَ{ةُ|} هَلْ نَرْكَبُ قِطَارَ الدِّبَبَةِ السَّرِيعَ أَمْ نَتَسَلَّقُ بُرْجَ الْمُكَعَّبَاتِ الْعَالِيَ؟ اخْتَارِ{|ي} طَرِيقَكِ بِذَكَاءٍ يَا [NAME]!", imageSrc: "" },
        { text: "قَرَّرَ{|تْ} [NAME] تَسَلُّقَ بُرْجِ الْمُكَعَّبَاتِ. عِنْدَمَا بَدَأَ الْبُرْجُ يَهْتَزُّ، أَسْرَعَتِ الطَّائِرَاتُ الْوَرَقِيَّةُ وَأَمْسَكَتْ بِيَدِ{هِ|هَا} لِ{يَ|تَ}صِلَ{|إِلَى} الْقِمَّةَ بِكُلِّ شَجَاعَةٍ.", imageSrc: "" },
        { text: "وَجَدَ{|تْ} [NAME] الْبَطَّارِيَةَ فِي أَعْلَى الْبُرْجِ لَكِنَّهَا كَانَتْ مُطْفَأَةً. تَذَكَّرَ{|تْ} كَلَامَ تِيكِي، فَابْتَسَمَ{|تْ} لَهَا بِصِدْقٍ، وَفَجْأَةً أَضَاءَتِ الْبَطَّارِيَةُ بِأَنْوَارٍ مُلَوَّنَةٍ!", imageSrc: "" },
        { text: "رَكَضَ{|تْ} [NAME] وَأَعْطَ{ى|تْ} الْبَطَّارِيَةَ لِتِيكِي، فَقَفَزَ الرُّوبُوتُ فَرِحًا وَبَدَأَ يَرْقُصُ وَيَشْكُرُ صَدِيقَ{هُ|ها} الذَّكِيَّةَ.", imageSrc: "" },
        { text: "أَخَذَ{هُ|هَا} تِيكِي فِي جَوْلَةٍ دَاخِلَ مَصْنَعِ الْأَلْعَابِ الْعَجِيبِ حَيْثُ تَتَحَوَّلُ الْأَفْكَارُ إِلَى أَلْعَابٍ حَقِيقِيَّةٍ. هَلْ يُمْكِنُكَ الْعُثُورُ عَلَى الْمِفْتَاحِ الْفِضِّيِّ الصَّغِيرِ الْمَخْبُوءِ بَيْنَ الْآلَاتِ؟", imageSrc: "" },
        { text: "وَجَدَ{|تْ} [NAME] عَرُوسَةً قُمَاشِيَّةً مَكْسُورَةً وَحَزِينَةً، فَاسْتَخْدَمَ{|تْ} ذَكَاءَ{هُ|هَا} الْهَنْدَسِيَّ وَمَهَارَتَ{هُ|هَا} وَقَامَ{|تْ} بِإِصْلَاحِهَا بِهُدُوءٍ وَلُطْفٍ.", imageSrc: "" },
        { text: "ابْتَسَمَتِ الْعَرُوسَةُ وَقَدَّمَتْ لِـ [NAME] مِفْتَاحَ الْأَلْعَابِ الذَّهَبِيَّ الَّذِي يَمْنَحُ{هُ|هَا} الْقُدْرَةَ عَلَى الْعِنَايَةِ بِأَلْعَابِ{هِ|هَا} دَائِمًا.", imageSrc: "" },
        { text: "احْتِفَالًا بِـ [NAME]، نَظَّمَتِ الْمَدِينَةُ سِبَاقًا خُرَافِيًّا، وَكَانَ{|تْ} بَطَلُنَا هُوَ{|} السَّائِق{ُ|َةُ} الْأَوَّل{ُ|ى} لِسَيَّارَةٍ طَائِرَةٍ فِي السَّمَاءِ!", imageSrc: "" },
        { text: "قَالَ تِيكِي وَهُوَ يُوَدِّعُ{هُ|هَا}: عِنْدَمَا تَشْتَاقُ{|ِينَ} إِلَيْنَا يَا [NAME]، فَقَطِ احْتَضِن{|ِي} أَلْعَابَكَ بِقُوَّةٍ، وَسَنَلْتَقِي فِي الْأَحْلَامِ!", imageSrc: "" },
        { text: "فَتَحَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} لِ{يَجِدَ|تَجِدَ} نَفْسَ{هُ|هَا} فِي غُرْفَتِ{هِ|هَا} {يُمْسِكُ|تُمْسِكُ} بِمِفْتَاحِ الْأَلْعَابِ، وَمُنْذُ ذَلِكَ الْيَوْمِ أَصْبَحَ{|تْ} {يَعْتَنِي|تَعْتَنِي} بِأَلْعَابِ{هِ|هَا} جَيِّدًا لِأَنَّ لِكُلِّ لُعْبَةٍ رُوحًا وَسِحْرًا خَاصًّا.", imageSrc: "" },
      ];
      const toyFolder = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
      const toyBase = `${toyFolder}/generated/theme_toy_city`;
      const toyArt = {
        generatedCover: `${toyBase}/page-00.png`,
        generatedImages: Array.from({ length: 13 }, (_, i) => `${toyBase}/page-${String(i + 1).padStart(2, '0')}.png`),
        generatedPortrait: `${toyBase}/page-99.png`,
      };
      const toyTheme: any = settings.themes.find((t: any) => t.id === 'toy_city');
      if (!toyTheme) {
        settings.themes.push({
          id: 'toy_city', emoji: '🤖',
          label: 'مدينة الألعاب السحرية', desc: 'مغامرة داخل مدينة ألعاب سحرية مليئة بالروبوتات والمكعبات',
          ready: true, pages: TOY_PAGES, ...toyArt,
        });
        settings.markModified('themes');
        await settings.save();
      } else if (!toyTheme.ready || !toyTheme.generatedCover ||
                 JSON.stringify(toyTheme.pages || []) !== JSON.stringify(TOY_PAGES)) {
        toyTheme.ready = true;
        toyTheme.pages = TOY_PAGES;
        Object.assign(toyTheme, toyArt);
        settings.markModified('themes');
        await settings.save();
      }

      // School Hero — artwork and ar/en/he text were already in place; it
      // just was never published, so the Stories page had no cover for it.
      const SCHOOL_PAGES = [
        { text: "اسْتَيْقَظَ{|تْ} [NAME] بِنَشَاطٍ كَبِيرٍ، وَارْتَدَ{ى|تْ} حَقِيبَت{َهُ|َهَا} الْمُفَضَّلَةَ وَانْطَلَقَ{|تْ} نَحْوَ مَدْرَسَت{ِهِ|ِهَا} الْجَمِيلَةِ وَه{ُوَ|ِيَ} {يَ|تَ}بْتَسِمُ لِلْكَائِنَاتِ مِنْ حَوْل{ِهِ|ِهَا}.", imageSrc: "" },
        { text: "عِنْدَمَا وَصَلَ{|تْ} [NAME]، تَفَاجَأَ{|تْ} بِأَنَّ الْأَلْوَانَ قَدِ اخْتَفَتْ تَمَامًا مِنْ لَوْحَاتِ وَجُدْرَانِ الْمَدْرَسَةِ! كَانَتْ تَبْدُو حَزِينَةً بِاللَّوْنَيْنِ الْأَبْيَضِ وَالْأَسْوَدِ.", imageSrc: "" },
        { text: "لَمْ {يَ|تَ}سْتَسْلِمْ [NAME]، بَلْ قَرَّرَ{|تْ} أَنْ {يَ|تَ}كْتَشِفَ السِّرَّ وَ{يَ|تَ}سْتَخْدِمَ \"أَقْلَام{َهُ|َهَا} السِّحْرِيَّةَ\" وَلُطْف{َهُ|َهَا} لِ{يُ|تُ}عِيدَ الْحَيَاةَ وَالْبَهْجَةَ لِمَدْرَسَت{ِهِ|ِهَا}.", imageSrc: "" },
        { text: "فِي فَصْلِ الْعُلُومِ، وَجَدَ{|تْ} صَدِيق{َهُ|َهَا} سَامِي حَزِينًا لِأَنَّ تَجْرِبَةَ الْبُرْكَانِ لَمْ تَنْجَحْ، فَسَاعَدَ{|تْ}هُ [NAME] بِلَمْسَةٍ ذَكِيَّةٍ مِنْ خَيَال{ِهِ|ِهَا} لِتَنْفَجِرَ الْأَلْوَانُ مُجَدَّدًا.", imageSrc: "" },
        { text: "دَخَلَ{|تْ} [NAME] الْمَكْتَبَةَ، فَسَمِعَ{|تْ} الْكُتُبَ تَهْمِسُ بِحُزْنٍ، وَتَطْلُبُ مِنْ أَحَدٍ أَنْ يُرَتِّبَهَا لِتَعُودَ الْحِكَايَاتُ وَالْقِصَصُ إِلَى مَكَانِهَا الصَّحِيحِ.", imageSrc: "" },
        { text: "نَادَ{ى|تْ} [NAME] زُمَلَاء{َهُ|َهَا}، وَبَدَأُوا جَمِيعًا فِي تَرْتِيبِ الْكُتُبِ بِانْتِظَامٍ وَهُمْ يُغَنُّونَ أَجْمَلَ الْأَلْحَانِ، لِيَعُودَ الدِّفْءُ إِلَى زَوَايَا الْمَكْتَبَةِ.", imageSrc: "" },
        { text: "فِي سَاحَةِ اللَّعِبِ، سَمِعَ{|تْ} [NAME] مُوَاءً رَقِيقًا؛ لَقَدْ كَانَتْ هُنَاكَ قِطَّةٌ صَغِيرَةٌ خَائِفَةٌ وَعَالِقَةٌ فَوْقَ غُصْنِ شَجَرَةِ الْمَدْرَسَةِ الْعَالِيَةِ.", imageSrc: "" },
        { text: "بِلَا تَرَدُّدٍ، جَمَعَ{|تْ} [NAME] الْمُكَعَّبَاتِ الْمُلَوَّنَةَ الْكَبِيرَةَ وَبَنَ{ى|تْ} مِنْهَا سُلَّمًا آمِنًا، وَتَلَقَّ{ى|تْ} الْقِطَّةَ بِلُطْفٍ لِ{يُ|تُ}عِيدَهَا إِلَى الْأَرْضِ بِسَلَامٍ.", imageSrc: "" },
        { text: "فِي وَقْتِ الِاسْتِرَاحَةِ، رَأَ{ى|تْ} [NAME] طِفْلًا جَدِيدًا يَجْلِسُ بِمُفْرَدِهِ، فَذَهَبَ{|تْ} إِلَيْهِ وَتَشَارَكَ{|تْ} مَعَهُ طَعَام{َهُ|َهَا}، لِ{يَ|تَ}عْرِفَ أَنَّ اللُّطْفَ هُوَ الْقُوَّةُ الْخَارِقَةُ الْحَقِيقِيَّةُ.", imageSrc: "" },
        { text: "فِي حِصَّةِ الْفَنِّ، وَبِإِذْنٍ مِنَ الْمُعَلِّمَةِ، بَدَأَ{|تْ} [NAME] {يَ|تَ}رْسُمُ أَحْلَامَ التَّلَامِيذِ عَلَى الْجُدْرَانِ، وَفَجْأَةً.. بَدَأَتِ الْأَلْوَانُ الزَّاهِيَةُ تَعُودُ لِلْمَدْرَسَةِ كُلِّهَا!", imageSrc: "" },
        { text: "فِي نِهَايَةِ الْيَوْمِ الدِّرَاسِيِّ، صَفَّقَ الْجَمِيعُ بِحَرَارَةٍ لِـ [NAME]، وَقَدَّمَ لَ{هُ|هَا} مُدِيرُ الْمَدْرَسَةِ وِسَامَ \"{الْبَطَلُ|الْبَطَلَةُ} {الصَّغِيرُ|الصَّغِيرَةُ}\" تَقْدِيرًا لِشَجَاعَتِ{هِ|هَا} وَجَمَالِ رُوح{ِهِ|ِهَا}.", imageSrc: "" },
        { text: "عَادَ{|تْ} [NAME] إِلَى الْبَيْتِ مُسْرِع{ًا|َةً}، وَحَكَ{ى|تْ} لِوَالِدَت{ِهِ|ِهَا} بِفَخْرٍ كَيْفَ أَنَّ الْمَدْرَسَةَ لَيْسَتْ مُجَرَّدَ دُرُوسٍ، بَلْ هِيَ مَكَانٌ لِلْمُغَامَرَةِ وَمُسَاعَدَةِ الْآخَرِينَ.", imageSrc: "" },
        { text: "وَضَعَ{|تْ} [NAME] وِسَام{َهُ|َهَا} اللَّامِعَ بِجَانِبِ سَرِير{ِهِ|ِهَا}، وَأَغْلَقَ{|تْ} عَيْنَيْ{هِ|هَا} وَه{ُوَ|ِيَ} {يَ|تَ}تَشَوَّقُ لِيَوْمٍ دِرَاسِيٍّ جَدِيدٍ مَلِيءٍ بِالْمُفَاجَآتِ السَّعِيدَةِ.", imageSrc: "" },
      ];
      const schFolder = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
      const schBase = `${schFolder}/generated/theme_school_hero`;
      const schArt = {
        generatedCover: `${schBase}/page-00.png`,
        generatedImages: Array.from({ length: 13 }, (_, i) => `${schBase}/page-${String(i + 1).padStart(2, '0')}.png`),
        generatedPortrait: `${schBase}/page-99.png`,
      };
      const schTheme: any = settings.themes.find((t: any) => t.id === 'school_hero');
      if (!schTheme) {
        settings.themes.push({
          id: 'school_hero', emoji: '🏫',
          label: 'بطل المدرسة', desc: 'مساعدة الآخرين ونشر اللطف والألوان في المدرسة',
          ready: true, pages: SCHOOL_PAGES, ...schArt,
        });
        settings.markModified('themes');
        await settings.save();
      } else if (!schTheme.ready || !schTheme.generatedCover ||
                 JSON.stringify(schTheme.pages || []) !== JSON.stringify(SCHOOL_PAGES)) {
        schTheme.ready = true;
        schTheme.pages = SCHOOL_PAGES;
        Object.assign(schTheme, schArt);
        settings.markModified('themes');
        await settings.save();
      }

      // Around the World — 13 pages, artwork generated with Sara.
      const WORLD_PAGES = [
        { text: "بَيْنَمَا كَانَ{|تْ} [NAME] {يُقَلِّبُ|تُقَلِّبُ} كُرَةً أَرْضِيَّةً قَدِيمَةً فِي غُرْفَتِ{هِ|هَا}، أَضَاءَتْ خَرِيطَةُ الْعَالَمِ بِنُورٍ ذَهَبِيٍّ سَاطِعٍ وَفَتَحَتْ بَوَّابَةً سِحْرِيَّةً سَحَبَتْ{هُ|هَا} إِلَى أُولَى مَحَطَّاتِ{هِ|هَا}!", imageSrc: "" },
        { text: "وَجَدَ{|تْ} [NAME] نَفْسَ{هُ|هَا} {يَقِفُ|تَقِفُ} فَوْقَ سُورِ الصِّينِ الْعَظِيمِ وَسْطَ الْجِبَالِ الْخَضْرَاءِ، وَاسْتَقْبَلَ{هُ|هَا} أَطْفَالٌ يَحْمِلُونَ تِنِّيناً وَرَقِيّاً مُلَوَّناً يَطِيرُ فِي السَّمَاءِ.", imageSrc: "" },
        { text: "بِلَمْسَةٍ سِحْرِيَّةٍ، انْتَقَلَ{|تْ} [NAME] إِلَى الرِّمَالِ الذَّهَبِيَّةِ أَمَامَ أَهْرَامَاتِ الْجِيزَةِ الْعَظِيمَةِ، حَيْثُ الْتَقَ{ى|تْ} بِجَمَلٍ لَطِيفٍ اسْمُهُ مِشْمِشْ.", imageSrc: "" },
        { text: "أَشَارَ الْجَمَلُ مِشْمِشْ إِلَى طَرِيقَيْنِ: \"يَا بَطَل{|ةَ}! هَلْ نَرْكَبُ الْمِنْطَادَ الْمُلَوَّنَ لِنَطِيرَ فَوْقَ بُرْجِ إِيفِل فِي بَارِيس، أَمْ نَغُوصُ فِي غَابَاتِ الْأَمَازُون الْخَضْرَاءِ؟\" اِخْتَرْ{|ي} وِجْهَتَ{كَ|كِ} بِذَكَاءٍ يَا [NAME]!", imageSrc: "" },
        { text: "اِخْتَارَ{|تْ} [NAME] رُكُوبَ الْمِنْطَادِ الْمُلَوَّنِ {وَطَارَ|وَطَارَتْ} فَوْقَ بَارِيس، {وَرَأَى|وَرَأَتْ} بُرْجَ إِيفِل الشَّاهِقَ مِنَ الْأَعْلَى وَهُوَ يَلْمَعُ تَحْتَ أَشِعَّةِ الشَّمْسِ.", imageSrc: "" },
        { text: "هَبَطَ الْمِنْطَادُ بِلُطْفٍ فِي غَابَاتِ الْأَمَازُون الْكَثِيفَةِ، حَيْثُ الْتَقَ{ى|تْ} [NAME] بِبَبَّغَاوَاتٍ مُلَوَّنَةٍ وَفَرَاشَاتٍ بِحَجْمِ كَفِّ الْيَدِ تَسِيرُ مَعَ{هُ|هَا} فِي الطَّرِيقِ.", imageSrc: "" },
        { text: "تَحَوَّلَ الطَّقْسُ فَجْأَةً إِلَى بَارِدٍ جِدّاً، فَوَجَدَ{|تْ} [NAME] نَفْسَ{هُ|هَا} فِي الْقُطْبِ الشَّمَالِيِّ {يَرْتَدِي|تَرْتَدِي} مِعْطَفاً دَافِئاً {وَيَلْعَبُ|وَتَلْعَبُ} مَعَ الدِّبَبَةِ الْقُطْبِيَّةِ تَحْتَ أَضْوَاءِ السَّمَاءِ الْخَضْرَاءِ وَالْبَنَفْسَجِيَّةِ.", imageSrc: "" },
        { text: "وَصَلَ{|تْ} [NAME] إِلَى شَاطِئٍ مُشْمِسٍ فِي الْيَابَانِ مَلِيءٍ بِأَشْجَارِ السَّاكُورَا الْوَرْدِيَّةِ. يَا بَطَل{|ةَ}! هَلْ {يُمْكِنُكَ|يُمْكِنُكِ} الْعُثُورُ عَلَى الْبُوصَلَةِ الذَّهَبِيَّةِ الصَّغِيرَةِ الْمَخْفِيَّةِ بَيْنَ الْأَصْدَافِ عَلَى الشَّاطِئِ؟", imageSrc: "" },
        { text: "فِي كُلِّ بَلَدٍ زَارَ{هُ|تْهُ} [NAME]، {تَعَلَّمَ|تَعَلَّمَتْ} كَلِمَةً جَدِيدَةً بِلُغَتِهَا: \"شُكْراً\"، \"أَهْلاً\"، وَ\"أُحِبُّكَ\"، {وَاكْتَشَفَ|وَاكْتَشَفَتْ} أَنَّ الِابْتِسَامَةَ يَفْهَمُهَا كُلُّ أَطْفَالِ الْعَالَمِ.", imageSrc: "" },
        { text: "جَمَعَ{|تْ} [NAME] فِي حَقِيبَتِ{هِ|هَا} رِيشَةً مُلَوَّنَةً مِنَ الْأَمَازُون، وَحَجَراً مِنَ الْأَهْرَامَاتِ، وَزَهْرَةَ سَاكُورَا مِنَ الْيَابَانِ لِتُذَكِّرَ{هُ|هَا} بِهَذِهِ الرِّحْلَةِ الْعَظِيمَةِ.", imageSrc: "" },
        { text: "رَغْمَ جَمَالِ كُلِّ بِلَادِ الْعَالَمِ، {شَعَرَ|شَعَرَتْ} [NAME] بِالشَّوْقِ لِبَيْتِ{هِ|هَا} وَأَهْلِ{هِ|هَا}، {وَتَذَكَّرَ|وَتَذَكَّرَتْ} أَنَّ أَجْمَلَ مَكَانٍ فِي الْعَالَمِ هُوَ الْوَطَنُ.", imageSrc: "" },
        { text: "أَغْمَضَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} وَدَارَتِ الْكُرَةُ الْأَرْضِيَّةُ بِبُطْءٍ، لِ{يَعُودَ|تَعُودَ} بِنُعُومَةٍ إِلَى غُرْفَتِ{هِ|هَا} الْهَادِئَةِ.", imageSrc: "" },
        { text: "فَتَحَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} {وَنَظَرَ|وَنَظَرَتْ} إِلَى خَرِيطَةِ الْعَالَمِ الْمُعَلَّقَةِ عَلَى حَائِطِ{هِ|هَا}، {وَهُوَ يَعْلَمُ|وَهِيَ تَعْلَمُ} أَنَّ الْعَقْلَ الْمُنْفَتِحَ وَالْقَلْبَ الْمُحِبَّ يَجْعَلَانِ{هُ|هَا} {صَدِيقاً|صَدِيقَةً} لِكُلِّ أَطْفَالِ الْعَالَمِ.", imageSrc: "" },
      ];
      const wldFolder = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
      const wldBase = `${wldFolder}/generated/theme_world_adventure`;
      const wldArt = {
        generatedCover: `${wldBase}/page-00.png`,
        generatedImages: Array.from({ length: 13 }, (_, i) => `${wldBase}/page-${String(i + 1).padStart(2, '0')}.png`),
        generatedPortrait: `${wldBase}/page-99.png`,
      };
      const wldTheme: any = settings.themes.find((t: any) => t.id === 'world_adventure');
      if (!wldTheme) {
        settings.themes.push({
          id: 'world_adventure', emoji: '🌍',
          label: 'مغامرة حول العالم', desc: 'رحلة سحرية بين بلاد العالم وأصدقائه',
          ready: true, pages: WORLD_PAGES, ...wldArt,
        });
        settings.markModified('themes');
        await settings.save();
      } else if (!wldTheme.ready || !wldTheme.generatedCover ||
                 JSON.stringify(wldTheme.pages || []) !== JSON.stringify(WORLD_PAGES)) {
        wldTheme.ready = true;
        wldTheme.pages = WORLD_PAGES;
        Object.assign(wldTheme, wldArt);
        settings.markModified('themes');
        await settings.save();
      }

      // Deep Sea — part 2 of سلسلة البحر. Artwork generated with Julia, the
      // same child as part 1 so the series keeps one face.
      const SEA2_PAGES = [
        { text: "أَثْنَاءَ لَعِبِ [NAME] عَلَى الشَّاطِئِ، عَثَرَ{|تْ} عَلَى صَدَفَةٍ زَرْقَاءَ تَلْمَعُ. وَبِمُجَرَّدِ أَنْ وَضَعَ{هَا|تْهَا} عَلَى أُذُنِ{هِ|هَا}، ظَهَرَتْ غَوَّاصَةٌ صَغِيرَةٌ شَفَّافَةٌ تُنَادِي{هِ|هَا} لِرِحْلَةٍ اسْتِكْشَافِيَّةٍ!", imageSrc: "" },
        { text: "غَاصَ{|تْ} [NAME] بِالْغَوَّاصَةِ إِلَى أَعْمَاقِ الْمُحِيطِ، حَيْثُ رَأَ{ى|تْ} الشِّعَابَ الْمَرْجَانِيَّةَ الْمُلَوَّنَةَ وَالْأَسْمَاكَ الَّتِي تُضِيءُ مِثْلَ الْمَصَابِيحِ الصَّغِيرَةِ.", imageSrc: "" },
        { text: "الْتَقَ{ى|تْ} بِالدُّلْفِينِ بُوبُو، الَّذِي أَخْبَرَ{هُ|هَا} أَنَّ اللُّؤْلُؤَةَ الْمُضِيئَةَ الَّتِي تُنِيرُ الْمُحِيطَ فِي اللَّيْلِ قَدِ اخْتَفَتْ تَحْتَ الصُّخُورِ.", imageSrc: "" },
        { text: "قَالَ الدُّلْفِينُ بُوبُو: \"يَا بَطَل{|ةَ}! هَلْ نَرْكَبُ عَلَى ظَهْرِ الدُّلْفِينِ السَّرِيعِ لِنَتَجَاوَزَ التَّيَّارَاتِ الْمَائِيَّةَ، أَمْ نُرَافِقُ السُّلَحْفَاةَ الْحَكِيمَةَ لِتَدُلَّنَا عَلَى الطَّرِيقِ الْآمِنِ؟\" اِخْتَرْ{|ي} طَرِيقَ{كَ|كِ} بِذَكَاءٍ يَا [NAME]!", imageSrc: "" },
        { text: "اِخْتَارَ{|تْ} [NAME] مُرَافَقَةَ السُّلَحْفَاةِ الْحَكِيمَةِ، الَّتِي أَخَذَتْ{هُ|هَا} عَبْرَ وَادِي الشِّعَابِ الْمَرْجَانِيَّةِ الْجَمِيلَةِ وَعَلَّمَتْ{هُ|هَا} كَيْفَ {يَسْبَحُ|تَسْبَحُ} بِهُدُوءٍ.", imageSrc: "" },
        { text: "وَصَلُوا إِلَى مَكَانِ اللُّؤْلُؤَةِ الْمُحْتَجَزَةِ بَيْنَ الصُّخُورِ. اِسْتَخْدَمَ{|تْ} [NAME] ذِرَاعَ الْغَوَّاصَةِ الْآلِيَّةَ بِذَكَاءٍ وَحَذَرٍ لِإِخْرَاجِ اللُّؤْلُؤَةِ دُونَ إِيذَاءِ الْكَائِنَاتِ الْحَيَّةِ.", imageSrc: "" },
        { text: "وَضَعَ{|تْ} [NAME] اللُّؤْلُؤَةَ فِي مَكَانِهَا، وَفَجْأَةً أَضَاءَتِ الْأَعْمَاقُ كُلُّهَا بِأَنْوَارٍ زَرْقَاءَ وَوَرْدِيَّةٍ فِي مَنْظَرٍ سَاحِرٍ!", imageSrc: "" },
        { text: "أَقَامَتْ كَائِنَاتُ الْبَحْرِ احْتِفَالاً مُلَوَّناً شُكْراً لِذَكَاءِ [NAME] وَشَجَاعَتِ{هِ|هَا}. يَا بَطَل{|ةَ}! هَلْ {يُمْكِنُكَ|يُمْكِنُكِ} الْعُثُورُ عَلَى الصَّدَفَةِ الْوَرْدِيَّةِ الْمُضِيئَةِ الْمَخْفِيَّةِ بَيْنَ الشِّعَابِ الْمَرْجَانِيَّةِ؟", imageSrc: "" },
        { text: "سَاعَدَ{|تْ} [NAME] الْأَسْمَاكَ الصَّغِيرَةَ فِي جَمْعِ الْأَكْيَاسِ الْبِلَاسْتِيكِيَّةِ الْعَالِقَةِ بِالشِّعَابِ الْمَرْجَانِيَّةِ لِ{يُحَافِظَ|تُحَافِظَ} عَلَى نَظَافَةِ بَيْتِهَا الْمَائِيِّ.", imageSrc: "" },
        { text: "تَعَلَّمَ{|تْ} [NAME] كَيْفَ {يَتَوَاصَلُ|تَتَوَاصَلُ} مَعَ الدَّلَافِينِ وَالْحِيتَانِ بِالْإِشَارَاتِ وَالْأَصْوَاتِ النَّغَمِيَّةِ اللَّطِيفَةِ.", imageSrc: "" },
        { text: "أَهْدَا{هُ|هَا} مَلِكُ الْبِحَارِ قِلَادَةً صَدَفِيَّةً نَاصِعَةً، تُذَكِّرُ{هُ|هَا} دَائِماً بِأَنَّ{هُ|هَا} {صَدِيقٌ|صَدِيقَةٌ} لِلْمُحِيطِ {وَحَامٍ|وَحَامِيَةٌ} لِبِيئَتِهِ.", imageSrc: "" },
        { text: "طَفَتِ الْغَوَّاصَةُ الشَّفَّافَةُ بِنُعُومَةٍ نَحْوَ السَّطْحِ، وَبَدَأَ صَخَبُ الْمِيَاهِ يَهْدَأُ تَدْرِيجِيّاً.", imageSrc: "" },
        { text: "فَتَحَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} لِ{يَجِدَ|تَجِدَ} نَفْسَ{هُ جَالِساً|هَا جَالِسَةً} عَلَى رِمَالِ الشَّاطِئِ وَبِجَانِبِ{هِ|هَا} صَدَفَتُ{هُ|هَا} الزَّرْقَاءُ، {وَهُوَ يَعْلَمُ|وَهِيَ تَعْلَمُ} أَنَّ الْحِفَاظَ عَلَى نَظَافَةِ الطَّبِيعَةِ مَسْؤُولِيَّةُ كُلِّ بَطَلٍ حَقِيقِيٍّ.", imageSrc: "" },
      ];
      const seaFolder = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
      const seaBase = `${seaFolder}/generated/theme_deep_sea`;
      const seaArt = {
        generatedCover: `${seaBase}/page-00.png`,
        generatedImages: Array.from({ length: 13 }, (_, i) => `${seaBase}/page-${String(i + 1).padStart(2, '0')}.png`),
        generatedPortrait: `${seaBase}/page-99.png`,
      };
      const seaSeries = { series: 'sea', seriesName: 'سلسلة البحر', seriesPart: 2 };
      const seaTheme: any = settings.themes.find((t: any) => t.id === 'deep_sea');
      if (!seaTheme) {
        settings.themes.push({
          id: 'deep_sea', emoji: '🐬',
          label: 'مغامرة في أعماق البحار', desc: 'غواصة شفافة، دلفين، ولؤلؤة تُنير المحيط',
          ready: true, pages: SEA2_PAGES, ...seaArt, ...seaSeries,
        });
        settings.markModified('themes');
        await settings.save();
      } else if (!seaTheme.ready || !seaTheme.generatedCover || seaTheme.seriesPart !== 2 ||
                 JSON.stringify(seaTheme.pages || []) !== JSON.stringify(SEA2_PAGES)) {
        seaTheme.ready = true;
        seaTheme.pages = SEA2_PAGES;
        Object.assign(seaTheme, seaArt, seaSeries);
        settings.markModified('themes');
        await settings.save();
      }

      // ── Newer stories, seeded from one table ────────────────────────────
      // The blocks above each restate a story's 13 Arabic pages inline. That
      // text already lives in the locale file the print pipeline reads, so
      // these rows take it from there instead: a new story needs one line here
      // rather than another twenty-five-line copy.
      // The three school stories are one age progression — الروضة ثم اليوم
      // الأول ثم الصف الأول — so they carry series numbers and a family can buy
      // them in order as the child grows.
      const SCHOOL = (part: number) => ({ series: 'school', seriesName: 'سلسلة المدرسة', seriesPart: part });
      const NEW_STORIES: { id: string; emoji: string; label: string; desc: string;
                           series?: string; seriesName?: string; seriesPart?: number }[] = [
        { id: 'little_chef',        emoji: '🍳', label: 'الشيف الصغير',        desc: 'يوم في المطبخ: نظافة وترتيب ووجبة يصنعها بنفسه' },
        { id: 'castle_guardian',    emoji: '🏰', label: 'مغامرة حارس القلعة',  desc: 'قلعة تاريخية، لغز قديم، ووسام حارس التاريخ' },
        { id: 'little_engineer',    emoji: '🛠️', label: 'عالم البناء والهندسة', desc: 'مخطط وأدوات وبيت شجري للأصدقاء الصغار' },
        { id: 'happy_kindergarten', emoji: '🧸', label: 'الروضة السعيدة',      desc: 'أول يوم في الروضة: ألوان وحكايات وأصدقاء جدد', ...SCHOOL(1) },
        { id: 'first_day_school',   emoji: '🎒', label: 'اليوم الأول بالمدرسة', desc: 'معلمة لطيفة، أصدقاء جدد، ونجم نشيط', ...SCHOOL(2) },
        { id: 'first_grade',        emoji: '✏️', label: 'مغامرة في الصف الأول', desc: 'حروف وكلمات وقراءة أولى بثقة', ...SCHOOL(3) },
        { id: 'future_hero',        emoji: '🚀', label: 'مغامرة بطل المستقبل',  desc: 'تجربة المهن: مهندس، طبيب، معلّم' },
        { id: 'ramadan_first',      emoji: '🌙', label: 'رمضان الأول',          desc: 'هلال وفانوس وأول صيام ومسحراتي وعيد' },
      ];
      const newFolder = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
      let newDirty = false;
      for (const row of NEW_STORIES) {
        const pages = arabicStoryPages(row.id).map((text) => ({ text, imageSrc: '' }));
        // No text means the locale entry is missing — skip rather than publish
        // a theme that would render blank pages to a customer.
        if (pages.length === 0) continue;
        const base = `${newFolder}/generated/theme_${row.id}`;
        const art = {
          generatedCover: `${base}/page-00.png`,
          generatedImages: Array.from({ length: 13 }, (_, i) => `${base}/page-${String(i + 1).padStart(2, '0')}.png`),
          generatedPortrait: `${base}/page-99.png`,
        };
        const existing: any = settings.themes.find((t: any) => t.id === row.id);
        if (!existing) {
          settings.themes.push({ ...row, ready: true, pages, ...art });
          newDirty = true;
        } else if (!existing.ready || !existing.generatedCover ||
                   existing.seriesPart !== row.seriesPart ||
                   JSON.stringify(existing.pages || []) !== JSON.stringify(pages)) {
          existing.ready = true;
          existing.pages = pages;
          Object.assign(existing, art, {
            series: row.series, seriesName: row.seriesName, seriesPart: row.seriesPart,
          });
          newDirty = true;
        }
      }
      if (newDirty) {
        settings.markModified('themes');
        await settings.save();
      }

      // Pirate Treasure — premium theme (scene template + voweled/gendered text
      // in code). Heal an existing entry (attach the photoreal demo images +
      // real text + mark ready) or seed it fresh.
      const pirFolder = process.env.GCS_PDF_FOLDER || 'magic-fanoose';
      const pirCover = `${pirFolder}/generated/theme_pirate_adventure/page-00.png`;
      const pirImages = Array.from({ length: 13 }, (_, i) => `${pirFolder}/generated/theme_pirate_adventure/page-${String(i + 1).padStart(2, '0')}.png`);
      const pirPortrait = `${pirFolder}/generated/theme_pirate_adventure/page-99.png`;
      const PIRATE_PAGES = [
        { text: "فِي صَبَاحٍ مُشْمِسٍ، وَجَدَ{|تْ} {{name}} زُجَاجَةً قَدِيمَةً عَلَى الشَّاطِئِ، وَبِدَاخِلِهَا خَرِيطَةُ كَنْزٍ! فَفَرِحَ{|تْ} كَثِيراً وَقَرَّرَ{|تْ} أَنْ {يُصْبِحَ|تُصْبِحَ} {قُبْطَاناً|قُبْطَانَةً} لِلْقَرَاصِنَةِ.", imageSrc: "" },
        { text: "رَكِبَ{|تْ} {{name}} سَفِينَةً خَشَبِيَّةً صَغِيرَةً ذَاتَ شِرَاعٍ أَبْيَضَ، وَرَفَعَ{|تْ} الرَّايَةَ، وَأَبْحَرَ{|تْ} فِي الْبَحْرِ الْأَزْرَقِ وَه{ُوَ|ِيَ} {يَ|تَ}شْعُرُ بِالشَّجَاعَةِ.", imageSrc: "" },
        { text: "حَطَّ بَبْغَاءٌ مُلَوَّنٌ لَطِيفٌ عَلَى كَتِفِ {{name}}، وَأَخَذَ يُغَرِّدُ بِفَرَحٍ، فَأَصْبَحَ رَفِيقاً وَفِيّاً فِي الرِّحْلَةِ.", imageSrc: "" },
        { text: "فَجْأَةً تَجَمَّعَتِ الْغُيُومُ الدَّاكِنَةُ وَتَمَايَلَتِ السَّفِينَةُ بَيْنَ الْأَمْوَاجِ الْعَالِيَةِ. أَمْسَكَ{|تْ} {{name}} عَجَلَةَ الْقِيَادَةِ بِقُوَّةٍ وَقَادَ{|تْ} بِشَجَاعَةٍ عَبْرَ الْعَاصِفَةِ.", imageSrc: "" },
        { text: "هَدَأَ الْبَحْرُ، وَوَصَلَ{|تْ} {{name}} إِلَى جَزِيرَةٍ خَضْرَاءَ غَامِضَةٍ ذَاتِ نَخِيلٍ عَالٍ وَرِمَالٍ ذَهَبِيَّةٍ.", imageSrc: "" },
        { text: "قَفَزَ دُلْفِينٌ لَطِيفٌ مِنَ الْمَاءِ، وَبِأَصْوَاتٍ وَدُودَةٍ، أَشَارَ إِلَى {{name}} نَحْوَ طَرِيقٍ خَفِيٍّ عَلَى الْجَزِيرَةِ.", imageSrc: "" },
        { text: "تَبِعَ{|تْ} {{name}} الْخَرِيطَةَ عَبْرَ الْغَابَةِ، وَعَبَرَ{|تْ} جِسْراً حَبْلِيّاً مُتَمَايِلاً فَوْقَ نَهْرٍ مُتَلَأْلِئٍ بِكُلِّ شَجَاعَةٍ.", imageSrc: "" },
        { text: "فِي نِهَايَةِ الطَّرِيقِ، وَجَدَ{|تْ} {{name}} كَهْفاً مُظْلِماً تَحْرُسُهُ سُلَحْفَاةٌ عَجُوزٌ طَيِّبَةٌ، سَأَلَتْ{هُ|هَا}: \"مَا الْأَقْوَى مِنَ الذَّهَبِ؟\"", imageSrc: "" },
        { text: "فَكَّرَ{|تْ} {{name}} قَلِيلاً ثُمَّ أَجَابَ{|تْ}: \"الْقَلْبُ الطَّيِّبُ!\" فَابْتَسَمَتِ السُّلَحْفَاةُ وَفَتَحَتْ بَابَ الْكَهْفِ.", imageSrc: "" },
        { text: "بِالدَّاخِلِ، رَأَ{ى|تْ} {{name}} صُنْدُوقَ كَنْزٍ كَبِيراً، لَكِنَّ{هُ|هَا} سَمِعَ{|تْ} سَلْطَعُوناً صَغِيراً عَالِقاً تَحْتَ صَخْرَةٍ، فَتَوَقَّفَ{|تْ} لِ{يُ|تُ}حَرِّرَهُ أَوَّلاً.", imageSrc: "" },
        { text: "شَكَرَ{هُ|هَا} السَّلْطَعُونُ مُمْتَنّاً، وَأَرَا{هُ|هَا} الْمِفْتَاحَ الذَّهَبِيَّ. فَتَحَ{|تْ} {{name}} الصُّنْدُوقَ: فَتَلَأْلَأَ بِالْعُمْلَاتِ الذَّهَبِيَّةِ وَتَاجٍ لَامِعٍ!", imageSrc: "" },
        { text: "عَلَى الشَّاطِئِ، اِحْتَفَلَ{|تْ} {{name}} مَعَ الْبَبْغَاءِ وَالدُّلْفِينِ وَالسَّلْطَعُونِ، وَتَقَاسَمَ{|تْ} الْكَنْزَ مَعَهُمْ وَه{ُوَ|ِيَ} {يَ|تَ}ضْحَكُ بِفَرَحٍ.", imageSrc: "" },
        { text: "وَمَعَ غُرُوبِ الشَّمْسِ، أَبْحَرَ{|تْ} {{name}} عَائِد{ًا|َةً} إِلَى الْبَيْتِ مُرْتَدِي{ًا|َةً} التَّاجَ، مُحْتَفِظ{ًا|َةً} بِعُمْلَةٍ ذَهَبِيَّةٍ، {يَ|تَ}حْلُمُ بِالْمُغَامَرَةِ الْقَادِمَةِ.", imageSrc: "" }
      ];
      const pirTheme: any = settings.themes.find((t: any) => t.id === 'pirate_adventure');
      if (!pirTheme) {
        settings.themes.push({
          id: 'pirate_adventure', emoji: '🏴‍☠️',
          label: 'مغامرة القراصنة والكنز', desc: 'رحلة بحرية شيقة بحثاً عن الكنز',
          ready: true, generatedCover: pirCover, generatedImages: pirImages, generatedPortrait: pirPortrait,
          pages: PIRATE_PAGES,
        });
        settings.markModified('themes');
        await settings.save();
      } else {
        const arabicLen = (pirTheme.pages?.[0]?.text || '').replace(/[^\u0621-\u064A]/g, '').length;
        if (!pirTheme.ready || !Array.isArray(pirTheme.pages) || arabicLen < 5 || pirTheme.generatedCover !== pirCover) {
          pirTheme.ready = true;
          pirTheme.generatedCover = pirCover;
          pirTheme.generatedImages = pirImages;
          pirTheme.generatedPortrait = pirPortrait;
          pirTheme.pages = PIRATE_PAGES;
          settings.markModified('themes');
          await settings.save();
        }
      }

      // Space (space_real) — the ready story had images but 0 stored pages, so the
      // wizard's "ready story" mode showed "under preparation". Seed its text pages
      // (same text as the code template) into the DB so the theme is self-contained.
      const SPACE_PAGES = [
        { text: "كان {{name}} يحلم دائماً بالنجوم. وفي ليلة هادئة، تحول سريره فجأة إلى مركبة فضائية متطورة مليئة بالأزرار اللامعة!", imageSrc: "" },
        { text: "بكل حماس، ضغط {{name}} على الزر الأحمر الكبير، وانطلقت المركبة بسرعة البرق نحو السماء الزرقاء الداكنة.", imageSrc: "" },
        { text: "فجأة، طار كل شيء في الغرفة! وبسبب انعدام الجاذبية، أصبح {{name}} يسبح في الهواء كأنه سمكة محاطة بالنجوم.", imageSrc: "" },
        { text: "نظر {{name}} من النافذة الكبيرة، ورأى كوكب الأرض من بعيد يبدو مثل كرة زجاجية زرقاء جميلة وصغيرة جداً.", imageSrc: "" },
        { text: "هبطت المركبة بهدوء على كوكب غريب مغطى بالرمال البنفسجية الناعمة، وكان كل شيء من حوله يلمع بيقظة.", imageSrc: "" },
        { text: "من خلف إحدى الصخور، ظهر مخلوق فضائي صغير ولطيف، يملك عيوناً واسعة ولامعة، وبدأ يلوح لـ {{name}} بترحيب.", imageSrc: "" },
        { text: "لم يتكلم المخلوق، لكنه رسم في الهواء بيديه صورة قلب كبير، فعرف {{name}} على الفور أنه يريد أن يكون صديقه.", imageSrc: "" },
        { text: "أشار الصديق الفضائي بحزن إلى حفرة عميقة؛ لقد سقط فيها \"حجر الطاقة\" الذي يمنح كوكبه الحياة والنور.", imageSrc: "" },
        { text: "بلا تردد، ربط {{name}} نفسه بحبل القفز السحري، ونزل إلى الحفرة المظلمة بكل شجاعة لاستعادة الحجر.", imageSrc: "" },
        { text: "عندما أخرج {{name}} الحجر ووضعه في مكانه، أضاء الكوكب كله فجأة بأنوار زاهية تشبه الألعاب النارية الملونة.", imageSrc: "" },
        { text: "تقديراً لشجاعته، قدم المخلوق الفضائي لـ {{name}} \"نجمة صغيرة\" تلمع في الظلام ليتذكره دائماً، ثم حان وقت الوداع.", imageSrc: "" },
        { text: "عادت المركبة الفضائية لتنطلق بالبطل الصغير نحو الأرض، مارةً بسحب ملونة وناعمة تشبه غزل البنات.", imageSrc: "" },
        { text: "استيقظ {{name}} في سريره، ونظر إلى يده ليجد \"النجمة الصغيرة\" لا تزال تلمع! فابتسم وهو يعلم أن الشجاعة تفتح لنا أسرار الكون.", imageSrc: "" },
      ];
      const spaceTheme: any = settings.themes.find((t: any) => t.id === 'space_real');
      if (spaceTheme) {
        const spArabicLen = (spaceTheme.pages?.[0]?.text || '').replace(/[^ء-ي]/g, '').length;
        if (!Array.isArray(spaceTheme.pages) || spaceTheme.pages.length < 13 || spArabicLen < 5) {
          spaceTheme.pages = SPACE_PAGES;
          spaceTheme.ready = true;
          settings.markModified('themes');
          await settings.save();
        }
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
      demoCards: settings.demoCards || {},
      homeStats: settings.homeStats || DEFAULT_HOME_STATS,
      allowSkipPhoto: !!settings.allowSkipPhoto,
      aiModeEnabled: !!settings.aiModeEnabled,
      // Whether the wizard should offer card payment at all. True only once a
      // hosted checkout exists to send the customer to — BookPod's link, or
      // Stripe. Offering a card button with nothing behind it is worse than not
      // offering one, so the wizard reads this rather than hardcoding a flag.
      onlinePayment: !!(process.env.BOOKPOD_PAYMENT_URL || '').trim() || !!process.env.STRIPE_SECRET_KEY,
      onlinePaymentProvider: (process.env.BOOKPOD_PAYMENT_URL || '').trim() ? 'bookpod' : (process.env.STRIPE_SECRET_KEY ? 'stripe' : null),
    };
    res.json({ success: true, settings: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route PUT /api/admin/settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookPackages, themes, homeStats, allowSkipPhoto, aiModeEnabled, demoCards } = req.body;
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = new SiteSettings({ bookPackages, themes, homeStats, allowSkipPhoto, aiModeEnabled, demoCards });
    } else {
      if (bookPackages) {
        settings.bookPackages = bookPackages;
        settings.markModified('bookPackages');
      }
      if (demoCards && typeof demoCards === 'object') {
        // Merge rather than replace: the dashboard sends only the card it just
        // toggled, and a whole-object write would clear every other card.
        settings.demoCards = { ...(settings.demoCards || {}), ...demoCards };
        settings.markModified('demoCards');
      }
      if (themes) {
        settings.themes = themes;
        settings.markModified('themes');
      }
      if (homeStats) {
        settings.homeStats = homeStats;
        settings.markModified('homeStats');
      }
      if (typeof allowSkipPhoto === 'boolean') {
        settings.allowSkipPhoto = allowSkipPhoto;
      }
      if (typeof aiModeEnabled === 'boolean') {
        settings.aiModeEnabled = aiModeEnabled;
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
    // buildOnly = generate + prepare the print files but DON'T submit to BookPod,
    // so the admin can review the book before the billable send.
    const buildOnly = req.body?.buildOnly === true;
    const id = String(order._id);

    // A full build is 15 AI images plus a PDF render — minutes of work. It used
    // to be awaited on this request, so the connection was dropped long before
    // it finished: the browser saw net::ERR_FAILED and reported it as a CORS
    // error (a killed request carries no Access-Control-Allow-Origin header),
    // even though the build was often still running server-side.
    //
    // Now we ACK immediately and run in the background; the dashboard polls
    // /orders/:id/build-status and shows real progress. Failures are recorded
    // on the order (illustrationsStatus='failed' + illustrationsError) rather
    // than being lost with the dropped connection.
    const run = async () => {
      if (order.illustrationsStatus === 'ready') {
        // Already built: buildOnly rebuilds the print files (so a review reflects
        // the current images) without submitting; otherwise (re)submit to BookPod.
        return buildOnly ? reRenderPrintFilesForOrder(id) : submitOrderToBookPod(id);
      }
      return buildBookForOrder(id, !buildOnly);
    };

    run().catch(async (err: any) => {
      console.error(`buildOrderBook failed for ${id}:`, err);
      try {
        await Order.findByIdAndUpdate(id, {
          illustrationsStatus: 'failed',
          illustrationsError: err.message?.slice(0, 500) || 'unknown error',
          buildStage: 'فشل',
        });
      } catch { /* already logged */ }
    });

    res.status(202).json({ success: true, started: true, orderId: id });
  } catch (err: any) {
    console.error('buildOrderBook failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route GET /api/admin/orders/:id/build-status
// @desc  Lightweight poll target for the dashboard's build progress bar.
export const getOrderBuildStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id)
      .select('illustrationsStatus illustrationsError buildProgress buildStage bookpodStatus');
    if (!order) {
      res.status(404).json({ success: false, message: 'order not found' });
      return;
    }
    res.json({
      success: true,
      status: order.illustrationsStatus,
      progress: order.buildProgress ?? 0,
      stage: order.buildStage || '',
      error: order.illustrationsError || '',
      bookpodStatus: order.bookpodStatus || '',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/admin/orders/:id/rerender-files
// @desc  Rebuild the print-ready PDFs from an order's ALREADY-generated images.
//        Free (no AI generation) and never re-submits to BookPod — used to bring
//        an older order up to the current print layout after a template change.
export const reRenderOrderFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: 'order not found' });
      return;
    }
    const updated = await reRenderPrintFilesForOrder(String(order._id));
    res.json({ success: true, order: updated });
  } catch (err: any) {
    console.error('reRenderOrderFiles failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/admin/orders/:id/coloring/rerender  — Pro: rebuild coloring print files (free)
export const reRenderOrderColoring = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404).json({ success: false, message: 'order not found' }); return; }
    const updated = await reRenderColoringForOrder(String(order._id));
    res.json({ success: true, order: updated });
  } catch (err: any) {
    console.error('reRenderOrderColoring failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/admin/orders/:id/coloring/submit  — Pro: submit coloring book to BookPod
export const submitOrderColoring = async (req: Request, res: Response): Promise<void> => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) { res.status(404).json({ success: false, message: 'order not found' }); return; }
    const updated = await submitColoringForOrder(String(order._id));
    res.json({ success: true, order: updated });
  } catch (err: any) {
    console.error('submitOrderColoring failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @route POST /api/admin/check-payments
// @desc  Ask BookPod who has paid, right now, instead of waiting for the timer.
//        Read-only against BookPod; only ever moves our orders pending → paid.
export const checkPayments = async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pollPaymentsOnce();
    res.json({ success: !result.error, ...result });
  } catch (err: any) {
    console.error('checkPayments failed:', err);
    res.status(500).json({ success: false, message: err?.message || 'فشل التحقق من الدفعات' });
  }
};

// @route POST /api/admin/print-book
// @desc  Build a print-ready PDF (cover + interior) for a showcase/preview book
//        from the admin book viewer's "Download" button. Not tied to a paid order
//        and never touches BookPod. The story text is reconstructed server-side.
export const printBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { theme, childName, childGender, language, coverPath, backPath, imagePaths, childPhotoPath, isColoring } = req.body;
    if (!theme || !coverPath || !backPath || !Array.isArray(imagePaths) || imagePaths.length === 0) {
      res.status(400).json({ success: false, message: 'بيانات غير مكتملة لتجهيز ملف الطباعة (يلزم توليد صور الكتاب أولاً)' });
      return;
    }
    const urls = await buildPreviewPrintFiles({
      theme, childName, childGender, language, coverPath, backPath, imagePaths, childPhotoPath, isColoring,
    });
    // Release this build's memory so a rapid second download starts clean on the
    // 512MB host (needs NODE_OPTIONS=--expose-gc; harmless no-op without it).
    try { (global as any).gc?.(); } catch { /* ignore */ }
    res.json({
      success: true,
      interiorPath: urls.interiorPath,
      coverPath: urls.coverPath,
      interiorPages: urls.interiorPages,
    });
  } catch (err: any) {
    console.error('printBook failed:', err);
    res.status(500).json({ success: false, message: err.message || 'فشل تجهيز ملف الطباعة' });
  }
};

// @route POST /api/admin/print-book/submit
// @desc  Build a showcase/preview book and SUBMIT it to BookPod for printing,
//        using shipping details from the viewer's form. BILLABLE — reached only
//        by a deliberate, confirmed admin click.
export const printBookSubmit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { theme, childName, childGender, language, coverPath, backPath, imagePaths, childPhotoPath, isColoring, shipping } = req.body;
    if (!theme || !coverPath || !backPath || !Array.isArray(imagePaths) || imagePaths.length === 0) {
      res.status(400).json({ success: false, message: 'بيانات غير مكتملة لتجهيز الكتاب' });
      return;
    }
    if (!shipping || !shipping.fullName || !shipping.phone) {
      res.status(400).json({ success: false, message: 'يرجى إدخال اسم المستلم ورقم الهاتف على الأقل' });
      return;
    }
    const result = await submitPreviewToBookPod(
      { theme, childName, childGender, language, coverPath, backPath, imagePaths, childPhotoPath, isColoring },
      shipping,
    );
    if (!result.submitted) {
      res.status(502).json({ success: false, message: 'تم تجهيز الملفات لكن BookPod لم يقبل الطلب — تحقق من الإعدادات/السجلات' });
      return;
    }
    res.json({ success: true, jobId: result.jobId });
  } catch (err: any) {
    console.error('printBookSubmit failed:', err);
    res.status(500).json({ success: false, message: err.message || 'فشل الإرسال إلى BookPod' });
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
    // Which child the demo artwork depicts. This used to be fixed to
    // PREVIEW_REFERENCE_PHOTO, so every theme's demo showed the same real
    // child — and publishing a theme meant publishing that child's face, with
    // no way to swap it short of an env var and a redeploy. The sibling
    // photoreal/coloring endpoints already accepted an override; this one
    // didn't, which is the only reason it was hard to change.
    const referencePhoto: string = req.body?.referencePhoto || PREVIEW_REFERENCE_PHOTO;

    // Pull the text from the theme's pages (text entries only).
    const textPages: string[] = (theme.pages || [])
      .filter((p: any) => p && (p.text || typeof p === 'string'))
      .map((p: any) => substituteName(p.text || p, childName));

    // `only: 'cover'` redoes just the front cover and keeps the existing pages.
    // A cover can be wrong while the 13 interiors are fine — that is exactly
    // what happened to deep_sea — and redoing all 15 to fix one costs 15x.
    const coverOnly = req.body?.only === 'cover';

    const generatedImages: string[] = coverOnly ? [...(theme.generatedImages || [])] : [];
    for (let i = 0; !coverOnly && i < PREVIEW_IMAGE_PAGES; i++) {
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
      const stored = await generateIllustration(prompt, referencePhoto, {
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
      if (coverOnly) throw new Error('__skip_portrait__');
      const portrait = await generateIllustration(portraitPrompt, referencePhoto, {
        storyId: `theme_${themeId}`,
        pageNumber: 99,
      });
      theme.generatedPortrait = portrait.objectPath;
    } catch (e: any) {
      if (e.message !== '__skip_portrait__') console.warn('[generatePreview] portrait failed:', e.message);
    }

    // Full-scene front cover — the hero kid inside the themed world (Taletoons
    // style). Uses concrete per-theme background objects (zoo => animals,
    // school => classroom/blackboard, space => planets/rocket, etc.).
    // Prefer the theme's own hand-written coverScene — the very same prompt the
    // printed book and the customer's cover preview use, so the demo cover
    // actually looks like the book it is advertising.
    //
    // buildCoverPrompt reads coverBackground(), whose map is keyed by the OLD
    // short theme ids (ocean, dinosaurs, pirates…). Every newer id —
    // deep_sea, ocean_adventure, toy_city, first_grade and the rest — misses
    // and silently falls through to the generic "magical sparkles" case, which
    // is how a Deep Sea book got a cover of rainbows, an owl and storybooks.
    const baseThemeId = themeId.replace(/_(real|photoreal|cartoon|pr|hd)$/, '');
    const sceneTpl: any = (SCENE_TEMPLATES as any)[themeId] || (SCENE_TEMPLATES as any)[baseThemeId];
    const coverPrompt = sceneTpl?.coverScene
      ? buildScenePrompt('cover', sceneTpl.coverScene, childName, 'male')
      : buildCoverPrompt({ childName, childGender: 'male', theme: themeId });
    try {
      const cover = await generateIllustration(coverPrompt, referencePhoto, {
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

/**
 * Re-impose a supplied PDF onto a chosen trim size and store it, print-ready.
 *
 * For books the owner already has as a finished file — their own titles, a
 * public-domain work, or a customer's manuscript they print as a service. The
 * generated Magic Fanoos books do not come through here; PrintService lays
 * those out from scratch.
 *
 * Deliberately does no rights checking: it cannot. Whether a given PDF may be
 * reprinted is the owner's call, and the dashboard says so next to the upload.
 */
export const importBookPdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file?.buffer?.length) {
      res.status(400).json({ success: false, message: 'لم يتم استلام ملف PDF.' });
      return;
    }
    if (file.mimetype && !String(file.mimetype).includes('pdf')) {
      res.status(400).json({ success: false, message: 'الملف ليس PDF.' });
      return;
    }

    const widthMm = Number(req.body?.widthMm) || 150;
    const heightMm = Number(req.body?.heightMm) || 220;
    const bleedMm = req.body?.bleedMm !== undefined ? Number(req.body.bleedMm) : 3;
    const title = String(req.body?.title || 'book').trim().replace(/[^\w\u0600-\u06FF-]+/g, '_').slice(0, 60) || 'book';

    const result = await reimposePdf(file.buffer, { widthMm, heightMm, bleedMm });

    const stamp = `${Date.now()}_${title}_${widthMm}x${heightMm}`;
    const objectPath = pdfFolderPath('imported', `${stamp}.pdf`);
    const stored = await uploadBuffer(result.pdf, objectPath, 'application/pdf');

    // BookPod's create-book takes cover and interior as separate files, so split
    // now — the send button later just points at these two paths.
    let coverPath: string | undefined;
    let interiorPath: string | undefined;
    let interiorPages = 0;
    try {
      const split = await splitCoverInterior(result.pdf);
      coverPath = pdfFolderPath('imported', `${stamp}_cover.pdf`);
      interiorPath = pdfFolderPath('imported', `${stamp}_interior.pdf`);
      await uploadBuffer(split.cover, coverPath, 'application/pdf');
      await uploadBuffer(split.interior, interiorPath, 'application/pdf');
      interiorPages = split.interiorPages;
    } catch (e: any) {
      // A one-page PDF cannot be split. The re-imposed file is still useful on
      // its own, so return it and let the dashboard hide the send button.
      console.warn('[importBookPdf] split skipped:', e?.message || e);
    }

    res.json({
      success: true,
      url: stored.signedUrl,
      objectPath,
      pageCount: result.pageCount,
      sourceWidthMm: result.sourceWidthMm,
      sourceHeightMm: result.sourceHeightMm,
      widthMm, heightMm, bleedMm,
      coverPath, interiorPath, interiorPages,
      fitScale: result.fitScale,
      // The dashboard warns on this: different proportions mean the margins
      // move, which the owner should see before sending it to print.
      aspectChanged: result.aspectChanged,
    });
  } catch (err: any) {
    const raw = String(err?.message || err);
    console.error('[importBookPdf]', raw);
    // pdf-lib's parse errors are English and internal ("Can't embed page with
    // missing Contents"). Say what the owner can act on instead.
    const damaged = /embed|missing|parse|Invalid PDF|stream|xref|encrypt/i.test(raw);
    res.status(damaged ? 400 : 500).json({
      success: false,
      message: damaged
        ? 'تعذّر قراءة ملف PDF — قد يكون تالفاً أو محمياً بكلمة مرور. جرّب تصديره من جديد ثم أعد المحاولة.'
        : 'فشل تجهيز الملف.',
      detail: raw.slice(0, 200),
    });
  }
};


/**
 * Send an already-imported book to BookPod as a real print job.
 *
 * Separate from the import on purpose: importing is free and repeatable, this
 * spends money and produces physical copies, so it is its own deliberate act
 * with its own confirmation in the dashboard.
 *
 * Self-pickup by default — the owner printing their own stock collects from
 * BookPod, which needs only a name and phone rather than a delivery address.
 */
export const submitImportedBook = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isBookPodConfigured()) {
      res.status(503).json({ success: false, message: 'BookPod غير مهيأ — لم يتم ضبط بيانات الدخول.' });
      return;
    }
    const { coverPath, interiorPath, title, quantity, widthMm, heightMm, name, phone, email, isColoring } = req.body || {};
    if (!coverPath || !interiorPath) {
      res.status(400).json({ success: false, message: 'ينقص ملف الغلاف أو الداخل — أعد استيراد الكتاب أولاً.' });
      return;
    }
    if (!String(name || '').trim() || !String(phone || '').trim()) {
      res.status(400).json({ success: false, message: 'أدخل اسم المستلم ورقم الهاتف.' });
      return;
    }

    const qty = Math.max(1, Math.min(Number(quantity) || 1, 500));
    const job = await submitPrintJob({
      // Unique per submission: BookPod rejects a repeated reference, and this
      // is also what PaymentPoller matches on.
      externalId: `import_${Date.now()}`,
      title: String(title || 'Imported book').slice(0, 120),
      isColoring: !!isColoring,
      // Imported books are the owner's own files; Arabic is the common case
      // here and is what their existing catalogue uses.
      readingDirection: 'right',
      widthCm: (Number(widthMm) || 150) / 10,
      heightCm: (Number(heightMm) || 220) / 10,
      bleed: true,
      coverPath: String(coverPath),
      interiorPath: String(interiorPath),
      quantity: qty,
      shipping: {
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: String(email || '').trim() || undefined,
        method: 'pickup',
      } as any,
    });

    res.json({ success: true, jobId: job.jobId, bookId: job.bookId, status: job.status, quantity: qty });
  } catch (err: any) {
    console.error('[submitImportedBook]', err?.message || err);
    res.status(500).json({ success: false, message: err?.message || 'فشل الإرسال إلى BookPod.' });
  }
};


/**
 * List and delete the files produced by the book importer.
 *
 * Deletion is hard-fenced to the `imported/` prefix. The same bucket holds
 * every generated book, every customer's uploaded photo and every print file,
 * so an endpoint that took arbitrary object paths would be one bad request away
 * from destroying work that cannot be regenerated. Anything outside the fence
 * is refused, not merely discouraged.
 */
const IMPORTED_PREFIX = () => pdfFolderPath('imported') + '/';

export const listImportedFiles = async (_req: Request, res: Response): Promise<void> => {
  try {
    const files = await listObjects(IMPORTED_PREFIX());
    res.json({ success: true, files, prefix: IMPORTED_PREFIX() });
  } catch (err: any) {
    console.error('[listImportedFiles]', err?.message || err);
    res.status(500).json({ success: false, message: err?.message || 'فشل جلب الملفات.' });
  }
};

export const deleteImportedFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const paths: string[] = Array.isArray(req.body?.paths) ? req.body.paths.map(String) : [];
    if (paths.length === 0) {
      res.status(400).json({ success: false, message: 'لم تحدد أي ملف للحذف.' });
      return;
    }
    const fence = IMPORTED_PREFIX();
    const outside = paths.filter((p) => !p.startsWith(fence) || p.includes('..'));
    if (outside.length > 0) {
      res.status(400).json({
        success: false,
        message: 'الحذف مسموح فقط داخل مجلد الكتب المستوردة.',
        refused: outside,
      });
      return;
    }
    for (const p of paths) await deleteObject(p);
    res.json({ success: true, deleted: paths.length });
  } catch (err: any) {
    console.error('[deleteImportedFiles]', err?.message || err);
    res.status(500).json({ success: false, message: err?.message || 'فشل الحذف.' });
  }
};
