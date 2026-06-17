import api from './axiosInstance';

export interface ChildPhotoUploadResult {
  success: boolean;
  gcsUri: string;
  objectPath: string;
  signedUrl: string;
}

export const uploadApi = {
  /** Uploads a kid photo to the backend, which forwards it to GCS. */
  childPhoto: async (file: File): Promise<ChildPhotoUploadResult> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post<ChildPhotoUploadResult>('/uploads/child-photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};
