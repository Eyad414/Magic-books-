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
};
