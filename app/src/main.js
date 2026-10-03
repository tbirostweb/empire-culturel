import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './style.css';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

createApp(App).use(pinia).use(router).mount('#app');

// PWA : installable + shell mis en cache. Pas d'effet sur un build
// Capacitor natif packagé (le fichier est simplement absent du bundle
// natif s'il n'est pas servi), donc sans risque de casser autre chose.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker registration failed', err);
    });
  });
}
