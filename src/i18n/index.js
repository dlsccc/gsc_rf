import { createI18n } from 'vue-i18n';
import enLocale from 'element-plus/es/locale/lang/en';
import zhLocale from 'element-plus/es/locale/lang/zh-cn';
import { mergeItscCommonUiI18n, commonEnLocale, commonZhLocale } from '@hw-itsc/common/src/i18n/index.js';

// 修改element-plus国际化内容
zhLocale.el.table.confirmFilter = '确定';
const messages = {
  'en-US': {
    ...enLocale,
    ...commonEnLocale,
  },
  'zh-CN': {
    ...zhLocale,
    ...commonZhLocale,
  },
};



const i18n = createI18n({
  messages,
  silentTranslationWarn: true, // 去掉 warning
});
mergeItscCommonUiI18n(i18n);

const $t = i18n.global.t.bind(i18n);
const $t2 = function (cnMsg, enMsg) {
  return i18n.global.locale === 'zh-CN' ? cnMsg : enMsg;
};

export { enLocale, zhLocale, i18n, $t, $t2 };
export default i18n;