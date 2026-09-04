# 治理依赖

治理工具仅使用 [`requirements-governance.txt`](requirements-governance.txt) 中精确固定的直接依赖。

| 包 | 固定版本 | 许可 | 用途 |
| --- | --- | --- | --- |
| PyYAML | 6.0.3 | MIT | 使用 `safe_load` 读取模板与治理 YAML。 |
| jsonschema | 4.25.1 | MIT | 使用 Draft 2020-12 校验模板、反馈、checkpoint 与 manifest。 |
| attrs | 26.1.0 | MIT | `jsonschema` 的固定传递依赖。 |
| jsonschema-specifications | 2025.9.1 | MIT | `jsonschema` 使用的固定规范资源。 |
| referencing | 0.37.0 | MIT | 解析本地 schema `$ref` registry。 |
| rpds-py | 2026.6.3 | MIT | `referencing` 使用的固定持久数据结构。 |

许可信息来自各包发布元数据；两者均不随模板资产再分发。隔离安装与离线测试命令：

```bash
python3 -m venv /tmp/ui-template-governance-venv
/tmp/ui-template-governance-venv/bin/python -m pip install -r governance/requirements-governance.txt
/tmp/ui-template-governance-venv/bin/python -m unittest discover -s tests -v
```

安装必须使用该文件，不使用浮动版本范围。若要完全离线执行，先在受信环境按该清单准备 wheelhouse，再增加 `--no-index --find-links <wheelhouse>`；仓库不提交第三方 wheel。
