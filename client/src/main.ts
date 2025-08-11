import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";

// Initialize store with data from localStorage
store.dispatch('initializeStore');

createApp(App).use(store).use(router).mount("#app");
