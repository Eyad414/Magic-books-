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
  getSettings: async () => {
    const res = await api.get('/public/settings');
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
