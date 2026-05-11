<template>
  <div class="model-list-container" style="margin-top: 64px; background: linear-gradient(135deg, #e6f7ff 0%, #fafafa 100%);">
    <div class="model-edit-header">
      <div class="back-btn" @click="router.push('/designer')">
        <span class="material-icons">arrow_back</span>
      </div>
      <div class="model-list-title">
        <span class="material-icons" style="color: var(--primary);">account_tree</span>
        数据模型列表
        <span class="model-count">共 {{ projectModels.length }} 个模型</span>
      </div>
    </div>

    <div style="padding: 24px; max-width: 1860px; margin: 0 auto;">
      <div class="board-wrapper">
        <div class="board-header-grid">
          <div class="board-corner"></div>
          <div v-for="column in BOARD_COLUMNS" :key="column.key" class="board-header-cell">
            {{ column.label }}
          </div>
          <div class="board-header-spacer"></div>
        </div>

        <div
          v-for="(row, rowIndex) in RAT_ROWS"
          :key="row.key"
          class="board-row-section"
          :style="rowIndex > 0 ? { borderTop: '1px solid rgba(24, 121, 184, 0.12)', marginTop: '14px', paddingTop: '14px' } : null"
        >
          <div class="board-row-grid">
            <div class="board-rat-label">
              <span class="board-rat-chip">{{ row.label }}</span>
            </div>

            <div
              v-for="slot in getProjectBoardRow(row.key)"
              :key="`${row.key}-${slot.column.key}`"
              class="board-slot"
            >
              <button
                v-if="slot.model"
                class="board-card"
                type="button"
                @click="openProjectModel(getSlotDisplayModel(slot))"
              >
                <div class="board-card-top">
                  <span class="board-card-type">{{ slot.column.label }}</span>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <button
                      v-if="slot.models.length > 1"
                      type="button"
                      class="board-card-badge-btn"
                      @click.stop="toggleSlotModelMenu(slot.slotKey)"
                    >
                      {{ slot.models.length }}
                    </button>
                    <span
                      class="board-card-status"
                      :class="getSlotDisplayModel(slot).isRelease ? 'board-card-status-active' : 'board-card-status-draft'"
                    >
                      {{ getSlotDisplayModel(slot).isRelease ? '\u5df2\u53d1\u5e03' : '\u672a\u53d1\u5e03' }}
                    </span>
                  </div>
                </div>
                <div class="board-card-name" :title="getSlotDisplayModel(slot).name">{{ getSlotDisplayModel(slot).name }}</div>
                <div class="board-card-desc" :title="getSlotDisplayModel(slot).description || '\u6682\u65e0\u63cf\u8ff0'">{{ getSlotDisplayModel(slot).description || '\u6682\u65e0\u63cf\u8ff0' }}</div>
                <div class="board-card-meta">
                  <span>{{ getSlotDisplayModel(slot).fields.length }} 个字段</span>
                  <span>{{ resolveRefStandardModelName(getSlotDisplayModel(slot).refStandardModel) }}</span>
                </div>
                <button
                  v-if="!getSlotDisplayModel(slot).isRelease"
                  type="button"
                  class="board-card-delete-btn"
                  @click.stop="deleteProjectModel(getSlotDisplayModel(slot))"
                >
                  <span class="material-icons" style="font-size: 14px;">delete</span>
                </button>
                <div
                  v-if="activeSlotMenu === slot.slotKey && slot.models.length > 1"
                  class="board-card-switcher"
                  @click.stop
                >
                  <button
                    v-for="model in slot.models"
                    :key="model.id"
                    type="button"
                    class="board-card-switcher-item"
                    :class="{ active: String(getSlotDisplayModel(slot).id) === String(model.id) }"
                    @click.stop="selectSlotModel(slot.slotKey, model.id)"
                  >
                    <span class="board-card-switcher-name" :title="model.name">{{ model.name }}</span>
                    <span class="board-card-switcher-status">{{ model.isRelease ? '\u5df2\u53d1\u5e03' : '\u672a\u53d1\u5e03' }}</span>
                  </button>
                </div>
              </button>

              <button
                v-else
                class="board-card board-card-empty board-card-empty-action"
                type="button"
                @click="createProjectModelForSlot(row.key, slot.column.key)"
              >
                <div class="board-card-top">
                  <span class="board-card-type">{{ slot.column.label }}</span>
                </div>
                <span class="material-icons board-empty-add-icon">add</span>
              </button>
            </div>

            <button class="board-card board-card-add" type="button" @click="createProjectModelForRat(row.key)">
              <span class="material-icons board-add-icon">add</span>
              <span class="board-add-text">新增{{ row.label }}模型</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { projectModelsApi, standardModelsApi } from '@/api/index.js';
import { useAppStore } from '@/store/app.store.js';
import { normalizeProjectModel, normalizeStandardModel, unwrapApiList, useModelStore } from '@/store/model.store.js';
import { $confirm, $error, $success } from '@/utils/message.js';

const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();
const activeSlotMenu = ref('');
const slotSelectedModelMap = ref({});

