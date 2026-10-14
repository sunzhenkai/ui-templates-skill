from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APPLY = ROOT / "skills/ui-template-apply"
DESIGN = ROOT / "skills/ui-template-design"
AUTHOR = ROOT / "skills/ui-template-author"


def load(path: Path):
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[path.stem] = module
    spec.loader.exec_module(module)
    return module


def run(*args: str | Path, cwd: Path = ROOT) -> subprocess.CompletedProcess[str]:
    return subprocess.run([sys.executable, *map(str, args)], cwd=cwd, capture_output=True, text=True)
