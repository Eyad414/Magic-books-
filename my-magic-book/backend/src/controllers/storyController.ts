import { Request, Response } from 'express';
import Story from '../models/Story';
import StoryTemplate from '../models/StoryTemplate';
import { splitStoryPreview } from '../utils/storyUtils';
import { generateStoryWithAI } from '../services/AI_Generator';
import { generateBaseScene, generateAllIllustrations } from '../services/FalAIService';
import { uploadFromUrl } from '../services/CloudinaryUploadService';
import { getScenesForTemplate } from '../data/storyScenes';

// @route POST /api/stories/create
export const createStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { childName, childAge, childGender, childPhotoUrl, theme, storyLength, language, customThemeNote } = req.body;

    const story = await Story.create({
      userId,
      childName,
      childAge,
      childGender,
      childPhotoUrl,
      theme: theme || 'adventure',
      storyLength: storyLength || 'medium',
      language: language || 'ar',
      customThemeNote,
      status: 'draft',
    });

    res.status(201).json({ success: true, story });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في إنشاء القصة' });
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

    const generatedText = await generateStoryWithAI({
      childName: story.childName,
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

// @route POST /api/stories/:id/generate-illustrations
// Generates 13 personalised illustrations for the story using fal.ai:
//  1. Ensures base scenes exist in DB (generate them once per story template)
//  2. Face-swaps the child's photo into each base scene
//  3. Uploads results to Cloudinary and stores the URLs
export const generateIllustrations = async (req: Request, res: Response): Promise<void> => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    const childPhotoUrl: string = req.body.childPhotoUrl || story.childPhotoUrl || '';
    if (!childPhotoUrl) {
      res.status(400).json({ success: false, message: 'childPhotoUrl is required' });
      return;
    }

    const templateId = story.storyTemplateId || story.theme || 'adventure';
    const sceneData = getScenesForTemplate(templateId);

    // Mark as illustrating
    story.illustrationStatus = 'generating';
    story.status = 'illustrating';
    await story.save();

    // ── Step 1: Ensure base scenes exist (shared across all children) ────────
    let templateDoc = await StoryTemplate.findOne({ templateId });

    if (!templateDoc || templateDoc.scenes.length < sceneData.scenes.length) {
      // Generate base scenes (admin one-time cost)
      console.log(`[Illustrations] Generating ${sceneData.scenes.length} base scenes for template "${templateId}"...`);

      const generatedScenes = await Promise.all(
        sceneData.scenes.map(async (scene) => {
          const { imageUrl } = await generateBaseScene(scene.scenePrompt);
          // Upload to Cloudinary so we have a permanent URL
          const cloudinaryUrl = await uploadFromUrl(imageUrl, `magic-fanoose/templates/${templateId}`);
          return {
            pageIndex: scene.pageIndex,
            scenePrompt: scene.scenePrompt,
            baseSceneUrl: cloudinaryUrl,
          };
        })
      );

      templateDoc = await StoryTemplate.findOneAndUpdate(
        { templateId },
        {
          templateId,
          titleAr: sceneData.titleAr,
          scenes: generatedScenes,
          scenesGeneratedAt: new Date(),
        },
        { upsert: true, new: true }
      );
    }

    // ── Step 2: Face-swap child's photo into each base scene ─────────────────
    console.log(`[Illustrations] Face-swapping child photo into ${templateDoc!.scenes.length} scenes...`);

    const jobs = templateDoc!.scenes.map((scene) => ({
      pageIndex: scene.pageIndex,
      baseSceneUrl: scene.baseSceneUrl,
      childPhotoUrl,
    }));

    const swappedUrls = await generateAllIllustrations(jobs, 3); // 3 in parallel

    // ── Step 3: Upload results to Cloudinary ─────────────────────────────────
    const finalUrls = await Promise.all(
      swappedUrls.map((url) =>
        uploadFromUrl(url, `magic-fanoose/stories/${story._id}`)
      )
    );

    // ── Step 4: Save to story ─────────────────────────────────────────────────
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
