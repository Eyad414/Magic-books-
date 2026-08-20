import axiosInstance from './axiosInstance';

/** The signed-in customer's own thread with the shop. */
export const messageApi = {
  /** Opening the list marks the shop's messages as read. */
  getMy: async () => {
    const res = await axiosInstance.get('/messages/my');
    return res.data;
  },
  /** Badge only — does not mark anything read. */
  unread: async () => {
    const res = await axiosInstance.get('/messages/unread');
    return res.data;
  },
  reply: async (body: string) => {
    const res = await axiosInstance.post('/messages', { body });
    return res.data;
  },
};

export default messageApi;
