import api from './axiosInstance';

export const orderApi = {
  createCheckout: async (data: object) => {
    const res = await api.post('/orders/checkout', data);
    return res.data;
  },
  getMyOrders: async () => {
    const res = await api.get('/orders/my');
    return res.data;
  },
  /** Check if user has paid e-book / audio access for a specific story */
  getStoryAccess: async (storyId: string) => {
    const res = await api.get(`/orders/story/${storyId}/access`);
    return res.data as {
      success: boolean;
      hasAccess: boolean;
      bookPackage: string | null;
      hasEbook: boolean;
      hasAudio: boolean;
      hasColorBook: boolean;
      hasColoringBook: boolean;
    };
  },
};

export const contactApi = {
  submit: async (data: object) => {
    const res = await api.post('/contact', data);
    return res.data;
  },
};
