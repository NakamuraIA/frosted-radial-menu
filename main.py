"""
Menu Radial Recursivo - Frosted Glass
=====================================

Entry point do aplicativo. Inicializa a QApplication,
cria a MenuWindow e roda o event loop.

Atalho: Alt+Espaco (configuravel via config/config.json)
"""

import sys
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

from src.core.menu_window import MenuWindow


def resolve_config_path() -> Path:
    """Usa config.local.json quando existir; senao, usa a config publica."""
    config_dir = Path(__file__).parent / "config"
    local_config = config_dir / "config.local.json"
    default_config = config_dir / "config.json"
    return local_config if local_config.exists() else default_config


def main():
    # Habilitar High DPI scaling
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )

    app = QApplication(sys.argv)
    app.setQuitOnLastWindowClosed(False)  # Mantem rodando na tray

    config_path = resolve_config_path()
    window = MenuWindow(str(config_path))

    print("=" * 50)
    print("  Menu Radial - Frosted Glass")
    print(f"  Config: {config_path.name}")
    print(f"  Hotkey: {window._hotkey.combo}")
    print("  Rodando na bandeja do sistema...")
    print("=" * 50)

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
