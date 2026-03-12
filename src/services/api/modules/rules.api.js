import httpClient from '../../http/client';

export const rulesApi = {
  list(projectId) {
    return httpClient.get(`/projects/${projectId}/lake-rules`);
  },
  create(projectId, payload) {
    return httpClient.post(`/projects/${projectId}/lake-rules`, payload);
  },
  update(projectId, id, payload) {
    return httpClient.put(`/projects/${projectId}/lake-rules/${id}`, payload);
  },
  remove(projectId, id) {
    return httpClient.delete(`/projects/${projectId}/lake-rules/${id}`);
  }
};
