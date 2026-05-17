import api from './axiosInstance';

export const publicApi = {
  getSettings: async () => {
    const res = await api.get('/public/settings');
    return res.data;
  },
};
