# eval fixtures

本目录只包含固定 contract fixture，不读取或导入任何样例应用文件。`script-contracts.yaml` 由离线 script judge 执行；`llm-contracts.yaml` 只在普通 CI 中校验 prompt/rubric/result schema，不调用模型、不访问网络。受控环境如需导入 LLM 结果，必须另行授权且仅允许固定 fixture 内容。
