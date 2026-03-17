import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { createId } from '../utils/id';
import { nowText } from '../utils/date';
import { standardModelsApi, projectModelsApi } from '../api';
import { useAppStore } from './app.store';

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const toText = (value) => String(value ?? '').trim();

const baseDimensionFields = [
  { name: 'TIME_DATE', type: 'STRING', format: 'YYYY-MM-DD', isDimension: true, description: 'Date', example: '2026-03-16' },
  { name: 'DATE_TIME', type: 'STRING', format: 'YYYY-MM-DD HH:mm:ss', isDimension: true, description: 'DateTime', example: '2026-03-16 10:00:00' },
  { name: 'SITE_ID', type: 'STRING', format: '', isDimension: true, description: 'Site ID', example: '811093' },
  { name: 'CELL_ID', type: 'STRING', format: '', isDimension: true, description: 'Cell ID', example: '49' },
  { name: 'PARTITION_FIELD', type: 'DATETIME', format: 'YYYY-MM-DD HH:mm:ss', isDimension: true, description: 'Partition Field', example: '2026-03-16 10:00:00' }
];

const standardMetricFields = [
  { name: 'FIELD0001', type: 'FLOAT64', format: 'FLOAT', isDimension: false, description: 'Counter', example: '5515.0' },
  { name: 'FIELD0002', type: 'FLOAT64', format: 'FLOAT', isDimension: false, description: 'Counter', example: '5515.0' },
  { name: 'FIELD0003', type: 'FLOAT64', format: 'FLOAT', isDimension: false, description: 'Counter', example: '8.0' }
];

const projectMetricFields = [
  { name: 'FIELD0001', type: 'FLOAT64', format: 'FLOAT', isDimension: false, description: 'L.RRC.ConnReq.Att', example: '5515.0' },
  { name: 'FIELD0002', type: 'FLOAT64', format: 'FLOAT', isDimension: false, description: 'L.RRC.ConnReq.Succ', example: '5515.0' },
  { name: 'FIELD0003', type: 'FLOAT64', format: 'FLOAT', isDimension: false, description: 'L.E-RAB.AttEst.QCI.1', example: '8.0' }
];

const defaultStandardModels = [
  {
    id: 1,
    code: 'STD_4G_COUNTER',
    modelCode: 'STD_4G_COUNTER',
    name: '标准性能模型',
    description: '标准性能模型示例',
    status: 'active',
    updateTime: '2026-03-04 14:30',
    fields: deepClone([...baseDimensionFields, ...standardMetricFields])
  }
];

const defaultProjectModels = [
  {
    id: 1,
    code: 'UM_4G_HW_COUNTER',
    modelCode: 'UM_4G_HW_COUNTER',
    name: 'UM_4G_HW_COUNTER',
    description: '4G 华为小时级 Counter 数据模型',
    status: 'active',
    refStandardModel: 'STD_4G_COUNTER',
    tags: {
      vendor: '华为',
      standard: '4G',
      timeGranularity: '小时级',
      type: 'Counter'
    },
    updateTime: '2026-03-04 16:30',
    projectId: 1,
    projectCode: '1',
    fields: deepClone([...baseDimensionFields, ...projectMetricFields])
  }
];

const normalizeField = (field = {}) => ({
  name: toText(field.name || field.fieldName),
  type: toText(field.type || field.fieldType),
  format: toText(field.format || field.dataFormat),
  isDimension: field.isDimension !== undefined ? !!field.isDimension : !!field.required,
  isNull: field.isNull !== undefined ? !!field.isNull : true,
  description: toText(field.description || field.fieldDesc),
  example: toText(field.example || field.sampleValue || field.dataExample)
});

const normalizeFields = (fields) => {
  const normalized = (Array.isArray(fields) ? fields : []).map((field) => normalizeField(field));
  if (normalized.length > 0) return normalized;
  return [normalizeField()];
};

const normalizeTags = (model = {}) => ({
  vendor: model.tags?.vendor || model.factory || '',
  standard: model.tags?.standard || model.format || '',
  timeGranularity: model.tags?.timeGranularity || model.timeGranularity || '',
  type: model.tags?.type || model.businessModelType || ''
});

const resolveModelCode = (model = {}) => toText(model.code || model.modelCode || model.id);

const normalizeStandardModel = (model = {}) => {
  const code = toText(model.code || model.modelCode);
  const name = toText(model.name || model.modelName || code);

  return {
    ...model,
    id: toText(model.id || code || name || createId()),
    code,
    modelCode: toText(model.modelCode || code || name),
    name,
    description: toText(model.description || model.modelDesc),
    status: toText(model.status || 'active'),
    refStandardModel: toText(model.refStandardModel || model.referenceModelCode),
    updateTime: toText(model.updateTime || model.lastUpdatedDate || model.modifyTime || model.creationDate || nowText()),
    tags: normalizeTags(model),
    fields: normalizeFields(model.fields || model.fieldList)
  };
};

