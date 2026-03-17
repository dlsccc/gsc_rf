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
              <th style="width: 100px;">是否维度</th>
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
                <select v-model="field.type" class="field-select">
                  <option value="">请选择</option>
                  <option value="STRING">STRING</option>
                  <option value="INT">INT</option>
                  <option value="BIGINT">BIGINT</option>
                  <option value="FLOAT64">FLOAT64</option>
                  <option value="DECIMAL">DECIMAL</option>
                  <option value="DATE">DATE</option>
                  <option value="DATETIME">DATETIME</option>
                  <option value="BOOLEAN">BOOLEAN</option>
                </select>
              </td>
              <td>
                <select v-model="field.format" class="field-select">
                  <option value="YYYY">YYYY</option>
                  <option value="YYYY-MM">YYYY-MM</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="hh:mm:ss">hh:mm:ss</option>
                  <option value="浮点数">浮点数</option>
                  <option value="整数">整数</option>
                  <option value="百分数">百分数</option>
                  <option value="YYYY-MM-DD hh:mm:ss">YYYY-MM-DD hh:mm:ss</option>
                  <option v-if="field.type === 'INT' || field.type === 'BIGINT'" value="INTEGER">整数</option>
                  <option v-if="field.type === 'FLOAT64' || field.type === 'DECIMAL'" value="FLOAT">浮点数</option>
                  <option v-if="field.type === 'FLOAT64' || field.type === 'DECIMAL'" value="PERCENT">百分数</option>
                </select>
              </td>
              <td style="text-align: center;"><input v-model="field.isDimension" class="field-checkbox" type="checkbox" /></td>
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
      <button class="btn btn-primary" @click="saveModel">
        <span class="material-icons" style="font-size: 18px;">save</span>
        保存模型
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useModelStore } from '../../store/model.store';
import { useAppStore } from '../../store/app.store';

const emptyField = () => ({ name: '', type: '', format: '', isDimension: false, description: '', example: '' });
const emptyModel = () => ({ id: '', name: '', description: '', status: 'draft', fields: [emptyField()] });

const route = useRoute();
const router = useRouter();
const modelStore = useModelStore();
const appStore = useAppStore();

const editId = computed(() => route.params.id || '');
const isEdit = computed(() => !!editId.value);

const form = reactive(emptyModel());

const fillForm = (data) => {
  const source = data ? JSON.parse(JSON.stringify(data)) : emptyModel();
  Object.keys(form).forEach((key) => delete form[key]);
  Object.assign(form, source);
  if (!Array.isArray(form.fields) || form.fields.length === 0) {
    form.fields = [emptyField()];
  }
};

onMounted(async () => {
  appStore.setRole('owner');
  await modelStore.loadStandardModels();
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
    window.alert('请输入模型名称');
    return false;
  }

  if (!Array.isArray(form.fields) || form.fields.length === 0 || !form.fields.some((item) => item.name?.trim())) {
    window.alert('请至少配置一个字段');
    return false;
  }

  const invalid = form.fields.filter((field) => !field.name?.trim() || !field.type?.trim());
  if (invalid.length > 0) {
    window.alert('保存前请完善字段名称和字段类型');
    return false;
  }

  return true;
};

const saveModel = async () => {
  if (!validate()) return;

  await modelStore.upsertStandardModel({
    ...JSON.parse(JSON.stringify(form)),
    status: 'active'
  });

  router.push('/owner/standard-models');
};
</script>

