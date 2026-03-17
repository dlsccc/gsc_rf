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
            {{ item.name }}
          </div>
          <span class="model-status" :class="item.status">{{ item.status === 'active' ? '已发布' : '草稿' }}</span>
        </div>

        <div class="model-desc">{{ item.description || '暂无描述' }}</div>

        <div class="model-meta">
          <div class="model-meta-item">
            <span class="material-icons">view_column</span>
            {{ item.fields.length }} 个字段
          </div>
          <div class="model-meta-item">
            <span class="material-icons">schedule</span>
            {{ item.updateTime }}
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
import { useAppStore } from '../../store/app.store';
import { useModelStore } from '../../store/model.store';

const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();

onMounted(() => {
  appStore.setRole('owner');
  modelStore.loadStandardModels();
});

const remove = async (id) => {
  if (!window.confirm('确定要删除该标准数据模型吗？此操作不可恢复。')) {
    return;
  }
  await modelStore.deleteStandardModel(id);
};
</script>

