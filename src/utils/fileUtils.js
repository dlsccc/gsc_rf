import { apiSystemService } from '@/api/index.js';

/**
 * 文件上传
 * const file = event.target.files[0];
 * const formData = new FormData();
 * formData.append('file', file);
 * const fileId = await fileUtilUploadFile(formData);
 * 
 * @param params
 * @param config
 * @returns {Promise<AxiosResponse<any>>}
 */
export const fileUtilUploadFile = async (params, config = {}) => {
  try {
    const { data } = await apiSystemService.fileEdm3Upload(params, config);
    return data;
  } catch (e) {
    window.printWarn(e);
    // 文件上传的时候，会有用户手动取消下载的场景，这种场景不需要提示下载失败；
    if (e.name === 'CanceledError') {
      return null;
    }
    Message({
      type: 'error',
      message: $t('i18n.work.rules.uploadFail'),
      showClose: true,
      customClass: 'message-tip-class',
      offset: 68,
    });
    throw e;
  }
};