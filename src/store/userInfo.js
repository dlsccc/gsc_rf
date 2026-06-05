import { reactive } from 'vue';

const printStoreError = (error) => {
  globalThis.__APP_LOGGER__?.warn?.(error);
};

const configJSON = sessionStorage.getItem('capabilityConfig');
let omProjectId = '';
let zoneId = '';
if (configJSON) {
  try {
    const config = JSON.parse(configJSON);
    omProjectId = config.omProjectId || '';
    zoneId = config.zoneId || '';
  } catch (error) {
    printStoreError(error);
  }
}

const state = reactive({
  userInfo: {},
  curTenant: {},
  zoneId: zoneId,
  omProjectId: omProjectId
});

export default { state };
