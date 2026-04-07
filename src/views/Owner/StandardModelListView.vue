<template>
  <div class="model-list-container" style="margin-top: 64px; background: linear-gradient(135deg, #f0f5ff 0%, #fafafa 100%);">
    <div class="model-edit-header">
      <div class="back-btn" @click="router.push('/owner')">
        <span class="material-icons">arrow_back</span>
      </div>
      <div class="model-list-title">
        <span class="material-icons">schema</span>
        标准数据模型列表
        <span class="model-count">共 {{ modelStore.standardModels.length }} 个模型</span>
      </div>
      <div style="flex: 1;" />
      <button class="btn btn-primary" @click="router.push('/owner/standard-models/new')">
        <span class="material-icons" style="font-size: 18px;">add</span>
        新建模型
      </button>
    </div>

    <div class="model-grid">
      <div v-for="item in modelStore.standardModels" :key="item.id" class="model-card">
        <div class="model-card-header">
          <div class="model-name">
            <span class="material-icons">table_chart</span>
            <span class="model-name-text" :title="item.name">{{ item.name }}</span>
          </div>
          <span class="model-status" :class="item.status">{{ item.status === 'active' ? '已发布' : '草稿' }}</span>
        </div>

        <div class="model-desc" :title="item.description || '暂无描述'">{{ item.description || '暂无描述' }}</div>

        <div class="model-meta">
          <div class="model-meta-item">
            <span class="material-icons">view_column</span>
            <span class="model-meta-item-text" :title="item.fields.length + ' 个字段'">{{ item.fields.length }} 个字段</span>
          </div>
          <div class="model-meta-item">
            <span class="material-icons">schedule</span>
            <span class="model-meta-item-text" :title="item.updateTime">{{ item.updateTime }}</span>
          </div>
        </div>

        <div class="model-card-actions">
          <button class="btn btn-default btn-sm" @click="router.push(`/owner/standard-models/${item.id}/edit`)">
            <span class="material-icons" style="font-size: 16px;">edit</span>
            编辑
          </button>
          <button class="btn btn-default btn-sm" @click="router.push(`/owner/standard-models/${item.id}/edit`)">
            <span class="material-icons" style="font-size: 16px;">visibility</span>
            查看
          </button>
          <button class="btn btn-default btn-sm" style="color: var(--danger);" @click="remove(item.id)">
            <span class="material-icons" style="font-size: 16px;">delete</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="modelStore.standardModels.length === 0" style="text-align: center; padding: 80px 20px; color: var(--text-secondary);">
      <span class="material-icons" style="font-size: 64px; opacity: 0.3;">inbox</span>
      <p style="margin-top: 16px; font-size: 16px;">暂无标准数据模型</p>
      <p style="margin-top: 8px; font-size: 14px;">点击上方"新建模型"按钮创建第一个标准数据模型</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { standardModelsApi } from '@/api/index.js';
import { useAppStore } from '@/store/app.store.js';
import { normalizeStandardModel, resolveModelCode, unwrapApiList, useModelStore } from '@/store/model.store.js';

const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();

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
});

const remove = async (id) => {
  if (!window.confirm('确定要删除该标准数据模型吗？此操作不可恢复。')) {
    return;
  }

  const target = modelStore.getStandardModelById(id);
  modelStore.removeStandardModelById(id);

  try {
    await standardModelsApi.remove({
      modelCodeList: [resolveModelCode(target || { id })].filter(Boolean),
      modelType: 'base'
    });
  } catch {
    // 无后端时忽略错误。
  }
};
</script>
