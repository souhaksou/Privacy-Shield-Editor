import { createRouter, createWebHistory } from "vue-router";
import OcrFlowView from "@/views/OcrFlowView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "OcrFlow",
      component: OcrFlowView,
    },
  ],
});

export default router;
