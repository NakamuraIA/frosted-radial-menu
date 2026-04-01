"""
hotkey_bridge.py — Bridge thread-safe entre pynput e PySide6.

pynput roda em thread separada. Este módulo usa Signals do Qt para
comunicar o disparo do hotkey de volta à thread da GUI com segurança.
"""

from PySide6.QtCore import QObject, Signal
from pynput import keyboard


class HotkeyBridge(QObject):
    """Escuta hotkeys globais e emite Signals Qt de forma thread-safe."""

    hotkey_triggered = Signal()

    def __init__(self, hotkey_combo: str = "<alt>+<space>", parent=None):
        """
        Args:
            hotkey_combo: Combo de teclas no formato pynput.
                          Exemplos: "<alt>+<space>", "<ctrl>+<space>"
        """
        super().__init__(parent)
        self._hotkey_combo = hotkey_combo
        self._listener = None
        self._setup_listener()

    def _setup_listener(self):
        """Configura o GlobalHotKeys listener."""
        try:
            self._listener = keyboard.GlobalHotKeys({
                self._hotkey_combo: self._on_hotkey
            })
            self._listener.daemon = True  # Morre junto com o app
            self._listener.start()
            print(f"[hotkey] Escutando: {self._hotkey_combo}")
        except Exception as e:
            print(f"[hotkey] Erro ao configurar listener: {e}")

    def _on_hotkey(self):
        """Callback do pynput — emite Signal para a thread da GUI."""
        self.hotkey_triggered.emit()

    def update_hotkey(self, new_combo: str):
        """Atualiza o hotkey em tempo real."""
        self.stop()
        self._hotkey_combo = new_combo
        self._setup_listener()

    def stop(self):
        """Para o listener de forma limpa."""
        if self._listener is not None:
            try:
                self._listener.stop()
            except Exception:
                pass
            self._listener = None

    @property
    def combo(self) -> str:
        return self._hotkey_combo
