// 从二方件导入所需要的axios
import { get, post, axios, initInterceptors } from '@hw-itsc/common/src/api/base/axios.js';
import userStore from '@/store/userInfo.js';

function requestFilter(config) {
  config.headers['project-id'] = config.headers['project-id'] || '6922429276755084353';
  if (config.url?.includes('/uap/')) {
    // 专区接口传 -1
    config.headers['project-id'] = config.headers['project-id'] || -1;
  }
  config.headers['user-info'] =  userStore.userInfo?.account || '';
  return config;
}

initInterceptors(requestFilter);

export default axios;
export { get, post };