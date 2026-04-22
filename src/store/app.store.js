import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ROLES, ROLE_LABEL } from '@/utils/roles.js';
import { projectsApi } from '@/api/modules/projects.api.js';

const toText = (value) => String(value ?? '').trim();
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  const text = toText(value).toLowerCase();
  if (!text) return false;
  if (['true', '1', 'y', 'yes'].includes(text)) return true;
  if (['false', '0', 'n', 'no'].includes(text)) return false;
  return Boolean(value);
};

const BUILTIN_PROJECTS = [
  {
    id: 1,
    code: 'project11111111',
    name: '马来UM项目',
    projectCode: 'project11111111',
    projectName: '马来UM项目',
    gdeProjectName: '',
    needCreateGdeProject: false
  },
  {
    id: 2,
    code: 'project_01',
    name: '毛塔Chinguitel',
    projectCode: 'project_01',
    projectName: '毛塔Chinguitel',
    gdeProjectName: '',
    needCreateGdeProject: false
  }
];

const unwrapApiData = (response) => {
  if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data;
  }
  return response;
};

const unwrapProjectList = (response) => {
  const data = unwrapApiData(response);
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data)) return data;
  return [];
};

const normalizeProject = (project = {}, index = 0) => {
  const fallbackId = index + 1;
  const id = project.id ?? project.projectId ?? project.project_id ?? fallbackId;
  const code = toText(project.projectCode || project.code);
  const name = toText(project.projectName || project.name || code);

  return {
    ...project,
    id,
    code,
    name,
    projectCode: code,
    projectName: name,
    gdeProjectName: toText(project.gdeProjectName || project.gde_project_name),
    needCreateGdeProject: project.needCreateGdeProject !== undefined
      ? toBoolean(project.needCreateGdeProject)
      : false
  };
};

const mergeProjects = (apiList = []) => {
  const builtinList = BUILTIN_PROJECTS.map((item, index) => normalizeProject(item, index));
  const fromApi = (Array.isArray(apiList) ? apiList : [])
    .map((item, index) => normalizeProject(item, builtinList.length + index))
    .filter((item) => item.code || item.name);

  const mergedMap = new Map();
  builtinList.forEach((item) => {
    const key = item.code || `id:${String(item.id)}`;
    mergedMap.set(key, item);
  });
  fromApi.forEach((item) => {
    const key = item.code || `id:${String(item.id)}`;
    const previous = mergedMap.get(key);
    mergedMap.set(key, previous ? { ...previous, ...item } : item);
  });

  return Array.from(mergedMap.values());
};

export const useAppStore = defineStore('app', () => {
  const currentRole = ref(null);
  const projectList = ref(BUILTIN_PROJECTS.map((item, index) => normalizeProject(item, index)));
  const currentProject = ref(projectList.value[0]?.id ?? '');

  const currentProjectCode = computed(() => {
    const project = projectList.value.find((item) => String(item.id) === String(currentProject.value));
    return project?.code || '';
  });

  const currentProjectName = computed(() => {
    const project = projectList.value.find((item) => String(item.id) === String(currentProject.value));
    return project?.name || '';
  });

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
    const selected = projectList.value.find((item) => String(item.id) === String(projectId));
    if (selected) {
      currentProject.value = selected.id;
    }
  };

  const setProjectByCode = (projectCode) => {
    const project = projectList.value.find((item) => toText(item.code) === toText(projectCode));
    if (project) {
      currentProject.value = project.id;
    }
  };

  const setProjectList = (projects = []) => {
    const currentCode = toText(currentProjectCode.value);
    const merged = mergeProjects(projects);
    projectList.value = merged;

    if (currentCode) {
      const matched = merged.find((item) => toText(item.code) === currentCode);
      if (matched) {
        currentProject.value = matched.id;
        return;
      }
    }
    currentProject.value = merged[0]?.id ?? '';
  };

  const loadProjects = async () => {
    try {
      const response = await projectsApi.list({});
      const list = unwrapProjectList(response);
      setProjectList(list);
      return projectList.value;
    } catch {
      setProjectList([]);
      return projectList.value;
    }
  };

  const createOrUpdateProject = async (payload = {}) => {
    const response = await projectsApi.createOrUpdate(payload);
    return unwrapApiData(response);
  };

  return {
    currentRole,
    currentRoleLabel,
    projectList,
    currentProject,
    currentProjectCode,
    currentProjectName,
    setRole,
    setProject,
    setProjectByCode,
    setProjectList,
    loadProjects,
    createOrUpdateProject
  };
});
