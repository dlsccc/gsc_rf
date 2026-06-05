<template>
  <div class="model-list-container" style="margin-top: 64px; background: linear-gradient(135deg, #f6ffed 0%, #fafafa 100%);">
    <div class="model-edit-header">
      <div class="back-btn" @click="router.push('/operator')">
        <span class="material-icons">arrow_back</span>
      </div>
      <div class="model-list-title">
        <span class="material-icons" style="color: var(--success);">cloud_upload</span>
        数据入湖执行
      </div>
      <div style="flex: 1;"></div>
      <button class="btn btn-primary" @click="openLakeTaskModal">
        <span class="material-icons" style="font-size: 18px;">add</span>
        创建入湖任务
      </button>
    </div>

    <div style="padding: 24px; max-width: 1080px; margin: 0 auto;">
      <div class="content-card">
        <div class="card-header">
          <div class="card-title">执行记录</div>
        </div>
        <div class="card-body">
          <div v-if="lakeTaskRuns.length === 0" style="text-align: center; padding: 36px; color: var(--text-secondary);">
            <span class="material-icons" style="font-size: 40px; opacity: 0.35;">history</span>
            <p style="margin-top: 10px;">暂无执行记录</p>
            <p style="margin-top: 6px; font-size: 13px;">点击右上角“创建入湖任务”开始执行</p>
          </div>
          <div v-for="run in pagedLakeTaskRuns" :key="run.runId" class="model-card" style="margin-bottom: 12px;">
            <div class="model-card-header">
              <div class="model-name">
                <span class="material-icons" style="color: var(--success);">task_alt</span>
                {{ run.name }}
              </div>
              <span class="model-status" :class="getTaskStatusClass(run.taskStatus)">{{ getTaskStatusLabel(run.taskStatus) }}</span>
            </div>
            <div class="model-meta">
              <div class="model-meta-item">
                <span class="material-icons">rule</span>
                规则: {{ run.ruleName }}
              </div>
              <div class="model-meta-item">
                <span class="material-icons">attach_file</span>
                原始文件: {{ run.fileCount }} 个
              </div>
              <div class="model-meta-item">
                <span class="material-icons">schedule</span>
                {{ run.executeTime }}
              </div>
            </div>
          </div>
          <div v-if="lakeTaskRuns.length > recordPageSize" style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 16px;">
            <button class="btn btn-default btn-sm" :disabled="currentRecordPage <= 1" @click="setRecordPage(currentRecordPage - 1)">
              <span class="material-icons" style="font-size: 16px;">chevron_left</span>
            </button>
            <button
              v-for="page in recordPageNumbers"
              :key="String(page)"
              class="btn btn-sm"
              :class="Number(page) === currentRecordPage ? 'btn-primary' : 'btn-default'"
              :disabled="typeof page !== 'number'"
              @click="typeof page === 'number' && setRecordPage(page)"
            >
              {{ typeof page === 'number' ? page : '...' }}
            </button>
            <button class="btn btn-default btn-sm" :disabled="currentRecordPage >= totalRecordPages" @click="setRecordPage(currentRecordPage + 1)">
              <span class="material-icons" style="font-size: 16px;">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="lakeTaskModal.show" class="modal-overlay" @click="closeLakeTaskModal" role="presentation">
      <div class="modal lake-task-modal" @click.stop role="dialog" aria-modal="true" aria-labelledby="task-modal-title" tabindex="-1" style="max-width: 760px; width: 90%;">
        <div class="modal-header">
          <span id="task-modal-title">
            <span class="material-icons" style="font-size: 20px; vertical-align: middle; margin-right: 8px; color: var(--success);">add_task</span>
            创建入湖任务
          </span>
          <span class="modal-close" @click="closeLakeTaskModal" @keydown.enter="closeLakeTaskModal" role="button" aria-label="关闭弹窗" tabindex="0">
            <span class="material-icons">close</span>
          </span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label"><span class="material-icons">task</span>任务名称</label>
            <input v-model="lakeTaskDraft.name" class="form-input" placeholder="例如：UM_4G_小时级Counter_2026-03-11_批次1" />
          </div>

          <div class="form-group">
            <label class="form-label"><span class="material-icons">rule</span>选择已发布入湖规则</label>
            <select v-model="lakeTaskDraft.ruleId" class="form-select">
              <option value="">请选择入湖规则...</option>
              <option v-for="rule in publishedLakeRules" :key="rule.id" :value="rule.id">
                {{ rule.name }}
              </option>
            </select>
            <div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">当前项目已发布规则 {{ publishedLakeRules.length }} 条</div>
          </div>

          <div class="form-group">
            <label class="form-label"><span class="material-icons">upload_file</span>上传原始数据</label>

            <div v-if="!lakeTaskDraft.ruleId" class="empty-state" style="padding: 20px 16px;">
              <span class="material-icons" style="font-size: 28px; opacity: 0.45;">rule</span>
              <p style="margin-top: 8px;">请先选择已发布入湖规则</p>
            </div>

            <div v-else>
              <div v-for="table in taskRequiredTables" :key="table.id" style="margin-bottom: 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <div style="font-weight: 600; color: var(--text-primary);">{{ table.label }}</div>
                  <span class="tag tag-primary">需上传 1 份</span>
                </div>

                <FileUploadPanel
                  :project-id="projectId"
                  class="w-p-100 common-upload-component"
                  :isShowList="false"
                  :isSingLine="false"
                  @delete="deleteTaskUploadCallback"
                  @upload="(edmId, fileDetail) => handleTaskUploadSuccess(edmId, fileDetail, table.id)"
                />

                <div v-if="getTaskFileByTable(table.id)" class="file-card" style="margin-top: 10px;">
                  <div class="file-card-icon table-a">
                    <span class="material-icons">description</span>
                  </div>
                  <div class="file-card-info">
                    <div class="file-card-name">{{ getTaskFileByTable(table.id).name }}</div>
                    <div class="file-card-meta">{{ getTaskFileByTable(table.id).size }} · {{ getTaskFileByTable(table.id).uploadTime }}</div>
                  </div>
                  <span class="tag tag-success">
                    <span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">check_circle</span>
                    {{ table.label }}已上传
                  </span>
                  <button class="btn btn-default btn-sm" @click="removeTaskFile(table.id)">
                    <span class="material-icons" style="font-size: 16px;">delete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeLakeTaskModal">取消</button>
          <button class="btn btn-default" @click="createLakeTask">重置</button>
          <button class="btn btn-primary" :disabled="!canExecuteLakeTask" @click="executeLakeTask">
            <span class="material-icons" style="font-size: 16px;">rocket_launch</span>
            执行任务
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import FileUploadPanel from '@hw-itsc/common/src/components/upload-file/upload.vue';
import { rulesApi } from '@/api/index.js';
import { $error, $success, $warning } from '@/utils/message.js';
import { useAppStore } from '@/store/app.store.js';
import { RULE_INPUT_TABLES, mapApiRuleToEntity, normalizeRuleInputTables, unwrapApiList, useRuleStore } from '@/store/rule.store.js';
import userStore from '@/store/userInfo.js';
import { resolveEdmId } from '@/utils/fileUtils.js';

