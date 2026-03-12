import httpClient from '../../http/client';

export const projectModelsApi = {
  list(projectId) {
    return httpClient.get(`/projects/${projectId}/models`);
  },
  create(projectId, payload) {
    return httpClient.post(`/projects/${projectId}/models`, payload);
  },
  update(projectId, id, payload) {
    return httpClient.put(`/projects/${projectId}/models/${id}`, payload);
  },
  remove(projectId, id) {
    return httpClient.delete(`/projects/${projectId}/models/${id}`);
  }
};
