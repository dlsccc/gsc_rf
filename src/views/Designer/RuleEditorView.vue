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
                        <th>是否维度</th>
                        <th>说明</th>
                        <th>样例值</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="field in targetModelPreviewFields" :key="field.name">
                        <td>{{ field.name }}</td>
                        <td><span class="tag" :class="field.type === 'STRING' ? 'tag-primary' : 'tag-warning'">{{ field.type }}</span></td>
                        <td>{{ field.isDimension ? '是' : '否' }}</td>
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
                <button class="btn btn-default btn-sm" @click="autoMap">
                  <span class="material-icons" style="font-size: 16px; vertical-align: middle;">auto_fix_high</span>
                  自动匹配
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
              <ProcessPanel :store="pipelineStore" />
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
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { projectModelsApi, rulesApi } from '@/api/index.js';
import { nowText } from '@/utils/date.js';
import { buildPipelineDsl } from '@/utils/pipeline-dsl.js';
import { extractFieldsFromRows, findParsedDataSet, normalizeObjectRows, parseEdmFile, resolveEdmId } from '@/utils/fileUtils.js';
import { useAppStore } from '@/store/app.store.js';
import { normalizeProjectModel, resolveModelCode, unwrapApiData, unwrapApiList, useModelStore } from '@/store/model.store.js';
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
    isDimension: !!field.isDimension,
    description: field.description,
    sampleValue: field.sampleValue || field.example || ''
  }));
});

const resolveCurrentProjectCode = () => {
  return String(appStore.currentProjectCode || appStore.currentProject || '').trim();
};

const toText = (value) => String(value ?? '').trim();

const resolvePersistedRuleIdForSave = () => {
  return toText(persistedRuleId.value);
};

const extractRuleIdFromSaveResponse = (saveResponse) => {
  const data = saveResponse?.data ?? saveResponse?.result ?? saveResponse ?? {};
  const candidates = [
    saveResponse?.ruleId,
    saveResponse?.id,
    data?.ruleId,
    data?.id,
    data?.ruleCode,
    saveResponse?.ruleCode
  ];

  for (const item of candidates) {
    const value = toText(item);
    if (value) return value;
  }

  return '';
};

const toArrayValue = (value) => (Array.isArray(value) ? value : []);

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
  set_value: 'set_value',
  concat: 'concat',
  replace: 'replace',
  formula: 'formula'
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
    const source = pickValue(table?.sourceId, table?.source_id, index === 0 ? 'table_a' : 'table_b');
    const edmId = pickValue(table?.edmId, table?.edmID, table?.fileCode);
    const fields = toArrayValue(table?.columns).map((item) => pickValue(item?.name)).filter(Boolean);

    return {
      id: edmId || `${source}_${index + 1}`,
      edmId,
      fileCode: edmId,
      name: pickValue(table?.sourceName, table?.source_name, source),
      size: 0,
      rows: [],
      fields,
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
      const transformType = pickValue(ruleParams.transform_type).toLowerCase();
      if (transformType === 'chain') {
        transforms[outputField] = {
          chain: toArrayValue(ruleParams.steps).map((step) => ({
            type: REVERSE_TRANSFORM_TYPE_MAP[toText(step?.transform_type).toLowerCase()] || toText(step?.transform_type),
            delimiter: step?.delimiter ?? '',
            fixedValue: step?.value ?? '',
            search: step?.search_value ?? '',
            replace: step?.replace_value ?? '',
            formula: step?.formula ?? ''
          }))
        };
      } else if (transformType) {
        transforms[outputField] = {
          type: REVERSE_TRANSFORM_TYPE_MAP[transformType] || transformType,
          delimiter: ruleParams.delimiter ?? '',
          fixedValue: ruleParams.value ?? '',
          search: ruleParams.search_value ?? '',
          replace: ruleParams.replace_value ?? '',
          formula: ruleParams.formula ?? '',
          inputFormat: ruleParams.input_format ?? '',
          outputFormat: ruleParams.output_format ?? ''
        };
      }
    }

    if (ability === 'conditional_transform') {
      transforms[outputField] = {
        rules: toArrayValue(ruleParams.rules).map((item) => ({
          operator: REVERSE_OPERATOR_MAP[toText(item?.operator).toLowerCase()] || toText(item?.operator),
          value: item?.value ?? '',
          type: REVERSE_TRANSFORM_TYPE_MAP[toText(item?.transform_type).toLowerCase()] || toText(item?.transform_type),
          delimiter: item?.delimiter ?? '',
          fixedValue: item?.fixed_value ?? '',
          search: item?.search_value ?? '',
          replace: item?.replace_value ?? '',
          formula: item?.formula ?? ''
        }))
      };
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

const autoMap = () => {
  const nextMappings = {};
  pipelineStore.targetFields.forEach((field) => {
    const found = pipelineStore.sourceFields.find((source) => source.name.toLowerCase() === field.name.toLowerCase());
    if (found) {
      nextMappings[field.name] = [found.key];
    }
  });
  pipelineStore.setMappings(nextMappings);
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
      const rows = normalizeObjectRows(dataSet);
      const fields = extractFieldsFromRows(rows);

      return {
        ...file,
        edmId,
        rows,
        fields,
        parsed: true
      };
    }));

    pipelineStore.setUploadedFiles(parsedFiles);
    return true;
  } catch (error) {
    window.alert(`文件解析失败：${error?.message || '未知错误'}`);
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

const saveRuleEntity = async ({ status = 'draft', dsl = null } = {}) => {
  if (!form.name.trim()) {
    throw new Error('请输入规则名称');
  }

  const selectedModel = resolveSelectedModel();
  if (!selectedModel) {
    throw new Error('请先选择已发布的数据模型');
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

  try {
    const saveResponse = await rulesApi.save(toSaveRulePayload(saved, {
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

  return { saved, selectedModel };
};

const saveRule = async () => {
  try {
    await saveRuleEntity({ status: 'draft' });
    window.alert('规则保存成功');
    router.push('/designer/rules');
  } catch (error) {
    window.alert(error?.message || '规则保存失败');
  }
};

const executeJob = async () => {
  const selectedModel = resolveSelectedModel();
  if (!selectedModel) {
    window.alert('请先选择已发布的数据模型');
    return;
  }

  const dsl = buildCurrentDsl(selectedModel);

  let publishError = '';
  let published = false;

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
  }

  pipelineStore.markExecuted();

  if (published) {
    window.alert('规则发布成功');
  } else {
    window.alert(`规则发布失败：${publishError}`);
  }
};
</script>

