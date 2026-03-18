<template>
  <div>
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


</script>