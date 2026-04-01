"""
state_manager.py — Máquina de estados para navegação recursiva.

Implementa uma pilha (stack) de níveis. Cada nível é uma lista de MenuItems.
  - push(): entra em um sub-menu
  - pop(): volta ao nível anterior
  - Se pop() no root → fecha o menu
"""

from PySide6.QtCore import QObject, Signal
from .menu_item import MenuItem


class StateManager(QObject):
    # Emitido quando o nível muda (items, depth, direction)
    # direction: "forward" | "backward"
    level_changed = Signal(list, int, str)
    # Emitido quando o menu deve fechar (pop no root)
    menu_closed = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self._stack: list[list[MenuItem]] = []

    def reset(self, root_items: list[MenuItem]):
        """Reinicia a pilha com os itens do nível raiz."""
        self._stack = [root_items]
        self.level_changed.emit(self.current(), self.depth(), "forward")

    def push(self, children: list[MenuItem]):
        """Navega para um sub-menu."""
        self._stack.append(children)
        self.level_changed.emit(self.current(), self.depth(), "forward")

    def pop(self):
        """Volta ao nível anterior ou fecha o menu."""
        if len(self._stack) > 1:
            self._stack.pop()
            self.level_changed.emit(self.current(), self.depth(), "backward")
        else:
            self.menu_closed.emit()

    def current(self) -> list[MenuItem]:
        """Retorna os itens do nível atual."""
        return self._stack[-1] if self._stack else []

    def depth(self) -> int:
        """Profundidade atual na árvore (1 = root)."""
        return len(self._stack)

    def ghost_levels(self) -> list[list[MenuItem]]:
        """Retorna todos os níveis anteriores ao atual (para anéis fantasma)."""
        return self._stack[:-1] if len(self._stack) > 1 else []

    def clear(self):
        """Limpa toda a pilha."""
        self._stack.clear()
