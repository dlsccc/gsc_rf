<template>
  <div class="function-menu" style="margin-top: 64px;">
    <div class="menu-header">
      <div class="back-btn" @click="goEntrance"><span class="material-icons">arrow_back</span></div>
      <div class="menu-title-area">
        <div class="menu-title">
          作业执行人员工作台
          <select class="project-select" :value="appStore.currentProject" @change="appStore.setProject($event.target.value)">
            <option v-for="project in appStore.projectList" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
          <span class="role-badge operator">作业执行人员</span>
        </div>
        <div class="menu-subtitle">执行数据入湖与报告生成任务</div>
      </div>
    </div>

    <div class="function-cards">
      <div class="function-card" @click="openLakeExecute">
        <div class="function-icon execute"><span class="material-icons" style="font-size: 24px;">cloud_upload</span></div>
        <div class="function-name">数据入湖</div>
        <div class="function-desc">选择入湖规则，执行数据入湖任务</div>
      </div>

      <div class="function-card" @click="openReportGeneration">
        <div class="function-icon history"><span class="material-icons" style="font-size: 24px;">assessment</span></div>
        <div class="function-name">报告生成</div>
        <div class="function-desc">选择报告模板，生成数据报告</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/store/app.store.js';

const router = useRouter();
const appStore = useAppStore();

onMounted(async () => {
  appStore.setRole('operator');
  await appStore.loadProjects();
});

const goEntrance = () => router.push('/');
const openLakeExecute = () => router.push('/operator/execute');
const REPORT_GENERATION_URL = 'https://2000-itsc-gde-runtime.sd.huawei.com/adc-codeagent/static/rf-report/generation-entry.html';

const openReportGeneration = () => {
  window.open(REPORT_GENERATION_URL, '_blank', 'noopener,noreferrer');
};
</script>
