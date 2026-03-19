import { post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiSystemService = {
  uploadFile: (params, config) => post(`${baseUrl.itscSystemservice}/v1/file/edm3/upload`, params, config),
};
