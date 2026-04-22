import { post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiProjectsService = {
  list: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/project/queryProjectList`, params, config),
  createOrUpdate: (params, config) => post(`${baseUrl.dataSmart}/v1/dataSmart/project/createUpdateProject`, params, config)
};

export const projectsApi = apiProjectsService;
