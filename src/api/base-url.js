const trimSlash = (value = '') => String(value || '').replace(/\/$/, '');

const baseUrl = {
  dataSmart: trimSlash(''),
  projectDesign: trimSlash(''),
  pipeline: trimSlash('')
};

export default baseUrl;
