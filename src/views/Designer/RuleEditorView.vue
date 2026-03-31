<template>
  <div style="margin-top: 64px; height: calc(100vh - 64px); display: flex; flex-direction: column;">
    <div class="rule-edit-header" style="padding: 16px 24px; background: #fff; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 16px;">
      <div class="back-btn" @click="router.push('/designer/rules')"><span class="material-icons">arrow_back</span></div>
      <div style="flex: 1; display: flex; align-items: center; gap: 16px;">
        <input v-model="form.name" type="text" class="form-input" placeholder="请输入规则名称" style="max-width: 300px; font-weight: 600;" />
        <span v-if="isEdit" class="tag tag-success">编辑中</span>
        <span v-else class="tag tag-warning">新建</span>
      </div>
    </div>

    <div class="main-container" style="display: flex; flex: 1; overflow: hidden;">
      <main class="content">
        <div class="content-card">
          <div v-show="pipelineStore.currentStep === 0">
            <div class="card-header">
              <div class="card-title">选择目标模型并上传原始数据</div>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label"><span class="material-icons">database</span>目标数据模型</label>
                <select class="form-select" :value="pipelineStore.selectedModelId" @change="onSelectModel($event.target.value)">
                  <option value="">请选择目标数据模型</option>
                  <option v-if="publishedProjectModels.length === 0" value="" disabled>当前项目暂无已发布模型</option>
                  <option v-for="model in publishedProjectModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </div>

              <div v-if="targetModelPreviewFields.length" class="form-group">
                <label class="form-label"><span class="material-icons">view_column</span>模型字段预览</label>
                <div class="data-grid-container" style="max-height: 220px;">
                  <table class="data-grid">
                    <thead>
                      <tr>
                        <th>字段名称</th>
                        <th>字段类型</th>
                        <th>业务类型</th>
                        <th>说明</th>
                        <th>样例值</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="field in targetModelPreviewFields" :key="field.name">
                        <td>{{ field.name }}</td>
                        <td><span class="tag" :class="field.type === 'STRING' ? 'tag-primary' : 'tag-warning'">{{ field.type }}</span></td>
                        <td>{{ field.businessType || '-' }}</td>
                        <td>{{ field.description }}</td>
                        <td style="color: var(--text-secondary); font-family: monospace;">{{ field.sampleValue }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <FileUploadPanel :store="pipelineStore" />
            </div>
          </div>

          <div v-show="pipelineStore.currentStep === 1">
            <div class="card-header">
              <div class="card-title">字段映射配置</div>
              <div class="step-actions">
                <button class="btn btn-default btn-sm" :disabled="autoMapping || parsingForStep" @click="autoMap">
                  <span class="material-icons" style="font-size: 16px; vertical-align: middle;">auto_fix_high</span>
                  {{ autoMapping ? '匹配中...' : '自动匹配' }}
                </button>
              </div>
            </div>
            <div class="card-body">
              <FieldMappingPanel :store="pipelineStore" />
            </div>
          </div>

          <div v-show="pipelineStore.currentStep === 2">
            <div class="card-header">
              <div class="card-title">数据处理配置</div>
            </div>
            <div class="card-body">
              <ProcessPanel :store="pipelineStore" :debug-rows="sqlDebugRows" @operation-applied="handleProcessOperationApplied" />

            </div>
          </div>

          <div v-show="pipelineStore.currentStep === 3">
            <div class="card-header">
              <div class="card-title">写入配置</div>
            </div>
            <div class="card-body">
              <WriteConfigPanel :store="pipelineStore" @execute="executeJob" />
            </div>
          </div>

          <div class="nav-buttons">
            <div>
              <button v-if="pipelineStore.currentStep > 0" class="btn btn-default" @click="pipelineStore.prevStep">
                <span class="material-icons" style="font-size: 18px;">arrow_back</span>
                上一步
              </button>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="btn btn-default" @click="saveRule">
                <span class="material-icons" style="font-size: 18px;">save</span>
                保存规则
              </button>
              <button
                v-if="pipelineStore.currentStep < pipelineStore.steps.length - 1"
                class="btn btn-primary"
                :disabled="!pipelineStore.canProceed || parsingForStep"
                @click="goNextStep"
              >
                下一步
                <span class="material-icons" style="font-size: 18px;">arrow_forward</span>
              </button>
              <button v-else class="btn btn-primary" @click="executeJob">
                <span class="material-icons" style="font-size: 18px;">rocket_launch</span>
                发布入库流
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiSystemService, projectModelsApi, rulesApi } from '@/api/index.js';
import { nowText } from '@/utils/date.js';
import { buildPipelineDsl } from '@/utils/pipeline-dsl.js';
import { $error, $success, $warning } from '@/utils/message.js';
import { extractFieldInfoList, extractFieldsFromRows, findParsedDataSet, normalizeObjectRows, parseEdmFile, resolveEdmId } from '@/utils/fileUtils.js';
import { useAppStore } from '@/store/app.store.js';
import { normalizeProjectModel, resolveModelCode, toBusinessTypeLabel, unwrapApiData, unwrapApiList, useModelStore } from '@/store/model.store.js';
import { RULE_INPUT_TABLES, mapApiRuleToEntity, toSaveRulePayload, useRuleStore } from '@/store/rule.store.js';
import { usePipelineStore } from '@/store/pipeline.store.js';
import FileUploadPanel from '@/components/pipeline/FileUploadPanel.vue';
import FieldMappingPanel from '@/components/pipeline/FieldMappingPanel.vue';
import ProcessPanel from '@/components/pipeline/ProcessPanel.vue';
import WriteConfigPanel from '@/components/pipeline/WriteConfigPanel.vue';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();
const ruleStore = useRuleStore();
const pipelineStore = usePipelineStore();
const persistedRuleId = ref('');
const parsingForStep = ref(false);
const autoMapping = ref(false);
const sqlDebugRows = ref([]);
const sqlDebugTimer = ref(null);
const sqlDebugRequestSeq = ref(0);

