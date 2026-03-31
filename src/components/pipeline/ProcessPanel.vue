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
          <p style="font-size: 12px; margin-top: 8px;">鍦ㄨ〃涓厤缃瓫閫?/ 杞崲 / 鎺掑簭 / 鍘婚噸</p>
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
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 8px;">
        <button class="btn btn-default btn-sm" @click="showRawPreview = !showRawPreview">
          <span class="material-icons" style="font-size: 16px; vertical-align: middle;">
            {{ showRawPreview ? 'edit' : 'visibility' }}
          </span>
          {{ showRawPreview ? '返回处理预览' : '预览源数据' }}
        </button>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
          <button class="btn btn-default btn-sm" :disabled="suggestionLoading" @click="regenerateProcessSuggestions">
            <span class="material-icons" style="font-size: 16px; vertical-align: middle;">auto_awesome</span>
            {{ suggestionLoading ? '生成中...' : '重新生成建议' }}
          </button>
          <button class="btn btn-default btn-sm" :disabled="suggestionLoading || pendingSuggestionCount === 0" @click="applyAllSuggestions">
            <span class="material-icons" style="font-size: 16px; vertical-align: middle;">playlist_add_check</span>
            一键应用提醒（{{ pendingSuggestionCount }}）
          </button>
          <div v-if="history.length" class="preview-indicator">
            <span class="material-icons" style="font-size: 14px;">check_circle</span>
            已配置 {{ history.length }} 个操作
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
                <span v-if="dedupConfig.fields.length === 0" style="font-size: 12px; color: #bfbfbf;">鏈€夋嫨瀛楁</span>
              </div>
            </div>
          </div>

          <div>
            <label class="form-label" style="font-size: 13px; margin-bottom: 8px;">保留</label>
            <select class="form-select" v-model="dedupConfig.keep" @change="applyDedupConfig">
              <option value="first">淇濈暀绗竴琛?/option>
              <option value="last">淇濈暀鏈€鍚庝竴琛?/option>
              <option value="any">淇濈暀浠绘剰涓€琛?/option>
            </select>
          </div>
        </div>

        <div style="margin-top: 12px; font-size: 12px; color: var(--text-secondary);">
          <span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">info</span>
          閫夋嫨鍘婚噸瀛楁鍚庯紝灏嗘牴鎹繖浜涘瓧娈电殑缁勫悎閿幓閲?        </div>
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
                      {{ sortConfig.order === 'asc' ? '鈫? : '鈫? }}
                    </span>
                    <span v-if="!showRawPreview && hasEffectiveTransform(field.name)" class="transform-indicator">转换</span>
                  </div>
                  <div class="header-actions" v-if="!showRawPreview">
                    <div class="main-actions-vert">
                      <button class="header-btn header-btn-main" :class="{ active: isFilterActive(field.name) }" @click.stop="openFilterPopover(field.name, $event)">
                        <span class="material-icons" style="font-size: 12px; vertical-align: middle;">filter_alt</span>绛涢€?                      </button>
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
                <span v-else>{{ getMappingSource(field.name) || '鏈槧灏? }}</span>
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
          <span><span class="material-icons" style="font-size: 16px; vertical-align: middle;">table_rows</span> 鍏?{{ processedData.length }} 鏉℃暟鎹?/span>
          <span v-if="hasActiveFilters" style="color: var(--warning);">锛屽凡绛涢€?{{ filteredOutCount }} 鏉?/span>
          <span v-if="dedupRemovedCount > 0" style="color: var(--purple);">锛屽幓閲嶇Щ闄?{{ dedupRemovedCount }} 鏉?/span>
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
    :aria-label="columnPopover.type === 'filter' ? '绛涢€夐厤缃? : '鎺掑簭閰嶇疆'"
  >
    <div class="popover-title">
      <span class="material-icons" style="font-size: 18px; vertical-align: middle; margin-right: 6px;">
        {{ columnPopover.type === 'filter' ? 'filter_alt' : 'sort' }}
      </span>
      {{ columnPopover.type === 'filter' ? '绛涢€夐厤缃? : '鎺掑簭閰嶇疆' }} - {{ columnPopover.field }}
    </div>

    <div v-if="columnPopover.type === 'filter'">
      <div class="form-group">
        <label class="form-label" style="font-size: 13px;">ģʽ</label>
        <select v-model="filterConfigs[columnPopover.field].mode" class="form-select">
          <option value="simple">鏉′欢绛涢€?/option>
          <option value="compound">澶氭潯浠剁瓫閫?/option>
          <option value="formula">鍏紡绛涢€?/option>
        </select>
      </div>

      <div v-if="filterConfigs[columnPopover.field].mode === 'simple'">
        <label class="form-label" style="font-size: 13px;">条件</label>
        <select v-model="filterConfigs[columnPopover.field].operator" class="form-select">
          <option value="">璇烽€夋嫨</option>
          <option value="equals">等于</option>
          <option value="not_equals">涓嶇瓑浜?/option>
          <option value="contains">包含</option>
          <option value="is_empty">为空</option>
          <option value="is_not_empty">涓嶄负绌?/option>
          <option value="greater_than">大于</option>
          <option value="less_than">小于</option>
        </select>
        <input
          v-if="!['is_empty', 'is_not_empty'].includes(filterConfigs[columnPopover.field].operator)"
          v-model="filterConfigs[columnPopover.field].value"
          class="form-input"
          placeholder="璇疯緭鍏ョ瓫閫夊€?
          style="margin-top: 10px;"
        />
      </div>

      <div v-if="filterConfigs[columnPopover.field].mode === 'compound'">
        <div v-if="filterConfigs[columnPopover.field].conditions && filterConfigs[columnPopover.field].conditions.length > 0">
          <div style="margin-bottom: 10px;">
            <label class="form-label" style="font-size: 13px;">条件逻辑</label>
            <select v-model="filterConfigs[columnPopover.field].logic" class="form-select" style="font-size: 12px;">
              <option value="AND">AND (全部满足)</option>
              <option value="OR">OR (任一满足)</option>
            </select>
          </div>

          <div
            v-for="(cond, idx) in filterConfigs[columnPopover.field].conditions"
            :key="idx"
            style="border: 1px solid var(--border); padding: 10px; border-radius: 6px; margin-bottom: 8px; background: #fafafa;"
          >
            <div style="display: flex; align-items: center; gap: 8px;">
              <select v-model="cond.operator" class="form-select" style="flex: 1;">
                <option value="">璇烽€夋嫨</option>
                <option value="equals">等于</option>
                <option value="not_equals">涓嶇瓑浜?/option>
                <option value="contains">包含</option>
                <option value="is_empty">为空</option>
                <option value="is_not_empty">涓嶄负绌?/option>
                <option value="greater_than">大于</option>
                <option value="less_than">小于</option>
              </select>
              <input
                v-if="!['is_empty', 'is_not_empty'].includes(cond.operator)"
                v-model="cond.value"
                class="form-input"
                placeholder="鍊?
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
            <span class="material-icons" style="font-size: 16px; vertical-align: middle;">add</span> 娣诲姞绛涢€夋潯浠?          </button>
        </div>
      </div>

      <div v-if="filterConfigs[columnPopover.field].mode === 'formula'">
        <label class="form-label" style="font-size: 13px;">公式</label>
        <input
          v-model="filterConfigs[columnPopover.field].formula"
          class="form-input"
          placeholder="渚嬪锛?value>15 鎴?=NOT(ISBLANK(value))"
        />
        <div class="popover-muted" style="margin-top: 8px;">
          鏀寔 <code>value</code>銆?code>row</code>銆?code>S('瀛楁鍚?)</code>銆?code>T('鐩爣瀛楁')</code>
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
                <option :value="TRANSFORM_TYPES.FORMAT_TIME">鏍煎紡鍖栨椂闂?/option>
                <option :value="TRANSFORM_TYPES.CALC_WEEK">璁＄畻鏄熸湡鏁?/option>
                <option :value="TRANSFORM_TYPES.CALC_WEEKDAY">璁＄畻鏄熸湡鍑?/option>
                <option :value="TRANSFORM_TYPES.SET_VALUE">鍥哄畾璧嬪€?/option>
                <option :value="TRANSFORM_TYPES.CONCAT">澶氬瓧娈垫嫾鎺?/option>
                <option :value="TRANSFORM_TYPES.REPLACE">替换内容</option>
                <option :value="TRANSFORM_TYPES.FORMULA">鑷畾涔夊叕寮?/option>
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
                    <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026-03-28</span>
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
                    <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026</span>
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
                    <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026-03</span>
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
                    <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?4:30:59</span>
                  </div>
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="step.timeFormatMode === TIME_FORMAT_MODE.TIME_MINUTE ? 'btn-primary' : 'btn-default'"
                      @click="step.timeFormatMode = TIME_FORMAT_MODE.TIME_MINUTE"
                    >
                      hh:mm
                    </button>
                    <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?4:30</span>
                  </div>
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="step.timeFormatMode === TIME_FORMAT_MODE.DATE_SLASH ? 'btn-primary' : 'btn-default'"
                      @click="step.timeFormatMode = TIME_FORMAT_MODE.DATE_SLASH"
                    >
                      YYYY/MM/DD
                    </button>
                    <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026/03/28</span>
                  </div>
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="step.timeFormatMode === TIME_FORMAT_MODE.MONTH_SLASH ? 'btn-primary' : 'btn-default'"
                      @click="step.timeFormatMode = TIME_FORMAT_MODE.MONTH_SLASH"
                    >
                      YYYY/MM
                    </button>
                    <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026/03</span>
                  </div>
                </div>
              </div>
              <div v-if="step.type === 'concat'" style="margin-top: 8px;">
                <input v-model="step.delimiter" class="form-input" placeholder="鎷兼帴鍒嗛殧绗︼紙鍙€夛級" style="font-size: 13px;" />
              </div>
              <div v-if="step.type === 'set_value'" style="margin-top: 8px;">
                <input v-model="step.fixedValue" class="form-input" placeholder="鍥哄畾鍊? style="font-size: 13px;" />
              </div>
              <div v-if="step.type === 'replace'" style="margin-top: 8px;">
                <input v-model="step.search" class="form-input" placeholder="查找内容" style="margin-bottom: 4px; font-size: 13px;" />
                <input v-model="step.replace" class="form-input" placeholder="鏇挎崲涓? style="font-size: 13px;" />
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
            婊¤冻鏉′欢鏃舵墠搴旂敤杞崲瑙勫垯锛涙湭鍛戒腑鍒欎繚鐣欏師鍊?          </div>

          <div
            v-for="(rule, index) in transformModal.rules"
            :key="index"
            style="border: 1px solid var(--border); padding: 14px; border-radius: 8px; margin-bottom: 10px; background: #fafafa;"
          >
            <div class="form-group">
              <label class="form-label" style="font-size: 12px;">条件</label>
              <select v-model="rule.operator" class="form-select">
                <option value="">璇烽€夋嫨</option>
                <option value="equals">等于</option>
                <option value="not_equals">涓嶇瓑浜?/option>
                <option value="contains">包含</option>
                <option value="is_empty">为空</option>
                <option value="is_not_empty">涓嶄负绌?/option>
                <option value="greater_than">大于</option>
                <option value="less_than">小于</option>
              </select>
              <input v-if="!['is_empty', 'is_not_empty'].includes(rule.operator)" v-model="rule.value" class="form-input" placeholder="璇疯緭鍏ユ潯浠跺€? style="margin-top: 8px;" />
            </div>

            <div class="form-group">
              <label class="form-label" style="font-size: 12px;">转换类型</label>
              <select v-model="rule.type" class="form-select" @change="onTransformTypeChange(rule)">
                <option :value="TRANSFORM_TYPES.FORMAT_TIME">鏍煎紡鍖栨椂闂?/option>
                <option :value="TRANSFORM_TYPES.CALC_WEEK">璁＄畻鏄熸湡鏁?/option>
                <option :value="TRANSFORM_TYPES.CALC_WEEKDAY">璁＄畻鏄熸湡鍑?/option>
                <option :value="TRANSFORM_TYPES.SET_VALUE">鍥哄畾璧嬪€?/option>
                <option :value="TRANSFORM_TYPES.CONCAT">澶氬瓧娈垫嫾鎺?/option>
                <option :value="TRANSFORM_TYPES.REPLACE">替换内容</option>
                <option :value="TRANSFORM_TYPES.FORMULA">鑷畾涔夊叕寮?/option>
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
                  <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026-03-28</span>
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
                  <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026</span>
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
                  <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026-03</span>
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
                  <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?4:30:59</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="rule.timeFormatMode === TIME_FORMAT_MODE.TIME_MINUTE ? 'btn-primary' : 'btn-default'"
                    @click="rule.timeFormatMode = TIME_FORMAT_MODE.TIME_MINUTE"
                  >
                    hh:mm
                  </button>
                  <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?4:30</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="rule.timeFormatMode === TIME_FORMAT_MODE.DATE_SLASH ? 'btn-primary' : 'btn-default'"
                    @click="rule.timeFormatMode = TIME_FORMAT_MODE.DATE_SLASH"
                  >
                    YYYY/MM/DD
                  </button>
                  <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026/03/28</span>
                </div>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    class="btn btn-sm"
                    :class="rule.timeFormatMode === TIME_FORMAT_MODE.MONTH_SLASH ? 'btn-primary' : 'btn-default'"
                    @click="rule.timeFormatMode = TIME_FORMAT_MODE.MONTH_SLASH"
                  >
                    YYYY/MM
                  </button>
                  <span style="font-size: 12px; color: var(--text-secondary);">绀轰緥锛?026/03</span>
                </div>
              </div>
            </div>

            <div v-if="rule.type === 'concat'" class="form-group">
              <label class="form-label" style="font-size: 12px;">鎷兼帴鍒嗛殧绗?/label>
              <input v-model="rule.delimiter" class="form-input" placeholder="渚嬪锛歘 鎴?鐣欑┖" />
            </div>

            <div v-if="rule.type === 'set_value'" class="form-group">
              <label class="form-label" style="font-size: 12px;">鍥哄畾鍊?/label>
              <input v-model="rule.fixedValue" class="form-input" placeholder="渚嬪锛?00" />
            </div>

            <div v-if="rule.type === 'replace'" class="form-group">
              <label class="form-label" style="font-size: 12px;">替换内容</label>
              <input v-model="rule.search" class="form-input" placeholder="查找内容" style="margin-bottom: 8px;" />
              <input v-model="rule.replace" class="form-input" placeholder="鏇挎崲涓? />
            </div>

            <div v-if="rule.type === 'formula'" class="form-group">
              <label class="form-label" style="font-size: 12px;">公式</label>
              <input v-model="rule.formula" class="form-input" placeholder="渚嬪锛?value*2" />
            </div>

            <button class="btn btn-danger btn-sm" @click="removeTransformRule(index)">
              <span class="material-icons" style="font-size: 14px;">delete</span> 鍒犻櫎姝ゆ潯浠惰浆鎹?            </button>
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
        <span id="apply-modal-title"><span class="material-icons" style="font-size: 20px; vertical-align: middle; margin-right: 8px; color: var(--primary);">content_paste</span>搴旂敤閰嶇疆 - 鏉ユ簮鍒?{{ applyModal.sourceField }}</span>
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
            <button class="btn btn-default btn-sm" @click="selectByPrefix">鍚屽墠缂€</button>
            <button class="btn btn-default btn-sm" @click="selectByType">鍚岀被鍨?/button>
            <button class="btn btn-default btn-sm" @click="selectAll">鍏ㄩ€?/button>
            <button class="btn btn-default btn-sm" @click="clearAll">清空</button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">閫夋嫨鐩爣鍒?/label>
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
            <label style="display:block; font-size:13px; margin-bottom:10px; cursor: pointer;"><input type="checkbox" v-model="applyModal.applyFilter" style="margin-right: 8px;" /> 绛涢€?/label>
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
          鐐瑰嚮"纭搴旂敤"鍚庡皢鑷姩閰嶇疆璇ヨ浆鎹㈣鍒?        </div>
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
  operations: null
});

const pendingTransformSuggestions = ref({});
const suggestionLoading = ref(false);
const dedupFieldSelect = ref('');
const suggestionRequestSeq = ref(0);

const FILTER_OPERATORS = new Set(['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty', 'greater_than', 'less_than']);
const TRANSFORM_ALLOWED_TYPES = new Set(['format_datetime', 'extract_year', 'extract_month', 'extract_time', 'format_time', 'calc_week', 'calc_weekday', 'set_value', 'concat', 'replace']);
const TIME_TRANSFORM_ALIASES = new Set(['format_datetime', 'extract_year', 'extract_month', 'extract_time', 'format_time']);
const TIME_FORMAT_MODES = new Set(['date', 'year', 'month', 'time', 'time_minute', 'date_slash', 'month_slash']);

const targetModelFields = computed(() => props.store.targetFields || []);
const selectedModel = computed(() => {
  return modelStore.projectModels.find((item) => String(item.id) === String(props.store.selectedModelId)) || null;
});
const pendingSuggestionCount = computed(() => Object.keys(pendingTransformSuggestions.value).length);
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
      const mode = cfg.timeFormatMode
        || resolveTimeFormatModeByType(cfg.type, cfg.originType || cfg.origin_type)
        || TIME_FORMAT_MODE.DATE;

      if (mode === TIME_FORMAT_MODE.YEAR) {
        return parseDateTime(base).y || '';
      }
      if (mode === TIME_FORMAT_MODE.MONTH) {
        const parsed = parseDateTime(base);
        return parsed.y && parsed.m ? parsed.y + '-' + parsed.m.padStart(2, '0') : '';
      }
      if (mode === TIME_FORMAT_MODE.TIME) {
        const parsed = parseDateTime(base);
        if (parsed.t) return parsed.t;
        const time = String(base).trim();
        const match = time.match(/^(\d{1,2}):(\d{2})$/);
        if (match) return match[1].padStart(2, '0') + ':' + match[2] + ':00';
        return time;
      }
      if (mode === TIME_FORMAT_MODE.TIME_MINUTE) {
        const parsed = parseDateTime(base);
        const text = parsed.t || String(base).trim();
        const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
        if (!match) return text;
        return match[1].padStart(2, '0') + ':' + match[2];
      }
      if (mode === TIME_FORMAT_MODE.DATE_SLASH) {
        const parsed = parseDateTime(base);
        if (!parsed.y || !parsed.m || !parsed.d) return '';
        return parsed.y + '/' + parsed.m.padStart(2, '0') + '/' + parsed.d.padStart(2, '0');
      }
      if (mode === TIME_FORMAT_MODE.MONTH_SLASH) {
        const parsed = parseDateTime(base);
        if (!parsed.y || !parsed.m) return '';
        return parsed.y + '/' + parsed.m.padStart(2, '0');
      }
      return formatDateTime(base);
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
      `鎸?${dedupConfig.fields.join(', ')} 鍘婚噸锛屼繚鐣?{dedupConfig.keep === 'first' ? '绗竴琛? : dedupConfig.keep === 'last' ? '鏈€鍚庝竴琛? : '浠绘剰涓€琛?}`,
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

const toTextValue = (value) => String(value ?? '').trim();

const inferSampleType = (value) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'double';
  const text = toTextValue(value);
  if (!text) return '';
  if (!Number.isNaN(Number(text))) return text.includes('.') ? 'double' : 'integer';
  if (!Number.isNaN(Date.parse(text))) return 'datetime';
  return 'string';
};

const findFirstNonEmptySample = (rows = [], fieldName = '') => {
  for (const row of Array.isArray(rows) ? rows : []) {
    const value = row?.[fieldName];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }
  return '';
};

const buildSuggestionPayload = () => {
  const model = selectedModel.value || {};
  const modelCode = toTextValue(model?.code || model?.modelCode || model?.id);
  const involveCalc = Boolean(model?.tags?.involveCalc ?? model?.involveCalc ?? false);
  const businessModelType = toTextValue(model?.tags?.type || model?.businessModelType || model?.type || '');

  const fieldList = (targetModelFields.value || [])
    .map((field, index) => ({
      modelCode,
      fieldName: toTextValue(field?.name),
      fieldType: toTextValue(field?.type),
      fieldDesc: toTextValue(field?.description),
      dataFormat: toTextValue(field?.format),
      dataExample: toTextValue(field?.sampleValue || field?.example),
      fieldBusinessType: toTextValue(field?.businessType),
      isNull: field?.isNull !== undefined ? !!field.isNull : true,
      seq: index + 1
    }))
    .filter((item) => item.fieldName);

  const sourceFields = (allSourceFields.value || []).map((field) => {
    const sourceTable = toTextValue(field?.source || field?.sourceId);
    const fieldName = toTextValue(field?.name);
    const file = (props.store.uploadedFiles || []).find((item) => item.source === sourceTable);
    const rows = Array.isArray(file?.rows) ? file.rows : [];
    const sampleValue = findFirstNonEmptySample(rows, fieldName);

    return {
      fieldKey: toTextValue(field?.key),
      fieldName,
      sourceTable,
      fieldType: toTextValue(field?.fieldType || inferSampleType(sampleValue)),
      sampleValue: toTextValue(sampleValue)
    };
  }).filter((item) => item.fieldKey && item.fieldName && item.sourceTable);

  const sourceData = {};
  (props.store.uploadedFiles || []).forEach((file) => {
    const source = toTextValue(file?.source);
    if (!source) return;
    const rows = Array.isArray(file?.rows) ? file.rows : [];
    sourceData[source] = rows.slice(0, 50);
  });

  const dslDefinitions = {
    filter: {
      modes: ['simple', 'compound'],
      operators: ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty', 'greater_than', 'less_than'],
      logic: ['AND', 'OR']
    },
    transform: {
      types: ['format_datetime', 'calc_week', 'calc_weekday', 'set_value', 'concat', 'replace'],
      operators: [
        {
          type: 'format_datetime',
          description: 'datetime format',
          params: [
            { name: 'originType', type: 'string', required: true, desc: 'source datetime template, e.g. YYYY/MM/DD' }
          ],
          required: ['originType']
        },
        {
          type: 'calc_week',
          description: 'calculate week number',
          params: [],
          required: []
        },
        {
          type: 'calc_weekday',
          description: 'calculate weekday',
          params: [],
          required: []
        },
        {
          type: 'set_value',
          description: 'replace with fixed value',
          params: [
            { name: 'fixedValue', type: 'string', required: true, desc: 'replacement value' }
          ],
          required: ['fixedValue']
        },
        {
          type: 'concat',
          description: 'string concat',
          params: [
            { name: 'delimiter', type: 'string', required: false, desc: 'join delimiter' }
          ],
          required: []
        },
        {
          type: 'replace',
          description: 'string replace',
          params: [
            { name: 'search', type: 'string', required: true, desc: 'search text' },
            { name: 'replace', type: 'string', required: true, desc: 'replacement text' }
          ],
          required: ['search', 'replace']
        }
      ],
      disallow: ['formula']
    },
    sort: {
      orders: ['asc', 'desc']
    }
  };

  return {
    code: modelCode,
    modelName: toTextValue(model?.name || model?.modelName),
    modelDesc: toTextValue(model?.description || model?.modelDesc),
    modelType: toTextValue(model?.modelType || 'business'),
    referenceModelCode: toTextValue(model?.refStandardModel || model?.referenceModelCode),
    factory: toTextValue(model?.tags?.vendor || model?.factory),
    format: toTextValue(model?.tags?.standard || model?.format),
    timeGranularity: toTextValue(model?.tags?.timeGranularity || model?.timeGranularity),
    businessModelType,
    involveCalc,
    fieldList,
    sourceFields,
    sourceData,
    mappings: props.store.mappings || {},
    dslDefinitions
  };
};

const isValidOriginTypeTemplate = (originType) => {
  const text = toTextValue(originType);
  if (!text) return false;
  const tokenRegex = /(YYYY|MM|DD|hh|mm|ss)/g;
  if (!tokenRegex.test(text)) return false;
  const stripped = text.replace(tokenRegex, '');
  const asciiOnly = stripped.replace(/T/g, '');
  return !/[A-Za-z]/.test(asciiOnly);
};

const sanitizeFilterOperation = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return null;
  const mode = toTextValue(raw.mode || 'simple').toLowerCase();

  if (mode === 'compound') {
    const logic = toTextValue(raw.logic || 'AND').toUpperCase() === 'OR' ? 'OR' : 'AND';
    const conditions = (Array.isArray(raw.conditions) ? raw.conditions : []).map((item) => {
      const operator = toTextValue(item?.operator).toLowerCase();
      if (!FILTER_OPERATORS.has(operator)) return null;
      return { operator, value: item?.value ?? '' };
    }).filter(Boolean);

    if (conditions.length === 0) return null;
    return { mode: 'compound', logic, conditions, operator: '', value: '', formula: '' };
  }

  const operator = toTextValue(raw.operator).toLowerCase();
  if (!FILTER_OPERATORS.has(operator)) return null;
  return {
    mode: 'simple',
    operator,
    value: raw?.value ?? '',
    formula: '',
    conditions: [],
    logic: 'AND'
  };
};

const resolveTimeModeByTargetFormat = (fieldName) => {
  const field = (targetModelFields.value || []).find((item) => toTextValue(item?.name) === toTextValue(fieldName));
  const format = toTextValue(field?.format).toUpperCase();
  if (format === 'YYYY') return 'year';
  if (format === 'YYYY-MM') return 'month';
  if (format === 'YYYY/MM') return 'month_slash';
  if (format === 'YYYY/MM/DD') return 'date_slash';
  if (format === 'HH:MM') return 'time_minute';
  if (format === 'HH:MM:SS') return 'time';
  return 'date';
};

const normalizeTransformType = (rawType = '') => {
  const type = toTextValue(rawType).toLowerCase();
  if (TIME_TRANSFORM_ALIASES.has(type)) return 'format_time';
  return type;
};

const sanitizeSingleTransform = (raw = {}, { allowOriginType = true, preferredMode = 'date' } = {}) => {
  const rawType = toTextValue(raw.type).toLowerCase();
  const type = normalizeTransformType(rawType);
  if (!TRANSFORM_ALLOWED_TYPES.has(rawType) && !TRANSFORM_ALLOWED_TYPES.has(type)) return null;

  const next = {
    type,
    delimiter: raw?.delimiter ?? '',
    fixedValue: raw?.fixedValue ?? '',
    search: raw?.search ?? '',
    replace: raw?.replace ?? '',
    formula: '',
    timeFormatMode: ''
  };

  if (type === 'format_time') {
    const mode = toTextValue(raw?.timeFormatMode).toLowerCase();
    const modeByOrigin = resolveTimeFormatModeByOriginType(raw?.originType);
    const modeByType = resolveTimeFormatModeByType(rawType, raw?.originType || raw?.timeFormatMode);
    const fallbackMode = TIME_FORMAT_MODES.has(modeByOrigin)
      ? modeByOrigin
      : (TIME_FORMAT_MODES.has(modeByType) ? modeByType : (TIME_FORMAT_MODES.has(preferredMode) ? preferredMode : 'date'));
    next.timeFormatMode = TIME_FORMAT_MODES.has(mode) ? mode : fallbackMode;
    next.originType = allowOriginType && isValidOriginTypeTemplate(raw?.originType) ? toTextValue(raw?.originType) : '';
  }

  return next;
};

const sanitizeTransformOperation = (fieldName, raw = {}) => {
  if (!raw || typeof raw !== 'object') return null;
  const sourceKeys = Array.isArray(props.store.mappings?.[fieldName]) ? props.store.mappings[fieldName] : [];
  const allowOriginType = sourceKeys.length === 1;
  const preferredMode = resolveTimeModeByTargetFormat(fieldName);

  if (Array.isArray(raw.chain) && raw.chain.length > 0) {
    const chain = raw.chain
      .map((step) => sanitizeSingleTransform(step, { allowOriginType, preferredMode }))
      .filter(Boolean);
    if (chain.length === 0) return null;
    return { rules: [], chain };
  }

  if (Array.isArray(raw.rules) && raw.rules.length > 0) {
    const rules = raw.rules.map((item) => {
      const operator = toTextValue(item?.operator).toLowerCase();
      if (!FILTER_OPERATORS.has(operator)) return null;
      const transformStep = sanitizeSingleTransform(item, { allowOriginType, preferredMode });
      if (!transformStep) return null;
      return {
        operator,
        value: item?.value ?? '',
        type: transformStep.type,
        delimiter: transformStep.delimiter,
        fixedValue: transformStep.fixedValue,
        search: transformStep.search,
        replace: transformStep.replace,
        formula: '',
        timeFormatMode: transformStep.timeFormatMode,
        originType: transformStep.originType || ''
      };
    }).filter(Boolean);

    if (rules.length === 0) return null;
    return { rules, chain: [] };
  }

  const single = sanitizeSingleTransform(raw, { allowOriginType, preferredMode });
  if (!single) return null;
  return { ...single, rules: [], chain: [] };
};
const sanitizeSortOperation = (raw = {}) => {
  if (!raw || typeof raw !== 'object') return null;
  const order = toTextValue(raw.order || raw.direction || 'asc').toLowerCase();
  if (!['asc', 'desc'].includes(order)) return null;
  return { order };
};

const normalizeSuggestionMap = (rawSuggestions = {}) => {
  const map = rawSuggestions && typeof rawSuggestions === 'object' ? rawSuggestions : {};
  const result = {};

  (targetModelFields.value || []).forEach((field) => {
    const fieldName = toTextValue(field?.name);
    if (!fieldName) return;

    const rawItem = map[fieldName];
    if (!rawItem || typeof rawItem !== 'object') return;

    const operationsRaw = rawItem.operations && typeof rawItem.operations === 'object'
      ? rawItem.operations
      : (rawItem.config && typeof rawItem.config === 'object' ? { transform: rawItem.config } : {});

    const operations = {};
    const filter = sanitizeFilterOperation(operationsRaw.filter);
    const transform = sanitizeTransformOperation(fieldName, operationsRaw.transform);
    const sort = sanitizeSortOperation(operationsRaw.sort);

    if (filter) operations.filter = filter;
    if (transform) operations.transform = transform;
    if (sort) operations.sort = sort;
    if (Object.keys(operations).length === 0) return;

    result[fieldName] = {
      needAttention: rawItem.needAttention !== false,
      hint: toTextValue(rawItem.hint || rawItem.suggestion || '建议检查该列处理配置'),
      operations
    };
  });

  return result;
};

const hasPendingSuggestion = (fieldName) => pendingTransformSuggestions.value[fieldName] !== undefined;

const openSuggestionModal = (fieldName) => {
  const suggestion = pendingTransformSuggestions.value[fieldName];
  if (!suggestion) return;
  transformSuggestionModal.show = true;
  transformSuggestionModal.field = fieldName;
  transformSuggestionModal.suggestion = suggestion.hint || '';
  transformSuggestionModal.operations = suggestion.operations || null;
};

const closeSuggestionModal = () => {
  transformSuggestionModal.show = false;
  transformSuggestionModal.field = '';
  transformSuggestionModal.suggestion = '';
  transformSuggestionModal.operations = null;
};

const applySuggestionForField = (fieldName, { notify = true, removeAfterApply = true } = {}) => {
  const suggestion = pendingTransformSuggestions.value[fieldName];
  if (!suggestion || !suggestion.operations) return false;

  let changed = false;
  let notifyType = '';

  if (suggestion.operations.filter) {
    filterConfigs[fieldName] = JSON.parse(JSON.stringify(suggestion.operations.filter));
    addHistory('filter', '筛选', `${fieldName} 应用智能筛选建议`, fieldName);
    changed = true;
    notifyType = notifyType || 'filter';
  }

  if (suggestion.operations.transform) {
    transforms[fieldName] = JSON.parse(JSON.stringify(suggestion.operations.transform));
    addHistory('transform', '数据转换', `${fieldName} 应用智能转换建议`, fieldName);
    changed = true;
    notifyType = 'transform';
  }

  if (suggestion.operations.sort) {
    sortConfig.field = fieldName;
    sortConfig.order = suggestion.operations.sort.order || SORT_ORDER.ASC;
    addHistory('sort', '排序', `${fieldName} ${sortConfig.order === 'asc' ? '升序' : '降序'}`, fieldName);
    changed = true;
    notifyType = notifyType || 'sort';
  }

  if (removeAfterApply) {
    delete pendingTransformSuggestions.value[fieldName];
  }

  if (changed && notify) {
    notifyOperationApplied(notifyType || 'transform', fieldName);
  }

  return changed;
};

const confirmSuggestion = () => {
  const fieldName = transformSuggestionModal.field;
  if (!fieldName) {
    closeSuggestionModal();
    return;
  }

  const applied = applySuggestionForField(fieldName, { notify: true, removeAfterApply: true });
  if (applied) {
    $success('已应用处理建议');
  } else {
    $warning('该列没有可应用的建议');
  }
  closeSuggestionModal();
};

const dismissSuggestion = () => {
  const fieldName = transformSuggestionModal.field;
  if (fieldName) {
    delete pendingTransformSuggestions.value[fieldName];
  }
  closeSuggestionModal();
};

const applyAllSuggestions = () => {
  const fields = (targetModelFields.value || []).map((item) => item?.name).filter((name) => hasPendingSuggestion(name));
  if (fields.length === 0) {
    $warning('当前没有可应用的提醒');
    return;
  }

  let appliedCount = 0;
  fields.forEach((fieldName) => {
    if (applySuggestionForField(fieldName, { notify: false, removeAfterApply: true })) {
      appliedCount += 1;
    }
  });

  if (appliedCount > 0) {
    notifyOperationApplied('transform', 'GLOBAL');
    $success(`已应用 ${appliedCount} 条处理建议`);
  } else {
    $warning('没有可应用的处理建议');
  }

  closeSuggestionModal();
};

const requestProcessSuggestions = async ({ manual = false } = {}) => {
  if (suggestionLoading.value) return;

  const payload = buildSuggestionPayload();
  if (!Array.isArray(payload.fieldList) || payload.fieldList.length === 0 || payload.sourceFields.length === 0) {
    pendingTransformSuggestions.value = {};
    if (manual) {
      $warning('缺少字段信息，无法生成处理建议');
    }
    return;
  }

  if (!payload.mappings || Object.keys(payload.mappings).length === 0) {
    pendingTransformSuggestions.value = {};
    if (manual) {
      $warning('请先完成字段映射后再生成处理建议');
    }
    return;
  }

  suggestionLoading.value = true;
  const requestSeq = suggestionRequestSeq.value + 1;
  suggestionRequestSeq.value = requestSeq;

  try {
    const response = await apiSystemService.generateProcessConfig(payload, { hideMsgTips: true });
    if (requestSeq !== suggestionRequestSeq.value) return;

    const raw = response?.data || {};
    const rawSuggestions = raw?.suggestions || raw?.data?.suggestions || {};
    const normalized = normalizeSuggestionMap(rawSuggestions);
    pendingTransformSuggestions.value = normalized;

    if (manual) {
      if (Object.keys(normalized).length > 0) {
        $success(`已生成 ${Object.keys(normalized).length} 条处理建议`);
      } else {
        $warning('未生成可应用的处理建议');
      }
    }
  } catch (error) {
    if (requestSeq !== suggestionRequestSeq.value) return;

    pendingTransformSuggestions.value = {};
    const message = toTextValue(error?.response?.data?.msg || error?.data?.msg || error?.message);
    if (manual) {
      $error(message || '处理建议生成失败');
    } else {
      $warning(message || '处理建议生成失败，请稍后重试');
    }
  } finally {
    if (requestSeq === suggestionRequestSeq.value) {
      suggestionLoading.value = false;
    }
  }
};

const regenerateProcessSuggestions = async () => {
  await requestProcessSuggestions({ manual: true });
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
    addHistory("filter", "ɸѡ", `${field} ${conf.operator} ${conf.value || ""}`, field);
  } else if (conf.mode === 'compound' && conf.conditions && conf.conditions.length > 0) {
    const activeConds = conf.conditions.filter((item) => item.operator);
    if (activeConds.length > 0) {
      const logic = conf.logic || 'AND';
      const desc = activeConds.map((item) => `${item.operator} ${item.value || ''}`).join(` ${logic} `);
      addHistory("filter", "ɸѡ", `${field} [${logic}] ${desc}`, field);
    }
  } else if (conf.mode === 'formula' && conf.formula) {
    addHistory("filter", "筛选", `${field} 公式: ${conf.formula}`, field);
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
  TIME: 'time',
  TIME_MINUTE: 'time_minute',
  DATE_SLASH: 'date_slash',
  MONTH_SLASH: 'month_slash'
});

