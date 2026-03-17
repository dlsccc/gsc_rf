const messages = {
  zh: {
    common: {
      ok: '确定',
      cancel: '取消'
    }
  }
};

const translate = (locale, key) => {
  const sections = String(key || '').split('.');
  let current = messages[locale] || messages.zh;

  for (const part of sections) {
    if (!current || typeof current !== 'object') return key;
    current = current[part];
  }

  return current || key;
};

const i18n = {
  install(app) {
    app.config.globalProperties.$t = (key, locale = 'zh') => translate(locale, key);
  }
};

export { messages, i18n };
export default i18n;
