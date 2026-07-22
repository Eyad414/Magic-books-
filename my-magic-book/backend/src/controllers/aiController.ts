import { Request, Response } from 'express';
import { storyChatSuggest, type ChatMessage } from '../services/StoryChatService';

/**
 * POST /api/public/story-chat
 * Body: { messages: {role:'user'|'assistant', content:string}[], language?: 'ar'|'en'|'he' }
 * Guided theme-picker chat for the Step 2 wizard. Returns the assistant's reply
 * and, once confident, a { themeId, note } suggestion the UI can apply.
 */
export const storyChat = async (req: Request, res: Response) => {
  try {
    const { messages, language } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ message: 'messages must be an array' });
    }
    const lang = ['ar', 'en', 'he'].includes(language) ? language : 'ar';
    const result = await storyChatSuggest(messages as ChatMessage[], lang);
    return res.json(result);
  } catch (err: any) {
    console.error('[aiController] storyChat error:', err);
    return res.status(500).json({ message: 'chat failed' });
  }
};
