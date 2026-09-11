import api from './axiosInstance';

export const orderApi = {
  createCheckout: async (data: object) => {
    const res = await api.post('/orders/checkout', data);
    return res.data;
  },
  /** Where to send a Bit/bank transfer. Signed-in only — the public settings
   *  endpoint deliberately no longer carries the owner's account details. */
  getTransferDetails: async () => {
    const res = await api.get('/orders/transfer-details');
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
