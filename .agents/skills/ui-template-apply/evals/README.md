# Apply Contract Evals

本清单是 `ui-template-apply` 当前 revision 的 8 条机器 case；runner 只读取当前两份生产清单，不扫描历史 patches/results/experience。

仓库内统一入口：

```bash
python3 scripts/run_contract_evals.py --skill ui-template-apply --json-out governance/eval/ui-template-apply.json --junit-out governance/eval/ui-template-apply.xml
```

runner 校验 case schema、全局唯一 ID、fixture SHA-256，并强制 `declared = parsed = executed`。本清单使用离线 script judges，覆盖 installation/resource discovery、routing、checkpoint recovery、validation gate、feedback、URL 语义与 origin/token freeze；任一 parse/count/hash/judge/baseline 失败均返回非零。

输出是稳定 JSON 与 JUnit，包含 revision、fixture hashes、runner version、runtime fingerprint 和 locked baseline diff。