const resolveTimeFormatModeByOriginType = (originType) => {
  const normalized = String(originType || '').trim().toUpperCase();
  if (normalized === 'YYYY') return TIME_FORMAT_MODE.YEAR;
  if (normalized === 'YYYY-MM') return TIME_FORMAT_MODE.MONTH;
  if (normalized === 'YYYY-MM-DD') return TIME_FORMAT_MODE.DATE;
  if (normalized === 'HH:MM:SS') return TIME_FORMAT_MODE.TIME;
  if (normalized === 'HH:MM') return TIME_FORMAT_MODE.TIME_MINUTE;
  if (normalized === 'YYYY/MM/DD') return TIME_FORMAT_MODE.DATE_SLASH;
  if (normalized === 'YYYY/MM') return TIME_FORMAT_MODE.MONTH_SLASH;
  return '';
};

const resolveOriginTypeByTimeFormatMode = (mode) => {
  if (mode === TIME_FORMAT_MODE.YEAR) return 'YYYY';
  if (mode === TIME_FORMAT_MODE.MONTH) return 'YYYY-MM';
  if (mode === TIME_FORMAT_MODE.TIME) return 'hh:mm:ss';
  if (mode === TIME_FORMAT_MODE.TIME_MINUTE) return 'hh:mm';
  if (mode === TIME_FORMAT_MODE.DATE_SLASH) return 'YYYY/MM/DD';
  if (mode === TIME_FORMAT_MODE.MONTH_SLASH) return 'YYYY/MM';
  return 'YYYY-MM-DD';
};