const normalizeProjectModel = (model = {}, projectIdFallback = null, projectCodeFallback = '') => {
  const base = normalizeStandardModel(model);
  const numericProjectId = Number(model.projectId);
  const projectId = Number.isFinite(numericProjectId) ? numericProjectId : (projectIdFallback ?? model.projectId);
  const projectCode = toText(model.projectCode || projectCodeFallback || model.projectId || projectId);

  return {
    ...base,
    projectId,
    projectCode,
    refStandardModel: toText(base.refStandardModel || model.referenceModelCode),
    tags: normalizeTags(model)
  };
};

const toFieldListPayload = (fields = [], modelCode = '') => {
  return (Array.isArray(fields) ? fields : []).map((field, index) => ({
    modelCode,
    fieldName: toText(field.name),
    fieldType: toText(field.type),
    fieldDesc: toText(field.description),
    dataFormat: toText(field.format),
    dataExample: toText(field.example),
    isNull: field.isNull !== undefined ? !!field.isNull : true,
    seq: index + 1
  }));
};

const toModelSavePayload = ({ entity, modelType, projectCode = '' }) => {
  const modelCode = toText(entity.code || entity.modelCode);

  return {
    ...(modelCode ? { code: modelCode } : {}),
    modelName: toText(entity.name),
    modelDesc: toText(entity.description),
    modelType,
    fieldList: toFieldListPayload(entity.fields, modelCode),
    referenceModelCode: toText(entity.refStandardModel),
    factory: toText(entity.tags?.vendor),
    format: toText(entity.tags?.standard),
    timeGranularity: toText(entity.tags?.timeGranularity),
    businessModelType: toText(entity.tags?.type),
    ...(projectCode ? { projectCode } : {})
  };
};

const enableModelApi = String(import.meta.env.VITE_ENABLE_MODEL_API || 'false').toLowerCase() === 'true';

const unwrapApiData = (response) => {
  if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data;
  }
  return response;
};

const unwrapApiList = (response) => {
  const data = unwrapApiData(response);
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data)) return data;
  return [];
};

