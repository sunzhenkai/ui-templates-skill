## ADDED Requirements

### Requirement: Bundle 3.0.0 unified release
Bundle `3.0.0` SHALL 同步声明 Author、Design、Apply 为 `3.0.0`，并将当前模板 contract 范围设为 `design-system/v1`。模板对安装边界 SHALL 保持 Author+Apply 成对，Design SHALL 保持独立安装与独立升级。

#### Scenario: 读取兼容矩阵
- **WHEN** 用户读取 bundle `3.0.0` compatibility
- **THEN** 三个 public skill 版本一致，当前 contract family 明确，Design 不被标记为模板对必需依赖

#### Scenario: 只安装 Design
- **WHEN** 用户执行单独 Design 安装命令
- **THEN** 安装不要求 Author/Apply，也不写入模板 catalog

### Requirement: Vendor assets in governed bundle
Bundle SHALL 只分发 vendor manifest 声明的 Apply reference 快照；每个快照 SHALL 记录 fixed revision、license、files、SHA-256 digests 和 allowed triggers。未声明文件、digest 不匹配、缺 license 或触发器不一致 SHALL 阻止构建。

#### Scenario: vendor audit
- **WHEN** bundle 构建扫描 vendor 目录
- **THEN** 每个文件都能追溯到 manifest 记录，且 manifest 的 allowed trigger 与 Apply skill 一致

#### Scenario: 未授权 vendor 文件
- **WHEN** vendor 目录出现未 allowlist 的文件
- **THEN** bundle 失败并报告路径，不得通过宽松 glob 自动纳入

### Requirement: Unified release regression
Bundle `3.0.0` release SHALL 运行 `make bootstrap`、`make validate`、`make test`、`make eval`、`make bundle` 与 `openspec validate --all --strict`，并保留 reproducible checksum、official migration、四类 fixture 和 bootstrap/increment 重生证据。

#### Scenario: release gate
- **WHEN** maintainer 请求 release verification
- **THEN** 全部固定命令与证据 gate 必须通过，缺失任一证据不得发布
