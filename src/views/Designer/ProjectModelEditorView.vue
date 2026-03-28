<template>
  <div class="model-edit-container" style="margin-top: 64px; background: linear-gradient(135deg, #e6f7ff 0%, #fafafa 100%);">
    <div class="model-edit-header">
      <div class="back-btn" @click="router.push('/designer/project-models')"><span class="material-icons">arrow_back</span></div>
      <div class="model-edit-title">{{ isEdit ? '编辑数据模型' : '新建数据模型' }}</div>
    </div>

    <div class="model-form-section">
      <div class="section-title"><span class="material-icons">info</span>基本信息</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label"><span class="material-icons">link</span>引用标准数据模型 *</label>
          <select v-model="form.refStandardModel" class="form-select" @change="onRefModelChange">
            <option value="">请选择标准数据模型</option>
            <option v-for="model in modelStore.standardModels" :key="model.id" :value="model.modelCode || model.code || model.id">{{ model.name }}</option>
          </select>
          <div class="form-hint">选择引用的标准数据模型，将自动继承其字段定义</div>
        </div>
        <div class="form-group">
          <label class="form-label"><span class="material-icons">table_chart</span>模型名称 *</label>
          <input v-model="form.name" class="form-input" type="text" placeholder="请输入模型名称" />
          <div class="form-hint">模型名称使用大写字母和下划线</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label"><span class="material-icons">label</span>模型描述</label>
          <input v-model="form.description" class="form-input" type="text" placeholder="请输入模型描述" />
        </div>
      </div>
    </div>

    <div class="model-form-section">
      <div class="section-title"><span class="material-icons">local_offer</span>模型标签</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label"><span class="material-icons">business</span>厂商</label>
          <select v-model="form.tags.vendor" class="form-select">
            <option value="">请选择厂商</option>
            <option v-for="opt in vendorOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label"><span class="material-icons">settings_input_antenna</span>制式</label>
          <select v-model="form.tags.standard" class="form-select">
            <option value="">请选择制式</option>
            <option v-for="opt in standardOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label"><span class="material-icons">schedule</span>时间粒度</label>
          <select v-model="form.tags.timeGranularity" class="form-select">
            <option value="">请选择时间粒度</option>
            <option v-for="opt in timeGranularityOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label"><span class="material-icons">category</span>类型</label>
          <select v-model="form.tags.type" class="form-select">
            <option value="">请选择类型</option>
            <option v-for="opt in typeOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="model-form-section">
      <div class="section-title">
        <span class="material-icons">view_column</span>
        字段定义
        <span style="font-size: 12px; color: var(--text-secondary); font-weight: normal; margin-left: 8px;">（基于引用的标准模型，可修改）</span>
      </div>
      <div class="field-table-container">
        <table class="field-table">
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th style="width: 180px;">字段名称 *</th>
              <th style="width: 140px;">字段类型 *</th>
              <th style="width: 140px;">数据格式</th>
              <th style="width: 120px;">业务类型</th>
              <th>业务描述</th>
              <th style="width: 120px;">样例值</th>
              <th style="width: 80px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(field, index) in form.fields" :key="index">
              <td class="field-index">{{ index + 1 }}</td>
              <td><input v-model="field.name" class="field-input" type="text" placeholder="字段名称" /></td>
              <td>
                <select v-model="field.type" class="field-select" @change="onFieldTypeChange(field)">
                  <option value="">请选择</option>
                  <option value="STRING">STRING</option>
                  <option value="INT64">INT64</option>
                  <option value="FLOAT64">FLOAT64</option>
                </select>
              </td>
              <td>
                <select v-model="field.format" class="field-select">
                  <option v-for="opt in getFormatOptions(field.type)" :key="opt.value || 'none'" :value="opt.value">{{ opt.label }}</option>
                </select>
              </td>
              <td>
                <select v-model="field.businessType" class="field-select">
                  <option v-for="type in businessTypeOptions" :key="type.value" :value="type.value">{{ type.label }}</option>
                </select>
              </td>
              <td><input v-model="field.description" class="field-input" type="text" placeholder="业务含义描述" /></td>
              <td><input v-model="field.example" class="field-input" type="text" placeholder="样例" /></td>
              <td class="field-actions">
                <button class="field-action-btn move" :disabled="index === 0" title="上移" @click="moveFieldUp(index)">
                  <span class="material-icons" style="font-size: 16px;">arrow_upward</span>
                </button>
                <button class="field-action-btn move" :disabled="index === form.fields.length - 1" title="下移" @click="moveFieldDown(index)">
                  <span class="material-icons" style="font-size: 16px;">arrow_downward</span>
                </button>
                <button class="field-action-btn" title="删除" @click="removeField(index)">
                  <span class="material-icons" style="font-size: 16px;">delete</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button class="btn btn-default" style="margin-top: 16px;" @click="addField">
        <span class="material-icons" style="font-size: 18px;">add</span>
        添加字段
      </button>
    </div>

    <div class="model-edit-actions">
      <button class="btn btn-default" @click="router.push('/designer/project-models')">取消</button>
      <button class="btn btn-default" @click="triggerImportModel">
        <span class="material-icons" style="font-size: 18px;">upload_file</span>
        Import Model
      </button>
      <button class="btn btn-default" @click="saveProjectModel">
        <span class="material-icons" style="font-size: 18px;">save</span>
        保存模型
      </button>
      <button class="btn btn-primary" @click="publishProjectModel">
        <span class="material-icons" style="font-size: 18px;">publish</span>
        发布模型
      </button>
      <button class="btn btn-default" @click="exportProjectModel">
        <span class="material-icons" style="font-size: 18px;">download</span>
        Export Model
      </button>
    </div>
    <input ref="importInputRef" type="file" style="display: none;" @change="onImportModelFileChange" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { projectModelsApi, standardModelsApi } from '@/api/index.js';
