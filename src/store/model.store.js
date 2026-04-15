import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { createId } from '@/utils/id.js';
import { nowText } from '@/utils/date.js';

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const toText = (value) => String(value ?? '').trim();
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  const text = toText(value).toLowerCase();
  if (!text) return false;
  if (['true', '1', 'y', 'yes'].includes(text)) return true;
  if (['false', '0', 'n', 'no'].includes(text)) return false;
  return Boolean(value);
};

const VENDOR_UI_TO_API = {
  华为: 'HW',
  中兴: 'ZTE'
};

const RAT_UI_TO_API = {
  '2G': 'GSM',
  '3G': 'UMTS',
  '4G': 'LTE',
  '5G': 'NR'
};

const TIME_GRANULARITY_UI_TO_API = {
  小时级: 'hourly',
  天级: 'daily'
};

const MODEL_TYPE_UI_TO_API = {
  Counter: 'counter',
  KPI: 'kpi',
  工参: 'ep'
};

const toUpperMap = (map) => {
  const next = {};
  Object.entries(map).forEach(([key, value]) => {
    next[String(key).toUpperCase()] = value;
  });
  return next;
};

const toLowerMap = (map) => {
  const next = {};
  Object.entries(map).forEach(([key, value]) => {
    next[String(key).toLowerCase()] = value;
  });
  return next;
};

const invertMap = (map) => {
  const next = {};
  Object.entries(map).forEach(([key, value]) => {
    next[value] = key;
  });
  return next;
};

const VENDOR_API_TO_UI = invertMap(VENDOR_UI_TO_API);
const VENDOR_API_TO_UI_UPPER = toUpperMap(VENDOR_API_TO_UI);
const RAT_API_TO_UI = invertMap(RAT_UI_TO_API);
const RAT_API_TO_UI_UPPER = toUpperMap(RAT_API_TO_UI);
const TIME_GRANULARITY_API_TO_UI = invertMap(TIME_GRANULARITY_UI_TO_API);
const TIME_GRANULARITY_API_TO_UI_LOWER = toLowerMap(TIME_GRANULARITY_API_TO_UI);
const MODEL_TYPE_API_TO_UI = invertMap(MODEL_TYPE_UI_TO_API);
const MODEL_TYPE_API_TO_UI_LOWER = toLowerMap(MODEL_TYPE_API_TO_UI);

const toUiEnumValue = (value, map, normalize = 'none') => {
  const text = toText(value);
  if (!text) return '';
  if (Object.prototype.hasOwnProperty.call(map, text)) {
    return map[text];
  }
  if (normalize === 'upper') {
    return map[text.toUpperCase()] || text;
  }
  if (normalize === 'lower') {
    return map[text.toLowerCase()] || text;
  }
  return text;
};

const toApiEnumValue = (value, map) => {
  const text = toText(value);
  if (!text) return '';
  return map[text] || text;
};

const BUSINESS_FIELD_TYPES = {
  TIME: 'time',
  SPACE: 'space',
  METRIC: 'metric'
};

const BUSINESS_FIELD_TYPE_LABELS = {
  [BUSINESS_FIELD_TYPES.TIME]: '\u65f6\u95f4',
  [BUSINESS_FIELD_TYPES.SPACE]: '\u7a7a\u95f4',
  [BUSINESS_FIELD_TYPES.METRIC]: '\u6307\u6807'
};

const normalizeBusinessTypeCode = (value) => {
  const code = toText(value).toLowerCase();
  if (Object.values(BUSINESS_FIELD_TYPES).includes(code)) {
    return code;
  }

  const text = toText(value);
  const matched = Object.entries(BUSINESS_FIELD_TYPE_LABELS)
    .find(([, label]) => label === text);
  if (matched) {
    return matched[0];
  }

  return '';
};

export const toBusinessTypeLabel = (value) => {
  const code = normalizeBusinessTypeCode(value) || BUSINESS_FIELD_TYPES.METRIC;
  return BUSINESS_FIELD_TYPE_LABELS[code] || BUSINESS_FIELD_TYPE_LABELS[BUSINESS_FIELD_TYPES.METRIC];
};
const inferBusinessType = (field = {}) => {
  const businessType = normalizeBusinessTypeCode(field.fieldBusinessType || field.businessType || field.business_type);
  if (businessType) {
    return businessType;
  }

  const type = toText(field.type || field.fieldType).toUpperCase();
  const name = toText(field.name || field.fieldName).toUpperCase();
  if (['DATE', 'DATETIME', 'TIMESTAMP'].includes(type) || /DATE|TIME/.test(name)) {
    return BUSINESS_FIELD_TYPES.TIME;
  }
  if (/SITE|CELL|REGION|AREA|LON|LAT/.test(name)) {
    return BUSINESS_FIELD_TYPES.SPACE;
  }

  return BUSINESS_FIELD_TYPES.METRIC;
};
const baseDimensionFields = [
  { name: 'TIME_DATE', type: 'STRING', format: 'YYYY-MM-DD', businessType: BUSINESS_FIELD_TYPES.TIME, description: 'Date', example: '2026-03-16' },
  { name: 'DATE_TIME', type: 'STRING', format: 'YYYY-MM-DD HH:mm:ss', businessType: BUSINESS_FIELD_TYPES.TIME, description: 'DateTime', example: '2026-03-16 10:00:00' },
  { name: 'SITE_ID', type: 'STRING', format: '', businessType: BUSINESS_FIELD_TYPES.SPACE, description: 'Site ID', example: '811093' },
  { name: 'CELL_ID', type: 'STRING', format: '', businessType: BUSINESS_FIELD_TYPES.SPACE, description: 'Cell ID', example: '49' },
  { name: 'PARTITION_FIELD', type: 'DATETIME', format: 'YYYY-MM-DD HH:mm:ss', businessType: BUSINESS_FIELD_TYPES.TIME, description: 'Partition Field', example: '2026-03-16 10:00:00' }
];