const resolveTimeFormatModeByType = (type, originType = '') => {
  const normalizedMode = String(originType || '').trim().toLowerCase();
  if (Object.values(TIME_FORMAT_MODE).includes(normalizedMode)) return normalizedMode;
  const byOrigin = resolveTimeFormatModeByOriginType(originType);
  if (byOrigin) return byOrigin;
  if (type === TRANSFORM_TYPES.FORMAT_DATETIME) return TIME_FORMAT_MODE.DATE;
  if (type === TRANSFORM_TYPES.EXTRACT_YEAR) return TIME_FORMAT_MODE.YEAR;
  if (type === TRANSFORM_TYPES.EXTRACT_MONTH) return TIME_FORMAT_MODE.MONTH;
  if (type === TRANSFORM_TYPES.FORMAT_TIME || type === TRANSFORM_TYPES.EXTRACT_TIME) return TIME_FORMAT_MODE.TIME;
  return '';
};

const toModalTransformItem = (item = {}) => {
  const next = { ...item };
  const timeFormatMode = resolveTimeFormatModeByType(next.type, next.originType || next.origin_type || next.timeFormatMode);
  if (timeFormatMode) {
    next.type = TRANSFORM_TYPES.FORMAT_TIME;
    next.timeFormatMode = timeFormatMode;
    next.originType = next.originType || resolveOriginTypeByTimeFormatMode(timeFormatMode);
  } else if (next.type === TRANSFORM_TYPES.FORMAT_TIME) {
    next.timeFormatMode = next.timeFormatMode || TIME_FORMAT_MODE.DATE;
    next.originType = next.originType || resolveOriginTypeByTimeFormatMode(next.timeFormatMode);
  } else {
    next.timeFormatMode = '';
    delete next.originType;
  }
  return next;
};