const isEdit = computed(() => !!route.params.id);

const form = reactive({
  id: null,
  name: '',
  description: '',
  status: 'draft',
  targetModel: '',
  projectId: null
});

const publishedProjectModels = computed(() => {
  return modelStore.projectModels.filter((item) => Number(item.projectId) === Number(appStore.currentProject) && item.status === 'active');
});

const targetModelPreviewFields = computed(() => {
  return pipelineStore.targetFields.map((field) => ({
    name: field.name,
    type: field.type,
    businessType: toBusinessTypeLabel(field.businessType),
    description: field.description,
    sampleValue: field.sampleValue || field.example || ''
  }));
});


const resolveCurrentProjectCode = () => {
  return String(appStore.currentProjectCode || appStore.currentProject || '').trim();
};

const toText = (value) => String(value ?? '').trim();

const createValidationError = (message) => {
  const error = new Error(message);
  error.isValidationError = true;
  return error;
};

const resolvePersistedRuleIdForSave = () => {
  return toText(persistedRuleId.value);
};

const extractRuleIdFromSaveResponse = (saveResponse) => {
  const payload = saveResponse?.data ?? saveResponse?.result ?? saveResponse ?? {};
  const candidates = [
    saveResponse?.ruleId,
    saveResponse?.id,
    payload?.ruleId,
    payload?.id,
    payload?.ruleCode,
    payload?.data?.ruleId,
    payload?.data?.id,
    payload?.data?.ruleCode,
    saveResponse?.response?.data?.data?.ruleId,
    saveResponse?.response?.data?.result?.ruleId,
    saveResponse?.response?.data?.ruleId,
    saveResponse?.ruleCode
  ];

  for (const item of candidates) {
    const value = toText(item);
    if (value) return value;
  }

  return '';
};

const toArrayValue = (value) => (Array.isArray(value) ? value : []);


const normalizeSqlList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean);
  }

  const text = toText(value);
  if (!text) return [];

  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toText(item)).filter(Boolean);
      }
    } catch {
      // keep raw text fallback
    }
  }

  return [text];
};

const extractSqlListFromSaveResponse = (saveResponse) => {
  const payload = saveResponse?.data ?? saveResponse?.result ?? saveResponse ?? {};
  const candidates = [
    payload?.sqlList,
    payload?.sql_list,
    payload?.data,
    saveResponse?.sqlList,
    saveResponse?.data
  ];

  for (const candidate of candidates) {
    const sqlList = normalizeSqlList(candidate);
    if (sqlList.length > 0) {
      return sqlList;
    }
  }

  return [];
};

const collectRuleInputSourceTables = (dsl = {}) => {
  const dataProcessing = dsl?.dataProcessing || dsl?.data_processing || {};
  const rules = toArrayValue(dataProcessing?.rules);
  const sourceTables = new Set();

  rules.forEach((ruleItem) => {
    const inputs = toArrayValue(ruleItem?.ruleInput || ruleItem?.rule_input);
    inputs.forEach((inputItem) => {
      const sourceTable = pickValue(inputItem?.sourceTable, inputItem?.source_table);
      if (sourceTable) {
        sourceTables.add(sourceTable);
      }
    });
  });

  return sourceTables;
};

const normalizeDebugFieldInfoList = (list = []) => {
  return toArrayValue(list)
    .map((item) => {
      const seq = item?.seq ?? item?.fieldSeq ?? item?.field_seq ?? '';
      return {
        seq,
        fieldName: pickValue(item?.fieldName, item?.field_name, item?.name),
        fieldAlias: pickValue(item?.fieldAlias, item?.field_alias, item?.alias),
        fieldType: pickValue(item?.fieldType, item?.field_type, item?.type)
      };
    })
    .filter((item) => item.seq !== '' || item.fieldName || item.fieldAlias || item.fieldType);
};

