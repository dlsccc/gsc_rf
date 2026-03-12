import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { createId } from '../core/utils/id';
import { nowText } from '../core/utils/date';
import { standardModelsApi, projectModelsApi } from '../services/api';
import { useAppStore } from './app.store';

const deepClone = (value) => JSON.parse(JSON.stringify(value));

const baseDimensionFields = [
  { name: 'TIME_YEAR', type: 'STRING', format: 'YYYY', isDimension: true, description: '年份', example: '2026' },
  { name: 'TIME_MONTH', type: 'STRING', format: 'YYYY-MM', isDimension: true, description: '月份', example: '2026-02' },
  { name: 'TIME_DATE', type: 'STRING', format: 'YYYY-MM-DD', isDimension: true, description: '日期', example: '2026-02-14' },
  { name: 'TIME_TIME', type: 'STRING', format: 'hh:mm:ss', isDimension: true, description: '时间', example: '11:26:43' },
  { name: 'TIME_DAY', type: 'STRING', format: '整数', isDimension: true, description: '星期几', example: '6' },
  { name: 'DATE_TIME', type: 'STRING', format: 'YYYY-MM-DD hh:mm:ss', isDimension: true, description: '年月日时分秒', example: '2026-02-14 11:26:43' },
  { name: 'TIME_WEEK', type: 'STRING', format: '整数', isDimension: true, description: '第几周', example: '6' },
  { name: 'CLUSTER', type: 'STRING', format: '', isDimension: true, description: '', example: '' },
  { name: 'SITE_NAME', type: 'STRING', format: '', isDimension: true, description: '站点名称', example: 'ZOONWML_NKL12_(XA)' },
  { name: 'SITE_ID', type: 'STRING', format: '', isDimension: true, description: '站点ID', example: '811093' },
  { name: 'CELL_ID', type: 'STRING', format: '', isDimension: true, description: '小区ID', example: '49' },
  { name: 'CELL_NAME', type: 'STRING', format: '', isDimension: true, description: '小区名称', example: 'ZOONWME_49' },
  { name: 'BAND', type: 'STRING', format: '', isDimension: true, description: '频段', example: '1' },
  { name: 'SECTOR', type: 'STRING', format: '', isDimension: true, description: '', example: '' },
  { name: 'OPERATOR', type: 'STRING', format: '', isDimension: true, description: '', example: '' },
  { name: 'COMMON1', type: 'STRING', format: '', isDimension: true, description: 'CELL FDD TDD Indication', example: 'CELL_FDD' },
  { name: 'COMMON2', type: 'STRING', format: '', isDimension: true, description: 'Downlink EARFCN', example: '75' },
  { name: 'COMMON3', type: 'STRING', format: '', isDimension: true, description: 'eNodeB Function Name', example: 'ZOONWML' },
  { name: 'COMMON4', type: 'STRING', format: '百分数', isDimension: true, description: 'Integrity', example: '100%' },
  { name: 'COMMON5', type: 'STRING', format: '', isDimension: true, description: 'VENDOR', example: 'HW' },
  { name: 'COMMON6', type: 'STRING', format: '', isDimension: true, description: 'Cell ID', example: '49' },
  { name: 'COMMON7', type: 'STRING', format: '', isDimension: true, description: '', example: '' },
  { name: 'COMMON8', type: 'STRING', format: '', isDimension: true, description: '', example: '' },
  { name: 'COMMON9', type: 'STRING', format: '', isDimension: true, description: '', example: '' },
  { name: 'COMMON10', type: 'STRING', format: '', isDimension: true, description: '', example: '' },
  { name: 'PARTITION_FIELD', type: 'DATETIME', format: 'YYYY-MM-DD HH:mm:ss', isDimension: true, description: '', example: '2026-02-15 11:26:43' }
];

