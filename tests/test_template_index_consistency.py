"""生产 templates/INDEX.md 闭环一致性的门禁测试。

template-lifecycle.md 把"每行必有目录 / 每目录必有一行 / 前四列与 meta.yaml 一致"
写成硬约束；这些规则此前只有散文，没有任何可执行实现，catalog 漂移检查也看不到
（catalog 本身由 INDEX 生成）。这里为每条规则给出可证伪的正反例。
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from check_template_index import check_index  # noqa: E402


def _write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def _make_template(root: Path, name: str, *, description: str, captured_at: str, source_type: str = "repo") -> None:
    _write(
        root / name / "meta.yaml",
        yaml.safe_dump(
            {
                "schema": "design-system-meta/v1",
                "name": name,
                "version": "1.0.0",
                "description": description,
                "sources": [{"id": "source-001", "type": source_type}],
                "captured_at": captured_at,
            },
            allow_unicode=True,
            sort_keys=False,
        ),
    )
    _write(root / name / "design-system.yaml", "schema: design-system/v1\nid: %s\nversion: 1.0.0\nstatus: frozen\n" % name)


def _index(root: Path, rows: str) -> None:
    _write(
        root / "INDEX.md",
        "# 模板索引\n\n| 名称 | 风格描述 | 来源类型 | 采集日期 | 状态 |\n| --- | --- | --- | --- | --- |\n" + rows,
    )


class TemplateIndexClosureTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "templates"
        self.root.mkdir(parents=True)

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _valid(self) -> None:
        _make_template(self.root, "alpha", description="A shell", captured_at="2026-09-15")
        _index(self.root, "| alpha | A shell | repo | 2026-09-15 | published |\n")

    def test_consistent_index_passes(self) -> None:
        self._valid()
        self.assertEqual([], check_index(self.root))

    def test_row_without_directory_is_rejected(self) -> None:
        self._valid()
        _index(
            self.root,
            "| alpha | A shell | repo | 2026-09-15 | published |\n"
            "| ghost | Ghost template | repo | 2026-09-15 | published |\n",
        )
        codes = [item["code"] for item in check_index(self.root)]
        self.assertIn("INDEX_ROW_WITHOUT_DIRECTORY", codes)

    def test_directory_without_row_is_rejected(self) -> None:
        self._valid()
        _make_template(self.root, "orphan", description="Never registered", captured_at="2026-09-15")
        findings = check_index(self.root)
        orphan = [item for item in findings if item["name"] == "orphan"]
        self.assertTrue(orphan, f"未登记目录未被检出: {findings}")
        self.assertEqual("TEMPLATE_WITHOUT_INDEX_ROW", orphan[0]["code"])

    def test_description_column_must_match_meta(self) -> None:
        self._valid()
        _index(self.root, "| alpha | WRONG DESCRIPTION | repo | 2026-09-15 | published |\n")
        mismatches = [item for item in check_index(self.root) if item["code"] == "INDEX_COLUMN_MISMATCH"]
        self.assertEqual(1, len(mismatches))
        self.assertEqual("风格描述", mismatches[0]["column"])

    def test_captured_at_column_must_match_meta(self) -> None:
        self._valid()
        _index(self.root, "| alpha | A shell | repo | 1999-01-01 | published |\n")
        mismatches = [item for item in check_index(self.root) if item["code"] == "INDEX_COLUMN_MISMATCH"]
        self.assertEqual(1, len(mismatches))
        self.assertEqual("采集日期", mismatches[0]["column"])

    def test_source_type_column_must_match_meta(self) -> None:
        _make_template(self.root, "alpha", description="A shell", captured_at="2026-09-15", source_type="url")
        _index(self.root, "| alpha | A shell | repo | 2026-09-15 | published |\n")
        mismatches = [item for item in check_index(self.root) if item["code"] == "INDEX_COLUMN_MISMATCH"]
        self.assertEqual(1, len(mismatches))
        self.assertEqual("来源类型", mismatches[0]["column"])

    def test_retired_row_keeps_its_directory(self) -> None:
        self._valid()
        _index(self.root, "| alpha | A shell | repo | 2026-09-15 | retired |\n")
        self.assertEqual([], check_index(self.root))

    def test_repository_index_is_consistent(self) -> None:
        """正例必须对真实 templates/INDEX.md 生效，否则这条门禁形同虚设。"""
        self.assertEqual([], check_index(ROOT / "templates"))


class DeleteGuardTests(unittest.TestCase):
    """delete 会对目标目录做不可逆 rmtree，必须先确认那确实是模板包。"""

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.templates = Path(self.temp.name) / "templates"
        self.templates.mkdir(parents=True)
        self.script = ROOT / "scripts/manage_template_index.py"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def _retired_index(self, name: str) -> Path:
        index = self.templates / "INDEX.md"
        _write(
            index,
            "# 模板索引\n\n| 名称 | 风格描述 | 来源类型 | 采集日期 | 状态 |\n| --- | --- | --- | --- | --- |\n"
            f"| {name} | x | repo | 2026-09-15 | retired |\n",
        )
        return index

    def _delete(self, name: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(self.script), "delete", name, "--index", str(self._retired_index(name)), "--templates", str(self.templates)],
            capture_output=True,
            text=True,
            check=False,
        )

    def test_non_template_directory_is_not_deleted(self) -> None:
        target = self.templates / "not-a-template"
        _write(target / "keep.txt", "重要数据")
        result = self._delete("not-a-template")
        self.assertNotEqual(0, result.returncode)
        self.assertIn("DELETE_TARGET_NOT_TEMPLATE", result.stderr)
        self.assertTrue((target / "keep.txt").is_file(), "非模板目录被误删")
        self.assertIn("not-a-template", self._retired_index("not-a-template").read_text(encoding="utf-8"))

    def test_design_system_v1_package_is_deleted(self) -> None:
        _write(self.templates / "v1pkg/design-system.yaml", "schema: design-system/v1\n")
        self.assertEqual(0, self._delete("v1pkg").returncode)
        self.assertFalse((self.templates / "v1pkg").exists())

    def test_legacy_v2_package_is_deleted(self) -> None:
        _write(self.templates / "v2pkg/meta.yaml", "schema: design-system-meta/v1\n")
        self.assertEqual(0, self._delete("v2pkg").returncode)
        self.assertFalse((self.templates / "v2pkg").exists())


class ActiveReleaseScopeTests(unittest.TestCase):
    """三个 public skill 的 runtime 都必须落在 active release 治理域内。

    曾出现过 `skills/ui-template-apply/runtime/**` 漏登记：author 与 design 都有
    `runtime/**`，唯独 apply 没有，于是整个 apply runtime（checkpoint 状态机、
    恢复规划器、领养脚本）都不受 active release 检查覆盖，而它照样随 bundle 分发。
    """

    SCOPE = ROOT / "governance/scope.yaml"

    def _patterns(self) -> list[str]:
        return yaml.safe_load(self.SCOPE.read_text(encoding="utf-8"))["active_release"]

    def test_every_public_skill_runtime_is_in_active_release(self) -> None:
        patterns = self._patterns()
        for skill in ("ui-template-author", "ui-template-apply", "ui-template-design"):
            runtime = ROOT / "skills" / skill / "runtime"
            self.assertTrue(runtime.is_dir(), f"{skill} 缺少 runtime/")
            with self.subTest(skill=skill):
                self.assertIn(
                    f"skills/{skill}/runtime/**",
                    patterns,
                    f"{skill} 的 runtime 不在 active release 域内，其改动不会被检查覆盖",
                )

    def test_apply_runtime_files_are_all_governed(self) -> None:
        import fnmatch

        patterns = self._patterns()
        escaped = [
            str(path.relative_to(ROOT))
            for path in (ROOT / "skills/ui-template-apply/runtime").rglob("*")
            if path.is_file()
            and "__pycache__" not in path.parts
            and not any(fnmatch.fnmatch(str(path.relative_to(ROOT)), item) for item in patterns)
        ]
        self.assertEqual([], escaped)


if __name__ == "__main__":
    unittest.main()
