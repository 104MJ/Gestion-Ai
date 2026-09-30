import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router.js';
import { useData } from './stores/data.js';
import { APP_NAME } from './config.js';
import './assets/main.css';

document.title = APP_NAME;
const app = createApp(App).use(createPinia()).use(router);
useData()
  .init()
  .then(() => app.mount('#app'));
try {
  navigator.storage && navigator.storage.persist && navigator.storage.persist();
} catch (e) {}
