"""
settings_window.py — Janela de configuração do Menu Radial.

Permite ao usuário:
  - Adicionar, editar, remover e reordenar apps
  - Configurar hotkey global (captura tecla pressionada)
  - Ajustar accent color e tema
  - Ativar/desativar autostart com o Windows
"""

import json
import os
import sys
from pathlib import Path

from PySide6.QtWidgets import (
    QDialog, QWidget, QVBoxLayout, QHBoxLayout, QTabWidget,
    QLabel, QPushButton, QLineEdit, QListWidget, QListWidgetItem,
    QFileDialog, QColorDialog, QComboBox, QCheckBox, QFrame,
    QAbstractItemView, QScrollArea, QGroupBox, QSizePolicy,
    QMessageBox, QApplication, QSlider,
)
from PySide6.QtGui import (
    QColor, QPalette, QIcon, QPixmap, QPainter, QKeySequence,
    QFont, QFontMetrics,
)
from PySide6.QtCore import Qt, Signal, QSize, QTimer, QThread

from .radial_preview import RadialPreviewWidget
from .icon_utils import get_app_icon


# ═══════════════════════════════════════════════════════════════
#  CONSTANTES
# ═══════════════════════════════════════════════════════════════

STARTUP_FOLDER = Path(os.environ.get("APPDATA", "")) / \
    "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
STARTUP_LINK_NAME = "Menu Radial.lnk"

DARK_BG     = "#0f111a"
PANEL_BG    = "#161927"
CARD_BG     = "#1c2033"
BORDER      = "#2a2f45"
TEXT_PRIMARY= "#e8eaf6"
TEXT_MUTED  = "#6b74a0"
ACCENT      = "#00DCFF"
DANGER      = "#FF3366"
SUCCESS     = "#00E676"

ICON_TYPES = ["run", "url", "folder", "script", "shortcut"]
ICON_TYPE_LABELS = {
    "run":      "Programa / .exe / .lnk",
    "url":      "Site / URL",
    "folder":   "Pasta",
    "script":   "Script Python (.py)",
    "shortcut": "Atalho de teclado",
}

COMMON_ICONS = [
    "terminal", "folder", "file-text", "calculator", "play",
    "git-branch", "camera", "settings", "globe", "code",
    "chrome", "message-circle", "mail", "music", "image",
    "monitor", "cpu", "database", "lock", "search",
    "star", "heart", "zap", "shield", "download",
]


# Labels amigáveis para botões de mouse
MOUSE_LABELS = {
    "mouse_middle": "🖱  Botão do Meio (Scroll)",
    "mouse_x1":     "🖱  Botão Extra 1  ◀ (Voltar)",
    "mouse_x2":     "🖱  Botão Extra 2  ▶ (Avançar)",
}


# ═══════════════════════════════════════════════════════════════
#  WIDGET DE CAPTURA DE HOTKEY
# ═══════════════════════════════════════════════════════════════

class HotkeyCapture(QLineEdit):
    """Campo que captura teclado OU botão de mouse e emite o combo pynput."""

    hotkey_changed = Signal(str)

    _KEY_MAP = {
        Qt.Key_Space:     "space",
        Qt.Key_Tab:       "tab",
        Qt.Key_Return:    "enter",
        Qt.Key_Escape:    "esc",
        Qt.Key_Backspace: "backspace",
        Qt.Key_Delete:    "delete",
        Qt.Key_Insert:    "insert",
        Qt.Key_Home:      "home",
        Qt.Key_End:       "end",
        Qt.Key_PageUp:    "page_up",
        Qt.Key_PageDown:  "page_down",
        Qt.Key_F1:  "f1",  Qt.Key_F2:  "f2",  Qt.Key_F3:  "f3",
        Qt.Key_F4:  "f4",  Qt.Key_F5:  "f5",  Qt.Key_F6:  "f6",
        Qt.Key_F7:  "f7",  Qt.Key_F8:  "f8",  Qt.Key_F9:  "f9",
        Qt.Key_F10: "f10", Qt.Key_F11: "f11", Qt.Key_F12: "f12",
    }

    _STYLE_NORMAL = f"""
        QLineEdit {{
            background: {CARD_BG};
            color: {TEXT_PRIMARY};
            border: 1.5px solid {BORDER};
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 600;
        }}
        QLineEdit:focus {{ border-color: {ACCENT}; }}
    """
    _STYLE_PENDING = f"""
        QLineEdit {{
            background: {CARD_BG};
            color: #FFB300;
            border: 1.5px solid #FFB300;
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 12px;
        }}
    """
    _STYLE_MOUSE = f"""
        QLineEdit {{
            background: {CARD_BG};
            color: {ACCENT};
            border: 1.5px solid {ACCENT};
            border-radius: 8px;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 600;
        }}
    """

    def __init__(self, current_combo: str = "", parent=None):
        super().__init__(parent)
        self._combo = current_combo
        self.setReadOnly(True)
        self.setPlaceholderText("Clique e pressione tecla ou botão do mouse...")
        self._update_display(current_combo)

    def _display_combo(self, combo: str) -> str:
        if not combo:
            return ""
        if combo in MOUSE_LABELS:
            return MOUSE_LABELS[combo]
        return combo.replace("<", "").replace(">", "").replace("+", "  +  ").upper()

    def _update_display(self, combo: str):
        self._combo = combo
        self.setText(self._display_combo(combo))
        if combo in MOUSE_LABELS:
            self.setStyleSheet(self._STYLE_MOUSE)
        else:
            self.setStyleSheet(self._STYLE_NORMAL)

    # ── Captura de teclado ───────────────────────────────────

    def keyPressEvent(self, event):
        key  = event.key()
        mods = event.modifiers()

        # Mostra modificadores como "pendente"
        if key in (Qt.Key_Control, Qt.Key_Alt, Qt.Key_Shift, Qt.Key_Meta):
            pending = []
            if mods & Qt.ControlModifier or key == Qt.Key_Control: pending.append("CTRL")
            if mods & Qt.AltModifier     or key == Qt.Key_Alt:     pending.append("ALT")
            if mods & Qt.ShiftModifier   or key == Qt.Key_Shift:   pending.append("SHIFT")
            if mods & Qt.MetaModifier    or key == Qt.Key_Meta:    pending.append("WIN")
            self.setStyleSheet(self._STYLE_PENDING)
            self.setText("  +  ".join(pending) + "  +  … (pressione a tecla)")
            return

        parts = []
        if mods & Qt.ControlModifier: parts.append("<ctrl>")
        if mods & Qt.AltModifier:     parts.append("<alt>")
        if mods & Qt.ShiftModifier:   parts.append("<shift>")
        if mods & Qt.MetaModifier:    parts.append("<cmd>")

        if key in self._KEY_MAP:
            parts.append(f"<{self._KEY_MAP[key]}>")
        elif 32 < key < 127:
            parts.append(chr(key).lower())
        else:
            self.setStyleSheet(self._STYLE_NORMAL)
            self.setText("")
            return

        self._update_display("+".join(parts))
        self.hotkey_changed.emit(self._combo)

    # ── Captura de botões de mouse ───────────────────────────

    def mousePressEvent(self, event):
        btn = event.button()
        combo = None
        if btn == Qt.MiddleButton:
            combo = "mouse_middle"
        elif btn == Qt.XButton1:
            combo = "mouse_x1"
        elif btn == Qt.XButton2:
            combo = "mouse_x2"

        if combo:
            self._update_display(combo)
            self.hotkey_changed.emit(combo)
        else:
            super().mousePressEvent(event)

    @property
    def combo(self) -> str:
        return self._combo


