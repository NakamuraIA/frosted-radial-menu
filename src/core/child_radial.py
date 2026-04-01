"""
child_radial.py — Menu radial filho (satélite).

Uma janela separada e independente que aparece ao lado do setor
clicado no menu pai. Possui estética idêntica (glassmorphism + LED glow)
mas com raio menor. Suporta navegação interna de sub-níveis.
"""

import math
from pathlib import Path

from PySide6.QtWidgets import QWidget, QApplication
from PySide6.QtGui import (
    QPainter, QPainterPath, QColor, QPen, QBrush, QFont,
    QRadialGradient, QConicalGradient,
)
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtCore import (
    Qt, QRectF, QPointF, QPoint, Signal, QTimer,
    QVariantAnimation, QEasingCurve,
)

from .menu_item import MenuItem


class ChildRadial(QWidget):
    """Menu radial filho — janela separada posicionada ao lado do pai."""

    action_triggered = Signal(str, str, str)  # action, target, label
    child_closed = Signal()

    # ── Layout ──
    INNER_RADIUS = 35
    OUTER_RADIUS = 110
    PADDING = 50
    ICON_SIZE = 20
    LABEL_FONT_SIZE = 8
    CENTER_ICON_SIZE = 16
    GAP_BETWEEN_SLICES = 2

    def __init__(
        self,
        items: list[MenuItem],
        title: str,
        slice_index: int,
        slice_count: int,
        parent_center: QPoint,
        parent_outer_radius: int,
        icons_dir: str,
        accent_color: str = "#00DCFF",
        secondary_color: str = "#FF007A",
        parent=None,
    ):
        super().__init__(parent)
        self.setMouseTracking(True)

        # ── Window flags ──
        self.setWindowFlags(
            Qt.FramelessWindowHint
            | Qt.WindowStaysOnTopHint
            | Qt.Tool
            | Qt.NoDropShadowWindowHint
        )
        self.setAttribute(Qt.WA_TranslucentBackground)

        # ── Dados ──
        self._items = items
        self._title = title
        self._nav_stack: list[tuple[str, list[MenuItem]]] = []

        # ── Cores ──
        self._accent = QColor(accent_color)
        self._secondary = QColor(secondary_color)

        # ── Geometria ──
        self._hovered_index: int = -1
        self._center_hovered: bool = False

        # ── Ícones SVG ──
        self._icons_dir = Path(icons_dir) if icons_dir else Path()
        self._svg_cache: dict[str, QSvgRenderer] = {}

        # ── LED Glow ──
        self._glow_angle: float = 0.0
        self._glow_timer = QTimer(self)
        self._glow_timer.setInterval(33)
        self._glow_timer.timeout.connect(self._tick_glow)

        # ── Dimensões ──
        size = self.OUTER_RADIUS * 2 + self.PADDING * 2
        self.setFixedSize(size, size)

        # ── Posição ──
        self._slice_angle = -math.pi / 2 + (2 * math.pi / slice_count) * slice_index
        self._parent_center = parent_center
        self._parent_outer_r = parent_outer_radius
        self._final_pos = self._compute_position()
        self._origin_pos = parent_center - QPoint(size // 2, size // 2)

        # ── Animação ──
        self._slide_anim = None
        self._anim_opacity = 0.0

    # ═══════════════════════════════════════════════════════
    #  POSICIONAMENTO
    # ═══════════════════════════════════════════════════════

    def _compute_position(self) -> QPoint:
        """Calcula posição do filho baseado no ângulo do setor pai."""
        angle = self._slice_angle
        gap = 20  # Espaço entre pai e filho
        offset = self._parent_outer_r + gap + self.OUTER_RADIUS

        # Centro do filho em coordenadas globais
        cx = self._parent_center.x() + int(offset * math.cos(angle))
        cy = self._parent_center.y() + int(offset * math.sin(angle))

        # Converter para posição de janela (canto superior esquerdo)
        half = (self.OUTER_RADIUS * 2 + self.PADDING * 2) // 2
        target = QPoint(cx - half, cy - half)

        # Clampar à tela
        screen = QApplication.screenAt(self._parent_center) or QApplication.primaryScreen()
        geo = screen.availableGeometry()
        target.setX(max(geo.left() + 5, min(target.x(), geo.right() - self.width() - 5)))
        target.setY(max(geo.top() + 5, min(target.y(), geo.bottom() - self.height() - 5)))

        return target

    def _center(self) -> QPointF:
        """Centro do widget."""
        return QPointF(self.width() / 2.0, self.height() / 2.0)

    # ═══════════════════════════════════════════════════════
    #  ANIMAÇÕES
    # ═══════════════════════════════════════════════════════

    def show_animated(self):
        """Mostra com animação de slide + fade."""
        self.move(self._origin_pos)
        self._anim_opacity = 0.0
        self.show()
        self.raise_()

        self._glow_timer.start()

        self._slide_anim = QVariantAnimation(self)
        self._slide_anim.setStartValue(0.0)
        self._slide_anim.setEndValue(1.0)
        self._slide_anim.setDuration(300)
        self._slide_anim.setEasingCurve(QEasingCurve.OutCubic)
        self._slide_anim.valueChanged.connect(self._on_slide_tick)
        self._slide_anim.start()

    def close_animated(self, callback=None):
        """Fecha com animação reversa."""
        self._glow_timer.stop()

        anim = QVariantAnimation(self)
        anim.setStartValue(1.0)
        anim.setEndValue(0.0)
        anim.setDuration(180)
        anim.setEasingCurve(QEasingCurve.InQuad)
        anim.valueChanged.connect(self._on_slide_tick)

        def on_done():
            self.hide()
            self.deleteLater()
            if callback:
                callback()

        anim.finished.connect(on_done)
        anim.start()
        self._slide_anim = anim

    def _on_slide_tick(self, t: float):
        """Interpola posição e opacidade."""
        ox, oy = self._origin_pos.x(), self._origin_pos.y()
        fx, fy = self._final_pos.x(), self._final_pos.y()
        x = int(ox + (fx - ox) * t)
        y = int(oy + (fy - oy) * t)
        self.move(x, y)
        self._anim_opacity = t
        self.update()

    def _tick_glow(self):
        self._glow_angle = (self._glow_angle + 2.0) % 360.0
        self.update()

    # ═══════════════════════════════════════════════════════
    #  PINTURA
    # ═══════════════════════════════════════════════════════

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setRenderHint(QPainter.SmoothPixmapTransform)
        painter.setOpacity(self._anim_opacity)

        center = self._center()
        inner_r = self.INNER_RADIUS
        outer_r = self.OUTER_RADIUS

        # 0. LED Glow
        self._paint_led_glow(painter, center, inner_r, outer_r)

        # 1. Fatias
        self._paint_slices(painter, center, inner_r, outer_r)

        # 2. Centro (Voltar / Fechar)
        self._paint_center(painter, center, inner_r)

        painter.end()

    def _paint_led_glow(self, painter, center, inner_r, outer_r):
        """LED Pulse Glow rotativo no anel externo e interno."""
        ac = self._accent
        sc = self._secondary
        angle = self._glow_angle

        # Anel externo
        for glow_r, width, intensity in [(outer_r + 10, 3.5, 0.3), (outer_r + 4, 2.5, 0.55), (outer_r + 1, 2.0, 0.8)]:
            grad = QConicalGradient(center, angle)
            grad.setColorAt(0.00, QColor(ac.red(), ac.green(), ac.blue(), int(200 * intensity)))
            grad.setColorAt(0.06, QColor(sc.red(), sc.green(), sc.blue(), int(160 * intensity)))
            grad.setColorAt(0.15, QColor(ac.red(), ac.green(), ac.blue(), int(40 * intensity)))
            grad.setColorAt(0.40, QColor(sc.red(), sc.green(), sc.blue(), int(8 * intensity)))
            grad.setColorAt(0.60, QColor(ac.red(), ac.green(), ac.blue(), int(8 * intensity)))
            grad.setColorAt(0.85, QColor(sc.red(), sc.green(), sc.blue(), int(40 * intensity)))
            grad.setColorAt(0.94, QColor(ac.red(), ac.green(), ac.blue(), int(160 * intensity)))
            grad.setColorAt(1.00, QColor(ac.red(), ac.green(), ac.blue(), int(200 * intensity)))

            painter.save()
            painter.setPen(QPen(QBrush(grad), width))
            painter.setBrush(Qt.NoBrush)
            painter.drawEllipse(center, glow_r, glow_r)
            painter.restore()

        # Anel interno
        inner_grad = QConicalGradient(center, angle + 180)
        inner_grad.setColorAt(0.00, QColor(sc.red(), sc.green(), sc.blue(), 60))
        inner_grad.setColorAt(0.10, QColor(ac.red(), ac.green(), ac.blue(), 35))
        inner_grad.setColorAt(0.50, QColor(sc.red(), sc.green(), sc.blue(), 5))
        inner_grad.setColorAt(0.90, QColor(ac.red(), ac.green(), ac.blue(), 35))
        inner_grad.setColorAt(1.00, QColor(sc.red(), sc.green(), sc.blue(), 60))

        painter.save()
        painter.setPen(QPen(QBrush(inner_grad), 1.8))
        painter.setBrush(Qt.NoBrush)
        painter.drawEllipse(center, inner_r + 1, inner_r + 1)
        painter.restore()

    def _paint_slices(self, painter, center, inner_r, outer_r):
        """Desenha as fatias do menu filho."""
        count = len(self._items)
        if count == 0:
            return

        for i in range(count):
            path = self._get_slice_path(center, i, count, inner_r, outer_r)
            is_hovered = (i == self._hovered_index)
            item = self._items[i]

            # Preenchimento
            if is_hovered:
                fill = QColor(255, 255, 255, 65)
            else:
                fill = QColor(30, 35, 45, 180)
            painter.setBrush(QBrush(fill))

            # Borda
            if is_hovered:
                border = QColor(self._accent)
                border.setAlpha(220)
                painter.setPen(QPen(border, 3.0))
            else:
                border = QColor(self._accent)
                border.setAlpha(120)
                painter.setPen(QPen(border, 2.0))

            painter.drawPath(path)

            # Ícone
            item_pos = self._get_item_pos(center, i, count)
            self._paint_icon(painter, item.icon, item_pos, is_hovered)

            # Label
            self._paint_label(painter, item.label, item_pos, is_hovered)

            # Indicador de sub-menu
            if item.has_children:
                self._paint_chevron(painter, center, i, count, outer_r)

    def _paint_center(self, painter, center, inner_r):
        """Desenha o botão central (Voltar / Fechar)."""
        gradient = QRadialGradient(center, inner_r)
        if self._center_hovered:
            gradient.setColorAt(0, QColor(self._accent.red(), self._accent.green(),
                                          self._accent.blue(), 60))
            gradient.setColorAt(1, QColor(self._accent.red(), self._accent.green(),
                                          self._accent.blue(), 20))
        else:
            gradient.setColorAt(0, QColor(15, 17, 25, 200))
            gradient.setColorAt(1, QColor(10, 12, 18, 220))

        painter.setBrush(QBrush(gradient))
        border = QColor(self._accent)
        border.setAlpha(60 if self._center_hovered else 30)
        painter.setPen(QPen(border, 0.8))
        painter.drawEllipse(center, inner_r, inner_r)

        # Ícone: ← (voltar) ou ✕ (fechar)
        if self._nav_stack:
            icon_name = "arrow-left"
        else:
            icon_name = "x"

        renderer = self._get_svg_renderer(icon_name)
        if renderer:
            s = self.CENTER_ICON_SIZE
            rect = QRectF(center.x() - s / 2, center.y() - s / 2, s, s)
            painter.save()
            painter.setOpacity(self._anim_opacity * (0.9 if self._center_hovered else 0.5))
            renderer.render(painter, rect)
            painter.restore()

    # ═══════════════════════════════════════════════════════
    #  GEOMETRIA
    # ═══════════════════════════════════════════════════════

    def _get_slice_path(self, center, index, count, inner_r, outer_r):
        """Cria o QPainterPath para uma fatia."""
        gap = self.GAP_BETWEEN_SLICES
        span = 360.0 / count - gap
        start_angle = 90 - (360.0 / count) * index - span / 2

        outer_rect = QRectF(
            center.x() - outer_r, center.y() - outer_r,
            outer_r * 2, outer_r * 2,
        )
        inner_rect = QRectF(
            center.x() - inner_r, center.y() - inner_r,
            inner_r * 2, inner_r * 2,
        )

        path = QPainterPath()
        path.arcMoveTo(outer_rect, start_angle)
        path.arcTo(outer_rect, start_angle, span)
        path.arcTo(inner_rect, start_angle + span, -span)
        path.closeSubpath()
        return path

    def _get_item_pos(self, center, index, count):
        """Posição do ícone/label para o item."""
        mid_angle = -math.pi / 2 + (2 * math.pi / count) * index
        mid_r = (self.INNER_RADIUS + self.OUTER_RADIUS) / 2.0
        return QPointF(
            center.x() + mid_r * math.cos(mid_angle),
            center.y() + mid_r * math.sin(mid_angle),
        )

    # ═══════════════════════════════════════════════════════
    #  PINTURA DE ITENS
    # ═══════════════════════════════════════════════════════

    def _paint_icon(self, painter, icon_name, pos, hovered):
        if not icon_name:
            return
        renderer = self._get_svg_renderer(icon_name)
        if renderer is None:
            return
        half = self.ICON_SIZE / 2.0
        rect = QRectF(pos.x() - half, pos.y() - half - 5, self.ICON_SIZE, self.ICON_SIZE)
        painter.save()
        painter.setOpacity(self._anim_opacity * (1.0 if hovered else 0.85))
        renderer.render(painter, rect)
        painter.restore()

    def _paint_label(self, painter, label, pos, hovered):
        if not label:
            return
        painter.save()
        font = QFont("Segoe UI", self.LABEL_FONT_SIZE)
        font.setWeight(QFont.Medium if hovered else QFont.Normal)
        painter.setFont(font)
        color = QColor(255, 255, 255, 240 if hovered else 180)
        painter.setPen(color)
        text_rect = QRectF(pos.x() - 35, pos.y() + self.ICON_SIZE / 2.0 - 3, 70, 16)
        painter.drawText(text_rect, Qt.AlignCenter, label)
        painter.restore()

    def _paint_chevron(self, painter, center, index, count, outer_r):
        angle_rad = -math.pi / 2 + (2 * math.pi / count) * index
        indicator_r = outer_r - 7
        pos = QPointF(
            center.x() + indicator_r * math.cos(angle_rad),
            center.y() + indicator_r * math.sin(angle_rad),
        )
        renderer = self._get_svg_renderer("chevron-right")
        if renderer:
            s = 10
            rect = QRectF(pos.x() - s / 2, pos.y() - s / 2, s, s)
            painter.save()
            painter.setOpacity(self._anim_opacity * 0.5)
            renderer.render(painter, rect)
            painter.restore()

    # ═══════════════════════════════════════════════════════
    #  EVENTOS DE MOUSE
    # ═══════════════════════════════════════════════════════

    def mouseMoveEvent(self, event):
        pos = event.position()
        center = self._center()
        inner_r = self.INNER_RADIUS
        outer_r = self.OUTER_RADIUS
        dist = math.hypot(pos.x() - center.x(), pos.y() - center.y())

        old_hover = self._hovered_index
        old_center = self._center_hovered

        self._center_hovered = dist < inner_r

        self._hovered_index = -1
        if inner_r < dist < outer_r:
            count = len(self._items)
            for i in range(count):
                path = self._get_slice_path(center, i, count, inner_r, outer_r)
                if path.contains(pos):
                    self._hovered_index = i
                    break

        if self._hovered_index >= 0 or self._center_hovered:
            self.setCursor(Qt.PointingHandCursor)
        else:
            self.setCursor(Qt.ArrowCursor)

        if old_hover != self._hovered_index or old_center != self._center_hovered:
            self.update()

    def mousePressEvent(self, event):
        if event.button() != Qt.LeftButton:
            return

        pos = event.position()
        center = self._center()
        inner_r = self.INNER_RADIUS
        outer_r = self.OUTER_RADIUS
        dist = math.hypot(pos.x() - center.x(), pos.y() - center.y())

        # Clique no centro → Voltar ou Fechar filho
        if dist < inner_r:
            if self._nav_stack:
                # Voltar ao nível anterior dentro do filho
                title, items = self._nav_stack.pop()
                self._items = items
                self._title = title
                self._hovered_index = -1
                self.update()
            else:
                # Fechar o filho
                self.close_animated(lambda: self.child_closed.emit())
            return

        # Clique em uma fatia
        if inner_r < dist < outer_r:
            count = len(self._items)
            for i in range(count):
                path = self._get_slice_path(center, i, count, inner_r, outer_r)
                if path.contains(pos):
                    item = self._items[i]
                    if item.has_children:
                        # Navegação interna: push e substituir
                        self._nav_stack.append((self._title, self._items))
                        self._items = item.children
                        self._title = item.label
                        self._hovered_index = -1
                        self.update()
                    else:
                        # Ação terminal
                        if item.action:
                            self.action_triggered.emit(
                                item.action, item.target or "", item.label
                            )
                    return

        # Clique fora → Fechar filho
        if dist > outer_r:
            self.close_animated(lambda: self.child_closed.emit())

    def leaveEvent(self, event):
        self._hovered_index = -1
        self._center_hovered = False
        self.setCursor(Qt.ArrowCursor)
        self.update()

    def keyPressEvent(self, event):
        if event.key() == Qt.Key_Escape:
            if self._nav_stack:
                title, items = self._nav_stack.pop()
                self._items = items
                self._title = title
                self._hovered_index = -1
                self.update()
            else:
                self.close_animated(lambda: self.child_closed.emit())

    # ═══════════════════════════════════════════════════════
    #  ÍCONES SVG
    # ═══════════════════════════════════════════════════════

    def _get_svg_renderer(self, icon_name: str) -> QSvgRenderer | None:
        if not icon_name:
            return None
        if icon_name in self._svg_cache:
            return self._svg_cache[icon_name]

        clean = icon_name.replace(".svg", "")
        svg_path = self._icons_dir / f"{clean}.svg"
        if not svg_path.exists():
            return None

        content = svg_path.read_text(encoding="utf-8")
        content = content.replace('stroke="currentColor"', 'stroke="white"')
        content = content.replace('fill="currentColor"', 'fill="white"')
        renderer = QSvgRenderer(content.encode("utf-8"))
        if renderer.isValid():
            self._svg_cache[icon_name] = renderer
            return renderer
        return None
