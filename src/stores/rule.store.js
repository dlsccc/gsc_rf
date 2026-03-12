import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { rulesApi } from '../services/api';
import { createId } from '../core/utils/id';
import { nowText } from '../core/utils/date';
import { useAppStore } from './app.store';

export const RULE_INPUT_TABLES = [
  { id: 'table_a', label: '数据表A' },
  { id: 'table_b', label: '数据表B' }
];

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

const defaultRules = [
  {
    id: 1,
    name: 'UM_4G_HW_小时级Counter入湖',
    description: '华为4G网络小时级Counter数据入湖规则，用于基站性能指标数据入湖',
    status: 'active',
    targetModel: 'UM_4G_HW_小时级Counter',
    updateTime: '2024-03-04 15:30',
    projectId: 1,
    inputTables: [{ ...RULE_INPUT_TABLES[0] }]
  }
];

const normalizeRule = (rule = {}) => ({
  ...rule,
  inputTables: normalizeRuleInputTables(rule)
});

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
      if (!appStore.currentProject) return;
      const data = await rulesApi.list(appStore.currentProject);
      if (Array.isArray(data)) {
        rules.value = data.map((item) => normalizeRule(item));
      }
    } catch {
      // 无后端时保留本地样例数据。
    } finally {
      loading.value = false;
    }
  };

  const upsertRule = async (payload) => {
    const entity = normalizeRule({
      id: payload.id || createId(),
      name: payload.name,
      description: payload.description || '',
      status: payload.status || 'draft',
      targetModel: payload.targetModel || '',
      projectId: payload.projectId || appStore.currentProject,
      inputTables: payload.inputTables,
      updateTime: nowText()
    });

    const index = rules.value.findIndex((item) => String(item.id) === String(entity.id));
    if (index >= 0) {
      rules.value[index] = entity;
    } else {
      rules.value.unshift(entity);
    }

    try {
      if (payload.id) {
        await rulesApi.update(appStore.currentProject, payload.id, entity);
      } else {
        await rulesApi.create(appStore.currentProject, entity);
      }
    } catch {
      // 后端未接入时忽略错误。
    }

    return entity;
  };

  const deleteRule = async (id) => {
    rules.value = rules.value.filter((item) => String(item.id) !== String(id));
    try {
      await rulesApi.remove(appStore.currentProject, id);
    } catch {
      // 后端未接入时忽略错误。
    }
  };

  const getRuleById = (id) => rules.value.find((item) => String(item.id) === String(id));

  return {
    rules,
    loading,
    filteredRules,
    sortedRules,
    loadRules,
    upsertRule,
    deleteRule,
    getRuleById
  };
});
