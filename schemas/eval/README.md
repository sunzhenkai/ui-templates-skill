# Contract eval schemas

- `case.schema.json`：两份当前 case 清单的机器契约；全局 ID 唯一性及 `declared = parsed = executed` 由 runner 跨文件检查。
- `result.schema.json`：稳定 JSON 运行报告契约，包含 revision、fixture hashes、runtime fingerprint、runner version 与 baseline diff。
- `llm-judge-result.schema.json`：受控环境生成的本地 LLM 判定适配格式。runner 自身不加载模型、不访问网络，也不发送项目代码或用户数据。

普通离线 CI 运行 script judge，并把 LLM case 执行为固定 fixture/rubric/schema 资产校验；只有显式提供已授权的本地 `--llm-results` 时才适配 LLM 判定。