# ═══════════════════════════════════════════════════════════════
#  CARD DE ITEM (na lista de apps)
# ═══════════════════════════════════════════════════════════════

class AppItemCard(QFrame):
    """Card visual para um app na lista."""

    edit_requested   = Signal(int)   # índice
    remove_requested = Signal(int)   # índice

    def __init__(self, index: int, item_data: dict, icons_dir: str, parent=None):
        super().__init__(parent)
        self._index = index
        self.setFrameShape(QFrame.NoFrame)
        self.setStyleSheet(f"""
            AppItemCard {{
                background: {CARD_BG};
                border: 1px solid {BORDER};
                border-radius: 10px;
                margin: 3px 0;
            }}
            AppItemCard:hover {{
                border-color: {ACCENT};
            }}
        """)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 8, 8, 8)
        layout.setSpacing(10)

        # Ícone: custom → auto-extract → emoji fallback
        icon_label = QLabel()
        icon_label.setFixedSize(36, 36)
        icon_label.setAlignment(Qt.AlignCenter)
        icon_label.setStyleSheet("border-radius: 8px; background: rgba(255,255,255,0.05);")

        custom_icon = item_data.get("custom_icon", "")
        action      = item_data.get("action", "")
        target      = item_data.get("target", "")

        pm: QPixmap | None = None
        if custom_icon and Path(custom_icon).exists():
            pm = QPixmap(custom_icon)
        if pm is None or pm.isNull():
            pm = get_app_icon(action, target, size=64)

        if pm and not pm.isNull():
            icon_label.setPixmap(
                pm.scaled(30, 30, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            )
        else:
            icon_label.setText("⚙")
            icon_label.setStyleSheet(f"color: {ACCENT}; font-size: 18px; border-radius: 8px;")

        layout.addWidget(icon_label)

        # Info
        info = QVBoxLayout()
        info.setSpacing(2)

        name_label = QLabel(item_data.get("label", "—"))
        name_label.setStyleSheet(f"color: {TEXT_PRIMARY}; font-size: 13px; font-weight: 600;")

        action = item_data.get("action", "")
        target = item_data.get("target", "")
        sub = f"{ICON_TYPE_LABELS.get(action, action)} · {target[:45]}{'…' if len(target) > 45 else ''}"
        sub_label = QLabel(sub)
        sub_label.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 10px;")

        info.addWidget(name_label)
        info.addWidget(sub_label)
        layout.addLayout(info, 1)

        # Botões
        btn_edit = QPushButton("✏")
        btn_edit.setFixedSize(32, 32)
        btn_edit.setToolTip("Editar")
        btn_edit.setCursor(Qt.PointingHandCursor)
        btn_edit.setStyleSheet(f"""
            QPushButton {{
                background: rgba(255,255,255,0.06);
                color: {TEXT_PRIMARY};
                border: none;
                border-radius: 8px;
                font-size: 14px;
            }}
            QPushButton:hover {{ background: rgba(0,220,255,0.15); color: {ACCENT}; }}
        """)
        btn_edit.clicked.connect(lambda: self.edit_requested.emit(self._index))

        btn_remove = QPushButton("🗑")
        btn_remove.setFixedSize(32, 32)
        btn_remove.setToolTip("Remover")
        btn_remove.setCursor(Qt.PointingHandCursor)
        btn_remove.setStyleSheet(f"""
            QPushButton {{
                background: rgba(255,255,255,0.06);
                color: {TEXT_PRIMARY};
                border: none;
                border-radius: 8px;
                font-size: 14px;
            }}
            QPushButton:hover {{ background: rgba(255,51,102,0.18); color: {DANGER}; }}
        """)
        btn_remove.clicked.connect(lambda: self.remove_requested.emit(self._index))

        layout.addWidget(btn_edit)
        layout.addWidget(btn_remove)


# ═══════════════════════════════════════════════════════════════
#  JANELA DE EDITAR / ADICIONAR APP  (redesenhada)
# ═══════════════════════════════════════════════════════════════

# Tipos com emoji, key e placeholder do caminho
_TYPE_PILLS = [
    ("run",      "⚙",  "Programa",  "C:\\caminho\\app.exe  ou  notepad.exe"),
    ("url",      "🌐", "Site",      "https://exemplo.com"),
    ("folder",   "📁", "Pasta",     "C:\\Users\\Você\\Pasta"),
    ("script",   "🐍", "Script",    "C:\\scripts\\meu_script.py"),
    ("shortcut", "⌨",  "Atalho",   "ctrl+c   ou   win+l"),
]


class AppEditDialog(QDialog):
    """Diálogo premium para adicionar ou editar um app."""

    def __init__(self, item_data: dict | None = None, parent=None):
        super().__init__(parent)
        self._data = item_data.copy() if item_data else {
            "label": "", "icon": "terminal", "custom_icon": "",
            "action": "run", "target": ""
        }
        self._is_edit = bool(item_data and item_data.get("label"))
        self.setWindowTitle("Editar App" if self._is_edit else "Adicionar App")
        self.setFixedWidth(520)
        self.setWindowFlags(Qt.Dialog | Qt.FramelessWindowHint)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self._type_pill_btns: dict[str, QPushButton] = {}
        self._build_ui()

    def _build_ui(self):
        outer = QVBoxLayout(self)
        outer.setContentsMargins(8, 8, 8, 8)

        card = QFrame()
        card.setObjectName("editCard")
        card.setStyleSheet(f"""
            QFrame#editCard {{
                background: #12151f;
                border: 1.5px solid #2a3050;
                border-radius: 18px;
            }}
            QLabel {{ background: transparent; border: none; }}
        """)
        cl = QVBoxLayout(card)
        cl.setContentsMargins(0, 0, 0, 0)
        cl.setSpacing(0)

        # ── Header colorido ──────────────────────────────────
        header = QFrame()
        header.setStyleSheet(f"""
            background: qlineargradient(x1:0,y1:0,x2:1,y2:0,
                stop:0 #0d2030, stop:1 #0d1a30);
            border-radius: 16px 16px 0 0;
            border-bottom: 1px solid #1e2840;
        """)
        hl = QHBoxLayout(header)
        hl.setContentsMargins(22, 16, 16, 16)

        badge = QLabel("✏" if self._is_edit else "＋")
        badge.setFixedSize(36, 36)
        badge.setAlignment(Qt.AlignCenter)
        badge.setStyleSheet(f"""
            background: rgba(0,220,255,0.15);
            border: 1px solid rgba(0,220,255,0.35);
            border-radius: 10px;
            color: {ACCENT};
            font-size: 16px;
        """)

        title_col = QVBoxLayout()
        title_col.setSpacing(2)
        h_title = QLabel("Editar App" if self._is_edit else "Adicionar App")
        h_title.setStyleSheet(f"color: {TEXT_PRIMARY}; font-size: 14px; font-weight: 700;")
        h_sub = QLabel("Altere as informações abaixo" if self._is_edit else "Configure o novo atalho")
        h_sub.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 10px;")
        title_col.addWidget(h_title)
        title_col.addWidget(h_sub)

        btn_x = QPushButton("✕")
        btn_x.setFixedSize(28, 28)
        btn_x.setCursor(Qt.PointingHandCursor)
        btn_x.setStyleSheet(f"""
            QPushButton {{
                background: rgba(255,255,255,0.06); color: {TEXT_MUTED};
                border: none; border-radius: 7px; font-size: 11px;
            }}
            QPushButton:hover {{ background: rgba(255,51,102,0.2); color: {DANGER}; }}
        """)
        btn_x.clicked.connect(self.reject)

        hl.addWidget(badge)
        hl.addSpacing(10)
        hl.addLayout(title_col, 1)
        hl.addWidget(btn_x)
        cl.addWidget(header)

        # ── Corpo ────────────────────────────────────────────
        body = QWidget()
        body.setStyleSheet("background: transparent;")
        bl = QVBoxLayout(body)
        bl.setContentsMargins(22, 18, 22, 18)
        bl.setSpacing(14)

        # Nome
        bl.addWidget(self._lbl("Nome do App"))
        self._name_edit = QLineEdit(self._data.get("label", ""))
        self._inp(self._name_edit, "Ex: Discord, Chrome, Spotify...")
        bl.addWidget(self._name_edit)

        # Tipo — pills
        bl.addWidget(self._lbl("Tipo de ação"))
        pill_row = QHBoxLayout()
        pill_row.setSpacing(6)
        cur_action = self._data.get("action", "run")
        for key, icon, label, _ in _TYPE_PILLS:
            btn = QPushButton(f"{icon}  {label}")
            btn.setCheckable(True)
            btn.setChecked(key == cur_action)
            btn.setCursor(Qt.PointingHandCursor)
            btn.setStyleSheet(self._pill_style(key == cur_action))
            btn.clicked.connect(lambda _, k=key: self._select_type(k))
            self._type_pill_btns[key] = btn
            pill_row.addWidget(btn)
        bl.addLayout(pill_row)

        # Caminho / Target
        self._path_lbl = self._lbl("Caminho / URL")
        bl.addWidget(self._path_lbl)
        path_row = QHBoxLayout()
        path_row.setSpacing(6)
        self._target_edit = QLineEdit(self._data.get("target", ""))
        self._inp(self._target_edit, "")
        self._browse_btn = QPushButton("📂")
        self._browse_btn.setFixedSize(38, 38)
        self._browse_btn.setCursor(Qt.PointingHandCursor)
        self._browse_btn.setStyleSheet(self._icon_btn_style())
        self._browse_btn.setToolTip("Procurar arquivo")
        self._browse_btn.clicked.connect(self._browse_target)
        path_row.addWidget(self._target_edit, 1)
        path_row.addWidget(self._browse_btn)
        bl.addLayout(path_row)

        # Modo de ícone — 3 pills
        bl.addWidget(self._lbl("Modo de Ícone"))
        icon_mode_row = QHBoxLayout()
        icon_mode_row.setSpacing(6)
        _ICON_MODES = [
            ("auto",   "🖥",  "Sistema"),   # extrai do .exe automaticamente
            ("custom", "🖼",  "Imagem"),    # PNG/ICO escolhido pelo usuário
            ("svg",    "✦",  "SVG"),       # ícone Lucide
        ]
        self._icon_mode_btns: dict[str, QPushButton] = {}
        cur_mode = self._data.get("icon_mode", "auto")
        for mode_key, mode_icon, mode_label in _ICON_MODES:
            mb = QPushButton(f"{mode_icon}  {mode_label}")
            mb.setCheckable(True)
            mb.setChecked(mode_key == cur_mode)
            mb.setCursor(Qt.PointingHandCursor)
            mb.setStyleSheet(self._pill_style(mode_key == cur_mode))
            mb.clicked.connect(lambda _, k=mode_key: self._select_icon_mode(k))
            self._icon_mode_btns[mode_key] = mb
            icon_mode_row.addWidget(mb)
        bl.addLayout(icon_mode_row)

        # Seção de imagem customizada (visível apenas no modo "custom")
        self._custom_icon_section = QWidget()
        cis_layout = QVBoxLayout(self._custom_icon_section)
        cis_layout.setContentsMargins(0, 0, 0, 0)
        cis_layout.setSpacing(6)
        cis_layout.addWidget(self._lbl("Arquivo de Imagem (PNG / ICO)"))
        icon_row = QHBoxLayout()
        icon_row.setSpacing(6)
        self._icon_path_edit = QLineEdit(self._data.get("custom_icon", ""))
        self._inp(self._icon_path_edit, "Selecione ou cole o caminho da imagem")
        browse_ic = QPushButton("🖼")
        browse_ic.setFixedSize(38, 38)
        browse_ic.setCursor(Qt.PointingHandCursor)
        browse_ic.setStyleSheet(self._icon_btn_style())
        browse_ic.clicked.connect(self._browse_icon)
        self._icon_prev = QLabel()
        self._icon_prev.setFixedSize(38, 38)
        self._icon_prev.setAlignment(Qt.AlignCenter)
        self._icon_prev.setStyleSheet(
            f"background: {CARD_BG}; border: 1px solid {BORDER};"
            f"border-radius: 10px; color: {TEXT_MUTED}; font-size: 16px;"
        )
        icon_row.addWidget(self._icon_path_edit, 1)
        icon_row.addWidget(browse_ic)
        icon_row.addWidget(self._icon_prev)
        cis_layout.addLayout(icon_row)
        self._icon_path_edit.textChanged.connect(self._update_icon_preview)
        bl.addWidget(self._custom_icon_section)

        # ── Tamanho do ícone (slider) ─────────────────────────
        # Header row: label + valor atual
        sz_header = QHBoxLayout()
        sz_header.setContentsMargins(0, 0, 0, 0)
        sz_header.addWidget(self._lbl("Tamanho do ícone"))
        sz_header.addStretch()
        self._scale_val_lbl = QLabel()
        self._scale_val_lbl.setStyleSheet(
            f"color: {ACCENT}; font-size: 10px; font-weight: 700;"
        )
        sz_header.addWidget(self._scale_val_lbl)
        bl.addLayout(sz_header)

        # Slider row: − [====] +
        ICON_BASE = 52   # px base (ICON_SIZE) — usado só p/ exibição
        slider_row = QHBoxLayout()
        slider_row.setSpacing(6)

        def _mini_btn(txt: str) -> QPushButton:
            b = QPushButton(txt)
            b.setFixedSize(28, 28)
            b.setCursor(Qt.PointingHandCursor)
            b.setStyleSheet(f"""
                QPushButton {{
                    background: rgba(255,255,255,0.07);
                    color: {TEXT_PRIMARY};
                    border: 1px solid #252844;
                    border-radius: 7px;
                    font-size: 14px;
                    font-weight: 700;
                }}
                QPushButton:hover {{
                    background: rgba(0,220,255,0.18);
                    color: {ACCENT};
                    border-color: rgba(0,220,255,0.4);
                }}
                QPushButton:pressed {{ background: rgba(0,220,255,0.28); }}
            """)
            return b

        btn_minus = _mini_btn("−")
        btn_plus  = _mini_btn("+")

        init_pct = int(float(self._data.get("icon_scale", 1.0)) * 100)
        self._scale_slider = QSlider(Qt.Horizontal)
        self._scale_slider.setRange(50, 200)
        self._scale_slider.setSingleStep(5)
        self._scale_slider.setPageStep(10)
        self._scale_slider.setValue(init_pct)
        self._scale_slider.setStyleSheet(f"""
            QSlider::groove:horizontal {{
                background: #1a1e30;
                border: 1px solid #252844;
                height: 6px;
                border-radius: 3px;
            }}
            QSlider::sub-page:horizontal {{
                background: qlineargradient(x1:0,y1:0,x2:1,y2:0,
                    stop:0 #0077aa, stop:1 {ACCENT});
                border-radius: 3px;
            }}
            QSlider::handle:horizontal {{
                background: {ACCENT};
                border: 2px solid #001820;
                width: 14px;
                height: 14px;
                margin: -5px 0;
                border-radius: 7px;
            }}
            QSlider::handle:horizontal:hover {{
                background: #ffffff;
                border-color: {ACCENT};
            }}
        """)

        def _update_scale(val: int):
            px = int(ICON_BASE * val / 100)
            self._scale_val_lbl.setText(f"{val}%  ≈  {px}px")

        self._scale_slider.valueChanged.connect(_update_scale)
        btn_minus.clicked.connect(lambda: self._scale_slider.setValue(
            max(50, self._scale_slider.value() - 5)))
        btn_plus.clicked.connect(lambda: self._scale_slider.setValue(
            min(200, self._scale_slider.value() + 5)))

        slider_row.addWidget(btn_minus)
        slider_row.addWidget(self._scale_slider, 1)
        slider_row.addWidget(btn_plus)
        bl.addLayout(slider_row)

        # Inicializar label de valor
        _update_scale(init_pct)

        cl.addWidget(body, 1)

        # ── Footer ───────────────────────────────────────────
        footer = QFrame()
        footer.setStyleSheet(f"""
            background: #0e1120;
            border-radius: 0 0 16px 16px;
            border-top: 1px solid #1e2840;
        """)
        fl = QHBoxLayout(footer)
        fl.setContentsMargins(22, 12, 22, 14)
        fl.setSpacing(10)

        btn_cancel = QPushButton("Cancelar")
        btn_cancel.setCursor(Qt.PointingHandCursor)
        btn_cancel.setStyleSheet(f"""
            QPushButton {{
                background: rgba(255,255,255,0.06); color: {TEXT_MUTED};
                border: 1px solid {BORDER}; border-radius: 10px;
                padding: 9px 20px; font-size: 12px;
            }}
            QPushButton:hover {{ color: {TEXT_PRIMARY}; border-color: #3a4060; }}
        """)
        btn_cancel.clicked.connect(self.reject)

        btn_save = QPushButton("  Salvar  →")
        btn_save.setCursor(Qt.PointingHandCursor)
        btn_save.setStyleSheet(f"""
            QPushButton {{
                background: qlineargradient(x1:0,y1:0,x2:1,y2:0,
                    stop:0 {ACCENT}, stop:1 #0099BB);
                color: #000; border: none; border-radius: 10px;
                padding: 9px 24px; font-size: 12px; font-weight: 700;
                letter-spacing: 0.5px;
            }}
            QPushButton:hover {{ background: {ACCENT}; }}
            QPushButton:pressed {{ background: #009aaa; }}
        """)
        btn_save.clicked.connect(self._on_save)

        fl.addStretch()
        fl.addWidget(btn_cancel)
        fl.addWidget(btn_save)
        cl.addWidget(footer)

        outer.addWidget(card)

        # Aplicar estado inicial
        self._current_icon_mode = self._data.get("icon_mode", "auto")
        self._select_type(cur_action)
        self._select_icon_mode(self._current_icon_mode)
        self._update_icon_preview(self._data.get("custom_icon", ""))

    # ── Helpers de estilo ────────────────────────────────────

    def _lbl(self, text: str) -> QLabel:
        lbl = QLabel(text)
        lbl.setStyleSheet(
            f"color: {TEXT_MUTED}; font-size: 10px; font-weight: 700; "
            f"letter-spacing: 0.8px; text-transform: uppercase;"
        )
        return lbl

    def _inp(self, w: QLineEdit, placeholder: str):
        w.setPlaceholderText(placeholder)
        w.setMinimumHeight(38)
        w.setStyleSheet(f"""
            QLineEdit {{
                background: #0d1020;
                color: {TEXT_PRIMARY};
                border: 1.5px solid #252844;
                border-radius: 10px;
                padding: 0 12px;
                font-size: 12px;
            }}
            QLineEdit:focus {{ border-color: {ACCENT}; background: #0f1228; }}
            QLineEdit::placeholder {{ color: #3a4060; }}
        """)

    def _pill_style(self, active: bool) -> str:
        if active:
            return f"""
                QPushButton {{
                    background: rgba(0,220,255,0.18);
                    color: {ACCENT};
                    border: 1.5px solid rgba(0,220,255,0.55);
                    border-radius: 8px;
                    padding: 6px 10px;
                    font-size: 11px;
                    font-weight: 700;
                }}
            """
        return f"""
            QPushButton {{
                background: rgba(255,255,255,0.05);
                color: {TEXT_MUTED};
                border: 1px solid #252844;
                border-radius: 8px;
                padding: 6px 10px;
                font-size: 11px;
            }}
            QPushButton:hover {{
                background: rgba(255,255,255,0.08);
                color: {TEXT_PRIMARY};
                border-color: #3a4060;
            }}
        """

    def _icon_btn_style(self) -> str:
        return f"""
            QPushButton {{
                background: rgba(0,220,255,0.10);
                color: {ACCENT};
                border: 1px solid #252844;
                border-radius: 10px;
                font-size: 16px;
            }}
            QPushButton:hover {{ background: rgba(0,220,255,0.20); }}
        """

    # ── Lógica de tipo ───────────────────────────────────────

    def _select_type(self, key: str):
        self._current_type = key
        for k, btn in self._type_pill_btns.items():
            btn.setChecked(k == key)
            btn.setStyleSheet(self._pill_style(k == key))
        for tk, _ic, _lb, ph in _TYPE_PILLS:
            if tk == key:
                self._target_edit.setPlaceholderText(ph)
                break
        show_browse = key in ("run", "folder", "script")
        self._browse_btn.setVisible(show_browse)

    def _select_icon_mode(self, key: str):
        """Atualiza pills de modo de ícone e mostra/esconde secão de imagem."""
        self._current_icon_mode = key
        for k, btn in self._icon_mode_btns.items():
            btn.setChecked(k == key)
            btn.setStyleSheet(self._pill_style(k == key))
        self._custom_icon_section.setVisible(key == "custom")

    # ── Browse ───────────────────────────────────────────────

    def _browse_target(self):
        if self._current_type == "folder":
            path = QFileDialog.getExistingDirectory(self, "Selecione a pasta")
        else:
            path, _ = QFileDialog.getOpenFileName(
                self, "Selecione o arquivo",
                filter="Executáveis e Atalhos (*.exe *.lnk *.bat *.cmd *.py);;Todos (*.*)"
            )
        if path:
            self._target_edit.setText(path)

    def _browse_icon(self):
        path, _ = QFileDialog.getOpenFileName(
            self, "Selecione o ícone",
            filter="Imagens (*.png *.jpg *.jpeg *.ico *.bmp);;Todos (*.*)"
        )
        if path:
            self._icon_path_edit.setText(path)

    def _update_icon_preview(self, path: str = ""):
        path = path or self._icon_path_edit.text()
        if path and Path(path).exists():
            pm = QPixmap(path).scaled(30, 30, Qt.KeepAspectRatio, Qt.SmoothTransformation)
            self._icon_prev.setPixmap(pm)
            self._icon_prev.setText("")
        else:
            self._icon_prev.setPixmap(QPixmap())
            self._icon_prev.setText("🖼")

    # ── Salvar ───────────────────────────────────────────────

    def _on_save(self):
        label  = self._name_edit.text().strip()
        target = self._target_edit.text().strip()
        if not label:
            QMessageBox.warning(self, "Atenção", "O nome do app não pode estar vazio.")
            return
        if not target:
            QMessageBox.warning(self, "Atenção", "O caminho / URL não pode estar vazio.")
            return
        self._data["label"]       = label
        self._data["action"]      = self._current_type
        self._data["target"]      = target
        self._data["icon_mode"]   = self._current_icon_mode
        self._data["icon_scale"]  = round(self._scale_slider.value() / 100.0, 2)
        # Só salva custom_icon se o modo for "custom"
        if self._current_icon_mode == "custom":
            self._data["custom_icon"] = self._icon_path_edit.text().strip()
        else:
            self._data["custom_icon"] = ""
        self.accept()

    def result_data(self) -> dict:
        return self._data


# ═══════════════════════════════════════════════════════════════
#  JANELA PRINCIPAL DE CONFIGURAÇÕES
# ═══════════════════════════════════════════════════════════════

class SettingsWindow(QDialog):
    """Janela de configuração do Menu Radial."""

    settings_saved = Signal()    # Emitido após salvar — acionar reload

    def __init__(self, config_path: str, icons_dir: str = "", parent=None):
        super().__init__(parent)
        self._config_path = Path(config_path)
        self._icons_dir = icons_dir
        self._config = self._load_config()
        self._items: list[dict] = list(self._config.get("menu", {}).get("items", []))
        self._settings: dict = dict(self._config.get("settings", {}))

        self.setWindowTitle("⚙ Menu Radial — Configurações")
        self.setMinimumSize(740, 640)
        self.setWindowFlags(Qt.Dialog | Qt.FramelessWindowHint)
        self.setAttribute(Qt.WA_TranslucentBackground)

        self._drag_pos = None
        self._preview: RadialPreviewWidget | None = None
        self._build_ui()

    # ── Carregar Config ──────────────────────────────────────

    def _load_config(self) -> dict:
        if self._config_path.exists():
            with open(self._config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"menu": {"items": []}, "settings": {}}

    # ── Drag para mover a janela ─────────────────────────────

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self._drag_pos = event.globalPosition().toPoint()

    def mouseMoveEvent(self, event):
        if self._drag_pos and event.buttons() == Qt.LeftButton:
            delta = event.globalPosition().toPoint() - self._drag_pos
            self.move(self.pos() + delta)
            self._drag_pos = event.globalPosition().toPoint()

    def mouseReleaseEvent(self, event):
        self._drag_pos = None

    # ── Construção da UI ─────────────────────────────────────

    def _build_ui(self):
        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)

        card = QFrame()
        card.setObjectName("mainCard")
        card.setStyleSheet(f"""
            QFrame#mainCard {{
                background: {DARK_BG};
                border: 1.5px solid {BORDER};
                border-radius: 18px;
            }}
            QLabel {{
                background: transparent;
                border: none;
            }}
        """)

        main_layout = QVBoxLayout(card)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # ── Header ──
        header = self._build_header()
        main_layout.addWidget(header)

        # ── Tabs ──
        self._tabs = QTabWidget()
        self._tabs.setStyleSheet(f"""
            QTabWidget::pane {{
                background: transparent;
                border: none;
            }}
            QTabBar::tab {{
                background: transparent;
                color: {TEXT_MUTED};
                padding: 10px 22px;
                font-size: 12px;
                font-weight: 600;
                border-bottom: 2px solid transparent;
            }}
            QTabBar::tab:selected {{
                color: {ACCENT};
                border-bottom: 2px solid {ACCENT};
            }}
            QTabBar::tab:hover {{
                color: {TEXT_PRIMARY};
            }}
        """)

        apps_tab = self._build_apps_tab()
        settings_tab = self._build_settings_tab()
        self._tabs.addTab(apps_tab, "  Apps  ")
        self._tabs.addTab(settings_tab, "  Configurações  ")

        main_layout.addWidget(self._tabs, 1)

        # ── Footer ──
        footer = self._build_footer()
        main_layout.addWidget(footer)

        outer.addWidget(card)

    def _build_header(self) -> QFrame:
        header = QFrame()
        header.setStyleSheet(f"""
            background: {PANEL_BG};
            border-radius: 18px 18px 0 0;
            border-bottom: 1px solid {BORDER};
        """)
        hl = QHBoxLayout(header)
        hl.setContentsMargins(24, 16, 16, 16)

        title_col = QVBoxLayout()
        title = QLabel("⚙  Menu Radial")
        title.setStyleSheet(f"color: {TEXT_PRIMARY}; font-size: 16px; font-weight: 700;")
        subtitle = QLabel("Configurações e personalização")
        subtitle.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 11px;")
        title_col.addWidget(title)
        title_col.addWidget(subtitle)
        hl.addLayout(title_col, 1)

        btn_close = QPushButton("✕")
        btn_close.setFixedSize(32, 32)
        btn_close.setCursor(Qt.PointingHandCursor)
        btn_close.setStyleSheet(f"""
            QPushButton {{
                background: rgba(255,255,255,0.06);
                color: {TEXT_MUTED};
                border: none;
                border-radius: 8px;
                font-size: 13px;
            }}
            QPushButton:hover {{ background: rgba(255,51,102,0.2); color: {DANGER}; }}
        """)
        btn_close.clicked.connect(self.reject)
        hl.addWidget(btn_close)

        return header

    def _build_apps_tab(self) -> QWidget:
        tab = QWidget()
        tab.setStyleSheet("background: transparent;")

        # Layout principal: lado-a-lado (preview | lista)
        main_h = QHBoxLayout(tab)
        main_h.setContentsMargins(0, 0, 0, 0)
        main_h.setSpacing(0)

        # ── LADO ESQUERDO: Preview Radial ────────────────────
        left = QFrame()
        left.setStyleSheet(f"""
            background: {PANEL_BG};
            border-right: 1px solid {BORDER};
        """)
        left_v = QVBoxLayout(left)
        left_v.setContentsMargins(16, 14, 16, 14)
        left_v.setSpacing(8)
        left_v.setAlignment(Qt.AlignHCenter)

        # Breadcrumb
        self._breadcrumb_lbl = QLabel("Root")
        self._breadcrumb_lbl.setStyleSheet(
            f"color: {ACCENT}; font-size: 10px; font-weight: 600;"
        )
        self._breadcrumb_lbl.setAlignment(Qt.AlignCenter)
        left_v.addWidget(self._breadcrumb_lbl)

        # Preview widget
        self._preview = RadialPreviewWidget(
            items=self._items,
            icons_dir=self._icons_dir,
        )
        self._preview.changed.connect(self._on_preview_changed)
        self._preview.nav_label.connect(self._breadcrumb_lbl.setText)
        left_v.addWidget(self._preview, 0, Qt.AlignHCenter)

        # Legenda
        hint = QLabel("💡 Clique para editar · Direito para opções · ● laranja = submenu")
        hint.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 9px;")
        hint.setAlignment(Qt.AlignCenter)
        hint.setWordWrap(True)
        left_v.addWidget(hint)
        left_v.addStretch()

        main_h.addWidget(left, 0)

        # ── LADO DIREITO: Lista de Apps ──────────────────────
        right = QWidget()
        right.setStyleSheet("background: transparent;")
        right_v = QVBoxLayout(right)
        right_v.setContentsMargins(16, 14, 16, 14)
        right_v.setSpacing(8)

        # Barra de ações
        action_bar = QHBoxLayout()
        add_btn = QPushButton("＋  Adicionar")
        add_btn.setCursor(Qt.PointingHandCursor)
        add_btn.setStyleSheet(f"""
            QPushButton {{
                background: qlineargradient(x1:0,y1:0,x2:1,y2:0,
                    stop:0 {ACCENT}, stop:1 #0099BB);
                color: #000; border: none; border-radius: 8px;
                padding: 7px 14px; font-size: 12px; font-weight: 700;
            }}
            QPushButton:hover {{ background: {ACCENT}; }}
        """)
        add_btn.clicked.connect(self._add_app)

        self._count_label = QLabel()
        self._count_label.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 10px;")

        action_bar.addWidget(add_btn)
        action_bar.addStretch()
        action_bar.addWidget(self._count_label)
        right_v.addLayout(action_bar)

        # Lista de apps com scroll
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.NoFrame)
        scroll.setStyleSheet(f"""
            QScrollArea {{ background: transparent; border: none; }}
            QScrollBar:vertical {{
                background: {PANEL_BG}; width: 5px; border-radius: 3px;
            }}
            QScrollBar::handle:vertical {{
                background: {BORDER}; border-radius: 3px; min-height: 20px;
            }}
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}
        """)

        self._apps_container = QWidget()
        self._apps_container.setStyleSheet("background: transparent;")
        self._apps_layout = QVBoxLayout(self._apps_container)
        self._apps_layout.setContentsMargins(0, 0, 4, 0)
        self._apps_layout.setSpacing(3)
        self._apps_layout.addStretch()
        scroll.setWidget(self._apps_container)
        right_v.addWidget(scroll, 1)

        main_h.addWidget(right, 1)

        self._refresh_apps_list()
        return tab

    def _build_settings_tab(self) -> QWidget:
        tab = QWidget()
        tab.setStyleSheet("background: transparent;")
        layout = QVBoxLayout(tab)
        layout.setContentsMargins(20, 16, 20, 16)
        layout.setSpacing(16)

        # ── Hotkey ──
        hotkey_group = self._section("🎹  Tecla de Atalho")
        hotkey_inner = QVBoxLayout(hotkey_group)
        hotkey_inner.setContentsMargins(14, 10, 14, 14)

        lbl_hotkey = QLabel("Pressione a combinação de teclas que deseja usar:")
        lbl_hotkey.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 11px;")
        hotkey_inner.addWidget(lbl_hotkey)

        self._hotkey_capture = HotkeyCapture(
            self._settings.get("hotkey", "<alt>+<space>")
        )
        hotkey_inner.addWidget(self._hotkey_capture)
        layout.addWidget(hotkey_group)

        # ── Accent Color ──
        color_group = self._section("🎨  Cor de Destaque")
        color_inner = QHBoxLayout(color_group)
        color_inner.setContentsMargins(14, 10, 14, 14)

        self._color_preview = QFrame()
        self._color_preview.setFixedSize(36, 36)
        self._color_preview.setStyleSheet(f"""
            background: {self._settings.get('accent_color', ACCENT)};
            border-radius: 8px;
            border: 1.5px solid rgba(255,255,255,0.1);
        """)

        self._color_label = QLabel(self._settings.get("accent_color", ACCENT))
        self._color_label.setStyleSheet(f"color: {TEXT_PRIMARY}; font-size: 13px;")

        btn_pick_color = QPushButton("Escolher cor...")
        btn_pick_color.setCursor(Qt.PointingHandCursor)
        btn_pick_color.setStyleSheet(f"""
            QPushButton {{
                background: rgba(255,255,255,0.06);
                color: {TEXT_PRIMARY};
                border: 1px solid {BORDER};
                border-radius: 8px;
                padding: 8px 14px;
                font-size: 12px;
            }}
            QPushButton:hover {{ border-color: {ACCENT}; color: {ACCENT}; }}
        """)
        btn_pick_color.clicked.connect(self._pick_color)

        color_inner.addWidget(self._color_preview)
        color_inner.addWidget(self._color_label, 1)
        color_inner.addWidget(btn_pick_color)
        layout.addWidget(color_group)

        # ── Autostart ──
        startup_group = self._section("🚀  Iniciar com o Windows")
        startup_inner = QHBoxLayout(startup_group)
        startup_inner.setContentsMargins(14, 10, 14, 14)

        startup_info = QLabel(
            "Quando ativo, o Menu Radial inicia automaticamente com o Windows."
        )
        startup_info.setStyleSheet(f"color: {TEXT_MUTED}; font-size: 11px;")
        startup_info.setWordWrap(True)

        self._autostart_check = QCheckBox("Iniciar com o Windows")
        self._autostart_check.setChecked(self._is_autostart_enabled())
        self._autostart_check.setStyleSheet(f"""
            QCheckBox {{ color: {TEXT_PRIMARY}; font-size: 13px; spacing: 8px; }}
            QCheckBox::indicator {{ width: 20px; height: 20px; border-radius: 6px;
                border: 2px solid {BORDER}; background: {CARD_BG}; }}
            QCheckBox::indicator:checked {{ background: {ACCENT}; border-color: {ACCENT}; }}
        """)

        startup_inner.addWidget(startup_info, 1)
        startup_inner.addWidget(self._autostart_check)
        layout.addWidget(startup_group)

        layout.addStretch()
        return tab

    def _section(self, title: str) -> QGroupBox:
        group = QGroupBox(title)
        group.setStyleSheet(f"""
            QGroupBox {{
                background: {PANEL_BG};
                border: 1px solid {BORDER};
                border-radius: 12px;
                font-size: 12px;
                font-weight: 700;
                color: {TEXT_PRIMARY};
                margin-top: 8px;
                padding-top: 16px;
            }}
            QGroupBox::title {{
                subcontrol-origin: margin;
                left: 14px; top: 0px;
                padding: 0 6px;
            }}
        """)
        return group

    def _build_footer(self) -> QFrame:
        footer = QFrame()
        footer.setStyleSheet(f"""
            background: {PANEL_BG};
            border-top: 1px solid {BORDER};
            border-radius: 0 0 18px 18px;
        """)
        fl = QHBoxLayout(footer)
        fl.setContentsMargins(20, 14, 20, 14)

        self._status_label = QLabel("")
        self._status_label.setStyleSheet(f"color: {SUCCESS}; font-size: 11px;")
        fl.addWidget(self._status_label, 1)

        btn_cancel = QPushButton("Cancelar")
        btn_cancel.setCursor(Qt.PointingHandCursor)
        btn_cancel.setStyleSheet(f"""
            QPushButton {{
                background: rgba(255,255,255,0.06);
                color: {TEXT_MUTED};
                border: 1px solid {BORDER};
                border-radius: 10px;
                padding: 9px 20px;
                font-size: 13px;
            }}
            QPushButton:hover {{ color: {TEXT_PRIMARY}; }}
        """)
        btn_cancel.clicked.connect(self.reject)

        btn_save = QPushButton("  Salvar  ")
        btn_save.setCursor(Qt.PointingHandCursor)
        btn_save.setStyleSheet(f"""
            QPushButton {{
                background: qlineargradient(x1:0,y1:0,x2:1,y2:0,
                    stop:0 {ACCENT}, stop:1 #0099BB);
                color: #000;
                border: none;
                border-radius: 10px;
                padding: 9px 28px;
                font-size: 13px;
                font-weight: 700;
            }}
            QPushButton:hover {{ background: {ACCENT}; }}
        """)
        btn_save.clicked.connect(self._on_save)

        fl.addWidget(btn_cancel)
        fl.addSpacing(8)
        fl.addWidget(btn_save)
        return footer

    # ── Lista de Apps ────────────────────────────────────────

    def _refresh_apps_list(self):
        # Limpar cards existentes
        while self._apps_layout.count() > 1:
            item = self._apps_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        for i, item_data in enumerate(self._items):
            card = AppItemCard(i, item_data, self._icons_dir)
            card.edit_requested.connect(self._edit_app)
            card.remove_requested.connect(self._remove_app)
            self._apps_layout.insertWidget(i, card)

        count = len(self._items)
        self._count_label.setText(f"{count} app{'s' if count != 1 else ''}")

        # Sincronizar preview
        if self._preview:
            self._preview.set_items(self._items)

    def _on_preview_changed(self):
        """Chamado quando o preview edita diretamente um item."""
        self._refresh_apps_list()

    def _add_app(self):
        dlg = AppEditDialog(parent=self)
        if dlg.exec() == QDialog.Accepted:
            self._items.append(dlg.result_data())
            self._refresh_apps_list()

    def _edit_app(self, index: int):
        if 0 <= index < len(self._items):
            dlg = AppEditDialog(self._items[index], parent=self)
            if dlg.exec() == QDialog.Accepted:
                self._items[index] = dlg.result_data()
                self._refresh_apps_list()

    def _remove_app(self, index: int):
        if 0 <= index < len(self._items):
            name = self._items[index].get("label", "?")
            reply = QMessageBox.question(
                self, "Remover App",
                f"Remover \"{name}\" do menu?",
                QMessageBox.Yes | QMessageBox.No,
            )
            if reply == QMessageBox.Yes:
                self._items.pop(index)
                self._refresh_apps_list()

    # ── Cor de destaque ──────────────────────────────────────

    def _pick_color(self):
        current = self._settings.get("accent_color", ACCENT)
        color = QColorDialog.getColor(QColor(current), self, "Escolha a cor de destaque")
        if color.isValid():
            hex_color = color.name()
            self._settings["accent_color"] = hex_color
            self._color_label.setText(hex_color)
            self._color_preview.setStyleSheet(f"""
                background: {hex_color};
                border-radius: 8px;
                border: 1.5px solid rgba(255,255,255,0.1);
            """)

    # ── Autostart ────────────────────────────────────────────

    def _is_autostart_enabled(self) -> bool:
        return (STARTUP_FOLDER / STARTUP_LINK_NAME).exists()

    def _set_autostart(self, enabled: bool):
        """Cria ou remove o atalho de autostart na pasta Startup do Windows."""
        shortcut_path = STARTUP_FOLDER / STARTUP_LINK_NAME

        if enabled:
            # Usar PowerShell para criar o atalho .lnk
            script_dir = self._config_path.parent.parent
            vbs_path = script_dir / "run_hidden.vbs"
            ps_cmd = (
                f"$ws = New-Object -ComObject WScript.Shell; "
                f"$sc = $ws.CreateShortcut('{shortcut_path}'); "
                f"$sc.TargetPath = '{vbs_path}'; "
                f"$sc.WorkingDirectory = '{script_dir}'; "
                f"$sc.Save()"
            )
            os.system(f'powershell -NoProfile -ExecutionPolicy Bypass -Command "{ps_cmd}"')
        else:
            if shortcut_path.exists():
                shortcut_path.unlink()

    # ── Salvar ───────────────────────────────────────────────

    def _on_save(self):
        # Atualizar settings com hotkey
        self._settings["hotkey"] = self._hotkey_capture.combo
        self._settings["autostart"] = self._autostart_check.isChecked()

        # Aplicar autostart
        self._set_autostart(self._autostart_check.isChecked())

        # Montar config final
        config = dict(self._config)
        config["menu"] = {"label": "Root", "items": self._items}
        config["settings"] = self._settings

        # Salvar JSON
        with open(self._config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        self._status_label.setText("✓ Salvo com sucesso!")
        QTimer.singleShot(2500, lambda: self._status_label.setText(""))

        self.settings_saved.emit()
        print("[settings] Configurações salvas.")