const buildDebugEdmList = (dsl = {}) => {
  const sourceTables = collectRuleInputSourceTables(dsl);
  const includeAll = sourceTables.size === 0 || sourceTables.has('table_mapped');

  const globalSetting = dsl?.globalSetting || dsl?.global_setting || {};
  const dataSources = globalSetting?.dataSources || globalSetting?.data_sources || {};
  const dslTables = toArrayValue(dataSources?.tables);
  const sourceOrder = ['table_a', 'table_b'];

  const dslTableEntries = dslTables
    .map((table, index) => ({
      source: sourceOrder[index] || `table_${index + 1}`,
      edmId: pickValue(table?.edmId, table?.edmID, table?.fileCode),
      tableName: pickValue(table?.sourceId, table?.source_id),
      fieldInfoList: normalizeDebugFieldInfoList(table?.fieldInfoList || table?.field_info_list)
    }))
    .filter((item) => item.edmId && item.tableName);

  const fallbackEntries = toArrayValue(pipelineStore.uploadedFiles)
    .map((file, index) => ({
      source: toText(file?.source) || sourceOrder[index] || `table_${index + 1}`,
      edmId: resolveEdmId(file),
      tableName: toText(file?.source),
      fieldInfoList: normalizeDebugFieldInfoList(file?.fieldInfoList || file?.field_info_list)
    }))
    .filter((item) => item.edmId && item.tableName);

  const sourceEntries = dslTableEntries.length > 0 ? dslTableEntries : fallbackEntries;
  const tableEntries = sourceEntries.filter((item) => includeAll || sourceTables.has(item.source));

  const entryMap = tableEntries.reduce((acc, item) => {
    const key = `${item.edmId}::${item.tableName}`;
    if (!acc.has(key)) {
      acc.set(key, {
        edmId: item.edmId,
        tableName: item.tableName,
        fieldInfoList: toArrayValue(item.fieldInfoList)
      });
      return acc;
    }

    const current = acc.get(key);
    if (toArrayValue(current?.fieldInfoList).length === 0 && toArrayValue(item.fieldInfoList).length > 0) {
      current.fieldInfoList = toArrayValue(item.fieldInfoList);
    }
    return acc;
  }, new Map());

  return [...entryMap.values()].filter((item) => item.edmId && item.tableName);
};

const extractDebugResultRows = (debugResponse) => {
  const payload = debugResponse?.data ?? debugResponse?.result ?? debugResponse ?? {};
  const candidates = [
    payload?.result,
    payload?.rows,
    payload
  ];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate.map((item) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        return item;
      }
      return { value: item };
    });
  }

  return [];
};

const pickValue = (...values) => {
  for (const value of values) {
    const text = toText(value);
    if (text) return text;
  }
  return '';
};

const toParamMap = (params = []) => {
  return toArrayValue(params).reduce((acc, item) => {
    const name = pickValue(item?.paramName, item?.param_name);
    if (!name) return acc;
    acc[name] = item?.paramValue ?? item?.param_value;
    return acc;
  }, {});
};

const REVERSE_OPERATOR_MAP = {
  equal: 'equals',
  not_equal: 'not_equals',
  contains: 'contains',
  is_empty: 'is_empty',
  is_not_empty: 'is_not_empty',
  greater_than: 'greater_than',
  less_than: 'less_than'
};

const REVERSE_TRANSFORM_TYPE_MAP = {
  to_upper: 'uppercase',
  to_lower: 'lowercase',
  trim: 'trim',
  format_datetime: 'format_datetime',
  extract_year: 'extract_year',
  extract_month: 'extract_month',
  extract_time: 'extract_time',
  format_time: 'format_time',
  calc_week: 'calc_week',
  calc_weekday: 'calc_weekday',
  to_number: 'to_number',
  remove_thousand_sep: 'remove_thousand_sep',
  remove_percent: 'remove_percent',
  round_decimal: 'round_decimal',
  set_value: 'set_value',
  concat: 'concat',
  replace: 'replace',
  formula: 'formula'
};

const TIME_ORIGIN_TO_MODE_MAP = {
  'YYYY-MM-DD': 'date',
  YYYY: 'year',
  'YYYY-MM': 'month',
  'hh:mm:ss': 'time',
  'hh:mm': 'time_minute',
  'YYYY/MM/DD': 'date_slash',
  'YYYY/MM': 'month_slash'
};

const resolveTimeFormatMode = (originType, transformType) => {
  const normalizedOrigin = toText(originType).toUpperCase();
  if (TIME_ORIGIN_TO_MODE_MAP[normalizedOrigin]) {
    return TIME_ORIGIN_TO_MODE_MAP[normalizedOrigin];
  }

  const normalizedType = toText(transformType).toLowerCase();
  if (normalizedType === 'extract_year') return 'year';
  if (normalizedType === 'extract_month') return 'month';
  if (normalizedType === 'extract_time' || normalizedType === 'format_time') return 'time';
  return 'date';
};

const toTransformConfigFromParams = (rawType, source = {}) => {
  const normalizedType = toText(rawType).toLowerCase();
  const mappedType = REVERSE_TRANSFORM_TYPE_MAP[normalizedType] || normalizedType;
  const isTimeTransform = ['format_datetime', 'extract_year', 'extract_month', 'extract_time', 'format_time'].includes(normalizedType);
  const timeFormatMode = resolveTimeFormatMode(source.origin_type ?? source.originType, normalizedType);

  return {
    type: isTimeTransform ? 'format_time' : mappedType,
    delimiter: source.delimiter ?? '',
    fixedValue: source.value ?? '',
    search: source.search_value ?? '',
    replace: source.replace_value ?? '',
    formula: source.formula ?? '',
    inputFormat: source.input_format ?? '',
    outputFormat: source.output_format ?? '',
    precision: source.precision ?? '',
    ...(isTimeTransform ? {
      timeFormatMode,
      originType: source.origin_type ?? source.originType ?? ''
    } : {})
  };
};

const CONDITION_COLUMN_REF = '$rule_input[0].key_columns[0]';

const stripQuotedText = (value) => {
  const text = toText(value);
  if (!text) return '';
  if (
    (text.startsWith('"') && text.endsWith('"'))
    || (text.startsWith('\'') && text.endsWith('\''))
  ) {
    return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\'/g, '\'');
  }
  return text;
};

