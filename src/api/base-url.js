const trimSlash = (value = '') => String(value || '').replace(/\/$/, '');

const baseUrl = {
  dataSmart: trimSlash(import.meta.env.VITE_DATA_SMART_BASE_URL || ''),
  projectDesign: trimSlash(import.meta.env.VITE_PROJECT_DESIGN_BASE_URL || ''),
  pipeline: trimSlash(import.meta.env.VITE_PIPELINE_BASE_URL || '')
};

export default baseUrl;
