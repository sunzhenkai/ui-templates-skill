# Qualitative prompts

本文件记录 skill-creator 用的真实用户口吻用例，供实现后人工看输出。不把 `evals/evals.json` 或 eval-viewer 接入本仓 CI。可判定部分由 `cases.yaml` 的 script judge 覆盖。

1. 「这是个空目录，帮我给内部后台先搭一套设计系统，先不要写业务页。」  
   期望：greenfield 选型后建立 token/Primitive/Pattern/Gallery；不创建 `templates/`；不实现业务 CRUD 页。

2. 「现有 React 页面颜色和间距已经漂了，先别改 API，把 token 和 List/Detail pattern 收拢。」  
   期望：existing、冻结业务、inventory → mapping → freeze；不改数据模型。

3. 「用这个后台模板把业务页先铺出来。」  
   期望：停止 Design 工作流，移交 Apply；不得假装已实现业务页。

4. 「token 已经 freeze 了，只把 List 的 empty 态补上。」  
   期望：任务类 `iterate`；不重做全量 inventory；只改 Pattern 层后刷新 freeze digest。
