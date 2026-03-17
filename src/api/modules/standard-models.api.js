import { post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiStandardModelsService = {
  list: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/queryModel`, params, config),
  detail: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/queryModelDetail`, params, config),
  save: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/saveModel`, params, config),
  remove: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/deleteModel`, params, config)
};

export const standardModelsApi = apiStandardModelsService;
