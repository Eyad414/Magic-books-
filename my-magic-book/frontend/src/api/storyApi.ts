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
  remove: async (id: string) => {
    const res = await api.delete(`/stories/${id}`);
    return res.data;
  },
  /** Render just the front cover with this child's face (costs one AI image). */
  coverPreview: async (data: { childName: string; childGender: string; childPhotoUrl: string; theme: string }) => {
    const res = await api.post('/stories/cover-preview', data);
    return res.data;
  },
  coverPreviewQuota: async () => {
    const res = await api.get('/stories/cover-preview/quota');
    return res.data;
  },
};
