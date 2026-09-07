# Greenfield

输出根不存在、为空、只有空子目录或 git 占位，或用户要求从零搭框架时走本模式。仅任务类 `bootstrap` 预加载本文；`iterate` 不要读。

闭集层：language、UI framework、bundler、routing、styling、client/server state、data access、unit/browser verification、package manager、repo shape。未确认前不得写应用源码或依赖清单，不得把任何栈写成 skill 默认。兄弟应用、功能规格里的技术提及只是候选。

确认后再：UX Model → Token Freeze（用户确认）→ Primitives → Patterns + Page Types → 规则块 → Gallery → 可选证明切片 → Visual loop → Freeze。

## Architecture gate

对闭集中每一层给出至少 2 个与项目目标相容的候选；唯一合法结果才可只做确认。每个候选说明长期代价、生态/维护影响和与 UX 方向的匹配度。用户可授权 Agent 选默认，但默认必须先展示影响并记入 decision gates；不得用 skill 偏好替代选型。
