<template>
  <div class="function-menu" style="margin-top: 64px;">
    <div class="menu-header">
      <div class="back-btn" @click="goEntrance"><span class="material-icons">arrow_back</span></div>
      <div class="menu-title-area">
        <div class="menu-title">
          项目差异化设计者工作台
          <select class="project-select" :value="appStore.currentProject" @change="appStore.setProject($event.target.value)">
            <option v-for="project in appStore.projectList" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
          <span class="role-badge designer">设计者</span>
        </div>
        <div class="menu-subtitle">基于标准模型进行数据建模，设计数据入湖规则</div>
      </div>
    </div>

    <div class="function-cards">
      <div class="function-card" @click="router.push('/designer/project-models')">
        <div class="function-icon mapping"><span class="material-icons" style="font-size: 24px;">account_tree</span></div>
        <div class="function-name">数据模型设计</div>
        <div class="function-desc">基于标准模型进行数据建模，定义目标数据结构</div>
        <div class="function-status active"><span class="material-icons">check_circle</span><span>可使用</span></div>
      </div>

      <div class="function-card" @click="router.push('/designer/rules')">
        <div class="function-icon rule"><span class="material-icons" style="font-size: 24px;">rule</span></div>
        <div class="function-name">入湖规则设计</div>
        <div class="function-desc">配置字段映射、数据转换、聚合规则等入湖规则</div>
        <div class="function-status active"><span class="material-icons">check_circle</span><span>可使用</span></div>
      </div>

      <div class="function-card" @click="goReportTemplate">
        <div class="function-icon monitor"><span class="material-icons" style="font-size: 24px;">description</span></div>
        <div class="function-name">报告模板制作</div>
        <div class="function-desc">制作数据报告模板，定义报告格式与数据绑定</div>
        <div class="function-status active"><span class="material-icons">check_circle</span><span>可使用</span></div>
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

onMounted(() => {
  appStore.setRole('designer');
});

const REPORT_TEMPLATE_URL = 'https://astr-lab.gts.huawei.com/dacs/rfreport#/';

const goReportTemplate = () => {
  window.open(REPORT_TEMPLATE_URL,'_target')
};

const goEntrance = () => router.push('/');
</script>

