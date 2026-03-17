import httpClient from '../axio';

export const rulesApi = {
  list(params) {
    return httpClient.get('/v1/projectDesign/datalake/getList', { params });
  },

  save(payload) {
    return httpClient.post('/v1/projectDesign/datalake/saveRule', payload);
  },

  remove(id) {
    return httpClient.delete(`/v1/projectDesign/datalake/delete/${id}`);
  },

  publish(payload) {
    return httpClient.post('/v1/projectDesign/datalake/ruleRelease', payload);
  }
};
