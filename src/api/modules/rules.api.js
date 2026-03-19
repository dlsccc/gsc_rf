import { get, post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiRulesService = {
  list: (params, config) => get(`${baseUrl.projectDesign}/v1/projectDesign/datalake/getList`, params, config),
  save: (params, config) => post(`${baseUrl.projectDesign}/v1/projectDesign/datalake/saveRule`, params, config),
  remove: (id, config) => post(`${baseUrl.projectDesign}/v1/projectDesign/datalake/delete/${id}`, { id }, config),
  publish: (params, config) => post(`${baseUrl.projectDesign}/v1/projectDesign/datalake/ruleRelease`, params, config)
};

export const rulesApi = apiRulesService;
