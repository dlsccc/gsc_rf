import { createApp } from 'vue';
import App from './app.vue';
import router from './router/index.js';
import store from './store/index.js';
import i18n from './i18n/index.js';
import directive from './directives/index.js';
import './assets/styles/global.css';

const app = createApp(App);

app.use(store);
app.use(router);
app.use(i18n);
app.use(directive);
app.mount('#app');

