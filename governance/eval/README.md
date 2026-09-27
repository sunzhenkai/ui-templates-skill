# Contract eval governance

`deterministic-baseline.json` 是锁定的 script-judge baseline，只能随评测契约的显式变更审阅更新；runner 不提供自动重写选项。当前 runner 只读取两份生产 `evals/cases.yaml`，不会扫描或混入 patches、results、experience 等历史记录。

普通离线门禁：

```bash
python3 scripts/run_contract_evals.py --json-out governance/eval/latest.json --junit-out governance/eval/latest.xml
```

该命令执行所有 script judges，并验证 LLM 固定 fixture/rubric/result schema；不加载模型、不出网。受控环境可另行授权固定 fixture 后，把本地结果按 `schemas/eval/llm-judge-result.schema.json` 写入文件并显式传入 `--llm-results`。runner 只适配本地结果，不发送项目代码、用户数据或其他上下文。
