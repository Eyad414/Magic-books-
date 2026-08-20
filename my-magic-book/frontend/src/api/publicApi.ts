import api from './axiosInstance';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface ChatSuggestion {
  themeId: string;
  note: string;
}
export interface StoryChatResult {
  reply: string;
  suggestion: ChatSuggestion | null;
}

export const publicApi = {
  /** Ask the server whether a discount code works. The order re-checks it. */
  checkCoupon: async (code: string) => {
    const res = await api.post('/public/coupon', { code });
    return res.data;
  },

  /** Count this visit. Anonymous — see backend models/Visit. */
  trackVisit: async (
    visitorId: string,
    path: string,
    extra: { referrer?: string; userId?: string; lang?: string; device?: string } = {},
  ) => {
    const res = await api.post('/public/visit', { visitorId, path, ...extra });
    return res.data;
  },

  getSettings: async () => {
    const res = await api.get('/public/settings');
    return res.data;
  },
  /** Real generated books the owner published to the home page. */
  getShowcaseBooks: async () => {
    const res = await api.get('/public/showcase-books');
    return res.data;
  },
  /** Real generated books the owner published to the Stories page. */
  getStoriesPageBooks: async () => {
    const res = await api.get('/public/stories-page-books');
    return res.data;
  },
  storyChat: async (payload: {
    messages: ChatMessage[];
    language: string;
    childInfo?: { name?: string; age?: string; gender?: 'male' | 'female' };
  }): Promise<StoryChatResult> => {
    const res = await api.post('/public/story-chat', payload);
    return res.data;
  },
};
