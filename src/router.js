import { createRouter, createWebHashHistory } from 'vue-router';
import TodayView from './views/TodayView.vue';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'today', component: TodayView },
    { path: '/depenses', name: 'expenses', component: () => import('./views/ExpensesView.vue') },
    { path: '/coffres', name: 'vaults', component: () => import('./views/VaultsView.vue') },
    { path: '/courses', name: 'courses', component: () => import('./views/CoursesView.vue') },
    {
      path: '/courses/:listKey',
      name: 'list',
      component: () => import('./views/GroceryListView.vue'),
      props: true
    },
    { path: '/abonnements', name: 'subs', component: () => import('./views/SubsView.vue') },
    { path: '/histoire', name: 'story', component: () => import('./views/StoryView.vue') },
    { path: '/reglages', name: 'settings', component: () => import('./views/SettingsView.vue') },
    { path: '/:p(.*)*', redirect: '/' }
  ],
  scrollBehavior: () => ({ top: 0 })
});
