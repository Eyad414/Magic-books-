import { Request, Response } from 'express';
import Story from '../models/Story';
import { splitStoryPreview } from '../utils/storyUtils';
import { generateStoryWithAI, transliterateNameForLanguage } from '../services/AI_Generator';
import {
  generateIllustration,
  generateAvatar as generateAvatarImage,
  generateAllSceneIllustrations,
} from '../services/ImageGenerator';
import { getScenesForTemplate } from '../data/storyScenes';

// @route POST /api/stories/create
export const createStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const {
      childName, childAge, childGender, childPhotoUrl,
      theme, storyLength, language, customThemeNote, storyTemplateId, artStyle,
    } = req.body;

    // Reject blob: URLs — they are browser-local and meaningless on the server
    const safePhotoUrl = childPhotoUrl && !childPhotoUrl.startsWith('blob:')
      ? childPhotoUrl
      : undefined;

    const story = await Story.create({
      userId,
      childName,
      childAge,
      childGender,
      childPhotoUrl: safePhotoUrl,
      theme: theme || 'adventure',
      storyLength: storyLength || 'medium',
      language: language || 'ar',
      customThemeNote,
      artStyle: artStyle || 'storybook',
      storyTemplateId: storyTemplateId || theme || 'adventure',
      status: 'draft',
    });

    res.status(201).json({ success: true, story });
  } catch (error: any) {
    console.error('[createStory]', error);
    res.status(500).json({ success: false, message: 'فشل في إنشاء القصة', error: error.message });
  }
};

// @route POST /api/stories/:id/generate
export const generateStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    story.status = 'generating';
    await story.save();

    // Transliterate the child's name into the story's language
    // e.g. "Ahmad" → "أحمد" for Arabic stories
    const nameInStoryLang = await transliterateNameForLanguage(
      story.childName,
      story.language,
    );
    // Save it so the book renderer can use it
    story.childNameInStory = nameInStoryLang;

    const generatedText = await generateStoryWithAI({
      childName: nameInStoryLang,   // use the transliterated name in the story
      childAge: Number(story.childAge) || 5,
      childGender: story.childGender,
      theme: story.theme,
      storyLength: story.storyLength,
      language: story.language,
      customThemeNote: story.customThemeNote,
    });

    story.generatedText = generatedText;
    story.status = 'ready';
    await story.save();

    res.json({ success: true, story });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في توليد القصة' });
  }
};

// @route POST /api/stories/:id/generate-avatar
// Stage 1 of the Nano Banana pipeline: turn the child's photo into a consistent
// character avatar in the chosen art style. The customer approves it before the
// per-page illustrations are generated.
export const generateAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    const childPhotoUrl: string = req.body.childPhotoUrl || story.childPhotoUrl || '';
    if (!childPhotoUrl || childPhotoUrl.startsWith('blob:')) {
      res.status(400).json({ success: false, message: 'رابط صورة الطفل مطلوب (وغير صالح إن كان blob)' });
      return;
    }

    const artStyle: string = req.body.artStyle || story.artStyle || 'storybook';

    const avatarUrl = await generateAvatarImage(childPhotoUrl, {
      childName: story.childName,
      childAge: story.childAge,
      childGender: story.childGender,
      artStyle,
    });

    // Persist for the illustration step + so the customer can re-fetch it
    story.childPhotoUrl = childPhotoUrl;
    story.artStyle = artStyle;
    story.avatarUrl = avatarUrl;
    await story.save();

    res.json({ success: true, avatarUrl });
  } catch (error: any) {
    console.error('[generateAvatar]', error);
    res.status(500).json({ success: false, message: error.message || 'فشل في توليد الأفاتار' });
  }
};

// @route POST /api/stories/:id/generate-illustrations
// Stage 2 of the Nano Banana pipeline: drop the approved avatar into every story
// scene so each page shows the same recognisable child, matching the page event.
//  1. Requires the avatar (from generate-avatar) — high character consistency
//  2. Generates one illustration per scene from data/storyScenes.ts
//  3. Uploads results to Cloudinary and stores the URLs
export const generateIllustrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    const avatarUrl: string = req.body.avatarUrl || story.avatarUrl || '';
    if (!avatarUrl || avatarUrl.startsWith('blob:')) {
      res.status(400).json({ success: false, message: 'الأفاتار مطلوب — قم بتوليد أفاتار الطفل أولاً' });
      return;
    }

    const templateId = story.storyTemplateId || story.theme || 'adventure';
    const sceneData = getScenesForTemplate(templateId);

    // Mark as illustrating
    story.illustrationStatus = 'generating';
    story.status = 'illustrating';
    await story.save();

    // Build the per-scene jobs from the template's scene prompts
    const childInfo = {
      childName: story.childName,
      childAge: story.childAge,
      childGender: story.childGender,
      artStyle: story.artStyle || 'storybook',
    };

    console.log(
      `[Illustrations] Nano Banana: rendering ${sceneData.scenes.length} scenes for story ${story._id}...`,
    );

    const scenes = sceneData.scenes.map((scene) => ({
      sceneText: scene.scenePrompt,
      folder: `magic-fanoose/stories/${story._id}`,
    }));

    const finalUrls = await generateAllSceneIllustrations(avatarUrl, scenes, childInfo, 3);

    // Save to story
    story.illustrationUrls = finalUrls;
    story.illustrationStatus = 'done';
    story.status = story.generatedText ? 'ready' : story.status === 'illustrating' ? 'generating' : story.status;
    await story.save();

    res.json({
      success: true,
      illustrationUrls: finalUrls,
      story,
    });
  } catch (error: any) {
    console.error('[generateIllustrations]', error);
    // Mark as failed so UI can show error
    try {
      await Story.findByIdAndUpdate(req.params.id, {
        illustrationStatus: 'failed',
        illustrationError: error.message,
      });
    } catch (_) {}
    res.status(500).json({ success: false, message: error.message || 'فشل في توليد الصور' });
  }
};

