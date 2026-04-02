import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { PIPELINE_STEPS, SORT_ORDER, DEDUP_KEEP, JOIN_TYPES } from '@/utils/constants/pipeline.js';
import { buildPreviewRows, buildProcessedRows } from '@/utils/useDataPipeline.js';
import { parseLocalFile } from '@/utils/useFileIngestion.js';
import { useModelStore } from '@/store/model.store.js';

export const usePipelineStore = defineStore('pipeline', () => {
  const modelStore = useModelStore();

  const currentStep = ref(0);
  const selectedModelId = ref(modelStore.selectedProjectModelId || '');
  const uploadedFiles = ref([]);
  const mappings = ref({});

  const filters = reactive({});
  const transforms = reactive({});
  const sortConfig = reactive({ field: '', order: SORT_ORDER.ASC });
  const dedupConfig = reactive({ enabled: true, fields: [], keep: DEDUP_KEEP.FIRST });

  const joinConfig = reactive({
    type: JOIN_TYPES.LEFT,
    fields: [{ leftField: '', rightField: '' }],
    links: []
  });

  const writeConfig = reactive({
    mode: 'append',
    deduplication: false,
    dedupFields: [],
    conflictStrategy: 'keep_old'
  });

  const executionMessage = ref('');
  const executeCount = ref(0);

  const steps = PIPELINE_STEPS;

  const targetFields = computed(() => {
    const model = modelStore.projectModels.find((item) => String(item.id) === String(selectedModelId.value));
    return model?.fields || [];
  });

  const sourceRows = computed(() => {
    const tableA = uploadedFiles.value.find((file) => file.source === 'table_a')?.rows || [];
    const tableB = uploadedFiles.value.find((file) => file.source === 'table_b')?.rows || [];
    const maxLength = Math.max(tableA.length, tableB.length);

    if (maxLength === 0) {
      return [];
    }

    return Array.from({ length: maxLength }, (_, index) => ({
      tableA: tableA[index] || {},
      tableB: tableB[index] || {}
    }));
  });

  const sourceFields = computed(() => {
    return uploadedFiles.value.flatMap((file) =>
      (file.fields || []).map((fieldName) => ({
        key: `${file.source}.${fieldName}`,
        source: file.source,
        name: fieldName
      }))
    );
  });

  const previewRows = computed(() => {
    const normalize = sourceRows.value.map((item) => {
      const next = {};

      Object.keys(item.tableA || {}).forEach((key) => {
        next[`table_a.${key}`] = item.tableA[key];
      });

      Object.keys(item.tableB || {}).forEach((key) => {
        next[`table_b.${key}`] = item.tableB[key];
      });

      return next;
    });

    return buildPreviewRows({
      sourceRows: normalize,
      mappings: mappings.value,
      targetFields: targetFields.value
    });
  });

  const processedRows = computed(() => {
    return buildProcessedRows({
      previewRows: previewRows.value,
      filters,
      transforms,
      sortConfig,
      dedupConfig
    });
  });

  const canProceed = computed(() => {
    if (currentStep.value === 0) return !!selectedModelId.value && uploadedFiles.value.length > 0;
    if (currentStep.value === 1) return Object.keys(mappings.value).length > 0;
    return true;
  });

  const setModel = (modelId) => {
    selectedModelId.value = modelId;
    modelStore.setSelectedProjectModelId(modelId);
    mappings.value = {};
  };

  const setMapping = (targetFieldName, sourceKey) => {
    const next = { ...mappings.value };
    if (!sourceKey) {
      delete next[targetFieldName];
      mappings.value = next;
      return;
    }
    next[targetFieldName] = [sourceKey];
    mappings.value = next;
  };

  const setMappings = (nextMappings) => {
    mappings.value = { ...(nextMappings || {}) };
  };

  const resolveSourceAlias = (index) => {
    if (index >= 0 && index < 26) {
      return `table_${String.fromCharCode(97 + index)}`;
    }
    return `table_${index + 1}`;
  };

  const normalizeUploadedFiles = () => {
    uploadedFiles.value = uploadedFiles.value.map((file, index) => ({
      ...file,
      source: resolveSourceAlias(index)
    }));
  };

  const createDefaultJoinFields = (mainFile, rightFile) => {
    const commonFields = (mainFile?.fields || []).filter((field) => (rightFile?.fields || []).includes(field));
    if (commonFields.length > 0) {
      return [{ leftField: commonFields[0], rightField: commonFields[0] }];
    }
    return [{ leftField: '', rightField: '' }];
  };

  const syncJoinFields = () => {
    if (uploadedFiles.value.length < 2) {
      joinConfig.links = [];
      joinConfig.type = JOIN_TYPES.LEFT;
      joinConfig.fields = [{ leftField: '', rightField: '' }];
      return;
    }

    const [mainTable, ...secondaryTables] = uploadedFiles.value;
    const previousLinks = Array.isArray(joinConfig.links) ? joinConfig.links : [];

    joinConfig.links = secondaryTables.map((rightTable) => {
      const previous = previousLinks.find((item) => item?.rightSource === rightTable?.source) || null;
      const previousFields = Array.isArray(previous?.fields)
        ? previous.fields.filter((item) => item?.leftField || item?.rightField)
        : [];

      return {
        leftSource: mainTable?.source || 'table_a',
        rightSource: rightTable?.source || '',
        type: previous?.type || joinConfig.type || JOIN_TYPES.LEFT,
        fields: previousFields.length > 0
          ? previousFields.map((item) => ({ leftField: item.leftField || '', rightField: item.rightField || '' }))
          : createDefaultJoinFields(mainTable, rightTable)
      };
    });

    const firstLink = joinConfig.links[0];
    if (firstLink) {
      joinConfig.type = firstLink.type || JOIN_TYPES.LEFT;
      joinConfig.fields = Array.isArray(firstLink.fields) && firstLink.fields.length > 0
        ? firstLink.fields.map((item) => ({ leftField: item.leftField || '', rightField: item.rightField || '' }))
        : [{ leftField: '', rightField: '' }];
      return;
    }

    joinConfig.type = JOIN_TYPES.LEFT;
    joinConfig.fields = [{ leftField: '', rightField: '' }];
  };

  const refreshAfterFileChange = () => {
    normalizeUploadedFiles();
    mappings.value = {};
    syncJoinFields();
  };

  const setUploadedFiles = (files = []) => {
    uploadedFiles.value = Array.isArray(files) ? [...files] : [];
    refreshAfterFileChange();
  };

  const appendUploadedFiles = (files = []) => {
    const incoming = Array.isArray(files) ? files.filter(Boolean) : [];
    if (incoming.length === 0) return;
    uploadedFiles.value = [...uploadedFiles.value, ...incoming];
    refreshAfterFileChange();
  };

  const uploadLocalFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const parsed = await Promise.all(
      files.map((file, index) => {
        const source = resolveSourceAlias(uploadedFiles.value.length + index);
        return parseLocalFile(file, source);
      })
    );

    uploadedFiles.value = [...uploadedFiles.value, ...parsed];
    refreshAfterFileChange();
  };

  const removeFile = (fileId) => {
    uploadedFiles.value = uploadedFiles.value.filter((file) => file.id !== fileId);
    refreshAfterFileChange();
  };

  const moveFileUp = (index) => {
    if (index <= 0 || index >= uploadedFiles.value.length) return;
    const next = [...uploadedFiles.value];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    uploadedFiles.value = next;
    refreshAfterFileChange();
  };

  const moveFileDown = (index) => {
    if (index < 0 || index >= uploadedFiles.value.length - 1) return;
    const next = [...uploadedFiles.value];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    uploadedFiles.value = next;
    refreshAfterFileChange();
  };

  const moveStep = (nextStep) => {
    if (nextStep < 0 || nextStep > steps.length - 1) return;
    if (nextStep > currentStep.value && !canProceed.value) return;
    currentStep.value = nextStep;
  };

  const nextStep = () => {
    if (currentStep.value < steps.length - 1 && canProceed.value) {
      currentStep.value += 1;
    }
  };

  const prevStep = () => {
    if (currentStep.value > 0) {
      currentStep.value -= 1;
    }
  };

  const setFilter = (field, config) => {
    filters[field] = { ...config };
  };

  const removeFilter = (field) => {
    delete filters[field];
  };

  const setTransform = (field, config) => {
    transforms[field] = { ...config };
  };

  const removeTransform = (field) => {
    delete transforms[field];
  };

  const setSort = (field, order) => {
    sortConfig.field = field;
    sortConfig.order = order;
  };

  const clearSort = () => {
    sortConfig.field = '';
    sortConfig.order = SORT_ORDER.ASC;
  };

  const setDedup = (config) => {
    dedupConfig.enabled = config.enabled;
    dedupConfig.fields = [...(config.fields || [])];
    dedupConfig.keep = config.keep;
  };

  const getExecutePayload = () => {
    return {
      modelId: selectedModelId.value,
      joinConfig,
      mappings: mappings.value,
      filters,
      transforms,
      sortConfig,
      dedupConfig,
      writeConfig,
      previewCount: previewRows.value.length,
      executeCount: executeCount.value || processedRows.value.length
    };
  };

  const markExecuted = () => {
    const count = executeCount.value || processedRows.value.length;
    executionMessage.value = `执行完成，共 ${count} 条数据`;
  };

  const setExecuteCount = (count) => {
    executeCount.value = Number.isFinite(Number(count)) ? Number(count) : 0;
  };

  const resetPipeline = () => {
    currentStep.value = 0;
    selectedModelId.value = '';
    uploadedFiles.value = [];
    mappings.value = {};
    Object.keys(filters).forEach((key) => delete filters[key]);
    Object.keys(transforms).forEach((key) => delete transforms[key]);
    sortConfig.field = '';
    sortConfig.order = SORT_ORDER.ASC;
    dedupConfig.enabled = true;
    dedupConfig.fields = [];
    dedupConfig.keep = DEDUP_KEEP.FIRST;
    joinConfig.type = JOIN_TYPES.LEFT;
    joinConfig.fields = [{ leftField: '', rightField: '' }];
    joinConfig.links = [];
    writeConfig.mode = 'append';
    writeConfig.deduplication = false;
    writeConfig.dedupFields = [];
    writeConfig.conflictStrategy = 'keep_old';
    executionMessage.value = '';
    executeCount.value = 0;
  };

  return {
    currentStep,
    selectedModelId,
    uploadedFiles,
    mappings,
    filters,
    transforms,
    sortConfig,
    dedupConfig,
    joinConfig,
    writeConfig,
    executionMessage,
    executeCount,
    steps,
    targetFields,
    sourceFields,
    sourceRows,
    previewRows,
    processedRows,
    canProceed,
    setModel,
    setMapping,
    setMappings,
    setUploadedFiles,
    appendUploadedFiles,
    uploadLocalFiles,
    removeFile,
    moveFileUp,
    moveFileDown,
    moveStep,
    nextStep,
    prevStep,
    setFilter,
    removeFilter,
    setTransform,
    removeTransform,
    setSort,
    clearSort,
    setDedup,
    getExecutePayload,
    markExecuted,
    setExecuteCount,
    resetPipeline
  };
});