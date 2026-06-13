import api from './axiosInstance';

export const storyApi = {
  create: async (data: object) => {
    const res = await api.post('/stories/create', data);
    return res.data;
  },
  generate: async (storyId: string) => {
    const res = await api.post(`/stories/${storyId}/generate`);
    return res.data;
  },
  /** Stage 1: generate the child's character avatar (Nano Banana). */
  generateAvatar: async (storyId: string, childPhotoUrl: string, artStyle: string) => {
    const res = await api.post(`/stories/${storyId}/generate-avatar`, {
      childPhotoUrl,
      artStyle,
    });
    return res.data as { success: boolean; avatarUrl?: string; message?: string };
  },
  /** Stage 2: generate per-page illustrations from the approved avatar. */
  generateIllustrations: async (storyId: string, avatarUrl: string) => {
    const res = await api.post(`/stories/${storyId}/generate-illustrations`, {
      avatarUrl,
    });
    return res.data;
  },
  getIllustrationStatus: async (storyId: string) => {
    const res = await api.get(`/stories/${storyId}/illustration-status`);
    return res.data;
  },
  /** Generate one page illustration from its text + a child photo (Nano Banana). */
  generatePageImage: async (text: string, childPhotoUrl: string) => {
    const res = await api.post('/stories/generate-page-image', { text, childPhotoUrl });
    return res.data as { success: boolean; imageUrl?: string; message?: string };
  },
  customize: async (storyId: string, data: object) => {
    const res = await api.put(`/stories/${storyId}/customize`, data);
    return res.data;
  },
  getPreview: async (storyId: string) => {
    const res = await api.get(`/stories/${storyId}/preview`);
    return res.data;
  },
  getMyStories: async () => {
    const res = await api.get('/stories/my');
    return res.data;
  },
  deleteStory: async (storyId: string) => {
    const res = await api.delete(`/stories/${storyId}`);
    return res.data;
  },
};

/** Upload a File (from <input type="file">) to Cloudinary via backend. */
export const uploadApi = {
  uploadPhoto: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await api.post('/upload/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url as string;
  },
};
