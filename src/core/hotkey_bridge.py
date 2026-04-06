"""
hotkey_bridge.py — Bridge thread-safe entre pynput e PySide6.

Suporta:
  - Atalhos de teclado: "<alt>+<space>", "<f7>", "<ctrl>+t"
  - Botões de mouse:    "mouse_middle", "mouse_x1", "mouse_x2"
"""

from PySide6.QtCore import QObject, Signal
from pynput import keyboard

MOUSE_PREFIX = "mouse_"


class HotkeyBridge(QObject):
    """Escuta hotkeys globais (teclado ou mouse) e emite Signal Qt thread-safe."""

    hotkey_triggered = Signal()

    def __init__(self, hotkey_combo: str = "<alt>+<space>", parent=None):
        super().__init__(parent)
        self._hotkey_combo = hotkey_combo
        self._listener      = None   # keyboard GlobalHotKeys
        self._mouse_listener = None  # pynput mouse Listener
        self._setup_listener()

    # ── Helpers ─────────────────────────────────────────────

    def _is_mouse(self) -> bool:
        return self._hotkey_combo.startswith(MOUSE_PREFIX)

    # ── Setup ────────────────────────────────────────────────

    def _setup_listener(self):
        if self._is_mouse():
            self._setup_mouse_listener()
        else:
            self._setup_keyboard_listener()

    def _setup_keyboard_listener(self):
        try:
            self._listener = keyboard.GlobalHotKeys({
                self._hotkey_combo: self._on_hotkey
            })
            self._listener.daemon = True
            self._listener.start()
            print(f"[hotkey] Teclado: {self._hotkey_combo}")
        except Exception as e:
            print(f"[hotkey] Erro ao configurar listener de teclado: {e}")

    def _setup_mouse_listener(self):
        try:
            from pynput.mouse import Listener as MouseListener, Button

            BUTTON_MAP = {
                "middle": Button.middle,
                "x1":     Button.x1,
                "x2":     Button.x2,
            }
            button_name = self._hotkey_combo[len(MOUSE_PREFIX):]
            target = BUTTON_MAP.get(button_name)

            if target is None:
                print(f"[hotkey] Botão de mouse desconhecido: '{button_name}'")
                return

            def on_click(x, y, button, pressed):
                if pressed and button == target:
                    self._on_hotkey()

            self._mouse_listener = MouseListener(on_click=on_click)
            self._mouse_listener.daemon = True
            self._mouse_listener.start()
            print(f"[hotkey] Mouse: {button_name}")

        except Exception as e:
            print(f"[hotkey] Erro ao configurar listener de mouse: {e}")

    # ── Callbacks ────────────────────────────────────────────

    def _on_hotkey(self):
        """Callback pynput → emite Signal para a thread da GUI."""
        self.hotkey_triggered.emit()

    # ── API Pública ──────────────────────────────────────────

    def update_hotkey(self, new_combo: str):
        """Troca o hotkey em tempo real sem reiniciar o app."""
        self.stop()
        self._hotkey_combo = new_combo
        self._setup_listener()

    def stop(self):
        """Para todos os listeners de forma limpa."""
        for listener in (self._listener, self._mouse_listener):
            if listener is not None:
                try:
                    listener.stop()
                except Exception:
                    pass
        self._listener       = None
        self._mouse_listener = None

    @property
    def combo(self) -> str:
        return self._hotkey_combo
