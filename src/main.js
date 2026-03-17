import { createApp } from 'vue';
import App from './app.vue';
import router from './router';
import store from './store';
import i18n from './i18n';
import directive from './directives';
import './assets/styles/global.css';

const app = createApp(App);

app.use(store);
app.use(router);
app.use(i18n);
app.use(directive);
app.mount('#app');
