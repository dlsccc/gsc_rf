<template>
  <div class="function-menu" style="margin-top: 64px;">
    <div class="menu-header">
      <div class="back-btn" @click="goEntrance"><span class="material-icons">arrow_back</span></div>
      <div class="menu-title-area">
        <div class="menu-title">场景标准化设计者工作台 <span class="role-badge owner">Owner</span></div>
        <div class="menu-subtitle">管理标准数据模型，制定数据标准规范</div>
      </div>
    </div>

    <div class="data-architecture-diagram svg-wrap">
      <svg class="arch-svg" viewBox="0 0 520 320" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowPurple" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#7c3aed" />
          </marker>
        </defs>

        <rect x="195" y="16" width="130" height="48" rx="10" class="node root" />
        <text x="260" y="46" text-anchor="middle" class="txt root">站点</text>

        <line x1="260" y1="64" x2="110" y2="108" class="line arrow" />
        <line x1="260" y1="64" x2="260" y2="108" class="line arrow" />
        <line x1="260" y1="64" x2="410" y2="108" class="line arrow" />

        <rect x="60" y="108" width="100" height="40" rx="8" class="node lvl2" />
        <rect x="210" y="108" width="100" height="40" rx="8" class="node lvl2" />
        <rect x="360" y="108" width="100" height="40" rx="8" class="node lvl2" />
        <text x="110" y="134" text-anchor="middle" class="txt">站点清单</text>
        <text x="260" y="134" text-anchor="middle" class="txt">站点状态</text>
        <text x="410" y="134" text-anchor="middle" class="txt">站点配置</text>

        <line x1="110" y1="148" x2="50" y2="190" class="line arrow" />
        <line x1="110" y1="148" x2="110" y2="190" class="line arrow" />
        <line x1="110" y1="148" x2="170" y2="190" class="line arrow" />

        <rect x="30" y="190" width="40" height="90" rx="8" class="node leaf" />
        <rect x="90" y="190" width="40" height="90" rx="8" class="node leaf" />
        <rect x="150" y="190" width="40" height="90" rx="8" class="node leaf" />

        <text x="50" y="225" text-anchor="middle" class="txt vert">工参表</text>
        <text x="110" y="225" text-anchor="middle" class="txt vert">规划数据</text>
        <text x="170" y="225" text-anchor="middle" class="txt vert">开站计划</text>

        <line x1="260" y1="148" x2="260" y2="196" class="line arrow" />
        <rect x="210" y="196" width="100" height="48" rx="8" class="node leaf wide" />
        <text x="260" y="226" text-anchor="middle" class="txt">站点实时状态</text>

        <line x1="410" y1="148" x2="410" y2="196" class="line arrow" />
        <rect x="360" y="196" width="100" height="48" rx="8" class="node leaf wide" />
        <text x="410" y="226" text-anchor="middle" class="txt">配置表</text>
      </svg>

      <svg class="arch-svg" viewBox="0 0 520 340" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrowPurple2" markerWidth="6" markerHeight="6" refX="4.5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#7c3aed" />
          </marker>
        </defs>

        <rect x="195" y="16" width="130" height="48" rx="10" class="node root" />
        <text x="260" y="46" text-anchor="middle" class="txt root">指标</text>

        <line x1="260" y1="64" x2="110" y2="108" class="line arrow2" />
        <line x1="260" y1="64" x2="260" y2="108" class="line arrow2" />
        <line x1="260" y1="64" x2="410" y2="108" class="line arrow2" />

        <rect x="60" y="108" width="100" height="40" rx="8" class="node lvl2" />
        <rect x="210" y="108" width="100" height="40" rx="8" class="node lvl2" />
        <rect x="360" y="108" width="100" height="40" rx="8" class="node lvl2" />
        <text x="110" y="134" text-anchor="middle" class="txt">对象</text>
        <text x="260" y="134" text-anchor="middle" class="txt">时间</text>
        <text x="410" y="134" text-anchor="middle" class="txt">采样</text>

        <rect x="110" y="180" width="300" height="40" rx="8" class="node leaf wide" />
        <rect x="110" y="230" width="300" height="40" rx="8" class="node leaf wide" />
        <rect x="110" y="280" width="300" height="40" rx="8" class="node leaf wide" />
        <text x="260" y="206" text-anchor="middle" class="txt">性能数据（PRE）</text>
        <text x="260" y="256" text-anchor="middle" class="txt">性能数据（POST）</text>
        <text x="260" y="306" text-anchor="middle" class="txt">Alarm</text>
      </svg>
    </div>

    <div class="function-cards">
      <div class="function-card" @click="router.push('/owner/standard-models')">
        <div class="function-icon model"><span class="material-icons" style="font-size: 24px;">schema</span></div>
        <div class="function-name">标准数据模型定义</div>
        <div class="function-desc">定义标准数据模型结构，包括字段名称、类型、约束条件等规范</div>
        <div class="function-status active"><span class="material-icons">check_circle</span><span>可使用</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../../store/app.store';

const router = useRouter();
const appStore = useAppStore();

onMounted(() => {
  appStore.setRole('owner');
});

const goEntrance = () => router.push('/');
</script>