const RAT_ROWS = [
  { key: 'NR', label: '5G' },
  { key: 'LTE', label: '4G' },
  { key: 'UMTS', label: '3G' },
  { key: 'GSM', label: '2G' }
];

const BOARD_COLUMNS = [
  { key: 'ep', label: '工参' },
  { key: 'HW', label: '华为' },
  { key: 'ZTE', label: '中兴' },
  { key: 'ERI', label: '\u7231\u7acb\u4fe1' },
  { key: 'NSN', label: '\u8bfa\u57fa\u4e9a\u897f\u95e8\u5b50' }
];

const RAT_TO_UI_STANDARD = {
  NR: '5G',
  LTE: '4G',
  UMTS: '3G',
  GSM: '2G'
};

const COLUMN_TO_STANDARD_TYPE = {
  ep: '\u5de5\u53c2',
  HW: 'Counter',
  ZTE: 'Counter',
  ERI: 'Counter',
  NSN: 'Counter'
};
const COLUMN_TO_VENDOR = {
  HW: '\u534e\u4e3a',
  ZTE: '\u4e2d\u5174',
  ERI: '\u7231\u7acb\u4fe1',
  NSN: '\u8bfa\u57fa\u4e9a\u897f\u95e8\u5b50'
};

const toText = (value) => String(value ?? '').trim();

const projectModels = computed(() => {
  return modelStore.projectModels.filter((item) => Number(item.projectId) === Number(appStore.currentProject));
});

const resolveCurrentProjectCode = () => {
  return String(appStore.currentProjectCode || appStore.currentProject || '').trim();
};

const resolveRatKey = (item) => {
  const rat = toText(item?.rat || item?.tags?.standard || item?.format).toUpperCase();
  if (rat === '5G') return 'NR';
  if (rat === '4G') return 'LTE';
  if (rat === '3G') return 'UMTS';
  if (rat === '2G') return 'GSM';
  return rat;
};

const resolveColumnKey = (item) => {
  const type = toText(item?.tags?.type || item?.businessModelType).toLowerCase();
  if (type === 'ep' || type === '工参') return 'ep';

  const vendor = toText(item?.vendor || item?.factory || item?.tags?.vendor).toUpperCase();
  if (vendor === 'HW') return 'HW';
  if (vendor === 'ZTE') return 'ZTE';
  if (['E', 'ERIC', 'ERICSSON', 'ERI'].includes(vendor)) return 'ERI';
  if (vendor === 'NSN') return 'NSN';
  return '';
};

const getProjectBoardRow = (ratKey) => {
  return BOARD_COLUMNS.map((column) => {
    const models = projectModels.value.filter((item) => {
      return resolveRatKey(item) === ratKey && resolveColumnKey(item) === column.key;
    });

    return {
      column,
      models,
      model: models[0] || null,
      slotKey: `${ratKey}_${column.key}`
    };
  });
};

const getSlotDisplayModel = (slot) => {
  const models = Array.isArray(slot?.models) ? slot.models : [];
  if (models.length === 0) return null;
  const selectedId = String(slotSelectedModelMap.value?.[slot.slotKey] || '').trim();
  return models.find((item) => String(item.id) === selectedId) || models[0];
};

const resolveRefStandardModelName = (refStandardModel) => {
  const key = String(refStandardModel ?? '').trim();
  if (!key) return '-';

  const target = modelStore.standardModels.find((item) => {
    const id = String(item.id ?? '').trim();
    const code = String(item.code || item.modelCode || '').trim();
    const name = String(item.name || '').trim();
    return key === id || key === code || key === name;
  });

  return target?.name || key;
};

const openProjectModel = (model) => {
  router.push(`/designer/project-models/${model.id}/edit`);
};

const deleteProjectModel = async (model) => {
  const target = model || null;
  if (!target || target.isRelease) return;
  const modelCode = String(target.modelCode || target.code || target.id || '').trim();
  if (!modelCode) {
    $error('删除失败：模型编码为空');
    return;
  }

  await $confirm(`确认删除模型“${target.name || modelCode}”吗？`, '删除模型', {
    onOk: async () => {
      try {
        await projectModelsApi.remove({ modelType: 'business', modelCodeList: [modelCode] });
        modelStore.removeProjectModelById(target.id || modelCode);
        activeSlotMenu.value = '';
        $success('模型删除成功');
      } catch {
        $error('模型删除失败');
      }
    }
  });
};

const toggleSlotModelMenu = (slotKey) => {
  activeSlotMenu.value = activeSlotMenu.value === slotKey ? '' : slotKey;
};

const selectSlotModel = (slotKey, modelId) => {
  slotSelectedModelMap.value = {
    ...(slotSelectedModelMap.value || {}),
    [slotKey]: modelId
  };
  activeSlotMenu.value = '';
};

const createProjectModelForRat = (ratKey) => {
  router.push({
    path: '/designer/project-models/new',
    query: { rat: ratKey, standard: RAT_TO_UI_STANDARD[ratKey] || '' }
  });
};

