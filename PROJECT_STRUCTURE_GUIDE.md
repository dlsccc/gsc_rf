# Project 代码结构与文件功能说明（Vue3）

下面按“先看整体，再看每个文件夹和文件”的方式讲解。你可以把这个项目理解成：`Vue3 页面 + Pinia 状态管理 + Router 路由 + API 封装`。

## 1. 技术栈与运行方式
1. 框架：Vue 3（组合式 API）
2. 构建工具：Vite
3. 路由：Vue Router 4
4. 全局状态：Pinia
5. 网络请求：Axios
6. 文件解析：xlsx（本地 Excel/CSV 解析）

## 2. 代码怎么跑起来（主链路）
1. 浏览器先加载 `index.html`
2. `index.html` 里挂载 `#app`，并加载 `src/main.js`
3. `main.js` 创建 Vue 应用，注册 Pinia、Router，加载全局样式
4. 根组件 `src/App.vue` 只渲染 `RouterView`
5. 路由定义在 `src/router/index.js`，统一套 `src/layouts/AppLayout.vue`
6. 页面通过 `stores` 管理数据，通过 `services/api` 调后端接口

## 3. 根目录（project/）
1. `package.json`：项目依赖、`dev/build/preview` 脚本
2. `package-lock.json`：依赖锁定文件
3. `vite.config.js`：Vite 配置（端口 5173，启动自动打开）
4. `index.html`：前端入口 HTML（挂载点、字体/图标引入）
5. `REFACTOR_REPORT.md`：重构说明文档（说明性质，不参与运行）
6. `dist/`：构建产物目录（`npm run build` 后生成）
7. `node_modules/`：依赖目录（npm 安装生成）

## 4. src 顶层
1. `src/main.js`：创建应用、挂载插件
2. `src/App.vue`：根组件容器，只负责路由出口

## 5. src/router（路由层）
1. `src/router/index.js`：所有页面路由定义  
作用点：入口页、Owner/Designer/Operator 工作台、模型列表/编辑、规则列表/编辑、404  
注意：`/designer/pipeline` 目前重定向到 `/designer/rules/new`，说明 `PipelineWizardView.vue` 现在是历史/备用文件。

## 6. src/layouts（布局层）
1. `src/layouts/AppLayout.vue`：统一页面骨架（顶部 Header + 页面 RouterView）

## 7. src/components（可复用组件）

### common/
1. `src/components/common/AppHeader.vue`：顶部导航栏  
功能：Logo、步骤条（规则编辑流程）、当前角色展示。

### pipeline/（规则编辑四步面板）
1. `src/components/pipeline/FileUploadPanel.vue`  
功能：拖拽/点击上传文件，展示已上传文件卡片。
2. `src/components/pipeline/FieldMappingPanel.vue`  
功能：主从表连接配置、字段映射配置、映射预览表。
3. `src/components/pipeline/ProcessPanel.vue`  
功能：数据处理主页面（核心）  
包含：左侧操作记录、每列筛选/转换/排序、去重、批量复制应用、转换建议、公式计算、处理预览。
4. `src/components/pipeline/WriteConfigPanel.vue`  
功能：写入模式、冲突策略、执行按钮。

## 8. src/composables（纯逻辑函数层）
1. `src/composables/useFileIngestion.js`  
功能：解析本地文件（xlsx/xls）为结构化数据。
2. `src/composables/useDataPipeline.js`  
功能：通用数据处理逻辑（预览构建、筛选、转换、排序、去重）。

## 9. src/core（基础常量/工具）
1. `src/core/constants/pipeline.js`：流程步骤、连接类型、排序、去重、转换类型常量
2. `src/core/enums/roles.js`：角色枚举和角色文案
3. `src/core/utils/date.js`：时间格式工具 `nowText`
4. `src/core/utils/id.js`：ID 生成工具 `createId`

## 10. src/services（接口访问层）

### http/
1. `src/services/http/client.js`  
功能：Axios 实例、统一 baseURL、请求/响应拦截器、错误统一处理。

### api/
1. `src/services/api/index.js`：聚合导出所有 API 模块
2. `src/services/api/modules/standard-models.api.js`：标准模型接口
3. `src/services/api/modules/project-models.api.js`：项目模型接口
4. `src/services/api/modules/rules.api.js`：入湖规则接口
5. `src/services/api/modules/pipeline.api.js`：上传/预览/执行接口

## 11. src/stores（状态管理层，Pinia）
1. `src/stores/app.store.js`  
管理：当前角色、项目切换。
2. `src/stores/model.store.js`  
管理：标准模型、项目模型，含默认样例数据与 CRUD 行为。
3. `src/stores/rule.store.js`  
管理：入湖规则列表、排序、增删改。
4. `src/stores/pipeline.store.js`  
管理：规则编辑四步流程状态（上传、映射、处理、写入），并生成执行 payload。

## 12. src/views（页面层）

### 根页面
1. `src/views/EntranceView.vue`：角色入口页
2. `src/views/NotFoundView.vue`：404 页面

### Owner
1. `src/views/Owner/OwnerHomeView.vue`：Owner 工作台主页
2. `src/views/Owner/StandardModelListView.vue`：标准模型列表
3. `src/views/Owner/StandardModelEditorView.vue`：标准模型编辑/新建

### Designer
1. `src/views/Designer/DesignerHomeView.vue`：Designer 工作台主页
2. `src/views/Designer/RuleListView.vue`：规则列表
3. `src/views/Designer/RuleEditorView.vue`：规则编辑主页面（组合四个 pipeline 面板）
4. `src/views/Designer/ProjectModelListView.vue`：项目模型列表
5. `src/views/Designer/ProjectModelEditorView.vue`：项目模型编辑
6. `src/views/Designer/PipelineWizardView.vue`：旧版/备用流程页（当前路由不直接使用）

### Operator
1. `src/views/Operator/OperatorHomeView.vue`：Operator 工作台主页（当前多为“规划中”状态）

## 13. src/styles（样式层）
1. `src/styles/global.css`：全局样式总表  
内容很大，覆盖了 Header、步骤条、表格、弹窗、按钮、角色入口页、工作台、模型列表/编辑页、数据处理页等几乎全部视觉样式。

## 14. 给前端新手的“改需求定位法”
1. 改页面文案/结构：先找 `src/views/...`
2. 改可复用区域：找 `src/components/...`
3. 改流程状态/跨页面数据：找 `src/stores/...`
4. 改数据处理算法：找 `src/composables/useDataPipeline.js` 或 `ProcessPanel.vue`
5. 改接口地址/请求：找 `src/services/...`
6. 改统一视觉：找 `src/styles/global.css`
7. 改页面跳转关系：找 `src/router/index.js`
