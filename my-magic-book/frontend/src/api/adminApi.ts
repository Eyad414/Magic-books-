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
  addAdmin: async (adminData: { email: string }) => {
    const response = await axiosInstance.post('/admin/team', adminData);
    return response.data;
  },
  removeAdmin: async (id: string) => {
    const response = await axiosInstance.delete(`/admin/team/${id}`);
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
  // Build the book + print files for an order and (when BookPod is configured)
  // submit the print job. markPaid lets an admin fulfil a cash/COD order.
  // Long-running: generates ~15 images, ~3 min.
  buildOrder: async (id: string, opts?: { markPaid?: boolean }) => {
    const response = await axiosInstance.post(`/admin/orders/${id}/build`, {
      markPaid: opts?.markPaid ?? false,
    });
    return response.data;
  },
  // Rebuild ONLY the print-ready PDFs from an order's already-generated images.
  // Free (no AI cost) and never re-submits to BookPod — brings an older order up
  // to the current print layout.
  reRenderOrderFiles: async (id: string) => {
    const response = await axiosInstance.post(`/admin/orders/${id}/rerender-files`);
    return response.data;
  },
  // Build a print-ready PDF (cover + interior) for a showcase/preview book in the
  // book viewer — not tied to an order, never touches BookPod. Returns object
  // paths for the uploaded PDFs. Long-running: ~30–60s (downloads + composes).
  buildPreviewPrint: async (payload: {
    theme: string;
    childName: string;
    childGender?: 'male' | 'female';
    language?: string;
    coverPath: string;
    backPath: string;
    imagePaths: string[];
    childPhotoPath?: string;
    isColoring?: boolean;
  }) => {
    const response = await axiosInstance.post('/admin/print-book', payload);
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
  // Coloring book: colored cover + 16 line-art pages + colored back cover, from
  // the admin-typed scenes + an uploaded reference photo. Long-running (~3 min).
  generateThemeColoring: async (themeId: string, opts: { coloringScenes: string[]; coloringCoverScene?: string; coloringBackCoverScene?: string; referencePhoto?: string; childName?: string; childGender?: 'male' | 'female' }) => {
    const response = await axiosInstance.post(
      `/admin/themes/${themeId}/generate-coloring`,
      opts,
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
