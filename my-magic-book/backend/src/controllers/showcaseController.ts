import { Request, Response } from 'express';
import Story from '../models/Story';

/**
 * GET /api/public/showcase-books
 *
 * The real books the owner ticked "show on the home page", so visitors browse
 * an actual generated book rather than a theme mock-up.
 *
 * This is an UNAUTHENTICATED endpoint over customer-owned documents, so it
 * returns an explicit allow-list of display fields and never the whole story:
 * no userId, no order or pricing data, no shipping details, and no child photo
 * URL. It also only ever matches stories with showcase === true, so an id
 * cannot be guessed to read someone else's book.
 */
export const getShowcaseBooks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stories = await Story.find({ showcase: true })
      .select('childName childGender theme language mode generatedCover generatedImages generatedPortrait createdAt')
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const books = stories
      // A book with no artwork would render as blank pages.
      .filter((s: any) => s.generatedCover || (s.generatedImages || []).length)
      .map((s: any) => ({
        id: String(s._id),
        childName: s.childName,
        childGender: s.childGender,
        theme: s.theme,
        language: s.language,
        mode: s.mode,
        cover: s.generatedCover || '',
        images: s.generatedImages || [],
        portrait: s.generatedPortrait || '',
      }));

    res.json({ success: true, books });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الكتب' });
  }
};
