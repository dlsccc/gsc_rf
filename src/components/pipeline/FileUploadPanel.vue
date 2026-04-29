<template>
  <section>
    <div class="form-group">
      <label class="form-label"><span class="material-icons">upload_file</span>上传原始数据 (支持多个文件)</label>
      <FileUploadPanelBase
        :project-id="projectId"
        class="w-p-100 common-upload-component"
        :isShowList="false"
        :isSingLine="false"
        @delete="deleteCallback"
        @upload="handleUploadSuccess"
      />
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
          <div class="file-card-meta">{{ formatFileSize(file.size) }}</div>
        </div>

        <div style="display: flex; gap: 4px;" v-if="store.uploadedFiles.length >= 2">
          <button class="btn btn-default btn-sm" @click.stop="store.moveFileUp(index)" :disabled="index === 0 || uploading" title="上移（设为主表）">
            <span class="material-icons" style="font-size: 16px;">keyboard_arrow_up</span>
          </button>
          <button class="btn btn-default btn-sm" @click.stop="store.moveFileDown(index)" :disabled="index === store.uploadedFiles.length - 1 || uploading" title="下移">
            <span class="material-icons" style="font-size: 16px;">keyboard_arrow_down</span>
          </button>
        </div>

        <button class="btn btn-default btn-sm" @click="store.removeFile(file.id)" :disabled="uploading">
          <span class="material-icons" style="font-size: 16px;">delete</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import FileUploadPanelBase from '@hw-itsc/common/src/components/upload-file/upload.vue';
import userStore from '@/store/userInfo.js';
import { $error } from '@/utils/message.js';
import { resolveEdmId } from '@/utils/fileUtils.js';

const props = defineProps({
  store: { type: Object, required: true }
});

const uploading = ref(false);

const projectId = computed(() => {
  return userStore.state.curTenant?.frmProjectId || userStore.state.zoneId || '';
});

const toText = (value) => String(value ?? '').trim();

const formatFileSize = (size) => {
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const createFileEntity = (uploadId, fileDetail = {}) => {
  const edmId = resolveEdmId(fileDetail) || resolveEdmId(uploadId);
  if (!edmId) {
    throw new Error('上传成功但未返回 fileId');
  }

  return {
    id: edmId,
    edmId,
    fileCode: edmId,
    name: toText(fileDetail.fileName || fileDetail.name || edmId),
    size: Number(fileDetail.fileSize ?? fileDetail.size ?? 0),
    rows: [],
    fields: [],
    fieldInfoList: [],
    parsed: false,
    source: 'table_a'
  };
};

const handleUploadSuccess = async (uploadId, fileDetail) => {
  uploading.value = true;
  try {
    const fileEntity = createFileEntity(uploadId, fileDetail || {});
    props.store.appendUploadedFiles([fileEntity]);
  } catch (error) {
    $error(error?.message || '文件上传失败');
  } finally {
    uploading.value = false;
  }
};

const deleteCallback = () => '';
</script>