const standardMetricFields = [
  { name: 'FIELD0001', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '5515.0' },
  { name: 'FIELD0002', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '5515.0' },
  { name: 'FIELD0003', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '8.0' },
  { name: 'FIELD0004', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '8.0' },
  { name: 'FIELD0005', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '3768.0' },
  { name: 'FIELD0006', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '3768.0' },
  { name: 'FIELD0007', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '0.0' },
  { name: 'FIELD0008', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '6.0' },
  { name: 'FIELD0009', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '0.0' },
  { name: 'FIELD00010', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'Counter', example: '3433.0' }
];

const projectMetricFields = [
  { name: 'FIELD0001', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.RRC.ConnReq.Att', example: '5515.0' },
  { name: 'FIELD0002', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.RRC.ConnReq.Succ', example: '5515.0' },
  { name: 'FIELD0003', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.E-RAB.AttEst.QCI.1', example: '8.0' },
  { name: 'FIELD0004', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.E-RAB.SuccEst.QCI.1', example: '8.0' },
  { name: 'FIELD0005', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.E-RAB.AttEst.QCI.5', example: '3768.0' },
  { name: 'FIELD0006', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.E-RAB.SuccEst.QCI.5', example: '3768.0' },
  { name: 'FIELD0007', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.E-RAB.AbnormRel.QCI.1', example: '0.0' },
  { name: 'FIELD0008', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.E-RAB.NormRel.QCI.1', example: '6.0' },
  { name: 'FIELD0009', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.E-RAB.AbnormRel.QCI.5', example: '0.0' },
  { name: 'FIELD00010', type: 'FLOAT64', format: '浮点数', isDimension: false, description: 'L.E-RAB.NormRel.QCI.5', example: '3433.0' }
];

const defaultStandardModels = [
  {
    id: 1,
    name: '性能数据',
    description: '承载各个站点各个时间点的无线性能指标数据',
    status: 'active',
    updateTime: '2026-03-04 14:30',
    fields: deepClone([...baseDimensionFields, ...standardMetricFields])
  }
];

const defaultProjectModels = [
  {
    id: 1,
    name: 'UM_4G_HW_小时级Counter',
    modelCode: 'UM_4G_HW_小时级Counter',
    description: '4G华为小时级Counter数据，时间粒度为小区小时',
    status: 'active',
    refStandardModel: '性能数据',
    tags: {
      vendor: '华为',
      standard: '4G',
      timeGranularity: '小时级',
      type: 'Counter'
    },
    updateTime: '2024-03-04 16:30',
    projectId: 1,
    fields: deepClone([...baseDimensionFields, ...projectMetricFields])
  }
];

const normalizeField = (field = {}) => ({
  name: String(field.name || ''),
  type: String(field.type || ''),
  format: String(field.format || ''),
  isDimension: field.isDimension !== undefined ? !!field.isDimension : !!field.required,
  description: String(field.description || ''),
  example: String(field.example || field.sampleValue || '')
});

const normalizeFields = (fields) => {
  const normalized = (Array.isArray(fields) ? fields : []).map((field) => normalizeField(field));
  if (normalized.length > 0) return normalized;
  return [normalizeField()];
};

const normalizeStandardModel = (model = {}) => ({
  ...model,
  fields: normalizeFields(model.fields)
});

const normalizeProjectModel = (model = {}) => ({
  ...model,
  modelCode: String(model.modelCode || model.code || model.name || ''),
  tags: {
    vendor: model.tags?.vendor || '',
    standard: model.tags?.standard || '',
    timeGranularity: model.tags?.timeGranularity || '',
    type: model.tags?.type || ''
  },
  fields: normalizeFields(model.fields)
});

const enableModelApi = String(import.meta.env.VITE_ENABLE_MODEL_API || 'false').toLowerCase() === 'true';

export const useModelStore = defineStore('model', () => {
  const appStore = useAppStore();

  const standardModels = ref(defaultStandardModels.map((item) => normalizeStandardModel(deepClone(item))));
  const projectModels = ref(defaultProjectModels.map((item) => normalizeProjectModel(deepClone(item))));
  const selectedProjectModelId = ref(defaultProjectModels[0].id);

  const selectedProjectModel = computed(() => {
    return projectModels.value.find((item) => String(item.id) === String(selectedProjectModelId.value)) || null;
  });

  const targetFields = computed(() => selectedProjectModel.value?.fields || []);

  const loadStandardModels = async () => {
    if (!enableModelApi) return;

    try {
      const data = await standardModelsApi.list();
      if (Array.isArray(data) && data.length > 0) {
        standardModels.value = data.map((item) => normalizeStandardModel(item));
      }
    } catch {
      // 使用本地默认数据。
    }
  };

  const loadProjectModels = async () => {
    if (enableModelApi) {
      try {
        const data = await projectModelsApi.list(appStore.currentProject);
        if (Array.isArray(data) && data.length > 0) {
          projectModels.value = data.map((item) => normalizeProjectModel(item));
        }
      } catch {
        // 使用本地默认数据。
      }
    }

    const available = projectModels.value.filter((item) => Number(item.projectId) === Number(appStore.currentProject));
    if (!available.some((item) => String(item.id) === String(selectedProjectModelId.value))) {
      selectedProjectModelId.value = available[0]?.id || '';
    }
  };

  const upsertStandardModel = async (payload) => {
    const entity = normalizeStandardModel({
      ...payload,
      id: payload.id || createId(),
      updateTime: nowText()
    });

    const index = standardModels.value.findIndex((item) => String(item.id) === String(entity.id));
    if (index >= 0) {
      standardModels.value[index] = entity;
    } else {
      standardModels.value.unshift(entity);
    }

    try {
      if (payload.id) {
        await standardModelsApi.update(payload.id, entity);
      } else {
        await standardModelsApi.create(entity);
      }
    } catch {
      // 后端未接入。
    }

    return entity;
  };

  const publishStandardModel = async (id) => {
    const model = standardModels.value.find((item) => String(item.id) === String(id));
    if (!model) return;
    model.status = 'active';
    model.updateTime = nowText();
    try {
      await standardModelsApi.publish(id);
    } catch {
      // 后端未接入。
    }
  };

  const deleteStandardModel = async (id) => {
    standardModels.value = standardModels.value.filter((item) => String(item.id) !== String(id));
    try {
      await standardModelsApi.remove(id);
    } catch {
      // 后端未接入。
    }
  };

  const upsertProjectModel = async (payload) => {
    const entity = normalizeProjectModel({
      ...payload,
      id: payload.id || createId(),
      projectId: payload.projectId || appStore.currentProject,
      updateTime: nowText()
    });

    const index = projectModels.value.findIndex((item) => String(item.id) === String(entity.id));
    if (index >= 0) {
      projectModels.value[index] = entity;
    } else {
      projectModels.value.unshift(entity);
    }

    if (!selectedProjectModelId.value) {
      selectedProjectModelId.value = entity.id;
    }

    try {
      if (payload.id) {
        await projectModelsApi.update(appStore.currentProject, payload.id, entity);
      } else {
        await projectModelsApi.create(appStore.currentProject, entity);
      }
    } catch {
      // 后端未接入。
    }

    return entity;
  };

  const deleteProjectModel = async (id) => {
    projectModels.value = projectModels.value.filter((item) => String(item.id) !== String(id));

    const available = projectModels.value.filter((item) => Number(item.projectId) === Number(appStore.currentProject));
    if (!available.some((item) => String(item.id) === String(selectedProjectModelId.value))) {
      selectedProjectModelId.value = available[0]?.id || '';
    }

    try {
      await projectModelsApi.remove(appStore.currentProject, id);
    } catch {
      // 后端未接入。
    }
  };

  const getStandardModelById = (id) => standardModels.value.find((item) => String(item.id) === String(id));
  const getProjectModelById = (id) => projectModels.value.find((item) => String(item.id) === String(id));

  return {
    standardModels,
    projectModels,
    selectedProjectModelId,
    selectedProjectModel,
    targetFields,
    loadStandardModels,
    loadProjectModels,
    upsertStandardModel,
    publishStandardModel,
    deleteStandardModel,
    upsertProjectModel,
    deleteProjectModel,
    getStandardModelById,
    getProjectModelById
  };
});

