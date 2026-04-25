<template>
  <section>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label"><span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">table_rows</span>{{ t.sourceRows }}</div>
        <div class="summary-value">{{ processedRowCount }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label"><span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">view_column</span>{{ t.mappedFields }}</div>
        <div class="summary-value">{{ mappedFieldCount }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label"><span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">construction</span>{{ t.processSteps }}</div>
        <div class="summary-value">{{ processStepCount }}</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label"><span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 6px;">edit_note</span>{{ t.writeMode }}</label>

      <div class="write-option" :class="{ selected: store.writeConfig.mode === 'append' }" @click="setMode('append')">
        <div class="write-option-header">
          <div class="radio-circle"></div>
          <span class="write-option-title">{{ t.appendMode }}</span>
        </div>
        <div class="write-option-desc">{{ t.appendDesc }}</div>

        <div v-if="store.writeConfig.mode === 'append'" class="sub-options" @click.stop>
          <div class="sub-option-item">
            <input id="writeDedupCheck" type="checkbox" v-model="store.writeConfig.deduplication" />
            <label for="writeDedupCheck">{{ t.enableDedup }}</label>
            <select
              v-if="store.writeConfig.deduplication"
              v-model="store.writeConfig.dedupFields"
              class="form-select"
              style="width: 200px; margin-left: 8px;"
              multiple
            >
              <option v-for="field in store.targetFields" :key="field.name" :value="field.name">{{ field.name }}</option>
            </select>
          </div>

          <div class="sub-option-item">
            <span>{{ t.conflictHandling }}</span>
            <span style="font-weight: 600;">{{ t.keepOld }}</span>
          </div>
        </div>
      </div>

      <div class="write-option" :class="{ selected: store.writeConfig.mode === 'replace' }" @click="setMode('replace')">
        <div class="write-option-header">
          <div class="radio-circle"></div>
          <span class="write-option-title">{{ t.replaceMode }}</span>
        </div>
        <div class="write-option-desc">{{ t.replaceDesc }}</div>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label"><span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 6px;">info</span>{{ t.targetInfo }}</label>
      <div style="padding: 20px; background: linear-gradient(135deg, #fafafa 0%, #fff 100%); border-radius: 12px; border: 1px solid var(--border);">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
          <div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;"><span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">table_chart</span>{{ t.tableName }}</div>
            <div style="font-weight: 600;">{{ selectedModelName }}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;"><span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">cloud</span>{{ t.targetEnv }}</div>
            <div style="font-weight: 600;">{{ t.dataLake }}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;"><span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">view_column</span>{{ t.writeFieldCount }}</div>
            <div style="font-weight: 600;">{{ mappedFieldCount }}</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;"><span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">format_list_numbered</span>{{ t.expectedRows }}</div>
            <div style="font-weight: 600;">{{ processedRowCount }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useModelStore } from '@/store/model.store.js';

const props = defineProps({
  store: { type: Object, required: true }
});

const t = {
  sourceRows: '\u6e90\u6570\u636e\u884c\u6570',
  mappedFields: '\u6620\u5c04\u5b57\u6bb5\u6570',
  processSteps: '\u5904\u7406\u6b65\u9aa4\u6570',
  writeMode: '\u5199\u5165\u6a21\u5f0f',
  appendMode: '\u589e\u91cf\u5199\u5165',
  appendDesc: '\u5c06\u6570\u636e\u8ffd\u52a0\u5230\u76ee\u6807\u8868\u4e2d\uff0c\u53ef\u914d\u7f6e\u53bb\u91cd\u89c4\u5219\uff0c\u51b2\u7a81\u65f6\u9ed8\u8ba4\u4fdd\u7559\u65e7\u6570\u636e',
  enableDedup: '\u542f\u7528\u53bb\u91cd',
  conflictHandling: '\u51b2\u7a81\u5904\u7406\uff1a',
  keepOld: '\u4fdd\u7559\u65e7\u6570\u636e',
  replaceMode: '\u5168\u8868\u66ff\u6362',
  replaceDesc: '\u6e05\u7a7a\u76ee\u6807\u8868\u4e2d\u7684\u6240\u6709\u6570\u636e\uff0c\u7136\u540e\u5199\u5165\u65b0\u6570\u636e',
  targetInfo: '\u76ee\u6807\u8868\u4fe1\u606f',
  tableName: '\u8868\u540d',
  targetEnv: '\u76ee\u6807\u73af\u5883',
  dataLake: '\u6570\u636e\u6e56 (Lake)',
  writeFieldCount: '\u5199\u5165\u5b57\u6bb5\u6570',
  expectedRows: '\u9884\u8ba1\u5199\u5165\u884c\u6570'
};

const modelStore = useModelStore();

const selectedModelName = computed(() => {
  const model = modelStore.projectModels.find((item) => String(item.id) === String(props.store.selectedModelId));
  return model?.name || '-';
});

const processedRowCount = computed(() => {
  return Array.isArray(props.store.processedRows) ? props.store.processedRows.length : 0;
});

const mappedFieldCount = computed(() => {
  return Object.values(props.store.mappings || {}).filter((value) => Array.isArray(value) && value.length > 0).length;
});

const isFilterActive = (config) => {
  if (!config) return false;
  if (config.mode === 'simple' && config.operator) return true;
  if (config.mode === 'formula' && config.formula) return true;
  if (config.mode === 'compound' && Array.isArray(config.conditions) && config.conditions.some((item) => item.operator)) return true;
  return false;
};

const hasEffectiveTransform = (config) => {
  if (!config) return false;
  if (Array.isArray(config.chain) && config.chain.length > 0) return true;
  if (Array.isArray(config.rules) && config.rules.length > 0) return true;
  if (config.type) return true;
  return false;
};

const processStepCount = computed(() => {
  const filterCount = Object.values(props.store.filters || {}).filter((config) => isFilterActive(config)).length;
  const transformCount = Object.values(props.store.transforms || {}).filter((config) => hasEffectiveTransform(config)).length;
  const sortCount = Array.isArray(props.store.sortConfig?.items)
    ? props.store.sortConfig.items.length
    : (props.store.sortConfig?.field ? 1 : 0);
  const dedupCount = props.store.dedupConfig?.enabled && (props.store.dedupConfig?.fields || []).length > 0 ? 1 : 0;
  return filterCount + transformCount + sortCount + dedupCount;
});

const setMode = (mode) => {
  props.store.writeConfig.mode = mode;
  props.store.writeConfig.conflictStrategy = 'keep_old';
};

watch(
  () => props.store.writeConfig.conflictStrategy,
  (value) => {
    if (value !== 'keep_old') {
      props.store.writeConfig.conflictStrategy = 'keep_old';
    }
  },
  { immediate: true }
);
</script>

