<template>
  <section>
    <div class="join-config" v-if="store.uploadedFiles.length >= 2">
      <div class="join-config-title">
        <span class="material-icons" style="color: var(--primary);">join_inner</span>
        表连接配置
      </div>

      <div class="join-type-selector">
        <div class="join-type-item" :class="{ selected: store.joinConfig.type === 'inner' }" @click="store.joinConfig.type = 'inner'">
          <div class="join-type-icon"><span class="material-icons">filter_center_focus</span></div>
          <div class="join-type-name">只保留两个表都有的数据</div>
        </div>
        <div class="join-type-item" :class="{ selected: store.joinConfig.type === 'left' }" @click="store.joinConfig.type = 'left'">
          <div class="join-type-icon"><span class="material-icons">table_chart</span></div>
          <div class="join-type-name">保留主表所有的数据</div>
        </div>
        <div class="join-type-item" :class="{ selected: store.joinConfig.type === 'full' }" @click="store.joinConfig.type = 'full'">
          <div class="join-type-icon"><span class="material-icons">view_module</span></div>
          <div class="join-type-name">保留两个表所有记录</div>
        </div>
      </div>

      <div style="margin-top: 16px;">
        <div class="form-label" style="font-size: 13px; margin-bottom: 8px;">连接字段配置（支持多字段连接）</div>
        <div v-for="(fieldPair, idx) in store.joinConfig.fields" :key="idx" style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
          <div style="flex: 1;">
            <label class="form-label" style="font-size: 12px; margin-bottom: 4px;"><span class="source-badge table-a">主表</span> 连接字段</label>
            <select v-model="fieldPair.leftField" class="form-select" style="font-size: 13px;">
              <option value="">选择字段</option>
              <option v-for="field in tableAFields" :key="field" :value="field">{{ field }}</option>
            </select>
          </div>
          <div style="font-size: 20px; color: var(--primary); margin-top: 20px;"><span class="material-icons">sync_alt</span></div>
          <div style="flex: 1;">
            <label class="form-label" style="font-size: 12px; margin-bottom: 4px;"><span class="source-badge table-b">从表</span> 连接字段</label>
            <select v-model="fieldPair.rightField" class="form-select" style="font-size: 13px;">
              <option value="">选择字段</option>
              <option v-for="field in tableBFields" :key="field" :value="field">{{ field }}</option>
            </select>
          </div>
          <button v-if="store.joinConfig.fields.length > 1" class="btn btn-default btn-sm" style="margin-top: 20px;" @click="removeJoinField(idx)">
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

    <div class="join-config" style="margin-bottom: 16px;">
      <div class="join-config-title">
        <span class="material-icons">schema</span>
        字段映射配置
      </div>

      <div class="data-grid-container">
        <table class="data-grid">
          <thead>
            <tr>
              <th
                v-for="field in store.targetFields"
                :key="field.name"
                :colspan="isMultiMapped(field.name) ? getMappedSources(field.name).length : 1"
                class="level-1"
              >
                {{ field.name }}
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
                    <div style="display: flex; align-items: center; gap: 4px; font-size: 12px;">
                      <span class="source-badge" :class="source.sourceId === 'table_a' ? 'table-a' : 'table-b'" style="font-size: 10px;">
                        {{ source.sourceId === 'table_a' ? 'A' : 'B' }}
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
                          <span class="source-badge" :class="getMappedSources(field.name)[0].sourceId === 'table_a' ? 'table-a' : 'table-b'" style="font-size: 10px;">
                            {{ getMappedSources(field.name)[0].sourceId === 'table_a' ? 'A' : 'B' }}
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
      <div v-if="sourceDataA.length === 0 && sourceDataB.length === 0" class="dropdown-empty">
        <div style="padding: 16px; text-align: center; color: #999;">请先上传数据文件</div>
      </div>

      <div class="dropdown-group" v-if="sourceDataA.length > 0">
        <div class="dropdown-group-title">
          <span class="source-badge table-a">A</span> 表A字段
        </div>
        <div
          v-for="source in sourceDataA"
          :key="source.key"
          class="dropdown-item"
          :class="{ selected: isSourceMappedToTarget(source.key, activeDropdown) }"
          @click="toggleFieldMapping(activeDropdown, source)"
        >
          <span class="dropdown-checkbox" :class="{ checked: isSourceMappedToTarget(source.key, activeDropdown) }"></span>
          {{ source.name }}
        </div>
      </div>

      <div class="dropdown-group" v-if="sourceDataB.length > 0">
        <div class="dropdown-group-title">
          <span class="source-badge table-b">B</span> 表B字段
        </div>
        <div
          v-for="source in sourceDataB"
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
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  store: { type: Object, required: true }
});

