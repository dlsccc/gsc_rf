import { post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiProjectsService = {
  list: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/project/queryProjectList`, params, config),
  createOrUpdate: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/project/createUpdateProject`, params, config),
  queryDeployableInfo: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/project/queryDeployableInfo`, params, config),
  deploy: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/project/deploy`, params, config),
  queryDeployStatus: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/project/queryDeployStatus`, params, config)
};

export const projectsApi = apiProjectsService;
