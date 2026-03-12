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
              <div class="card-title">选择数据模型并上传原始数据</div>
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
import { pipelineApi } from '../../services/api';
import { buildPipelineDsl, downloadDslFile } from '../../services/dsl/pipeline-dsl';
import { useAppStore } from '../../stores/app.store';
import { useModelStore } from '../../stores/model.store';
import { usePipelineStore } from '../../stores/pipeline.store';
import { RULE_INPUT_TABLES, useRuleStore } from '../../stores/rule.store';
import FileUploadPanel from '../../components/pipeline/FileUploadPanel.vue';
import FieldMappingPanel from '../../components/pipeline/FieldMappingPanel.vue';
import ProcessPanel from '../../components/pipeline/ProcessPanel.vue';
import WriteConfigPanel from '../../components/pipeline/WriteConfigPanel.vue';

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

const onSelectModel = (modelId) => {
  pipelineStore.setModel(modelId);
};

onMounted(async () => {
  appStore.setRole('designer');
  await modelStore.loadProjectModels();
  await ruleStore.loadRules();

  pipelineStore.resetPipeline();

  if (isEdit.value) {
    const targetRule = ruleStore.getRuleById(route.params.id);
    setForm(targetRule);
    const model = publishedProjectModels.value.find((item) => item.name === form.targetModel);
    if (model) {
      pipelineStore.setModel(model.id);
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

const saveRule = async () => {
  if (!form.name.trim()) {
    window.alert('请输入规则名称');
    return;
  }

  const selectedModel = publishedProjectModels.value.find((item) => String(item.id) === String(pipelineStore.selectedModelId));
  if (!selectedModel) {
    window.alert('请选择已发布的数据模型');
    return;
  }

  await ruleStore.upsertRule({
    ...JSON.parse(JSON.stringify(form)),
    status: 'active',
    targetModel: selectedModel.name,
    inputTables: resolveRuleInputTablesForSave(),
    projectId: appStore.currentProject
  });

  window.alert('规则保存成功！');
  router.push('/designer/rules');
};

const executeJob = async () => {
  const selectedModel = publishedProjectModels.value.find((item) => String(item.id) === String(pipelineStore.selectedModelId));
  if (!selectedModel) {
    window.alert('请先选择已发布的数据模型');
    return;
  }

  const dsl = buildPipelineDsl({
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

  const dslFileName = `${form.name || selectedModel.modelCode || selectedModel.name || 'pipeline'}_dsl.json`;
  downloadDslFile(dsl, dslFileName);

  const executePayload = {
    ...pipelineStore.getExecutePayload(),
    dsl
  };

  let published = false;
  try {
    await pipelineApi.publishDsl({
      dsl,
      projectId: appStore.currentProject,
      ruleId: form.id,
      ruleName: form.name || selectedModel.name
    });
    published = true;
  } catch {
    try {
      await pipelineApi.execute(executePayload);
      published = true;
    } catch {
      // 后端未接入时，保持前端可用并输出 DSL 文件。
    }
  }

  pipelineStore.markExecuted();
  window.alert(published
    ? `DSL 已生成并发布成功：${dslFileName}`
    : `DSL 已生成：${dslFileName}（后端接口暂不可用）`);
};
</script>

