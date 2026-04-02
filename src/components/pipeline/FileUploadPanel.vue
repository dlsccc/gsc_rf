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
        <div class="upload-hint" v-if="!uploading">支持 Excel (.xlsx, .xls)、CSV (.csv)、压缩包 (.zip)</div>
        <div class="upload-hint" v-else>正在上传文件，请稍候...</div>
      </div>
      <input ref="inputRef" type="file" style="display: none;" multiple accept=".xlsx,.xls,.csv,.zip" @change="onFileChange" />
    </div>

    <div v-if="store.uploadedFiles.length > 0" class="form-group">
      <label class="form-label"><span class="material-icons">attach_file</span>已上传文件</label>
      <div v-for="(file, index) in store.uploadedFiles" :key="file.id" class="file-card">
        <div class="file-card-icon" :class="index === 0 ? 'table-a' : 'table-b'">
          <span class="material-icons">description</span>
        </div>
        <div class="file-card-info">
          <div class="file-card-name">
            {{ file.name }}
            <span class="source-badge" :class="index === 0 ? 'table-a' : 'table-b'">
              {{ index === 0 ? '主表' : `从表${index}` }}
            </span>
          </div>
        </div>

        <div style="display: flex; gap: 4px;" v-if="store.uploadedFiles.length >= 2">
          <button class="btn btn-default btn-sm" @click.stop="store.moveFileUp(index)" :disabled="index === 0 || uploading" title="上移（设为主表）">
            <span class="material-icons" style="font-size: 16px;">keyboard_arrow_up</span>
          </button>
          <button class="btn btn-default btn-sm" @click.stop="store.moveFileDown(index)" :disabled="index === store.uploadedFiles.length - 1 || uploading" title="下移">
            <span class="material-icons" style="font-size: 16px;">keyboard_arrow_down</span>
          </button>
        </div>

        <button class="btn btn-default btn-sm" @click="store.removeFile(file.id)" :disabled="uploading"><span class="material-icons" style="font-size: 16px;">delete</span></button>
      </div>

      <button class="btn btn-default" @click="addMoreFiles" style="margin-top: 12px;" :disabled="uploading">
        <span class="material-icons" style="font-size: 18px;">add</span>
        添加更多源文件
      </button>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import { $error } from '@/utils/message.js';
import {
  fileUtilUploadFile,
  normalizeUploadResult,
  queryFileDetail,
  resolveEdmId
} from '@/utils/fileUtils.js';

const props = defineProps({
  store: { type: Object, required: true }
});

const inputRef = ref(null);
const dragOver = ref(false);
const uploading = ref(false);

const openPicker = () => {
  if (uploading.value) return;
  inputRef.value?.click();
};

const addMoreFiles = () => {
  if (uploading.value) return;
  inputRef.value?.click();
};

const onFileChange = async (event) => {
  const files = event.target?.files;
  await handleSelectedFiles(files);
  if (event.target) {
    event.target.value = '';
  }
};

const onDrop = async (event) => {
  dragOver.value = false;
  await handleSelectedFiles(event.dataTransfer?.files);
};

const ensureUploadMeta = (uploadData, file) => {
  const list = normalizeUploadResult(uploadData);
  if (list.length === 0) {
    throw new Error(`文件 ${file?.name || ''} 上传后未返回 edmid`);
  }
  return list[0];
};

const createFileEntity = ({ uploadMeta, detail }) => {
  const edmId = resolveEdmId(uploadMeta) || resolveEdmId(detail);
  return {
    id: edmId || `${Date.now()}`,
    edmId,
    fileCode: resolveEdmId(detail) || resolveEdmId(uploadMeta),
    name: String(detail?.fileName || uploadMeta?.fileName || edmId),
    size: Number(detail?.fileSize ?? uploadMeta?.fileSize ?? 0),
    rows: [],
    fields: [],
    fieldInfoList: [],
    parsed: false,
    source: 'table_a'
  };
};

const handleSelectedFiles = async (fileList) => {
  if (uploading.value) return;

  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  uploading.value = true;

  try {
    const uploadResults = await Promise.all(files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);

      const uploadData = await fileUtilUploadFile(formData);
      const uploadMeta = ensureUploadMeta(uploadData, file);

      return { uploadMeta };
    }));

    const edmIds = [...new Set(uploadResults.map((item) => resolveEdmId(item.uploadMeta)).filter(Boolean))];
    const detailList = edmIds.length > 0 ? await queryFileDetail(edmIds) : [];
    const detailMap = new Map();

    detailList.forEach((item) => {
      const key = resolveEdmId(item);
      if (key) {
        detailMap.set(key, item);
      }
    });

    const uploadedFiles = uploadResults.map(({ uploadMeta }) => {
      const edmId = resolveEdmId(uploadMeta);
      const detail = detailMap.get(edmId) || {};
      return createFileEntity({ uploadMeta, detail });
    });

    props.store.appendUploadedFiles(uploadedFiles);
  } catch (error) {
    $error(`文件上传失败：${error?.message || '未知错误'}`);
  } finally {
    uploading.value = false;
  }
};
</script>