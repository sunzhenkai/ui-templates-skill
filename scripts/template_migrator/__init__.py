"""非破坏、确定性的 template v1→v2 migrator。"""

from .migrator import MigrationError, migrate

__all__ = ["MigrationError", "migrate"]