const router = useRouter();
const appStore = useAppStore();
const ruleStore = useRuleStore();

const toText = (value) => String(value ?? '').trim();

const TASK_STATUS_LABEL_MAP = {
  init: '初始化',
  running: '执行中',
  killing: '终止中',
  failed: '失败',
  finished: '完成',
  killed: '已终止'
};

const normalizeTaskStatus = (status) => toText(status).toLowerCase();

const getTaskStatusLabel = (status) => {
  const normalized = normalizeTaskStatus(status);
  return TASK_STATUS_LABEL_MAP[normalized] || TASK_STATUS_LABEL_MAP.init;
};

const getTaskStatusClass = (status) => {
  const normalized = normalizeTaskStatus(status);
  if (normalized === 'finished') {
    return 'active';
  }
  return 'draft';
};

const extractFlowTimestamp = (flowId) => {
  const text = toText(flowId);
  const match = text.match(/itsc@(\d+)/i);
  if (match) {
    return Number(match[1]) || 0;
  }
  const fallback = text.match(/(\d{6,})/);
  return fallback ? (Number(fallback[1]) || 0) : 0;
};

const lakeTaskRuns = ref([]);
const recordPageSize = 10;
const currentRecordPage = ref(1);
const taskUploadingTableId = ref('');
const taskExecuting = ref(false);
const lakeTaskDraft = reactive({
  id: null,
  name: '',
  ruleId: '',
  files: []
});

