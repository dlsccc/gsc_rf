# gsc_rf

## 开发启动

```bash
npm install
npm run dev
```

## 后端接口对齐

当前代码已按“接口定义”对齐到以下接口。

### 模型相关

- 查询模型（标准/项目）：`POST /v1/dataSmart/model/queryModel`
  - 标准模型列表：`modelType=base`
  - 项目模型列表：`modelType=business`
- 查询模型详情：`POST /v1/dataSmart/model/queryModelDetail`
  - 项目模型定义时，选择“引用标准模型”会调用
  - 入湖规则设计第 1 步选择项目模型时会调用
- 保存模型（新建/编辑）：`POST /v1/dataSmart/model/saveModel`
  - 有 `code` 视为编辑
  - 无 `code` 视为新建
- 删除模型：`POST /v1/dataSmart/model/deleteModel`
  - 请求体：`{ modelCodeList: [...] }`

### 规则相关

- 查询所有规则：`GET /v1/projectDesign/datalake/getList?pageNum=&pageSize=`
- 保存规则（新建/编辑）：`POST /v1/projectDesign/datalake/saveRule`
- 删除规则：`DELETE /v1/projectDesign/datalake/delete/{id}`
- 发布规则：`POST /v1/projectDesign/datalake/ruleRelease`

## 发布入库流流程

在「规则设计 -> 发布入库流」点击发布后，前端流程是：

1. 根据当前配置生成 DSL JSON。
2. 自动下载 DSL 文件（`*_dsl.json`）。
3. 先调用“保存规则”接口（确保规则已保存）。
4. 再调用“发布规则”接口（`ruleRelease`）。

## 如何查看点击时请求内容

已在 axios 拦截器中加了请求日志。

- 打开浏览器开发者工具 Console。
- 每次点击后会看到：`[HTTP Request]`、`[HTTP Response]`、`[HTTP Error]`。
- 也可直接查看全量缓存：`window.__HTTP_LOGS__`。

日志里包含：method、url、params、body、status、response。

## 固定配置

当前项目已改为固定配置，不再读取 `.env.example`：

- axios `baseURL`：`/api`
- 模型接口：始终尝试调用后端，失败时回退本地数据
- 请求日志开关：`true`

## Join 连接方式

当前前端页面仅支持三种连接方式：

- `inner`
- `left`
- `full`

因为页面中可调整主从表（默认 `table_a` 为主表），不再提供 `right` 连接选项。

## DSL 参数总表

当前 DSL 已移除 `mapping_config`，并且在 `data_processing` 中不再显式提供 mapping 节点；映射关系由 `rule_input -> rule_output` 隐式表达。

完整参数模板见：`dsl_full_parameters.json`。



