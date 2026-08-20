import { Request, Response } from 'express';
import Story from '../models/Story';
import { splitStoryPreview } from '../utils/storyUtils';
import { generateStoryWithAI } from '../services/AI_Generator';

// @route POST /api/stories/create
export const createStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const { childName, childAge, childGender, childPhotoUrl, theme, storyLength, language, customThemeNote, mode, templatePages } = req.body;

    const resolvedMode: 'template' | 'ai' = mode === 'ai' ? 'ai' : 'template';
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
      mode: resolvedMode,
      // Only persist templatePages when relevant; saves DB space for AI stories.
      templatePages: resolvedMode === 'template' && Array.isArray(templatePages) ? templatePages : undefined,
      status: 'draft',
    });

    res.status(201).json({ success: true, story });
  } catch (error: any) {
    console.error('[createStory] failed:', error);
    res.status(500).json({ success: false, message: error?.message || 'فشل في إنشاء القصة' });
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
    const user = (req as any).user;
    const story = await Story.findById(req.params.id).lean();
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    // This route only checked that SOMEONE was logged in, so any account could
    // read any other customer's story by id — including their child's photo URL
    // and every generated page. Ownership is now required (admins excepted).
    const owns = String((story as any).userId) === String(user._id);
    if (!owns && user.role !== 'admin') {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }

    // Same web-reading rule as /stories/my — otherwise this is a way around it.
    if (!owns || canReadOnline(story) || user.role === 'admin') {
      res.json({ success: true, story: { ...story, webReadable: true } });
      return;
    }
    const { generatedImages, generatedText, templatePages, ...rest } = story as any;
    res.json({ success: true, story: { ...rest, webReadable: false } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب القصة' });
  }
};

// @route GET /api/stories/my
/**
 * Packages that include reading the book on the website. Everything else is a
 * PRINTED product — the customer receives the physical book, not web access.
 * 'pro' bundles everything, so it unlocks too.
 */
const WEB_READABLE_PACKAGES = ['ebook', 'pro'];

/**
 * Orders placed before web reading was gated keep their access. Customers who
 * have been reading their book online must not lose it because the rule changed
 * after they bought.
 */
const WEB_READING_GATED_FROM = new Date('2026-08-07T00:00:00.000Z');

function canReadOnline(story: any): boolean {
  // A book the owner put into someone's account by hand. There is no order and
  // no package to check, and gating it would hand a customer a gift they
  // cannot open.
  if (story.sentByAdmin) return true;
  if (WEB_READABLE_PACKAGES.includes(String(story.bookPackage || ''))) return true;
  const created = story.createdAt ? new Date(story.createdAt) : null;
  return !!created && created < WEB_READING_GATED_FROM;
}

// @route GET /api/stories/my
export const getMyStories = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const stories = await Story.find({ userId }).sort({ createdAt: -1 }).lean();

    // Strip the readable content for print-only orders. Gating in the UI alone
    // would be cosmetic — the pages would still be sitting in this response.
    // The cover stays so the dashboard can show the book they bought.
    const safe = stories.map((s: any) => {
      if (canReadOnline(s)) return { ...s, webReadable: true };
      const { generatedImages, generatedText, templatePages, ...rest } = s;
      return { ...rest, webReadable: false };
    });

    res.json({ success: true, stories: safe });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب القصص' });
  }
};

// @route DELETE /api/stories/:id — a user cancels/removes their own story.
export const deleteMyStory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user._id;
    const story = await Story.findById(req.params.id);
    if (!story) {
      res.status(404).json({ success: false, message: 'القصة غير موجودة' });
      return;
    }
    if (String(story.userId) !== String(userId)) {
      res.status(403).json({ success: false, message: 'غير مصرح' });
      return;
    }
    await story.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في حذف القصة' });
  }
};

// @route GET /api/public/test-pdf
import { buildBookHtml, BookData } from '../services/HtmlTemplateBuilder';
import { generateBookPdf } from '../services/PdfGenerator';

export const testGeneratePdf = async (req: Request, res: Response): Promise<void> => {
  try {
    const dummyPages: any[] = [];
    for(let i = 0; i < 13; i++) {
      dummyPages.push({ type: 'text', content: 'كان يا ما كان، طفل اسمه إياد، كان يحب المغامرات كثيراً... هذه الصفحة رقم ' + (i+1) });
      dummyPages.push({ type: 'image', imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' });
    }

    const bookData: BookData = {
      childName: 'إياد',
      childPhotoUrl: 'https://ui-avatars.com/api/?name=إياد&background=D4A937&color=0a1628&size=300',
      storyTitle: 'إياد في الغابة السحرية',
      coverImageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      pages: dummyPages
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
