"""
menu_item.py — Modelo de dados para cada item do menu radial.

Cada item pode ter:
  - Uma ação direta (abrir programa, URL, pasta, script, atalho)
  - Uma lista de filhos (sub-menu recursivo)
  - Um ícone customizado (caminho para PNG/ICO), opcional
"""

from __future__ import annotations
from dataclasses import dataclass, field


@dataclass
class MenuItem:
    label: str
    icon: str = ""
    action: str = ""       # "run", "url", "folder", "script", "shortcut"
    target: str = ""       # Argumento da ação
    custom_icon: str = ""  # Caminho PNG/ICO customizado
    icon_mode: str = "auto" # "auto" | "custom" | "svg"
    icon_scale: float = 1.0 # Escala do ícone (0.5 = 50%, 1.0 = 100%, 1.5 = 150%)
    children: list[MenuItem] = field(default_factory=list)

    @property
    def has_children(self) -> bool:
        return len(self.children) > 0

    @classmethod
    def from_dict(cls, data: dict) -> MenuItem:
        children = [cls.from_dict(c) for c in data.get("children", [])]
        return cls(
            label=data.get("label", ""),
            icon=data.get("icon", ""),
            action=data.get("action", ""),
            target=data.get("target", ""),
            custom_icon=data.get("custom_icon", ""),
            icon_mode=data.get("icon_mode", "auto"),
            icon_scale=float(data.get("icon_scale", 1.0)),
            children=children,
        )

    def to_dict(self) -> dict:
        d = {
            "label": self.label,
            "icon": self.icon,
            "custom_icon": self.custom_icon,
            "icon_mode": self.icon_mode,
            "icon_scale": round(self.icon_scale, 2),
            "action": self.action,
            "target": self.target,
        }
        if self.children:
            d["children"] = [c.to_dict() for c in self.children]
        return d

    @classmethod
    def from_config(cls, config: dict) -> list[MenuItem]:
        """Carrega a árvore de menus a partir do JSON raiz."""
        menu_data = config.get("menu", {})
        items_data = menu_data.get("items", [])
        return [cls.from_dict(item) for item in items_data]
