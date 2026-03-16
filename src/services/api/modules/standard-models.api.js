import httpClient from '../../http/client';

const unwrapData = (response) => {
  if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data;
  }
  return response;
};

const toModelCode = (value) => String(value ?? '').trim();

const toCodeFromModel = (model = {}) => {
  return toModelCode(model.modelCode || model.code || model.id || model.name);
};

export const standardModelsApi = {
  list(options = {}) {
    return httpClient.post('/v1/dataSmart/model/queryModel', {
      modelType: 'base',
      ...options
    }).then((response) => {
      const page = unwrapData(response) || {};
      return Array.isArray(page.list) ? page.list : [];
    });
  },

  detail(code, paging = {}) {
    return httpClient.post('/v1/dataSmart/model/queryModelDetail', {
      code: toModelCode(code),
      ...paging
    }).then((response) => unwrapData(response) || null);
  },

  save(payload) {
    return httpClient.post('/v1/dataSmart/model/saveModel', payload);
  },

  create(payload) {
    return this.save(payload);
  },

  update(id, payload) {
    const code = toModelCode(id) || toCodeFromModel(payload);
    return this.save({
      ...payload,
      ...(code ? { code } : {})
    });
  },

  publish(id) {
    return httpClient.post(`/standard-models/${id}/publish`);
  },

  remove(idOrCode) {
    const codeList = Array.isArray(idOrCode)
      ? idOrCode.map((item) => toModelCode(item)).filter(Boolean)
      : [toModelCode(idOrCode)].filter(Boolean);

    return httpClient.post('/v1/dataSmart/model/deleteModel', { modelCodeList: codeList });
  }
};
