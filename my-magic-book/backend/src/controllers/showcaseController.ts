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
async function publishedBooks(flag: 'showcase' | 'showcaseStories') {
  const stories = await Story.find({ [flag]: true })
    .select('childName childGender theme language mode generatedCover generatedImages generatedPortrait createdAt')
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();

  return stories
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
}

export const getShowcaseBooks = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, books: await publishedBooks('showcase') });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الكتب' });
  }
};

/**
 * GET /api/public/stories-page-books
 * The same allow-listed projection, for books the owner ticked onto the public
 * Stories page. Kept separate from the home page so one surface can be
 * published without the other.
 */
export const getStoriesPageBooks = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, books: await publishedBooks('showcaseStories') });
  } catch (error) {
    res.status(500).json({ success: false, message: 'فشل في جلب الكتب' });
  }
};
