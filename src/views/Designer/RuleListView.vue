<template>
  <div class="model-list-container" style="margin-top: 64px; background: linear-gradient(135deg, #fff7e6 0%, #fafafa 100%);">
    <div class="model-edit-header">
      <div class="back-btn" @click="router.push('/designer')"><span class="material-icons">arrow_back</span></div>
      <div class="model-list-title">
        <span class="material-icons" style="color: #fa8c16;">rule</span>
        入湖规则列表
        <span class="model-count">共 {{ ruleStore.sortedRules.length }} 条规则</span>
      </div>
      <div style="flex: 1;" />
      <button class="btn btn-primary" @click="router.push('/designer/rules/new')">
        <span class="material-icons" style="font-size: 18px;">add</span>
        新建规则
      </button>
    </div>

    <div class="model-grid">
      <div v-for="item in ruleStore.sortedRules" :key="item.id" class="model-card">
        <div class="model-card-header">
          <div class="model-name">
            <span class="material-icons" style="color: #fa8c16;">rule</span>
            {{ item.name }}
          </div>
          <span class="model-status" :class="item.status">{{ item.status === 'active' ? '已发布' : '草稿' }}</span>
        </div>

        <div class="model-desc">{{ item.description || '暂无描述' }}</div>

        <div class="model-meta">
          <div class="model-meta-item">
            <span class="material-icons">database</span>
            目标模型: {{ resolveTargetModelName(item.targetModel) }}
          </div>
          <div class="model-meta-item">
            <span class="material-icons">schedule</span>
            {{ item.updateTime }}
          </div>
        </div>

        <div class="model-card-actions">
          <button class="btn btn-default btn-sm" @click="router.push(`/designer/rules/${item.id}/edit`)">
            <span class="material-icons" style="font-size: 16px;">edit</span>
            编辑
          </button>
          <button class="btn btn-default btn-sm" @click="router.push(`/designer/rules/${item.id}/edit`)">
            <span class="material-icons" style="font-size: 16px;">visibility</span>
            查看
          </button>
          <button class="btn btn-default btn-sm" style="color: var(--danger);" @click="remove(item.id)">
            <span class="material-icons" style="font-size: 16px;">delete</span>
          </button>
        </div>
      </div>
    </div>

    <div v-if="ruleStore.sortedRules.length === 0" style="text-align: center; padding: 80px 20px; color: var(--text-secondary);">
      <span class="material-icons" style="font-size: 64px; opacity: 0.3;">rule</span>
      <p style="margin-top: 16px; font-size: 16px;">暂无入湖规则</p>
      <p style="margin-top: 8px; font-size: 14px;">点击上方"新建规则"按钮创建第一个入湖规则</p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { projectModelsApi, rulesApi } from '@/api/index.js';
import { useRuleStore, mapApiRuleToEntity, unwrapApiList as unwrapRuleList } from '@/store/rule.store.js';
import { useAppStore } from '@/store/app.store.js';
import { normalizeProjectModel, unwrapApiList as unwrapModelList, useModelStore } from '@/store/model.store.js';

const router = useRouter();
const appStore = useAppStore();
const ruleStore = useRuleStore();
const modelStore = useModelStore();

const resolveCurrentProjectCode = () => {
  return String(appStore.currentProjectCode || appStore.currentProject || '').trim();
};

const loadProjectModels = async () => {
  try {
    const projectCode = resolveCurrentProjectCode();
    const response = await projectModelsApi.list({ modelType: 'business', ...(projectCode ? { projectCode } : {}) });
    const list = unwrapModelList(response);
    modelStore.setProjectModels(list.map((item) => normalizeProjectModel(item, appStore.currentProject, projectCode)));
  } catch {
    modelStore.setProjectModels([]);
  }
};

const resolveTargetModelName = (targetModel) => {
  const key = String(targetModel ?? '').trim();
  if (!key) return '-';

  const target = modelStore.projectModels.find((item) => {
    const id = String(item.id ?? '').trim();
    const code = String(item.code || item.modelCode || '').trim();
    const name = String(item.name || '').trim();
    return key === id || key === code || key === name;
  });

  return target?.name || key;
};

const loadRules = async () => {
  ruleStore.setLoading(true);
  try {
    const response = await rulesApi.list({ pageNum: 1, pageSize: 200 });
    const list = unwrapRuleList(response);
    if (list.length > 0) {
      ruleStore.setRules(list.map((item) => mapApiRuleToEntity(item, appStore.currentProject)));
    }
  } catch {
    // keep local state when backend is unavailable
  } finally {
    ruleStore.setLoading(false);
  }
};

onMounted(async () => {
  appStore.setRole('designer');
  await loadProjectModels();
  await loadRules();
});

const remove = async (id) => {
  if (!window.confirm('\u786e\u5b9a\u8981\u5220\u9664\u8be5\u5165\u6e56\u89c4\u5219\u5417\uff1f\u6b64\u64cd\u4f5c\u4e0d\u53ef\u6062\u590d\u3002')) {
    return;
  }

  ruleStore.removeRuleById(id);
  try {
    await rulesApi.remove({ id: String(id) });
  } catch {
    // ignore remove failure when backend is unavailable
  }
};
</script>