const parseConditionExpression = (conditionExpr) => {
  const expr = toText(conditionExpr);
  if (!expr) return null;

  const containsMatch = expr.match(/^\s*contains\(\$rule_input\[0\]\.key_columns\[0\],\s*(.+)\)\s*$/i);
  if (containsMatch) {
    return {
      operator: 'contains',
      value: stripQuotedText(containsMatch[1])
    };
  }

  if (expr === `${CONDITION_COLUMN_REF} == null || ${CONDITION_COLUMN_REF} == ""`) {
    return { operator: 'is_empty', value: '' };
  }

  if (expr === `${CONDITION_COLUMN_REF} != null && ${CONDITION_COLUMN_REF} != ""`) {
    return { operator: 'is_not_empty', value: '' };
  }

  const compareMatch = expr.match(/^\s*\$rule_input\[0\]\.key_columns\[0\]\s*(==|!=|>|<)\s*(.+)\s*$/);
  if (!compareMatch) return null;

  const operatorMap = {
    '==': 'equals',
    '!=': 'not_equals',
    '>': 'greater_than',
    '<': 'less_than'
  };

  return {
    operator: operatorMap[compareMatch[1]] || '',
    value: stripQuotedText(compareMatch[2])
  };
};

const parseTransformParamsToConfig = (ruleParams = {}) => {
  const transformType = pickValue(ruleParams.transform_type).toLowerCase();
  if (!transformType) return null;

  if (transformType === 'chain') {
    return {
      chain: toArrayValue(ruleParams.steps).map((step) => ({
        ...toTransformConfigFromParams(step?.transform_type, step || {})
      }))
    };
  }

  return toTransformConfigFromParams(transformType, ruleParams);
};

const readRuleJsonSections = (ruleJson = {}) => {
  const globalSetting = ruleJson?.globalSetting || ruleJson?.global_setting || {};
  const dataSources = globalSetting?.dataSources || globalSetting?.data_sources || {};
  const dataProcessing = ruleJson?.dataProcessing || ruleJson?.data_processing || {};
  const writeConfigDsl = ruleJson?.writeConfig || ruleJson?.write_config || null;

  return {
    tables: toArrayValue(dataSources?.tables),
    joinConfig: globalSetting?.joinConfig || globalSetting?.join_config || null,
    deduplicate: globalSetting?.deduplicate || globalSetting?.deduplicate_data || null,
    rules: toArrayValue(dataProcessing?.rules),
    writeConfigDsl
  };
};

const buildUploadedFilesFromTables = (tables = []) => {
  return tables.slice(0, 2).map((table, index) => {
    const fallbackSource = index === 0 ? 'table_a' : 'table_b';
    const rawSource = pickValue(table?.sourceId, table?.source_id);
    const source = ['table_a', 'table_b'].includes(rawSource) ? rawSource : fallbackSource;
    const edmId = pickValue(table?.edmId, table?.edmID, table?.fileCode);
    const columns = toArrayValue(table?.columns);
    const fieldInfoList = toArrayValue(table?.fieldInfoList || table?.field_info_list);
    const fieldsFromColumns = columns.map((item) => pickValue(item?.name)).filter(Boolean);
    const fields = fieldsFromColumns.length > 0
      ? fieldsFromColumns
      : fieldInfoList.map((item) => pickValue(item?.fieldName, item?.field_name, item?.name)).filter(Boolean);

    return {
      id: edmId || `${source}_${index + 1}`,
      edmId,
      fileCode: edmId,
      name: pickValue(table?.sourceName, table?.source_name, source),
      size: 0,
      rows: [],
      fields,
      fieldInfoList,
      parsed: false,
      source
    };
  });
};

