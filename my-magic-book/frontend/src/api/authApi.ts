import api from './axiosInstance';

export const authApi = {
  register: async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  },
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  getMe: async (token?: string) => {
    const { data } = await api.get('/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data;
  },
};
