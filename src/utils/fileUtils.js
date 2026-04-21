import { ElMessage as Message } from 'element-plus';
import { apiSystemService } from '@/api/index.js';
import { $t } from '@/i18n/index.js';

const toText = (value) => String(value ?? '').trim();

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const normalizeEdmIdList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }

  const text = toText(value);
  if (!text) return [];

  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toText(item)).filter(Boolean);
      }
    } catch {
      // ignore parse failure and fallback to plain string.
    }
  }

  return [text];
};

export const resolveEdmId = (item = {}) => {
  if (['string', 'number'].includes(typeof item)) {
    return toText(item);
  }
  return toText(item.edmId || item.edmID || item.fileCode || item.id || item.code);
};

export const normalizeObjectRows = (rows = []) => {
  return toArray(rows)
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((row) => {
      const normalized = {};
      Object.keys(row).forEach((key) => {
        normalized[toText(key)] = row[key];
      });
      return normalized;
    });
};

export const extractFieldsFromRows = (rows = []) => {
  return rows.reduce((acc, row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!acc.includes(key)) {
        acc.push(key);
      }
    });
    return acc;
  }, []);
};

export const fileUtilUploadFile = async (params, config = {}) => {
  try {
    const { data } = await apiSystemService.uploadFile(params, config);
    return data;
  } catch (error) {
    if (error?.name === 'CanceledError') {
      return null;
    }
    Message({
      type: 'error',
      message: $t('i18n.work.rules.uploadFail'),
      showClose: true,
      customClass: 'message-tip-class',
      offset: 68
    });
    throw error;
  }
};

export const queryFileDetail = async (fileIds, config = {}) => {
  const ids = toArray(fileIds).map((item) => toText(item)).filter(Boolean);
  if (ids.length === 0) return [];

  try {
    const { data = [] } = await apiSystemService.fileEdm3QueryDetails(ids, config);
    return toArray(data);
  } catch (firstError) {
    try {
      const { data = [] } = await apiSystemService.fileEdm3QueryDetails({ fileCodeList: ids }, config);
      return toArray(data);
    } catch {
      throw firstError;
    }
  }
};

export const parseEdmFile = async (edmId, config = {}) => {
  const ids = normalizeEdmIdList(edmId);
  if (ids.length === 0) return [];
  const { data = [] } = await apiSystemService.parseEdmFile({ edmId: JSON.stringify(ids) }, config);
  return toArray(data);
};

export const normalizeUploadResult = (uploadData) => {
  return toArray(uploadData)
    .map((item) => {
      const edmId = resolveEdmId(item);
      if (!edmId) return null;
      if (['string', 'number'].includes(typeof item)) {
        return {
          edmId,
          fileCode: edmId
        };
      }
      return {
        ...item,
        edmId
      };
    })
    .filter(Boolean);
};

export const findParsedDataSet = (parsedList, edmId) => {
  const list = toArray(parsedList);
  if (list.length === 0) return [];

  const id = toText(edmId);
  const matched = list.find((item) => resolveEdmId(item) === id) || list[0] || {};
  return toArray(matched.dataSet);
};

export const extractFieldInfoList = (parsedList, edmId) => {
  const list = toArray(parsedList);
  if (list.length === 0) return [];

  const id = toText(edmId);
  const matched = list.find((item) => resolveEdmId(item) === id) || list[0] || {};
  return toArray(matched.fieldInfoList || matched.field_info_list);
};

/**
 * a标签下载文件
 * @param fileId 文件id
 * @param checkItem 文件校验项
 * @param downloadCode 下载凭证
 * @param single 是否为单个文件下载
 */
export function downloadFileByALink(fileId, checkItem, downloadCode, fileName) {
  if (!fileId) {
    return;
  }
  const alink = document.createElement('a');
  if ('download' in alink) {
    // 非IE浏览器才有a.download
    alink.setAttribute('download', '');
    alink.style.display = 'none';
    alink.href = apiSystemService.fileEdm3Download(fileId, checkItem, downloadCode);
    if(fileName){
      alink.download = fileName;
    }
    document.body.appendChild(alink);
    alink.click();
    // 释放URL 对象
  } else {
    // IE10+下载，全局对象navigator
  }
}

/**
 * 获取预下载文件token
 * @param fileId 文件id
 * @param config 请求的config
 * @returns {Promise<AxiosResponse<any>>} 预下载文件token和缓存时间
 */
export async function preDownloadToken(fileId, config) {
  const { data } = await apiSystemService.preDownload(fileId, { ...config });
  return data;
}


// 小文件，快捷下载
export async function downloadFile(fileId){
  const res = await preDownloadToken(fileId);
  const {
    checkItem,
    downloadCode
  } = res || {};
  downloadFileByALink(fileId, checkItem, downloadCode);
}
