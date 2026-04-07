<template>
  <div class="model-list-container" style="margin-top: 64px; background: linear-gradient(135deg, #e6f7ff 0%, #fafafa 100%);">
    <div class="model-edit-header">
      <div class="back-btn" @click="router.push('/designer')"><span class="material-icons">arrow_back</span></div>
      <div class="model-list-title">
        <span class="material-icons" style="color: var(--primary);">account_tree</span>
        数据模型列表
        <span class="model-count">共 {{ projectModels.length }} 个模型</span>
      </div>
      <div style="flex: 1;" />
      <button class="btn btn-primary" @click="router.push('/designer/project-models/new')">
        <span class="material-icons" style="font-size: 18px;">add</span>
        新建模型
      </button>
    </div>

    <div class="model-grid">
      <div v-for="item in projectModels" :key="item.id" class="model-card">
        <div class="model-card-header">
          <div class="model-name">
            <span class="material-icons" style="color: var(--primary);">account_tree</span>
            <span class="model-name-text" :title="item.name">{{ item.name }}</span>
          </div>
          <span class="model-status" :class="item.status">{{ item.status === 'active' ? '已发布' : '草稿' }}</span>
        </div>

        <div class="model-desc" :title="item.description || '暂无描述'">{{ item.description || '暂无描述' }}</div>

        <div class="model-meta">
          <div class="model-meta-item"><span class="material-icons">link</span><span class="model-meta-item-text" :title="'引用: ' + resolveRefStandardModelName(item.refStandardModel)">引用: {{ resolveRefStandardModelName(item.refStandardModel) }}</span></div>
          <div class="model-meta-item"><span class="material-icons">view_column</span><span class="model-meta-item-text" :title="item.fields.length + ' 个字段'">{{ item.fields.length }} 个字段</span></div>
        </div>

        <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f5f5f5;">
          <span v-if="item.tags?.vendor" class="tag tag-primary">{{ item.tags.vendor }}</span>
          <span v-if="item.tags?.standard" class="tag tag-warning">{{ item.tags.standard }}</span>
          <span v-if="item.tags?.timeGranularity" class="tag tag-success">{{ item.tags.timeGranularity }}</span>
          <span v-if="item.tags?.type" class="tag" style="background: #f9f0ff; color: #722ed1;">{{ item.tags.type }}</span>
        </div>

        <div class="model-card-actions">
          <button class="btn btn-default btn-sm" @click="router.push(`/designer/project-models/${item.id}/edit`)">
            <span class="material-icons" style="font-size: 16px;">edit</span>
            编辑
          </button>
          <button class="btn btn-default btn-sm" @click="router.push(`/designer/project-models/${item.id}/edit`)">
            <span class="material-icons" style="font-size: 16px;">visibility</span>
            查看
          </button>
          <button class="btn btn-default btn-sm" style="color: var(--danger);" @click="remove(item.id)">
            <span class="material-icons" style="font-size: 16px;">delete</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="projectModels.length === 0" style="text-align: center; padding: 80px 20px; color: var(--text-secondary);">
      <span class="material-icons" style="font-size: 64px; opacity: 0.3;">account_tree</span>
      <p style="margin-top: 16px; font-size: 16px;">暂无数据模型</p>
      <p style="margin-top: 8px; font-size: 14px;">点击上方"新建模型"按钮创建第一个数据模型</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { projectModelsApi, standardModelsApi } from '@/api/index.js';
import { useAppStore } from '@/store/app.store.js';
import { normalizeProjectModel, normalizeStandardModel, resolveModelCode, unwrapApiList, useModelStore } from '@/store/model.store.js';

const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();

const projectModels = computed(() => {
  return modelStore.projectModels.filter((item) => Number(item.projectId) === Number(appStore.currentProject));
});

const resolveCurrentProjectCode = () => {
  return String(appStore.currentProjectCode || appStore.currentProject || '').trim();
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

const loadStandardModels = async () => {
  try {
    const response = await standardModelsApi.list({ modelType: 'base' });
    const list = unwrapApiList(response);
    if (list.length > 0) {
      modelStore.setStandardModels(list.map((item) => normalizeStandardModel(item)));
    }
  } catch {
    // keep local state when backend is unavailable
  }
};

const resolveRefStandardModelName = (refStandardModel) => {
  const key = String(refStandardModel ?? '').trim();
  if (!key) return '-';

  const target = modelStore.standardModels.find((item) => {
    const id = String(item.id ?? '').trim();
    const code = String(item.code || item.modelCode || '').trim();
    const name = String(item.name || '').trim();
    return key === id || key === code || key === name;
  });

  return target?.name || key;
};

onMounted(async () => {
  appStore.setRole('designer');
  await loadStandardModels();
  await loadProjectModels();
});

const remove = async (id) => {
  if (!window.confirm('确定要删除该数据模型吗？此操作不可恢复。')) {
    return;
  }

  const target = modelStore.getProjectModelById(id);
  modelStore.removeProjectModelById(id);

  try {
    await projectModelsApi.remove({
      modelCodeList: [resolveModelCode(target || { id })].filter(Boolean),
      modelType: 'business'
    });
  } catch {
    // 无后端时忽略错误。
  }
};
</script>