const parseMappingsAndConfigsFromRules = (rules = []) => {
  const mappings = {};
  const filters = {};
  const transforms = {};
  const sortConfig = { field: '', order: 'asc' };

  toArrayValue(rules).forEach((ruleItem) => {
    const ruleOutput = ruleItem?.ruleOutput || ruleItem?.rule_output || {};
    const outputField = pickValue(ruleOutput?.outputColumn, ruleOutput?.output_column);
    if (!outputField) return;

    const inputs = toArrayValue(ruleItem?.ruleInput || ruleItem?.rule_input);
    const sourceKeys = [];

    inputs.forEach((inputItem) => {
      const source = pickValue(inputItem?.sourceTable, inputItem?.source_table);
      const columns = toArrayValue(inputItem?.keyColumns || inputItem?.key_columns);
      columns.forEach((column) => {
        const col = toText(column);
        if (source && col) {
          sourceKeys.push(`${source}.${col}`);
        }
      });
    });

    if (sourceKeys.length > 0) {
      mappings[outputField] = [...new Set(sourceKeys)];
    }

    const filterParams = toParamMap(ruleItem?.filter || []);
    const filterOperator = toText(filterParams.operator).toLowerCase();
    if (filterOperator) {
      if (filterOperator === 'formula') {
        filters[outputField] = {
          mode: 'formula',
          formula: toText(filterParams.formula)
        };
      } else if (filterOperator === 'compound') {
        filters[outputField] = {
          mode: 'compound',
          logic: pickValue(filterParams.logic, 'AND') || 'AND',
          conditions: toArrayValue(filterParams.conditions).map((item) => ({
            operator: REVERSE_OPERATOR_MAP[toText(item?.operator).toLowerCase()] || toText(item?.operator),
            value: item?.value ?? ''
          }))
        };
      } else {
        filters[outputField] = {
          mode: 'simple',
          operator: REVERSE_OPERATOR_MAP[filterOperator] || filterOperator,
          value: filterParams.value ?? ''
        };
      }
    }

    const rawRule = ruleItem?.rule || {};
    const ability = pickValue(rawRule?.abilityName, rawRule?.ability_name);
    const ruleParams = toParamMap(rawRule?.params || []);

    if (ability === 'transform') {
      const transformConfig = parseTransformParamsToConfig(ruleParams);
      if (transformConfig) {
        transforms[outputField] = transformConfig;
      }
    }


    if (ability === 'if_branch') {
      const conditionExpr = toText(ruleParams.condition);
      const parsedCondition = parseConditionExpression(conditionExpr) || { operator: '', value: '' };

      const thenList = toArrayValue(ruleItem?.then);
      const thenRuleObj = (thenList[0] && typeof thenList[0] === 'object') ? thenList[0]?.rule : {};
      const thenAbility = pickValue(thenRuleObj?.abilityName, thenRuleObj?.ability_name);
      const thenParams = toParamMap(thenRuleObj?.params || []);

      if (thenAbility === 'transform') {
        const transformConfig = parseTransformParamsToConfig(thenParams);
        if (transformConfig && transformConfig.type) {
          const nextRule = {
            operator: parsedCondition.operator,
            value: parsedCondition.value,
            type: transformConfig.type,
            delimiter: transformConfig.delimiter ?? '',
            fixedValue: transformConfig.fixedValue ?? '',
            search: transformConfig.search ?? '',
            replace: transformConfig.replace ?? '',
            formula: transformConfig.formula ?? '',
            precision: transformConfig.precision ?? '',
            timeFormatMode: transformConfig.timeFormatMode ?? '',
            originType: transformConfig.originType ?? ''
          };

          if (!transforms[outputField] || !Array.isArray(transforms[outputField].rules)) {
            transforms[outputField] = { rules: [] };
          }
          transforms[outputField].rules.push(nextRule);
        }
      }
    }

    const sortParams = toParamMap(ruleItem?.sort || []);
    if (Object.keys(sortParams).length > 0) {
      sortConfig.field = outputField;
      sortConfig.order = pickValue(sortParams.directions, 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    }
  });

  return { mappings, filters, transforms, sortConfig };
};

const parseJoinConfigFromDsl = (joinDsl) => {
  const fallback = { type: 'left', fields: [{ leftField: '', rightField: '' }] };
  if (!joinDsl) return fallback;

  const inputs = toArrayValue(joinDsl?.ruleInput || joinDsl?.rule_input);
  if (inputs.length < 2) return fallback;

  const leftColumns = toArrayValue(inputs[0]?.keyColumns || inputs[0]?.key_columns).map((item) => toText(item)).filter(Boolean);
  const rightColumns = toArrayValue(inputs[1]?.keyColumns || inputs[1]?.key_columns).map((item) => toText(item)).filter(Boolean);
  const maxLength = Math.max(leftColumns.length, rightColumns.length, 1);
  const fields = Array.from({ length: maxLength }, (_, index) => ({
    leftField: leftColumns[index] || '',
    rightField: rightColumns[index] || ''
  }));

  const params = toParamMap(joinDsl?.rule?.params || []);
  const joinType = pickValue(params.join_type, 'left').toLowerCase();

  return {
    type: ['inner', 'left', 'full'].includes(joinType) ? joinType : 'left',
    fields
  };
};

const parseDedupConfigFromDsl = (deduplicateDsl) => {
  const fallback = { enabled: true, fields: [], keep: 'first' };
  if (!deduplicateDsl) return fallback;

  const input = toArrayValue(deduplicateDsl?.ruleInput || deduplicateDsl?.rule_input)[0] || {};
  const fields = toArrayValue(input?.keyColumns || input?.key_columns).map((item) => toText(item)).filter(Boolean);
  const params = toParamMap(deduplicateDsl?.rule?.params || []);
  const keep = pickValue(params.keep, 'first');

  return {
    enabled: fields.length > 0,
    fields,
    keep: keep || 'first'
  };
};

const parseWriteConfigFromDsl = (writeConfigDsl) => {
  const fallback = {
    mode: 'append',
    deduplication: false,
    dedupFields: [],
    conflictStrategy: 'keep_old'
  };
  if (!writeConfigDsl) return fallback;

  const params = toParamMap(writeConfigDsl?.rule?.params || []);
  const writeMode = pickValue(params.write_mode);
  const overwrite = params.overwrite === true;

  return {
    mode: writeMode || (overwrite ? 'replace' : 'append'),
    deduplication: !!params.deduplication,
    dedupFields: toArrayValue(params.dedup_fields || params.dedupFields).map((item) => toText(item)).filter(Boolean),
    conflictStrategy: pickValue(params.conflict_strategy, params.conflictStrategy, 'keep_old') || 'keep_old'
  };
};

const applyRuleJsonToPipeline = (ruleJson = {}) => {
  if (!ruleJson || typeof ruleJson !== 'object') return;

  const sections = readRuleJsonSections(ruleJson);
  const uploadedFiles = buildUploadedFilesFromTables(sections.tables);
  if (uploadedFiles.length > 0) {
    pipelineStore.setUploadedFiles(uploadedFiles);
  }

  const parsed = parseMappingsAndConfigsFromRules(sections.rules);
  pipelineStore.setMappings(parsed.mappings);

  const joinConfig = parseJoinConfigFromDsl(sections.joinConfig);
  pipelineStore.joinConfig.type = joinConfig.type;
  pipelineStore.joinConfig.fields = joinConfig.fields;

  Object.keys(pipelineStore.filters).forEach((key) => delete pipelineStore.filters[key]);
  Object.entries(parsed.filters).forEach(([field, config]) => {
    pipelineStore.filters[field] = { ...config };
  });

  Object.keys(pipelineStore.transforms).forEach((key) => delete pipelineStore.transforms[key]);
  Object.entries(parsed.transforms).forEach(([field, config]) => {
    pipelineStore.transforms[field] = { ...config };
  });

  pipelineStore.sortConfig.field = parsed.sortConfig.field;
  pipelineStore.sortConfig.order = parsed.sortConfig.order;

  const dedupConfig = parseDedupConfigFromDsl(sections.deduplicate);
  pipelineStore.dedupConfig.enabled = dedupConfig.enabled;
  pipelineStore.dedupConfig.fields = [...dedupConfig.fields];
  pipelineStore.dedupConfig.keep = dedupConfig.keep;

  const writeConfig = parseWriteConfigFromDsl(sections.writeConfigDsl);
  pipelineStore.writeConfig.mode = writeConfig.mode;
  pipelineStore.writeConfig.deduplication = writeConfig.deduplication;
  pipelineStore.writeConfig.dedupFields = [...writeConfig.dedupFields];
  pipelineStore.writeConfig.conflictStrategy = writeConfig.conflictStrategy;
};
const loadProjectModels = async () => {
  try {
    const projectCode = resolveCurrentProjectCode();
    const response = await projectModelsApi.list({ modelType: 'business', ...(projectCode ? { projectCode } : {}) });
    const list = unwrapApiList(response);
    modelStore.setProjectModels(list.map((item) => normalizeProjectModel(item, appStore.currentProject, projectCode)));
  } catch {
    modelStore.setProjectModels([]);
  }
};

const loadProjectModelDetail = async (modelCodeOrId) => {
  const target = modelStore.getProjectModelById(modelCodeOrId);
  if (!target) return null;

  const code = resolveModelCode(target) || String(modelCodeOrId || '').trim();
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
    modelStore.upsertProjectModelLocal(merged);
    return merged;
  } catch {
    return target;
  }
};

