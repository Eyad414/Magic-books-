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
  generateIllustrations: async (storyId: string, childPhotoUrl: string) => {
    const res = await api.post(`/stories/${storyId}/generate-illustrations`, {
      childPhotoUrl,
    });
    return res.data;
  },
  getIllustrationStatus: async (storyId: string) => {
    const res = await api.get(`/stories/${storyId}/illustration-status`);
    return res.data;
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
