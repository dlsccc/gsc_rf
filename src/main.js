import { createApp } from 'vue';
import ElementPlus  from 'element-plus';
import App from '@/app.vue';
import router from '@/router/index.js';
import { pinia } from '@/store/index.js';
import i18n from '@/i18n/index.js';
import directive from '@/directives/index.js';
import '@/assets/styles/global.css';

import { itscLogin ,itscLogout } from '@hw-itsc/common/src/utils/login-util.js';
import userStore from '@/store/userInfo.js';

import '@hw-itsc/common/src/style/index.less';

itscLogin().then(userInfo=>{
  userStore.userInfo = userInfo;

  const app = createApp(App);
  app.use(ElementPlus);
  app.use(pinia);
  app.use(router);
  app.use(i18n);
  app.use(directive);
  app.mount('#app');
})