import { Request, Response } from 'express';
import Story from '../models/Story';
import { splitStoryPreview } from '../utils/storyUtils';
import { generateStoryWithAI } from '../services/AI_Generator';

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
