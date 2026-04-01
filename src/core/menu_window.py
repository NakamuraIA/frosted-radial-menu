"""
menu_window.py — Janela overlay que hospeda o RadialWidget (pai).

Gerencia:
  - Posicionamento no cursor
  - System Tray
  - Menu filho satélite (ChildRadial) — um por vez
  - Monitoramento de CPU/Relógio
  - LED Pulse Glow lifecycle
  - Orquestração entre componentes
"""

import json
import sys
from datetime import datetime
from pathlib import Path

import psutil

from PySide6.QtWidgets import (
    QWidget, QApplication, QSystemTrayIcon, QMenu, QVBoxLayout,
)
from PySide6.QtGui import QCursor, QIcon, QPixmap, QPainter, QColor, QAction
from PySide6.QtCore import Qt, QPoint, Slot, QTimer

from .menu_item import MenuItem
from .action_handler import ActionHandler
from .radial_widget import RadialWidget
from .hotkey_bridge import HotkeyBridge
from .child_radial import ChildRadial


class MenuWindow(QWidget):
    """Janela principal do menu radial."""

    def __init__(self, config_path: str, parent=None):
        super().__init__(parent)

        # ── Carregar configuração ──
        self._config_path = Path(config_path)
        self._config = self._load_config(str(self._config_path))
        self._settings = self._config.get("settings", {})
        self._root_items = MenuItem.from_config(self._config)

        # ── Configurações ──
        inner_r = self._settings.get("inner_radius", 55)
        outer_r = self._settings.get("outer_radius", 155)
        self._outer_r = outer_r
        accent = self._settings.get("accent_color", "#00DCFF")
        secondary = self._settings.get("secondary_accent_color", "#FF007A")
        self._accent = accent
        self._secondary = secondary
        self._hotkey_combo = self._settings.get("hotkey", "<alt>+<space>")
        self._icons_dir = str(Path(config_path).parent.parent / "assets" / "icons")

        # ── Window Flags ──
        self.setWindowFlags(
            Qt.FramelessWindowHint
            | Qt.WindowStaysOnTopHint
            | Qt.Tool
            | Qt.NoDropShadowWindowHint
        )
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setAttribute(Qt.WA_ShowWithoutActivating, False)

        # ── Componentes ──
        self._action_handler = ActionHandler(self)

        self._radial = RadialWidget(
            inner_radius=inner_r,
            outer_radius=outer_r,
            accent_color=accent,
            secondary_color=secondary,
            icons_dir=self._icons_dir,
            parent=self,
        )
        self._radial.set_theme(
            accent_color=accent,
            secondary_color=secondary,
            ghost_opacity=self._settings.get("ghost_opacity", 0.3),
        )

        # ── Layout ──
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self._radial)
        self.setLayout(layout)
        self.setFixedSize(self._radial.size())

        # ── Conexões ──
        self._radial.item_clicked.connect(self._on_item_clicked)
        self._radial.close_requested.connect(self._close_menu)

        # ── Hotkey ──
        self._hotkey = HotkeyBridge(self._hotkey_combo, self)
        self._hotkey.hotkey_triggered.connect(self._on_hotkey)

        # ── System Tray ──
        self._tray = None
        self._setup_tray()

        # ── Menu Filho (Satélite) ──
        self._child: ChildRadial | None = None

        # ── Monitoramento ──
        self._monitor_timer = QTimer(self)
        self._monitor_timer.setInterval(1000)
        self._monitor_timer.timeout.connect(self._update_monitoring)

        # ── Estado ──
        self._is_visible = False

    # ═══════════════════════════════════════════════════════
    #  CONFIG
    # ═══════════════════════════════════════════════════════

    @staticmethod
    def _load_config(path: str) -> dict:
        config_path = Path(path)
        if not config_path.exists():
            print(f"[config] Arquivo não encontrado: {path}")
            return {"menu": {"items": []}, "settings": {}}
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # ═══════════════════════════════════════════════════════
    #  SYSTEM TRAY
    # ═══════════════════════════════════════════════════════

    def _setup_tray(self):
        if not QSystemTrayIcon.isSystemTrayAvailable():
            print("[tray] System tray não disponível.")
            return

        icon = self._create_tray_icon()
        self._tray = QSystemTrayIcon(icon, self)
        self._tray.setToolTip("Menu Radial — Alt+Espaço para abrir")

        tray_menu = QMenu()

        show_action = QAction("Abrir Menu", self)
        show_action.triggered.connect(self._on_hotkey)
        tray_menu.addAction(show_action)
        tray_menu.addSeparator()

        reload_action = QAction("Recarregar Config", self)
        reload_action.triggered.connect(self._reload_config)
        tray_menu.addAction(reload_action)
        tray_menu.addSeparator()

        quit_action = QAction("Sair", self)
        quit_action.triggered.connect(self._quit)
        tray_menu.addAction(quit_action)

        self._tray.setContextMenu(tray_menu)
        self._tray.activated.connect(self._on_tray_activated)
        self._tray.show()

    def _create_tray_icon(self) -> QIcon:
        size = 64
        pixmap = QPixmap(size, size)
        pixmap.fill(Qt.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.Antialiasing)
        accent = QColor(self._accent)
        painter.setPen(Qt.NoPen)
        painter.setBrush(accent)
        c = size / 2
        painter.drawEllipse(QPoint(int(c), int(c)), 28, 28)
        painter.setBrush(QColor(30, 30, 30))
        painter.drawEllipse(QPoint(int(c), int(c)), 18, 18)
        painter.setBrush(accent)
        painter.drawEllipse(QPoint(int(c), int(c)), 6, 6)
        painter.end()
        return QIcon(pixmap)

    @Slot(QSystemTrayIcon.ActivationReason)
    def _on_tray_activated(self, reason):
        if reason == QSystemTrayIcon.DoubleClick:
            self._on_hotkey()

    # ═══════════════════════════════════════════════════════
    #  MOSTRAR / ESCONDER MENU
    # ═══════════════════════════════════════════════════════

    @Slot()
    def _on_hotkey(self):
        if self._is_visible:
            self._close_menu()
        else:
            self._show_menu()

    def _show_menu(self):
        # Popula o menu com os itens raiz (pai estático)
        self._radial.set_items(self._root_items, [], 1)

        cursor_pos = QCursor.pos()
        self._position_at(cursor_pos)

        self.show()
        self.raise_()
        self.activateWindow()
        self._is_visible = True

        # Iniciar monitoramento e LED glow
        if self._settings.get("enable_monitoring", True):
            self._update_monitoring()
            self._monitor_timer.start()
        self._radial.start_glow()

        self._radial.animate_pop_in()

    def _position_at(self, pos: QPoint):
        screen = QApplication.screenAt(pos)
        if screen is None:
            screen = QApplication.primaryScreen()
        geo = screen.availableGeometry()
        half_w = self.width() // 2
        half_h = self.height() // 2
        x = max(geo.left(), min(pos.x() - half_w, geo.right() - self.width()))
        y = max(geo.top(), min(pos.y() - half_h, geo.bottom() - self.height()))
        self.move(x, y)

    def _close_menu(self):
        if not self._is_visible:
            return

        self._monitor_timer.stop()
        self._radial.stop_glow()
        self._close_child()

        def on_close_done():
            self.hide()
            self._is_visible = False

        self._radial.animate_pop_out(callback=on_close_done)

    # ═══════════════════════════════════════════════════════
    #  MENU FILHO SATÉLITE
    # ═══════════════════════════════════════════════════════

    def _open_child(self, item: MenuItem, slice_index: int):
        """Abre um ChildRadial ao lado do setor clicado. Um por vez."""
        # Auto-limpeza
        self._close_child()

        # Centro do pai em coordenadas globais
        parent_center = self.mapToGlobal(QPoint(self.width() // 2, self.height() // 2))

        self._child = ChildRadial(
            items=item.children,
            title=item.label,
            slice_index=slice_index,
            slice_count=len(self._root_items),
            parent_center=parent_center,
            parent_outer_radius=self._outer_r,
            icons_dir=self._icons_dir,
            accent_color=self._accent,
            secondary_color=self._secondary,
        )

        self._child.action_triggered.connect(self._on_child_action)
        self._child.child_closed.connect(self._on_child_closed)
        self._child.show_animated()

    def _close_child(self):
        """Fecha o filho atual (se existir)."""
        if self._child is not None:
            try:
                self._child.action_triggered.disconnect()
                self._child.child_closed.disconnect()
            except RuntimeError:
                pass
            self._child.hide()
            self._child.deleteLater()
            self._child = None

    @Slot(str, str, str)
    def _on_child_action(self, action: str, target: str, label: str):
        """Ação disparada pelo filho — executa e fecha tudo."""
        self._action_handler.execute(action, target, label)
        self._close_menu()

    @Slot()
    def _on_child_closed(self):
        """Filho se fechou (botão ✕ ou clique fora)."""
        self._child = None

    # ═══════════════════════════════════════════════════════
    #  MONITORAMENTO
    # ═══════════════════════════════════════════════════════

    def _update_monitoring(self):
        try:
            cpu = psutil.cpu_percent(interval=0)
            now = datetime.now()
            clock = now.strftime("%H:%M")
            date = now.strftime("%a, %b %d").upper()
            self._radial.update_monitoring(cpu, clock, date)
        except Exception as e:
            print(f"[monitor] Erro: {e}")

    # ═══════════════════════════════════════════════════════
    #  NAVEGAÇÃO
    # ═══════════════════════════════════════════════════════

    @Slot(object)
    def _on_item_clicked(self, item: MenuItem):
        """Clique no pai: abre filho satélite ou executa ação."""
        if item.has_children:
            try:
                slice_index = self._root_items.index(item)
            except ValueError:
                slice_index = 0
            self._open_child(item, slice_index)
        else:
            if item.action:
                self._action_handler.execute(item.action, item.target, item.label)
            self._close_menu()

    # ═══════════════════════════════════════════════════════
    #  UTILIDADES
    # ═══════════════════════════════════════════════════════

    def _reload_config(self):
        self._config = self._load_config(str(self._config_path))
        self._settings = self._config.get("settings", {})
        self._root_items = MenuItem.from_config(self._config)
        self._accent = self._settings.get("accent_color", "#00DCFF")
        self._secondary = self._settings.get("secondary_accent_color", "#FF007A")
        self._outer_r = self._settings.get("outer_radius", self._outer_r)

        new_hotkey = self._settings.get("hotkey", self._hotkey_combo)
        if new_hotkey != self._hotkey_combo:
            self._hotkey_combo = new_hotkey
            self._hotkey.update_hotkey(new_hotkey)

        self._radial.set_theme(
            accent_color=self._accent,
            secondary_color=self._secondary,
            ghost_opacity=self._settings.get("ghost_opacity", 0.3),
        )
        if self._tray:
            self._tray.setIcon(self._create_tray_icon())
        if self._is_visible:
            self._radial.set_items(self._root_items, [], 1)
        print("[config] Configuração recarregada com sucesso.")

    def _quit(self):
        self._monitor_timer.stop()
        self._radial.stop_glow()
        self._close_child()
        self._hotkey.stop()
        if self._tray:
            self._tray.hide()
        QApplication.quit()

    # ═══════════════════════════════════════════════════════
    #  EVENTOS
    # ═══════════════════════════════════════════════════════

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Escape:
            if self._child is not None and self._child.isVisible():
                self._close_child()
            else:
                self._close_menu()
        super().keyPressEvent(event)

    def focusOutEvent(self, event):
        if self._is_visible:
            QTimer.singleShot(200, self._check_focus)
        super().focusOutEvent(event)

    def _check_focus(self):
        if not self._is_visible:
            return
        # Não fechar se o filho está ativo
        if self._child is not None and self._child.isVisible():
            return
        if not self.isActiveWindow():
            self._close_menu()

    def closeEvent(self, event):
        self._monitor_timer.stop()
        self._radial.stop_glow()
        self._close_child()
        self._hotkey.stop()
        if self._tray:
            self._tray.hide()
        super().closeEvent(event)
