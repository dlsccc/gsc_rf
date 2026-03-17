import httpClient from '@/api/axio.js';

export const get = (url, params = {}, config = {}) => {
  return httpClient.get(url, {
    ...config,
    params
  });
};

export const post = (url, params = {}, config = {}) => {
  return httpClient.post(url, params, config);
};

export const del = (url, params = {}, config = {}) => {
  return httpClient.delete(url, {
    ...config,
    data: params
  });
};

export default {
  get,
  post,
  del
};
