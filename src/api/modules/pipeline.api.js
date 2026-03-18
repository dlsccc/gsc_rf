import { post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const apiPipelineService = {
  upload: (params, config) => post(`${baseUrl.pipeline}/pipeline/upload`, params, config),
  preview: (params, config) => post(`${baseUrl.pipeline}/pipeline/preview`, params, config),
  publishDsl: (params, config) => post(`${baseUrl.pipeline}/pipeline/publish`, params, config),
  execute: (params, config) => post(`${baseUrl.pipeline}/pipeline/execute`, params, config)
};

export const pipelineApi = apiPipelineService;
