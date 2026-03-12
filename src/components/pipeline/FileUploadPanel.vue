<template>
  <section>
    <div class="form-group">
      <label class="form-label"><span class="material-icons">upload_file</span>上传原始数据 (支持多个文件)</label>
      <div
        class="upload-area"
        @click="openPicker"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
        :class="{ dragover: dragOver }"
      >
        <div class="upload-icon"><span class="material-icons" style="font-size: 56px;">cloud_upload</span></div>
        <div class="upload-text">点击或拖拽文件到此处上传</div>
        <div class="upload-hint">支持 Excel (.xlsx, .xls)、CSV (.csv)、压缩包 (.zip)</div>
      </div>
      <input ref="inputRef" type="file" style="display: none;" multiple accept=".xlsx,.xls,.csv,.zip" @change="onFileChange" />
    </div>

    <div v-if="store.uploadedFiles.length > 0" class="form-group">
      <label class="form-label"><span class="material-icons">attach_file</span>已上传文件</label>
      <div v-for="(file, index) in store.uploadedFiles" :key="file.id" class="file-card">
        <div class="file-card-icon" :class="file.source === 'table_a' ? 'table-a' : 'table-b'">
          <span class="material-icons">description</span>
        </div>
        <div class="file-card-info">
          <div class="file-card-name">
            {{ file.name }}
            <span class="source-badge" :class="file.source === 'table_a' ? 'table-a' : 'table-b'">
              {{ file.source === 'table_a' ? '主表' : '从表' }}
            </span>
          </div>
          <div class="file-card-meta">{{ formatFileSize(file.size) }} | {{ file.rows.length }} 行数据 | {{ file.fields.length }} 个字段</div>
        </div>

        <div style="display: flex; gap: 4px;" v-if="store.uploadedFiles.length >= 2">
          <button class="btn btn-default btn-sm" @click.stop="store.moveFileUp(index)" :disabled="index === 0" title="上移（设为主表）">
            <span class="material-icons" style="font-size: 16px;">keyboard_arrow_up</span>
          </button>
          <button class="btn btn-default btn-sm" @click.stop="store.moveFileDown(index)" :disabled="index === store.uploadedFiles.length - 1" title="下移">
            <span class="material-icons" style="font-size: 16px;">keyboard_arrow_down</span>
          </button>
        </div>

        <span class="tag tag-success"><span class="material-icons" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">check_circle</span>解析成功</span>
        <button class="btn btn-default btn-sm" @click="store.removeFile(file.id)"><span class="material-icons" style="font-size: 16px;">delete</span></button>
      </div>

      <button class="btn btn-default" @click="addMoreFiles" style="margin-top: 12px;" v-if="store.uploadedFiles.length < 2">
        <span class="material-icons" style="font-size: 18px;">add</span>
        添加更多源文件
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  store: { type: Object, required: true }
});

const inputRef = ref(null);
const dragOver = ref(false);

const openPicker = () => inputRef.value?.click();
const addMoreFiles = () => inputRef.value?.click();

const onFileChange = async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  try {
    await props.store.uploadLocalFiles(files);
  } catch (error) {
    window.alert(`文件解析失败：${error?.message || '未知错误'}`);
  }
  event.target.value = '';
};

const onDrop = async (event) => {
  dragOver.value = false;
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  try {
    await props.store.uploadLocalFiles(files);
  } catch (error) {
    window.alert(`文件解析失败：${error?.message || '未知错误'}`);
  }
};

const formatFileSize = (size = 0) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};
</script>
