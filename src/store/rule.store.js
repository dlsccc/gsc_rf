import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { createId } from '@/utils/id.js';
import { nowText } from '@/utils/date.js';
import { useAppStore } from '@/store/app.store.js';

export const RULE_INPUT_TABLES = [
  { id: 'table_a', label: '数据表A' },
  { id: 'table_b', label: '数据表B' }
];

const toText = (value) => String(value ?? '').trim();
const DEFAULT_CREATE_BY = 'system';
const toCamelKey = (key) => String(key ?? '').replace(/_([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const deepMapObjectKeys = (value, keyMapper) => {
  if (Array.isArray(value)) {
    return value.map((item) => deepMapObjectKeys(item, keyMapper));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return Object.entries(value).reduce((acc, [key, next]) => {
    acc[keyMapper(key)] = deepMapObjectKeys(next, keyMapper);
    return acc;
  }, {});
};

const normalizeRuleJsonForApi = (ruleJson) => deepMapObjectKeys(ruleJson || {}, toCamelKey);

const parseRuleJson = (ruleJson) => {
  if (typeof ruleJson === 'string') {
    try {
      const parsed = JSON.parse(ruleJson);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  if (ruleJson && typeof ruleJson === 'object') {
    return ruleJson;
  }
  return {};
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

export const normalizeRuleInputTables = (rule) => {
  if (!rule || !Array.isArray(rule.inputTables) || rule.inputTables.length === 0) {
    return [{ ...RULE_INPUT_TABLES[0] }];
  }

  const tables = rule.inputTables
    .map((table, index) => {
      const fallback = RULE_INPUT_TABLES[index] || { id: `table_${index + 1}`, label: `数据表${index + 1}` };
      return {
        id: table && table.id ? String(table.id) : fallback.id,
        label: table && String(table.label || '').trim() ? String(table.label).trim() : fallback.label
      };
    })
    .filter((table, index, arr) => table.id && arr.findIndex((item) => item.id === table.id) === index);

  if (tables.length === 0) {
    return [{ ...RULE_INPUT_TABLES[0] }];
  }

  return tables;
};

const ruleJsonToInputTables = (ruleJson = {}) => {
  const sourceTables = (ruleJson?.globalSetting?.dataSources?.tables
    || ruleJson?.global_setting?.data_sources?.tables
    || [])
    .map((item, index) => {
      const sourceId = toText(item?.sourceId || item?.source_id);
      if (!sourceId) return null;
      const fallback = RULE_INPUT_TABLES[index] || { id: `table_${index + 1}`, label: `数据表${index + 1}` };
      return {
        id: sourceId,
        label: toText(item?.sourceName || item?.source_name) || fallback.label || sourceId
      };
    })
    .filter(Boolean);

  if (sourceTables.length === 0) {
    return [{ ...RULE_INPUT_TABLES[0] }];
  }

  return sourceTables;
};

const parseRuleInputString = (ruleInput) => {
  if (!ruleInput) return null;
  if (Array.isArray(ruleInput)) return ruleInput;

  try {
    const parsed = JSON.parse(ruleInput);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const defaultRules = [
  {
    id: 1,
    ruleCode: '1',
    name: 'UM_4G_HW_小时级Counter入湖',
    description: '华为4G网络小时级Counter数据入湖规则，用于基站性能指标数据入湖',
    status: 'active',
    targetModel: 'UM_4G_HW_小时级Counter',
    updateTime: '2024-03-04 15:30',
    projectId: 1,
    inputTables: [{ ...RULE_INPUT_TABLES[0] }],
    ruleJson: {}
  }
];

export const normalizeRule = (rule = {}) => ({
  ...rule,
  id: toText(rule.id || rule.ruleId || rule.ruleCode || createId()),
  ruleCode: toText(rule.ruleCode || rule.ruleId || rule.id),
  targetModelName: toText(rule.targetModelName || rule.targetModel),
  inputTables: normalizeRuleInputTables(rule),
  ruleJson: rule.ruleJson || {}
});

export const mapApiRuleToEntity = (item = {}, projectId) => {
  const id = toText(item.ruleId || item.id || item.ruleCode || createId());
  const ruleJson = normalizeRuleJsonForApi(parseRuleJson(item.ruleJson));

  const fromRuleInput = parseRuleInputString(item.ruleInput);
  const parsedInputTables = Array.isArray(fromRuleInput)
    ? fromRuleInput.map((tableId, index) => ({
      id: toText(tableId),
      label: RULE_INPUT_TABLES[index]?.label || `数据表${index + 1}`
    })).filter((table) => table.id)
    : [];

  const inputTables = parsedInputTables.length > 0
    ? parsedInputTables
    : ruleJsonToInputTables(ruleJson);

  const modelSelection = item.modelSelection || ruleJson?.modelSelection || ruleJson?.model_selection || {};
  const targetModel = toText(
    item.targetModel
    || item.ruleOutput
    || modelSelection?.modelId
    || modelSelection?.model_id
    || ruleJson?.modelSelection?.modelCode
    || ruleJson?.model_selection?.model_code
  );
  const targetModelName = toText(
    item.targetModelName
    || modelSelection?.modelName
    || modelSelection?.model_name
    || targetModel
  );

  return normalizeRule({
    id,
    ruleCode: id,
    name: toText(item.ruleName || item.name),
    description: toText(item.ruleDesc || item.description),
    status: toText(item.status || 'draft'),
    targetModel,
    targetModelName,
    projectId: item.projectId || projectId,
    inputTables,
    updateTime: toText(item.lastUpdatedDate || item.creationDate || item.updateTime || nowText()),
    ruleJson
  });
};

export const toSaveRulePayload = (entity = {}, payload = {}) => {
  const persistedRuleId = toText(payload.ruleId);
  const normalizedRuleJson = normalizeRuleJsonForApi(payload.ruleJson || payload.dsl || entity.ruleJson || {});
  const createBy = toText(payload.createBy) || DEFAULT_CREATE_BY;

  const requestPayload = {
    ruleName: toText(entity.name),
    ruleDesc: toText(entity.description),
    ruleJson: normalizedRuleJson,
    sqlList: toText(payload.sqlList),
    datacubeFlowId: toText(payload.datacubeFlowId),
    ruleInput: JSON.stringify((entity.inputTables || []).map((item) => item.id)),
    ruleOutput: toText(entity.targetModel),
    status: toText(entity.status || payload.status || 'draft'),
    createBy,
    lastUpdatedBy: toText(payload.lastUpdatedBy)
  };

  if (persistedRuleId) {
    requestPayload.ruleId = persistedRuleId;
  }

  return requestPayload;
};

export const useRuleStore = defineStore('rule', () => {
  const appStore = useAppStore();
  const rules = ref(defaultRules.map((item) => normalizeRule(item)));
  const loading = ref(false);

  const filteredRules = computed(() => {
    return rules.value.filter((item) => Number(item.projectId) === Number(appStore.currentProject));
  });

  const sortedRules = computed(() => {
    return [...filteredRules.value].sort((a, b) => (a.updateTime < b.updateTime ? 1 : -1));
  });

  const setLoading = (value) => {
    loading.value = !!value;
  };

  const setRules = (list = []) => {
    rules.value = (Array.isArray(list) ? list : []).map((item) => normalizeRule(item));
  };

  const upsertRuleLocal = (payload = {}) => {
    const entity = normalizeRule({
      ...payload,
      id: payload.id || payload.ruleCode || payload.ruleId || createId(),
      ruleCode: payload.ruleCode || payload.ruleId || payload.id,
      updateTime: payload.updateTime || nowText()
    });

    const index = rules.value.findIndex((item) => String(item.id) === String(entity.id));
    if (index >= 0) {
      rules.value[index] = entity;
    } else {
      rules.value.unshift(entity);
    }

    return entity;
  };

  const removeRuleById = (id) => {
    rules.value = rules.value.filter((item) => String(item.id) !== String(id));
  };

  const getRuleById = (id) => {
    const key = String(id);
    return rules.value.find((item) => String(item.id) === key || String(item.ruleCode) === key) || null;
  };

  return {
    rules,
    loading,
    filteredRules,
    sortedRules,
    setLoading,
    setRules,
    upsertRuleLocal,
    removeRuleById,
    getRuleById
  };
});