const activeDropdown = ref(null);
const dropdownPosition = ref({ top: 0, left: 0, width: 0 });

const tableAFields = computed(() => {
  const file = props.store.uploadedFiles.find((item) => item.source === 'table_a');
  return file?.fields || [];
});

const tableBFields = computed(() => {
  const file = props.store.uploadedFiles.find((item) => item.source === 'table_b');
  return file?.fields || [];
});

const sourceDataA = computed(() => {
  return (props.store.sourceFields || [])
    .filter((item) => item.source === 'table_a')
    .map((item) => ({ ...item, sourceId: item.source }));
});

const sourceDataB = computed(() => {
  return (props.store.sourceFields || [])
    .filter((item) => item.source === 'table_b')
    .map((item) => ({ ...item, sourceId: item.source }));
});

const tableAData = computed(() => {
  const file = props.store.uploadedFiles.find((item) => item.source === 'table_a');
  if (!file) return [];

  return (file.rows || []).map((row) => {
    const next = {};
    (file.fields || []).forEach((field) => {
      next[`table_a.${field}`] = row[field];
    });
    return next;
  });
});

const tableBData = computed(() => {
  const file = props.store.uploadedFiles.find((item) => item.source === 'table_b');
  if (!file) return [];

  return (file.rows || []).map((row) => {
    const next = {};
    (file.fields || []).forEach((field) => {
      next[`table_b.${field}`] = row[field];
    });
    return next;
  });
});

const checkJoinMatch = (rowA, rowB) => {
  return (props.store.joinConfig.fields || []).every((pair) => {
    if (!pair.leftField || !pair.rightField) return true;
    return rowA[`table_a.${pair.leftField}`] === rowB[`table_b.${pair.rightField}`];
  });
};

const previewData = computed(() => {
  if (props.store.uploadedFiles.length < 2) {
    return tableAData.value;
  }

  const result = [];
  const joinType = props.store.joinConfig.type || 'left';

  if (['left', 'inner', 'full'].includes(joinType)) {
    tableAData.value.forEach((rowA) => {
      const matchingB = tableBData.value.find((rowB) => checkJoinMatch(rowA, rowB));
      if (matchingB || joinType === 'left') {
        const merged = { ...rowA };
        if (matchingB) {
          Object.keys(matchingB).forEach((key) => {
            merged[key] = matchingB[key];
          });
        } else {
          const bFile = props.store.uploadedFiles.find((item) => item.source === 'table_b');
          (bFile?.fields || []).forEach((field) => {
            merged[`table_b.${field}`] = '';
          });
        }
        result.push(merged);
      }
    });
  }

  if (joinType === 'full') {
    tableBData.value.forEach((rowB) => {
      const matchingA = tableAData.value.find((rowA) => checkJoinMatch(rowA, rowB));
      if (!matchingA) {
        const merged = {};
        const aFile = props.store.uploadedFiles.find((item) => item.source === 'table_a');
        (aFile?.fields || []).forEach((field) => {
          merged[`table_a.${field}`] = '';
        });
        Object.keys(rowB).forEach((key) => {
          merged[key] = rowB[key];
        });
        result.push(merged);
      }
    });
  }

  return result;
});

const joinExplanation = computed(() => {
  const textMap = {
    inner: '内连接：只保留两个表中连接字段匹配的数据。',
    left: '左连接：保留主表全部数据，从表未匹配字段置空。',
    full: '全连接：保留两个表全部数据，未匹配字段置空。'
  };
  return textMap[props.store.joinConfig.type] || textMap.left;
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
      name: key,
      sourceId: key.startsWith('table_b') ? 'table_b' : 'table_a'
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
  props.store.joinConfig.fields.push({ leftField: '', rightField: '' });
};

const removeJoinField = (index) => {
  if (props.store.joinConfig.fields.length <= 1) return;
  props.store.joinConfig.fields.splice(index, 1);
};

const closeDropdownOnOutsideClick = (event) => {
  if (activeDropdown.value && !event.target.closest('.mapping-dropdown') && !event.target.closest('.mapping-dropdown-menu')) {
    activeDropdown.value = null;
  }
};

onMounted(() => {
  document.addEventListener('click', closeDropdownOnOutsideClick);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdownOnOutsideClick);
});
</script>