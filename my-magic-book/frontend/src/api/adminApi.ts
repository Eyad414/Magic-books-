import axiosInstance from './axiosInstance';

/**
 * A print build that dies WITH the server sends no response at all, so axios
 * reports a bare "Network Error" and the console shows a CORS failure — the two
 * least informative ways to say "the box ran out of memory". Say what happened.
 */
function printRequestError(err: any): Error {
  if (err?.response) return err;
  return new Error(
    'انقطع الاتصال بالخادم أثناء تجهيز ملف الطباعة — على الأغلب نفدت ذاكرته وتوقّف. ' +
    'ليست مشكلة في الموقع: جهّز الملفات من الجهاز ثم اربطها بالطلب.'
  );
}

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
  /** Which demo books have every image a printer needs (checked in storage). */
  getPrintReadiness: async () => {
    const response = await axiosInstance.get('/admin/print-readiness', { timeout: 3 * 60 * 1000 });
    return response.data;
  },

  /**
   * BILLABLE — prints and ships one finished demo book straight from the
   * readiness list. The server resolves the artwork itself, so what was
   * checked as ready is exactly what goes.
   */
  sendReadyThemeBook: async (body: {
    theme: string;
    childName: string;
    /** Print choices; omit to keep the default for this kind of book. */
    printColor?: string;
    sheetType?: string;
    lamination?: string;
    childGender?: 'male' | 'female';
    language?: string;
    shipping: { fullName: string; phone: string; deliveryMethod?: 'delivery' | 'pickup'; pickupLocation?: string; city?: string; street?: string; buildingNo?: string; notes?: string };
  }) => {
    const response = await axiosInstance.post('/admin/print-readiness/send', body);
    return response.data;
  },

  /** Today's visits: what each browser did, named only if it signed in. */
  /** `from`/`to` are YYYY-MM-DD and win over `days` when both are given. */
  getVisits: async (days = 1, from?: string, to?: string) => {
    const response = await axiosInstance.get('/admin/visits', { params: { days, from, to } });
    return response.data;
  },

  /** Accounts, sign-ins, and what each person actually ordered. */
  getCustomers: async () => {
    const response = await axiosInstance.get('/admin/customers');
    return response.data;
  },

  /** Put a book we made into a customer's own account. Sends nothing to print. */
  sendBookToCustomer: async (payload: Record<string, any>) => {
    const response = await axiosInstance.post('/admin/books/send-to-customer', payload);
    return response.data;
  },

  /** The inbox: one row per customer with a thread, newest first. */
  getConversations: async () => {
    const response = await axiosInstance.get('/admin/conversations');
    return response.data;
  },

  /** Mark what the customer sent us as read. */
  markThreadRead: async (userId: string) => {
    const response = await axiosInstance.post(`/admin/customers/${userId}/messages/read`);
    return response.data;
  },

  /** Unread-message counts per customer, for the customers list. */
  getMessageCounts: async () => {
    const response = await axiosInstance.get('/admin/customer-messages');
    return response.data;
  },

  /** The whole thread with one customer, including whether they read ours. */
  getCustomerThread: async (userId: string) => {
    const response = await axiosInstance.get(`/admin/customers/${userId}/messages`);
    return response.data;
  },

  /** Write to one customer. They see it when they sign in. */
  messageCustomer: async (userId: string, body: string, storyId?: string) => {
    const response = await axiosInstance.post(`/admin/customers/${userId}/message`, { body, storyId });
    return response.data;
  },

  /**
   * Pay one BookPod print run by card. Card fields are forwarded and never
   * stored anywhere on our side — only the returned paymentReference is kept.
   */
  /** Hand a finished order to its customer to read in their account. */
  sendOrderDigital: async (orderId: string) => {
    const response = await axiosInstance.post(`/admin/orders/${orderId}/send-digital`, {});
    return response.data;
  },
  payPrintJob: async (orderNo: string, card: { cardNumber: string; expiryMonth: number; expiryYear: number; cvv: string; citizenId?: string }) => {
    const response = await axiosInstance.post(`/admin/print-jobs/${orderNo}/pay`, card);
    return response.data;
  },

  /** Ask BookPod what happened to jobs already sent. Read-only — sends nothing. */
  refreshPrintJobs: async () => {
    const response = await axiosInstance.post('/admin/print-jobs/refresh');
    return response.data;
  },

  /** Log of books sent to the printer (demo books and imported PDFs). */
  getPrintJobs: async (limit = 30) => {
    const response = await axiosInstance.get('/admin/print-jobs', { params: { limit } });
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
  /** Record that a card payment arrived — no build, no print run. */
  confirmOrderPayment: async (id: string) => {
    const response = await axiosInstance.post(`/admin/orders/${id}/confirm-payment`);
    return response.data;
  },

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
  /**
   * Send SEVERAL finished orders to BookPod as ONE print order — one delivery
   * for the batch, so shipping is billed once instead of per book. Reuses each
   * order's existing PDFs; it never rebuilds them.
   */
  bulkPrintOrders: async (payload: {
    orderIds: string[];
    shipping: {
      method: 'pickup' | 'delivery';
      name: string;
      phone: string;
      email?: string;
      city?: string;
      street?: string;
      house?: string;
      floor?: number;
      zipCode?: string;
      notes?: string;
    };
  }) => {
    const response = await axiosInstance.post('/admin/orders/bulk-print', payload);
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
    try {
      const response = await axiosInstance.post('/admin/print-book', payload);
      return response.data;
    } catch (err: any) {
      throw printRequestError(err);
    }
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
    try {
      const response = await axiosInstance.post('/admin/print-book/submit', payload);
      return response.data;
    } catch (err: any) {
      throw printRequestError(err);
    }
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
  /** Design real cover art for an imported book (1 paid image). */
  designImportedCover: async (body: {
    title: string; subject?: string; author?: string;
    widthMm?: number; heightMm?: number; interiorPages: number; rtl?: boolean;
  }) => {
    const response = await axiosInstance.post('/admin/import-book/cover', body, { timeout: 5 * 60 * 1000 });
    return response.data;
  },

  /**
   * Upload the owner's OWN cover for an imported book (PDF taken as-is, image
   * composed into a wraparound).
   *
   * The Content-Type header is set explicitly: the shared axios instance
   * defaults to application/json, and a FormData body sent under that label
   * reaches the server with no file attached — which is exactly how the first
   * book import failed with "no PDF received".
   */
  uploadImportedCover: async (
    file: File,
    opts: { title?: string; author?: string; widthMm?: number; heightMm?: number; interiorPages?: number; rtl?: boolean },
  ) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(opts).forEach(([k, v]) => v !== undefined && form.append(k, String(v)));
    const response = await axiosInstance.post('/admin/import-book/cover-upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 5 * 60 * 1000,
    });
    return response.data;
  },

  submitImportedBook: async (body: {
    /** Print choices; omit to keep BookPod's default for this book. */
    printColor?: string;
    sheetType?: string;
    lamination?: string;
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

  /**
   * Build a story's colouring version. Everything is optional now: with an
   * empty body the server derives the scenes from the story itself, which is
   * how the dashboard calls it.
   */
  generateThemeColoring: async (themeId: string, opts: { coloringScenes?: string[]; coloringCoverScene?: string; coloringBackCoverScene?: string; referencePhoto?: string; childName?: string; childGender?: 'male' | 'female'; coverOnly?: boolean } = {}) => {
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