const loadRules = async () => {
  ruleStore.setLoading(true);
  try {
    const response = await rulesApi.list({ pageNum: 1, pageSize: 200 });
    const list = unwrapApiList(response);
    if (list.length > 0) {
      ruleStore.setRules(list.map((item) => mapApiRuleToEntity(item, appStore.currentProject)));
    }
  } catch {
    // 无后端时保留本地状态。
  } finally {
    ruleStore.setLoading(false);
  }
};

const resolveRuleInputTablesForSave = () => {
  if (pipelineStore.uploadedFiles.length > 0) {
    return RULE_INPUT_TABLES
      .slice(0, Math.min(pipelineStore.uploadedFiles.length, 2))
      .map((table) => ({ ...table }));
  }
  return [{ ...RULE_INPUT_TABLES[0] }];
};

const setForm = (rule) => {
  form.id = rule?.id || null;
  form.name = rule?.name || '';
  form.description = rule?.description || '';
  form.status = rule?.status || 'draft';
  form.targetModel = rule?.targetModel || '';
  form.projectId = rule?.projectId || appStore.currentProject;
  persistedRuleId.value = toText(rule?.ruleCode || rule?.id);
};

const resolveSelectedModel = () => {
  return publishedProjectModels.value.find((item) => String(item.id) === String(pipelineStore.selectedModelId)) || null;
};

const onSelectModel = async (modelId) => {
  pipelineStore.setModel(modelId);
  await loadProjectModelDetail(modelId);
};

onMounted(async () => {
  appStore.setRole('designer');
  await loadProjectModels();
  await loadRules();

  pipelineStore.resetPipeline();

  if (isEdit.value) {
    const targetRule = ruleStore.getRuleById(route.params.id);
    setForm(targetRule);
    if (!persistedRuleId.value) {
      persistedRuleId.value = toText(route.params.id);
    }

    const model = publishedProjectModels.value.find((item) => {
      const modelCode = String(item.modelCode || item.code || '').trim();
      const modelName = String(item.name || '').trim();
      return modelCode === String(form.targetModel).trim() || modelName === String(form.targetModel).trim();
    });
    if (model) {
      await onSelectModel(model.id);
    }

    applyRuleJsonToPipeline(targetRule?.ruleJson || {});
    return;
  }

  setForm(null);
  persistedRuleId.value = '';
});

watch(
  () => pipelineStore.currentStep,
  (step) => {
    if (Number(step) === 2) {
      scheduleSqlDebug();
      return;
    }

    clearSqlDebugTimer();
  }
);

onUnmounted(() => {
  clearSqlDebugTimer();
  sqlDebugRequestSeq.value += 1;
});

const inferSampleType = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'double';

  const text = toText(value);
  if (!text) return '';
  if (!Number.isNaN(Number(text))) {
    return text.includes('.') ? 'double' : 'integer';
  }
  if (!Number.isNaN(Date.parse(text))) {
    return 'datetime';
  }
  return 'string';
};

