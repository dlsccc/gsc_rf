<template>
  <div style="margin-top: 64px; height: calc(100vh - 64px); display: flex; flex-direction: column;">
    <div class="rule-edit-header" style="padding: 16px 24px; background: #fff; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 16px;">
      <div class="back-btn" @click="router.push('/designer/rules')"><span class="material-icons">arrow_back</span></div>
      <div style="flex: 1; display: flex; align-items: center; gap: 16px;">
        <input v-model="form.name" type="text" class="form-input" placeholder="请输入规则名称" style="max-width: 300px; font-weight: 600;" />
        <span v-if="isEdit" class="tag tag-success">编辑中</span>
        <span v-else class="tag tag-warning">新建</span>
      </div>
      <button class="btn btn-primary" @click="saveRule">
        <span class="material-icons" style="font-size: 18px;">save</span>
        保存规则
      </button>
    </div>

    <div class="main-container" style="display: flex; flex: 1; overflow: hidden;">
      <main class="content">
        <div class="content-card">
          <div v-show="pipelineStore.currentStep === 0">
            <div class="card-header">
              <div class="card-title">选择目标模型并上传原始数据</div>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label"><span class="material-icons">database</span>目标数据模型</label>
                <select class="form-select" :value="pipelineStore.selectedModelId" @change="onSelectModel($event.target.value)">
                  <option value="">请选择目标数据模型</option>
                  <option v-if="publishedProjectModels.length === 0" value="" disabled>当前项目暂无已发布模型</option>
                  <option v-for="model in publishedProjectModels" :key="model.id" :value="model.id">{{ model.name }}</option>
                </select>
              </div>

              <div v-if="targetModelPreviewFields.length" class="form-group">
                <label class="form-label"><span class="material-icons">view_column</span>模型字段预览</label>
                <div class="data-grid-container" style="max-height: 220px;">
                  <table class="data-grid">
                    <thead>
                      <tr>
                        <th>字段名称</th>
                        <th>字段类型</th>
                        <th>是否维度</th>
                        <th>说明</th>
                        <th>样例值</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="field in targetModelPreviewFields" :key="field.name">
                        <td>{{ field.name }}</td>
                        <td><span class="tag" :class="field.type === 'STRING' ? 'tag-primary' : 'tag-warning'">{{ field.type }}</span></td>
                        <td>{{ field.isDimension ? '是' : '否' }}</td>
                        <td>{{ field.description }}</td>
                        <td style="color: var(--text-secondary); font-family: monospace;">{{ field.sampleValue }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <FileUploadPanel :store="pipelineStore" />
            </div>
          </div>

          <div v-show="pipelineStore.currentStep === 1">
            <div class="card-header">
              <div class="card-title">字段映射配置</div>
              <div class="step-actions">
                <button class="btn btn-default btn-sm" @click="autoMap">
                  <span class="material-icons" style="font-size: 16px; vertical-align: middle;">auto_fix_high</span>
                  自动匹配
                </button>
              </div>
            </div>
            <div class="card-body">
              <FieldMappingPanel :store="pipelineStore" />
            </div>
          </div>

          <div v-show="pipelineStore.currentStep === 2">
            <div class="card-header">
              <div class="card-title">数据处理配置</div>
            </div>
            <div class="card-body">
              <ProcessPanel :store="pipelineStore" />
            </div>
          </div>

          <div v-show="pipelineStore.currentStep === 3">
            <div class="card-header">
              <div class="card-title">写入配置</div>
            </div>
            <div class="card-body">
              <WriteConfigPanel :store="pipelineStore" @execute="executeJob" />
            </div>
          </div>

          <div class="nav-buttons">
            <div>
              <button v-if="pipelineStore.currentStep > 0" class="btn btn-default" @click="pipelineStore.prevStep">
                <span class="material-icons" style="font-size: 18px;">arrow_back</span>
                上一步
              </button>
            </div>
            <div>
              <button
                v-if="pipelineStore.currentStep < pipelineStore.steps.length - 1"
                class="btn btn-primary"
                :disabled="!pipelineStore.canProceed"
                @click="pipelineStore.nextStep"
              >
                下一步
                <span class="material-icons" style="font-size: 18px;">arrow_forward</span>
              </button>
              <button v-else class="btn btn-primary" @click="executeJob">
                <span class="material-icons" style="font-size: 18px;">rocket_launch</span>
                发布入库流
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { projectModelsApi, rulesApi } from '@/api/index.js';
import { nowText } from '@/utils/date.js';
import { buildPipelineDsl } from '@/utils/pipeline-dsl.js';
import { useAppStore } from '@/store/app.store.js';
import { normalizeProjectModel, resolveModelCode, unwrapApiData, unwrapApiList, useModelStore } from '@/store/model.store.js';
import { RULE_INPUT_TABLES, mapApiRuleToEntity, toSaveRulePayload, useRuleStore } from '@/store/rule.store.js';
import { usePipelineStore } from '@/store/pipeline.store.js';
import FileUploadPanel from '@/components/pipeline/FileUploadPanel.vue';
import FieldMappingPanel from '@/components/pipeline/FieldMappingPanel.vue';
import ProcessPanel from '@/components/pipeline/ProcessPanel.vue';
import WriteConfigPanel from '@/components/pipeline/WriteConfigPanel.vue';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();
const ruleStore = useRuleStore();
const pipelineStore = usePipelineStore();

const isEdit = computed(() => !!route.params.id);

const form = reactive({
  id: null,
  name: '',
  description: '',
  status: 'draft',
  targetModel: '',
  projectId: null
});

const publishedProjectModels = computed(() => {
  return modelStore.projectModels.filter((item) => Number(item.projectId) === Number(appStore.currentProject) && item.status === 'active');
});

const targetModelPreviewFields = computed(() => {
  return pipelineStore.targetFields.map((field) => ({
    name: field.name,
    type: field.type,
    isDimension: !!field.isDimension,
    description: field.description,
    sampleValue: field.sampleValue || field.example || ''
  }));
});

const resolveCurrentProjectCode = () => {
  return String(appStore.currentProjectCode || appStore.currentProject || '').trim();
};

const loadProjectModels = async () => {
  try {
    const projectCode = resolveCurrentProjectCode();
    const response = await projectModelsApi.list({ modelType: 'business', ...(projectCode ? { projectCode } : {}) });
    const list = unwrapApiList(response);
    modelStore.setProjectModels(list.map((item) => normalizeProjectModel(item, appStore.currentProject, projectCode)));
  } catch {
    modelStore.setProjectModels([]);
  }
};

const loadProjectModelDetail = async (modelCodeOrId) => {
  const target = modelStore.getProjectModelById(modelCodeOrId);
  if (!target) return null;

  const code = resolveModelCode(target) || String(modelCodeOrId || '').trim();
  if (!code) return target;

  try {
    const response = await projectModelsApi.detail({ code });
    const detail = unwrapApiData(response);
    if (!detail) return target;

    const merged = normalizeProjectModel({
      ...target,
      ...detail,
      id: target.id || code
    }, target.projectId || appStore.currentProject, target.projectCode || resolveCurrentProjectCode());
    modelStore.upsertProjectModelLocal(merged);
    return merged;
  } catch {
    return target;
  }
};

const loadRules = async () => {
  ruleStore.setLoading(true);
  try {
    const response = await rulesApi.list({ pageNum: 1, pageSize: 200 });
    const list = unwrapApiList(response);
    if (list.length > 0) {
      ruleStore.setRules(list.map((item) => mapApiRuleToEntity(item, appStore.currentProject)));
    }
  } catch {
    // 无后端时保留本地状态。
  } finally {
    ruleStore.setLoading(false);
  }
};

const resolveRuleInputTablesForSave = () => {
  if (pipelineStore.uploadedFiles.length > 0) {
    return RULE_INPUT_TABLES
      .slice(0, Math.min(pipelineStore.uploadedFiles.length, 2))
      .map((table) => ({ ...table }));
  }
  return [{ ...RULE_INPUT_TABLES[0] }];
};

const setForm = (rule) => {
  form.id = rule?.id || null;
  form.name = rule?.name || '';
  form.description = rule?.description || '';
  form.status = rule?.status || 'draft';
  form.targetModel = rule?.targetModel || '';
  form.projectId = rule?.projectId || appStore.currentProject;
};

const resolveSelectedModel = () => {
  return publishedProjectModels.value.find((item) => String(item.id) === String(pipelineStore.selectedModelId)) || null;
};

const onSelectModel = async (modelId) => {
  pipelineStore.setModel(modelId);
  await loadProjectModelDetail(modelId);
};

onMounted(async () => {
  appStore.setRole('designer');
  await loadProjectModels();
  await loadRules();

  pipelineStore.resetPipeline();

  if (isEdit.value) {
    const targetRule = ruleStore.getRuleById(route.params.id);
    setForm(targetRule);

    const model = publishedProjectModels.value.find((item) => {
      const modelCode = String(item.modelCode || item.code || '').trim();
      const modelName = String(item.name || '').trim();
      return modelCode === String(form.targetModel).trim() || modelName === String(form.targetModel).trim();
    });

    if (model) {
      await onSelectModel(model.id);
    }
    return;
  }

  setForm(null);
});

const autoMap = () => {
  const nextMappings = {};
  pipelineStore.targetFields.forEach((field) => {
    const found = pipelineStore.sourceFields.find((source) => source.name.toLowerCase() === field.name.toLowerCase());
    if (found) {
      nextMappings[field.name] = [found.key];
    }
  });
  pipelineStore.setMappings(nextMappings);
};

const buildCurrentDsl = (selectedModel) => {
  return buildPipelineDsl({
    ruleName: form.name || selectedModel.name,
    projectId: appStore.currentProject,
    selectedModel,
    uploadedFiles: pipelineStore.uploadedFiles,
    mappings: pipelineStore.mappings,
    joinConfig: pipelineStore.joinConfig,
    filters: pipelineStore.filters,
    transforms: pipelineStore.transforms,
    sortConfig: pipelineStore.sortConfig,
    dedupConfig: pipelineStore.dedupConfig,
    writeConfig: pipelineStore.writeConfig
  });
};

const saveRuleEntity = async ({ status = 'draft', dsl = null } = {}) => {
  if (!form.name.trim()) {
    throw new Error('请输入规则名称');
  }

  const selectedModel = resolveSelectedModel();
  if (!selectedModel) {
    throw new Error('请先选择已发布的数据模型');
  }

  const nextDsl = dsl || buildCurrentDsl(selectedModel);
  const saved = ruleStore.upsertRuleLocal({
    ...JSON.parse(JSON.stringify(form)),
    id: form.id,
    ruleId: form.id,
    status,
    targetModel: selectedModel.modelCode || selectedModel.name,
    inputTables: resolveRuleInputTablesForSave(),
    uploadedFiles: pipelineStore.uploadedFiles,
    projectId: appStore.currentProject,
    ruleJson: nextDsl,
    dsl: nextDsl
  });

  try {
    await rulesApi.save(toSaveRulePayload(saved, {
      ...JSON.parse(JSON.stringify(form)),
      status,
      targetModel: selectedModel.modelCode || selectedModel.name,
      inputTables: resolveRuleInputTablesForSave(),
      uploadedFiles: pipelineStore.uploadedFiles,
      projectId: appStore.currentProject,
      ruleJson: nextDsl,
      dsl: nextDsl
    }));
  } catch {
    // 无后端时忽略错误。
  }

  form.id = saved.id;
  form.status = saved.status;
  form.targetModel = saved.targetModel;

  return { saved, selectedModel };
};

const saveRule = async () => {
  try {
    await saveRuleEntity({ status: 'draft' });
    window.alert('规则保存成功');
    router.push('/designer/rules');
  } catch (error) {
    window.alert(error?.message || '规则保存失败');
  }
};

const executeJob = async () => {
  const selectedModel = resolveSelectedModel();
  if (!selectedModel) {
    window.alert('请先选择已发布的数据模型');
    return;
  }

  const dsl = buildCurrentDsl(selectedModel);

  let publishError = '';
  let published = false;

  try {
    const { saved } = await saveRuleEntity({ status: 'draft', dsl });
    const ruleCode = String(saved.ruleCode || saved.id || '').trim();
    await rulesApi.publish({ ruleCode });
    const target = ruleStore.getRuleById(ruleCode) || ruleStore.getRuleById(saved.id);
    if (target) {
      ruleStore.upsertRuleLocal({ ...target, status: 'active', updateTime: nowText() });
    }
    form.status = 'active';
    published = true;
  } catch (error) {
    publishError = error?.message || '发布失败';
  }

  pipelineStore.markExecuted();

  if (published) {
    window.alert('规则发布成功');
  } else {
    window.alert(`规则发布失败：${publishError}`);
  }
};
</script>
