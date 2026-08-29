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
  /**
   * The digital copy, as bytes. It needs the auth header like everything else,
   * so it cannot be a plain link — the browser would send an anonymous request
   * and get a 401 instead of a file.
   */
  downloadEbook: async (orderId: string): Promise<Blob> => {
    const res = await api.get(`/orders/${orderId}/ebook`, { responseType: 'blob' });
    return res.data as Blob;
  },
};

export const contactApi = {
  submit: async (data: object) => {
    const res = await api.post('/contact', data);
    return res.data;
  },
};
