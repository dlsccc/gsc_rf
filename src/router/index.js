import { createRouter, createWebHashHistory } from 'vue-router';
import AppLayout from '@/views/layouts/AppLayout.vue';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: 'entrance' },
        { path: 'entrance', name: 'entrance', component: () => import('@/views/EntranceView.vue') },
        { path: 'owner', name: 'owner-home', component: () => import('@/views/Owner/OwnerHomeView.vue') },
        { path: 'owner/standard-models', name: 'standard-model-list', component: () => import('@/views/Owner/StandardModelListView.vue') },
        { path: 'owner/standard-models/new', name: 'standard-model-new', component: () => import('@/views/Owner/StandardModelEditorView.vue') },
        { path: 'owner/standard-models/:id/edit', name: 'standard-model-edit', component: () => import('@/views/Owner/StandardModelEditorView.vue') },
        { path: 'designer', name: 'designer-home', component: () => import('@/views/Designer/DesignerHomeView.vue') },
        { path: 'designer/rules', name: 'rule-list', component: () => import('@/views/Designer/RuleListView.vue') },
        { path: 'designer/rules/new', name: 'rule-new', component: () => import('@/views/Designer/RuleEditorView.vue') },
        { path: 'designer/rules/:id/edit', name: 'rule-edit', component: () => import('@/views/Designer/RuleEditorView.vue') },
        { path: 'designer/project-models', name: 'project-model-list', component: () => import('@/views/Designer/ProjectModelListView.vue') },
        { path: 'designer/project-models/new', name: 'project-model-new', component: () => import('@/views/Designer/ProjectModelEditorView.vue') },
        { path: 'designer/project-models/:id/edit', name: 'project-model-edit', component: () => import('@/views/Designer/ProjectModelEditorView.vue') },
        { path: 'designer/publish', name: 'designer-publish', component: () => import('@/views/Designer/PublishWorkbenchView.vue') },
        { path: 'designer/pipeline', name: 'pipeline', redirect: '/designer/rules/new' },
        { path: 'operator', name: 'operator-home', component: () => import('@/views/Operator/OperatorHomeView.vue') },
        { path: 'operator/execute', name: 'operator-execute', component: () => import('@/views/Operator/LakeExecuteView.vue') }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue')
    }
  ]
});

export default router;

