import axios from 'axios';

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
});

httpClient.interceptors.request.use((config) => {
  // TODO: 接入鉴权后注入 token
  // const token = localStorage.getItem('token');
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

httpClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error?.response?.data?.message || error.message || '网络异常';
    return Promise.reject(new Error(message));
  }
);

export default httpClient;
