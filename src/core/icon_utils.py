"""
icon_utils.py — Utilitários de ícone para o Menu Radial.

Permite extrair automaticamente o ícone de um executável (.exe),
atalho (.lnk) ou pasta usando o Windows Shell via QFileIconProvider.
Não precisa de dependências externas além do PySide6.
"""

import os
import shutil
from functools import lru_cache
from pathlib import Path
from typing import Optional

from PySide6.QtGui import QPixmap
from PySide6.QtCore import QFileInfo

try:
    from PySide6.QtWidgets import QFileIconProvider as _Provider
except ImportError:
    from PySide6.QtGui import QAbstractFileIconProvider as _Provider  # type: ignore


# Cache global: target_path → QPixmap (ou None se falhou)
_icon_cache: dict[str, Optional[QPixmap]] = {}


def resolve_exe_path(target: str) -> str:
    """
    Resolve o caminho completo de um executável.

    Exemplos:
        "notepad.exe"          → "C:\\Windows\\System32\\notepad.exe"
        "steam.exe"            → "" (não está no PATH)
        "C:/Program Files/..." → retorna como está (se existir)
    """
    if not target:
        return ""

    # Caminho absoluto que já existe
    if os.path.isabs(target) and os.path.exists(target):
        return target

    # Extensão sem path — tentar shutil.which (usa PATH do sistema)
    resolved = shutil.which(target)
    if resolved and os.path.exists(resolved):
        return resolved

    # Tentar manualmente em System32 e Windows
    win_root = os.environ.get("SystemRoot", "C:\\Windows")
    for d in [
        os.path.join(win_root, "System32"),
        win_root,
        os.path.join(win_root, "SysWOW64"),
    ]:
        candidate = os.path.join(d, target)
        if os.path.exists(candidate):
            return candidate

    return ""


def get_app_icon(action: str, target: str, size: int = 64) -> Optional[QPixmap]:
    """
    Retorna o ícone do sistema para um item do menu.

    Args:
        action:  "run", "folder", "shortcut", "url", etc.
        target:  Caminho ou URL do alvo.
        size:    Tamanho desejado do ícone em pixels.

    Returns:
        QPixmap se conseguiu extrair, None caso contrário.
    """
    cache_key = f"{action}:{target}:{size}"
    if cache_key in _icon_cache:
        return _icon_cache[cache_key]

    pixmap = _extract(action, target, size)
    _icon_cache[cache_key] = pixmap
    return pixmap


def _extract(action: str, target: str, size: int) -> Optional[QPixmap]:
    """Lógica interna de extração de ícone."""
    if action == "url":
        # Favicon de URL exigiria requisição de rede — pulamos aqui
        return None

    if action == "folder":
        path = target if os.path.isdir(target) else ""
    elif action in ("run", "script", "shortcut"):
        path = resolve_exe_path(target)
    else:
        return None

    if not path or not os.path.exists(path):
        return None

    try:
        provider = _Provider()
        icon = provider.icon(QFileInfo(path))
        if icon.isNull():
            return None
        pm = icon.pixmap(size, size)
        return pm if not pm.isNull() else None
    except Exception as exc:
        print(f"[icon_utils] Falha ao extrair ícone de '{path}': {exc}")
        return None


def clear_cache():
    """Limpa o cache de ícones (útil após recarregar configuração)."""
    _icon_cache.clear()