const buildAutoMapPayload = () => {
  const modelFields = (pipelineStore.targetFields || [])
    .map((field) => ({
      fieldName: toText(field?.name),
      fieldType: toText(field?.type),
      fieldDesc: toText(field?.description)
    }))
    .filter((field) => field.fieldName);

  const sourceMetaByKey = {};
  (pipelineStore.uploadedFiles || []).forEach((file) => {
    const sourceTable = toText(file?.source);
    if (!sourceTable) return;

    const sampleRow = Array.isArray(file?.rows) && file.rows.length > 0 ? file.rows[0] : {};
    (file?.fields || []).forEach((fieldName) => {
      const normalizedField = toText(fieldName);
      if (!normalizedField) return;

      const key = `${sourceTable}.${normalizedField}`;
      const sampleValueRaw = sampleRow?.[normalizedField];
      sourceMetaByKey[key] = {
        fieldType: inferSampleType(sampleValueRaw),
        sampleValue: sampleValueRaw === null || sampleValueRaw === undefined ? '' : String(sampleValueRaw)
      };
    });
  });

  const sourceFields = (pipelineStore.sourceFields || [])
    .map((source) => {
      const fieldKey = toText(source?.key);
      if (!fieldKey) return null;
      const meta = sourceMetaByKey[fieldKey] || {};
      return {
        fieldKey,
        fieldName: toText(source?.name),
        sourceTable: toText(source?.source),
        fieldType: toText(meta.fieldType),
        sampleValue: toText(meta.sampleValue)
      };
    })
    .filter((field) => field && field.fieldKey && field.fieldName && field.sourceTable);

  return {
    modelFields,
    sourceFields
  };
};

const normalizeAutoMappings = (rawMappings = {}) => {
  const mappingObject = rawMappings && typeof rawMappings === 'object' ? rawMappings : {};
  const validTargets = new Set((pipelineStore.targetFields || []).map((field) => toText(field?.name)).filter(Boolean));
  const validSources = new Set((pipelineStore.sourceFields || []).map((field) => toText(field?.key)).filter(Boolean));
  const normalized = {};

  (pipelineStore.targetFields || []).forEach((field) => {
    const targetName = toText(field?.name);
    if (!targetName || !validTargets.has(targetName)) return;

    const rawValue = mappingObject[targetName];
    const sourceList = Array.isArray(rawValue) ? rawValue : (rawValue ? [rawValue] : []);
    const filtered = [...new Set(sourceList.map((item) => toText(item)).filter((item) => validSources.has(item)))];

    if (filtered.length > 0) {
      normalized[targetName] = filtered;
    }
  });

  return normalized;
};

const autoMap = async () => {
  if (autoMapping.value) return;

  const ready = await parseUploadedFilesForMapping();
  if (!ready) return;

  const payload = buildAutoMapPayload();
  if (payload.modelFields.length === 0) {
    $warning('目标模型字段为空，无法自动匹配');
    return;
  }
  if (payload.sourceFields.length === 0) {
    $warning('请先上传并解析数据字段');
    return;
  }

  autoMapping.value = true;

  try {
    const response = await apiSystemService.autoMapFields(payload, { hideMsgTips: true });
    const rawMappings = response?.data?.mappings ?? response?.data ?? {};
    const nextMappings = normalizeAutoMappings(rawMappings);
    pipelineStore.setMappings(nextMappings);

    if (Object.keys(nextMappings).length === 0) {
      $warning('自动匹配未命中可用字段，请手动调整');
      return;
    }

    $success('自动匹配完成');
  } catch (error) {
    const message = toText(error?.response?.data?.msg || error?.data?.msg || error?.message);
    $error(message || '自动匹配失败');
  } finally {
    autoMapping.value = false;
  }
};

const parseUploadedFilesForMapping = async () => {
  const files = Array.isArray(pipelineStore.uploadedFiles) ? pipelineStore.uploadedFiles : [];
  if (files.length === 0) return true;

  const needsParse = files.some((file) => !file?.parsed);
  if (!needsParse) return true;

  parsingForStep.value = true;

  try {
    const parsedFiles = await Promise.all(files.map(async (file) => {
      if (file?.parsed) {
        return { ...file };
      }

      const edmId = resolveEdmId(file);
      if (!edmId) {
        throw new Error(`文件 ${file?.name || ''} 缺少 edmid`);
      }

      const parsedList = await parseEdmFile(edmId);
      const dataSet = findParsedDataSet(parsedList, edmId);
      const fieldInfoList = extractFieldInfoList(parsedList, edmId);
      const rows = normalizeObjectRows(dataSet);
      const fields = extractFieldsFromRows(rows);

      return {
        ...file,
        edmId,
        rows,
        fields,
        fieldInfoList,
        parsed: true
      };
    }));

    // Keep restored mapping/join/process configs when only enriching file parse results.
    pipelineStore.uploadedFiles = parsedFiles;
    return true;
  } catch (error) {
    $error(`文件解析失败：${error?.message || '未知错误'}`);
    return false;
  } finally {
    parsingForStep.value = false;
  }
};

const goNextStep = async () => {
  if (!pipelineStore.canProceed || parsingForStep.value) return;

  if (pipelineStore.currentStep === 0) {
    const ready = await parseUploadedFilesForMapping();
    if (!ready) return;
  }

  pipelineStore.nextStep();
};

const buildCurrentDsl = (selectedModel) => {
  return buildPipelineDsl({
    ruleName: form.name || selectedModel.name,
    projectId: appStore.currentProject,
    selectedModel,
    uploadedFiles: pipelineStore.uploadedFiles,
    mappings: pipelineStore.mappings,
    joinConfig: pipelineStore.joinConfig,
    filters: pipelineStore.filters,
    transforms: pipelineStore.transforms,
    sortConfig: pipelineStore.sortConfig,
    dedupConfig: pipelineStore.dedupConfig,
    writeConfig: pipelineStore.writeConfig
  });
};

