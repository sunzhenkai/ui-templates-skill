#!/usr/bin/env python3
"""把 candidate 包内容晋升到 templates/<name>，作为 catalog --write 的发布源。

约定（governance/README.md「Candidate workspace convention」）：
governance/candidates/<name>/ 是唯一 canonical promotion 源；本脚本只拷贝模板包
文件（排除 candidate workspace 状态），不触碰 active-instance、certification 等
治理工件。认证门禁由 manage_skill_distribution.py catalog --write 强制。
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
# candidate workspace 状态：治理工件与 transient 输入，不属于模板包本身。
WORKSPACE_EXCLUDE = {"active-instance", "certification", "prompts", "session-capture", ".work", "promotion-request.yaml"}


class PromotionError(SystemExit):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(f"{code}: {message}")
        self.code = code


def require_accepted_certification(candidate: Path) -> dict:
    report_path = candidate / "certification/report.yaml"
    verify_path = candidate / "certification/verify-result.json"
    if not report_path.is_file() or not verify_path.is_file():
        raise PromotionError("PROMOTION_CERTIFICATION_REQUIRED", f"{candidate} 缺少 certification report 或 verify-result")
    report = yaml.safe_load(report_path.read_text(encoding="utf-8"))
    verify = json.loads(verify_path.read_text(encoding="utf-8"))
    if not isinstance(report, dict) or report.get("status") != "passed":
        raise PromotionError("PROMOTION_CERTIFICATION_REQUIRED", "certification report 未通过（status != passed）")
    if verify.get("accepted") is not True:
        raise PromotionError("PROMOTION_CERTIFICATION_REQUIRED", f"verify-result 未接受（outcome={verify.get('outcome')!r}）")
    return report


def sync_promotion_request(candidate: Path, report: dict, name: str) -> bool:
    request_path = candidate / "promotion-request.yaml"
    if not request_path.is_file():
        return False
    request = yaml.safe_load(request_path.read_text(encoding="utf-8"))
    if not isinstance(request, dict):
        return False
    changed = False
    gate_prompts = (report.get("gate", {}).get("prompts_digest") or {}).get("value")
    if gate_prompts and request.get("prompts_digest") != gate_prompts:
        request["prompts_digest"] = gate_prompts
        changed = True
    import datetime

    today = datetime.date.today().isoformat()
    if request.get("requested_at") != today:
        request["requested_at"] = today
        changed = True
    if changed:
        yaml.safe_dump(request, request_path.open("w"), allow_unicode=True, sort_keys=False)
    return changed


def promote(name: str) -> dict:
    candidate = ROOT / "governance/candidates" / name
    target = ROOT / "templates" / name
    if not candidate.is_dir():
        raise PromotionError("PROMOTION_CANDIDATE_MISSING", str(candidate))
    if not target.is_dir():
        raise PromotionError("PROMOTION_TEMPLATE_MISSING", f"{target} 不存在；新模板首次发布请先建目录并注册 templates/INDEX.md")

    report = require_accepted_certification(candidate)
    request_updated = sync_promotion_request(candidate, report, name)

    # 同版本内容漂移警告：分发/消费侧按 version 判断包代际，内容变了就必须 bump。
    sys.path.insert(0, str(ROOT / "scripts"))
    from skill_distribution.catalog import _canonical_manifest_digest

    candidate_digest = _canonical_manifest_digest(candidate)
    target_digest = _canonical_manifest_digest(target)
    same_version_drift = (
        candidate_digest is not None
        and target_digest is not None
        and candidate_digest != target_digest
        and (yaml.safe_load((candidate / "design-system.yaml").read_text(encoding="utf-8")) or {}).get("version")
        == (yaml.safe_load((target / "design-system.yaml").read_text(encoding="utf-8")) or {}).get("version")
    )

    # 收集包文件（相对路径集合），先删目标陈旧文件再写入，保持 templates 与 candidate 严格一致。
    package: dict[str, Path] = {}
    for path in sorted(candidate.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(candidate)
        if relative.parts[0] in WORKSPACE_EXCLUDE:
            continue
        package[relative.as_posix()] = path

    stale = [
        path
        for path in sorted(target.rglob("*"))
        if path.is_file() and path.relative_to(target).as_posix() not in package
    ]
    for path in stale:
        path.unlink()
    for relative, source in package.items():
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)

    digest = _canonical_manifest_digest(target)
    return {
        "promoted": name,
        "files": len(package),
        "removed_stale": len(stale),
        "promotion_request_updated": request_updated,
        "same_version_drift": same_version_drift,
        "template_digest": digest,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="candidate → templates/<name> 晋级拷贝（catalog --write 的前置步骤）")
    parser.add_argument("--name", required=True, help="模板名，对应 governance/candidates/<name> 与 templates/<name>")
    args = parser.parse_args()
    print(json.dumps(promote(args.name), ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
