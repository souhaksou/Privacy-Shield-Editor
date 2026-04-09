import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "OcrFlow",
      component: () => import("@/views/OcrFlowView.vue"),
    },
  ],
});

export default router;
