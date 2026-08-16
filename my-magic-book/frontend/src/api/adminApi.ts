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
  // Customer contact-form messages (admin inbox).
  getMessages: async () => {
    const response = await axiosInstance.get('/admin/messages');
    return response.data;
  },
  deleteMessage: async (id: string) => {
    const response = await axiosInstance.delete(`/admin/messages/${id}`);
    return response.data;
  },
  // Full profile for a contact-message sender: account, orders/books, messages.
  getCustomer: async (email: string) => {
    const response = await axiosInstance.get('/admin/customer', { params: { email } });
    return response.data;
  },
  // Build the book + print files for an order and (when BookPod is configured)
  // submit the print job. markPaid lets an admin fulfil a cash/COD order.
  // Returns 202 immediately — the build (~15 images, ~3 min) runs in the
  // background; poll buildStatus for progress.
  buildOrder: async (id: string, opts?: { markPaid?: boolean; buildOnly?: boolean }) => {
    const response = await axiosInstance.post(`/admin/orders/${id}/build`, {
      markPaid: opts?.markPaid ?? false,
      buildOnly: opts?.buildOnly ?? false,
    });
    return response.data;
  },
  /** Progress of a background build: {status, progress, stage, error}. */
  buildStatus: async (id: string) => {
    const response = await axiosInstance.get(`/admin/orders/${id}/build-status`);
    return response.data;
  },
  // Rebuild ONLY the print-ready PDFs from an order's already-generated images.
  // Free (no AI cost) and never re-submits to BookPod — brings an older order up
  // to the current print layout.
  reRenderOrderFiles: async (id: string) => {
    const response = await axiosInstance.post(`/admin/orders/${id}/rerender-files`);
    return response.data;
  },
  // Pro coloring book: its own rebuild (free) + BookPod submit (a 2nd print job).
  reRenderOrderColoring: async (id: string) => {
    const response = await axiosInstance.post(`/admin/orders/${id}/coloring/rerender`);
    return response.data;
  },
  submitOrderColoring: async (id: string) => {
    const response = await axiosInstance.post(`/admin/orders/${id}/coloring/submit`);
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
  // Build a showcase book AND submit it to BookPod for printing. BILLABLE —
  // prints + ships a physical book. Only call after an explicit confirmation.
  submitToBookPod: async (payload: {
    theme: string;
    childName: string;
    childGender?: 'male' | 'female';
    language?: string;
    coverPath: string;
    backPath: string;
    imagePaths: string[];
    childPhotoPath?: string;
    isColoring?: boolean;
    shipping: { fullName: string; phone: string; city?: string; street?: string; buildingNo?: string; deliveryMethod?: 'delivery' | 'pickup' };
  }) => {
    const response = await axiosInstance.post('/admin/print-book/submit', payload);
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
  /** Send an already-imported book to BookPod as a real (billable) print job. */
  submitImportedBook: async (body: {
    coverPath: string; interiorPath: string; title?: string; quantity?: number;
    widthMm?: number; heightMm?: number; name: string; phone: string; email?: string; isColoring?: boolean;
  }) => {
    const response = await axiosInstance.post('/admin/import-book/submit', body, { timeout: 5 * 60 * 1000 });
    return response.data;
  },

  /** Re-impose a supplied book PDF onto a chosen trim, print-ready. */
  importBook: async (
    file: File,
    opts: { widthMm: number; heightMm: number; bleedMm?: number; title?: string },
  ) => {
    const form = new FormData();
    form.append('file', file);
    form.append('widthMm', String(opts.widthMm));
    form.append('heightMm', String(opts.heightMm));
    if (opts.bleedMm !== undefined) form.append('bleedMm', String(opts.bleedMm));
    if (opts.title) form.append('title', opts.title);
    const response = await axiosInstance.post('/admin/import-book', form, {
      // The shared axios instance defaults to application/json. Without this
      // override the FormData goes out labelled JSON, multer parses nothing and
      // the server replies "no PDF received". uploadApi.childPhoto does the
      // same for the same reason.
      headers: { 'Content-Type': 'multipart/form-data' },
      // A scanned interior is big and every page is redrawn — the default
      // timeout gives up long before a 118-page book is done.
      timeout: 5 * 60 * 1000,
    });
    return response.data;
  },

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
