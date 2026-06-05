import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { ROLES, ROLE_LABEL } from '@/utils/roles.js';
import { projectsApi } from '@/api/modules/projects.api.js';

const DEPLOY_POLL_INTERVAL_MS = 20000;
const DEPLOY_PROCESSING_STATUSES = new Set(['processing', 'deploying']);

const toText = (value) => String(value ?? '').trim();
const toBoolean = (value) => {
  if (typeof value === 'boolean') { return value; }
  const text = toText(value).toLowerCase();
  if (!text) { return false; }
  if (['true', '1', 'y', 'yes'].includes(text)) { return true; }
  if (['false', '0', 'n', 'no'].includes(text)) { return false; }
  return Boolean(value);
};

const unwrapApiData = (response) => {
  if (response && typeof response === 'object' && Object.prototype.hasOwnProperty.call(response, 'data')) {
    return response.data;
  }
  return response;
};

const unwrapProjectList = (response) => {
  const data = unwrapApiData(response);
  if (Array.isArray(data?.list)) { return data.list; }
  if (Array.isArray(data)) { return data; }
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

export const useAppStore = defineStore('app', () => {
  const currentRole = ref(null);
  const projectList = ref([]);
  const currentProject = ref('');
  const deployNotice = reactive({
    show: false,
    status: 'processing',
    text: '',
    appName: '',
    appVersion: ''
  });
  let deployPollingTimer = null;
  let deployNoticeTimer = null;
  let deployPollingInFlight = false;

  const currentProjectCode = computed(() => {
    const project = projectList.value.find((item) => String(item.id) === String(currentProject.value));
    return project?.code || '';
  });

  const currentProjectName = computed(() => {
    const project = projectList.value.find((item) => String(item.id) === String(currentProject.value));
    return project?.name || '';
  });

  const currentRoleLabel = computed(() => {
    if (!currentRole.value) { return '未选择角色'; }
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
    const nextList = (Array.isArray(projects) ? projects : [])
      .map((item, index) => normalizeProject(item, index))
      .filter((item) => item.code || item.name);

    projectList.value = nextList;

    if (currentCode) {
      const matched = nextList.find((item) => toText(item.code) === currentCode);
      if (matched) {
        currentProject.value = matched.id;
        return;
      }
    }

    currentProject.value = nextList[0]?.id ?? '';
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

  const clearDeployNoticeTimers = () => {
    if (deployPollingTimer) {
      window.clearTimeout(deployPollingTimer);
      deployPollingTimer = null;
    }
    if (deployNoticeTimer) {
      window.clearTimeout(deployNoticeTimer);
      deployNoticeTimer = null;
    }
  };

  const scheduleDeployPolling = (delay = DEPLOY_POLL_INTERVAL_MS) => {
    if (deployPollingTimer) {
      window.clearTimeout(deployPollingTimer);
    }
    deployPollingTimer = window.setTimeout(() => {
      pollDeployStatus();
    }, delay);
  };

  const stopDeployPolling = () => {
    if (deployPollingTimer) {
      window.clearTimeout(deployPollingTimer);
      deployPollingTimer = null;
    }
    deployPollingInFlight = false;
  };

  const hideDeployNotice = () => {
    deployNotice.show = false;
    deployNotice.text = '';
    if (deployNoticeTimer) {
      window.clearTimeout(deployNoticeTimer);
      deployNoticeTimer = null;
    }
  };

  const showDeployNotice = (status, text, options = {}) => {
    const { appName = deployNotice.appName, appVersion = deployNotice.appVersion, autoHideMs = 0 } = options || {};
    deployNotice.status = toText(status) || 'processing';
    deployNotice.text = toText(text);
    deployNotice.appName = toText(appName);
    deployNotice.appVersion = toText(appVersion);
    deployNotice.show = true;
    if (deployNoticeTimer) {
      window.clearTimeout(deployNoticeTimer);
      deployNoticeTimer = null;
    }
    if (autoHideMs > 0) {
      deployNoticeTimer = window.setTimeout(() => {
        hideDeployNotice();
      }, autoHideMs);
    }
  };

  const normalizeDeployStatus = (value) => toText(value).toLowerCase();

  const pollDeployStatus = async () => {
    if (deployPollingInFlight) { return; }

    const appName = toText(deployNotice.appName);
    const appVersion = toText(deployNotice.appVersion);
    if (!appName || !appVersion) { return; }

    deployPollingTimer = null;
    deployPollingInFlight = true;

    try {
      const response = await projectsApi.queryDeployStatus({ appName, appVersion });
      const payload = unwrapApiData(response) || {};
      const deployStatus = normalizeDeployStatus(payload.deployStatus || payload.status);

      if (DEPLOY_PROCESSING_STATUSES.has(deployStatus)) {
        showDeployNotice('processing', '部署进行中，请稍候...', { appName, appVersion });
        deployPollingInFlight = false;
        scheduleDeployPolling();
        return;
      }

      stopDeployPolling();

      if (deployStatus === 'success') {
        showDeployNotice('success', '部署成功', { appName, appVersion, autoHideMs: 5000 });
        return;
      }
      if (deployStatus === 'failed') {
        showDeployNotice('failed', '部署失败', { appName, appVersion });
        return;
      }
      showDeployNotice('failed', toText(payload.deployStatus || payload.status || '部署状态未知'), { appName, appVersion });
    } catch {
      stopDeployPolling();
      showDeployNotice('failed', '查询部署状态失败', { appName, appVersion });
    } finally {
      if (deployPollingInFlight) {
        deployPollingInFlight = false;
      }
    }
  };

  const startDeployPolling = ({ appName = '', appVersion = '' } = {}) => {
    clearDeployNoticeTimers();
    deployPollingInFlight = false;
    showDeployNotice('processing', '部署进行中，请稍候...', { appName, appVersion });
    scheduleDeployPolling(0);
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
    createOrUpdateProject,
    deployNotice,
    hideDeployNotice,
    showDeployNotice,
    startDeployPolling,
    stopDeployPolling
  };
});
