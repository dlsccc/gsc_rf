<template>
  <div class="model-list-container" style="margin-top: 64px; background: linear-gradient(135deg, #f0f5ff 0%, #fafafa 100%);">
    <div class="model-edit-header">
      <div class="back-btn" @click="router.push('/owner')">
        <span class="material-icons">arrow_back</span>
      </div>
      <div class="model-list-title">
        <span class="material-icons">schema</span>
        标准数据模型列表
        <span class="model-count">共 {{ modelStore.standardModels.length }} 个模型</span>
      </div>
    </div>

    <div style="padding: 24px; max-width: 1800px; margin: 0 auto;">
      <div class="board-wrapper">
        <div class="board-header-grid">
          <div class="board-corner"></div>
          <div v-for="column in BOARD_COLUMNS" :key="column.key" class="board-header-cell">
            {{ column.label }}
          </div>
        </div>

        <div
          v-for="(row, rowIndex) in RAT_ROWS"
          :key="row.key"
          class="board-row-section"
          :style="rowIndex > 0 ? { borderTop: '1px solid rgba(31, 86, 160, 0.12)', marginTop: '14px', paddingTop: '14px' } : null"
        >
          <div class="board-row-grid">
            <div class="board-rat-label">
              <span class="board-rat-chip">{{ row.label }}</span>
            </div>

            <div
              v-for="slot in getStandardBoardRow(row.key)"
              :key="`${row.key}-${slot.column.key}`"
              class="board-slot"
            >
              <button
                v-if="slot.model"
                class="board-card"
                type="button"
                @click="openStandardModel(slot.model)"
              >
                <div class="board-card-top">
                  <span class="board-card-type">{{ slot.column.label }}</span>
                  <span v-if="slot.count > 1" class="board-card-badge">+{{ slot.count - 1 }}</span>
                </div>
                <div class="board-card-name" :title="slot.model.name">{{ slot.model.name }}</div>
                <div class="board-card-desc" :title="slot.model.description || '暂无描述'">{{ slot.model.description || '暂无描述' }}</div>
                <div class="board-card-meta">
                  <span>{{ slot.model.fields.length }} 个字段</span>
                  <span>查看</span>
                </div>
              </button>

              <button
                v-else
                class="board-card board-card-empty"
                type="button"
                @click="createStandardModelForSlot(row.key, slot.column.key)"
              >
                <div class="board-card-top">
                  <span class="board-card-type">{{ slot.column.label }}</span>
                </div>
                <div class="board-empty-plus">+</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { standardModelsApi } from '@/api/index.js';
import { useAppStore } from '@/store/app.store.js';
import { normalizeStandardModel, unwrapApiList, useModelStore } from '@/store/model.store.js';

const router = useRouter();
const appStore = useAppStore();
const modelStore = useModelStore();

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
  { key: 'ERI', label: '爱立信' },
  { key: 'NSN', label: '诺基亚西门子' }
];

const toText = (value) => String(value ?? '').trim();

const resolveRatKey = (item) => {
  const rat = toText(item?.rat || item?.tags?.standard || item?.format).toUpperCase();
  if (rat === '5G') { return 'NR'; }
  if (rat === '4G') { return 'LTE'; }
  if (rat === '3G') { return 'UMTS'; }
  if (rat === '2G') { return 'GSM'; }
  return rat;
};

const resolveColumnKey = (item) => {
  const type = toText(item?.tags?.type || item?.businessModelType).toLowerCase();
  if (type === 'ep' || type === '工参') { return 'ep'; }

  const vendor = toText(item?.vendor || item?.factory || item?.tags?.vendor).toUpperCase();
  if (vendor === 'HW') { return 'HW'; }
  if (vendor === 'ZTE') { return 'ZTE'; }
  if (['E', 'ERIC', 'ERICSSON', 'ERI'].includes(vendor)) { return 'ERI'; }
  if (vendor === 'NSN') { return 'NSN'; }
  return '';
};

const getStandardBoardRow = (ratKey) => {
  return BOARD_COLUMNS.map((column) => {
    const models = modelStore.standardModels.filter((item) => {
      return resolveRatKey(item) === ratKey && resolveColumnKey(item) === column.key;
    });
    return {
      column,
      model: models[0] || null,
      count: models.length
    };
  });
};

const openStandardModel = (model) => {
  router.push(`/owner/standard-models/${model.id}/edit`);
};

const createStandardModelForSlot = (ratKey, columnKey) => {
  const query = {};
  if (ratKey) {
    query.rat = ratKey;
  }
  if (columnKey === 'ep') {
    query.type = '工参';
  } else {
    query.type = 'Counter';
    query.vendor = columnKey;
  }
  router.push({ path: '/owner/standard-models/new', query });
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
  appStore.setRole('owner');
  await loadStandardModels();
});
</script>

<style scoped>
.board-wrapper {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(31, 86, 160, 0.08);
  border-radius: 16px;
  padding: 16px 18px 18px;
  box-shadow: 0 8px 24px rgba(31, 86, 160, 0.05);
}

.board-header-grid,
.board-row-grid {
  display: grid;
  grid-template-columns: 88px repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.board-header-cell {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: rgba(238, 245, 255, 0.7);
  color: #4f6582;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
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
  background: rgba(31, 86, 160, 0.08);
  color: #355b87;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(31, 86, 160, 0.12);
  font-size: 12px;
  font-weight: 700;
}

.board-slot {
  min-width: 0;
}

.board-card {
  width: 100%;
  min-height: 154px;
  border: 1px solid rgba(31, 86, 160, 0.1);
  border-radius: 14px;
  background: #ffffff;
  padding: 13px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.board-card:not(.board-card-empty) {
  cursor: pointer;
}

.board-card:not(.board-card-empty):hover {
  transform: translateY(-2px);
  border-color: rgba(31, 86, 160, 0.2);
  box-shadow: 0 12px 24px rgba(31, 86, 160, 0.08);
}

.board-card-empty {
  justify-content: center;
  align-items: center;
  border-style: dashed;
  background: rgba(248, 251, 255, 0.78);
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

.board-card-badge {
  min-width: 28px;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: #f2f6fb;
  color: #5d7390;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
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

.board-empty-plus {
  color: #6c84a0;
  font-size: 34px;
  line-height: 1;
  font-weight: 300;
}
</style>