// @route POST /api/stories/generate-page-image
// Generate (or regenerate) ONE page illustration from its text + a child photo
// using Nano Banana (Gemini 2.5 Flash Image). Used by the admin page editor so
// each page's image is built from that page's text with the child's likeness.
export const generatePageImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, childPhotoUrl, artStyle } = req.body as {
      text?: string;
      childPhotoUrl?: string;
      artStyle?: string;
    };

    if (!text || !text.trim()) {
      res.status(400).json({ success: false, message: 'نص الصفحة مطلوب' });
      return;
    }
    if (!childPhotoUrl || !childPhotoUrl.trim() || childPhotoUrl.startsWith('blob:')) {
      res.status(400).json({ success: false, message: 'رابط صورة الطفل مطلوب (وغير صالح إن كان blob)' });
      return;
    }

    const imageUrl = await generateIllustration(text, childPhotoUrl, artStyle || 'storybook');
    res.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error('[generatePageImage]', error);
    res.status(500).json({ success: false, message: error.message || 'فشل في توليد الصورة' });
  }
};

// @route GET /api/stories/:id/illustration-status
export const getIllustrationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await Story.findById(req.params.id).select(
      'illustrationStatus illustrationUrls illustrationError status'
    );
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }
    res.json({
      success: true,
      illustrationStatus: story.illustrationStatus,
      illustrationUrls: story.illustrationUrls,
      illustrationError: story.illustrationError,
      storyStatus: story.status,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الحالة' });
  }
};

// @route PUT /api/stories/:id/customize
export const customizeStory = async (req: Request, res: Response): Promise<void> => {
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

// @route GET /api/stories/:id/preview — returns first 30%
export const getStoryPreview = async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    const { preview } = splitStoryPreview(story.generatedText || '');
    res.json({
      success: true,
      preview,
      childName: story.childName,
      theme: story.theme,
      coverImageUrl: story.coverImageUrl,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب المعاينة' });
  }
};

// @route GET /api/stories/:id/full — requires paid order
export const getFullStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }
    res.json({ success: true, story });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب القصة' });
  }
};

// @route GET /api/stories/my
export const getMyStories = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const stories = await Story.find({ userId }).sort({ createdAt: -1 });
    res.json({ success: true, stories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب القصص' });
  }
};

// @route GET /api/public/test-pdf
import { buildBookHtml, BookData } from '../services/HtmlTemplateBuilder';
import { generateBookPdf } from '../services/PdfGenerator';

export const testGeneratePdf = async (req: Request, res: Response): Promise<void> => {
  try {
    // Build 26 storyPages: alternating text and illustration
    const storyPages: { text?: string; illustrationUrl?: string }[] = [];
    for (let i = 0; i < 13; i++) {
      storyPages.push({ text: `كان يا ما كان، طفل اسمه إياد، كان يحب المغامرات كثيراً... هذه الصفحة رقم ${i + 1}` });
      storyPages.push({ illustrationUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' });
    }

    const bookData: BookData = {
      childName: 'إياد',
      childPhotoUrl: 'https://ui-avatars.com/api/?name=إياد&background=D4A937&color=0a1628&size=300',
      storyTitle: 'إياد في الغابة السحرية',
      coverImageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      storyPages,
      moralAr: 'الشجاعة والمحبة والصبر هي أعظم الكنوز.',
      questionsAr: ['ماذا تعلّم إياد في رحلته؟', 'لو كنت مكان إياد، ماذا كنت ستفعل؟'],
      conclusionAr: 'أحسنت يا إياد! أنت بطل حقيقي. 🌟',
    };

    const html = buildBookHtml(bookData);
    const pdfBuffer = await generateBookPdf(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="magic-fanoose-book.pdf"');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @route DELETE /api/stories/:id
export const deleteStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const story = await Story.findOne({ _id: req.params.id, userId });
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة أو ليس لديك صلاحية لحذفها' });
      return;
    }
    await Story.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف القصة بنجاح' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في حذف القصة' });
  }
};
