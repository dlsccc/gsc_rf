import { reactive } from 'vue';

const configJSON = sessionStorage.getItem('capabilityConfig');
let omProjectId = '';
let zoneId = '';
if(configJSON){
  try {
    const config = JSON.parse(configJSON);
    omProjectId = config.omProjectId || '';
    zoneId = config.zoneId || '';
  } catch (error) {
    console.log(error)
  }
}

const state = reactive({
  userInfo: {},
  curTenant:{},
  zoneId:zoneId,
  omProjectId:omProjectId
})

export default { state }