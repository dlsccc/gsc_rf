import httpClient from '../../http/client';

export const standardModelsApi = {
  list() {
    return httpClient.get('/standard-models');
  },
  create(payload) {
    return httpClient.post('/standard-models', payload);
  },
  update(id, payload) {
    return httpClient.put(`/standard-models/${id}`, payload);
  },
  publish(id) {
    return httpClient.post(`/standard-models/${id}/publish`);
  },
  remove(id) {
    return httpClient.delete(`/standard-models/${id}`);
  }
};