import { nowText } from '@/utils/date.js';
import { createId } from '@/utils/id.js';
import { $error, $success, $warning } from '@/utils/message.js';
import { useAppStore } from '@/store/app.store.js';
import { downloadFile } from '@/utils/fileUtils.js';
import { normalizeProjectModel, normalizeStandardModel, resolveModelCode, toModelSavePayload, unwrapApiData, unwrapApiList, useModelStore } from '@/store/model.store.js';

const vendorOptions = ['华为', '中兴', '其他'];
const standardOptions = ['4G', '5G'];
const timeGranularityOptions = ['小时级', '天级'];
const typeOptions = ['Counter', 'KPI', '工参', '配置', '其他'];
const businessTypeOptions = [
  { value: 'time', label: '时间' },
  { value: 'space', label: '空间' },
  { value: 'metric', label: '指标' }
];


const FIELD_FORMAT_OPTIONS = {
  STRING: [
    { value: '', label: '-' },
    { value: 'YYYY', label: 'YYYY' },
    { value: 'YYYY-MM', label: 'YYYY-MM' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
    { value: 'YYYY-MM-DD hh:mm:ss', label: 'YYYY-MM-DD hh:mm:ss' },
    { value: 'hh:mm:ss', label: 'hh:mm:ss' },
    { value: '\u767e\u5206\u6570', label: '\u767e\u5206\u6570' }
  ],
  INT64: [
    { value: '', label: '-' },
    { value: '\u661f\u671f\u51e0', label: '\u661f\u671f\u51e0' },
    { value: '\u7b2c\u51e0\u5468', label: '\u7b2c\u51e0\u5468' }
  ],
  FLOAT64: [
    { value: '', label: '-' }
  ]
};

const getFormatOptions = (fieldType) => {
  return FIELD_FORMAT_OPTIONS[fieldType] || [{ value: '', label: '-' }];
};

const onFieldTypeChange = (field) => {
  const options = getFormatOptions(field?.type);
  const allowedValues = options.map((opt) => opt.value);
  if (!allowedValues.includes(field?.format)) {
    field.format = '';
  }
};

const normalizeFieldType = (type) => {
  const text = String(type ?? '').trim().toUpperCase();
  if (!text) return '';
  if (text === 'INT64') return 'INT64';
  if (text === 'FLOAT64') return 'FLOAT64';
  if (['INT', 'INTEGER', 'BIGINT', 'INT32'].includes(text)) return 'INT64';
  if (['FLOAT', 'DOUBLE', 'DECIMAL', 'NUMBER'].includes(text)) return 'FLOAT64';
  if (['STRING', 'TEXT', 'VARCHAR', 'CHAR', 'DATE', 'DATETIME', 'TIMESTAMP', 'BOOLEAN'].includes(text)) return 'STRING';
  return '';
};

const normalizeFieldFormat = (fieldType, format) => {
  const options = getFormatOptions(fieldType);
  const raw = String(format ?? '').trim();
  if (!raw) return '';

  const aliasMap = {
    PERCENT: '\u767e\u5206\u6570',
    WEEKDAY: '\u661f\u671f\u51e0',
    WEEK_OF_YEAR: '\u7b2c\u51e0\u5468'
  };

  const next = aliasMap[raw] || aliasMap[raw.toUpperCase()] || raw;
  return options.some((opt) => opt.value === next) ? next : '';
};

const normalizeFieldRows = (fields = []) => {
  const list = (Array.isArray(fields) ? fields : []).map((field = {}) => {
    const nextType = normalizeFieldType(field.type);
    return {
      ...field,
      type: nextType,
      format: normalizeFieldFormat(nextType, field.format)
    };
  });

  return list.length > 0 ? list : [emptyField()];
};

const emptyField = () => ({ name: '', type: '', format: '', businessType: 'metric', description: '', example: '' });
const emptyModel = () => ({
  id: '',
  code: '',
  modelCode: '',
  name: '',
  description: '',
  status: 'draft',
  refStandardModel: '',
  tags: { vendor: '', standard: '', timeGranularity: '', type: '' },
  projectId: null,
  fields: [emptyField()]
});

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();

const editId = computed(() => route.params.id || '');
const isEdit = computed(() => !!editId.value);

const form = reactive(emptyModel());
const importInputRef = ref(null);

const resolveCurrentProjectCode = () => {
  return String(appStore.currentProjectCode || appStore.currentProject || '').trim();
};

const toText = (value) => String(value ?? '').trim();

const loadStandardModels = async () => {
  try {
    const response = await standardModelsApi.list({ modelType: 'base' });
    const list = unwrapApiList(response);
    if (list.length > 0) {
      modelStore.setStandardModels(list.map((item) => normalizeStandardModel(item)));
    }
  } catch {
    // 无后端时保留本地状态。
  }
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

const loadStandardModelDetail = async (modelCodeOrId) => {
  const target = modelStore.getStandardModelById(modelCodeOrId);
  if (!target) return null;

  const code = resolveModelCode(target) || String(modelCodeOrId || '').trim();
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
    modelStore.upsertStandardModelLocal(merged);
    return merged;
  } catch {
    return target;
  }
};

const resolveStandardModel = (value) => {
  const key = String(value ?? '').trim();
  if (!key) return null;

  return modelStore.standardModels.find((item) => {
    const id = String(item.id ?? '').trim();
    const code = String(item.code || item.modelCode || '').trim();
    const name = String(item.name || '').trim();
    return key === id || key === code || key === name;
  }) || null;
};

const fillForm = (data) => {
  const source = data ? JSON.parse(JSON.stringify(data)) : emptyModel();
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, source);

  if (!form.tags) {
    form.tags = { vendor: '', standard: '', timeGranularity: '', type: '' };
  }
  if (!Array.isArray(form.fields) || form.fields.length === 0) {
    form.fields = [emptyField()];
  }
  form.fields = normalizeFieldRows(form.fields);

  const refModel = resolveStandardModel(form.refStandardModel);
  if (refModel) {
    form.refStandardModel = refModel.modelCode || refModel.code || refModel.id;
  }
};