export const useModelStore = defineStore('model', () => {
  const appStore = useAppStore();

  const standardModels = ref(defaultStandardModels.map((item) => normalizeStandardModel(deepClone(item))));
  const projectModels = ref(defaultProjectModels.map((item) => normalizeProjectModel(deepClone(item), item.projectId || 1, toText(item.projectId || 1))));
  const selectedProjectModelId = ref(projectModels.value[0]?.id || '');

  const selectedProjectModel = computed(() => {
    return projectModels.value.find((item) => String(item.id) === String(selectedProjectModelId.value)) || null;
  });

  const targetFields = computed(() => selectedProjectModel.value?.fields || []);

  const resolveCurrentProjectCode = () => {
    return toText(appStore.currentProjectCode || appStore.currentProject || import.meta.env.VITE_PROJECT_CODE || '');
  };

  const upsertLocalStandard = (model) => {
    const index = standardModels.value.findIndex((item) => String(item.id) === String(model.id));
    if (index >= 0) {
      standardModels.value[index] = model;
    } else {
      standardModels.value.unshift(model);
    }
  };

  const upsertLocalProject = (model) => {
    const index = projectModels.value.findIndex((item) => String(item.id) === String(model.id));
    if (index >= 0) {
      projectModels.value[index] = model;
    } else {
      projectModels.value.unshift(model);
    }
  };

  const getStandardModelById = (id) => {
    const key = String(id);
    return standardModels.value.find((item) => String(item.id) === key || toText(item.code) === key || toText(item.modelCode) === key) || null;
  };

  const getProjectModelById = (id) => {
    const key = String(id);
    return projectModels.value.find((item) => String(item.id) === key || toText(item.code) === key || toText(item.modelCode) === key) || null;
  };

  const loadStandardModels = async () => {
    if (!enableModelApi) return;

    try {
      const response = await standardModelsApi.list({ modelType: 'base' });
      const list = unwrapApiList(response);
      if (list.length > 0) {
        standardModels.value = list.map((item) => normalizeStandardModel(item));
      }
    } catch {
      // fallback to local mock
    }
  };

  const loadProjectModels = async () => {
    if (enableModelApi) {
      try {
        const projectCode = resolveCurrentProjectCode();
        const response = await projectModelsApi.list({ modelType: 'business', ...(projectCode ? { projectCode } : {}) });
        const list = unwrapApiList(response);
        if (list.length > 0) {
          projectModels.value = list.map((item) => normalizeProjectModel(item, appStore.currentProject, projectCode));
        }
      } catch {
        // fallback to local mock
      }
    }

    const available = projectModels.value.filter((item) => Number(item.projectId) === Number(appStore.currentProject));
    if (!available.some((item) => String(item.id) === String(selectedProjectModelId.value))) {
      selectedProjectModelId.value = available[0]?.id || '';
    }
  };

  const loadStandardModelDetail = async (modelCodeOrId) => {
    const target = getStandardModelById(modelCodeOrId);
    if (!target) return null;

    if (!enableModelApi) {
      return target;
    }

    const code = resolveModelCode(target) || toText(modelCodeOrId);
    if (!code) return target;

    try {
      const response = await standardModelsApi.detail({ code });
      const detail = unwrapApiData(response);
      if (!detail) return target;

      const merged = normalizeStandardModel({
        ...target,
        ...detail,
        id: target.id || code
      });
      upsertLocalStandard(merged);
      return merged;
    } catch {
      return target;
    }
  };

  const loadProjectModelDetail = async (modelCodeOrId) => {
    const target = getProjectModelById(modelCodeOrId);
    if (!target) return null;

    if (!enableModelApi) {
      return target;
    }

    const code = resolveModelCode(target) || toText(modelCodeOrId);
    if (!code) return target;

    try {
      const response = await projectModelsApi.detail({ code });
      const detail = unwrapApiData(response);
      if (!detail) return target;

      const merged = normalizeProjectModel({
        ...target,
        ...detail,
        id: target.id || code
      }, target.projectId || appStore.currentProject, target.projectCode || resolveCurrentProjectCode());
      upsertLocalProject(merged);
      return merged;
    } catch {
      return target;
    }
  };

  const upsertStandardModel = async (payload) => {
    const entity = normalizeStandardModel({
      ...payload,
      id: payload.id || payload.code || payload.modelCode || createId(),
      updateTime: nowText()
    });

    upsertLocalStandard(entity);

    if (enableModelApi) {
      try {
        await standardModelsApi.save(toModelSavePayload({ entity, modelType: 'base' }));
      } catch {
        // backend unavailable
      }
    }

    return entity;
  };

  const publishStandardModel = async (id) => {
    const model = getStandardModelById(id);
    if (!model) return;

    model.status = 'active';
    model.updateTime = nowText();

    try {
      await standardModelsApi.save(toModelSavePayload({ entity: { ...model, status: 'active' }, modelType: 'base' }));
    } catch {
      // backend unavailable
    }
  };

  const deleteStandardModel = async (id) => {
    const target = getStandardModelById(id);
    standardModels.value = standardModels.value.filter((item) => String(item.id) !== String(id));

    if (enableModelApi) {
      try {
        await standardModelsApi.remove({ modelCodeList: [resolveModelCode(target || { id })].filter(Boolean) });
      } catch {
        // backend unavailable
      }
    }
  };

  const upsertProjectModel = async (payload) => {
    const entity = normalizeProjectModel({
      ...payload,
      id: payload.id || payload.code || payload.modelCode || createId(),
      projectId: payload.projectId || appStore.currentProject,
      projectCode: payload.projectCode || resolveCurrentProjectCode(),
      updateTime: nowText()
    }, payload.projectId || appStore.currentProject, payload.projectCode || resolveCurrentProjectCode());

    upsertLocalProject(entity);

    if (!selectedProjectModelId.value) {
      selectedProjectModelId.value = entity.id;
    }

    if (enableModelApi) {
      try {
        await projectModelsApi.save(toModelSavePayload({
          entity,
          modelType: 'business',
          projectCode: entity.projectCode || resolveCurrentProjectCode()
        }));
      } catch {
        // backend unavailable
      }
    }

    return entity;
  };

  const deleteProjectModel = async (id) => {
    const target = getProjectModelById(id);
    projectModels.value = projectModels.value.filter((item) => String(item.id) !== String(id));

    const available = projectModels.value.filter((item) => Number(item.projectId) === Number(appStore.currentProject));
    if (!available.some((item) => String(item.id) === String(selectedProjectModelId.value))) {
      selectedProjectModelId.value = available[0]?.id || '';
    }

    if (enableModelApi) {
      try {
        await projectModelsApi.remove({ modelCodeList: [resolveModelCode(target || { id })].filter(Boolean) });
      } catch {
        // backend unavailable
      }
    }
  };

  return {
    standardModels,
    projectModels,
    selectedProjectModelId,
    selectedProjectModel,
    targetFields,
    loadStandardModels,
    loadProjectModels,
    loadStandardModelDetail,
    loadProjectModelDetail,
    upsertStandardModel,
    publishStandardModel,
    deleteStandardModel,
    upsertProjectModel,
    deleteProjectModel,
    getStandardModelById,
    getProjectModelById
  };
});



