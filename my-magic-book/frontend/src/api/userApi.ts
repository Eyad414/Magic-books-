import api from './axiosInstance';

export const userApi = {
  updateProfile: async (profileData: { name?: string; email?: string; phone?: string; location?: string }) => {
    const { data } = await api.put('/user/profile', profileData);
    return data;
  },
  changePassword: async (passwords: { currentPassword: string; newPassword: string }) => {
    const { data } = await api.put('/user/password', passwords);
    return data;
  },
  deleteAccount: async () => {
    const { data } = await api.delete('/user/account');
    return data;
  },
};
