"""
action_handler.py — Executa as ações dos itens do menu.

Suporta:
  - run:      Abre um programa (subprocess.Popen)
  - url:      Abre uma URL no browser padrão
  - folder:   Abre uma pasta no Explorer
  - script:   Executa um script Python
  - shortcut: Simula um atalho de teclado
"""

import os
import subprocess
import webbrowser
from pathlib import Path

from PySide6.QtCore import QObject, Signal


class ActionHandler(QObject):
    """Executa ações definidas nos MenuItems."""

    action_executed = Signal(str)   # Emite o label da ação executada
    action_failed = Signal(str)     # Emite mensagem de erro

    def __init__(self, parent=None):
        super().__init__(parent)

    def execute(self, action: str, target: str, label: str = ""):
        """
        Executa uma ação com base no tipo.
        
        Args:
            action: Tipo da ação ("run", "url", "folder", "script", "shortcut")
            target: Argumento da ação (caminho, URL, comando, etc.)
            label: Label do item (para logging/signals)
        """
        try:
            handler = {
                "run": self._run_program,
                "url": self._open_url,
                "folder": self._open_folder,
                "script": self._run_script,
                "shortcut": self._send_shortcut,
                "clipboard_history": self._clipboard_history,
            }.get(action)

            if handler is None:
                self.action_failed.emit(f"Ação desconhecida: '{action}'")
                return

            handler(target)
            self.action_executed.emit(label or target)
            print(f"[action] Executado: {action} → {target}")

        except Exception as e:
            msg = f"Erro ao executar '{action}' ({target}): {e}"
            self.action_failed.emit(msg)
            print(f"[action] {msg}")

    def _run_program(self, target: str):
        """Abre um programa com subprocess."""
        # Suporta comandos complexos sem quebrar caminhos com aspas
        subprocess.Popen(
            target,
            shell=True,
            creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW,
        )

    def _open_url(self, target: str):
        """Abre uma URL no browser padrão."""
        webbrowser.open(target)

    def _open_folder(self, target: str):
        """Abre uma pasta no Explorer."""
        path = Path(target).resolve()
        if path.exists():
            os.startfile(str(path))
        else:
            raise FileNotFoundError(f"Pasta não encontrada: {path}")

    def _run_script(self, target: str):
        """Executa um script Python."""
        path = Path(target).resolve()
        if path.exists() and path.suffix == ".py":
            subprocess.Popen(
                ["python", str(path)],
                creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW,
            )
        else:
            raise FileNotFoundError(f"Script não encontrado: {path}")

    def _send_shortcut(self, target: str):
        """
        Simula um atalho de teclado usando pynput.
        Formato do target: "ctrl+c", "alt+f4", "ctrl+shift+s"
        """
        from pynput.keyboard import Controller, Key
        
        kb = Controller()
        keys_map = {
            "ctrl": Key.ctrl_l, "alt": Key.alt_l, "shift": Key.shift_l,
            "tab": Key.tab, "enter": Key.enter, "esc": Key.esc,
            "space": Key.space, "delete": Key.delete, "backspace": Key.backspace,
            "f1": Key.f1, "f2": Key.f2, "f3": Key.f3, "f4": Key.f4,
            "f5": Key.f5, "f6": Key.f6, "f7": Key.f7, "f8": Key.f8,
            "f9": Key.f9, "f10": Key.f10, "f11": Key.f11, "f12": Key.f12,
            "up": Key.up, "down": Key.down, "left": Key.left, "right": Key.right,
            "home": Key.home, "end": Key.end, "pageup": Key.page_up,
            "pagedown": Key.page_down, "insert": Key.insert,
            "win": Key.cmd, "printscreen": Key.print_screen,
        }

        parts = [p.strip().lower() for p in target.split("+")]
        resolved = []
        for p in parts:
            if p in keys_map:
                resolved.append(keys_map[p])
            elif len(p) == 1:
                resolved.append(p)
            else:
                raise ValueError(f"Tecla desconhecida: '{p}'")

        # Pressiona todas as teclas em sequência e solta na ordem inversa
        for key in resolved:
            kb.press(key)
        for key in reversed(resolved):
            kb.release(key)

    def _clipboard_history(self, target: str = ""):
        """Abre o histórico de clipboard do Windows (Win+V)."""
        self._send_shortcut("win+v")
