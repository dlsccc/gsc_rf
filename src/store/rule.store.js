import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { rulesApi } from '@/api/index.js';
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
const normalizeEdmList = (payload = {}) => {
  if (Array.isArray(payload.edmList)) {
    return payload.edmList.map((item) => toText(item)).filter(Boolean);
  }

  if (Array.isArray(payload.uploadedFiles)) {
    return payload.uploadedFiles
      .map((file) => toText(file?.edmId || file?.edmID || file?.edmCode || file?.edm))
      .filter(Boolean);
  }

  return [];
};

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

export const normalizeRuleInputTables = (rule) => {
  if (!rule || !Array.isArray(rule.inputTables) || rule.inputTables.length === 0) {
    return [{ ...RULE_INPUT_TABLES[0] }];
  }

  const tables = rule.inputTables
    .map((table, index) => {
      const fallback = RULE_INPUT_TABLES[index] || RULE_INPUT_TABLES[RULE_INPUT_TABLES.length - 1];
      return {
        id: table && table.id ? String(table.id) : fallback.id,
        label: table && String(table.label || '').trim() ? String(table.label).trim() : fallback.label
      };
    })
    .filter((table, index, arr) => table.id && arr.findIndex((item) => item.id === table.id) === index)
    .slice(0, 2);

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
      const fallback = RULE_INPUT_TABLES[index] || RULE_INPUT_TABLES[RULE_INPUT_TABLES.length - 1];
      return {
        id: sourceId,
        label: toText(item?.sourceName || item?.source_name) || fallback.label || sourceId
      };
    })
    .filter(Boolean)
    .slice(0, 2);

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

const normalizeRule = (rule = {}) => ({
  ...rule,
  id: toText(rule.id || rule.ruleId || rule.ruleCode || createId()),
  ruleCode: toText(rule.ruleCode || rule.ruleId || rule.id),
  inputTables: normalizeRuleInputTables(rule),
  ruleJson: rule.ruleJson || {}
});

const mapApiRuleToEntity = (item = {}, projectId) => {
  const id = toText(item.ruleId || item.id || item.ruleCode || createId());
  const ruleJson = normalizeRuleJsonForApi(item.ruleJson || {});

  const fromRuleInput = parseRuleInputString(item.ruleInput);
  const parsedInputTables = Array.isArray(fromRuleInput)
    ? fromRuleInput.map((tableId, index) => ({
      id: toText(tableId),
      label: RULE_INPUT_TABLES[index]?.label || toText(tableId)
    })).filter((table) => table.id)
    : [];

  const inputTables = parsedInputTables.length > 0
    ? parsedInputTables
    : ruleJsonToInputTables(ruleJson);

  const targetModel = toText(
    item.targetModel
    || item.ruleOutput
    || ruleJson?.modelSelection?.modelCode
    || ruleJson?.model_selection?.model_code
  );

  return normalizeRule({
    id,
    ruleCode: id,
    name: toText(item.ruleName || item.name),
    description: toText(item.ruleDesc || item.description),
    status: toText(item.status || 'draft'),
    targetModel,
    projectId: item.projectId || projectId,
    inputTables,
    updateTime: toText(item.lastUpdatedDate || item.creationDate || item.updateTime || nowText()),
    ruleJson
  });
};

const toSaveRulePayload = (entity = {}, payload = {}) => {
  const ruleCode = toText(entity.ruleCode || entity.id);
  const normalizedRuleJson = normalizeRuleJsonForApi(payload.ruleJson || payload.dsl || entity.ruleJson || {});
  const edmList = normalizeEdmList(payload);
  const createBy = toText(payload.createBy) || DEFAULT_CREATE_BY;

  return {
    ruleId: ruleCode,
    ruleName: toText(entity.name),
    ruleDesc: toText(entity.description),
    ruleJson: normalizedRuleJson,
    sqlList: toText(payload.sqlList),
    datacubeFlowId: toText(payload.datacubeFlowId),
    ruleInput: JSON.stringify((entity.inputTables || []).map((item) => item.id)),
    ruleOutput: toText(entity.targetModel),
    status: toText(entity.status || payload.status || 'draft'),
    createBy,
    edmList,
    lastUpdatedBy: toText(payload.lastUpdatedBy)
  };
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

  const loadRules = async () => {
    loading.value = true;
    try {
      const response = await rulesApi.list({ pageNum: 1, pageSize: 200 });
      const list = unwrapApiList(response);
      if (list.length > 0) {
        rules.value = list.map((item) => mapApiRuleToEntity(item, appStore.currentProject));
      }
    } catch {
      // 无后端时保留本地样例数据。
    } finally {
      loading.value = false;
    }
  };

  const upsertRule = async (payload) => {
    const entity = normalizeRule({
      id: payload.id || payload.ruleCode || payload.ruleId || createId(),
      ruleCode: payload.ruleCode || payload.ruleId || payload.id,
      name: payload.name,
      description: payload.description || '',
      status: payload.status || 'draft',
      targetModel: payload.targetModel || '',
      projectId: payload.projectId || appStore.currentProject,
      inputTables: payload.inputTables,
      updateTime: nowText(),
      ruleJson: payload.ruleJson || payload.dsl || payload.ruleJson || {}
    });

    const index = rules.value.findIndex((item) => String(item.id) === String(entity.id));
    if (index >= 0) {
      rules.value[index] = entity;
    } else {
      rules.value.unshift(entity);
    }

    try {
      await rulesApi.save(toSaveRulePayload(entity, payload));
    } catch {
      // 后端未接入时忽略错误。
    }

    return entity;
  };

  const publishRule = async (ruleCodeOrId) => {
    const key = toText(ruleCodeOrId);
    const target = rules.value.find((item) => item.ruleCode === key || String(item.id) === key);
    const ruleCode = toText(target?.ruleCode || target?.id || ruleCodeOrId);

    if (!ruleCode) {
      throw new Error('规则编码为空，无法发布');
    }

    await rulesApi.publish({ ruleCode });

    if (target) {
      target.status = 'active';
      target.updateTime = nowText();
    }
  };

  const deleteRule = async (id) => {
    rules.value = rules.value.filter((item) => String(item.id) !== String(id));
    try {
      await rulesApi.remove({ id: toText(id) });
    } catch {
      // 后端未接入时忽略错误。
    }
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
    loadRules,
    upsertRule,
    publishRule,
    deleteRule,
    getRuleById
  };
});



