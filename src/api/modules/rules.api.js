import { get, post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiRulesService = {
  list: (params, config) => get(`${baseUrl.projectDesign}/v1/projectDesign/datalake/getList`, params, config),
  listPublishedByProject: (params, config) => get(`${baseUrl.projectDesign}/v1/projectDesign/datalake/getPublishedRules`, params, config),
  save: (params, config) => post(`${baseUrl.projectDesign}/v1/projectDesign/datalake/saveRule`, params, config),
  remove: (params, config) => post(`${baseUrl.projectDesign}/v1/projectDesign/datalake/delete`, params, config),
  publish: (params, config) => post(`${baseUrl.projectDesign}/v1/projectDesign/datalake/ruleRelease`, params, config),
  execute: (params, config) => post(`${baseUrl.projectDesign}/v1/projectDesign/datalake/ruleExecute`, params, config),
  debugSql: (params, config) => post(`${baseUrl.lingluoService}/v1/dataSmart/debug`, params, config)
};

export const rulesApi = apiRulesService;
