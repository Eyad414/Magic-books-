import { Request, Response } from 'express';
import User from '../models/User';
import Story from '../models/Story';
import Order from '../models/Order';
import SiteSettings, { DEFAULT_HOME_STATS } from '../models/SiteSettings';
import ContactMessage from '../models/ContactMessage';
import { buildBookForOrder, reRenderPrintFilesForOrder, submitOrderToBookPod, reRenderColoringForOrder, submitColoringForOrder, buildPreviewPrintFiles, submitPreviewToBookPod } from '../services/BookBuilder';
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
      // Dinosaur Adventure — seeded so it shows up in the dashboard's Stories &
      // Themes tab. Left ready:false and with no demo images: the owner generates
      // the artwork with the 🎨 button, reviews it, then ticks "جاهزة" to publish.
      // Never re-seeded once present, so admin edits are not overwritten.
      const DINO_PAGES = [
        { text: "بَيْنَمَا كَانَ{|تْ} [NAME] {يَلْعَبُ|تَلْعَبُ} فِي الْحَدِيقَةِ، عَثَرَ{|تْ} عَلَى حَجَرٍ يَلْمَعُ يُشْبِهُ بَيْضَةً ضَخْمَةً. وَبِمُجَرَّدِ أَنْ لَمَسَ{هُ|تْهُ}، اهْتَزَّتِ الْأَرْضُ وَاخْتَفَتِ الْحَدِيقَةُ!", imageSrc: "" },
        { text: "وَجَدَ{|تْ} [NAME] نَفْسَ{هُ|هَا} وَسْطَ غَابَةِ مَا قَبْلَ التَّارِيخِ، أَشْجَارُهَا أَطْوَلُ مِنْ نَاطِحَاتِ السَّحَابِ، وَسَمِعَ{|تْ} خُطُوَاتٍ ضَخْمَةً تَهُزُّ الْمَكَانَ.", imageSrc: "" },
        { text: "ظَهَرَ دِينَاصُورُ (تِي رِيكْس) ضَخْمٌ! لَكِنَّهُ لَمْ يَكُنْ مُخِيفاً، بَلْ كَانَ يَرْتَدِي وِشَاحاً أَخْضَرَ وَيَبْحَثُ عَنْ نَظَّارَتِهِ الْمَفْقُودَةِ بِحُزْنٍ.", imageSrc: "" },
        { text: "قَالَ تْرِيكْس: \"أَنَا لَا أَرَى جَيِّداً بِدُونِ نَظَّارَتِي!\" نَظَرَ{|تْ} [NAME] حَوْلَ{هُ|هَا} وَتَسَاءَلَ{|تْ}: \"يَا بَطَل{|ةَ}! هَلْ نَرْكَبُ عَلَى ظَهْرِ تْرِيكْس لِنَبْحَثَ مِنَ الْأَرْضِ، أَمْ نَطْلُبُ مُسَاعَدَةَ الدِّينَاصُورِ الطَّائِرِ بْتِيرُودَاكْتِيل لِنَبْحَثَ مِنَ السَّمَاءِ؟\"", imageSrc: "" },
        { text: "قَفَزَ{|تْ} [NAME] عَلَى ظَهْرِ تْرِيكْس بِكُلِّ شَجَاعَةٍ، وَبَدَأُوا يَمْشُونَ وَسْطَ الْغَابَةِ لِاسْتِكْشَافِ الْأَمَاكِنِ الْعَالِيَةِ بِفَضْلِ نَظَرِهِ الْقَوِيِّ.", imageSrc: "" },
        { text: "وَصَلُوا إِلَى بُحَيْرَةٍ زَرْقَاءَ، وَرَأَ{ى|تْ} [NAME] النَّظَّارَةَ عَالِقَةً فَوْقَ شَجَرَةِ مَوْزٍ عِمْلَاقَةٍ. اِسْتَخْدَمَ{|تْ} غُصْناً طَوِيلاً وَحَبْلاً مَتِيناً وَسَحَبَ{هَا|تْهَا} بِذَكَاءٍ.", imageSrc: "" },
        { text: "اِرْتَدَى الدِّينَاصُورُ نَظَّارَتَهُ وَصَرَخَ فَرَحاً: \"شُكْراً يَا [NAME]! الْآنَ أَسْتَطِيعُ رُؤْيَةَ أَصْدِقَائِي الصِّغَارِ وَالْأَلْوَانَ مِنْ جَدِيدٍ!\"", imageSrc: "" },
        { text: "أَخَذَ تْرِيكْس صَدِيقَ{هُ|تَهُ} إِلَى كَهْفٍ سِرِّيٍّ مَلِيءٍ بِالرُّسُومَاتِ الْقَدِيمَةِ وَالرُّمُوزِ الْعَجِيبَةِ. يَا بَطَل{|ةَ}! هَلْ {يُمْكِنُكَ|يُمْكِنُكِ} الْعُثُورُ عَلَى بَيْضَةِ الدِّينَاصُورِ الْمُنَقَّطَةِ الْمُخْتَبِئَةِ بَيْنَ الصُّخُورِ؟", imageSrc: "" },
        { text: "اِحْتِفَالاً بِذَكَاءِ [NAME]، قَطَفَتْ {لَهُ|لَهَا} الدِّينَاصُورَاتُ أَكْبَرَ حَبَّةِ فَرَاوِلَةٍ فِي الْعَالَمِ، كَانَتْ بِحَجْمِ الْبِطِّيخَةِ وَلَذِيذَةً جِدّاً!", imageSrc: "" },
        { text: "نَظَرَ{|تْ} [NAME] إِلَى الْجَبَلِ الْبَعِيدِ وَرَأَ{ى|تْ} بُرْكَاناً عَجِيباً يَخْرُجُ مِنْهُ فَقَاعَاتُ صَابُونٍ مُلَوَّنَةٌ بَدَلاً مِنَ الْحُمَمِ، فَضَحِكَ{|تْ} كَثِيراً عَلَى الْمَنْظَرِ.", imageSrc: "" },
        { text: "أَعْطَى تْرِيكْس [NAME] حَجَراً صَغِيراً مَنْقُوشاً عَلَيْهِ صُورَةُ قَلْبٍ، لِ{يَتَذَكَّرَ|تَتَذَكَّرَ} دَائِماً أَنَّ{هُ|هَا} بَطَل{ٌ|ةٌ} حَقِيقِي{ٌّ|َّةٌ} وَصَدِيق{ٌ|َةٌ} لِلدِّينَاصُورَاتِ.", imageSrc: "" },
        { text: "أَغْمَضَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} وَتَمَنَّ{ى|تْ} الْعَوْدَةَ إِلَى الْمَنْزِلِ، فَبَدَأَتْ أَشْجَارُ الْغَابَةِ تَتَلَاشَى بِبُطْءٍ وَصَوْتُ الدِّينَاصُورِ يُوَدِّعُ{هُ|هَا} بِلُطْفٍ.", imageSrc: "" },
        { text: "فَتَحَ{|تْ} [NAME] عَيْنَيْ{هِ|هَا} لِ{يَجِدَ|تَجِدَ} نَفْسَ{هُ|هَا} فِي حَدِيقَةِ الْمَنْزِلِ وَمَعَ{هُ|هَا} الْحَجَرُ الْمَنْقُوشُ، وَه{ُوَ|ِيَ} {يَعْلَمُ|تَعْلَمُ} أَنَّ الِاسْتِكْشَافَ وَالشَّجَاعَةَ {يَجْعَلَانِهِ|يَجْعَلَانِهَا} {يَخُوضُ|تَخُوضُ} أَجْمَلَ الْمُغَامَرَاتِ.", imageSrc: "" },
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
          ready: false, pages: DINO_PAGES, ...dinoArt,
        });
        settings.markModified('themes');
        await settings.save();
      } else if (!dinoTheme.generatedCover) {
        // Attach the demo artwork once, without touching `ready` — publishing
        // the story to customers stays the owner's decision.
        Object.assign(dinoTheme, dinoArt);
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
      homeStats: settings.homeStats || DEFAULT_HOME_STATS,
      allowSkipPhoto: !!settings.allowSkipPhoto,
      aiModeEnabled: !!settings.aiModeEnabled,
    };
    res.json({ success: true, settings: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
  }
};

// @route PUT /api/admin/settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookPackages, themes, homeStats, allowSkipPhoto, aiModeEnabled } = req.body;
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = new SiteSettings({ bookPackages, themes, homeStats, allowSkipPhoto, aiModeEnabled });
    } else {
      if (bookPackages) {
        settings.bookPackages = bookPackages;
        settings.markModified('bookPackages');
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
