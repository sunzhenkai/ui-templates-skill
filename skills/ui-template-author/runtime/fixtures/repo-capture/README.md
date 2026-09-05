# Fixed repo capture fixture

`source/ui-source-graph.yaml` 是 self-contained、non-example 的 `repo-literal-graph-v1` fixture。测试将该目录复制到临时目录，以固定 author/committer、时间、message 和文件 mode 创建单提交 Git checkout；因此 revision 可锁定且不依赖网络。

Fixture 只含 closed JSON/YAML literal graph，覆盖 shell/canvas、Board non-wrap/non-shrink/inline scroll、master/detail 双 block scroll、region-scoped overlay、Dialog 四向 padding，以及 navigation/entity-row/button/prose link context。Capture 不读取或解析 TSX/JS，不执行来源代码；动态项、歧义、limit 超限和其他格式均 fail unresolved/unsupported。
