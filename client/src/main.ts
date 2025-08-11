import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import Toast from "vue-toastification";
import "vue-toastification/dist/index.css";

// Initialize store with data from localStorage
store.dispatch('initializeStore');

createApp(App).use(store).use(router).use(Toast).mount("#app");