const clearSqlDebugTimer = () => {
  if (sqlDebugTimer.value) {
    window.clearTimeout(sqlDebugTimer.value);
    sqlDebugTimer.value = null;
  }
};

const runSqlDebug = async () => {
  if (Number(pipelineStore.currentStep) !== 2) return;

  const selectedModel = resolveSelectedModel();
  if (!selectedModel) {
    sqlDebugRows.value = [];
    return;
  }

  if (toArrayValue(pipelineStore.uploadedFiles).length === 0) {
    sqlDebugRows.value = [];
    return;
  }

  const dsl = buildCurrentDsl(selectedModel);
  const edmList = buildDebugEdmList(dsl);
  if (edmList.length === 0) {
    sqlDebugRows.value = [];
    return;
  }

  const requestSeq = sqlDebugRequestSeq.value + 1;
  sqlDebugRequestSeq.value = requestSeq;

  try {
    const { saveResponse } = await saveRuleEntity({ status: form.status || 'draft', dsl });
    const sqlList = extractSqlListFromSaveResponse(saveResponse);
    if (sqlList.length === 0) {
      throw new Error('保存规则后未返回可调试的 SQL 列表');
    }

    const debugResponse = await rulesApi.debugSql({
      sqlList,
      edmList
    });

    if (requestSeq !== sqlDebugRequestSeq.value) {
      return;
    }

    sqlDebugRows.value = extractDebugResultRows(debugResponse);
  } catch {
    if (requestSeq !== sqlDebugRequestSeq.value) {
      return;
    }

    sqlDebugRows.value = [];
  }
};

const scheduleSqlDebug = () => {
  if (Number(pipelineStore.currentStep) !== 2) return;
  clearSqlDebugTimer();
  sqlDebugTimer.value = window.setTimeout(() => {
    runSqlDebug();
  }, 400);
};

const handleProcessOperationApplied = () => {
  scheduleSqlDebug();
};

const saveRuleEntity = async ({ status = 'draft', dsl = null } = {}) => {
  if (!form.name.trim()) {
    throw createValidationError('请输入规则名称');
  }

  const selectedModel = resolveSelectedModel();
  if (!selectedModel) {
    throw createValidationError('请先选择已发布的数据模型');
  }

  const nextDsl = dsl || buildCurrentDsl(selectedModel);
  let saved = ruleStore.upsertRuleLocal({
    ...JSON.parse(JSON.stringify(form)),
    id: form.id,
    ruleId: form.id,
    status,
    targetModel: selectedModel.modelCode || selectedModel.name,
    inputTables: resolveRuleInputTablesForSave(),
    uploadedFiles: pipelineStore.uploadedFiles,
    projectId: appStore.currentProject,
    ruleJson: nextDsl,
    dsl: nextDsl
  });

  let saveResponse = null;
  try {
    saveResponse = await rulesApi.save(toSaveRulePayload(saved, {
      ...JSON.parse(JSON.stringify(form)),
      ruleId: resolvePersistedRuleIdForSave(),
      status,
      targetModel: selectedModel.modelCode || selectedModel.name,
      inputTables: resolveRuleInputTablesForSave(),
      uploadedFiles: pipelineStore.uploadedFiles,
      projectId: appStore.currentProject,
      ruleJson: nextDsl,
      dsl: nextDsl
    }));

    const backendRuleId = extractRuleIdFromSaveResponse(saveResponse);
    if (backendRuleId) {
      persistedRuleId.value = backendRuleId;
      if (String(saved.id) !== backendRuleId || String(saved.ruleCode) !== backendRuleId) {
        ruleStore.removeRuleById(saved.id);
        saved = ruleStore.upsertRuleLocal({
          ...saved,
          id: backendRuleId,
          ruleCode: backendRuleId
        });
      }
    }
  } catch {
    // 无后端时忽略错误。
  }

  form.id = persistedRuleId.value || saved.id;
  form.status = saved.status;
  form.targetModel = saved.targetModel;

  return { saved, selectedModel, saveResponse };
};

const saveRule = async () => {
  try {
    await saveRuleEntity({ status: 'draft' });
    $success('规则保存成功');
    router.push('/designer/rules');
  } catch (error) {
    if (error?.isValidationError) {
      $warning(error?.message || '请完善规则配置');
      return;
    }
    $error(error?.message || '规则保存失败');
  }
};

const executeJob = async () => {
  const selectedModel = resolveSelectedModel();
  if (!selectedModel) {
    $warning('请先选择已发布的数据模型');
    return;
  }

  const dsl = buildCurrentDsl(selectedModel);

  let publishError = '';
  let published = false;
  let publishValidationError = false;

  try {
    const { saved } = await saveRuleEntity({ status: 'draft', dsl });
    const ruleCode = String(saved.ruleCode || saved.id || '').trim();
    await rulesApi.publish({ ruleCode });
    const target = ruleStore.getRuleById(ruleCode) || ruleStore.getRuleById(saved.id);
    if (target) {
      ruleStore.upsertRuleLocal({ ...target, status: 'active', updateTime: nowText() });
    }
    form.status = 'active';
    published = true;
  } catch (error) {
    publishError = error?.message || '发布失败';
    publishValidationError = !!error?.isValidationError;
  }

  pipelineStore.markExecuted();

  if (published) {
    $success('规则发布成功');
  } else {
    if (publishValidationError) {
      $warning(publishError || '请完善规则配置');
    } else {
      $error(`规则发布失败：${publishError}`);
    }
  }
};
</script>
