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

import ctypes
from ctypes import wintypes
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import psutil

from PySide6.QtWidgets import (
    QWidget, QApplication, QSystemTrayIcon, QMenu, QVBoxLayout,
)
from PySide6.QtGui import QCursor, QIcon, QPixmap, QPainter, QColor, QAction
from PySide6.QtCore import Qt, QPoint, Slot, QTimer, QEvent

from .menu_item import MenuItem
from .action_handler import ActionHandler
from .radial_widget import RadialWidget
from .hotkey_bridge import HotkeyBridge
from .child_radial import ChildRadial
from .settings_window import SettingsWindow


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
        self._settings_win: SettingsWindow | None = None
        self._setup_tray()

        # ── Menu Filho (Satélite) ──
        self._child: ChildRadial | None = None

        # ── Monitoramento ──
        self._monitor_timer = QTimer(self)
        self._monitor_timer.setInterval(1000)
        self._monitor_timer.timeout.connect(self._update_monitoring)

        # ── Estado ──
        self._is_visible = False

        # ── Global Mouse Hook (WH_MOUSE_LL) ──
        # Detecta cliques FORA do menu em qualquer janela (inclusive desktop).
        # É a abordagem correta para overlay apps no Windows.
        self._mouse_hook = None
        self._mouse_hook_fn = None  # Mantém referência para evitar GC

        # ── Fechar ao clicar fora (eventos Qt — fallback para janelas Qt) ──
        QApplication.instance().installEventFilter(self)

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

        config_action = QAction("⚙️  Configurar Menu...", self)
        config_action.triggered.connect(self._open_settings)
        tray_menu.addAction(config_action)
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
        elif reason == QSystemTrayIcon.MiddleClick:
            self._open_settings()

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

        # Instala hook global de mouse para detectar cliques fora do menu
        QTimer.singleShot(100, self._install_mouse_hook)

    def showEvent(self, event):
        """Aplica correções de transparência DWM após o HWND ser criado.

        Necessário principalmente no Windows 11, que aplica automaticamente:
        - Efeito Mica/Acrylic (fundo escuro atrás da janela)
        - Cantos arredondados
        Ambos criam o 'quadrado visível' atrás do menu circular.
        """
        super().showEvent(event)
        hwnd = int(self.winId())
        if not hwnd:
            return

        try:
            dwmapi = ctypes.WinDLL("dwmapi")

            # ── 1. DwmExtendFrameIntoClientArea(-1,-1,-1,-1) ──────────────
            # Estende o frame DWM para toda a área cliente, habilitando
            # alpha per-pixel real via compositing (trabalha em Win10 e Win11).
            class MARGINS(ctypes.Structure):
                _fields_ = [(n, ctypes.c_int) for n in
                            ("left", "right", "top", "bottom")]
            m = MARGINS(-1, -1, -1, -1)
            dwmapi.DwmExtendFrameIntoClientArea(hwnd, ctypes.byref(m))

            # ── 2. Desativar efeito Mica/Acrylic (Windows 11 22H2+) ───────
            # DWMWA_SYSTEMBACKDROP_TYPE=38, DWMSBT_NONE=1
            # Sem isso, Win11 pinta um "plate" escuro atrás da janela.
            DWMWA_SYSTEMBACKDROP_TYPE = 38
            DWMSBT_NONE = ctypes.c_int(1)
            dwmapi.DwmSetWindowAttribute(
                hwnd, DWMWA_SYSTEMBACKDROP_TYPE,
                ctypes.byref(DWMSBT_NONE), ctypes.sizeof(DWMSBT_NONE)
            )

            # ── 3. Desativar efeito Mica antigo (Windows 11 pre-22H2) ─────
            DWMWA_MICA_EFFECT = 1029
            mica_off = ctypes.c_int(0)
            dwmapi.DwmSetWindowAttribute(
                hwnd, DWMWA_MICA_EFFECT,
                ctypes.byref(mica_off), ctypes.sizeof(mica_off)
            )

            # ── 4. Desativar cantos arredondados do Win11 ─────────────────
            # DWMWA_WINDOW_CORNER_PREFERENCE=33, DWMWCP_DONOTROUND=1
            # Win11 arredonda cantos de janelas automaticamente; sem isso,
            # o "quadrado" tem cantos arredondados conspícuos.
            DWMWA_WINDOW_CORNER_PREFERENCE = 33
            DWMWCP_DONOTROUND = ctypes.c_int(1)
            dwmapi.DwmSetWindowAttribute(
                hwnd, DWMWA_WINDOW_CORNER_PREFERENCE,
                ctypes.byref(DWMWCP_DONOTROUND), ctypes.sizeof(DWMWCP_DONOTROUND)
            )

        except Exception as e:
            print(f"[DWM] Aviso: {e}")

        # 5. Máscara circular — forma da janela no nível do OS
        self._apply_circular_mask()

    def _apply_circular_mask(self):
        """Define a máscara circular da janela eliminando os cantos retangulares.

        O raio da máscara = outer_r + 16 px (cobre o glow externo pintado)
        mas fica dentro do PADDING (20 px), então os cantos são completamente
        recortados pelo sistema operacional — sem quadrado, sem artefatos.
        """
        r = self._outer_r + 16          # raio visível do menu (glow incluso)
        cx = self.width() // 2
        cy = self.height() // 2
        from PySide6.QtGui import QRegion as _R
        region = _R(cx - r, cy - r, r * 2, r * 2, _R.Ellipse)
        self.setMask(region)

    def _install_mouse_hook(self):
        """Instala hook global Win32 WH_MOUSE_LL para detectar cliques fora do menu."""
        if self._mouse_hook or not self._is_visible:
            return

        WH_MOUSE_LL    = 14
        WM_LBUTTONDOWN = 0x0201
        WM_RBUTTONDOWN = 0x0204
        WM_MBUTTONDOWN = 0x0207
        CLICK_MSGS     = {WM_LBUTTONDOWN, WM_RBUTTONDOWN, WM_MBUTTONDOWN}

        # ── Estrutura MSLLHOOKSTRUCT (exata do Win32 SDK) ─────────────────
        class MSLLHOOKSTRUCT(ctypes.Structure):
            _fields_ = [
                ("pt",          wintypes.POINT),   # coordenadas absolutas de tela
                ("mouseData",   wintypes.DWORD),
                ("flags",       wintypes.DWORD),
                ("time",        wintypes.DWORD),
                ("dwExtraInfo", ctypes.c_ulonglong),
            ]

        # ── Assinatura: tipos reais do Windows 64-bit ─────────────────────
        # wintypes.LRESULT e WPARAM não existem em todas as versões do Python
        HOOKPROC = ctypes.WINFUNCTYPE(
            ctypes.c_longlong,   # LRESULT
            ctypes.c_int,        # nCode
            ctypes.c_ulonglong,  # WPARAM (unsigned)
            ctypes.c_longlong,   # LPARAM (raw int — fazemos cast manual)
        )

        def _hook_proc(nCode, wParam, lParam):
            try:
                if nCode >= 0 and wParam in CLICK_MSGS and self._is_visible:
                    # Cast do inteiro lParam para o struct correto
                    struct = ctypes.cast(lParam, ctypes.POINTER(MSLLHOOKSTRUCT)).contents
                    x = struct.pt.x
                    y = struct.pt.y
                    # Deferir para o event loop Qt (não bloquear o hook proc)
                    QTimer.singleShot(0, lambda gx=x, gy=y: self._check_click_outside(gx, gy))
            except Exception as e:
                print(f"[hook] proc erro: {e}")
            # Passar para o próximo hook na cadeia (obrigatório)
            return ctypes.windll.user32.CallNextHookEx(0, nCode, wParam, lParam)

        self._mouse_hook_fn = HOOKPROC(_hook_proc)   # manter referência → evita GC
        self._mouse_hook = ctypes.windll.user32.SetWindowsHookExW(
            WH_MOUSE_LL, self._mouse_hook_fn, None, 0
        )
        if self._mouse_hook:
            print(f"[hook] WH_MOUSE_LL instalado: {self._mouse_hook}")
        else:
            err = ctypes.windll.kernel32.GetLastError()
            print(f"[hook] Falha ao instalar WH_MOUSE_LL, erro Win32: {err}")

    def _uninstall_mouse_hook(self):
        """Remove o hook global de mouse."""
        if self._mouse_hook:
            ctypes.windll.user32.UnhookWindowsHookEx(self._mouse_hook)
            self._mouse_hook = None
            self._mouse_hook_fn = None

    def _check_click_outside(self, gx: int, gy: int):
        """Fecha o menu se o clique foi fora do círculo do menu.

        IMPORTANTE: usar distância ao centro (não geometry().contains) porque
        setMask corta os cantos — cliques nos cantos do retângulo mas fora do
        círculo devem fechar o menu, mas geometry().contains() diria "dentro".
        """
        if not self._is_visible:
            return
        if self._settings_win is not None:
            return

        # ── Checar círculo principal ───────────────────────────────────────
        geo = self.geometry()           # coordenadas de tela
        cx  = geo.x() + geo.width()  // 2
        cy  = geo.y() + geo.height() // 2
        circle_r = self._outer_r + 18   # raio do círculo visível + margem

        dx, dy = gx - cx, gy - cy
        if dx * dx + dy * dy <= circle_r * circle_r:
            return  # dentro do círculo → não fechar

        # ── Checar submenu filho (retângulo está ok para ele) ──────────────
        if (self._child is not None and self._child.isVisible()
                and self._child.geometry().contains(QPoint(gx, gy))):
            return  # dentro do filho

        self._close_menu()


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

        self._uninstall_mouse_hook()  # remove hook global
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
    #  CONFIGURAÇÕES
    # ═══════════════════════════════════════════════════════

    def _open_settings(self):
        """Abre a janela de configurações."""
        if self._settings_win is not None:
            try:
                self._settings_win.raise_()
                self._settings_win.activateWindow()
                return
            except RuntimeError:
                self._settings_win = None

        # Fechar o menu radial antes
        if self._is_visible:
            self._close_menu()

        self._settings_win = SettingsWindow(
            config_path=str(self._config_path),
            icons_dir=self._icons_dir,
            parent=None,
        )
        self._settings_win.settings_saved.connect(self._on_settings_saved)
        self._settings_win.finished.connect(self._on_settings_closed)
        self._settings_win.show()

    @Slot()
    def _on_settings_saved(self):
        """Recarrega config após salvar nas configurações."""
        self._reload_config()

    @Slot()
    def _on_settings_closed(self):
        self._settings_win = None

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

    def paintEvent(self, event):
        """Limpa o fundo da janela para transparência total.

        CompositionMode_Source + Qt.transparent no top-level window (que tem
        WA_TranslucentBackground) garante que qualquer pixel não desenhado
        pelo RadialWidget filho seja alpha=0 — sem artefato retangular nos cantos.
        """
        painter = QPainter(self)
        painter.setCompositionMode(QPainter.CompositionMode_Source)
        painter.fillRect(self.rect(), Qt.transparent)
        # NÃO chamar painter.end() — Qt faz isso ao sair do escopo via destructor

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Escape:
            if self._child is not None and self._child.isVisible():
                self._close_child()
            else:
                self._close_menu()
        super().keyPressEvent(event)

    def _poll_focus(self):
        """Fecha o menu ao perder o foco Qt (chamado a cada 80 ms).

        IMPORTANTE: Qt.Tool windows não são tratadas como 'foreground window'
        pelo Windows (GetForegroundWindow retorna outro hwnd mesmo quando o
        menu está ativo). Por isso usamos QApplication.activeWindow(), que
        acompanha o foco no nível Qt e funciona corretamente para Tool windows.
        """
        if not self._is_visible:
            self._focus_poll.stop()
            return
        if self._settings_win is not None:
            return
        if self._child is not None and self._child.isVisible():
            return
        active = QApplication.activeWindow()
        if active is None:
            # Nenhuma janela Qt está ativa → usuário foi para outro app
            self._close_menu()
            return
        # Checagem extra via Win32 para cliques na área de trabalho / barra de tarefas
        try:
            fg_hwnd = ctypes.windll.user32.GetForegroundWindow()
            our_hwnd = int(self.winId())
            if fg_hwnd and fg_hwnd != our_hwnd:
                # Verificar se fg é filho da nossa janela
                anc = ctypes.windll.user32.GetAncestor(fg_hwnd, 2)
                if anc != our_hwnd:
                    self._close_menu()
        except Exception:
            pass  # Qt activeWindow já cobriu o caso principal

    def eventFilter(self, obj, event):
        """Detecta cliques fora da janela para fechar o menu."""
        if (self._is_visible
                and event.type() == QEvent.MouseButtonPress
                and self._settings_win is None):   # Evitar fechar com Settings aberta
            gpos = event.globalPosition().toPoint()
            # Converter para coordenada local
            local = self.mapFromGlobal(gpos)
            in_main = self.rect().contains(local)
            # Checar se clique foi no filho (satélite)
            in_child = (
                self._child is not None
                and self._child.isVisible()
                and self._child.rect().contains(
                    self._child.mapFromGlobal(gpos)
                )
            )
            if not in_main and not in_child:
                self._close_menu()
        return False  # Propagar o evento normalmente

    def focusOutEvent(self, event):
        # Não fechar por foco — o hook global cuida disso
        super().focusOutEvent(event)

    def closeEvent(self, event):
        self._uninstall_mouse_hook()
        self._monitor_timer.stop()
        self._radial.stop_glow()
        self._close_child()
        self._hotkey.stop()
        if self._tray:
            self._tray.hide()
        super().closeEvent(event)