const lakeTaskModal = reactive({
  show: false
});

const projectId = computed(() => {
  return userStore.state.curTenant?.frmProjectId || userStore.state.zoneId || '';
});

const extractRuleInputTablesFromRuleJson = (rule) => {
  const ruleJson = rule?.ruleJson || {};
  const tables = ruleJson?.globalSetting?.dataSources?.tables
    || ruleJson?.global_setting?.data_sources?.tables
    || [];

  return (Array.isArray(tables) ? tables : [])
    .map((table, index) => {
      const sourceId = toText(table?.sourceId || table?.source_id || RULE_INPUT_TABLES[index]?.id || `table_${index + 1}`);
      const sourceName = toText(table?.sourceName || table?.source_name || sourceId);
      if (!sourceId) { return null; }
      return {
        id: sourceId,
        label: sourceName || sourceId
      };
    })
    .filter((item, index, arr) => item && item.id && arr.findIndex((val) => val.id === item.id) === index);
};

const loadRules = async () => {
  ruleStore.setLoading(true);
  try {
    const projectCode = toText(appStore.currentProjectCode);
    const response = await rulesApi.listPublishedByProject({ projectCode });
    const list = unwrapApiList(response);
    ruleStore.setRules(list.map((item) => mapApiRuleToEntity(item, appStore.currentProject, projectCode)));
  } catch {
    ruleStore.setRules([]);
  } finally {
    ruleStore.setLoading(false);
  }
};

const mapExecuteRecord = (item, index) => {
  const runId = toText(item?.immeTaskId || item?.flowId || item?.batchNo || item?.id || `${Date.now()}_${index}`);
  const executeTime = toText(item?.executeTime || item?.creationDate || item?.creation_time || item?.lastUpdatedDate || item?.last_updated_date || '');
  const flowId = toText(item?.flowId || item?.flow_id);
  const status = normalizeTaskStatus(item?.taskStatus);

  return {
    runId,
    name: toText(item?.batchNo || item?.ruleName || `执行任务${index + 1}`),
    ruleName: toText(item?.ruleName || item?.ruleCode || '-'),
    fileCount: '-',
    executeTime: executeTime || '-',
    taskStatus: status,
    flowId,
    flowTimestamp: extractFlowTimestamp(flowId)
  };
};

const loadExecuteRecords = async () => {
  try {
    const projectCode = toText(appStore.currentProjectCode);
    const response = await rulesApi.queryExecuteRecords({ projectCode });
    const list = unwrapApiList(response);
    const mappedList = list.map((item, index) => mapExecuteRecord(item, index));
    mappedList.sort((a, b) => b.flowTimestamp - a.flowTimestamp);
    lakeTaskRuns.value = mappedList;
    currentRecordPage.value = 1;
  } catch {
    lakeTaskRuns.value = [];
    currentRecordPage.value = 1;
  }
};

const publishedLakeRules = computed(() => {
  return ruleStore.sortedRules;
});

const selectedLakeTaskRule = computed(() => {
  return publishedLakeRules.value.find((item) => String(item.id) === String(lakeTaskDraft.ruleId)) || null;
});

