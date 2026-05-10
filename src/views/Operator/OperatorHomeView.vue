<template>
  <div class="function-menu" style="margin-top: 64px;">
    <div class="menu-header">
      <div class="back-btn" @click="goEntrance"><span class="material-icons">arrow_back</span></div>
      <div class="menu-title-area">
        <div class="menu-title">
          \u4f5c\u4e1a\u6267\u884c\u4eba\u5458\u5de5\u4f5c\u53f0
          <select class="project-select" :value="appStore.currentProject" @change="appStore.setProject($event.target.value)">
            <option v-for="project in appStore.projectList" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
          <span class="role-badge operator">\u4f5c\u4e1a\u6267\u884c\u4eba\u5458</span>
        </div>
        <div class="menu-subtitle">\u6267\u884c\u6570\u636e\u5165\u6e56\u4e0e\u62a5\u544a\u751f\u6210\u4efb\u52a1</div>
      </div>
    </div>

    <div class="function-cards">
      <div class="function-card" @click="openLakeExecute">
        <div class="function-icon execute"><span class="material-icons" style="font-size: 24px;">cloud_upload</span></div>
        <div class="function-name">\u6570\u636e\u5165\u6e56</div>
        <div class="function-desc">\u9009\u62e9\u5165\u6e56\u89c4\u5219\uff0c\u6267\u884c\u6570\u636e\u5165\u6e56\u4efb\u52a1</div>
      </div>

      <div class="function-card" @click="openReportGeneration">
        <div class="function-icon history"><span class="material-icons" style="font-size: 24px;">assessment</span></div>
        <div class="function-name">\u62a5\u544a\u751f\u6210</div>
        <div class="function-desc">\u9009\u62e9\u62a5\u544a\u6a21\u677f\uff0c\u751f\u6210\u6570\u636e\u62a5\u544a</div>
      </div>

      <div class="function-card" @click="openReportHistory">
        <div class="function-icon history"><span class="material-icons" style="font-size: 24px;">history</span></div>
        <div class="function-name">\u62a5\u544a\u751f\u6210\u8bb0\u5f55</div>
        <div class="function-desc">\u67e5\u770b\u5386\u53f2\u62a5\u544a\u751f\u6210\u8bb0\u5f55</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/store/app.store.js';

const router = useRouter();
const appStore = useAppStore();
const currentGdeProjectName = computed(() => {
  const current = appStore.projectList.find((item) => String(item.id) === String(appStore.currentProject));
  return String(current?.gdeProjectName || '').trim();
});

onMounted(async () => {
  appStore.setRole('operator');
  await appStore.loadProjects();
});

const goEntrance = () => router.push('/');
const openLakeExecute = () => router.push('/operator/execute');
const REPORT_GENERATION_URL = 'https://2000-itsc-gde-runtime.sd.huawei.com/adc-codeagent/static/rf-report/generation-entry.html';

const openReportPage = (view) => {
  const url = new URL(REPORT_GENERATION_URL);
  if (currentGdeProjectName.value) {
    url.searchParams.set('app_name', currentGdeProjectName.value);
  }
  url.searchParams.set('view', view);
  window.open(url.toString(), '_blank', 'noopener,noreferrer');
};

const openReportGeneration = () => openReportPage('upload');
const openReportHistory = () => openReportPage('history');
</script>
