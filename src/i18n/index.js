import { createI18n } from 'vue-i18n';
import enLocale from 'element-plus/es/locale/lang/en';
import zhLocale from 'element-plus/es/locale/lang/zh-cn';

import { mergeItscCommonUiI18n, commonEnLocale, commonZhLocale } from '@hw-itsc/common/src/i18n/index.js';


/**
 * @description 反扁平化国际化数据
 * @param {object} src 数据
 * @param {string} path 访问路径
 * @param {string} value 国际化值
 * @returns {object}
 */
function addValue(src, path, value) {
  const key = path.shift();
  let curPathObj;
  const _src = src;
  if (path.length === 0) {
    _src[key] = value;
    return;
  }
  if (!src[key]) {
    curPathObj = {};
    _src[key] = curPathObj;
  } else {
    curPathObj = src[key];
  }
  addValue(curPathObj, path, value);
}

/**
 * @description 格式化返回数据
 * @param {object} data 原始数据
 * @param {string} lang 当前语种标示
 * @returns {object} 格式化的数据
 */
export function formatData(data, lang) {
  const map = {};
  data.forEach((el) => {
    const key = el.localKey;
    const value = el[lang];
    addValue(map, key.split('.'), value);
  });
  return map;
}

/**
 * 获取中英文资源配置数据
 * @param lang
 * @returns {{}}
 */
function getItscI18n(lang) {
  const itscI18n = import.meta.glob('./*.json', { eager: true }); // 读取/itsc-i18n文件的所有json文件
  let i18nList = [];
  for (const key in itscI18n) {
    if (Object.prototype.hasOwnProperty.call(itscI18n, key)) {
      const list = itscI18n[key].default; // 获取文件数据
      i18nList = [...i18nList, ...list];
    }
  }
  const itscConfig = JSON.parse(sessionStorage.getItem('itscConfig')) || {};
  // public.js中临时修改中英文案
  const tempI18n = itscConfig?.tempI18n || [];
  return formatData([...i18nList, ...tempI18n], lang);
}

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
  locale:'zh-CN',
  messages,
  silentTranslationWarn: true, // 去掉 warning
});
mergeItscCommonUiI18n(i18n);
i18n.global.mergeLocaleMessage('en-US', getItscI18n('en-US'));
i18n.global.mergeLocaleMessage('zh-CN', getItscI18n('zh-CN'));

const $t = i18n.global.t.bind(i18n);
const $t2 = function (cnMsg, enMsg) {
  return i18n.global.locale === 'zh-CN' ? cnMsg : enMsg;
};

export { enLocale, zhLocale, i18n, $t, $t2 };
export default i18n;