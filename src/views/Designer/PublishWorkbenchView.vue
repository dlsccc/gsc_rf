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
          :src="FLOW_IMAGE_PATH"
          alt="发布流程图"
          class="flow-image"
          @error="handleImageError"
        />
        <div v-else class="flow-image-placeholder">
          <div>请放置发布流程图</div>
          <div class="flow-image-path">{{ FLOW_IMAGE_PATH }}</div>
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

const FLOW_IMAGE_PATH = './images/publish/publish-flow.png';

const MODE_CONFIG = {
  design: {
    label: '设计态',
    embedUrl: 'https://2000-itsc-gde-design.sd.huawei.com/adc-studio-web/project-mgt/project/resource-designer.html?project_id=14#/'
  },
  runtime: {
    label: '运行态',
    embedUrl: 'https://2000-itsc-gde-runtime.sd.huawei.com/portal-web/portal/appDetails.html?appshortcutId=1#GDE.AI.AppManager'
  }
};

const activeMode = ref('design');
const imageLoadError = ref(false);

const currentMode = computed(() => MODE_CONFIG[activeMode.value]);

const switchMode = (mode) => {
  if (!MODE_CONFIG[mode]) return;
  activeMode.value = mode;
};

const handleImageError = () => {
  imageLoadError.value = true;
};

const goBack = () => router.push('/designer');
</script>

<style scoped>
.publish-workbench {
  padding: 24px;
  max-width: 1280px;
  margin: 0 auto;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
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
  color: var(--primary);
}

.mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fafafa;
}

.mode-btn {
  min-width: 96px;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:hover {
  color: var(--primary);
  background: var(--primary-bg);
}

.mode-btn.active {
  background: linear-gradient(135deg, var(--primary) 0%, #4096ff 100%);
  border-color: var(--primary);
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
    min-width: 90px;
    font-size: 13px;
  }

  .embed-container {
    min-height: 500px;
    height: calc(100vh - 400px);
  }
}
</style>

