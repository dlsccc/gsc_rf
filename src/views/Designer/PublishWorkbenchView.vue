<template>
  <div class="publish-workbench" style="margin-top: 64px;">
    <div class="publish-header">
      <div class="back-btn" @click="goBack"><span class="material-icons">arrow_back</span></div>
      <div class="publish-title">发布</div>
    </div>

    <div class="publish-panel">
      <div class="flow-image-area">
        <img
          v-if="!imageLoadError"
          :src="currentMode.flowImage"
          :alt="currentMode.label + '流程图'"
          class="flow-image"
          @error="handleImageError"
        />
        <div v-else class="flow-image-placeholder">
          <div>请放置 {{ currentMode.label }} 流程图</div>
          <div class="flow-image-path">{{ currentMode.flowImage }}</div>
        </div>
      </div>

      <div class="mode-switch">
        <button
          class="mode-btn"
          :class="{ active: activeMode === 'design' }"
          @click="switchMode('design')"
        >
          设计态
        </button>
        <button
          class="mode-btn"
          :class="{ active: activeMode === 'runtime' }"
          @click="switchMode('runtime')"
        >
          运行态
        </button>
      </div>

      <div class="embed-container">
        <iframe
          :src="currentMode.embedUrl"
          class="embed-frame"
          frameborder="0"
          allowfullscreen
          referrerpolicy="no-referrer-when-downgrade"
        ></iframe>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/store/app.store.js';

const router = useRouter();
const appStore = useAppStore();
appStore.setRole('designer');

const MODE_CONFIG = {
  design: {
    label: '设计态',
    flowImage: '/images/publish/design-mode-flow.png',
    embedUrl: 'https://2000-itsc-gde-design.sd.huawei.com/adc-studio-web/project-mgt/project/resource-designer.html?project_id=14#/'
  },
  runtime: {
    label: '运行态',
    flowImage: '/images/publish/runtime-mode-flow.png',
    embedUrl: 'https://2000-itsc-gde-runtime.sd.huawei.com/portal-web/portal/appDetails.html?appshortcutId=1#GDE.AI.AppManager'
  }
};

const activeMode = ref('design');
const imageLoadError = ref(false);

const currentMode = computed(() => MODE_CONFIG[activeMode.value]);

const switchMode = (mode) => {
  if (!MODE_CONFIG[mode]) return;
  activeMode.value = mode;
  imageLoadError.value = false;
};

const handleImageError = () => {
  imageLoadError.value = true;
};

const goBack = () => router.push('/designer');
</script>

<style scoped>
.publish-workbench {
  padding: 24px;
}

.publish-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.publish-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
}

.publish-panel {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.flow-image-area {
  width: 100%;
  min-height: 180px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #f8fafc;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.flow-image {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  display: block;
}

.flow-image-placeholder {
  text-align: center;
  color: var(--text-secondary);
  padding: 24px;
  line-height: 1.8;
}

.flow-image-path {
  margin-top: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  color: #3b82f6;
}

.mode-switch {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  margin-bottom: 12px;
}

.mode-btn {
  min-width: 120px;
  height: 40px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
  color: var(--text);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn.active {
  background: #4f7d39;
  border-color: #4f7d39;
  color: #fff;
}

.embed-container {
  width: 100%;
  height: calc(100vh - 360px);
  min-height: 560px;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.embed-frame {
  width: 100%;
  height: 100%;
  border: none;
}

@media (max-width: 900px) {
  .mode-btn {
    min-width: 100px;
    font-size: 16px;
  }

  .embed-container {
    min-height: 500px;
    height: calc(100vh - 400px);
  }
}
</style>
