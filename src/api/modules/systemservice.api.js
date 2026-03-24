import { post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiSystemService = {
  uploadFile: (params, config) => post(`${baseUrl.itscSystemservice}/v1/file/edm3/upload`, params, config),
  fileEdm3QueryDetails: (params, config) => post(`${baseUrl.itscSystemservice}/v1/file/edm3/query/details`, params, config),
  parseEdmFile: (params, config) => post(`${baseUrl.projectDesign}/v1/projectDesign/datalake/parseEdmFile`, params, config),
  autoMapFields: (params, config) => post('/itsc/lingluoservice/dataSmart/autoMapFields', params, config),
};
