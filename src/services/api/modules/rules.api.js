import httpClient from '../../http/client';

const unwrapData = (response) => {
  if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data;
  }
  return response;
};

const toText = (value) => String(value ?? '').trim();

const normalizePageNum = (value, fallback = 1) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
};

const normalizePageSize = (value, fallback = 100) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
};

export const rulesApi = {
  list(params = {}) {
    const query = {
      pageNum: normalizePageNum(params.pageNum),
      pageSize: normalizePageSize(params.pageSize)
    };

    return httpClient.get('/v1/projectDesign/datalake/getList', { params: query })
      .then((response) => unwrapData(response) || { total: 0, list: [] });
  },

  save(payload) {
    return httpClient.post('/v1/projectDesign/datalake/saveRule', payload);
  },

  create(projectId, payload) {
    return this.save(payload);
  },

  update(projectId, id, payload) {
    return this.save({
      ...payload,
      ruleId: toText(payload?.ruleId || id)
    });
  },

  remove(projectId, id) {
    const safeId = encodeURIComponent(toText(id));
    return httpClient.delete(`/v1/projectDesign/datalake/delete/${safeId}`);
  },

  publish(ruleCode) {
    return httpClient.post('/v1/projectDesign/datalake/ruleRelease', {
      ruleCode: toText(ruleCode)
    });
  }
};
