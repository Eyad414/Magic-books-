import axiosInstance from './axiosInstance';

export const adminApi = {
  getAllStories: async () => {
    const response = await axiosInstance.get('/admin/stories');
    return response.data;
  },
  updateStory: async (id: string, data: any) => {
    const response = await axiosInstance.put(`/admin/stories/${id}`, data);
    return response.data;
  },
  deleteStory: async (id: string) => {
    const response = await axiosInstance.delete(`/admin/stories/${id}`);
    return response.data;
  },
  getTeam: async () => {
    const response = await axiosInstance.get('/admin/team');
    return response.data;
  },
  addAdmin: async (adminData: any) => {
    const response = await axiosInstance.post('/admin/team', adminData);
    return response.data;
  },
  getSettings: async () => {
    const response = await axiosInstance.get('/admin/settings');
    return response.data;
  },
  updateSettings: async (settingsData: any) => {
    const response = await axiosInstance.put('/admin/settings', settingsData);
    return response.data;
  },
  getAllOrders: async () => {
    const response = await axiosInstance.get('/admin/orders');
    return response.data;
  },
  // Generate (or fetch cached) Nano-Banana preview illustrations for a theme.
  // Long-running: ~2.5 min for a fresh 13-page + portrait generation.
  generateThemeIllustrations: async (themeId: string, opts?: { force?: boolean; childName?: string }) => {
    const response = await axiosInstance.post(
      `/admin/themes/${themeId}/generate-illustrations`,
      { force: opts?.force ?? false, childName: opts?.childName },
      { timeout: 5 * 60 * 1000 }
    );
    return response.data;
  },
  // Style B (Taletoons): photoreal templates + face-swap. Templates cached;
  // re-runs only re-swap. Long-running on first run.
  generateThemePhotoreal: async (themeId: string, opts?: { forceTemplates?: boolean; childName?: string; referencePhoto?: string }) => {
    const response = await axiosInstance.post(
      `/admin/themes/${themeId}/generate-photoreal`,
      { forceTemplates: opts?.forceTemplates ?? false, childName: opts?.childName, referencePhoto: opts?.referencePhoto },
      { timeout: 8 * 60 * 1000 }
    );
    return response.data;
  },
};

export const storyApi = {
  getById: async (id: string) => {
    const response = await axiosInstance.get(`/admin/stories/${id}`);
    return response.data;
  },
};
