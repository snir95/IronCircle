import { createRouter, createWebHistory } from 'vue-router';
import LoginForm from '../components/LoginForm.vue';
import RegisterForm from '../components/RegisterForm.vue';
import ChatInterface from '../components/ChatInterface.vue';
import store from '../store';

const routes = [
  {
    path: '/',
    redirect: () => {
      return store.getters.isAuthenticated ? '/chat' : '/login'
    }
  },
  {
    path: '/login',
    name: 'login',
    component: LoginForm,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterForm,
    meta: { requiresGuest: true }
  },
  {
    path: '/chat',
    name: 'chat',
    component: ChatInterface,
    meta: { requiresAuth: true }
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/AboutView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

// Navigation guards
router.beforeEach(async (to, from, next) => {
  // Check if user is authenticated
  if (!store.getters.isAuthenticated && localStorage.getItem('token')) {
    await store.dispatch('getCurrentUser');
  }
  
  // Routes that require authentication
  if (to.meta.requiresAuth && !store.getters.isAuthenticated) {
    next('/login');
    return;
  }
  
  // Routes that require guest (not authenticated)
  if (to.meta.requiresGuest && store.getters.isAuthenticated) {
    next('/chat');
    return;
  }
  
  next();
});

export default router;
