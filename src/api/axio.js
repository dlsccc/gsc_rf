import axios from 'axios';

const enableHttpDebug = true;

const normalizeValue = (value) => {
  if (value instanceof FormData) {
    return '[FormData]';
  }
  return value;
};

const pushHttpLog = (entry) => {
  if (typeof window === 'undefined') return;
  if (!Array.isArray(window.__HTTP_LOGS__)) {
    window.__HTTP_LOGS__ = [];
  }

  window.__HTTP_LOGS__.push({
    timestamp: new Date().toISOString(),
    ...entry
  });

  if (window.__HTTP_LOGS__.length > 300) {
    window.__HTTP_LOGS__.shift();
  }
};

const httpClient = axios.create({
  baseURL: '/api',
  timeout: 15000
});

httpClient.interceptors.request.use((config) => {
  const method = String(config.method || 'GET').toUpperCase();
  const requestLog = {
    stage: 'request',
    method,
    url: config.url,
    baseURL: config.baseURL,
    params: normalizeValue(config.params),
    data: normalizeValue(config.data)
  };

  if (enableHttpDebug) {
    console.log('[HTTP Request]', requestLog);
    pushHttpLog(requestLog);
  }

  // TODO: 接入鉴权后注入 token
  // const token = localStorage.getItem('token');
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => {
    if (enableHttpDebug) {
      const responseLog = {
        stage: 'response',
        method: String(response.config?.method || 'GET').toUpperCase(),
        url: response.config?.url,
        status: response.status,
        data: normalizeValue(response.data)
      };
      console.log('[HTTP Response]', responseLog);
      pushHttpLog(responseLog);
    }

    return response.data;
  },
  (error) => {
    if (enableHttpDebug) {
      const errorLog = {
        stage: 'error',
        method: String(error?.config?.method || 'GET').toUpperCase(),
        url: error?.config?.url,
        status: error?.response?.status,
        data: normalizeValue(error?.response?.data),
        message: error?.message
      };
      console.error('[HTTP Error]', errorLog);
      pushHttpLog(errorLog);
    }

    const message = error?.response?.data?.msg
      || error?.response?.data?.message
      || error.message
      || '网络异常';

    return Promise.reject(new Error(message));
  }
);

export default httpClient;

export const get = (url, config = {}) => httpClient.get(url, config);
export const post = (url, data = {}, config = {}) => httpClient.post(url, data, config);
export { httpClient };

