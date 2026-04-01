"""
side_panel.py — Painel lateral de sub-menu ancorado ao setor clicado.

Um popup glassmorphism que nasce nas coordenadas do setor do menu radial,
com animação de slide, borda neon Cyan→Pink e auto-limpeza.
"""

import math
from pathlib import Path

from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QApplication, QGraphicsOpacityEffect,
)
from PySide6.QtGui import (
    QPainter, QPainterPath, QColor, QPen, QBrush, QFont,
    QLinearGradient, QCursor, QIcon,
)
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtCore import (
    Qt, QPoint, QPointF, QRectF, Signal, QSize,
    QPropertyAnimation, QEasingCurve, QRect, Property,
    QVariantAnimation, QParallelAnimationGroup,
)

from .menu_item import MenuItem


class SidePanelItem(QWidget):
    """Um item clicável dentro do SidePanel."""

    clicked = Signal(object)  # Emite o MenuItem

    def __init__(self, item: MenuItem, icons_dir: Path, accent: QColor,
                 secondary: QColor, parent=None):
        super().__init__(parent)
        self._item = item
        self._icons_dir = icons_dir
        self._accent = accent
        self._secondary = secondary
        self._hovered = False
        self._svg_cache: dict[str, QSvgRenderer] = {}

        self.setFixedHeight(42)
        self.setMinimumWidth(180)
        self.setCursor(Qt.PointingHandCursor)
        self.setMouseTracking(True)

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        w, h = self.width(), self.height()

        # ── Fundo ──
        if self._hovered:
            bg = QColor(255, 255, 255, 30)
        else:
            bg = QColor(0, 0, 0, 0)

        path = QPainterPath()
        path.addRoundedRect(QRectF(4, 2, w - 8, h - 4), 8, 8)
        painter.fillPath(path, QBrush(bg))

        # Borda sutil no hover
        if self._hovered:
            border_grad = QLinearGradient(0, 0, w, 0)
            border_grad.setColorAt(0, QColor(self._accent.red(), self._accent.green(),
                                              self._accent.blue(), 120))
            border_grad.setColorAt(1, QColor(self._secondary.red(), self._secondary.green(),
                                              self._secondary.blue(), 120))
            painter.setPen(QPen(QBrush(border_grad), 1.2))
            painter.drawPath(path)

        # ── Ícone SVG ──
        icon_x = 16
        icon_y = (h - 20) / 2
        renderer = self._get_svg_renderer(self._item.icon)
        if renderer:
            painter.save()
            painter.setOpacity(0.9 if self._hovered else 0.7)
            renderer.render(painter, QRectF(icon_x, icon_y, 20, 20))
            painter.restore()

        # ── Label ──
        font = QFont("Segoe UI", 10)
        font.setWeight(QFont.Medium if self._hovered else QFont.Normal)
        painter.setFont(font)
        color = QColor(255, 255, 255, 230 if self._hovered else 180)
        painter.setPen(color)
        text_rect = QRectF(icon_x + 28, 0, w - icon_x - 48, h)
        painter.drawText(text_rect, Qt.AlignVCenter | Qt.AlignLeft, self._item.label)

        # ── Indicador de sub-menu ──
        if self._item.has_children:
            chevron = self._get_svg_renderer("chevron-right")
            if chevron:
                painter.save()
                painter.setOpacity(0.5)
                chevron.render(painter, QRectF(w - 28, (h - 14) / 2, 14, 14))
                painter.restore()

        painter.end()

    def _get_svg_renderer(self, icon_name: str) -> QSvgRenderer | None:
        if not icon_name:
            return None
        if icon_name in self._svg_cache:
            return self._svg_cache[icon_name]

        clean = icon_name.replace(".svg", "")
        svg_path = self._icons_dir / f"{clean}.svg"
        if svg_path.exists():
            content = svg_path.read_text(encoding="utf-8")
            content = content.replace('stroke="currentColor"', 'stroke="white"')
            content = content.replace('fill="currentColor"', 'fill="white"')
            renderer = QSvgRenderer(content.encode("utf-8"))
            if renderer.isValid():
                self._svg_cache[icon_name] = renderer
                return renderer
        return None

    def enterEvent(self, event):
        self._hovered = True
        self.update()

    def leaveEvent(self, event):
        self._hovered = False
        self.update()

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.clicked.emit(self._item)