const standardMetricFields = [
  { name: 'FIELD0001', type: 'FLOAT64', format: 'FLOAT', businessType: BUSINESS_FIELD_TYPES.METRIC, description: 'Counter', example: '5515.0' },
  { name: 'FIELD0002', type: 'FLOAT64', format: 'FLOAT', businessType: BUSINESS_FIELD_TYPES.METRIC, description: 'Counter', example: '5515.0' },
  { name: 'FIELD0003', type: 'FLOAT64', format: 'FLOAT', businessType: BUSINESS_FIELD_TYPES.METRIC, description: 'Counter', example: '8.0' }
];

const defaultStandardModels = [
  {
    id: 1,
    code: 'STD_4G_COUNTER',
    modelCode: 'STD_4G_COUNTER',
    name: '\u6807\u51c6\u6027\u80fd\u6a21\u578b',
    description: '\u6807\u51c6\u6027\u80fd\u6a21\u578b\u793a\u4f8b',
    status: 'active',
    updateTime: '2026-03-04 14:30',
    fields: deepClone([...baseDimensionFields, ...standardMetricFields])
  }
];

const defaultProjectModels = [];

const normalizeField = (field = {}) => {
  const businessType = inferBusinessType(field);
  const rawSeq = field.seq ?? field.fieldSeq ?? field.field_seq;
  const seq = Number.isFinite(Number(rawSeq)) ? Number(rawSeq) : null;
  return {
    name: toText(field.name || field.fieldName),
    type: toText(field.type || field.fieldType),
    format: toText(field.format || field.dataFormat),
    businessType,
    isNull: field.isNull !== undefined ? !!field.isNull : true,
    description: toText(field.description || field.fieldDesc),
    example: toText(field.example || field.sampleValue || field.dataExample),
    seq
  };
};

const normalizeFields = (fields) => {
  const normalized = (Array.isArray(fields) ? fields : []).map((field) => normalizeField(field));
  if (normalized.length > 0) {
    const withSeq = normalized.filter((item) => Number.isFinite(item.seq));
    const withoutSeq = normalized.filter((item) => !Number.isFinite(item.seq));
    withSeq.sort((a, b) => a.seq - b.seq);
    return [...withSeq, ...withoutSeq];
  }
  return [normalizeField()];
};

const normalizeTags = (model = {}) => ({
  vendor: toUiEnumValue(model.tags?.vendor || model.vendor || model.factory, VENDOR_API_TO_UI_UPPER, 'upper'),
  standard: toUiEnumValue(model.tags?.standard || model.rat || model.format, RAT_API_TO_UI_UPPER, 'upper'),
  timeGranularity: toUiEnumValue(model.tags?.timeGranularity || model.timeGranularity, TIME_GRANULARITY_API_TO_UI_LOWER, 'lower'),
  spaceGranularity: model.tags?.spaceGranularity || model.spaceGranularity || '',
  type: toUiEnumValue(model.tags?.type || model.businessModelType, MODEL_TYPE_API_TO_UI_LOWER, 'lower'),
  involveCalc: model.tags?.involveCalc !== undefined
    ? toBoolean(model.tags?.involveCalc)
    : toBoolean(model.involveCalc)
});

export const resolveModelCode = (model = {}) => toText(model.code || model.modelCode || model.id);

export const normalizeStandardModel = (model = {}) => {
  const code = toText(model.code || model.modelCode);
  const name = toText(model.name || model.modelName || code);
  const tags = normalizeTags(model);

  return {
    ...model,
    id: toText(model.id || code || name || createId()),
    code,
    modelCode: toText(model.modelCode || code),
    name,
    description: toText(model.description || model.modelDesc),
    status: toText(model.status || 'active'),
    refStandardModel: toText(model.refStandardModel || model.referenceModelCode),
    updateTime: toText(model.updateTime || model.lastUpdatedDate || model.modifyTime || model.creationDate || nowText()),
    tags,
    involveCalc: tags.involveCalc,
    fields: normalizeFields(model.fields || model.fieldList)
  };
};

