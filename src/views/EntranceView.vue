<template>
  <div class="role-entrance">
    <h1 class="entrance-title">RF无线性能监控管理平台</h1>
    <p class="entrance-subtitle">请选择您的角色以进入相应的工作空间</p>

    <div class="role-cards">
      <div class="role-card owner" @click="go('/owner', 'owner')">
        <div class="role-icon owner">
          <span class="material-icons" style="font-size: 40px;">admin_panel_settings</span>
        </div>
        <div class="role-name">场景标准化设计者</div>
        <div class="role-desc">负责标准数据模型的定义与管理</div>
        <div class="role-tasks">
          <div class="role-task-item"><span class="material-icons">check_circle</span><span>标准数据模型定义</span></div>
        </div>
      </div>

      <div class="role-card designer" @click="go('/designer', 'designer')">
        <div class="role-icon designer">
          <span class="material-icons" style="font-size: 40px;">design_services</span>
        </div>
        <div class="role-name">项目差异化设计者</div>
        <div class="role-desc">进行数据建模、规则设计与报告模板制作</div>
        <div class="role-tasks">
          <div class="role-task-item"><span class="material-icons">check_circle</span><span>数据模型设计</span></div>
          <div class="role-task-item"><span class="material-icons">check_circle</span><span>入湖规则设计</span></div>
          <div class="role-task-item"><span class="material-icons">check_circle</span><span>报告模板制作</span></div>
        </div>
      </div>

      <div class="role-card operator" @click="go('/operator', 'operator')">
        <div class="role-icon operator">
          <span class="material-icons" style="font-size: 40px;">precision_manufacturing</span>
        </div>
        <div class="role-name">作业执行人员</div>
        <div class="role-desc">执行数据入湖与报告生成任务</div>
        <div class="role-tasks">
          <div class="role-task-item"><span class="material-icons">check_circle</span><span>数据入湖</span></div>
          <div class="role-task-item"><span class="material-icons">check_circle</span><span>报告生成</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAppStore } from '@/store/app.store.js';

const router = useRouter();
const appStore = useAppStore();

const go = (path, role) => {
  appStore.setRole(role);
  router.push(path);
};
</script>