class SidePanel(QWidget):
    """Painel lateral glassmorphism ancorado ao setor do menu radial."""

    action_triggered = Signal(str, str, str)  # action, target, label
    panel_closed = Signal()

    # Geometria do painel
    PANEL_WIDTH = 220
    ITEM_HEIGHT = 42
    HEADER_HEIGHT = 44
    BORDER_RADIUS = 14
    PANEL_GAP = 18  # Distância entre anel externo e painel

    def __init__(
        self,
        items: list[MenuItem],
        title: str,
        slice_index: int,
        slice_count: int,
        menu_center: QPoint,
        outer_radius: int,
        icons_dir: str,
        accent_color: str = "#00DCFF",
        secondary_color: str = "#FF007A",
        parent=None,
    ):
        super().__init__(parent)

        self._items = items
        self._title = title
        self._icons_dir = Path(icons_dir) if icons_dir else Path()
        self._accent = QColor(accent_color)
        self._secondary = QColor(secondary_color)
        self._nav_stack: list[tuple[str, list[MenuItem]]] = []  # Para navegação interna

        # ── Window flags ──
        self.setWindowFlags(
            Qt.FramelessWindowHint
            | Qt.WindowStaysOnTopHint
            | Qt.Tool
            | Qt.NoDropShadowWindowHint
        )
        self.setAttribute(Qt.WA_TranslucentBackground)

        # ── Calcular posição âncora ──
        self._menu_center = menu_center
        self._slice_angle = -math.pi / 2 + (2 * math.pi / slice_count) * slice_index
        self._outer_radius = outer_radius

        # ── Build UI ──
        self._main_layout = QVBoxLayout(self)
        self._main_layout.setContentsMargins(12, 8, 12, 12)
        self._main_layout.setSpacing(2)

        self._build_header(title)
        self._build_items(items)

        # ── Tamanho ──
        panel_h = self.HEADER_HEIGHT + len(items) * self.ITEM_HEIGHT + 24
        self.setFixedSize(self.PANEL_WIDTH, panel_h)

        # ── Posicionar ──
        self._final_pos = self._compute_anchor_position()
        self._origin_pos = menu_center  # Animação parte do centro do menu

        # ── Animação ──
        self._slide_anim = None

    # ═══════════════════════════════════════════════════════
    #  BUILD UI
    # ═══════════════════════════════════════════════════════

    def _build_header(self, title: str):
        """Constrói o cabeçalho com título e botão fechar."""
        header = QWidget(self)
        header.setFixedHeight(self.HEADER_HEIGHT)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(8, 4, 4, 4)

        # Título
        lbl = QLabel(title)
        lbl.setFont(QFont("Segoe UI", 11, QFont.DemiBold))
        lbl.setStyleSheet("color: rgba(255,255,255,200); background: transparent;")
        header_layout.addWidget(lbl)

        header_layout.addStretch()

        # Botão fechar (×)
        close_btn = QPushButton("✕")
        close_btn.setFixedSize(28, 28)
        close_btn.setCursor(Qt.PointingHandCursor)
        close_btn.setStyleSheet("""
            QPushButton {
                background: transparent;
                color: rgba(255,255,255,150);
                font-size: 14px;
                border: none;
                border-radius: 14px;
            }
            QPushButton:hover {
                background: rgba(255,80,80,80);
                color: white;
            }
        """)
        close_btn.clicked.connect(self._on_close)
        header_layout.addWidget(close_btn)

        self._main_layout.addWidget(header)

    def _build_items(self, items: list[MenuItem]):
        """Constrói a lista de itens."""
        # Remover itens antigos (para navegação interna)
        self._clear_items()

        for item in items:
            item_widget = SidePanelItem(
                item, self._icons_dir, self._accent, self._secondary, self
            )
            item_widget.clicked.connect(self._on_item_clicked)
            self._main_layout.addWidget(item_widget)

        self._main_layout.addStretch()

    def _clear_items(self):
        """Remove os widgets de itens (preserva o cabeçalho)."""
        while self._main_layout.count() > 1:
            child = self._main_layout.takeAt(1)
            if child.widget():
                child.widget().deleteLater()

    # ═══════════════════════════════════════════════════════
    #  POSICIONAMENTO
    # ═══════════════════════════════════════════════════════

    def _compute_anchor_position(self) -> QPoint:
        """Calcula a posição do painel baseada no ângulo do setor clicado."""
        angle = self._slice_angle
        gap = self._outer_radius + self.PANEL_GAP

        # Ponto de ancoragem na borda do menu
        anchor_x = self._menu_center.x() + int(gap * math.cos(angle))
        anchor_y = self._menu_center.y() + int(gap * math.sin(angle))

        # Ajustar posição do painel baseado no quadrante
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)

        # Determinar deslocamento baseado na direção
        if cos_a >= 0:
            # Direita: painel alinha pela borda esquerda
            panel_x = anchor_x
        else:
            # Esquerda: painel alinha pela borda direita
            panel_x = anchor_x - self.PANEL_WIDTH

        if sin_a >= 0:
            # Embaixo: alinhar pelo topo
            panel_y = anchor_y
        else:
            # Acima: alinhar pela base
            panel_y = anchor_y - self.height()

        # Centralizar verticalmente se o ângulo for quase horizontal
        if abs(sin_a) < 0.3:
            panel_y = anchor_y - self.height() // 2
        # Centralizar horizontalmente se o ângulo for quase vertical
        if abs(cos_a) < 0.3:
            panel_x = anchor_x - self.PANEL_WIDTH // 2

        # Clampar à tela
        screen = QApplication.screenAt(self._menu_center) or QApplication.primaryScreen()
        geo = screen.availableGeometry()
        panel_x = max(geo.left() + 5, min(panel_x, geo.right() - self.PANEL_WIDTH - 5))
        panel_y = max(geo.top() + 5, min(panel_y, geo.bottom() - self.height() - 5))

        return QPoint(panel_x, panel_y)

    # ═══════════════════════════════════════════════════════
    #  ANIMAÇÕES
    # ═══════════════════════════════════════════════════════

    def show_animated(self):
        """Mostra com animação de slide a partir do centro do menu."""
        self.move(self._origin_pos)
        self.show()
        self.raise_()

        self._slide_anim = QVariantAnimation(self)
        self._slide_anim.setStartValue(0.0)
        self._slide_anim.setEndValue(1.0)
        self._slide_anim.setDuration(280)
        self._slide_anim.setEasingCurve(QEasingCurve.OutCubic)
        self._slide_anim.valueChanged.connect(self._on_slide_value)
        self._slide_anim.start()

    def close_animated(self, callback=None):
        """Fecha com animação reversa."""
        anim = QVariantAnimation(self)
        anim.setStartValue(1.0)
        anim.setEndValue(0.0)
        anim.setDuration(150)
        anim.setEasingCurve(QEasingCurve.InQuad)
        anim.valueChanged.connect(self._on_slide_value)

        def on_done():
            self.hide()
            self.deleteLater()
            if callback:
                callback()

        anim.finished.connect(on_done)
        anim.start()
        self._slide_anim = anim

    def _on_slide_value(self, t: float):
        """Interpola posição e opacidade durante a animação."""
        # Interpolar posição
        ox, oy = self._origin_pos.x(), self._origin_pos.y()
        fx, fy = self._final_pos.x(), self._final_pos.y()
        x = int(ox + (fx - ox) * t)
        y = int(oy + (fy - oy) * t)
        self.move(x, y)
        self.setWindowOpacity(t)

    # ═══════════════════════════════════════════════════════
    #  PINTURA
    # ═══════════════════════════════════════════════════════

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        w, h = self.width(), self.height()
        r = self.BORDER_RADIUS

        # ── Fundo glassmorphism ──
        bg_path = QPainterPath()
        bg_path.addRoundedRect(QRectF(0, 0, w, h), r, r)

        # Preenchimento escuro semi-transparente
        painter.fillPath(bg_path, QBrush(QColor(18, 20, 28, 220)))

        # ── Borda neon gradiente Cyan → Pink ──
        border_grad = QLinearGradient(0, 0, w, h)
        border_grad.setColorAt(0.0, QColor(self._accent.red(), self._accent.green(),
                                            self._accent.blue(), 180))
        border_grad.setColorAt(1.0, QColor(self._secondary.red(), self._secondary.green(),
                                            self._secondary.blue(), 180))
        painter.setPen(QPen(QBrush(border_grad), 1.8))
        painter.drawPath(bg_path)

        # ── Glow externo ──
        for i, alpha in enumerate([20, 10, 5]):
            glow_path = QPainterPath()
            offset = (i + 1) * 2
            glow_path.addRoundedRect(
                QRectF(-offset, -offset, w + offset * 2, h + offset * 2),
                r + offset, r + offset,
            )
            glow_grad = QLinearGradient(0, 0, w, h)
            glow_grad.setColorAt(0.0, QColor(self._accent.red(), self._accent.green(),
                                              self._accent.blue(), alpha))
            glow_grad.setColorAt(1.0, QColor(self._secondary.red(), self._secondary.green(),
                                              self._secondary.blue(), alpha))
            painter.setPen(QPen(QBrush(glow_grad), 2.0))
            painter.setBrush(Qt.NoBrush)
            painter.drawPath(glow_path)

        painter.end()

    # ═══════════════════════════════════════════════════════
    #  EVENTOS
    # ═══════════════════════════════════════════════════════

    def _on_item_clicked(self, item: MenuItem):
        """Trata clique em um item do painel."""
        if item.has_children:
            # Navegação interna: empilhar e substituir conteúdo
            self._nav_stack.append((self._title, self._items))
            self._items = item.children
            self._title = item.label

            # Atualizar cabeçalho
            header = self._main_layout.itemAt(0).widget()
            if header:
                lbl = header.findChild(QLabel)
                if lbl:
                    lbl.setText(f"← {item.label}")

            # Rebuild items
            self._build_items(item.children)

            # Resize
            panel_h = self.HEADER_HEIGHT + len(item.children) * self.ITEM_HEIGHT + 24
            self.setFixedHeight(panel_h)
        else:
            # Ação terminal
            if item.action:
                self.action_triggered.emit(item.action, item.target or "", item.label)

    def _on_close(self):
        """Botão fechar do cabeçalho: volta ou fecha."""
        if self._nav_stack:
            # Voltar ao nível anterior
            title, items = self._nav_stack.pop()
            self._items = items
            self._title = title

            header = self._main_layout.itemAt(0).widget()
            if header:
                lbl = header.findChild(QLabel)
                if lbl:
                    prefix = "← " if self._nav_stack else ""
                    lbl.setText(f"{prefix}{title}")

            self._build_items(items)
            panel_h = self.HEADER_HEIGHT + len(items) * self.ITEM_HEIGHT + 24
            self.setFixedHeight(panel_h)
        else:
            # Fechar o painel
            self.close_animated(lambda: self.panel_closed.emit())

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Escape:
            self._on_close()

    def focusOutEvent(self, event):
        # Não fechar ao perder foco (menu principal gerencia)
        super().focusOutEvent(event)
