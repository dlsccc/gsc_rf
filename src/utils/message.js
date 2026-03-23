/*
 * Copyright (c) Huawei Technologies Co., Ltd. 2012-2025. All rights reserved.
 */

// 简化elementUI的调用传参

import { ElMessage as Message, ElMessageBox as MessageBox } from 'element-plus';
import { $t } from '@/i18n/index.js';
const defOpt = {
  duration: 3000,
  offset: 68,
  showClose: true,
  confirmButtonText: $t('sm.common.ok'),
  cancelButtonText: $t('sm.common.cancel'),
  grouping: true,
};
// 请求同时报错，多个Message错误提示不雅观，只提示一个
let messageInstance = null;
const $error = (message, opt) => {
  if (messageInstance) {
    messageInstance.close();
  }
  messageInstance = Message.error({ message, ...defOpt, customClass: 'message-tip-class', ...opt });
};
const $info = (message, opt = {}) => Message.info({ message, ...defOpt, customClass: 'message-tip-class', ...opt });
const $success = (message, opt = {}) =>
  Message.success({ message, ...defOpt, customClass: 'message-tip-class', ...opt });
const $warning = (message, opt = {}) =>
  Message.warning({ message, ...defOpt, customClass: 'message-tip-class', ...opt });
const $alert = (message, title, opt = {}) =>
  MessageBox.alert(message, title, { ...defOpt, customClass: 'message-tip-class', ...opt }).catch((_) => _);
// opt上有onOk  onCancel
const $confirm = (message, title, opt = {}) => {
  opt.closeOnClickModal = false; // 必须选择才能取消
  return MessageBox.confirm(message, title, { ...defOpt, ...opt })
    .then(() => opt.onOk instanceof Function && opt.onOk())
    .catch((action) => opt.onCancel instanceof Function && opt.onCancel(action));
};

export {
  // 简化elementUI的调用
  $success,
  $error,
  $warning,
  $info,
  $alert,
  $confirm,
};

