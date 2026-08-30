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
};

export const contactApi = {
  submit: async (data: object) => {
    const res = await api.post('/contact', data);
    return res.data;
  },
};
