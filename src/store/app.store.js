import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ROLES, ROLE_LABEL } from '../utils/roles.js';

export const useAppStore = defineStore('app', () => {
  const currentRole = ref(null);
  const projectList = ref([
    { id: 1, name: '马来UM项目' }
  ]);
  const currentProject = ref(1);

  const currentRoleLabel = computed(() => {
    if (!currentRole.value) return '未选择角色';
    return ROLE_LABEL[currentRole.value] || currentRole.value;
  });

  const setRole = (role) => {
    if (Object.values(ROLES).includes(role)) {
      currentRole.value = role;
      return;
    }
    currentRole.value = null;
  };

  const setProject = (projectId) => {
    const id = Number(projectId);
    if (projectList.value.some((item) => item.id === id)) {
      currentProject.value = id;
    }
  };

  return {
    currentRole,
    currentRoleLabel,
    projectList,
    currentProject,
    setRole,
    setProject
  };
});


