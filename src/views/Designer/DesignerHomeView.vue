<template>
  <div class="function-menu" style="margin-top: 64px;">
    <div v-if="deployNotice.show" class="deploy-notice" :class="`deploy-notice-${deployNotice.status}`">
      <div class="deploy-notice-content">
        <span class="material-icons" :class="{ 'deploy-notice-spinning': deployNotice.status === 'processing' }">
          {{ deployNotice.status === 'processing' ? 'autorenew' : (deployNotice.status === 'success' ? 'check_circle' : 'error') }}
        </span>
        <span>{{ deployNotice.text }}</span>
      </div>
      <button
        v-if="deployNotice.status !== 'processing'"
        type="button"
        class="deploy-notice-close"
        @click="hideDeployNotice"
      >
        <span class="material-icons">close</span>
      </button>
    </div>

    <div class="menu-header">
      <div class="back-btn" @click="goEntrance"><span class="material-icons">arrow_back</span></div>
      <div class="menu-title-area">
        <div class="menu-title">
          项目差异化设计者工作台
          <div class="project-dropdown" ref="projectDropdownRef">
            <button class="project-select project-select-btn" type="button" @click.stop="toggleProjectMenu">
              <span class="project-select-text">{{ appStore.currentProjectName || '请选择项目' }}</span>
              <span class="material-icons project-select-arrow">{{ projectMenuVisible ? 'expand_less' : 'expand_more' }}</span>
            </button>
            <button class="project-add-btn" type="button" title="新增项目" @click.stop="openCreateProjectModal">
              <span class="material-icons">add</span>
            </button>
            <div v-if="projectMenuVisible" class="project-menu" @click.stop>
              <button
                v-for="project in appStore.projectList"
                :key="project.id"
                class="project-menu-item"
                :class="{ active: String(project.id) === String(appStore.currentProject) }"
                type="button"
                @click="selectProject(project.id)"
              >
                <span class="project-menu-name" :title="project.name">{{ project.name }}</span>
                <span class="project-menu-actions">
                  <span class="material-icons project-menu-action" title="编辑项目" @click.stop="openEditProjectModal(project)">edit</span>
                  <span class="material-icons project-menu-action project-menu-action-delete" title="删除项目" @click.stop="showDeleteDisabledTip">delete</span>
                </span>
              </button>
            </div>
          </div>
          <span class="role-badge designer">设计者</span>
        </div>
        <div class="menu-subtitle">基于标准模型进行数据建模，设计数据入湖规则</div>
      </div>
      <button class="btn btn-primary publish-entry-btn" @click="goPublish">发布</button>
    </div>

    <div class="function-cards">
      <div class="function-card" @click="router.push('/designer/project-models')">
        <div class="function-icon mapping"><span class="material-icons" style="font-size: 24px;">account_tree</span></div>
        <div class="function-name">数据模型设计</div>
        <div class="function-desc">基于标准模型进行数据建模，定义目标数据结构</div>
        <div class="function-status active"><span class="material-icons">check_circle</span><span>可使用</span></div>
      </div>

      <div class="function-card" @click="router.push('/designer/rules')">
        <div class="function-icon rule"><span class="material-icons" style="font-size: 24px;">rule</span></div>
        <div class="function-name">入湖规则设计</div>
        <div class="function-desc">配置字段映射、数据转换、聚合规则等入湖规则</div>
        <div class="function-status active"><span class="material-icons">check_circle</span><span>可使用</span></div>
      </div>

      <div class="function-card" @click="goReportTemplate">
        <div class="function-icon monitor"><span class="material-icons" style="font-size: 24px;">description</span></div>
        <div class="function-name">报告模板制作</div>
        <div class="function-desc">制作数据报告模板，定义报告格式与数据绑定</div>
        <div class="function-status active"><span class="material-icons">check_circle</span><span>可使用</span></div>
      </div>
    </div>
  </div>

  <div v-if="projectModal.show" class="modal-overlay" @click="closeProjectModal">
    <div class="modal project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title" @click.stop>
      <div class="modal-header">
        <span id="project-modal-title">{{ projectModal.mode === 'edit' ? '编辑项目信息' : '新增项目' }}</span>
        <span class="modal-close" role="button" tabindex="0" aria-label="关闭弹窗" @click="closeProjectModal" @keydown.enter="closeProjectModal">×</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">项目名称 <span class="required-star">*</span></label>
          <input v-model="projectForm.projectName" type="text" class="form-input" maxlength="64" placeholder="请输入项目名称">
        </div>
        <div class="form-group">
          <label class="form-label">项目编码 <span class="required-star">*</span></label>
          <input
            v-model="projectForm.projectCode"
            type="text"
            class="form-input"
            maxlength="64"
            placeholder="请输入项目编码"
            :disabled="projectModal.mode === 'edit'"
          >
          <div class="field-tip">命名要求：字母+数字</div>
        </div>
        <div class="form-group">
          <label class="form-label">工程名 <span class="required-star">*</span></label>
          <input
            v-model="projectForm.gdeProjectName"
            type="text"
            class="form-input"
            maxlength="64"
            placeholder="请输入工程名"
            :disabled="projectModal.mode === 'edit'"
          >
          <div class="field-tip">命名要求：以字母开头且只能输入字母、数字、下划线、中划线、点，长度3-64个字符，不能以[...]结尾</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-default" type="button" @click="closeProjectModal">取消</button>
        <button class="btn btn-primary" type="button" :disabled="projectModal.submitting" @click="saveProject">
          {{ projectModal.submitting ? '保存中...' : '保存' }}
        </button>
      </div>
    </div>
  </div>

  <div v-if="deployModal.show" class="modal-overlay" @click="closeDeployModal">
    <div class="modal project-modal" role="dialog" aria-modal="true" aria-labelledby="deploy-modal-title" @click.stop>
      <div class="modal-header">
        <span id="deploy-modal-title">项目部署</span>
        <span class="modal-close" role="button" tabindex="0" aria-label="关闭弹窗" @click="closeDeployModal" @keydown.enter="closeDeployModal">×</span>
      </div>
      <div class="modal-body">
        <div v-if="deployModal.loading" class="field-tip" style="font-size: 14px;">正在查询可部署信息...</div>
        <template v-else>
          <div class="form-group">
            <label class="form-label">工程名</label>
            <input :value="deployForm.appName" type="text" class="form-input" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">版本</label>
            <input :value="deployForm.appVersion" type="text" class="form-input" disabled>
          </div>
          <div class="form-group">
            <label class="form-label">环境名称</label>
            <input :value="deployEnvNamesText" type="text" class="form-input" disabled>
          </div>
          <div v-if="deployModal.statusText" class="field-tip" style="font-size: 13px;">{{ deployModal.statusText }}</div>
        </template>
      </div>
      <div class="modal-footer">
        <button class="btn btn-default" type="button" @click="closeDeployModal">取消</button>
        <button class="btn btn-primary" type="button" :disabled="deployModal.loading || deployModal.submitting || !deployForm.appName || !deployForm.appVersion || deployForm.envNames.length === 0" @click="confirmDeploy">
          {{ deployModal.submitting ? '部署中...' : '确认' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '@/store/app.store.js';
import { $error, $success, $warning } from '@/utils/message.js';
import { projectsApi } from '@/api/index.js';
import userStore from '@/store/userInfo.js';

const router = useRouter();
const appStore = useAppStore();

const projectDropdownRef = ref(null);
const projectMenuVisible = ref(false);
const projectModal = reactive({
  show: false,
  mode: 'create',
  submitting: false
});
const deployModal = reactive({
  show: false,
  loading: false,
  submitting: false,
  statusText: ''
});
const deployNotice = reactive({
  show: false,
  status: 'processing',
  text: ''
});
const projectForm = reactive({
  id: '',
  projectName: '',
  projectCode: '',
  gdeProjectName: ''
});
const deployForm = reactive({
  appName: '',
  appVersion: '',
  envNames: []
});
const deployPollingTimer = ref(null);
const deployNoticeTimer = ref(null);

const REPORT_TEMPLATE_URL = 'https://astr-lab.gts.huawei.com/dacs/rfreport#/';
const PROJECT_CODE_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/;
const GDE_PROJECT_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{2,63}$/;
const GDE_PROJECT_NAME_FORBIDDEN_SUFFIX = /(\[\.\.\.\]|\.\.\.|…|\u2026)$/;

const clearProjectForm = () => {
  projectForm.id = '';
  projectForm.projectName = '';
  projectForm.projectCode = '';
  projectForm.gdeProjectName = '';
};

const clearDeployForm = () => {
  deployForm.appName = '';
  deployForm.appVersion = '';
  deployForm.envNames = [];
  deployModal.statusText = '';
};

const loadProjectList = async () => {
  await appStore.loadProjects();
};

const closeProjectMenuOnOutsideClick = (event) => {
  if (!projectMenuVisible.value) return;
  if (projectDropdownRef.value && !projectDropdownRef.value.contains(event.target)) {
    projectMenuVisible.value = false;
  }
};

onMounted(async () => {
  appStore.setRole('designer');
  await loadProjectList();
  document.addEventListener('click', closeProjectMenuOnOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeProjectMenuOnOutsideClick);
  if (deployPollingTimer.value) {
    window.clearTimeout(deployPollingTimer.value);
    deployPollingTimer.value = null;
  }
  if (deployNoticeTimer.value) {
    window.clearTimeout(deployNoticeTimer.value);
    deployNoticeTimer.value = null;
  }
});

const toggleProjectMenu = () => {
  projectMenuVisible.value = !projectMenuVisible.value;
};

const selectProject = (projectId) => {
  appStore.setProject(projectId);
  projectMenuVisible.value = false;
};

const openCreateProjectModal = () => {
  clearProjectForm();
  projectModal.mode = 'create';
  projectModal.show = true;
  projectMenuVisible.value = false;
};

const openEditProjectModal = (project) => {
  projectForm.id = project.id ?? '';
  projectForm.projectName = project.projectName || project.name || '';
  projectForm.projectCode = project.projectCode || project.code || '';
  projectForm.gdeProjectName = project.gdeProjectName || '';
  projectModal.mode = 'edit';
  projectModal.show = true;
  projectMenuVisible.value = false;
};

const closeProjectModal = () => {
  if (projectModal.submitting) return;
  projectModal.show = false;
};

const closeDeployModal = () => {
  if (deployModal.loading || deployModal.submitting) return;
  deployModal.show = false;
  if (deployPollingTimer.value) {
    window.clearTimeout(deployPollingTimer.value);
    deployPollingTimer.value = null;
  }
};

const hideDeployNotice = () => {
  deployNotice.show = false;
  deployNotice.text = '';
  if (deployNoticeTimer.value) {
    window.clearTimeout(deployNoticeTimer.value);
    deployNoticeTimer.value = null;
  }
};

const showDeployNotice = (status, text, autoHideMs = 0) => {
  deployNotice.status = status;
  deployNotice.text = text;
  deployNotice.show = true;
  if (deployNoticeTimer.value) {
    window.clearTimeout(deployNoticeTimer.value);
    deployNoticeTimer.value = null;
  }
  if (autoHideMs > 0) {
    deployNoticeTimer.value = window.setTimeout(() => {
      hideDeployNotice();
    }, autoHideMs);
  }
};

const showDeleteDisabledTip = () => {
  $warning('暂不支持删除项目');
};

const validateProjectForm = () => {
  const projectName = String(projectForm.projectName || '').trim();
  const projectCode = String(projectForm.projectCode || '').trim();
  const gdeProjectName = String(projectForm.gdeProjectName || '').trim();

  if (!projectName) {
    $warning('请输入项目名称');
    return false;
  }
  if (!projectCode) {
    $warning('请输入项目编码');
    return false;
  }
  if (projectModal.mode !== 'edit' && !PROJECT_CODE_PATTERN.test(projectCode)) {
    $warning('项目编码命名不合规范，请按“字母+数字”填写');
    return false;
  }
  if (!gdeProjectName) {
    $warning('请输入工程名');
    return false;
  }
  if (!GDE_PROJECT_NAME_PATTERN.test(gdeProjectName) || GDE_PROJECT_NAME_FORBIDDEN_SUFFIX.test(gdeProjectName)) {
    $warning('工程名命名不合规范，请修改后重试');
    return false;
  }
  return true;
};

const saveProject = async () => {
  if (!validateProjectForm()) return;
  projectModal.submitting = true;
  const projectCode = String(projectForm.projectCode || '').trim();
  const payload = {
    ...(projectModal.mode === 'edit' ? { id: projectForm.id } : {}),
    projectName: String(projectForm.projectName || '').trim(),
    projectCode,
    gdeProjectName: String(projectForm.gdeProjectName || '').trim()
  };

  try {
    await appStore.createOrUpdateProject(payload);
    await loadProjectList();
    appStore.setProjectByCode(projectCode);
    projectModal.show = false;
    $success(projectModal.mode === 'edit' ? '项目修改成功' : '项目创建成功');
  } catch {
    $error(projectModal.mode === 'edit' ? '项目修改失败' : '项目创建失败');
  } finally {
    projectModal.submitting = false;
  }
};

const goReportTemplate = () => {
  window.open(REPORT_TEMPLATE_URL, '_target');
};

const getCurrentProject = () => appStore.projectList.find((item) => String(item.id) === String(appStore.currentProject)) || null;
const getCurrentUserAccount = () => String(userStore?.state?.userInfo?.account || '').trim();
const deployEnvNamesText = computed(() => deployForm.envNames.join(', '));

const pollDeployStatus = async () => {
  try {
    const response = await projectsApi.queryDeployStatus({
      appName: deployForm.appName,
      appVersion: deployForm.appVersion
    });
    const payload = response?.data ?? response ?? {};
    const deployStatus = String(payload?.deployStatus || payload?.status || '').trim().toLowerCase();
    if (deployStatus === 'processing') {
      showDeployNotice('processing', '部署进行中，请稍候...');
      deployPollingTimer.value = window.setTimeout(pollDeployStatus, 20000);
      return;
    }
    deployPollingTimer.value = null;
    deployModal.submitting = false;
    if (deployStatus === 'success') {
      showDeployNotice('success', '部署成功', 5000);
      $success('部署成功');
      return;
    }
    if (deployStatus === 'failed') {
      showDeployNotice('failed', '部署失败');
      $error('部署失败');
      return;
    }
    showDeployNotice('failed', String(payload?.deployStatus || payload?.status || '部署状态未知'));
  } catch {
    deployPollingTimer.value = null;
    deployModal.submitting = false;
    showDeployNotice('failed', '查询部署状态失败');
    $error('查询部署状态失败');
  }
};

const confirmDeploy = async () => {
  const userAccount = getCurrentUserAccount();
  if (!userAccount) {
    $warning('未获取到当前用户账号');
    return;
  }
  deployModal.submitting = true;
  deployModal.statusText = '';
  if (deployPollingTimer.value) {
    window.clearTimeout(deployPollingTimer.value);
    deployPollingTimer.value = null;
  }
  try {
    const response = await projectsApi.deploy({
      appName: deployForm.appName,
      appVersion: deployForm.appVersion,
      envNames: [...deployForm.envNames],
      userAccount
    });
    const payload = response?.data ?? response ?? {};
    const status = String(payload?.status || '').trim().toLowerCase();
    if (status === 'locked') {
      deployModal.submitting = false;
      $warning('有其他人正在部署');
      return;
    }
    if (status === 'deploying') {
      deployModal.submitting = false;
      deployModal.show = false;
      showDeployNotice('processing', '部署进行中，请稍候...');
      deployPollingTimer.value = window.setTimeout(pollDeployStatus, 20000);
      return;
    }
    deployModal.submitting = false;
    deployModal.show = false;
    if (status === 'success') {
      showDeployNotice('success', '部署成功', 5000);
      $success('部署成功');
      return;
    }
    if (status === 'failed') {
      showDeployNotice('failed', '部署失败');
      $error('部署失败');
      return;
    }
  } catch {
    deployModal.submitting = false;
    $error('发起部署失败');
  }
};

const goPublish = async () => {
  const currentProject = getCurrentProject();
  const appName = String(currentProject?.gdeProjectName || '').trim();
  if (!appName) {
    $warning('当前项目缺少工程名');
    return;
  }
  clearDeployForm();
  deployModal.show = true;
  deployModal.loading = true;
  try {
    const response = await projectsApi.queryDeployableInfo({ appName });
    const payload = response?.data ?? response ?? {};
    deployForm.appName = String(payload?.appName || appName).trim();
    deployForm.appVersion = String(payload?.appVersion || '').trim();
    deployForm.envNames = Array.isArray(payload?.envNames) ? payload.envNames.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    deployModal.show = false;
    $error('查询可部署信息失败');
    return;
  } finally {
    deployModal.loading = false;
  }
};

const goEntrance = () => router.push('/');
</script>

<style scoped>
.publish-entry-btn {
  min-width: 92px;
  height: 36px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.publish-entry-btn:hover {
  transform: translateY(-1px);
}

.project-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: 12px;
}

.project-select-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 168px;
  margin-left: 0;
}

.project-select-text {
  display: inline-block;
  max-width: 122px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-select-arrow {
  font-size: 18px;
}

.project-add-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--primary);
  background: #fff;
  color: var(--primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.project-add-btn:hover {
  background: var(--primary-bg);
}

.project-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 320px;
  max-height: 280px;
  overflow-y: auto;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 50;
}

.project-menu-item {
  width: 100%;
  border: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
}

.project-menu-item:hover {
  background: #f5f8ff;
}

.project-menu-item.active {
  background: var(--primary-bg);
}

.project-menu-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: 13px;
  color: var(--text);
}

