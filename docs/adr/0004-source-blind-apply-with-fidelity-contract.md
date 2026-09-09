# Source-blind Apply uses a portable fidelity contract

原版只能在 Author 的 session source 和模板发布侧的 round-trip 对照窗口出现；Author 必须把可复现的视觉语义导出为 portable Fidelity Contract。Apply 只消费 digest 一致 Active Instance，不读取原版 checkout、`meta.sources[]` 路径或历史生成物。

因此 Apply 不应再暴露 `Mode A` / `Mode B` 两个用户心智模式；Apply Mode 只保留 `bootstrap` 和 `increment`。对原版的保真对照是模板发布/升级侧的 Round-trip Fidelity Gate：它比较干净生成构建与 Visual Oracle，把差异回写 package、Apply skill 或 prompts，然后重新生成。

## Status

accepted
