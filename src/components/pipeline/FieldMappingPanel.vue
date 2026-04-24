<template>
  <section>
    <div class="join-config" v-if="store.uploadedFiles.length >= 2">
      <div class="join-config-title">
        <span class="material-icons" style="color: var(--primary);">join_inner</span>
        表连接配置
      </div>

      <div class="table-tabs" v-if="joinLinks.length > 1" style="margin-bottom: 16px; flex-wrap: wrap;">
        <div
          v-for="(link, idx) in joinLinks"
          :key="`${link.leftSource}_${link.rightSource}_${idx}`"
          class="table-tab"
          :class="{ active: idx === activeJoinIndex }"
          @click="activeJoinIndex = idx"
        >
          {{ `连接${idx + 1}` }}
          <span style="margin-left: 8px; color: inherit; opacity: 0.9;">
            {{ `主表(${getMainFileName()}) -> 从表(${getFileNameBySource(link.rightSource)})` }}
          </span>
        </div>
      </div>

      <div v-if="currentJoinLink">
        <div class="join-type-selector">
          <div class="join-type-item" :class="{ selected: currentJoinLink.type === 'inner' }" @click="setCurrentJoinType('inner')">
            <div class="join-type-icon"><span class="material-icons">filter_center_focus</span></div>
            <div class="join-type-name">只保留两个表都有的数据</div>
          </div>
          <div class="join-type-item" :class="{ selected: currentJoinLink.type === 'left' }" @click="setCurrentJoinType('left')">
            <div class="join-type-icon"><span class="material-icons">table_chart</span></div>
            <div class="join-type-name">保留主表所有的数据</div>
          </div>
          <div class="join-type-item" :class="{ selected: currentJoinLink.type === 'full' }" @click="setCurrentJoinType('full')">
            <div class="join-type-icon"><span class="material-icons">view_module</span></div>
            <div class="join-type-name">保留两个表所有记录</div>
          </div>
        </div>

        <div style="margin-top: 16px;">
          <div class="form-label" style="font-size: 13px; margin-bottom: 8px;">连接字段配置（支持多字段连接）</div>
          <div v-for="(fieldPair, idx) in currentJoinLink.fields" :key="idx" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="flex: 1;">
              <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">
                <span class="source-badge table-a">主表</span>
                {{ getMainFileName() }}
              </label>
              <select v-model="fieldPair.leftField" class="form-select" style="font-size: 13px;" @change="syncLegacyJoinState">
                <option value="">选择字段</option>
                <option v-for="field in mainTableFields" :key="field" :value="field">{{ field }}</option>
              </select>
            </div>
            <div style="font-size: 20px; color: var(--primary); margin-top: 20px;"><span class="material-icons">sync_alt</span></div>
            <div style="flex: 1;">
              <label class="form-label" style="font-size: 12px; margin-bottom: 4px;">
                <span class="source-badge table-b">从表</span>
                {{ getCurrentRightFileName() }}
              </label>
              <select v-model="fieldPair.rightField" class="form-select" style="font-size: 13px;" @change="syncLegacyJoinState">
                <option value="">选择字段</option>
                <option v-for="field in currentRightTableFields" :key="field" :value="field">{{ field }}</option>
              </select>
            </div>
            <button v-if="currentJoinLink.fields.length > 1" class="btn btn-default btn-sm" style="margin-top: 20px;" @click="removeJoinField(idx)">
              <span class="material-icons" style="font-size: 16px;">remove_circle_outline</span>
            </button>
          </div>
          <button class="btn btn-default btn-sm" style="margin-top: 4px;" @click="addJoinField">
            <span class="material-icons" style="font-size: 16px;">add</span>
            添加连接字段
          </button>
        </div>

        <div style="margin-top: 16px; padding: 14px 18px; background: var(--primary-bg); border-radius: 8px; border-left: 4px solid var(--primary); font-size: 13px; color: var(--primary);">
          <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 6px;">info</span>
          {{ joinExplanation }}
        </div>
      </div>
    </div>

    <div class="join-config" style="margin-bottom: 16px;">
      <div class="join-config-title">
        <span class="material-icons">schema</span>
        字段映射配置
      </div>

      <div class="data-grid-container" ref="fieldMappingGridContainer">
        <table class="data-grid">
          <thead>
            <tr>
              <th
                v-for="field in store.targetFields"
                :key="field.name"
                :colspan="isMultiMapped(field.name) ? getMappedSources(field.name).length : 1"
                class="level-1"
              >
                <div class="data-grid-field-header">
                  <span class="data-grid-field-name" :title="field.name">{{ field.name }}</span>
                  <span
                    v-if="getFieldDesc(field)"
                    class="data-grid-field-desc"
                    :title="getFieldDesc(field)"
                  >
                    {{ getFieldDesc(field) }}
                  </span>
                </div>
              </th>
            </tr>

            <tr>
              <template v-for="field in store.targetFields" :key="`select-${field.name}`">
                <template v-if="isMultiMapped(field.name)">
                  <th
                    v-for="source in getMappedSources(field.name)"
                    :key="`source-${field.name}-${source.key}`"
                    style="background: #fff; padding: 8px 12px;"
                  >
                    <div
                      class="mapping-multi-trigger"
                      style="display: flex; align-items: center; gap: 4px; font-size: 12px; cursor: pointer;"
                      @click.stop="toggleDropdown(field.name, $event)"
                    >
                      <span class="source-badge" :class="getSourceBadgeClass(source.sourceId)" style="font-size: 10px;">
                        {{ getSourceBadgeText(source.sourceId) }}
                      </span>
                      {{ source.name }}
                      <span @click.stop="removeMapping(field.name, source.key)" style="cursor: pointer; color: #999; margin-left: 4px;">&times;</span>
                    </div>
                  </th>
                </template>
                <th v-else style="background: #fff; padding: 8px 12px;">
                  <div class="mapping-dropdown" style="position: relative;">
                    <div
                      class="mapping-select-trigger"
                      @click.stop="toggleDropdown(field.name, $event)"
                      style="display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border: 1px solid #d9d9d9; border-radius: 4px; cursor: pointer; min-width: 100px; background: #fff;"
                    >
                      <span style="font-size: 12px; color: #333;">
                        <template v-if="getMappedSources(field.name).length > 0">
                          <span class="source-badge" :class="getSourceBadgeClass(getMappedSources(field.name)[0].sourceId)" style="font-size: 10px;">
                            {{ getSourceBadgeText(getMappedSources(field.name)[0].sourceId) }}
                          </span>
                          {{ getMappedSources(field.name)[0].name }}
                        </template>
                        <span v-else style="color: #bfbfbf;">选择字段</span>
                      </span>
                      <span class="material-icons" style="font-size: 16px; color: #999;">expand_more</span>
                    </div>
                  </div>
                </th>
              </template>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(row, rowIndex) in previewData.slice(0, 20)" :key="rowIndex">
              <template v-for="field in store.targetFields" :key="`${field.name}-${rowIndex}`">
                <template v-if="isMultiMapped(field.name)">
                  <td v-for="source in getMappedSources(field.name)" :key="`${field.name}-${source.key}`">
                    {{ row[source.key] || '-' }}
                  </td>
                </template>
                <td v-else>
                  {{ getMappedValue(field.name, row) || '-' }}
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="activeDropdown"
      class="mapping-dropdown-menu"
      :style="{
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${Math.max(dropdownPosition.width, 200)}px`,
        zIndex: 1000
      }"
      @click.stop
    >
      <div v-if="sourceGroups.length === 0" class="dropdown-empty">
        <div style="padding: 16px; text-align: center; color: #999;">请先上传数据文件</div>
      </div>

      <div class="dropdown-group" v-for="group in sourceGroups" :key="group.source">
        <div class="dropdown-group-title">
          <span class="source-badge" :class="group.badgeClass">{{ group.badgeText }}</span>
          {{ group.title }}
        </div>
        <div
          v-for="source in group.fields"
          :key="source.key"
          class="dropdown-item"
          :class="{ selected: isSourceMappedToTarget(source.key, activeDropdown) }"
          @click="toggleFieldMapping(activeDropdown, source)"
        >
          <span class="dropdown-checkbox" :class="{ checked: isSourceMappedToTarget(source.key, activeDropdown) }"></span>
          {{ source.name }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  store: { type: Object, required: true }
});

const activeDropdown = ref(null);
const dropdownPosition = ref({ top: 0, left: 0, width: 0 });
const activeJoinIndex = ref(0);
const fieldMappingGridContainer = ref(null);

const toText = (value) => String(value ?? '').trim();
const getFieldDesc = (field) => toText(field?.description || field?.fieldDesc || field?.desc);

const updateHeaderStickyOffset = () => {
  if (!fieldMappingGridContainer.value) return;
  const firstRow = fieldMappingGridContainer.value.querySelector('thead tr:first-child');
  if (!firstRow) return;
  const height = firstRow.getBoundingClientRect().height;
  fieldMappingGridContainer.value.style.setProperty('--header-row-1-height', `${height}px`);
};

const sourceFiles = computed(() => (Array.isArray(props.store.uploadedFiles) ? props.store.uploadedFiles : []));

const getSourceIndexById = (sourceId) => {
  return sourceFiles.value.findIndex((item) => toText(item?.source) === toText(sourceId));
};

const getSourceBadgeClass = (sourceId) => {
  return getSourceIndexById(sourceId) === 0 ? 'table-a' : 'table-b';
};

const getSourceBadgeText = (sourceId) => {
  const index = getSourceIndexById(sourceId);
  if (index === 0) return '主';
  if (index > 0) return `从${index}`;
  return sourceId || '-';
};

const getFileBySource = (sourceId) => {
  return sourceFiles.value.find((item) => toText(item?.source) === toText(sourceId)) || null;
};

const getMainFile = () => sourceFiles.value[0] || null;
const getMainFileName = () => toText(getMainFile()?.name || getMainFile()?.source || '主表');

const getFileNameBySource = (sourceId) => {
  const file = getFileBySource(sourceId);
  return toText(file?.name || file?.source || sourceId || '从表');
};

const joinLinks = computed(() => {
  return Array.isArray(props.store.joinConfig?.links) ? props.store.joinConfig.links : [];
});

const ensureJoinLinks = () => {
  if (sourceFiles.value.length < 2) return;
  if (Array.isArray(props.store.joinConfig.links) && props.store.joinConfig.links.length > 0) return;

  const main = sourceFiles.value[0];
  props.store.joinConfig.links = sourceFiles.value.slice(1).map((file) => ({
    leftSource: main?.source || 'table_a',
    rightSource: file?.source || '',
    type: props.store.joinConfig.type || 'left',
    fields: Array.isArray(props.store.joinConfig.fields) && props.store.joinConfig.fields.length > 0
      ? props.store.joinConfig.fields.map((item) => ({ leftField: item.leftField || '', rightField: item.rightField || '' }))
      : [{ leftField: '', rightField: '' }]
  }));
};

const normalizeJoinLinkFields = (fields = []) => {
  const list = (Array.isArray(fields) ? fields : []).filter((item) => item?.leftField || item?.rightField);
  if (list.length > 0) {
    return list.map((item) => ({ leftField: item.leftField || '', rightField: item.rightField || '' }));
  }
  return [{ leftField: '', rightField: '' }];
};

const syncLegacyJoinState = () => {
  const first = joinLinks.value[0];
  if (!first) {
    props.store.joinConfig.type = 'left';
    props.store.joinConfig.fields = [{ leftField: '', rightField: '' }];
    return;
  }

  props.store.joinConfig.type = first.type || 'left';
  props.store.joinConfig.fields = normalizeJoinLinkFields(first.fields);
};

watch(
  () => sourceFiles.value.map((item) => item?.source).join('|'),
  () => {
    ensureJoinLinks();
    if (activeJoinIndex.value >= joinLinks.value.length) {
      activeJoinIndex.value = Math.max(joinLinks.value.length - 1, 0);
    }
    syncLegacyJoinState();
  },
  { immediate: true }
);

watch(
  joinLinks,
  () => {
    if (activeJoinIndex.value >= joinLinks.value.length) {
      activeJoinIndex.value = Math.max(joinLinks.value.length - 1, 0);
    }
    syncLegacyJoinState();
  },
  { deep: true }
);

watch(
  () => props.store.targetFields,
  async () => {
    await nextTick();
    updateHeaderStickyOffset();
  },
  { immediate: true, deep: true }
);

const currentJoinLink = computed(() => {
  return joinLinks.value[activeJoinIndex.value] || null;
});

const mainTableFields = computed(() => {
  const file = getMainFile();
  return file?.fields || [];
});

const currentRightTableFields = computed(() => {
  const sourceId = currentJoinLink.value?.rightSource;
  const file = getFileBySource(sourceId);
  return file?.fields || [];
});

const getCurrentRightFileName = () => {
  return getFileNameBySource(currentJoinLink.value?.rightSource);
};

const setCurrentJoinType = (type) => {
  if (!currentJoinLink.value) return;
  currentJoinLink.value.type = type;
  syncLegacyJoinState();
};

const joinExplanation = computed(() => {
  const type = currentJoinLink.value?.type || 'left';
  const textMap = {
    inner: '内连接：只保留两个表中连接字段匹配的数据。',
    left: '左连接：保留主表全部数据，从表未匹配字段置空。',
    full: '全连接：保留两个表全部数据，未匹配字段置空。'
  };
  return textMap[type] || textMap.left;
});

const sourceGroups = computed(() => {
  const allSourceFields = Array.isArray(props.store.sourceFields) ? props.store.sourceFields : [];
  return sourceFiles.value.map((file) => {
    const index = getSourceIndexById(file?.source);
    return {
      source: file?.source,
      badgeClass: index === 0 ? 'table-a' : 'table-b',
      badgeText: index === 0 ? '主' : `从${index}`,
      title: `${index === 0 ? '主表' : `从表${index}`} ${toText(file?.name || file?.source)}`,
      fields: allSourceFields
        .filter((item) => toText(item?.source) === toText(file?.source))
        .map((item) => ({ ...item, sourceId: item.source }))
    };
  });
});

const fileRowsBySource = computed(() => {
  return sourceFiles.value.reduce((acc, file) => {
    const rows = (file?.rows || []).map((row) => {
      const next = {};
      (file?.fields || []).forEach((field) => {
        next[`${file.source}.${field}`] = row?.[field];
      });
      return next;
    });
    acc[file.source] = rows;
    return acc;
  }, {});
});

const normalizeJoinType = (type) => {
  const value = toText(type).toLowerCase();
  return ['inner', 'left', 'full'].includes(value) ? value : 'left';
};

const isJoinMatch = (leftRow, rightRow, link, mainSource, rightSource) => {
  const pairs = normalizeJoinLinkFields(link?.fields || []);
  return pairs.every((pair) => {
    if (!pair.leftField || !pair.rightField) return true;
    return leftRow?.[`${mainSource}.${pair.leftField}`] === rightRow?.[`${rightSource}.${pair.rightField}`];
  });
};

const buildBlankRow = (keys = []) => {
  return keys.reduce((acc, key) => {
    acc[key] = '';
    return acc;
  }, {});
};

const applyJoin = (leftRows = [], rightRows = [], link, mainSource, rightSource) => {
  if (leftRows.length === 0) return [];

  const type = normalizeJoinType(link?.type);
  const rightMatched = new Set();
  const leftKeys = [...new Set(leftRows.flatMap((row) => Object.keys(row || {})))];
  const rightKeys = [...new Set(rightRows.flatMap((row) => Object.keys(row || {})))];
  const rightBlank = buildBlankRow(rightKeys);
  const leftBlank = buildBlankRow(leftKeys);

  const result = [];

  leftRows.forEach((leftRow) => {
    const matchIndex = rightRows.findIndex((rightRow) => isJoinMatch(leftRow, rightRow, link, mainSource, rightSource));
    const matchedRow = matchIndex >= 0 ? rightRows[matchIndex] : null;

    if (matchedRow) {
      rightMatched.add(matchIndex);
      result.push({ ...leftRow, ...matchedRow });
      return;
    }

    if (type === 'left' || type === 'full') {
      result.push({ ...leftRow, ...rightBlank });
    }
  });

  if (type === 'full') {
    rightRows.forEach((rightRow, index) => {
      if (rightMatched.has(index)) return;
      result.push({ ...leftBlank, ...rightRow });
    });
  }

  if (type === 'inner') {
    return result;
  }

  return result;
};

const previewData = computed(() => {
  if (sourceFiles.value.length === 0) return [];

  const main = getMainFile();
  if (!main) return [];

  let result = [...(fileRowsBySource.value[main.source] || [])];

  if (sourceFiles.value.length < 2) {
    return result;
  }

  joinLinks.value.forEach((link) => {
    const rightSource = toText(link?.rightSource);
    if (!rightSource) return;
    const rightRows = fileRowsBySource.value[rightSource] || [];
    result = applyJoin(result, rightRows, link, main.source, rightSource);
  });

  return result;
});

const toggleDropdown = (fieldName, event) => {
  if (activeDropdown.value === fieldName) {
    activeDropdown.value = null;
    return;
  }

  activeDropdown.value = fieldName;
  const trigger = event?.currentTarget;
  if (!trigger) return;

  const rect = trigger.getBoundingClientRect();
  dropdownPosition.value = {
    top: rect.bottom,
    left: rect.left,
    width: rect.width
  };
};

const isMultiMapped = (targetField) => {
  const sources = props.store.mappings[targetField];
  return Array.isArray(sources) && sources.length > 1;
};

const getDisplayFieldName = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  const parts = text.split('.');
  return parts.length > 1 ? parts.slice(1).join('.') : text;
};

const getSourceIdFromKey = (key) => {
  const text = toText(key);
  if (!text) return '';
  const dotIndex = text.indexOf('.');
  return dotIndex > -1 ? text.slice(0, dotIndex) : '';
};

const getMappedSources = (targetField) => {
  const keys = props.store.mappings[targetField] || [];
  return keys.map((key) => {
    const source = (props.store.sourceFields || []).find((item) => item.key === key);
    if (source) {
      return {
        ...source,
        sourceId: source.source
      };
    }

    return {
      key,
      name: getDisplayFieldName(key),
      sourceId: getSourceIdFromKey(key)
    };
  });
};

const isSourceMappedToTarget = (sourceKey, targetFieldName) => {
  const sources = props.store.mappings[targetFieldName] || [];
  return sources.includes(sourceKey);
};

const toggleFieldMapping = (targetFieldName, sourceField) => {
  const nextMappings = { ...(props.store.mappings || {}) };
  const sourceKeys = Array.isArray(nextMappings[targetFieldName]) ? [...nextMappings[targetFieldName]] : [];
  const index = sourceKeys.indexOf(sourceField.key);

  if (index > -1) {
    sourceKeys.splice(index, 1);
  } else {
    sourceKeys.push(sourceField.key);
  }

  if (sourceKeys.length === 0) {
    delete nextMappings[targetFieldName];
  } else {
    nextMappings[targetFieldName] = sourceKeys;
  }

  props.store.setMappings(nextMappings);
};

const removeMapping = (targetFieldName, sourceKey) => {
  const nextMappings = { ...(props.store.mappings || {}) };
  const sourceKeys = Array.isArray(nextMappings[targetFieldName]) ? [...nextMappings[targetFieldName]] : [];
  const filtered = sourceKeys.filter((key) => key !== sourceKey);

  if (filtered.length === 0) {
    delete nextMappings[targetFieldName];
  } else {
    nextMappings[targetFieldName] = filtered;
  }

  props.store.setMappings(nextMappings);
};

const getMappedValue = (targetField, row) => {
  const keys = props.store.mappings[targetField] || [];
  if (keys.length === 0) return '';
  if (keys.length > 1) {
    return keys.map((key) => row[key] ?? '').join('');
  }
  return row[keys[0]] ?? '';
};

const addJoinField = () => {
  if (!currentJoinLink.value) return;
  currentJoinLink.value.fields.push({ leftField: '', rightField: '' });
  syncLegacyJoinState();
};

const removeJoinField = (index) => {
  if (!currentJoinLink.value) return;
  if (currentJoinLink.value.fields.length <= 1) return;
  currentJoinLink.value.fields.splice(index, 1);
  syncLegacyJoinState();
};

const closeDropdownOnOutsideClick = (event) => {
  if (activeDropdown.value && !event.target.closest('.mapping-dropdown') && !event.target.closest('.mapping-dropdown-menu')) {
    activeDropdown.value = null;
  }
};

onMounted(async () => {
  await nextTick();
  updateHeaderStickyOffset();
  document.addEventListener('click', closeDropdownOnOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdownOnOutsideClick);
});
</script>
