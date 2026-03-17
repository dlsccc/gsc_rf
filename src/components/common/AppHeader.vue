<template>
  <header class="header" :class="{ simple: isEntrance }">
    <div class="logo" style="cursor: pointer;" @click="goToEntrance">
      <div class="logo-icon"><span class="material-icons">cloud_upload</span></div>
      <span>RF无线性能监控</span>
    </div>

    <div v-if="showStepper" class="stepper">
      <div
        v-for="(step, index) in pipelineStore.steps"
        :key="step"
        class="step-item"
        :class="{ active: pipelineStore.currentStep === index, completed: pipelineStore.currentStep > index }"
        @click="pipelineStore.moveStep(index)"
      >
        <div class="step-number">
          <span v-if="pipelineStore.currentStep > index" class="material-icons" style="font-size: 16px;">check</span>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span class="step-label">{{ step }}</span>
      </div>
    </div>

    <div class="user-info" v-show="!isEntrance">
      <span style="font-size: 14px; color: #8c8c8c;">{{ appStore.currentRoleLabel }}</span>
      <div class="user-avatar">{{ currentUserInitial }}</div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppStore } from '@/store/app.store.js';
import { usePipelineStore } from '@/store/pipeline.store.js';

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const pipelineStore = usePipelineStore();

const isEntrance = computed(() => route.name === 'entrance');
const showStepper = computed(() => ['pipeline', 'rule-new', 'rule-edit'].includes(route.name));

const currentUserInitial = computed(() => {
  if (appStore.currentRole === 'owner') return 'O';
  if (appStore.currentRole === 'designer') return 'D';
  if (appStore.currentRole === 'operator') return 'P';
  return 'U';
});

const goToEntrance = () => {
  router.push('/');
};
</script>


