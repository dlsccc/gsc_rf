import { post } from '@/utils/axios.js';
import baseUrl from '@/api/base-url.js';

export const initApi = {
  // 添加用户专区的user角色
  addZoneUser: (config) => post(`${baseUrl.uapZms}/zone/v1/user/addNew`, { zoneCode: 'ITSC' }, config),
  addPlatformNew:(params,config)=>post(`${baseUrl.framework}/authority/v1/workspace/project/addPlatformNew`,params,config)
};