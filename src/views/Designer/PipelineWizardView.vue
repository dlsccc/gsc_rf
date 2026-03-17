<template>
  <div style="margin-top: 64px; height: calc(100vh - 64px); display: flex; flex-direction: column;">
    <div class="main-container">
      <main class="content">
        <div class="content-card">
          <div class="card-header">
            <div class="card-title">鍏ユ箹瑙勫垯璁捐</div>
            <div class="toolbar">
              <button class="btn btn-default" @click="router.push('/designer')">杩斿洖</button>
              <button class="btn btn-default" @click="pipelineStore.resetPipeline">閲嶇疆</button>
            </div>
          </div>
          <div class="card-body">
            <div class="form-group" style="max-width: 420px; margin-bottom: 16px;">
              <label class="form-label">鐩爣椤圭洰妯″瀷</label>
              <select class="form-select" :value="pipelineStore.selectedModelId" @change="pipelineStore.setModel($event.target.value)">
                <option value="">璇烽€夋嫨妯″瀷</option>
                <option v-for="item in modelStore.projectModels" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </div>

            <FileUploadPanel v-if="pipelineStore.currentStep === 0" :store="pipelineStore" />
            <FieldMappingPanel v-else-if="pipelineStore.currentStep === 1" :store="pipelineStore" />
            <ProcessPanel v-else-if="pipelineStore.currentStep === 2" :store="pipelineStore" />
            <WriteConfigPanel v-else :store="pipelineStore" @execute="executeJob" />

            <div class="model-edit-actions" style="margin-top: 12px;">
              <button class="btn btn-default" @click="pipelineStore.prevStep" :disabled="pipelineStore.currentStep === 0">涓婁竴姝?/button>
              <button class="btn btn-primary" @click="pipelineStore.nextStep" :disabled="!pipelineStore.canProceed || pipelineStore.currentStep === pipelineStore.steps.length - 1">涓嬩竴姝?/button>
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
import { pipelineApi } from '@/api/index.js';
import { useAppStore } from '@/store/app.store.js';
import { useModelStore } from '@/store/model.store.js';
import { usePipelineStore } from '@/store/pipeline.store.js';
import FileUploadPanel from '@/components/pipeline/FileUploadPanel.vue';
import FieldMappingPanel from '@/components/pipeline/FieldMappingPanel.vue';
import ProcessPanel from '@/components/pipeline/ProcessPanel.vue';
import WriteConfigPanel from '@/components/pipeline/WriteConfigPanel.vue';

const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();
const pipelineStore = usePipelineStore();

onMounted(async () => {
  appStore.setRole('designer');
  await modelStore.loadProjectModels();
  if (!pipelineStore.selectedModelId && modelStore.projectModels[0]) {
    pipelineStore.setModel(modelStore.projectModels[0].id);
  }
});

const executeJob = async () => {
  const payload = pipelineStore.getExecutePayload();
  try {
    await pipelineApi.execute(payload);
  } catch {
    // 鍚庣鏈帴鍏ユ椂浠嶈繑鍥炴湰鍦版墽琛屽弽棣堛€?  }
  pipelineStore.markExecuted();
};
</script>


