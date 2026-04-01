<template>
  <div style="display: flex; gap: 16px; min-height: 620px;">
    <aside class="sidebar" style="width: 280px; border-radius: 12px; border: 1px solid var(--border);">
      <div class="sidebar-header">
        <span><span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 6px;">history</span>操作记录</span>
        <span v-if="history.length > 0" class="badge">{{ history.length }}</span>
      </div>
      <div class="sidebar-content">
        <div v-if="history.length === 0" class="empty-state">
          <div class="empty-state-icon"><span class="material-icons" style="font-size: 48px;">folder_open</span></div>
          <p>暂无操作记录</p>
          <p style="font-size: 12px; margin-top: 8px;">在表中配置筛选 / 转换 / 排序 / 去重</p>
        </div>
        <div
          v-for="(item, index) in history"
          :key="`${item.type}-${item.field || 'global'}`"
          class="history-item"
          :class="{ active: activeHistoryIndex === index }"
          @click="goToHistoryItem(index)"
        >
          <div class="history-icon" :class="item.type">
            <span v-if="item.type === 'filter'" class="material-icons" style="font-size: 16px;">filter_alt</span>
            <span v-else-if="item.type === 'transform'" class="material-icons" style="font-size: 16px;">transform</span>
            <span v-else-if="item.type === 'sort'" class="material-icons" style="font-size: 16px;">sort</span>
            <span v-else-if="item.type === 'dedup'" class="material-icons" style="font-size: 16px;">delete_sweep</span>
            <span v-else class="material-icons" style="font-size: 16px;">tune</span>
          </div>
          <div class="history-content">
            <div class="history-title">{{ item.title }}</div>
            <div class="history-desc">{{ item.description }}</div>
            <div class="history-actions">
              <button class="history-btn" @click.stop="undoHistoryItem(index)">撤销</button>
              <button class="history-btn delete" @click.stop="deleteHistoryItem(index)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <div style="flex: 1; min-width: 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <button class="btn btn-default btn-sm" @click="showRawPreview = !showRawPreview">
          <span class="material-icons" style="font-size: 16px; vertical-align: middle;">
            {{ showRawPreview ? 'edit' : 'visibility' }}
          </span>
          {{ showRawPreview ? '返回处理预览' : '预览源数据' }}
        </button>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button
            class="btn btn-default btn-sm"
            :disabled="!canGenerateSuggestions || suggestionLoading"
            @click="generateSmartSuggestions"
          >
            <span class="material-icons" style="font-size: 16px; vertical-align: middle;">
              {{ suggestionLoading ? 'hourglass_top' : 'auto_awesome' }}
            </span>
            {{ suggestionLoading ? '\u667a\u80fd\u63a8\u8350\u4e2d...' : '\u667a\u80fd\u63a8\u8350' }}
          </button>
          <button
            v-if="pendingSuggestionCount > 0"
            class="btn btn-primary btn-sm"
            :disabled="suggestionLoading"
            @click="applyAllSuggestions"
          >
            <span class="material-icons" style="font-size: 16px; vertical-align: middle;">done_all</span>
            {{ '\u4e00\u952e\u91c7\u7eb3' }}({{ pendingSuggestionCount }})
          </button>
          <div v-if="history.length" class="preview-indicator">
            <span class="material-icons" style="font-size: 14px;">check_circle</span>
            {{ '\u5df2\u914d\u7f6e' }} {{ history.length }} {{ '\u4e2a\u64cd\u4f5c' }}
          </div>
        </div>
      </div>

      <div class="dedup-config">
        <div class="dedup-config-header">
          <div class="dedup-title">
            <span class="material-icons" style="color: var(--purple);">delete_sweep</span>
            <span>全局去重</span>
            <span class="tag tag-primary">全局</span>
          </div>
          <label class="dedup-toggle">
            <input type="checkbox" v-model="dedupConfig.enabled" @change="applyDedupConfig" />
            <span>启用</span>
          </label>
        </div>

        <div class="dedup-config-row">
          <div>
            <label class="form-label" style="font-size: 13px; margin-bottom: 8px;">去重字段</label>
            <div class="dedup-field-row">
              <select class="form-select dedup-select" v-model="dedupFieldSelect" @change="addDedupField">
                <option value="">选择字段...</option>
                <option
                  v-for="field in targetModelFields"
                  :key="field.name"
                  :value="field.name"
                  :disabled="dedupConfig.fields.includes(field.name)"
                >
                  {{ field.name }}
                </option>
              </select>

              <div class="dedup-tags">
                <span v-for="f in dedupConfig.fields" :key="f" class="dedup-tag">
                  {{ f }}
                  <span class="dedup-tag-close" @click="removeDedupField(f)">×</span>
                </span>
                <span v-if="dedupConfig.fields.length === 0" style="font-size: 12px; color: #bfbfbf;">未选择字段</span>
              </div>
            </div>
          </div>

          <div>
            <label class="form-label" style="font-size: 13px; margin-bottom: 8px;">保留</label>
            <select class="form-select" v-model="dedupConfig.keep" @change="applyDedupConfig">
              <option value="first">保留第一行</option>
              <option value="last">保留最后一行</option>
              <option value="any">保留任意一行</option>
            </select>
          </div>
        </div>

        <div style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
          <span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">info</span>
          选择去重字段后，将根据这些字段的组合键去重
        </div>
      </div>

      <div class="data-grid-container" ref="processGridContainer" style="margin-top: 14px; max-height: 560px;">
        <table class="data-grid">
          <thead>
            <tr>
              <th
                v-for="field in targetModelFields"
                :key="field.name"
                :colspan="isMultiMapped(field.name) && !isMergedOutput(field.name) ? getMappedSources(field.name).length : 1"
                class="level-1"
              >
                <div class="header-cell">
                  <div>
                    <span>{{ field.name }}</span>
                    <button
                      v-if="!showRawPreview && hasPendingSuggestion(field.name)"
                      class="suggestion-btn"
                      @click.stop="openSuggestionModal(field.name)"
                      title="点击查看转换建议"
                    >
                      <span class="material-icons" style="font-size: 24px;">priority_high</span>
                    </button>
                    <span v-if="!showRawPreview && sortConfig.field === field.name" class="sort-indicator">
                      {{ sortConfig.order === 'asc' ? '↑' : '↓' }}
                    </span>
                    <span v-if="!showRawPreview && hasEffectiveTransform(field.name)" class="transform-indicator">转换</span>
                  </div>
                  <div class="header-actions" v-if="!showRawPreview">
                    <div class="main-actions-vert">
                      <button class="header-btn header-btn-main" :class="{ active: isFilterActive(field.name) }" @click.stop="openFilterPopover(field.name, $event)">
                        <span class="material-icons" style="font-size: 12px; vertical-align: middle;">filter_alt</span>筛选
                      </button>
                      <button class="header-btn header-btn-main" :class="{ active: hasEffectiveTransform(field.name) }" @click.stop="openTransformModal(field.name)">
                        <span class="material-icons" style="font-size: 12px; vertical-align: middle;">transform</span>转换
                      </button>
                      <button class="header-btn header-btn-main" :class="{ active: sortConfig.field === field.name }" @click.stop="openSortPopover(field.name, $event)">
                        <span class="material-icons" style="font-size: 12px; vertical-align: middle;">sort</span>排序
                      </button>
                    </div>

                    <div class="secondary-actions-vert">
                      <button class="header-btn-icon tooltip" title="复制配置" @click.stop="copyColumnConfig(field.name)">
                        <span class="material-icons" style="font-size: 14px;">content_copy</span>
                      </button>
                      <button class="header-btn-icon tooltip" title="应用到其他列" @click.stop="openApplyModal(field.name)">
                        <span class="material-icons" style="font-size: 14px;">content_paste</span>
                      </button>
                    </div>
                  </div>
                </div>
              </th>
            </tr>

            <tr>
              <th
                v-for="field in targetModelFields"
                :key="`sub-${field.name}`"
                :colspan="isMultiMapped(field.name) ? getMappedSources(field.name).length : 1"
              >
                <template v-if="isMultiMapped(field.name) && !isMergedOutput(field.name)">
                  <span v-for="(source, idx) in getMappedSources(field.name)" :key="source.key">
                    {{ idx > 0 ? ' | ' : '' }}{{ source.name }}
                  </span>
                </template>
                <span v-else>{{ getMappingSource(field.name) || '未映射' }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in displayData.slice(0, 50)" :key="rowIndex">
              <template v-for="field in targetModelFields" :key="field.name">
                <template v-if="showRawPreview && isMultiMapped(field.name)">
                  <td v-for="src in getMappedSources(field.name)" :key="`${field.name}_${src.key}`">
                    <span>{{ row[src.key] || '' }}</span>
                  </td>
                </template>

                <template v-else-if="showRawPreview">
                  <td>
                    <span>{{ getRawValue(field.name, row) }}</span>
                  </td>
                </template>

                <template v-else>
                  <template v-if="isMultiMapped(field.name) && !isMergedOutput(field.name)">
                    <td v-for="src in getMappedSources(field.name)" :key="`${field.name}_${src.key}`">
                      <span>{{ row[src.key] || '' }}</span>
                    </td>
                  </template>
                  <template v-else>
                    <td :colspan="isMultiMapped(field.name) && !isMergedOutput(field.name) ? getMappedSources(field.name).length : 1">
                      <span>{{ getFieldValue(row, field.name) }}</span>
                    </td>
                  </template>
                </template>
              </template>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div class="field-info">
          <span><span class="material-icons" style="font-size: 16px; vertical-align: middle;">table_rows</span> 共 {{ processedData.length }} 条数据</span>
          <span v-if="hasActiveFilters" style="color: var(--warning);">，已筛选 {{ filteredOutCount }} 条</span>
          <span v-if="dedupRemovedCount > 0" style="color: var(--purple);">，去重移除 {{ dedupRemovedCount }} 条</span>
        </div>
      </div>
    </div>
  </div>

  <div
    v-if="columnPopover.show && !showRawPreview"
    class="column-popover"
    :style="{ left: `${columnPopover.x}px`, top: `${columnPopover.y}px` }"
    @click.stop
    role="dialog"
    aria-modal="true"
    :aria-label="columnPopover.type === 'filter' ? '筛选配置' : '排序配置'"
  >
    <div class="popover-title">
      <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 6px;">
        {{ columnPopover.type === 'filter' ? 'filter_alt' : 'sort' }}
      </span>
      {{ columnPopover.type === 'filter' ? '筛选配置' : '排序配置' }} - {{ columnPopover.field }}
    </div>

    <div v-if="columnPopover.type === 'filter'">
      <div class="form-group">
        <label class="form-label" style="font-size: 13px;">模式</label>
        <select v-model="filterConfigs[columnPopover.field].mode" class="form-select">
          <option value="simple">条件筛选</option>
          <option value="compound">多条件筛选</option>
          <option value="formula">公式筛选</option>
        </select>
      </div>

      <div v-if="filterConfigs[columnPopover.field].mode === 'simple'">
        <label class="form-label" style="font-size: 13px;">条件</label>
        <select v-model="filterConfigs[columnPopover.field].operator" class="form-select">
          <option value="">请选择</option>
          <option value="equals">等于</option>
          <option value="not_equals">不等于</option>
          <option value="contains">包含</option>
          <option value="is_empty">为空</option>
          <option value="is_not_empty">不为空</option>
          <option value="greater_than">大于</option>
          <option value="less_than">小于</option>
        </select>
        <input
          v-if="!['is_empty', 'is_not_empty'].includes(filterConfigs[columnPopover.field].operator)"
          v-model="filterConfigs[columnPopover.field].value"
          class="form-input"
          placeholder="请输入筛选值"
          style="margin-top: 10px;"
        />
      </div>

      <div v-if="filterConfigs[columnPopover.field].mode === 'compound'">
        <div v-if="filterConfigs[columnPopover.field].conditions && filterConfigs[columnPopover.field].conditions.length > 0">
          <div style="margin-bottom: 10px;">
            <label class="form-label" style="font-size: 13px;">条件逻辑</label>
            <select v-model="filterConfigs[columnPopover.field].logic" class="form-select" style="font-size: 12px;">
              <option value="AND">且（全部满足）</option>
              <option value="OR">或（任一满足）</option>
            </select>
          </div>

          <div
            v-for="(cond, idx) in filterConfigs[columnPopover.field].conditions"
            :key="idx"
            style="border: 1px solid var(--border); padding: 10px; border-radius: 6px; margin-bottom: 8px; background: #fafafa;"
          >
            <div style="display: flex; align-items: center; gap: 8px;">
              <select v-model="cond.operator" class="form-select" style="flex: 1;">
                <option value="">请选择</option>
                <option value="equals">等于</option>
                <option value="not_equals">不等于</option>
                <option value="contains">包含</option>
                <option value="is_empty">为空</option>
                <option value="is_not_empty">不为空</option>
                <option value="greater_than">大于</option>
                <option value="less_than">小于</option>
              </select>
              <input
                v-if="!['is_empty', 'is_not_empty'].includes(cond.operator)"
                v-model="cond.value"
                class="form-input"
                placeholder="值"
                style="flex: 1;"
              />
              <button class="btn btn-danger btn-sm" @click="removeFilterCondition(columnPopover.field, idx)" style="padding: 4px 8px; min-width: auto;">
                <span class="material-icons" style="font-size: 16px;">delete</span>
              </button>
            </div>
          </div>

          <button class="btn btn-default btn-sm" @click="addFilterCondition(columnPopover.field)" style="width: 100%; margin-top: 5px;">
            <span class="material-icons" style="font-size: 16px; vertical-align: middle;">add</span> 添加条件
          </button>
        </div>
        <div v-else style="text-align: center; padding: 20px; color: var(--text-secondary);">
          <div>暂无条件</div>
          <button class="btn btn-default btn-sm" @click="addFilterCondition(columnPopover.field)" style="margin-top: 10px;">
            <span class="material-icons" style="font-size: 16px; vertical-align: middle;">add</span> 添加筛选条件
          </button>
        </div>
      </div>

      <div v-if="filterConfigs[columnPopover.field].mode === 'formula'">
        <label class="form-label" style="font-size: 13px;">公式</label>
        <input
          v-model="filterConfigs[columnPopover.field].formula"
          class="form-input"
          placeholder="例如：=value>15 或 =NOT(ISBLANK(value))"
        />
        <div class="popover-muted" style="margin-top: 8px;">
          支持 <code>value</code>、<code>row</code>、<code>S('字段名')</code>、<code>T('目标字段')</code>
        </div>
      </div>

      <div class="popover-actions">
        <button class="btn btn-default btn-sm" @click="clearFilter(columnPopover.field)">清除</button>
        <button class="btn btn-primary btn-sm" @click="applyFilterConfig(columnPopover.field)">应用</button>
      </div>
    </div>

    <div v-if="columnPopover.type === 'sort'">
      <button class="btn btn-default btn-sm" style="width: 100%; margin-bottom: 10px;" @click="applySort(columnPopover.field, 'asc')">
        <span class="material-icons" style="font-size: 16px; vertical-align: middle;">arrow_upward</span> 升序
      </button>
      <button class="btn btn-default btn-sm" style="width: 100%; margin-bottom: 10px;" @click="applySort(columnPopover.field, 'desc')">
        <span class="material-icons" style="font-size: 16px; vertical-align: middle;">arrow_downward</span> 降序
      </button>
      <button class="btn btn-danger btn-sm" style="width: 100%;" @click="clearSort">
        <span class="material-icons" style="font-size: 16px; vertical-align: middle;">clear</span> 清除排序
      </button>
    </div>
  </div>

  <div v-if="transformModal.show" class="modal-overlay" @click="closeTransformModal" role="presentation">
    <div class="modal" @click.stop role="dialog" aria-modal="true" aria-labelledby="transform-modal-title" tabindex="-1">
      <div class="modal-header">
        <span id="transform-modal-title"><span class="material-icons" style="font-size: 20px; vertical-align: middle; margin-right: 8px; color: var(--primary);">transform</span>配置转换 - {{ transformModal.field }}</span>
        <span class="modal-close" @click="closeTransformModal" @keydown.enter="closeTransformModal" role="button" aria-label="关闭弹窗" tabindex="0"><span class="material-icons">close</span></span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label"><span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">link</span>转换链（按顺序执行）</label>
          <div class="popover-muted" style="margin-bottom: 12px; padding: 10px; background: #fafafa; border-radius: 6px;">
            多个转换步骤按顺序执行，前一步的输出作为后一步的输入
          </div>

          <div v-if="transformModal.chain && transformModal.chain.length > 0">
            <div
              v-for="(step, index) in transformModal.chain"
              :key="index"
              style="border: 1px solid var(--border); padding: 12px; border-radius: 8px; margin-bottom: 8px; background: #fafafa;"
            >
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 12px; color: var(--text-secondary);">步骤 {{ index + 1 }}</span>
                <div style="display: flex; gap: 4px;">
                  <button class="btn btn-default btn-sm" @click="moveChainStep(index, -1)" v-if="index > 0" style="padding: 2px 6px; min-width: auto;" title="上移">
                    <span class="material-icons" style="font-size: 14px;">arrow_upward</span>
                  </button>
                  <button class="btn btn-default btn-sm" @click="moveChainStep(index, 1)" v-if="index < transformModal.chain.length - 1" style="padding: 2px 6px; min-width: auto;" title="下移">
                    <span class="material-icons" style="font-size: 14px;">arrow_downward</span>
                  </button>
                  <button class="btn btn-danger btn-sm" @click="removeChainStep(index)" style="padding: 2px 6px; min-width: auto;" title="删除">
                    <span class="material-icons" style="font-size: 14px;">delete</span>
                  </button>
                </div>
              </div>
              <select v-model="step.type" class="form-select" style="font-size: 13px;" @change="onTransformTypeChange(step)">
                <option :value="TRANSFORM_TYPES.FORMAT_TIME">格式化时间</option>
                <option :value="TRANSFORM_TYPES.CALC_WEEK">计算星期数</option>
                <option :value="TRANSFORM_TYPES.CALC_WEEKDAY">计算星期几</option>
                <option :value="TRANSFORM_TYPES.SET_VALUE">固定赋值</option>
                <option :value="TRANSFORM_TYPES.CONCAT">多字段拼接</option>
                <option :value="TRANSFORM_TYPES.REPLACE">替换内容</option>
                <option :value="TRANSFORM_TYPES.FORMULA">自定义公式</option>
              </select>
              <div v-if="step.type === TRANSFORM_TYPES.FORMAT_TIME" style="margin-top: 8px;">
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="step.timeFormatMode === TIME_FORMAT_MODE.DATE ? 'btn-primary' : 'btn-default'"
                      @click="step.timeFormatMode = TIME_FORMAT_MODE.DATE"
                    >
                      YYYY-MM-DD
                    </button>
                    <span style="font-size: 12px; color: var(--text-secondary);">示例：2026-03-28</span>
                  </div>
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="step.timeFormatMode === TIME_FORMAT_MODE.YEAR ? 'btn-primary' : 'btn-default'"
                      @click="step.timeFormatMode = TIME_FORMAT_MODE.YEAR"
                    >
                      YYYY
                    </button>
                    <span style="font-size: 12px; color: var(--text-secondary);">示例：2026</span>
                  </div>
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="step.timeFormatMode === TIME_FORMAT_MODE.MONTH ? 'btn-primary' : 'btn-default'"
                      @click="step.timeFormatMode = TIME_FORMAT_MODE.MONTH"
                    >
                      YYYY-MM
                    </button>
                    <span style="font-size: 12px; color: var(--text-secondary);">示例：2026-03</span>
                  </div>
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="step.timeFormatMode === TIME_FORMAT_MODE.TIME ? 'btn-primary' : 'btn-default'"
                      @click="step.timeFormatMode = TIME_FORMAT_MODE.TIME"
                    >
                      hh:mm:ss
                    </button>
                    <span style="font-size: 12px; color: var(--text-secondary);">示例：14:30:59</span>
                  </div>
                </div>
              </div>
              <div v-if="step.type === 'concat'" style="margin-top: 8px;">
                <input v-model="step.delimiter" class="form-input" placeholder="拼接分隔符（可选）" style="font-size: 13px;" />
              </div>
              <div v-if="step.type === 'set_value'" style="margin-top: 8px;">
                <input v-model="step.fixedValue" class="form-input" placeholder="固定值" style="font-size: 13px;" />
              </div>
              <div v-if="step.type === 'replace'" style="margin-top: 8px;">
                <input v-model="step.search" class="form-input" placeholder="查找内容" style="margin-bottom: 4px; font-size: 13px;" />
                <input v-model="step.replace" class="form-input" placeholder="替换为" style="font-size: 13px;" />
              </div>
              <div v-if="step.type === 'formula'" style="margin-top: 8px;">
                <input v-model="step.formula" class="form-input" placeholder="公式，例如：=value*2" style="font-size: 13px;" />
              </div>
            </div>
          </div>
          <div v-else style="text-align: center; padding: 15px; color: var(--text-secondary); background: #fafafa; border-radius: 8px; border: 1px dashed var(--border);">
            暂无转换步骤
          </div>

          <button class="btn btn-default btn-sm" @click="addChainStep" style="width: 100%; margin-top: 8px;">
            <span class="material-icons" style="font-size: 16px; vertical-align: middle;">add</span> 添加转换步骤
          </button>
        </div>

        <div class="form-group">
          <label class="form-label"><span class="material-icons" style="font-size: 16px; vertical-align: middle; margin-right: 4px;">rule</span>条件转换</label>
          <div class="popover-muted" style="margin-bottom: 12px; padding: 10px; background: #fafafa; border-radius: 6px;">
            满足条件时才应用转换规则；未命中则保留原值
          </div>

          <div
            v-for="(rule, index) in transformModal.rules"
            :key="index"
            style="border: 1px solid var(--border); padding: 14px; border-radius: 8px; margin-bottom: 10px; background: #fafafa;"
          >
            <div class="form-group">
              <label class="form-label" style="font-size: 12px;">条件</label>
              <select v-model="rule.operator" class="form-select">
                <option value="">请选择</option>
                <option value="equals">等于</option>
                <option value="not_equals">不等于</option>
                <option value="contains">包含</option>
                <option value="is_empty">为空</option>
                <option value="is_not_empty">不为空</option>
                <option value="greater_than">大于</option>
                <option value="less_than">小于</option>
              </select>
              <input v-if="!['is_empty', 'is_not_empty'].includes(rule.operator)" v-model="rule.value" class="form-input" placeholder="请输入条件值" style="margin-top: 8px;" />
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 12px;">转换类型</label>
              <select v-model="rule.type" class="form-select" @change="onTransformTypeChange(rule)">
                <option :value="TRANSFORM_TYPES.FORMAT_TIME">格式化时间</option>
                <option :value="TRANSFORM_TYPES.CALC_WEEK">计算星期数</option>
                <option :value="TRANSFORM_TYPES.CALC_WEEKDAY">计算星期几</option>
                <option :value="TRANSFORM_TYPES.SET_VALUE">固定赋值</option>
                <option :value="TRANSFORM_TYPES.CONCAT">多字段拼接</option>
                <option :value="TRANSFORM_TYPES.REPLACE">替换内容</option>
                <option :value="TRANSFORM_TYPES.FORMULA">自定义公式</option>
              </select>
            </div>
            <div v-if="rule.type === TRANSFORM_TYPES.FORMAT_TIME" class="form-group">
              <label class="form-label" style="font-size: 12px;">格式类型</label>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="rule.timeFormatMode === TIME_FORMAT_MODE.DATE ? 'btn-primary' : 'btn-default'"
                    @click="rule.timeFormatMode = TIME_FORMAT_MODE.DATE"
                  >
                    YYYY-MM-DD
                  </button>
                  <span style="font-size: 12px; color: var(--text-secondary);">示例：2026-03-28</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="rule.timeFormatMode === TIME_FORMAT_MODE.YEAR ? 'btn-primary' : 'btn-default'"
                    @click="rule.timeFormatMode = TIME_FORMAT_MODE.YEAR"
                  >
                    YYYY
                  </button>
                  <span style="font-size: 12px; color: var(--text-secondary);">示例：2026</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="rule.timeFormatMode === TIME_FORMAT_MODE.MONTH ? 'btn-primary' : 'btn-default'"
                    @click="rule.timeFormatMode = TIME_FORMAT_MODE.MONTH"
                  >
                    YYYY-MM
                  </button>
                  <span style="font-size: 12px; color: var(--text-secondary);">示例：2026-03</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="rule.timeFormatMode === TIME_FORMAT_MODE.TIME ? 'btn-primary' : 'btn-default'"
                    @click="rule.timeFormatMode = TIME_FORMAT_MODE.TIME"
                  >
                    hh:mm:ss
                  </button>
                  <span style="font-size: 12px; color: var(--text-secondary);">示例：14:30:59</span>
                </div>
              </div>
            </div>

            <div v-if="rule.type === 'concat'" class="form-group">
              <label class="form-label" style="font-size: 12px;">拼接分隔符</label>
              <input v-model="rule.delimiter" class="form-input" placeholder="例如：_ 或 留空" />
            </div>

            <div v-if="rule.type === 'set_value'" class="form-group">
              <label class="form-label" style="font-size: 12px;">固定值</label>
              <input v-model="rule.fixedValue" class="form-input" placeholder="例如：100" />
            </div>

            <div v-if="rule.type === 'replace'" class="form-group">
              <label class="form-label" style="font-size: 12px;">替换内容</label>
              <input v-model="rule.search" class="form-input" placeholder="查找内容" style="margin-bottom: 8px;" />
              <input v-model="rule.replace" class="form-input" placeholder="替换为" />
            </div>

            <div v-if="rule.type === 'formula'" class="form-group">
              <label class="form-label" style="font-size: 12px;">公式</label>
              <input v-model="rule.formula" class="form-input" placeholder="例如：=value*2" />
            </div>

            <button class="btn btn-danger btn-sm" @click="removeTransformRule(index)">
              <span class="material-icons" style="font-size: 14px;">delete</span> 删除此条件转换
            </button>
          </div>

          <button class="btn btn-default btn-sm" @click="addTransformRule">
            <span class="material-icons" style="font-size: 14px;">add</span> 添加条件转换
          </button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-default" @click="closeTransformModal">取消</button>
        <button class="btn btn-primary" @click="confirmTransform">确认转换</button>
      </div>
    </div>
  </div>

  <div v-if="applyModal.show" class="modal-overlay" @click="closeApplyModal" role="presentation">
    <div class="modal" @click.stop role="dialog" aria-modal="true" aria-labelledby="apply-modal-title" tabindex="-1">
      <div class="modal-header">
        <span id="apply-modal-title"><span class="material-icons" style="font-size: 20px; vertical-align: middle; margin-right: 8px; color: var(--primary);">content_paste</span>应用配置 - 来源列 {{ applyModal.sourceField }}</span>
        <span class="modal-close" @click="closeApplyModal" @keydown.enter="closeApplyModal" role="button" aria-label="关闭弹窗" tabindex="0"><span class="material-icons">close</span></span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">搜索字段</label>
          <input v-model="applyModal.search" class="form-input" placeholder="输入字段名关键字" />
        </div>

        <div class="form-group">
          <label class="form-label">快捷规则</label>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-default btn-sm" @click="selectByPrefix">同前缀</button>
            <button class="btn btn-default btn-sm" @click="selectByType">同类型</button>
            <button class="btn btn-default btn-sm" @click="selectAll">全选</button>
            <button class="btn btn-default btn-sm" @click="clearAll">清空</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">选择目标列</label>
          <div style="max-height: 240px; overflow:auto; border:1px solid var(--border); border-radius:8px; padding:12px;">
            <div v-for="f in filteredApplyTargets" :key="f.name" style="margin-bottom:8px;">
              <label style="display:flex; align-items:center; gap:10px; cursor: pointer; padding: 6px; border-radius: 4px; transition: background 0.2s;" @mouseover="hoverTarget = f.name" @mouseleave="hoverTarget = null" :style="hoverTarget === f.name ? 'background: #f5f5f5;' : ''">
                <input type="checkbox" v-model="applyModal.selected" :value="f.name" style="width: 16px; height: 16px;" />
                <span style="flex: 1;">{{ f.name }}</span>
                <span class="tag" :class="f.type === 'STRING' ? 'tag-primary' : 'tag-warning'">{{ f.type }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">应用内容</label>
          <div style="padding: 12px; background: #fafafa; border-radius: 8px;">
            <label style="display:block; font-size:13px; margin-bottom:10px; cursor: pointer;"><input type="checkbox" v-model="applyModal.applyFilter" style="margin-right: 8px;" /> 筛选</label>
            <label style="display:block; font-size:13px; margin-bottom:10px; cursor: pointer;"><input type="checkbox" v-model="applyModal.applyTransform" style="margin-right: 8px;" /> 转换</label>
            <label style="display:block; font-size:13px; margin-bottom:0; cursor: pointer;"><input type="checkbox" v-model="applyModal.applySort" style="margin-right: 8px;" /> 排序</label>
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 0;">
          <label style="display:block; font-size:13px; cursor: pointer;"><input type="checkbox" v-model="applyModal.override" style="margin-right: 8px;" /> 覆盖已有配置</label>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-default" @click="closeApplyModal">取消</button>
        <button class="btn btn-primary" @click="applyColumnConfig">应用</button>
      </div>
    </div>
  </div>

  <div v-if="transformSuggestionModal.show" class="modal-overlay" @click="closeSuggestionModal" role="presentation">
    <div class="modal" @click.stop role="dialog" aria-modal="true" aria-labelledby="suggestion-modal-title" tabindex="-1" style="max-width: 480px;">
      <div class="modal-header">
        <span id="suggestion-modal-title">
          <span class="material-icons" style="font-size: 20px; vertical-align: middle; margin-right: 8px; color: var(--warning);">lightbulb</span>
          转换建议 - {{ transformSuggestionModal.field }}
        </span>
        <span class="modal-close" @click="closeSuggestionModal" @keydown.enter="closeSuggestionModal" role="button" aria-label="关闭弹窗" tabindex="0"><span class="material-icons">close</span></span>
      </div>
      <div class="modal-body">
        <div style="padding: 20px; background: linear-gradient(135deg, #fff7e6 0%, #fffbe6 100%); border-radius: 12px; border: 1px solid #ffe58f; margin-bottom: 20px;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span class="material-icons" style="color: var(--warning); font-size: 24px;">tips_and_updates</span>
            <div>
              <div style="font-weight: 600; color: var(--text); margin-bottom: 8px;">智能推荐</div>
              <div style="color: var(--text-secondary); line-height: 1.6;">{{ transformSuggestionModal.suggestion }}</div>
            </div>
          </div>
        </div>
        <div style="font-size: 13px; color: var(--text-secondary);">
          <span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">info</span>
          点击"确认应用"后将自动配置该转换规则
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-default" @click="dismissSuggestion">取消</button>
        <button class="btn btn-primary" @click="confirmSuggestion"><span class="material-icons" style="font-size: 16px;">check</span> 确认应用</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { DEDUP_KEEP, SORT_ORDER, TRANSFORM_TYPES } from '@/utils/constants/pipeline.js';
import { apiSystemService } from '@/api/index.js';
import { useModelStore } from '@/store/model.store.js';
import { $error, $success, $warning } from '@/utils/message.js';

const props = defineProps({
  store: { type: Object, required: true },
  debugRows: { type: Array, default: () => [] }
});
const emit = defineEmits(['operation-applied']);

const modelStore = useModelStore();
const processGridContainer = ref(null);
const showRawPreview = ref(false);
const previousFocus = ref(null);
const hoverTarget = ref(null);

const filterConfigs = props.store.filters;
const transforms = props.store.transforms;
const sortConfig = props.store.sortConfig;
const dedupConfig = props.store.dedupConfig;

const FILTER_OPERATOR_LABELS = Object.freeze({
  equals: '等于',
  not_equals: '不等于',
  contains: '包含',
  is_empty: '为空',
  is_not_empty: '不为空',
  greater_than: '大于',
  less_than: '小于'
});

const FILTER_LOGIC_LABELS = Object.freeze({
  AND: '且',
  OR: '或'
});

const TRANSFORM_TYPE_LABELS = Object.freeze({
  [TRANSFORM_TYPES.UPPERCASE]: '转大写',
  [TRANSFORM_TYPES.LOWERCASE]: '转小写',
  [TRANSFORM_TYPES.TRIM]: '去首尾空格',
  [TRANSFORM_TYPES.FORMAT_DATETIME]: '格式化日期时间',
  [TRANSFORM_TYPES.EXTRACT_YEAR]: '提取年份',
  [TRANSFORM_TYPES.EXTRACT_MONTH]: '提取月份',
  [TRANSFORM_TYPES.EXTRACT_TIME]: '提取时间',
  [TRANSFORM_TYPES.FORMAT_TIME]: '格式化时间',
  [TRANSFORM_TYPES.CALC_WEEK]: '计算星期数',
  [TRANSFORM_TYPES.CALC_WEEKDAY]: '计算星期几',
  [TRANSFORM_TYPES.TO_NUMBER]: '转数字',
  [TRANSFORM_TYPES.REMOVE_THOUSAND_SEP]: '去掉千分位',
  [TRANSFORM_TYPES.REMOVE_PERCENT]: '去掉百分号',
  [TRANSFORM_TYPES.SET_VALUE]: '固定赋值',
  [TRANSFORM_TYPES.CONCAT]: '多字段拼接',
  [TRANSFORM_TYPES.REPLACE]: '替换内容',
  [TRANSFORM_TYPES.FORMULA]: '自定义公式'
});

const getFilterOperatorLabel = (operator) => FILTER_OPERATOR_LABELS[operator] || operator || '';
const getFilterLogicLabel = (logic) => FILTER_LOGIC_LABELS[logic] || logic || '';
const getTransformTypeLabel = (type) => TRANSFORM_TYPE_LABELS[type] || type || '';

const history = ref([]);
const activeHistoryIndex = ref(-1);

const columnPopover = reactive({ show: false, x: 0, y: 0, field: '', type: '' });

const transformModal = reactive({
  show: false,
  field: '',
  rules: [],
  chain: []
});

const copiedConfig = ref(null);

const applyModal = reactive({
  show: false,
  sourceField: '',
  search: '',
  selected: [],
  applyFilter: true,
  applyTransform: true,
  applySort: false,
  override: false
});

const transformSuggestionModal = reactive({
  show: false,
  field: '',
  suggestion: '',
  config: null
});

const pendingTransformSuggestions = ref({});
const suggestionLoading = ref(false);
const dedupFieldSelect = ref('');

const targetModelFields = computed(() => props.store.targetFields || []);

const debugProcessedData = computed(() => {
  return (Array.isArray(props.debugRows) ? props.debugRows : []).map((item) => {
    const next = item && typeof item === 'object' && !Array.isArray(item)
      ? { ...item }
      : { value: item };
    next.__remoteDebugRow = true;
    return next;
  });
});

const usingRemoteDebugData = computed(() => debugProcessedData.value.length > 0);

const allSourceFields = computed(() => {
  return (props.store.sourceFields || []).map((field) => ({
    ...field,
    sourceId: field.source
  }));
});

const selectedModel = computed(() => {
  return modelStore.projectModels.find((item) => String(item.id) === String(props.store.selectedModelId)) || null;
});

const selectedModelName = computed(() => selectedModel.value?.name || '');

const pendingSuggestionCount = computed(() => Object.keys(pendingTransformSuggestions.value || {}).length);

const canGenerateSuggestions = computed(() => {
  const hasModel = !!selectedModel.value;
  const hasFiles = Array.isArray(props.store.uploadedFiles) && props.store.uploadedFiles.length > 0;
  const hasMappings = Object.keys(props.store.mappings || {}).length > 0;
  return hasModel && hasFiles && hasMappings;
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

const isMultiMapped = (targetField) => {
  if (usingRemoteDebugData.value) return false;
  const sources = props.store.mappings[targetField];
  return Array.isArray(sources) && sources.length > 1;
};

const getMappedSources = (targetField) => {
  const keys = props.store.mappings[targetField] || [];
  return keys.map((key) => {
    const field = allSourceFields.value.find((item) => item.key === key);
    if (field) return field;
    return { key, name: key, sourceId: key.startsWith('table_b') ? 'table_b' : 'table_a' };
  });
};

const getMappingSource = (targetField) => {
  const keys = props.store.mappings[targetField] || [];
  if (keys.length === 0) return '';
  if (keys.length > 1) {
    return keys
      .map((key) => {
        const field = allSourceFields.value.find((item) => item.key === key);
        return field ? field.name : key;
      })
      .join(' + ');
  }
  const field = allSourceFields.value.find((item) => item.key === keys[0]);
  return field ? field.name : keys[0];
};

const parseDateTime = (val) => {
  if (!val) return { y: '', m: '', d: '', h: '', min: '', s: '', t: '' };
  const str = String(val).trim();
  const parts = str.split(' ');
  const datePart = parts[0] || '';
  const timePart = parts[1] || '';
  let y = '';
  let m = '';
  let d = '';

  if (datePart.includes('.')) {
    [y, m, d] = datePart.split('.');
  } else if (datePart.includes('-')) {
    [y, m, d] = datePart.split('-');
  } else if (datePart.includes('/')) {
    [y, m, d] = datePart.split('/');
  }

  if (m) m = m.padStart(2, '0');
  if (d) d = d.padStart(2, '0');

  let h = '';
  let min = '';
  let s = '';
  if (timePart) {
    const timeParts = timePart.split(':');
    h = timeParts[0] || '';
    min = timeParts[1] || '';
    s = timeParts[2] || '';
  }

  return { y, m, d, h, min, s, t: timePart };
};

const formatDateTime = (val) => {
  const { y, m, d, t } = parseDateTime(val);
  if (!y) return val || '';
  if (!t) return `${y}-${m}-${d}`;
  return `${y}-${m}-${d} ${t}`;
};

const getSourceValue = (row, name) => {
  if (!name) return '';
  if (row[name] !== undefined) return row[name];

  const field = allSourceFields.value.find((item) => item.name === name);
  if (field && row[field.key] !== undefined) return row[field.key];

  if (row[`table_a.${name}`] !== undefined) return row[`table_a.${name}`];
  if (row[`table_b.${name}`] !== undefined) return row[`table_b.${name}`];
  return '';
};

const getBaseValue = (field, row) => {
  const keys = props.store.mappings[field] || [];
  if (keys.length === 0) return '';
  if (keys.length === 1) return row[keys[0]] ?? '';
  return keys.map((key) => row[key] ?? '').join('');
};

const evalFormula = (formula, ctx) => {
  if (!formula) return ctx.value;
  let expr = String(formula).trim();
  if (expr.startsWith('=')) expr = expr.slice(1);

  const resolveColumnValue = (name, row) => {
    if (!name) return '';
    const sourceField = allSourceFields.value.find((item) => item.name === name);
    if (sourceField) {
      return row[sourceField.key] ?? '';
    }
    if (row[name] !== undefined) return row[name];
    if (row[`table_a.${name}`] !== undefined) return row[`table_a.${name}`];
    if (row[`table_b.${name}`] !== undefined) return row[`table_b.${name}`];
    return '';
  };

  const helpers = {
    UPPER: (v) => String(v).toUpperCase(),
    LOWER: (v) => String(v).toLowerCase(),
    TRIM: (v) => String(v).trim(),
    CONCAT: (...args) => args.join(''),
    LEFT: (v, n) => String(v).substring(0, Number(n) || 0),
    RIGHT: (v, n) => String(v).slice(-(Number(n) || 0)),
    MID: (v, s, l) => String(v).substr(Number(s) || 0, Number(l) || 0),
    LEN: (v) => String(v).length,
    NUMBER: (v) => Number(String(v).replace(/,/g, '')) || 0,
    REPLACE: (v, a, b) => String(v).replace(a, b),
    SUBSTITUTE: (v, a, b) => String(v).replaceAll(a, b),
    YEAR: (v) => parseDateTime(v).y,
    MONTH: (v) => parseDateTime(v).m,
    DAY: (v) => parseDateTime(v).d,
    TIME: (v) => parseDateTime(v).t,
    ISBLANK: (v) => v === null || v === undefined || String(v).trim() === '',
    concat: (separator, ...args) => {
      return args
        .map((arg) => {
          if (typeof arg === 'string') {
            const val = resolveColumnValue(arg, ctx.row);
            if (val !== '') return val;
          }
          return arg;
        })
        .join(separator || '');
    },
    time_format: (format, datetimeStr) => {
      const parsed = parseDateTime(String(datetimeStr));
      if (!parsed.y) return datetimeStr;

      let result = format;
      result = result.replace(/YYYY/g, parsed.y || '');
      result = result.replace(/YY/g, (parsed.y || '').slice(-2));
      result = result.replace(/MM/g, (parsed.m || '').padStart(2, '0'));
      result = result.replace(/M/g, parsed.m || '');
      result = result.replace(/DD/g, (parsed.d || '').padStart(2, '0'));
      result = result.replace(/D/g, parsed.d || '');
      result = result.replace(/hh/g, (parsed.h || '00').padStart(2, '0'));
      result = result.replace(/h/g, parsed.h || '0');
      result = result.replace(/mm/g, (parsed.min || '00').padStart(2, '0'));
      result = result.replace(/m/g, parsed.min || '0');
      result = result.replace(/ss/g, (parsed.s || '00').padStart(2, '0'));
      result = result.replace(/s/g, parsed.s || '0');
      return result;
    }
  };

  const sourceFieldNames = allSourceFields.value.map((item) => item.name);

  try {
    let processedExpr = expr;
    const knownHelpers = [
      'UPPER',
      'LOWER',
      'TRIM',
      'CONCAT',
      'LEFT',
      'RIGHT',
      'MID',
      'LEN',
      'NUMBER',
      'REPLACE',
      'SUBSTITUTE',
      'YEAR',
      'MONTH',
      'DAY',
      'TIME',
      'ISBLANK',
      'concat',
      'time_format',
      'col',
      'value',
      'row',
      'S',
      'T'
    ];

    processedExpr = processedExpr.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1|([A-Z][a-zA-Z0-9_]*)/g, (match, quote, _str, identifier) => {
      if (quote) return match;
      if (identifier) {
        if (knownHelpers.includes(identifier)) return match;
        if (sourceFieldNames.includes(identifier)) {
          return `resolveColumnValue(\"${identifier}\", row)`;
        }
      }
      return match;
    });

    const fn = new Function(
      'value',
      'row',
      'S',
      'T',
      'helpers',
      'resolveColumnValue',
      `with(helpers){ return (${processedExpr}); }`
    );

    return fn(ctx.value, ctx.row, ctx.S, ctx.T, helpers, resolveColumnValue);
  } catch {
    return ctx.value;
  }
};

const passesTransformRule = (row, fieldName, rule) => {
  const value = getBaseValue(fieldName, row);
  switch (rule.operator) {
    case 'equals':
      return String(value) === String(rule.value);
    case 'not_equals':
      return String(value) !== String(rule.value);
    case 'contains':
      return String(value).includes(rule.value);
    case 'is_empty':
      return value === null || value === undefined || String(value).trim() === '';
    case 'is_not_empty':
      return !(value === null || value === undefined || String(value).trim() === '');
    case 'greater_than':
      return Number(value) > Number(rule.value);
    case 'less_than':
      return Number(value) < Number(rule.value);
    default:
      return false;
  }
};

const applyTransformByConfig = (row, field, base, cfg) => {
  switch (cfg.type) {
    case TRANSFORM_TYPES.UPPERCASE:
      return String(base).toUpperCase();
    case TRANSFORM_TYPES.LOWERCASE:
      return String(base).toLowerCase();
    case TRANSFORM_TYPES.TRIM:
      return String(base).trim();
    case TRANSFORM_TYPES.FORMAT_DATETIME:
      return formatDateTime(base);
    case TRANSFORM_TYPES.EXTRACT_YEAR:
      return parseDateTime(base).y || '';
    case TRANSFORM_TYPES.EXTRACT_MONTH: {
      const parsed = parseDateTime(base);
      return parsed.y && parsed.m ? `${parsed.y}-${parsed.m.padStart(2, '0')}` : '';
    }
    case TRANSFORM_TYPES.EXTRACT_TIME:
      return parseDateTime(base).t || '';
    case TRANSFORM_TYPES.FORMAT_TIME: {
      const time = String(base).trim();
      const match = time.match(/^(\d{1,2}):(\d{2})$/);
      if (match) return `${match[1].padStart(2, '0')}:${match[2]}:00`;
      return time;
    }
    case TRANSFORM_TYPES.CALC_WEEK: {
      const parsed = parseDateTime(base);
      if (!parsed.y || !parsed.m || !parsed.d) return '';
      const date = new Date(parseInt(parsed.y, 10), parseInt(parsed.m, 10) - 1, parseInt(parsed.d, 10));
      const startOfYear = new Date(parseInt(parsed.y, 10), 0, 1);
      const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
      return String(Math.ceil(days / 7));
    }
    case TRANSFORM_TYPES.CALC_WEEKDAY: {
      const parsed = parseDateTime(base);
      if (!parsed.y || !parsed.m || !parsed.d) return '';
      const date = new Date(parseInt(parsed.y, 10), parseInt(parsed.m, 10) - 1, parseInt(parsed.d, 10));
      const day = date.getDay();
      return day === 0 ? '7' : String(day);
    }
    case TRANSFORM_TYPES.TO_NUMBER:
      return Number(String(base).replace(/,/g, '').replace(/%/g, '')) || 0;
    case TRANSFORM_TYPES.REMOVE_THOUSAND_SEP:
      return String(base).replace(/,/g, '');
    case TRANSFORM_TYPES.REMOVE_PERCENT:
      return String(base).replace(/%/g, '');
    case TRANSFORM_TYPES.SET_VALUE:
      return cfg.fixedValue || '';
    case TRANSFORM_TYPES.CONCAT: {
      const keys = props.store.mappings[field] || [];
      const delimiter = cfg.delimiter || '';
      return keys.map((key) => row[key] || '').join(delimiter);
    }
    case TRANSFORM_TYPES.REPLACE:
      return String(base).replace(cfg.search || '', cfg.replace || '');
    case TRANSFORM_TYPES.FORMULA: {
      const context = {
        value: base,
        row,
        S: (name) => getSourceValue(row, name),
        T: (name) => getBaseValue(name, row)
      };
      return evalFormula(cfg.formula, context);
    }
    default:
      return base;
  }
};

const getFieldValue = (row, field) => {
  if (row?.__remoteDebugRow) {
    return row?.[field] ?? '';
  }

  const base = getBaseValue(field, row);
  const t = transforms[field];
  if (!t) return base;

  if (Array.isArray(t.chain) && t.chain.length > 0) {
    let result = base;
    t.chain.forEach((step) => {
      result = applyTransformByConfig(row, field, result, step);
    });
    return result;
  }

  if (Array.isArray(t.rules) && t.rules.length > 0) {
    for (const rule of t.rules) {
      if (!rule.operator) continue;
      if (passesTransformRule(row, field, rule)) {
        return applyTransformByConfig(row, field, base, rule);
      }
    }
    return base;
  }

  if (t.type) {
    return applyTransformByConfig(row, field, base, t);
  }

  return base;
};

const passesFilter = (row, fieldName) => {
  const conf = filterConfigs[fieldName];
  if (!conf) return true;

  const value = getFieldValue(row, fieldName);

  if (conf.mode === 'formula') {
    if (!conf.formula) return true;
    const context = {
      value,
      row,
      S: (name) => getSourceValue(row, name),
      T: (name) => getBaseValue(name, row)
    };
    return !!evalFormula(conf.formula, context);
  }

  if (conf.mode === 'compound') {
    if (!conf.conditions || conf.conditions.length === 0) return true;
    const results = conf.conditions.map((cond) => {
      if (!cond.operator) return true;
      switch (cond.operator) {
        case 'equals':
          return String(value) === String(cond.value);
        case 'not_equals':
          return String(value) !== String(cond.value);
        case 'contains':
          return String(value).includes(cond.value);
        case 'is_empty':
          return value === null || value === undefined || String(value).trim() === '';
        case 'is_not_empty':
          return !(value === null || value === undefined || String(value).trim() === '');
        case 'greater_than':
          return Number(value) > Number(cond.value);
        case 'less_than':
          return Number(value) < Number(cond.value);
        default:
          return true;
      }
    });

    return (conf.logic || 'AND') === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  if (!conf.operator) return true;

  switch (conf.operator) {
    case 'equals':
      return String(value) === String(conf.value);
    case 'not_equals':
      return String(value) !== String(conf.value);
    case 'contains':
      return String(value).includes(conf.value);
    case 'is_empty':
      return value === null || value === undefined || String(value).trim() === '';
    case 'is_not_empty':
      return !(value === null || value === undefined || String(value).trim() === '');
    case 'greater_than':
      return Number(value) > Number(conf.value);
    case 'less_than':
      return Number(value) < Number(conf.value);
    default:
      return true;
  }
};

const filteredData = computed(() => {
  return previewData.value.filter((row) => targetModelFields.value.every((field) => passesFilter(row, field.name)));
});

const dedupedData = computed(() => {
  if (!dedupConfig.enabled || !Array.isArray(dedupConfig.fields) || dedupConfig.fields.length === 0) {
    return filteredData.value;
  }

  const map = new Map();
  filteredData.value.forEach((row, index) => {
    const key = dedupConfig.fields.map((field) => getFieldValue(row, field)).join('||');
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { row, index });
    } else if (dedupConfig.keep === DEDUP_KEEP.LAST) {
      map.set(key, { row, index });
    }
  });

  return Array.from(map.values())
    .sort((a, b) => a.index - b.index)
    .map((item) => item.row);
});

const localProcessedData = computed(() => {
  const data = dedupedData.value;
  if (!sortConfig.field) return data;

  const sorted = [...data];
  sorted.sort((a, b) => {
    const aVal = getFieldValue(a, sortConfig.field);
    const bVal = getFieldValue(b, sortConfig.field);
    if (aVal === bVal) return 0;
    return sortConfig.order === SORT_ORDER.ASC ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });
  return sorted;
});

const processedData = computed(() => {
  if (usingRemoteDebugData.value) {
    return debugProcessedData.value;
  }
  return localProcessedData.value;
});

const displayData = computed(() => (showRawPreview.value ? previewData.value : processedData.value));

const hasActiveFilters = computed(() => {
  return Object.values(filterConfigs).some((f) => {
    if (!f) return false;
    if (f.mode === 'simple' && !!f.operator) return true;
    if (f.mode === 'formula' && !!f.formula) return true;
    if (f.mode === 'compound' && Array.isArray(f.conditions) && f.conditions.some((c) => c.operator)) return true;
    return false;
  });
});

const filteredOutCount = computed(() => (usingRemoteDebugData.value ? 0 : (previewData.value.length - filteredData.value.length)));
const dedupRemovedCount = computed(() => (usingRemoteDebugData.value ? 0 : (filteredData.value.length - dedupedData.value.length)));

const filteredApplyTargets = computed(() => {
  const keyword = applyModal.search.trim().toLowerCase();
  return targetModelFields.value
    .filter((field) => field.name !== applyModal.sourceField)
    .filter((field) => !keyword || field.name.toLowerCase().includes(keyword));
});

const updateHeaderStickyOffset = () => {
  if (!processGridContainer.value) return;
  const firstRow = processGridContainer.value.querySelector('thead tr:first-child');
  if (!firstRow) return;
  const height = firstRow.getBoundingClientRect().height;
  processGridContainer.value.style.setProperty('--header-row-1-height', `${height}px`);
};

const initFilters = () => {
  targetModelFields.value.forEach((field) => {
    if (!filterConfigs[field.name]) {
      filterConfigs[field.name] = {
        mode: 'simple',
        operator: '',
        value: '',
        formula: '',
        conditions: [],
        logic: 'AND'
      };
    }
  });
};

const addHistory = (type, title, description, field = '') => {
  const existing = history.value.findIndex((item) => item.type === type && item.field === field);
  if (existing >= 0) {
    history.value[existing] = { type, title, description, field };
  } else {
    history.value.push({ type, title, description, field });
  }
  activeHistoryIndex.value = history.value.length - 1;
};

const notifyOperationApplied = (type, field = '') => {
  emit('operation-applied', {
    type: String(type || '').trim(),
    field: String(field || '').trim(),
    timestamp: Date.now()
  });
};

const goToHistoryItem = (index) => {
  activeHistoryIndex.value = index;
};

const applyDedupConfig = () => {
  if (dedupConfig.enabled && dedupConfig.fields.length > 0) {
    addHistory(
      'dedup',
      '去重',
      `按 ${dedupConfig.fields.join(', ')} 去重，保留${dedupConfig.keep === 'first' ? '第一行' : dedupConfig.keep === 'last' ? '最后一行' : '任意一行'}`,
      'GLOBAL'
    );
  } else {
    history.value = history.value.filter((item) => item.type !== 'dedup');
  }
  notifyOperationApplied('dedup', 'GLOBAL');
};

const addDedupField = () => {
  const value = dedupFieldSelect.value;
  if (value && !dedupConfig.fields.includes(value)) {
    dedupConfig.fields.push(value);
    applyDedupConfig();
  }
  dedupFieldSelect.value = '';
};

const removeDedupField = (field) => {
  dedupConfig.fields = dedupConfig.fields.filter((item) => item !== field);
  applyDedupConfig();
};

const trimText = (value) => String(value ?? "").trim();
const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const toCamelKey = (key) => String(key ?? '').replace(/_([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());

const deepCamelize = (value) => {
  if (Array.isArray(value)) return value.map((item) => deepCamelize(item));
  if (!isPlainObject(value)) return value;
  return Object.entries(value).reduce((acc, [key, next]) => {
    acc[toCamelKey(key)] = deepCamelize(next);
    return acc;
  }, {});
};

const PROCESS_DSL_DEFINITIONS = Object.freeze({
  filter: {
    modes: ['simple', 'compound'],
    operators: ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty', 'greater_than', 'less_than'],
    logic: ['AND', 'OR']
  },
  transform: {
    types: ['format_datetime', 'extract_year', 'extract_month', 'extract_time', 'format_time', 'calc_week', 'calc_weekday', 'set_value', 'concat', 'replace'],
    operators: [
      {
        type: 'format_datetime',
        params: [
          { name: 'originType', type: 'string', required: false },
          { name: 'targetType', type: 'string', required: false }
        ],
        required: []
      },
      { type: 'calc_week', params: [], required: [] },
      { type: 'calc_weekday', params: [], required: [] },
      { type: 'set_value', params: [{ name: 'fixedValue', type: 'string', required: true }], required: ['fixedValue'] },
      { type: 'concat', params: [{ name: 'delimiter', type: 'string', required: false }], required: [] },
      { type: 'replace', params: [{ name: 'search', type: 'string', required: true }, { name: 'replace', type: 'string', required: true }], required: ['search', 'replace'] }
    ],
    disallow: ['formula']
  },
  sort: { orders: ['asc', 'desc'] }
});

const normalizeTransformType = (value) => {
  const type = trimText(value).toLowerCase();
  const typeMap = {
    format_datetime: TRANSFORM_TYPES.FORMAT_DATETIME,
    formatdatetime: TRANSFORM_TYPES.FORMAT_DATETIME,
    extract_year: TRANSFORM_TYPES.EXTRACT_YEAR,
    extractyear: TRANSFORM_TYPES.EXTRACT_YEAR,
    extract_month: TRANSFORM_TYPES.EXTRACT_MONTH,
    extractmonth: TRANSFORM_TYPES.EXTRACT_MONTH,
    extract_time: TRANSFORM_TYPES.EXTRACT_TIME,
    extracttime: TRANSFORM_TYPES.EXTRACT_TIME,
    format_time: TRANSFORM_TYPES.FORMAT_TIME,
    formattime: TRANSFORM_TYPES.FORMAT_TIME,
    calc_week: TRANSFORM_TYPES.CALC_WEEK,
    calcweek: TRANSFORM_TYPES.CALC_WEEK,
    calc_weekday: TRANSFORM_TYPES.CALC_WEEKDAY,
    calcweekday: TRANSFORM_TYPES.CALC_WEEKDAY,
    set_value: TRANSFORM_TYPES.SET_VALUE,
    setvalue: TRANSFORM_TYPES.SET_VALUE,
    concat: TRANSFORM_TYPES.CONCAT,
    replace: TRANSFORM_TYPES.REPLACE,
    formula: TRANSFORM_TYPES.FORMULA
  };
  if (typeMap[type]) return typeMap[type];
  if (Object.values(TRANSFORM_TYPES).includes(type)) return type;
  return type;
};

const inferSampleType = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'double';
  const text = trimText(value);
  if (!text) return '';
  if (!Number.isNaN(Number(text))) return text.includes('.') ? 'double' : 'integer';
  if (!Number.isNaN(Date.parse(text))) return 'datetime';
  return 'string';
};

const resolveFieldTypeFromInfo = (file = {}, fieldName = "") => {
  const target = trimText(fieldName);
  if (!target) return '';
  const fieldInfoList = Array.isArray(file?.fieldInfoList) ? file.fieldInfoList : (Array.isArray(file?.field_info_list) ? file.field_info_list : []);
  const matched = fieldInfoList.find((item) => {
    const name = trimText(item?.fieldName || item?.field_name || item?.name);
    const alias = trimText(item?.fieldAlias || item?.field_alias || item?.alias);
    return name === target || alias === target;
  });
  return trimText(matched?.fieldType || matched?.field_type || matched?.type);
};

const pickSampleValue = (rows = [], fieldName = "") => {
  const target = trimText(fieldName);
  if (!target) return '';
  const matched = (Array.isArray(rows) ? rows : []).find((row) => {
    const value = row?.[target];
    return value !== null && value !== undefined && String(value).trim() !== '';
  });
  const raw = matched?.[target] ?? '';
  return raw === null || raw === undefined ? '' : String(raw);
};

const toModelFieldListPayload = (model = null) => {
  if (!model) return [];
  const modelCode = trimText(model?.code || model?.modelCode);
  const fields = Array.isArray(model?.fields) ? model.fields : [];
  return fields.map((field, index) => {
    const rawSeq = field?.seq;
    const seq = Number.isFinite(Number(rawSeq)) ? Number(rawSeq) : (index + 1);
    return {
      modelCode,
      fieldName: trimText(field?.name || field?.fieldName),
      fieldType: trimText(field?.type || field?.fieldType),
      fieldDesc: trimText(field?.description || field?.fieldDesc),
      dataFormat: trimText(field?.format || field?.dataFormat),
      dataExample: trimText(field?.example || field?.dataExample),
      fieldBusinessType: trimText(field?.businessType || field?.fieldBusinessType),
      isNull: field?.isNull !== undefined ? !!field.isNull : true,
      seq
    };
  }).filter((field) => field.fieldName);
};

const toSourceFieldsPayload = () => {
  const fileMap = (Array.isArray(props.store.uploadedFiles) ? props.store.uploadedFiles : []).reduce((acc, file) => {
    const source = trimText(file?.source);
    if (source) acc[source] = file;
    return acc;
  }, {});

  return allSourceFields.value.map((field) => {
    const sourceTable = trimText(field?.sourceId || field?.source);
    const fieldName = trimText(field?.name);
    const fieldKey = trimText(field?.key);
    if (!sourceTable || !fieldName || !fieldKey) return null;
    const sourceFile = fileMap[sourceTable] || {};
    const sampleValue = pickSampleValue(sourceFile?.rows || [], fieldName);
    const fieldType = resolveFieldTypeFromInfo(sourceFile, fieldName) || inferSampleType(sampleValue);
    return { fieldKey, fieldName, sourceTable, fieldType: trimText(fieldType), sampleValue };
  }).filter(Boolean);
};

const toSourceDataPayload = () => {
  const sourceData = {};
  (Array.isArray(props.store.uploadedFiles) ? props.store.uploadedFiles : []).forEach((file) => {
    const sourceTable = trimText(file?.source);
    if (!sourceTable) return;
    sourceData[sourceTable] = (Array.isArray(file?.rows) ? file.rows : []).slice(0, 50).map((row) => (isPlainObject(row) ? row : {}));
  });
  return sourceData;
};

const toMappingsPayload = () => {
  const mappings = {};
  Object.entries(props.store.mappings || {}).forEach(([targetField, sourceKeys]) => {
    const target = trimText(targetField);
    if (!target) return;
    const keys = toArray(sourceKeys).map((item) => trimText(item)).filter(Boolean);
    if (keys.length > 0) mappings[target] = keys;
  });
  return mappings;
};

const buildGenerateSuggestionPayload = () => {
  const model = selectedModel.value;
  if (!model) return null;
  return {
    code: trimText(model?.code || model?.modelCode),
    modelName: trimText(model?.name || model?.modelName),
    modelDesc: trimText(model?.description || model?.modelDesc),
    modelType: trimText(model?.modelType || 'business'),
    referenceModelCode: trimText(model?.refStandardModel || model?.referenceModelCode),
    factory: trimText(model?.tags?.vendor || model?.factory),
    format: trimText(model?.tags?.standard || model?.format),
    timeGranularity: trimText(model?.tags?.timeGranularity || model?.timeGranularity),
    businessModelType: trimText(model?.tags?.type || model?.businessModelType),
    involveCalc: model?.tags?.involveCalc !== undefined ? !!model.tags.involveCalc : !!model?.involveCalc,
    fieldList: toModelFieldListPayload(model),
    sourceFields: toSourceFieldsPayload(),
    sourceData: toSourceDataPayload(),
    mappings: toMappingsPayload(),
    dslDefinitions: PROCESS_DSL_DEFINITIONS
  };
};

const normalizeFilterConfig = (rawFilter) => {
  if (!rawFilter) return null;
  const filter = deepCamelize(rawFilter);
  if (trimText(filter.mode).toLowerCase() === 'formula' || trimText(filter.formula)) {
    return { mode: 'formula', operator: '', value: '', formula: trimText(filter.formula), conditions: [], logic: 'AND' };
  }
  const conditions = Array.isArray(filter.conditions)
    ? filter.conditions.map((item) => ({ operator: trimText(item?.operator), value: trimText(item?.value) })).filter((item) => item.operator)
    : [];
  if (conditions.length > 0 || trimText(filter.mode).toLowerCase() === 'compound') {
    return { mode: 'compound', operator: '', value: '', formula: '', conditions, logic: trimText(filter.logic).toUpperCase() === 'OR' ? 'OR' : 'AND' };
  }
  const operator = trimText(filter.operator);
  if (!operator) return null;
  return { mode: 'simple', operator, value: trimText(filter.value), formula: '', conditions: [], logic: 'AND' };
};

const normalizeTransformItem = (rawItem) => {
  if (!rawItem) return null;
  const item = deepCamelize(rawItem);
  const paramValueList = Array.isArray(item.paramValue) ? item.paramValue : (Array.isArray(item.paramvalue) ? item.paramvalue : []);
  const paramValue = isPlainObject(paramValueList[0]) ? deepCamelize(paramValueList[0]) : {};
  const merged = { ...item, ...paramValue };
  const type = normalizeTransformType(merged.type || merged.transformType || merged.transform || merged.abilityName);
  if (!type) return null;
  const normalized = { type };
  if (merged.delimiter !== undefined) normalized.delimiter = trimText(merged.delimiter);
  if (merged.fixedValue !== undefined || merged.value !== undefined) normalized.fixedValue = trimText(merged.fixedValue ?? merged.value);
  if (merged.search !== undefined || merged.searchValue !== undefined) normalized.search = trimText(merged.search ?? merged.searchValue);
  if (merged.replace !== undefined || merged.replaceValue !== undefined) normalized.replace = trimText(merged.replace ?? merged.replaceValue);
  if (merged.formula !== undefined) normalized.formula = trimText(merged.formula);
  if (merged.originType !== undefined) normalized.originType = trimText(merged.originType);
  if (merged.targetType !== undefined) normalized.targetType = trimText(merged.targetType);
  if (merged.inputFormat !== undefined) normalized.inputFormat = trimText(merged.inputFormat);
  if (merged.outputFormat !== undefined) normalized.outputFormat = trimText(merged.outputFormat);
  if (merged.precision !== undefined && merged.precision !== null && merged.precision !== "") normalized.precision = Number(merged.precision);
  return normalized;
};

const normalizeTransformConfig = (rawTransform) => {
  if (!rawTransform) return null;
  const transform = deepCamelize(rawTransform);
  const chainItems = Array.isArray(transform.chain) ? transform.chain : (Array.isArray(transform.steps) ? transform.steps : []);
  if (chainItems.length > 0) {
    const chain = chainItems.map((item) => normalizeTransformItem(item)).filter(Boolean);
    if (chain.length > 0) return { chain };
  }
  if (Array.isArray(transform.rules) && transform.rules.length > 0) {
    const rules = transform.rules.map((rule) => {
      const base = normalizeTransformItem(rule);
      if (!base) return null;
      const operator = trimText(rule?.operator);
      if (!operator) return null;
      return { operator, value: trimText(rule?.value), ...base };
    }).filter(Boolean);
    if (rules.length > 0) return { rules };
  }
  return normalizeTransformItem(transform);
};

const normalizeSortConfig = (rawSort) => {
  if (!rawSort) return null;
  const sort = deepCamelize(rawSort);
  const order = trimText(sort.order || sort.direction || sort.directions).toLowerCase();
  if (!['asc', 'desc'].includes(order)) return null;
  return { order };
};

const normalizeSuggestionOperations = (rawOperations) => {
  const operations = deepCamelize(rawOperations || {});
  return {
    filter: normalizeFilterConfig(operations.filter),
    transform: normalizeTransformConfig(operations.transform),
    sort: normalizeSortConfig(operations.sort)
  };
};

const hasMeaningfulOperations = (operations = {}) => !!(operations.filter || operations.transform || operations.sort);

const hasFieldOperationConfigured = (fieldName) => {
  const filter = filterConfigs[fieldName];
  const hasFilter = !!(filter && ((filter.mode === "simple" && filter.operator) || (filter.mode === "formula" && filter.formula) || (filter.mode === "compound" && Array.isArray(filter.conditions) && filter.conditions.some((item) => item.operator))));
  const transform = transforms[fieldName];
  const hasTransform = !!(transform && ((Array.isArray(transform.chain) && transform.chain.length > 0) || (Array.isArray(transform.rules) && transform.rules.length > 0) || transform.type));
  const hasSort = trimText(sortConfig.field) === trimText(fieldName);
  return hasFilter || hasTransform || hasSort;
};

const toPendingSuggestions = (rawSuggestions = {}) => {
  const suggestions = deepCamelize(rawSuggestions || {});
  const targetFieldSet = new Set(targetModelFields.value.map((field) => trimText(field?.name)).filter(Boolean));
  const next = {};
  Object.entries(suggestions).forEach(([rawField, item]) => {
    const fieldName = trimText(rawField);
    if (!fieldName || !targetFieldSet.has(fieldName)) return;
    const needAttention = item?.needAttention !== false;
    if (!needAttention) return;
    if (hasFieldOperationConfigured(fieldName)) return;
    const operations = normalizeSuggestionOperations(item?.operations || item?.operation || {});
    if (!hasMeaningfulOperations(operations)) return;
    next[fieldName] = { suggestion: trimText(item?.hint || item?.message || '\u5efa\u8bae\u68c0\u67e5\u8be5\u5b57\u6bb5\u5904\u7406\u914d\u7f6e'), operations };
  });
  return next;
};

const hasPendingSuggestion = (fieldName) => pendingTransformSuggestions.value[fieldName] !== undefined;

const openSuggestionModal = (fieldName) => {
  const suggestion = pendingTransformSuggestions.value[fieldName];
  if (!suggestion) return;
  transformSuggestionModal.show = true;
  transformSuggestionModal.field = fieldName;
  transformSuggestionModal.suggestion = suggestion.suggestion;
  transformSuggestionModal.config = suggestion.operations;
};

const closeSuggestionModal = () => {
  transformSuggestionModal.show = false;
  transformSuggestionModal.field = '';
  transformSuggestionModal.suggestion = '';
  transformSuggestionModal.config = null;
};

const applySuggestionForField = (fieldName, operations = {}, withHistory = true) => {
  let applied = false;
  if (operations.filter) {
    filterConfigs[fieldName] = JSON.parse(JSON.stringify(operations.filter));
    if (withHistory) addHistory('filter', '\u7b5b\u9009', `${fieldName}: \u5e94\u7528\u667a\u80fd\u63a8\u8350\u7b5b\u9009`, fieldName);
    applied = true;
  }
  if (operations.transform) {
    transforms[fieldName] = JSON.parse(JSON.stringify(operations.transform));
    if (withHistory) addHistory('transform', '\u6570\u636e\u8f6c\u6362', `${fieldName}: \u5e94\u7528\u667a\u80fd\u63a8\u8350\u8f6c\u6362`, fieldName);
    applied = true;
  }
  if (operations.sort) {
    sortConfig.field = fieldName;
    sortConfig.order = operations.sort.order;
    if (withHistory) addHistory('sort', '\u6392\u5e8f', `${fieldName} ${sortConfig.order === 'asc' ? '\u5347\u5e8f' : '\u964d\u5e8f'}(\u667a\u80fd\u63a8\u8350)`, fieldName);
    applied = true;
  }
  if (applied) notifyOperationApplied('smart_recommend', fieldName);
  return applied;
};

const confirmSuggestion = () => {
  const fieldName = transformSuggestionModal.field;
  const operations = transformSuggestionModal.config;
  if (fieldName && operations) {
    const applied = applySuggestionForField(fieldName, operations, true);
    if (applied) delete pendingTransformSuggestions.value[fieldName];
  }
  closeSuggestionModal();
};

const dismissSuggestion = () => {
  closeSuggestionModal();
};

const applyAllSuggestions = () => {
  const entries = Object.entries(pendingTransformSuggestions.value || {});
  if (entries.length === 0) {
    $warning('\u5f53\u524d\u6ca1\u6709\u53ef\u91c7\u7eb3\u7684\u667a\u80fd\u63a8\u8350');
    return;
  }
  let appliedCount = 0;
  entries.forEach(([fieldName, item]) => {
    const applied = applySuggestionForField(fieldName, item?.operations || {}, true);
    if (applied) appliedCount += 1;
  });
  pendingTransformSuggestions.value = {};
  closeSuggestionModal();
  if (appliedCount > 0) {
    $success(`\u5df2\u91c7\u7eb3 ${appliedCount} \u6761\u667a\u80fd\u63a8\u8350`);
  } else {
    $warning('\u63a8\u8350\u9879\u65e0\u53ef\u5e94\u7528\u914d\u7f6e');
  }
};

const generateSmartSuggestions = async () => {
  if (suggestionLoading.value) return;
  if (!canGenerateSuggestions.value) {
    $warning('\u8bf7\u5148\u5b8c\u6210\u6a21\u578b\u9009\u62e9\u3001\u4e0a\u4f20\u6570\u636e\u548c\u5b57\u6bb5\u6620\u5c04\uff0c\u518d\u6267\u884c\u667a\u80fd\u63a8\u8350');
    return;
  }
  const payload = buildGenerateSuggestionPayload();
  if (!payload || payload.fieldList.length === 0 || payload.sourceFields.length === 0) {
    $warning('\u7f3a\u5c11\u667a\u80fd\u63a8\u8350\u6240\u9700\u7684\u6a21\u578b\u5b57\u6bb5\u6216\u6e90\u5b57\u6bb5\u4fe1\u606f');
    return;
  }
  suggestionLoading.value = true;
  closeSuggestionModal();
  try {
    const response = await apiSystemService.generateProcessConfig(payload, { hideMsgTips: true });
    const suggestions = response?.data?.suggestions || response?.data?.data?.suggestions || {};
    const nextSuggestions = toPendingSuggestions(suggestions);
    pendingTransformSuggestions.value = nextSuggestions;
    if (Object.keys(nextSuggestions).length > 0) {
      $success(`\u667a\u80fd\u63a8\u8350\u5b8c\u6210\uff0c\u8bc6\u522b\u5230 ${Object.keys(nextSuggestions).length} \u4e2a\u5f85\u786e\u8ba4\u5b57\u6bb5`);
    } else {
      $warning('\u667a\u80fd\u63a8\u8350\u5b8c\u6210\uff0c\u5f53\u524d\u672a\u53d1\u73b0\u9700\u8981\u5904\u7406\u7684\u5b57\u6bb5');
    }
  } catch (error) {
    const message = trimText(error?.response?.data?.msg || error?.data?.msg || error?.message);
    $error(message || '\u667a\u80fd\u63a8\u8350\u8c03\u7528\u5931\u8d25');
  } finally {
    suggestionLoading.value = false;
  }
};

const isFilterActive = (field) => {
  const conf = filterConfigs[field];
  if (!conf) return false;
  if (conf.mode === 'simple' && conf.operator) return true;
  if (conf.mode === 'formula' && conf.formula) return true;
  if (conf.mode === 'compound' && Array.isArray(conf.conditions) && conf.conditions.some((item) => item.operator)) return true;
  return false;
};

const openFilterPopover = (field, event) => {
  transformModal.show = false;
  if (!filterConfigs[field]) {
    filterConfigs[field] = { mode: 'simple', operator: '', value: '', formula: '', conditions: [], logic: 'AND' };
  }

  let x = event.clientX;
  let y = event.clientY;
  const width = 280;
  const height = 320;
  if (x + width > window.innerWidth) x = window.innerWidth - width - 10;
  if (y + height > window.innerHeight) y = window.innerHeight - height - 10;

  columnPopover.show = true;
  columnPopover.field = field;
  columnPopover.type = 'filter';
  columnPopover.x = x;
  columnPopover.y = y;
};

const openSortPopover = (field, event) => {
  transformModal.show = false;

  let x = event.clientX;
  let y = event.clientY;
  const width = 280;
  const height = 200;
  if (x + width > window.innerWidth) x = window.innerWidth - width - 10;
  if (y + height > window.innerHeight) y = window.innerHeight - height - 10;

  columnPopover.show = true;
  columnPopover.field = field;
  columnPopover.type = 'sort';
  columnPopover.x = x;
  columnPopover.y = y;
};

const applyFilterConfig = (field) => {
  const conf = filterConfigs[field];
  if (conf.mode === 'simple' && conf.operator) {
    const valueDesc = conf.value || '';
    const suffix = valueDesc ? ` ${valueDesc}` : '';
    addHistory('filter', '筛选', `${field} ${getFilterOperatorLabel(conf.operator)}${suffix}`, field);
  } else if (conf.mode === 'compound' && conf.conditions && conf.conditions.length > 0) {
    const activeConds = conf.conditions.filter((item) => item.operator);
    if (activeConds.length > 0) {
      const logic = conf.logic || 'AND';
      const logicLabel = getFilterLogicLabel(logic);
      const desc = activeConds
        .map((item) => {
          const valueDesc = item.value || '';
          const suffix = valueDesc ? ` ${valueDesc}` : '';
          return `${getFilterOperatorLabel(item.operator)}${suffix}`;
        })
        .join(` ${logicLabel} `);
      addHistory('filter', '筛选', `${field} [${logicLabel}] ${desc}`, field);
    }
  } else if (conf.mode === 'formula' && conf.formula) {
    addHistory('filter', '筛选', `${field} 公式: ${conf.formula}`, field);
  }
  columnPopover.show = false;
  notifyOperationApplied('filter', field);
};
const clearFilter = (field) => {
  filterConfigs[field] = { mode: 'simple', operator: '', value: '', formula: '', conditions: [], logic: 'AND' };
  history.value = history.value.filter((item) => !(item.type === 'filter' && item.field === field));
  columnPopover.show = false;
  notifyOperationApplied('filter', field);
};

const addFilterCondition = (field) => {
  if (!filterConfigs[field]) {
    filterConfigs[field] = { mode: 'simple', operator: '', value: '', formula: '', conditions: [], logic: 'AND' };
  }
  if (!Array.isArray(filterConfigs[field].conditions)) {
    filterConfigs[field].conditions = [];
  }
  filterConfigs[field].conditions.push({ operator: '', value: '' });
};

const removeFilterCondition = (field, index) => {
  if (filterConfigs[field] && Array.isArray(filterConfigs[field].conditions)) {
    filterConfigs[field].conditions.splice(index, 1);
  }
};

const applySort = (field, order) => {
  sortConfig.field = field;
  sortConfig.order = order;
  addHistory('sort', '排序', `${field} ${order === 'asc' ? '升序' : '降序'}`, field);
  columnPopover.show = false;
  notifyOperationApplied('sort', field);
};

const clearSort = () => {
  sortConfig.field = '';
  sortConfig.order = 'asc';
  history.value = history.value.filter((item) => item.type !== 'sort');
  columnPopover.show = false;
  notifyOperationApplied('sort', '');
};

const TIME_FORMAT_MODE = Object.freeze({
  DATE: 'date',
  YEAR: 'year',
  MONTH: 'month',
  TIME: 'time'
});

const resolveTimeFormatModeByType = (type) => {
  if (type === TRANSFORM_TYPES.FORMAT_DATETIME) return TIME_FORMAT_MODE.DATE;
  if (type === TRANSFORM_TYPES.EXTRACT_YEAR) return TIME_FORMAT_MODE.YEAR;
  if (type === TRANSFORM_TYPES.EXTRACT_MONTH) return TIME_FORMAT_MODE.MONTH;
  if (type === TRANSFORM_TYPES.FORMAT_TIME || type === TRANSFORM_TYPES.EXTRACT_TIME) return TIME_FORMAT_MODE.TIME;
  return '';
};

const resolveStoredTypeByTimeFormatMode = (mode) => {
  if (mode === TIME_FORMAT_MODE.YEAR) return TRANSFORM_TYPES.EXTRACT_YEAR;
  if (mode === TIME_FORMAT_MODE.MONTH) return TRANSFORM_TYPES.EXTRACT_MONTH;
  if (mode === TIME_FORMAT_MODE.TIME) return TRANSFORM_TYPES.FORMAT_TIME;
  return TRANSFORM_TYPES.FORMAT_DATETIME;
};

const toModalTransformItem = (item = {}) => {
  const next = { ...item };
  const timeFormatMode = resolveTimeFormatModeByType(next.type);
  if (timeFormatMode) {
    next.type = TRANSFORM_TYPES.FORMAT_TIME;
    next.timeFormatMode = timeFormatMode;
  } else if (next.type === TRANSFORM_TYPES.FORMAT_TIME) {
    next.timeFormatMode = next.timeFormatMode || TIME_FORMAT_MODE.DATE;
  } else {
    next.timeFormatMode = '';
  }
  return next;
};

const toStoredTransformItem = (item = {}) => {
  const next = { ...item };
  if (next.type === TRANSFORM_TYPES.FORMAT_TIME) {
    next.type = resolveStoredTypeByTimeFormatMode(next.timeFormatMode);
  }
  delete next.timeFormatMode;
  return next;
};

const onTransformTypeChange = (item) => {
  if (!item || typeof item !== 'object') return;
  if (item.type === TRANSFORM_TYPES.FORMAT_TIME) {
    item.timeFormatMode = item.timeFormatMode || TIME_FORMAT_MODE.DATE;
    return;
  }
  item.timeFormatMode = '';
};

const addTransformRule = () => {
  transformModal.rules.push({
    operator: '',
    value: '',
    type: TRANSFORM_TYPES.SET_VALUE,
    delimiter: '',
    fixedValue: '',
    search: '',
    replace: '',
    formula: '',
    timeFormatMode: ''
  });
};

const removeTransformRule = (index) => {
  transformModal.rules.splice(index, 1);
};

const addChainStep = () => {
  if (!Array.isArray(transformModal.chain)) transformModal.chain = [];
  transformModal.chain.push({ type: TRANSFORM_TYPES.SET_VALUE, delimiter: '', fixedValue: '', search: '', replace: '', formula: '', timeFormatMode: '' });
};

const removeChainStep = (index) => {
  if (Array.isArray(transformModal.chain)) transformModal.chain.splice(index, 1);
};

const moveChainStep = (index, direction) => {
  if (!Array.isArray(transformModal.chain)) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= transformModal.chain.length) return;
  const temp = transformModal.chain[index];
  transformModal.chain[index] = transformModal.chain[newIndex];
  transformModal.chain[newIndex] = temp;
};

const openTransformModal = (field) => {
  previousFocus.value = document.activeElement;
  columnPopover.show = false;
  transformModal.field = field;
  transformModal.show = true;
  transformModal.rules = transforms[field]?.rules
    ? JSON.parse(JSON.stringify(transforms[field].rules)).map((rule) => toModalTransformItem(rule))
    : [];

  if (Array.isArray(transforms[field]?.chain) && transforms[field].chain.length > 0) {
    transformModal.chain = JSON.parse(JSON.stringify(transforms[field].chain)).map((step) => toModalTransformItem(step));
  } else if (transforms[field]?.type) {
    transformModal.chain = [
      toModalTransformItem({
        type: transforms[field].type,
        delimiter: transforms[field].delimiter || '',
        fixedValue: transforms[field].fixedValue || '',
        search: transforms[field].search || '',
        replace: transforms[field].replace || '',
        formula: transforms[field].formula || ''
      })
    ];
  } else {
    transformModal.chain = [];
  }

  nextTick(() => {
    const modal = document.querySelector('.modal');
    if (modal) modal.focus();
  });
};

const closeTransformModal = () => {
  transformModal.show = false;
  nextTick(() => {
    if (previousFocus.value && previousFocus.value.focus) {
      previousFocus.value.focus();
      previousFocus.value = null;
    }
  });
};

const confirmTransform = () => {
  const storedRules = transformModal.rules.map((rule) => toStoredTransformItem(rule));
  const storedChain = transformModal.chain.map((step) => toStoredTransformItem(step));
  transforms[transformModal.field] = {
    rules: storedRules,
    chain: storedChain
  };
  const chainDesc = storedChain.length > 0 ? ' [链:' + storedChain.map((step) => getTransformTypeLabel(step.type)).join('→') + ']' : '';
  addHistory('transform', '数据转换', transformModal.field + chainDesc, transformModal.field);
  notifyOperationApplied('transform', transformModal.field);
  closeTransformModal();
};

const copyColumnConfig = (field) => {
  copiedConfig.value = {
    field,
    filter: JSON.parse(JSON.stringify(filterConfigs[field] || null)),
    transform: JSON.parse(JSON.stringify(transforms[field] || null)),
    sort: sortConfig.field === field ? { ...sortConfig } : null
  };
  applyModal.sourceField = field;
};

const openApplyModal = (field) => {
  previousFocus.value = document.activeElement;
  if (!copiedConfig.value || copiedConfig.value.field !== field) {
    copyColumnConfig(field);
  }

  applyModal.show = true;
  applyModal.selected = [];
  applyModal.search = '';
  applyModal.applyFilter = true;
  applyModal.applyTransform = true;
  applyModal.applySort = false;
  applyModal.override = false;

  nextTick(() => {
    const modal = document.querySelector('.modal');
    if (modal) modal.focus();
  });
};

const closeApplyModal = () => {
  applyModal.show = false;
  nextTick(() => {
    if (previousFocus.value && previousFocus.value.focus) {
      previousFocus.value.focus();
      previousFocus.value = null;
    }
  });
};

const selectAll = () => {
  applyModal.selected = filteredApplyTargets.value.map((item) => item.name);
};

const clearAll = () => {
  applyModal.selected = [];
};

const selectByPrefix = () => {
  const source = applyModal.sourceField || '';
  const prefix = source.match(/^[A-Z_]+/)?.[0] || source;
  applyModal.selected = filteredApplyTargets.value.filter((item) => item.name.startsWith(prefix)).map((item) => item.name);
};

const selectByType = () => {
  const source = targetModelFields.value.find((item) => item.name === applyModal.sourceField);
  if (!source) return;
  applyModal.selected = filteredApplyTargets.value.filter((item) => item.type === source.type).map((item) => item.name);
};

const applyColumnConfig = () => {
  if (!copiedConfig.value) return;

  applyModal.selected.forEach((target) => {
    if (applyModal.applyFilter && copiedConfig.value.filter) {
      if (applyModal.override || !isFilterActive(target)) {
        filterConfigs[target] = JSON.parse(JSON.stringify(copiedConfig.value.filter));
        addHistory('filter', '筛选', `${target} 复制筛选配置`, target);
      }
    }

    if (applyModal.applyTransform && copiedConfig.value.transform) {
      if (applyModal.override || !transforms[target]) {
        transforms[target] = JSON.parse(JSON.stringify(copiedConfig.value.transform));
        addHistory('transform', '数据转换', `${target} 复制转换配置`, target);
      }
    }

    if (applyModal.applySort && copiedConfig.value.sort) {
      sortConfig.field = target;
      sortConfig.order = copiedConfig.value.sort.order || SORT_ORDER.ASC;
      addHistory('sort', '排序', `${target} ${sortConfig.order === 'asc' ? '升序' : '降序'}`, target);
    }
  });

  notifyOperationApplied('batch_apply', applyModal.sourceField);
  closeApplyModal();
};

const undoHistoryItem = (index) => {
  const item = history.value[index];
  if (!item) return;
  if (item.type === 'filter') {
    filterConfigs[item.field] = { mode: 'simple', operator: '', value: '', formula: '', conditions: [], logic: 'AND' };
  } else if (item.type === 'transform') {
    delete transforms[item.field];
  } else if (item.type === 'sort') {
    sortConfig.field = '';
    sortConfig.order = SORT_ORDER.ASC;
  } else if (item.type === 'dedup') {
    dedupConfig.enabled = false;
  }
  history.value.splice(index, 1);
  notifyOperationApplied(item.type || 'undo', item.field || '');
};

const deleteHistoryItem = (index) => {
  undoHistoryItem(index);
};

const hasEffectiveTransform = (field) => {
  const t = transforms[field];
  if (!t) return false;
  const hasChain = Array.isArray(t.chain) && t.chain.length > 0;
  const hasRules = Array.isArray(t.rules) && t.rules.length > 0;
  const hasSingle = !!t.type;
  return hasChain || hasRules || hasSingle;
};

const isMergedOutput = (field) => {
  return isMultiMapped(field) && hasEffectiveTransform(field);
};

const getRawValue = (field, row) => {
  const keys = props.store.mappings[field] || [];
  if (keys.length === 0) return '';
  return row[keys[0]] || '';
};

const handleKeyDown = (event) => {
  if (event.key !== 'Escape') return;
  if (transformModal.show) {
    closeTransformModal();
    event.preventDefault();
  } else if (applyModal.show) {
    closeApplyModal();
    event.preventDefault();
  } else if (columnPopover.show) {
    columnPopover.show = false;
    event.preventDefault();
  }
};

const handleClickOutside = (event) => {
  const pop = document.querySelector('.column-popover');
  const isOpenerButton = event.target.closest('.header-btn-main') || event.target.closest('.header-btn-icon');
  if (!pop || !pop.contains(event.target)) {
    if (!isOpenerButton) {
      columnPopover.show = false;
    }
  }
};

watch(targetModelFields, () => {
  initFilters();
}, { immediate: true, deep: true });

watch([showRawPreview, targetModelFields, previewData], async () => {
  await nextTick();
  updateHeaderStickyOffset();
});

watch(
  [() => selectedModelName.value, () => props.store.uploadedFiles.length],
  () => {
    pendingTransformSuggestions.value = {};
    closeSuggestionModal();
  }
);

watch(
  () => props.store.mappings,
  () => {
    pendingTransformSuggestions.value = {};
    closeSuggestionModal();
  },
  { deep: true }
);

watch(
  () => props.store.currentStep,
  (step) => {
    if (step !== 2) {
      closeSuggestionModal();
    }
  }
);

watch(
  processedData,
  (rows) => {
    props.store.setExecuteCount(rows.length);
  },
  { immediate: true }
);

onMounted(() => {
  updateHeaderStickyOffset();
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('click', handleClickOutside);
});
</script>