const taskRequiredTables = computed(() => {
  if (!selectedLakeTaskRule.value) { return []; }
  const fromRuleJson = extractRuleInputTablesFromRuleJson(selectedLakeTaskRule.value);
  if (fromRuleJson.length > 0) { return fromRuleJson; }
  return normalizeRuleInputTables(selectedLakeTaskRule.value);
});

const totalRecordPages = computed(() => {
  return Math.max(1, Math.ceil(lakeTaskRuns.value.length / recordPageSize));
});

const pagedLakeTaskRuns = computed(() => {
  const start = (currentRecordPage.value - 1) * recordPageSize;
  return lakeTaskRuns.value.slice(start, start + recordPageSize);
});

const recordPageNumbers = computed(() => {
  const total = totalRecordPages.value;
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const current = currentRecordPage.value;
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) {
    pages.push('ellipsis-prev');
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < total - 1) {
    pages.push('ellipsis-next');
  }

  pages.push(total);
  return pages;
});

const setRecordPage = (page) => {
  const next = Number(page);
  if (!Number.isFinite(next)) { return; }
  const safePage = Math.min(Math.max(next, 1), totalRecordPages.value);
  currentRecordPage.value = safePage;
};

watch(
  () => lakeTaskDraft.ruleId,
  () => {
    lakeTaskDraft.files = [];
    taskUploadingTableId.value = '';
  }
);

watch(
  () => appStore.currentProject,
  async () => {
    await Promise.all([loadRules(), loadExecuteRecords()]);
    if (!publishedLakeRules.value.some((item) => String(item.id) === String(lakeTaskDraft.ruleId))) {
      lakeTaskDraft.ruleId = '';
    }
  }
);

const formatTaskTime = () => {
  return new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '-');
};

const formatTaskFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes < 0) { return '0 B'; }
  const units = ['B', 'KB', 'MB', 'GB'];
  let val = bytes;
  let idx = 0;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx += 1;
  }
  return `${val.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
};

const getTaskTableMeta = (tableId) => {
  return taskRequiredTables.value.find((item) => item.id === tableId)
    || RULE_INPUT_TABLES.find((item) => item.id === tableId)
    || { id: tableId, label: tableId };
};

const getTaskFileByTable = (tableId) => {
  return lakeTaskDraft.files.find((file) => file.tableId === tableId) || null;
};

const createLakeTask = () => {
  lakeTaskDraft.id = Date.now();
  lakeTaskDraft.name = `入湖任务_${new Date()
    .toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
    .replace(/\//g, '-')
    .replace(/\s/g, '_')
    .replace(/:/g, '')}`;
  lakeTaskDraft.ruleId = '';
  lakeTaskDraft.files = [];
  taskUploadingTableId.value = '';
};

const openLakeTaskModal = async () => {
  createLakeTask();
  await loadRules();
  lakeTaskModal.show = true;
  await nextTick();
};

const resetLakeTaskDraft = () => {
  lakeTaskDraft.id = null;
  lakeTaskDraft.name = '';
  lakeTaskDraft.ruleId = '';
  lakeTaskDraft.files = [];
  taskUploadingTableId.value = '';
};

const closeLakeTaskModal = () => {
  lakeTaskModal.show = false;
  resetLakeTaskDraft();
};

const handleTaskUploadSuccess = async (uploadId, fileDetail, tableId) => {
  if (!lakeTaskDraft.id) {
    $warning('请先创建入湖任务');
    return;
  }
  if (!lakeTaskDraft.ruleId) {
    $warning('请先选择入湖规则');
    return;
  }

  const requiredTables = taskRequiredTables.value;
  if (requiredTables.length === 0) {
    $warning('当前规则未配置源数据表，请先检查规则配置');
    return;
  }
  if (!requiredTables.some((table) => table.id === tableId)) {
    $warning('当前规则不需要该源数据表，请重新选择');
    return;
  }

  const tableMeta = getTaskTableMeta(tableId);
  taskUploadingTableId.value = tableId;

  try {
    const edmId = resolveEdmId(fileDetail) || resolveEdmId(uploadId);

    if (!edmId) {
      throw new Error('上传成功但未返回 fileId');
    }

    const nextFile = {
      id: `${tableId}_${edmId}`,
      tableId,
      tableLabel: tableMeta.label,
      name: toText(fileDetail?.fileName || fileDetail?.name || edmId),
      byteSize: Number(fileDetail?.fileSize ?? fileDetail?.size ?? 0),
      size: formatTaskFileSize(Number(fileDetail?.fileSize ?? fileDetail?.size ?? 0)),
      uploadTime: formatTaskTime(),
      lastModified: Number(fileDetail?.lastModified ?? Date.now()),
      edmId,
      fileCode: edmId
    };

    const oldIndex = lakeTaskDraft.files.findIndex((item) => item.tableId === tableId);
    if (oldIndex > -1) {
      lakeTaskDraft.files.splice(oldIndex, 1, nextFile);
    } else {
      lakeTaskDraft.files.push(nextFile);
    }

    lakeTaskDraft.files.sort((a, b) => {
      const aIndex = requiredTables.findIndex((table) => table.id === a.tableId);
      const bIndex = requiredTables.findIndex((table) => table.id === b.tableId);
      return aIndex - bIndex;
    });
  } catch (error) {
    $error(error?.message || '文件上传失败');
  } finally {
    taskUploadingTableId.value = '';
  }
};

const removeTaskFile = (tableId) => {
  const index = lakeTaskDraft.files.findIndex((file) => file.tableId === tableId);
  if (index >= 0) {
    lakeTaskDraft.files.splice(index, 1);
  }
};

const deleteTaskUploadCallback = () => '';

const canExecuteLakeTask = computed(() => {
  if (!lakeTaskDraft.id || !toText(lakeTaskDraft.name) || !lakeTaskDraft.ruleId) {
    return false;
  }
  if (taskRequiredTables.value.length === 0) {
    return false;
  }
  if (taskUploadingTableId.value || taskExecuting.value) {
    return false;
  }
  return taskRequiredTables.value.every((table) => !!getTaskFileByTable(table.id)?.edmId);
});

const executeLakeTask = async () => {
  if (!lakeTaskDraft.id) {
    $warning('请先创建入湖任务');
    return;
  }
  if (!toText(lakeTaskDraft.name)) {
    $warning('请输入任务名称');
    return;
  }
  if (!lakeTaskDraft.ruleId) {
    $warning('请选择入湖规则');
    return;
  }

  const selectedRule = selectedLakeTaskRule.value;
  if (!selectedRule) {
    $warning('请选择已发布的入湖规则');
    return;
  }

  const requiredTables = taskRequiredTables.value;
  if (requiredTables.length === 0) {
    $warning('当前规则未配置源数据表，请先检查规则配置');
    return;
  }

  const missingTables = requiredTables.filter((table) => !getTaskFileByTable(table.id)?.edmId);
  if (missingTables.length > 0) {
    $warning(`请上传 ${missingTables.map((table) => table.label).join('、')} 的源数据`);
    return;
  }

  const ruleCode = toText(selectedRule.ruleCode || selectedRule.id);
  if (!ruleCode) {
    $warning('规则标识缺失，无法执行任务');
    return;
  }

  const fileList = requiredTables.map((table) => {
    const file = getTaskFileByTable(table.id);
    return {
      fileName: toText(table.label || table.id),
      edmId: toText(file?.edmId)
    };
  });

  taskExecuting.value = true;

  try {
    await rulesApi.execute({ ruleCode, fileList });
    await loadExecuteRecords();

    $success('任务执行成功');
    lakeTaskModal.show = false;
    resetLakeTaskDraft();
  } catch (error) {
    const msg = toText(error?.response?.data?.msg || error?.data?.msg || error?.message);
    $error(msg || '任务执行失败');
  } finally {
    taskExecuting.value = false;
  }
};

onMounted(async () => {
  appStore.setRole('operator');
  await Promise.all([loadRules(), loadExecuteRecords()]);
});
</script>
