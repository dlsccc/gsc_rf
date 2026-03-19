<template>
  <div style="margin-top: 64px; height: calc(100vh - 64px); display: flex; flex-direction: column;">
    <div class="main-container">
      <main class="content">
        <div class="content-card">
          <div class="card-header">
            <div class="card-title">入湖规则设计</div>
            <div class="toolbar">
              <button class="btn btn-default" @click="router.push('/designer')">返回</button>
              <button class="btn btn-default" @click="pipelineStore.resetPipeline">重置</button>
            </div>
          </div>
          <div class="card-body">
            <div class="form-group" style="max-width: 420px; margin-bottom: 16px;">
              <label class="form-label">目标项目模型</label>
              <select class="form-select" :value="pipelineStore.selectedModelId" @change="pipelineStore.setModel($event.target.value)">
                <option value="">请选择模型</option>
                <option v-for="item in modelStore.projectModels" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </div>

            <FileUploadPanel v-if="pipelineStore.currentStep === 0" :store="pipelineStore" />
            <FieldMappingPanel v-else-if="pipelineStore.currentStep === 1" :store="pipelineStore" />
            <ProcessPanel v-else-if="pipelineStore.currentStep === 2" :store="pipelineStore" />
            <WriteConfigPanel v-else :store="pipelineStore" @execute="executeJob" />

            <div class="model-edit-actions" style="margin-top: 12px;">
              <button class="btn btn-default" @click="pipelineStore.prevStep" :disabled="pipelineStore.currentStep === 0">上一步</button>
              <button class="btn btn-primary" @click="pipelineStore.nextStep" :disabled="!pipelineStore.canProceed || pipelineStore.currentStep === pipelineStore.steps.length - 1">下一步</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { pipelineApi, projectModelsApi } from '@/api/index.js';
import { useAppStore } from '@/store/app.store.js';
import { normalizeProjectModel, unwrapApiList, useModelStore } from '@/store/model.store.js';
import { usePipelineStore } from '@/store/pipeline.store.js';
import FileUploadPanel from '@/components/pipeline/FileUploadPanel.vue';
import FieldMappingPanel from '@/components/pipeline/FieldMappingPanel.vue';
import ProcessPanel from '@/components/pipeline/ProcessPanel.vue';
import WriteConfigPanel from '@/components/pipeline/WriteConfigPanel.vue';

const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();
const pipelineStore = usePipelineStore();

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

onMounted(async () => {
  appStore.setRole('designer');
  await loadProjectModels();
  if (!pipelineStore.selectedModelId && modelStore.projectModels[0]) {
    pipelineStore.setModel(modelStore.projectModels[0].id);
  }
});

const executeJob = async () => {
  const payload = pipelineStore.getExecutePayload();
  try {
    await pipelineApi.execute(payload);
  } catch {
    // 后端未接入时，保留本地执行反馈。
  }
  pipelineStore.markExecuted();
};
</script>
