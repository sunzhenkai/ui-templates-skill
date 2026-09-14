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
| playwright | 1.62.0 | Apache-2.0 | `scripts/oracle_capture.py` 驱动真实浏览器采集 Template Certification oracle 截图与 computed-style 测量；仅在认证链路使用，不进入 Apply 运行时。 |

许可信息来自各包发布元数据；两者均不随模板资产再分发。本 change 的 structural fidelity profile 实现未新增 governance dependency，继续使用上表固定版本。隔离安装与离线测试命令：

```bash
python3 -m venv /tmp/ui-template-governance-venv
/tmp/ui-template-governance-venv/bin/python -m pip install -r governance/requirements-governance.txt
/tmp/ui-template-governance-venv/bin/python -m unittest discover -s tests -v
```

浏览器二进制不随仓库分发：需要执行 oracle 采集的环境先运行 `python -m playwright install chromium`；缺少浏览器时 `tests/test_oracle_capture.py` 会显式 skip，其余治理测试不依赖浏览器。

安装必须使用该文件，不使用浮动版本范围。若要完全离线执行，先在受信环境按该清单准备 wheelhouse，再增加 `--no-index --find-links <wheelhouse>`；仓库不提交第三方 wheel。
