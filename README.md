# gsc_rf

## 开发启动

```bash
npm install
npm run dev
```

## DSL 发布流（前端）

在「规则设计 -> 发布入库流」中，前端会：

1. 根据当前配置生成 DSL JSON。
2. 自动下载 DSL 文件（`*_dsl.json`）。
3. 调用后端发布接口（默认 `POST /api/pipeline/publish`）。
4. 若后端暂不可用，仍会完成本地 DSL 导出。

## 模型数据来源切换

通过环境变量控制是否从后端读取模型：

- `VITE_ENABLE_MODEL_API=false`：使用内置 mock 模型（默认）。
- `VITE_ENABLE_MODEL_API=true`：调用后端模型接口。

可参考 `.env.example`。

## Join 连接方式

当前前端页面仅支持三种连接方式：

- `inner`
- `left`
- `full`

因为页面中可调整主从表（默认 `table_a` 为主表），不再提供 `right` 连接选项。

## DSL 参数总表

完整参数模板见：`dsl_full_parameters.json`。