onMounted(async () => {
  appStore.setRole('designer');
  await loadStandardModels();
  await loadProjectModels();

  if (isEdit.value) {
    fillForm(modelStore.getProjectModelById(editId.value));
    return;
  }
  fillForm(null);
});

const onRefModelChange = async () => {
  if (!form.refStandardModel) return;

  const detail = await loadStandardModelDetail(form.refStandardModel);
  if (!detail) return;

  form.refStandardModel = detail.modelCode || detail.code || form.refStandardModel;
  form.fields = normalizeFieldRows(JSON.parse(JSON.stringify(detail.fields || [])));

  if (!Array.isArray(form.fields) || form.fields.length === 0) {
    form.fields = [emptyField()];
  }
};

const addField = () => {
  form.fields.push(emptyField());
};

const removeField = (index) => {
  if (form.fields.length <= 1) return;
  form.fields.splice(index, 1);
};

const moveFieldUp = (index) => {
  if (index <= 0) return;
  const temp = form.fields[index];
  form.fields[index] = form.fields[index - 1];
  form.fields[index - 1] = temp;
};

const moveFieldDown = (index) => {
  if (index >= form.fields.length - 1) return;
  const temp = form.fields[index];
  form.fields[index] = form.fields[index + 1];
  form.fields[index + 1] = temp;
};