.project-menu-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.project-menu-action {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--text-secondary);
}

.project-menu-action:hover {
  color: var(--primary);
  background: var(--primary-bg);
}

.project-menu-action-delete:hover {
  color: var(--danger);
  background: var(--danger-light);
}

.project-modal {
  width: 560px;
}

.required-star {
  color: var(--danger);
}

.field-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.deploy-notice {
  position: fixed;
  top: 84px;
  right: 24px;
  z-index: 120;
  min-width: 280px;
  max-width: 420px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.14);
  border: 1px solid transparent;
  background: #fff;
}

.deploy-notice-processing {
  border-color: rgba(24, 121, 184, 0.18);
  background: #f5fbff;
  color: #1879b8;
}

.deploy-notice-success {
  border-color: rgba(47, 125, 58, 0.18);
  background: #f6fff7;
  color: #2f7d3a;
}

.deploy-notice-failed {
  border-color: rgba(214, 69, 69, 0.18);
  background: #fff7f7;
  color: #c53a3a;
}

.deploy-notice-content {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
}

.deploy-notice-close {
  width: 28px;
  height: 28px;
  border: 0;
  background: transparent;
  color: inherit;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.deploy-notice-close:hover {
  background: rgba(0, 0, 0, 0.06);
}

.deploy-notice-spinning {
  animation: deploy-notice-spin 1.2s linear infinite;
}

@keyframes deploy-notice-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

</style>