const createProjectModelForSlot = (ratKey, columnKey) => {
  router.push({
    path: '/designer/project-models/new',
    query: {
      rat: ratKey,
      standard: RAT_TO_UI_STANDARD[ratKey] || '',
      type: COLUMN_TO_STANDARD_TYPE[columnKey] || '',
      vendor: COLUMN_TO_VENDOR[columnKey] || ''
    }
  });
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

const loadStandardModels = async () => {
  try {
    const response = await standardModelsApi.list({ modelType: 'base' });
    const list = unwrapApiList(response);
    modelStore.setStandardModels(list.map((item) => normalizeStandardModel(item)));
  } catch {
    modelStore.setStandardModels([]);
  }
};

onMounted(async () => {
  appStore.setRole('designer');
  await loadStandardModels();
  await loadProjectModels();
  document.addEventListener('click', closeSlotMenuOnOutsideClick, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', closeSlotMenuOnOutsideClick, true);
});

const closeSlotMenuOnOutsideClick = (event) => {
  const target = event?.target;
  if (!(target instanceof Element)) return;
  if (target.closest('.board-card-switcher') || target.closest('.board-card-badge-btn')) return;
  activeSlotMenu.value = '';
};
</script>

<style scoped>
.board-wrapper {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(24, 121, 184, 0.1);
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 10px 30px rgba(24, 121, 184, 0.06);
}

.board-header-grid,
.board-row-grid {
  display: grid;
  grid-template-columns: 72px repeat(5, minmax(0, 1fr)) 58px;
  gap: 14px;
}

.board-header-cell {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(237, 250, 255, 0.72);
  color: #4b6a82;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.board-header-spacer {
  min-height: 34px;
}

.board-corner {
  min-height: 40px;
}

.board-rat-label {
  display: flex;
  align-items: center;
  justify-content: center;
}

.board-rat-chip {
  min-width: 44px;
  height: 28px;
  padding: 0 10px;
  border-radius: 9px;
  background: rgba(15, 136, 168, 0.08);
  color: #2a748e;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(15, 136, 168, 0.12);
  font-size: 12px;
  font-weight: 700;
}

.board-slot {
  min-width: 0;
}

.board-card {
  width: 100%;
  min-height: 156px;
  border: 1px solid rgba(24, 121, 184, 0.1);
  border-radius: 14px;
  background: #ffffff;
  padding: 13px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  position: relative;
}

.board-card:not(.board-card-empty):not(.board-card-add) {
  cursor: pointer;
}

.board-card:not(.board-card-empty):not(.board-card-add):hover,
.board-card-add:hover {
  transform: translateY(-2px);
  border-color: rgba(24, 121, 184, 0.2);
  box-shadow: 0 12px 24px rgba(24, 121, 184, 0.08);
}

.board-card-empty {
  justify-content: center;
  align-items: center;
  border-style: dashed;
  background: rgba(248, 251, 255, 0.78);
}

.board-card-empty-action {
  cursor: pointer;
  gap: 14px;
}

.board-card-add {
  min-height: 156px;
  justify-content: center;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border-style: dashed;
  border-color: rgba(43, 122, 56, 0.28);
  background: linear-gradient(180deg, #fbfffb 0%, #f1fbf3 100%);
  padding: 0;
}

.board-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.board-card-type {
  font-size: 12px;
  font-weight: 700;
  color: #6a7f98;
  letter-spacing: 0.02em;
}

.board-card-badge-btn {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border: 0;
  border-radius: 999px;
  background: rgba(24, 121, 184, 0.12);
  color: #1879b8;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.board-card-switcher {
  position: absolute;
  top: 34px;
  right: 12px;
  z-index: 10;
  width: min(240px, calc(100% - 24px));
  max-height: 220px;
  overflow: auto;
  padding: 6px;
  border: 1px solid rgba(24, 121, 184, 0.12);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(24, 121, 184, 0.14);
}

.board-card-switcher-item {
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  cursor: pointer;
}

.board-card-switcher-item:hover,
.board-card-switcher-item.active {
  background: rgba(24, 121, 184, 0.08);
}

.board-card-switcher-name {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #23384d;
  font-size: 13px;
}

.board-card-switcher-status {
  flex: 0 0 auto;
  color: #6f8095;
  font-size: 12px;
}

.board-card-delete-btn {
  align-self: flex-end;
  margin-top: auto;
  border: 0;
  background: transparent;
  color: #d64545;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.board-card-delete-btn:hover {
  color: #b52f2f;
}

.board-card-status {
  min-width: 54px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.board-card-status-active {
  background: #edf9ef;
  color: #2f7d3a;
}

.board-card-status-draft {
  background: #fff6e9;
  color: #c77911;
}

.board-card-name {
  color: #10253d;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board-card-desc {
  flex: 1;
  color: #73849a;
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.board-card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #8596aa;
  font-size: 12px;
}

.board-empty-text {
  color: #9aa8b8;
  font-size: 13px;
}

.board-empty-add-icon {
  font-size: 28px;
  color: #7a94b4;
}

.board-add-icon {
  font-size: 28px;
  color: #2b7a38;
}

.board-add-text {
  display: none;
}

.board-card-meta span:last-child {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