const validateBase = () => {
  if (!form.name?.trim()) {
    $warning('请输入模型名称');
    return false;
  }
  if (!form.refStandardModel) {
    $warning('请选择引用标准数据模型');
    return false;
  }
  if (!Array.isArray(form.fields) || form.fields.length === 0 || !form.fields.some((item) => item.name?.trim())) {
    $warning('请至少配置一个字段');
    return false;
  }
  return true;
};

const isValidModelCode = (value) => {
  const code = toText(value);
  if (!code) return false;
  if (code === '0' || code === '1') return false;
  return /[a-zA-Z]/.test(code);
};

const extractModelCodeFromSaveResponse = (response) => {
  const body = response?.data ?? response?.result ?? response ?? {};
  const candidates = [
    body?.modelCode,
    body?.data?.modelCode,
    body?.modelCodeList?.[0],
    response?.modelCode
  ];

  for (const item of candidates) {
    const modelCode = toText(item);
    if (isValidModelCode(modelCode)) {
      return modelCode;
    }
  }

  return '';
};

const buildLocalEntity = (status, projectCode) => {
  return modelStore.upsertProjectModelLocal(normalizeProjectModel({
    ...JSON.parse(JSON.stringify(form)),
    ...(isEdit.value ? { code: form.code || form.modelCode || form.id } : {}),
    id: form.id || form.code || form.modelCode || createId(),
    status,
    projectId: appStore.currentProject,
    projectCode,
    updateTime: nowText()
  }, appStore.currentProject, projectCode));
};

const syncEntityWithModelCode = (entity, modelCode, status, projectCode) => {
  if (!isValidModelCode(modelCode)) {
    return modelStore.upsertProjectModelLocal(normalizeProjectModel({
      ...entity,
      status,
      projectCode,
      updateTime: nowText()
    }, appStore.currentProject, projectCode));
  }

  const nextEntity = normalizeProjectModel({
    ...entity,
    id: modelCode,
    code: modelCode,
    modelCode,
    status,
    projectCode,
    updateTime: nowText()
  }, appStore.currentProject, projectCode);

  if (String(entity.id) !== String(modelCode)) {
    modelStore.removeProjectModelById(entity.id);
  }

  return modelStore.upsertProjectModelLocal(nextEntity);
};

const queryModelCodeByName = async (modelName, projectCode) => {
  const name = toText(modelName);
  if (!name) return '';

  try {
    const response = await projectModelsApi.list({ modelType: 'business', modelName: name, ...(projectCode ? { projectCode } : {}) });
    const list = unwrapApiList(response);
    const exact = list.find((item) => toText(item.modelName || item.name) === name) || list[0];
    const modelCode = toText(resolveModelCode(exact || {}));
    return isValidModelCode(modelCode) ? modelCode : '';
  } catch {
    return '';
  }
};

