import httpClient from '../axio';

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
  publishDsl(payload) {
    const endpoint = import.meta.env.VITE_PIPELINE_PUBLISH_ENDPOINT || '/pipeline/publish';
    return httpClient.post(endpoint, payload);
  },
  execute(payload) {
    return httpClient.post('/pipeline/execute', payload);
  }
};

