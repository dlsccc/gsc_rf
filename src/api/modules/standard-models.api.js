import httpClient from '../axio';

export const standardModelsApi = {
  list(payload) {
    return httpClient.post('/v1/dataSmart/model/queryModel', payload);
  },

  detail(payload) {
    return httpClient.post('/v1/dataSmart/model/queryModelDetail', payload);
  },

  save(payload) {
    return httpClient.post('/v1/dataSmart/model/saveModel', payload);
  },

  remove(payload) {
    return httpClient.post('/v1/dataSmart/model/deleteModel', payload);
  }
};