export const normalizeProjectModel = (model = {}, projectIdFallback = null, projectCodeFallback = '') => {
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
    fieldBusinessType: inferBusinessType(field),
    seq: index + 1
  }));
};

export const toModelSavePayload = ({ entity, modelType, projectCode = '' }) => {
  const modelCode = toText(entity.code);
  const involveCalc = entity.tags?.involveCalc !== undefined
    ? toBoolean(entity.tags.involveCalc)
    : toBoolean(entity.involveCalc);

  return {
    code: modelCode,
    modelName: toText(entity.name),
    modelDesc: toText(entity.description),
    modelType,
    fieldList: toFieldListPayload(entity.fields, modelCode),
    referenceModelCode: toText(entity.refStandardModel),
    vendor: toApiEnumValue(entity.tags?.vendor, VENDOR_UI_TO_API),
    rat: toApiEnumValue(entity.tags?.standard, RAT_UI_TO_API),
    timeGranularity: toApiEnumValue(entity.tags?.timeGranularity, TIME_GRANULARITY_UI_TO_API),
    spaceGranularity: toText(entity.tags?.spaceGranularity),
    businessModelType: toApiEnumValue(entity.tags?.type, MODEL_TYPE_UI_TO_API),
    involveCalc,
    ...(projectCode ? { projectCode } : {})
  };
};

export const unwrapApiData = (response) => {
  if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data;
  }
  return response;
};

export const unwrapApiList = (response) => {
  const data = unwrapApiData(response);
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data)) return data;
  return [];
};

export const useModelStore = defineStore('model', () => {
  const standardModels = ref(defaultStandardModels.map((item) => normalizeStandardModel(deepClone(item))));
  const projectModels = ref(defaultProjectModels.map((item) => normalizeProjectModel(deepClone(item), item.projectId || 1, toText(item.projectId || 1))));
  const selectedProjectModelId = ref(projectModels.value[0]?.id || '');

  const selectedProjectModel = computed(() => {
    return projectModels.value.find((item) => String(item.id) === String(selectedProjectModelId.value)) || null;
  });

  const targetFields = computed(() => selectedProjectModel.value?.fields || []);

  const ensureSelectedProjectModel = () => {
    if (projectModels.value.some((item) => String(item.id) === String(selectedProjectModelId.value))) {
      return;
    }
    selectedProjectModelId.value = projectModels.value[0]?.id || '';
  };

  const setStandardModels = (models = []) => {
    standardModels.value = (Array.isArray(models) ? models : []).map((item) => normalizeStandardModel(item));
  };

  const setProjectModels = (models = []) => {
    projectModels.value = (Array.isArray(models) ? models : []).map((item) => normalizeProjectModel(item));
    ensureSelectedProjectModel();
  };

  const setSelectedProjectModelId = (id) => {
    selectedProjectModelId.value = toText(id);
    ensureSelectedProjectModel();
  };

  const upsertStandardModelLocal = (model) => {
    const normalized = normalizeStandardModel(model);
    const index = standardModels.value.findIndex((item) => String(item.id) === String(normalized.id));
    if (index >= 0) {
      standardModels.value[index] = normalized;
    } else {
      standardModels.value.unshift(normalized);
    }
    return normalized;
  };

  const upsertProjectModelLocal = (model) => {
    const normalized = normalizeProjectModel(model);
    const index = projectModels.value.findIndex((item) => String(item.id) === String(normalized.id));
    if (index >= 0) {
      projectModels.value[index] = normalized;
    } else {
      projectModels.value.unshift(normalized);
    }
    ensureSelectedProjectModel();
    if (!selectedProjectModelId.value) {
      selectedProjectModelId.value = normalized.id;
    }
    return normalized;
  };

  const removeStandardModelById = (id) => {
    standardModels.value = standardModels.value.filter((item) => String(item.id) !== String(id));
  };

  const removeProjectModelById = (id) => {
    projectModels.value = projectModels.value.filter((item) => String(item.id) !== String(id));
    ensureSelectedProjectModel();
  };

  const getStandardModelById = (id) => {
    const key = String(id);
    return standardModels.value.find((item) => String(item.id) === key || toText(item.code) === key || toText(item.modelCode) === key) || null;
  };

  const getProjectModelById = (id) => {
    const key = String(id);
    return projectModels.value.find((item) => String(item.id) === key || toText(item.code) === key || toText(item.modelCode) === key) || null;
  };

  return {
    standardModels,
    projectModels,
    selectedProjectModelId,
    selectedProjectModel,
    targetFields,
    setStandardModels,
    setProjectModels,
    setSelectedProjectModelId,
    upsertStandardModelLocal,
    upsertProjectModelLocal,
    removeStandardModelById,
    removeProjectModelById,
    getStandardModelById,
    getProjectModelById
  };
});
