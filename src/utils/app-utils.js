
import { initApi,apiSystemService } from '@/api/index.js';
import userStore from '@/store/userInfo.js';

export async function initAppData(userInfo){
  await initApi.addZoneUser({ hideLoading: true });
  await getTanantList(userInfo);
  await addPlatformNew();
}

export async function getTanantList(userInfo){
  const params = {
    'user-info': userInfo.account,
  };
  const { data } = await apiSystemService.tenantUserList(params,{headers:{'project-id':userStore.state.zoneId}});
  if (data && Array.isArray(data) && data.length) {
    userStore.state.curTenant = data[0];
  }
}

export async function addPlatformNew(){
  const params = { projectId: userStore.state.curTenant.frmProjectId };
  const config = { headers: { 'project-id': userStore.state.zoneId } };
  await initApi.addPlatformNew(params, config);
}