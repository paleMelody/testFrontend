import { createRouter, createWebHashHistory } from 'vue-router'
import Page1 from '../views/Page1.vue'
import Page2 from '../views/Page2.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Page1 },
    { path: '/detail/:hour', component: Page2, props: true },
  ],
})
