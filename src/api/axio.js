import { ElMessage } from 'element-plus'
import { $t } from '@/i18n/index.js';

// 从二方件导入所需要的axios
import { get, post, axios, initInterceptors } from '@hw-itsc/common/src/api/base/axios.js';
import userStore from '@/store/userInfo.js';

function requestFilter(config) {

if (config.url?.includes('/uap/')) {
    // 专区接口传 -1
    config.headers['project-id'] = config.headers['project-id'] || -1;
  }else{
    config.headers['project-id'] =config.headers['project-id'] || userStore.state.curTenant.frmProjectId ||  userStore.state.zoneId || '';
  }
  config.headers['user-info'] =  userStore.state.userInfo?.account || '';
  return config;
}

async function getBlobResponseResult(response) {
  const reader = new FileReader();
  reader.readAsText(response.data);
  // 监听返回的数据，code是否为110
  const addEventListenerResult = await new Promise((resolve) => {
    reader.addEventListener('loadend', (e) => {
      let b = null;
      try {
        b = JSON.parse(e.target.result);
      } catch (error) {
        b = response.data;
      }
      resolve(b);
    });
  });
  return addEventListenerResult;
}

/**
 * 通用的接口出参的统一处理或结构组装
 * @param response
 * @returns {{data: *, response}|Promise<never>}
 */
async function responseFilter(response) {
  if (response.data instanceof Blob) {
    // 处理二进制数据
    const addEventListenerResult = await getBlobResponseResult(response);
    const isBlob = addEventListenerResult instanceof Blob;
    if (!isBlob) {
      return addEventListenerResult;
    }
    const isPreview = addEventListenerResult.code === '110' && response.config.headers['download-type'] === 'preview';
    // 如果是预览类型，通过reject返回,在消费的地方，通过异常捕获拿到返回的result(包含了下载token)
    if (isPreview) {
      const reject = { result: addEventListenerResult, from: 'preview' };
      return Promise.reject(reject);
    } else {
      // 下载场景，这是之前的逻辑（之前没有前面2种逻辑）
      const res = await getreadAsText(response, addEventListenerResult);
      if (res?.status === 100) {
        return { data: res, response: response };
      }
    }
  }
  const { code = '' } = response.data || {};
  const isSuccessCode = ['1', '00000'].includes(code) || !code;
  if (isSuccessCode) {
    // 网络请求正常返回数据结构
    let resData = null;
    if (response.data && Object.prototype.hasOwnProperty.call(response.data, 'data')) {
      resData = response.data.data;
    } else if (response.data && Object.prototype.hasOwnProperty.call(response.data, 'result')) {
      resData = response.data.result;
    } else {
      resData = response.data;
    }
    return {
      data: resData,
      response: response,
    };
  } else {
    // 接口异常
    if (response.data.msg) {
      // 如果请求的config中设置了hideMsgTips: true, 那个axios的拦截器中不会提示错误信息，具体的错误信息在业务页面调用接口的地方catch到信息做相关提示
      ElMessage({
        type:'error',
        message: $t(response.data.msg),
      })
    }
    return Promise.reject(response);
  }
}


initInterceptors(requestFilter,responseFilter);

export default axios;
export { get, post };