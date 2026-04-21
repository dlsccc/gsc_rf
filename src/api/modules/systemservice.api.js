import { post, get } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiSystemService = {
  uploadFile: (params, config) => post(`${baseUrl.itscSystemservice}/v1/file/edm3/upload`, params, config),
  fileEdm3QueryDetails: (params, config) => post(`${baseUrl.itscSystemservice}/v1/file/edm3/query/details`, params, config),
  parseEdmFile: (params, config) => post(`${baseUrl.projectDesign}/v1/projectDesign/datalake/parseEdmFile`, params, config),
  autoMapFields: (params, config) => post(`${baseUrl.lingluoService}/v1/dataSmart/autoMapFields`, params, config),
  generateProcessConfig: (params, config) => post(`${baseUrl.lingluoService}/v1/dataSmart/generateProcessConfig`, params, config),
  preDownload: (fileId, config) => get(`${baseUrl.itscSystemservice}/v1/file/edm3/preDownload?fileId=${fileId}`, null, config),
  fileEdm3Download: (fileId, checkItem, downloadCode) => {
    const query = new URLSearchParams();
    if (checkItem !== undefined && checkItem !== null && String(checkItem).trim()) {
      query.append('checkItem', String(checkItem).trim());
    }
    if (downloadCode !== undefined && downloadCode !== null && String(downloadCode).trim()) {
      query.append('downloadCode', String(downloadCode).trim());
    }
    const queryString = query.toString();
    return `${baseUrl.itscSystemservice}/v1/file/edm3/download/${fileId}${queryString ? `?${queryString}` : ''}`;
  },
};


