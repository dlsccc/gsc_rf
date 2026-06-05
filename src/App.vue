<template>
  <div>
    <div v-if="appStore.deployNotice.show" class="deploy-notice" :class="`deploy-notice-${appStore.deployNotice.status}`">
      <div class="deploy-notice-content">
        <span class="material-icons" :class="{ 'deploy-notice-spinning': appStore.deployNotice.status === 'processing' }">
          {{ deployNoticeIcon }}
        </span>
        <span>{{ appStore.deployNotice.text }}</span>
      </div>
      <button
        v-if="appStore.deployNotice.status !== 'processing'"
        type="button"
        class="deploy-notice-close"
        @click="appStore.hideDeployNotice()"
      >
        <span class="material-icons">close</span>
      </button>
    </div>
    <RouterView />
     <!-- 在Vue模板中的引入重新登录弹窗 -->
    <ItscReLoginDlg v-model:visible="loginState.isShowLoginDlg" :login-url="loginState.loginUrl" />
  </div>
</template>


<script setup>
// 在业务UI应用的页面容器的vue文件引用页面中间重新登录弹窗
import ItscReLoginDlg from '@hw-itsc/common/src/components/login/login-dlg.vue';
// 当前登录状态账号等相关数据
import { loginState } from '@hw-itsc/common/src/utils/login-util.js';
import { computed } from 'vue';
import { useAppStore } from '@/store/app.store.js';

const appStore = useAppStore();
const deployNoticeIcon = computed(() => {
  if (appStore.deployNotice.status === 'processing') {
    return 'autorenew';
  }
  if (appStore.deployNotice.status === 'success') {
    return 'check_circle';
  }
  return 'error';
});


</script>
<style lang="less">
.deploy-notice {
  position: fixed;
  top: 84px;
  right: 24px;
  z-index: 120;
  min-width: 280px;
  max-width: 420px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14);
  border: 1px solid transparent;
  background: #fff;
}

.deploy-notice-processing {
  border-color: rgba(24, 121, 184, 0.18);
  background: #f5fbff;
  color: #1879b8;
}

.deploy-notice-success {
  border-color: rgba(47, 125, 58, 0.18);
  background: #f6fff7;
  color: #2f7d3a;
}

.deploy-notice-failed {
  border-color: rgba(214, 69, 69, 0.18);
  background: #fff7f7;
  color: #c53a3a;
}

.deploy-notice-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
}

.deploy-notice-close {
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
  color: inherit;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.deploy-notice-close:hover {
  background: rgba(0, 0, 0, 0.06);
}

.deploy-notice-spinning {
  animation: deploy-notice-spin 1.2s linear infinite;
}

@keyframes deploy-notice-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.common-upload-component{
  .upload-button-box{
    .upload-button{
      width:100%;
      .upload-text{
          margin-top: 6px;
      }
    }
  }
}
</style>
