import httpClient from '../../http/client';

const unwrapData = (response) => {
  if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data;
  }
  return response;
};

const toText = (value) => String(value ?? '').trim();

const normalizeProjectCode = (projectCodeOrId) => {
  return toText(projectCodeOrId || import.meta.env.VITE_PROJECT_CODE || '');
};

const toModelCode = (model = {}, fallback = '') => {
  return toText(model.modelCode || model.code || model.id || fallback);
};

export const projectModelsApi = {
  list(projectCodeOrId, options = {}) {
    const projectCode = normalizeProjectCode(projectCodeOrId);

    return httpClient.post('/v1/dataSmart/model/queryModel', {
      modelType: 'business',
      ...(projectCode ? { projectCode } : {}),
      ...options
    }).then((response) => {
      const page = unwrapData(response) || {};
      return Array.isArray(page.list) ? page.list : [];
    });
  },

  detail(code, paging = {}) {
    return httpClient.post('/v1/dataSmart/model/queryModelDetail', {
      code: toText(code),
      ...paging
    }).then((response) => unwrapData(response) || null);
  },

  save(payload) {
    return httpClient.post('/v1/dataSmart/model/saveModel', payload);
  },

  create(projectCodeOrId, payload) {
    const projectCode = normalizeProjectCode(projectCodeOrId);
    return this.save({
      ...payload,
      modelType: 'business',
      ...(projectCode ? { projectCode } : {})
    });
  },

  update(projectCodeOrId, id, payload) {
    const projectCode = normalizeProjectCode(projectCodeOrId);
    const code = toModelCode(payload, id);

    return this.save({
      ...payload,
      modelType: 'business',
      ...(projectCode ? { projectCode } : {}),
      ...(code ? { code } : {})
    });
  },

  remove(projectCodeOrId, idOrCode) {
    const modelCodeList = Array.isArray(idOrCode)
      ? idOrCode.map((item) => toText(item)).filter(Boolean)
      : [toText(idOrCode)].filter(Boolean);

    return httpClient.post('/v1/dataSmart/model/deleteModel', { modelCodeList });
  }
};
