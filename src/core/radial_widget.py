"""
radial_widget.py — O coração visual do menu radial.

Renderiza as fatias circulares usando QPainter, gerencia hover,
cliques, anéis fantasma e todas as micro-animações.
"""

import math
import os
from datetime import datetime
from pathlib import Path

from PySide6.QtWidgets import QWidget, QToolTip
from PySide6.QtGui import (
    QPainter, QPainterPath, QColor, QPen, QBrush, QFont,
    QRadialGradient, QConicalGradient, QFontMetrics, QPixmap,
)
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtCore import (
    Qt, QRectF, QPointF, QPoint, Signal, QSize, QTimer,
    QVariantAnimation, QEasingCurve, QParallelAnimationGroup,
    QSequentialAnimationGroup, QPauseAnimation,
)

from .menu_item import MenuItem
from .icon_utils import get_app_icon


class RadialWidget(QWidget):
    """Widget que renderiza o menu radial com QPainter."""

    item_clicked = Signal(object)   # Emite o MenuItem clicado
    back_clicked = Signal()         # Clique no centro (voltar)
    close_requested = Signal()      # Clique fora do menu

    # ── Constantes de layout ───────────────────────────────
    PADDING = 20            # Espaço extra ao redor do anel (mínimo p/ animações)
    ICON_SIZE = 52          # Tamanho dos ícones SVG/PNG
    LABEL_FONT_SIZE = 9     # Tamanho da fonte dos labels
    GAP_BETWEEN_SLICES = 2  # Graus de gap entre fatias
    CENTER_ICON_SIZE = 20   # Ícone do botão central

    def __init__(
        self,
        inner_radius: int = 55,
        outer_radius: int = 155,
        accent_color: str = "#00DCFF",
        secondary_color: str = "#FF007A",
        icons_dir: str = "",
        parent=None,
    ):
        super().__init__(parent)
        self.setMouseTracking(True)
        # NÃO setar WA_TranslucentBackground aqui (só vale para top-level)
        # O fundo é limpo no paintEvent via CompositionMode_Source
        self.setAttribute(Qt.WA_NoSystemBackground)
        self.setAutoFillBackground(False)

        # ── Geometria ──
        self._inner_radius = inner_radius
        self._outer_radius = outer_radius
        self._base_inner = inner_radius
        self._base_outer = outer_radius

        # ── Cores ──
        self._accent = QColor(accent_color)
        self._accent_glow = QColor(accent_color)
        self._accent_glow.setAlpha(60)
        self._secondary = QColor(secondary_color)
        self._secondary_glow = QColor(secondary_color)
        self._secondary_glow.setAlpha(60)

        # ── Estado ──
        self._items: list[MenuItem] = []
        self._ghost_levels: list[list[MenuItem]] = []
        self._depth: int = 1
        self._hovered_index: int = -1
        self._center_hovered: bool = False

        # ── Animação ──
        self._anim_radius_factor: float = 1.0   # 0→1 durante pop-in
        self._anim_opacity: float = 1.0          # 0→1 durante fade-in
        self._anim_ghost_opacity: float = 0.3    # Opacidade do anel fantasma
        self._anim_group = None
        self._is_animating = False

        # ── Monitoramento (Nível 2) ──
        self._cpu_percent: float = 0.0
        self._clock_text: str = "--:--"
        self._date_text: str = ""

        # ── LED Pulse Glow ──
        self._glow_angle: float = 0.0
        self._glow_timer = QTimer(self)
        self._glow_timer.setInterval(33)  # ~30fps
        self._glow_timer.timeout.connect(self._tick_glow)

        # ── Ícones SVG ──
        self._icons_dir = Path(icons_dir) if icons_dir else Path()
        self._svg_cache: dict[str, QSvgRenderer] = {}
        self._pixmap_cache: dict[str, QPixmap] = {}
        self._load_back_icon()

        # ── Dimensões ──
        size = self._outer_radius * 2 + self.PADDING * 2
        self.setFixedSize(size, size)

    # ═══════════════════════════════════════════════════════
    #  API PÚBLICA
    # ═══════════════════════════════════════════════════════

    def set_items(self, items: list[MenuItem], ghost_levels: list[list[MenuItem]], depth: int):
        """Define os itens atuais e inicia a animação de transição."""
        self._items = items
        self._ghost_levels = ghost_levels
        self._depth = depth
        self._hovered_index = -1
        self.update()

    def update_monitoring(self, cpu: float, clock: str, date: str):
        """Atualiza dados de monitoramento em tempo real."""
        self._cpu_percent = cpu
        self._clock_text = clock
        self._date_text = date
        self.update()

    def start_glow(self):
        """Inicia a animação LED Pulse Glow."""
        if not self._glow_timer.isActive():
            self._glow_timer.start()

    def stop_glow(self):
        """Para a animação LED Pulse Glow."""
        self._glow_timer.stop()

    def _tick_glow(self):
        """Avança o ângulo do glow e repinta."""
        self._glow_angle = (self._glow_angle + 1.5) % 360.0
        self.update()

    def animate_pop_in(self):
        """Animação de abertura: fatias explodem do centro com efeito elástico."""
        self._is_animating = True
        self._anim_radius_factor = 0.0
        self._anim_opacity = 0.0

        group = QParallelAnimationGroup(self)

        # Raio: 0 → 1 com OutElastic
        radius_anim = QVariantAnimation(self)
        radius_anim.setStartValue(0.0)
        radius_anim.setEndValue(1.0)
        radius_anim.setDuration(600)
        easing = QEasingCurve(QEasingCurve.OutElastic)
        easing.setAmplitude(0.6)
        easing.setPeriod(0.45)
        radius_anim.setEasingCurve(easing)
        radius_anim.valueChanged.connect(self._on_radius_anim)
        group.addAnimation(radius_anim)

        # Opacidade: 0 → 1 com OutQuad
        opacity_anim = QVariantAnimation(self)
        opacity_anim.setStartValue(0.0)
        opacity_anim.setEndValue(1.0)
        opacity_anim.setDuration(300)
        opacity_anim.setEasingCurve(QEasingCurve.OutQuad)
        opacity_anim.valueChanged.connect(self._on_opacity_anim)
        group.addAnimation(opacity_anim)

        group.finished.connect(self._on_anim_finished)
        self._anim_group = group
        group.start()

    def animate_pop_out(self, callback=None):
        """Animação de fechamento: encolhe para o centro."""
        self._is_animating = True

        group = QParallelAnimationGroup(self)

        # Raio: 1 → 0 com InBack
        radius_anim = QVariantAnimation(self)
        radius_anim.setStartValue(1.0)
        radius_anim.setEndValue(0.0)
        radius_anim.setDuration(250)
        radius_anim.setEasingCurve(QEasingCurve.InBack)
        radius_anim.valueChanged.connect(self._on_radius_anim)
        group.addAnimation(radius_anim)

        # Opacidade: 1 → 0
        opacity_anim = QVariantAnimation(self)
        opacity_anim.setStartValue(1.0)
        opacity_anim.setEndValue(0.0)
        opacity_anim.setDuration(200)
        opacity_anim.setEasingCurve(QEasingCurve.InQuad)
        opacity_anim.valueChanged.connect(self._on_opacity_anim)
        group.addAnimation(opacity_anim)

        if callback:
            group.finished.connect(callback)
        group.finished.connect(self._on_anim_finished)
        self._anim_group = group
        group.start()

    def animate_transition(self, direction: str = "forward"):
        """Animação de transição entre níveis."""
        self._is_animating = True
        self._anim_radius_factor = 0.0

        anim = QVariantAnimation(self)
        anim.setStartValue(0.0)
        anim.setEndValue(1.0)
        anim.setDuration(350)

        if direction == "forward":
            easing = QEasingCurve(QEasingCurve.OutCubic)
        else:
            easing = QEasingCurve(QEasingCurve.OutBack)

        anim.setEasingCurve(easing)
        anim.valueChanged.connect(self._on_radius_anim)
        anim.finished.connect(self._on_anim_finished)
        self._anim_group = anim
        anim.start()

    def set_theme(
        self,
        accent_color: str,
        secondary_color: str | None = None,
        ghost_opacity: float | None = None,
    ):
        """Atualiza as cores principais e opcoes visuais do radial."""
        self._accent = QColor(accent_color)
        self._accent_glow = QColor(accent_color)
        self._accent_glow.setAlpha(60)

        if secondary_color is not None:
            self._secondary = QColor(secondary_color)
            self._secondary_glow = QColor(secondary_color)
            self._secondary_glow.setAlpha(60)

        if ghost_opacity is not None:
            self._anim_ghost_opacity = max(0.0, min(1.0, float(ghost_opacity)))

        self.update()

    # ═══════════════════════════════════════════════════════
    #  GEOMETRIA
    # ═══════════════════════════════════════════════════════

    def _center(self) -> QPointF:
        return QPointF(self.width() / 2.0, self.height() / 2.0)

    def _animated_radii(self) -> tuple[float, float]:
        """Retorna os raios internos/externos ajustados pela animação."""
        f = self._anim_radius_factor
        return self._base_inner * f, self._base_outer * f

    def _get_slice_path(
        self, index: int, count: int, inner_r: float, outer_r: float
    ) -> QPainterPath:
        """Constrói o QPainterPath para uma fatia do menu."""
        if count == 0 or inner_r <= 0 or outer_r <= 0:
            return QPainterPath()

        span = 360.0 / count
        gap = self.GAP_BETWEEN_SLICES / 2.0
        effective_span = span - self.GAP_BETWEEN_SLICES

        # Item 0 no topo (90° em Qt), sentido horário
        center_angle = 90.0 - span * index
        start_angle = center_angle + effective_span / 2.0

        center = self._center()
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
        path.arcTo(outer_rect, start_angle, -effective_span)
        path.arcTo(inner_rect, start_angle - effective_span, effective_span)
        path.closeSubpath()

        return path

    def _get_item_pos(self, index: int, count: int, radius: float = 0) -> QPointF:
        """Posição central de um item (para ícone e label)."""
        if radius == 0:
            inner_r, outer_r = self._animated_radii()
            radius = (inner_r + outer_r) / 2.0

        angle_rad = -math.pi / 2 + (2 * math.pi / count) * index
        center = self._center()
        return QPointF(
            center.x() + radius * math.cos(angle_rad),
            center.y() + radius * math.sin(angle_rad),
        )

    # ═══════════════════════════════════════════════════════
    #  PINTURA
    # ═══════════════════════════════════════════════════════

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        painter.setRenderHint(QPainter.SmoothPixmapTransform)

        # Limpa ESTA área do widget para alpha=0 antes de qualquer desenho.
        # Necessário porque Qt pode preencher o background do child widget com
        # a cor da palette DEPOIS do paintEvent do pai e ANTES deste paintEvent.
        # CompositionMode_Source escreve diretamente no backing store com alpha 0.
        painter.setCompositionMode(QPainter.CompositionMode_Source)
        painter.fillRect(self.rect(), Qt.transparent)
        painter.setCompositionMode(QPainter.CompositionMode_SourceOver)

        painter.setOpacity(self._anim_opacity)

        inner_r, outer_r = self._animated_radii()

        # 0. LED Pulse Glow (animação contínua)
        if outer_r > 0:
            self._paint_led_glow(painter, inner_r, outer_r)

        # 1. Desenhar anéis fantasma (níveis anteriores)
        self._paint_ghost_rings(painter, inner_r, outer_r)

        # 2. Desenhar fatias ativas
        self._paint_active_slices(painter, inner_r, outer_r)

        # 3. Desenhar dashboard central
        self._paint_center_button(painter, inner_r)

        painter.end()

    def _paint_led_glow(self, painter: QPainter, inner_r: float, outer_r: float):
        """LED Pulse Glow — fita de luz rotativa Cyan→Pink nas bordas."""
        center = self._center()
        angle = self._glow_angle

        ac = self._accent
        sc = self._secondary

        # ── Anel externo: 3 camadas de glow (difuso → concentrado) ──
        layers = [
            (outer_r + 12, 4.0, 0.25),  # Difuso externo
            (outer_r + 5,  3.0, 0.45),  # Médio
            (outer_r + 1,  2.5, 0.70),  # Concentrado
        ]
        for glow_r, width, intensity in layers:
            grad = QConicalGradient(center, angle)
            # Ponto brilhante que "viaja" pelo anel
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

        # ── Anel interno: glow mais sutil ──
        inner_grad = QConicalGradient(center, angle + 180)  # Rotaciona oposto
        inner_grad.setColorAt(0.00, QColor(sc.red(), sc.green(), sc.blue(), 80))
        inner_grad.setColorAt(0.08, QColor(ac.red(), ac.green(), ac.blue(), 50))
        inner_grad.setColorAt(0.20, QColor(sc.red(), sc.green(), sc.blue(), 10))
        inner_grad.setColorAt(0.50, QColor(ac.red(), ac.green(), ac.blue(), 5))
        inner_grad.setColorAt(0.80, QColor(sc.red(), sc.green(), sc.blue(), 10))
        inner_grad.setColorAt(0.92, QColor(ac.red(), ac.green(), ac.blue(), 50))
        inner_grad.setColorAt(1.00, QColor(sc.red(), sc.green(), sc.blue(), 80))

        painter.save()
        painter.setPen(QPen(QBrush(inner_grad), 2.0))
        painter.setBrush(Qt.NoBrush)
        painter.drawEllipse(center, inner_r + 1, inner_r + 1)
        painter.restore()

    def _paint_ghost_rings(self, painter: QPainter, inner_r: float, outer_r: float):
        """Desenha os anéis fantasma (apenas para transições internas)."""
        if not self._ghost_levels:
            return

        painter.save()
        painter.setOpacity(self._anim_opacity * self._anim_ghost_opacity)

        for level_idx, ghost_items in enumerate(self._ghost_levels):
            count = len(ghost_items)
            if count == 0:
                continue

            for i in range(count):
                path = self._get_slice_path(i, count, inner_r, outer_r)
                ghost_fill = QColor(255, 255, 255, 12)
                painter.setBrush(QBrush(ghost_fill))
                ghost_border = QColor(self._accent)
                ghost_border.setAlpha(38)
                painter.setPen(QPen(ghost_border, 0.8))
                painter.drawPath(path)

        painter.restore()

    def _paint_active_slices(self, painter: QPainter, inner_r: float, outer_r: float):
        """Desenha as fatias do nível atual."""
        count = len(self._items)
        if count == 0:
            return

        for i in range(count):
            path = self._get_slice_path(i, count, inner_r, outer_r)
            is_hovered = (i == self._hovered_index)
            item = self._items[i]

            # ── Preenchimento ──
            if is_hovered:
                fill = QColor(255, 255, 255, 65)
            else:
                fill = QColor(30, 35, 45, 180)
            painter.setBrush(QBrush(fill))

            # ── Borda (mais grossa para efeito LED) ──
            if is_hovered:
                border_color = QColor(self._accent)
                border_color.setAlpha(220)
                pen_width = 3.0
            else:
                border_color = QColor(self._accent)
                border_color.setAlpha(120)
                pen_width = 2.0
            painter.setPen(QPen(border_color, pen_width))

            painter.drawPath(path)

            # ── Ícone ──
            item_pos = self._get_item_pos(i, count)
            self._paint_icon(
                painter, item.icon, item_pos, is_hovered,
                custom_icon=item.custom_icon,
                action=item.action,
                target=item.target,
                icon_mode=item.icon_mode,
                icon_scale=item.icon_scale,
            )

            # ── Label ──
            self._paint_label(
                painter, item.label, item_pos, is_hovered,
                icon_scale=item.icon_scale,
            )

            # ── Indicador de sub-menu ──
            if item.has_children:
                self._paint_submenu_indicator(painter, i, count, outer_r)

    def _paint_icon(
        self, painter: QPainter, icon_name: str, pos: QPointF,
        hovered: bool, custom_icon: str = "",
        action: str = "", target: str = "",
        icon_mode: str = "auto", icon_scale: float = 1.0
    ):
        """Hierarquia conforme icon_mode:
          auto   → auto-extract → fallback SVG
          custom → imagem do usuário → fallback SVG
          svg    → apenas SVG Lucide
        icon_scale é um multiplicador sobre ICON_SIZE (1.0 = 100%).
        """
        actual_sz = max(8, int(self.ICON_SIZE * icon_scale))
        half = actual_sz / 2.0
        y_offset = -(half + 5)
        icon_rect = QRectF(
            pos.x() - half,
            pos.y() + y_offset,
            actual_sz,
            actual_sz,
        )

        painter.save()
        painter.setOpacity(self._anim_opacity * (1.0 if hovered else 0.85))

        def _draw_pm(pm: QPixmap) -> bool:
            if pm and not pm.isNull():
                sc = pm.scaled(actual_sz, actual_sz,
                               Qt.KeepAspectRatio, Qt.SmoothTransformation)
                painter.drawPixmap(int(icon_rect.x()), int(icon_rect.y()), sc)
                return True
            return False

        def _draw_svg() -> bool:
            if icon_name:
                r = self._get_svg_renderer(icon_name)
                if r:
                    r.render(painter, icon_rect)
                    return True
            return False

        if icon_mode == "svg":
            _draw_svg()
        elif icon_mode == "custom":
            if not _draw_pm(self._get_pixmap(custom_icon)):
                _draw_svg()
        else:  # "auto"
            if custom_icon and _draw_pm(self._get_pixmap(custom_icon)):
                pass
            elif action and target and _draw_pm(
                get_app_icon(action, target, size=256)
            ):
                pass
            else:
                _draw_svg()

        painter.restore()

    def _paint_label(
        self, painter: QPainter, label: str, pos: QPointF,
        hovered: bool, icon_scale: float = 1.0
    ):
        """Desenha o label abaixo do ícone.
        A fonte e a posição Y acompanham o icon_scale.
        """
        if not label:
            return

        # Tamanho do ícone real (mesma lógica do _paint_icon)
        actual_sz  = max(8, int(self.ICON_SIZE * icon_scale))
        half_icon  = actual_sz / 2.0
        y_icon_top = -(half_icon + 5)          # topo do ícone relativo a pos.y
        icon_bottom_y = pos.y() + y_icon_top + actual_sz   # borda inferior do ícone

        # Fonte proporcional: escala suavizada para não ficar muito pequena
        font_size = max(6, min(int(self.LABEL_FONT_SIZE * icon_scale), 12))
        font = QFont("Segoe UI", font_size)
        font.setWeight(QFont.DemiBold if hovered else QFont.Medium)

        # Largura do texto acompanha a escala (mínimo 40 px)
        half_w = max(20, int(42 * icon_scale))

        painter.save()
        painter.setFont(font)
        painter.setPen(
            QColor(255, 255, 255, 240 if hovered else 180)
        )

        text_rect = QRectF(
            pos.x() - half_w,
            icon_bottom_y + 2,    # 2 px abaixo da borda do ícone
            half_w * 2,
            max(12, font_size + 4),
        )
        painter.drawText(text_rect, Qt.AlignCenter, label)
        painter.restore()

    def _paint_submenu_indicator(
        self, painter: QPainter, index: int, count: int, outer_r: float
    ):
        """Desenha um pequeno chevron na borda externa para indicar sub-menu."""
        angle_rad = -math.pi / 2 + (2 * math.pi / count) * index
        center = self._center()

        # Posição na borda externa
        indicator_r = outer_r - 8
        pos = QPointF(
            center.x() + indicator_r * math.cos(angle_rad),
            center.y() + indicator_r * math.sin(angle_rad),
        )

        renderer = self._get_svg_renderer("chevron-right")
        if renderer:
            s = 12
            rect = QRectF(pos.x() - s / 2, pos.y() - s / 2, s, s)
            painter.save()
            painter.setOpacity(self._anim_opacity * 0.6)
            renderer.render(painter, rect)
            painter.restore()

    def _paint_center_button(self, painter: QPainter, inner_r: float):
        """Desenha o dashboard central (Relógio + CPU) — passivo."""
        center = self._center()

        # ── Fundo escuro ──
        gradient = QRadialGradient(center, inner_r)
        gradient.setColorAt(0, QColor(15, 17, 25, 200))
        gradient.setColorAt(1, QColor(10, 12, 18, 220))
        painter.setBrush(QBrush(gradient))

        border = QColor(self._accent)
        border.setAlpha(40)
        painter.setPen(QPen(border, 0.8))
        painter.drawEllipse(center, inner_r, inner_r)

        # ── Arco de CPU ──
        if inner_r > 10:
            cpu_arc_r = inner_r - 4
            arc_rect = QRectF(
                center.x() - cpu_arc_r, center.y() - cpu_arc_r,
                cpu_arc_r * 2, cpu_arc_r * 2,
            )

            # Fundo do arco (trilha cinza)
            painter.save()
            track_color = QColor(255, 255, 255, 15)
            painter.setPen(QPen(track_color, 3.5, Qt.SolidLine, Qt.RoundCap))
            painter.setBrush(Qt.NoBrush)
            painter.drawEllipse(center, cpu_arc_r, cpu_arc_r)
            painter.restore()

            # Arco de progresso (Cyan → Pink)
            cpu_span = int(self._cpu_percent * 360 / 100)
            if cpu_span > 0:
                painter.save()
                # Gradiente cônico para o arco
                arc_grad = QConicalGradient(center, 90)
                arc_grad.setColorAt(0.0, self._accent)
                arc_grad.setColorAt(0.5, self._secondary)
                arc_grad.setColorAt(1.0, self._accent)
                painter.setPen(QPen(QBrush(arc_grad), 3.5, Qt.SolidLine, Qt.RoundCap))
                painter.setBrush(Qt.NoBrush)
                # drawArc usa 1/16 de grau, começa do topo (90°), sentido anti-horário
                painter.drawArc(arc_rect, 90 * 16, -cpu_span * 16)
                painter.restore()

        # ── Relógio HH:MM ──
        if inner_r > 20:
            painter.save()
            clock_font = QFont("Segoe UI", 14, QFont.DemiBold)
            painter.setFont(clock_font)
            painter.setPen(QColor(255, 255, 255, 220))
            clock_rect = QRectF(center.x() - 50, center.y() - 16, 100, 22)
            painter.drawText(clock_rect, Qt.AlignCenter, self._clock_text)
            painter.restore()

            # ── Data ──
            painter.save()
            date_font = QFont("Segoe UI", 7)
            painter.setFont(date_font)
            painter.setPen(QColor(255, 255, 255, 100))
            date_rect = QRectF(center.x() - 50, center.y() + 5, 100, 14)
            painter.drawText(date_rect, Qt.AlignCenter, self._date_text)
            painter.restore()

            # ── CPU % ──
            painter.save()
            cpu_font = QFont("Segoe UI", 8, QFont.Medium)
            painter.setFont(cpu_font)
            painter.setPen(QColor(self._accent.red(), self._accent.green(),
                                   self._accent.blue(), 180))
            cpu_rect = QRectF(center.x() - 50, center.y() + 18, 100, 14)
            cpu_text = f"{int(self._cpu_percent)}% CPU"
            painter.drawText(cpu_rect, Qt.AlignCenter, cpu_text)
            painter.restore()



    # ═══════════════════════════════════════════════════════
    #  EVENTOS DE MOUSE
    # ═══════════════════════════════════════════════════════

    def mouseMoveEvent(self, event):
        pos = event.position()
        center = self._center()
        inner_r, outer_r = self._animated_radii()

        dist = math.hypot(pos.x() - center.x(), pos.y() - center.y())

        old_hover = self._hovered_index
        old_center = self._center_hovered

        # Centro é passivo (sem hover interativo)
        self._center_hovered = False

        # Verificar hover nas fatias
        self._hovered_index = -1
        if inner_r < dist < outer_r:
            count = len(self._items)
            for i in range(count):
                path = self._get_slice_path(i, count, inner_r, outer_r)
                if path.contains(pos):
                    self._hovered_index = i
                    break

        # Cursor
        if self._hovered_index >= 0:
            self.setCursor(Qt.PointingHandCursor)
        else:
            self.setCursor(Qt.ArrowCursor)

        if old_hover != self._hovered_index or old_center != self._center_hovered:
            self.update()

    def mousePressEvent(self, event):
        if event.button() != Qt.LeftButton or self._is_animating:
            return

        pos = event.position()
        center = self._center()
        inner_r, outer_r = self._animated_radii()
        dist = math.hypot(pos.x() - center.x(), pos.y() - center.y())

        # Clique no centro — sempre fecha
        if dist < inner_r:
            self.close_requested.emit()
            return

        # Clique em uma fatia
        if inner_r < dist < outer_r:
            count = len(self._items)
            for i in range(count):
                path = self._get_slice_path(i, count, inner_r, outer_r)
                if path.contains(pos):
                    self.item_clicked.emit(self._items[i])
                    return

        # Clique fora → Fechar
        if dist > outer_r:
            self.close_requested.emit()

    def leaveEvent(self, event):
        self._hovered_index = -1
        self._center_hovered = False
        self.setCursor(Qt.ArrowCursor)
        self.update()

    # ═══════════════════════════════════════════════════════
    #  ÍCONES SVG
    # ═══════════════════════════════════════════════════════

    def _get_svg_renderer(self, icon_name: str) -> QSvgRenderer | None:
        """Carrega e cacheia um renderer SVG."""
        if not icon_name:
            return None

        if icon_name in self._svg_cache:
            return self._svg_cache[icon_name]

        # Tentar carregar do diretório de ícones
        clean_name = icon_name.replace(".svg", "")
        svg_path = self._icons_dir / f"{clean_name}.svg"

        if svg_path.exists():
            # Ler e substituir 'currentColor' por branco para renderizar
            svg_content = svg_path.read_text(encoding="utf-8")
            svg_content = svg_content.replace('stroke="currentColor"', 'stroke="white"')
            svg_content = svg_content.replace('fill="currentColor"', 'fill="white"')
            svg_bytes = svg_content.encode("utf-8")

            renderer = QSvgRenderer(svg_bytes)
            if renderer.isValid():
                self._svg_cache[icon_name] = renderer
                return renderer

        return None

    def _get_pixmap(self, path: str) -> QPixmap | None:
        """Carrega e cacheia um QPixmap a partir de um caminho de arquivo."""
        if not path:
            return None
        if path in self._pixmap_cache:
            return self._pixmap_cache[path]
        pixmap = QPixmap(path)
        if not pixmap.isNull():
            self._pixmap_cache[path] = pixmap
            return pixmap
        return None

    def _load_back_icon(self):
        """Pré-carrega ícones de navegação."""
        for name in ("arrow-left", "x", "chevron-right"):
            self._get_svg_renderer(name)

    # ═══════════════════════════════════════════════════════
    #  CALLBACKS DE ANIMAÇÃO
    # ═══════════════════════════════════════════════════════

    def _on_radius_anim(self, value):
        self._anim_radius_factor = value
        self.update()

    def _on_opacity_anim(self, value):
        self._anim_opacity = value
        self.update()

    def _on_anim_finished(self):
        self._is_animating = False
