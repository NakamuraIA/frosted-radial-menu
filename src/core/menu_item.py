"""
menu_item.py — Modelo de dados para cada item do menu radial.

Cada item pode ter:
  - Uma ação direta (abrir programa, URL, pasta, script, atalho)
  - Uma lista de filhos (sub-menu recursivo)
"""

from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class MenuItem:
    label: str
    icon: str = ""
    action: str = ""      # "run", "url", "folder", "script", "shortcut"
    target: str = ""      # Argumento da ação (caminho, URL, comando, etc.)
    children: list[MenuItem] = field(default_factory=list)

    @property
    def has_children(self) -> bool:
        """Retorna True se este item abre um sub-menu."""
        return len(self.children) > 0

    @classmethod
    def from_dict(cls, data: dict) -> MenuItem:
        """Cria um MenuItem a partir de um dicionário (JSON)."""
        children = [cls.from_dict(c) for c in data.get("children", [])]
        return cls(
            label=data.get("label", ""),
            icon=data.get("icon", ""),
            action=data.get("action", ""),
            target=data.get("target", ""),
            children=children,
        )

    @classmethod
    def from_config(cls, config: dict) -> list[MenuItem]:
        """Carrega a árvore de menus a partir do JSON raiz."""
        menu_data = config.get("menu", {})
        items_data = menu_data.get("items", [])
        return [cls.from_dict(item) for item in items_data]
