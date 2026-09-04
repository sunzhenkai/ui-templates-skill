# 回滚

安装前保留上一份已验证 bundle、`.sha256` 和 manifest。需要回滚时，用同一 installer 安装上一份 artifact；安装器会先完成 checksum、manifest、逐文件摘要和引用校验，再逐目录替换两个 public skills。

任一目录替换失败会恢复安装前版本。`patches/`、`experience/` 与其他 skill 不属于受管生产文件，不随回滚删除。schema v2 模板不得交给只支持 v1 的旧消费者静默读取；若必须恢复 v1，使用迁移前备份并显式切换整套消费者。
