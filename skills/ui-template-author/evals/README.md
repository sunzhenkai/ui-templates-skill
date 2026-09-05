# Authoring Contract Evals

本清单是 `ui-template-author` 当前 revision 的 9 条机器 case；历史 patches/results/experience 不在 runner 发现范围内，也不会被改写或混计。

仓库内统一入口：

```bash
python3 scripts/run_contract_evals.py --skill ui-template-author --json-out governance/eval/ui-template-author.json --junit-out governance/eval/ui-template-author.xml
```

runner 校验 case schema、全局唯一 ID、fixture SHA-256，并强制 `declared = parsed = executed`。`judge: script` 直接阻断失败；`judge: llm` 在普通离线运行中只验证固定 prompt/rubric/result schema，状态明确为 `asset-valid`，不调用模型、不出网。受控环境只能通过显式、已授权的本地 `--llm-results` 适配结果。

完整结果包含 revision、所有 fixture hashes、runner version、runtime fingerprint 和 locked baseline diff。parse/count/hash/judge/baseline 任一失败均返回非零。
