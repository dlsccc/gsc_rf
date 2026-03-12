import httpClient from '../../http/client';

export const pipelineApi = {
  upload(file) {
    const formData = new FormData();
    formData.append('file', file);
    return httpClient.post('/pipeline/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  preview(payload) {
    return httpClient.post('/pipeline/preview', payload);
  },
  execute(payload) {
    return httpClient.post('/pipeline/execute', payload);
  }
};