const persistModel = async (status) => {
  if (!validateBase()) return null;

  if (status === 'active') {
    const invalid = form.fields.filter((field) => !field.name?.trim() || !field.type?.trim());
    if (invalid.length > 0) {
      $warning('Please complete field name and field type before publish.');
      return null;
    }
  }

  const projectCode = resolveCurrentProjectCode();
  const saveStatus = status === 'active' ? 'draft' : status;
  let entity = buildLocalEntity(saveStatus, projectCode);

  let saveResponse = null;
  try {
    saveResponse = await projectModelsApi.save(toModelSavePayload({
      entity,
      modelType: 'business',
      projectCode: entity.projectCode || projectCode
    }));
  } catch {
    // Ignore backend save failure in local-only mode.
  }

  const localCode = toText(resolveModelCode(entity));
  const responseCode = extractModelCodeFromSaveResponse(saveResponse);
  const queriedCode = (!isValidModelCode(localCode) && !isValidModelCode(responseCode))
    ? await queryModelCodeByName(entity.name, projectCode)
    : '';
  const finalModelCode = isValidModelCode(localCode)
    ? localCode
    : (isValidModelCode(responseCode) ? responseCode : queriedCode);

  entity = syncEntityWithModelCode(entity, finalModelCode, saveStatus, projectCode);

  form.id = entity.id || form.id;
  form.code = entity.code || form.code;
  form.modelCode = entity.modelCode || form.modelCode;

  return {
    entity,
    modelCode: toText(resolveModelCode(entity)),
    projectCode
  };
};

const triggerImportModel = () => {
  importInputRef.value?.click();
};

const onImportModelFileChange = async (event) => {
  const target = event?.target;
  const file = target?.files?.[0];
  if (target) target.value = '';
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await projectModelsApi.importModel(formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const imported = unwrapApiData(response);
    if (!imported || typeof imported !== 'object') {
      $warning('Model import returned empty payload.');
      return;
    }

    fillForm(normalizeProjectModel(imported, appStore.currentProject, resolveCurrentProjectCode()));
    $success('Model import succeeded.');
  } catch {
    $error('Model import failed.');
  }
};

const extractEdmIdFromExportResponse = (response) => {
  const body = response?.data ?? response?.result ?? response ?? {};
  const candidates = [
    body?.edmId,
    body?.data?.edmId,
    body?.msgParams?.[0]?.edmId,
    response?.response?.data?.msgParams?.[0]?.edmId
  ];
  for (const item of candidates) {
    const edmId = toText(item);
    if (edmId) return edmId;
  }
  return '';
};

const exportProjectModel = async () => {
  const result = await persistModel('draft');
  if (!result) return;

  const modelCode = toText(result.modelCode);
  if (!isValidModelCode(modelCode)) {
    $warning('Export failed: modelCode is empty after save.');
    return;
  }

  try {
    const response = await projectModelsApi.exportModel({ modelCodeList: [modelCode] });
    const edmId = extractEdmIdFromExportResponse(response);
    if (edmId) {
      await downloadFile(edmId);
      $success('Model export succeeded, edmId: ' + edmId);
      return;
    }
    $success('Model export succeeded.');
  } catch {
    $error('Model export failed.');
  }
};

const saveProjectModel = async () => {
  const result = await persistModel('draft');
  if (!result) return;
  router.push('/designer/project-models');
};

const publishProjectModel = async () => {
  const result = await persistModel('active');
  if (!result) return;

  const modelCode = toText(result.modelCode);
  if (!isValidModelCode(modelCode)) {
    $warning('Publish failed: modelCode is empty after save.');
    return;
  }

  try {
    await projectModelsApi.publish({ modelCodeList: [modelCode] });
  } catch {
    $warning('Publish failed. Please retry.');
    return;
  }

  const activeEntity = syncEntityWithModelCode(result.entity, modelCode, 'active', result.projectCode);
  form.id = activeEntity.id || form.id;
  form.code = activeEntity.code || form.code;
  form.modelCode = activeEntity.modelCode || form.modelCode;

  router.push('/designer/project-models');
};
</script>
