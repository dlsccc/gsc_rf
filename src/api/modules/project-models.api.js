import { post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiProjectModelsService = {
  list: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/queryModel`, params, config),
  detail: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/queryModelDetail`, params, config),
  save: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/saveModel`, params, config),
  importModel: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/importModel`, params, config),
  exportModel: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/exportModel`, params, config),
  publish: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/releaseModel`, params, config),
  remove: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/model/deleteModel`, params, config)
};

export const projectModelsApi = apiProjectModelsService;