const toStoredTransformItem = (item = {}) => {
  const next = { ...item };
  if (next.type === TRANSFORM_TYPES.FORMAT_TIME) {
    next.timeFormatMode = next.timeFormatMode || TIME_FORMAT_MODE.DATE;
    next.originType = next.originType || resolveOriginTypeByTimeFormatMode(next.timeFormatMode);
  } else {
    next.timeFormatMode = '';
    delete next.originType;
  }
  return next;
};

const onTransformTypeChange = (item) => {
  if (!item || typeof item !== 'object') return;
  if (item.type === TRANSFORM_TYPES.FORMAT_TIME) {
    item.timeFormatMode = item.timeFormatMode || TIME_FORMAT_MODE.DATE;
    item.originType = item.originType || resolveOriginTypeByTimeFormatMode(item.timeFormatMode);
    return;
  }
  item.timeFormatMode = '';
  delete item.originType;
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
  const chainDesc = storedChain.length > 0 ? ' [閾?' + storedChain.map((step) => step.type).join('鈫?) + ']' : '';
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
        addHistory("filter", "筛选", `${target} 复制筛选配置`, target);
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
  [() => props.store.selectedModelId, () => props.store.uploadedFiles.length, () => JSON.stringify(props.store.mappings || {})],
  () => {
    pendingTransformSuggestions.value = {};
    suggestionRequestSeq.value += 1;
  }
);

watch(
  () => props.store.currentStep,
  async (step, oldStep) => {
    if (step === 2) {
      await nextTick();
      await requestProcessSuggestions({ manual: false });
      return;
    }

    if (oldStep === 2) {
      closeSuggestionModal();
    }
  },
  { immediate: true }
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

















