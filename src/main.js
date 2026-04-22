import { createApp } from 'vue';
import ElementPlus  from 'element-plus';
import App from '@/app.vue';
import router from '@/router/index.js';
import { pinia } from '@/store/index.js';
import i18n from '@/i18n/index.js';
import directive from '@/directives/index.js';
import { initAppData } from '@/utils/app-utils.js';

import { itscLogin ,itscLogout } from '@hw-itsc/common/src/utils/login-util.js';
import userStore from '@/store/userInfo.js';

import '@/assets/styles/global.css';
import '@hw-itsc/common/src/style/index.less';
import '@hw-seq/sweet-ui-base/dist/sweet-ui-base.css';
import sweetBase from '@hw-seq/sweet-ui-base';
sweetBase.setTheme('light');

itscLogin().then( async (userInfo)=>{
  userStore.userInfo = userInfo;
  await initAppData(userInfo);

  const app = createApp(App);
  app.use(ElementPlus);
  app.use(sweetBase);
  app.use(pinia);
  app.use(router);
  app.use(i18n);
  app.use(directive);
  app.mount('#app');
})