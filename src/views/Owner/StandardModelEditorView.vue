<template>
  <div class="model-edit-container" style="margin-top: 64px; background: linear-gradient(135deg, #f0f5ff 0%, #fafafa 100%);">
    <div class="model-edit-header">
      <div class="back-btn" @click="router.push('/owner/standard-models')"><span class="material-icons">arrow_back</span></div>
      <div class="model-edit-title">{{ isEdit ? '编辑标准数据模型' : '新建标准数据模型' }}</div>
    </div>

    <div class="model-form-section">
      <div class="section-title"><span class="material-icons">info</span>基本信息</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label"><span class="material-icons">table_chart</span>模型名称</label>
          <input v-model="form.name" class="form-input" type="text" placeholder="请输入模型名称，如：HW_4G_COUNTER" />
          <div class="form-hint">模型名称使用大写字母和下划线，如：TABLE_NAME</div>
        </div>
        <div class="form-group">
          <label class="form-label"><span class="material-icons">label</span>模型描述</label>
          <input v-model="form.description" class="form-input" type="text" placeholder="请输入模型描述" />
          <div class="form-hint">简要描述该模型的用途和业务含义</div>
        </div>
      </div>
    </div>

    <div class="model-form-section">
      <div class="section-title"><span class="material-icons">view_column</span>字段定义</div>
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

      <div class="add-field-btn" @click="addField">
        <span class="material-icons">add</span>
        添加字段
      </div>
    </div>

    <div class="model-edit-actions">
      <button class="btn btn-default" @click="router.push('/owner/standard-models')">取消</button>
      <button class="btn btn-default" @click="triggerImportModel">
        <span class="material-icons" style="font-size: 18px;">upload_file</span>
        Import Model
      </button>
      <button class="btn btn-primary" @click="saveModel">
        <span class="material-icons" style="font-size: 18px;">save</span>
        保存模型
      </button>
      <button class="btn btn-default" @click="exportModel">
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
import { standardModelsApi } from '@/api/index.js';
import { nowText } from '@/utils/date.js';
import { createId } from '@/utils/id.js';
import { $error, $success, $warning } from '@/utils/message.js';
import { downloadFile } from '@/utils/fileUtils.js';
import { normalizeStandardModel, resolveModelCode, toModelSavePayload, unwrapApiData, unwrapApiList, useModelStore } from '@/store/model.store.js';
import { useAppStore } from '@/store/app.store.js';

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
const emptyModel = () => ({ id: '', name: '', description: '', status: 'draft', fields: [emptyField()] });

const route = useRoute();
const router = useRouter();
const modelStore = useModelStore();
const appStore = useAppStore();

const editId = computed(() => route.params.id || '');
const isEdit = computed(() => !!editId.value);

const form = reactive(emptyModel());
const importInputRef = ref(null);

const toText = (value) => String(value ?? '').trim();

const isValidModelCode = (value) => {
  const code = toText(value);
  if (!code) return false;
  if (code === '0' || code === '1') return false;
  return /[a-zA-Z]/.test(code);
};

const fillForm = (data) => {
  const source = data ? JSON.parse(JSON.stringify(data)) : emptyModel();
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, source);
  if (!Array.isArray(form.fields) || form.fields.length === 0) {
    form.fields = [emptyField()];
  }
  form.fields = normalizeFieldRows(form.fields);
};

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

onMounted(async () => {
  appStore.setRole('owner');
  await loadStandardModels();
  if (isEdit.value) {
    fillForm(modelStore.getStandardModelById(editId.value));
    return;
  }
  fillForm(null);
});

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

const validate = () => {
  if (!form.name?.trim()) {
    $warning('请输入模型名称');
    return false;
  }

  if (!Array.isArray(form.fields) || form.fields.length === 0 || !form.fields.some((item) => item.name?.trim())) {
    $warning('请至少配置一个字段');
    return false;
  }

  const invalid = form.fields.filter((field) => !field.name?.trim() || !field.type?.trim());
  if (invalid.length > 0) {
    $warning('保存前请完善字段名称和字段类型');
    return false;
  }

  return true;
};

const extractModelCodeFromSaveResponse = (response) => {
  const body = response?.data ?? response?.result ?? response ?? {};
  const candidates = [
    body?.modelCode,
    body?.code,
    body?.data?.modelCode,
    body?.data?.code,
    response?.modelCode,
    response?.code
  ];

  for (const item of candidates) {
    const modelCode = toText(item);
    if (isValidModelCode(modelCode)) {
      return modelCode;
    }
  }

  return '';
};

const queryModelCodeByName = async (modelName) => {
  const name = toText(modelName);
  if (!name) return '';

  try {
    const response = await standardModelsApi.list({ modelType: 'base', modelName: name });
    const list = unwrapApiList(response);
    const exact = list.find((item) => toText(item.modelName || item.name) === name) || list[0];
    const modelCode = toText(resolveModelCode(exact || {}));
    return isValidModelCode(modelCode) ? modelCode : '';
  } catch {
    return '';
  }
};

const syncEntityWithModelCode = (entity, modelCode) => {
  if (!isValidModelCode(modelCode)) {
    return modelStore.upsertStandardModelLocal(normalizeStandardModel({
      ...entity,
      status: 'active',
      updateTime: nowText()
    }));
  }

  const nextEntity = normalizeStandardModel({
    ...entity,
    id: modelCode,
    code: modelCode,
    modelCode,
    status: 'active',
    updateTime: nowText()
  });

  if (String(entity.id) !== String(modelCode)) {
    modelStore.removeStandardModelById(entity.id);
  }

  return modelStore.upsertStandardModelLocal(nextEntity);
};

const persistModel = async () => {
  if (!validate()) return null;

  let entity = modelStore.upsertStandardModelLocal(normalizeStandardModel({
    ...JSON.parse(JSON.stringify(form)),
    id: form.id || form.code || form.modelCode || createId(),
    status: 'active',
    updateTime: nowText()
  }));

  let saveResponse = null;
  try {
    saveResponse = await standardModelsApi.save(toModelSavePayload({ entity, modelType: 'base' }));
  } catch {
    // Ignore backend save failure in local-only mode.
  }

  const localCode = toText(resolveModelCode(entity));
  const responseCode = extractModelCodeFromSaveResponse(saveResponse);
  const queriedCode = (!isValidModelCode(localCode) && !isValidModelCode(responseCode))
    ? await queryModelCodeByName(entity.name)
    : '';
  const finalModelCode = isValidModelCode(localCode)
    ? localCode
    : (isValidModelCode(responseCode) ? responseCode : queriedCode);

  entity = syncEntityWithModelCode(entity, finalModelCode);
  form.id = entity.id || form.id;
  form.code = entity.code || form.code;
  form.modelCode = entity.modelCode || form.modelCode;

  return {
    entity,
    modelCode: toText(resolveModelCode(entity))
  };
};

const saveModel = async () => {
  const result = await persistModel();
  if (!result) return;
  router.push('/owner/standard-models');
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
    const response = await standardModelsApi.importModel(formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    const imported = unwrapApiData(response);
    if (!imported || typeof imported !== 'object') {
      $warning('Model import returned empty payload.');
      return;
    }
    fillForm(normalizeStandardModel(imported));
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

const exportModel = async () => {
  const result = await persistModel();
  if (!result) return;

  const modelCode = toText(result.modelCode);
  if (!isValidModelCode(modelCode)) {
    $warning('Export failed: modelCode is empty after save.');
    return;
  }

  try {
    const response = await standardModelsApi.exportModel({ modelCodeList: [modelCode] });
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
</script>
