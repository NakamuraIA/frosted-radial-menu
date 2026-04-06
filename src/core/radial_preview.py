"""
radial_preview.py — Widget de preview interativo do menu radial para o editor de configurações.

Mostra visualmente onde cada app está posicionado no menu.
Permite:
  - Clicar em um setor para editar o app
  - Clicar direito para opções (Editar, Ver Submenu, Remover)
  - Navegar dentro de submenus
  - Adicionar novo item clicando no centro
"""

import math
from pathlib import Path

from PySide6.QtWidgets import QWidget, QMenu, QMessageBox
from PySide6.QtGui import (
    QPainter, QPainterPath, QColor, QPen, QBrush,
    QFont, QFontMetrics, QPixmap,
)
from PySide6.QtSvg import QSvgRenderer
from PySide6.QtCore import Qt, Signal, QPointF, QRectF

from .icon_utils import get_app_icon


# Paleta de cores
DARK_BG   = QColor(15, 17, 25)
SLICE_BG  = QColor(28, 32, 45, 215)
SLICE_HOV = QColor(0, 220, 255, 55)
ACCENT    = QColor(0, 220, 255)
ACCENT_DIM= QColor(0, 220, 255, 80)
BORDER_N  = QColor(0, 220, 255, 75)
BORDER_H  = QColor(0, 220, 255, 220)
TEXT_N    = QColor(255, 255, 255, 165)
TEXT_H    = QColor(255, 255, 255, 235)
CENTER_N  = QColor(12, 14, 22, 230)
CENTER_H  = QColor(0, 220, 255, 35)
SUBMENU_IND = QColor(255, 200, 50, 200)   # amarelo para indicar submenu


class RadialPreviewWidget(QWidget):
    """Preview interativo do menu radial."""

    changed   = Signal()   # após qualquer edição / adição / remoção
    nav_label = Signal(str)  # breadcrumb string p/ exibir fora do widget

    SIZE    = 300
    INNER_R = 52
    OUTER_R = 130
    GAP     = 2.5    # graus de gap entre fatias
    ICON_SZ = 20

    def __init__(self, items: list, icons_dir: str = "", parent=None):
        super().__init__(parent)
        self._all_items: list  = items          # referência à lista raiz
        self._icons_dir = Path(icons_dir) if icons_dir else Path()
        self._svg_cache: dict[str, QSvgRenderer] = {}
        self._pix_cache: dict[str, QPixmap]      = {}

        # Navegação: pilha de (label_do_pai, ref_para_lista_pai)
        self._nav_stack: list[tuple[str, list]] = []
        self._active: list = items    # nível atual (referência mutável)

        self._hovered: int  = -1
        self._center_hov: bool = False

        self.setFixedSize(self.SIZE, self.SIZE)
        self.setMouseTracking(True)

    # ── API Pública ──────────────────────────────────────────

    def set_items(self, items: list):
        self._all_items = items
        self._active    = items
        self._nav_stack.clear()
        self._hovered   = -1
        self.update()
        self.nav_label.emit("Root")

    def reset_nav(self):
        self._active    = self._all_items
        self._nav_stack.clear()
        self._hovered   = -1
        self.update()
        self.nav_label.emit("Root")

    # ── Geometria ────────────────────────────────────────────

    def _cx(self): return self.SIZE / 2.0
    def _cy(self): return self.SIZE / 2.0

    def _slice_path(self, idx: int, count: int) -> QPainterPath:
        if count == 0:
            return QPainterPath()
        span    = 360.0 / count
        eff     = span - self.GAP
        c_ang   = 90.0 - span * idx
        s_ang   = c_ang + eff / 2.0
        cx, cy  = self._cx(), self._cy()
        OR, IR  = self.OUTER_R, self.INNER_R
        orect   = QRectF(cx - OR, cy - OR, OR * 2, OR * 2)
        irect   = QRectF(cx - IR, cy - IR, IR * 2, IR * 2)
        p = QPainterPath()
        p.arcMoveTo(orect, s_ang)
        p.arcTo(orect, s_ang, -eff)
        p.arcTo(irect, s_ang - eff, eff)
        p.closeSubpath()
        return p

    def _item_pos(self, idx: int, count: int) -> QPointF:
        ang = -math.pi / 2 + (2 * math.pi / count) * idx
        r   = (self.INNER_R + self.OUTER_R) / 2.0
        return QPointF(self._cx() + r * math.cos(ang),
                       self._cy() + r * math.sin(ang))

    # ── Pintura ──────────────────────────────────────────────

    def paintEvent(self, _event):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing)
        p.setRenderHint(QPainter.SmoothPixmapTransform)
        cx, cy = self._cx(), self._cy()

        # Fundo circular externo
        p.setPen(Qt.NoPen)
        p.setBrush(QBrush(DARK_BG))
        p.drawEllipse(QPointF(cx, cy), self.OUTER_R + 14, self.OUTER_R + 14)

        count = len(self._active)

        if count == 0:
            # Sem items — hint de adicionar
            p.setPen(QColor(0, 220, 255, 100))
            p.setFont(QFont("Segoe UI", 8))
            p.drawText(QRectF(cx - 80, cy + 22, 160, 20),
                       Qt.AlignCenter, "Clique + para adicionar")
        else:
            for i in range(count):
                self._draw_slice(p, i, count)

        self._draw_center(p, cx, cy)

        # Breadcrumb mini (se em submenu)
        if self._nav_stack:
            self._draw_breadcrumb(p)

        p.end()

    def _draw_slice(self, p: QPainter, idx: int, count: int):
        item = self._active[idx]
        hov  = (idx == self._hovered)
        has_ch = bool(item.get("children"))

        path = self._slice_path(idx, count)
        p.setBrush(QBrush(SLICE_HOV if hov else SLICE_BG))
        p.setPen(QPen(BORDER_H if hov else BORDER_N, 2.0 if hov else 1.2))
        p.drawPath(path)

        # Conteúdo (ícone + label)
        pos = self._item_pos(idx, count)
        self._draw_content(p, item, pos, hov)

        # Pequeno chevron laranja se tiver submenu
        if has_ch:
            self._draw_submenu_dot(p, idx, count)

    def _draw_content(self, p: QPainter, item: dict, pos: QPointF, hov: bool):
        label      = item.get("label", "?")
        cust_icon  = item.get("custom_icon", "")
        svg_icon   = item.get("icon", "")
        action     = item.get("action", "")
        target     = item.get("target", "")
        icon_mode  = item.get("icon_mode", "auto")
        icon_scale = float(item.get("icon_scale", 1.0))

        actual_sz  = max(6, int(self.ICON_SZ * icon_scale))
        icon_drawn = False
        y_off      = -(actual_sz / 2.0 + 2)   # ícone acima do centro, dinâmico

        opacity = 0.95 if hov else 0.78

        def _draw_pm(pm):
            if pm and not pm.isNull():
                sc = pm.scaled(actual_sz, actual_sz,
                               Qt.KeepAspectRatio, Qt.SmoothTransformation)
                ix = int(pos.x() - actual_sz / 2)
                iy = int(pos.y() + y_off - actual_sz / 2)
                p.save(); p.setOpacity(opacity)
                p.drawPixmap(ix, iy, sc)
                p.restore()
                return True
            return False

        def _draw_svg():
            if svg_icon:
                rend = self._get_svg(svg_icon)
                if rend:
                    half = actual_sz / 2.0
                    rect = QRectF(pos.x() - half,
                                  pos.y() + y_off - half,
                                  actual_sz, actual_sz)
                    p.save(); p.setOpacity(opacity)
                    rend.render(p, rect)
                    p.restore()
                    return True
            return False

        # Respeitar icon_mode
        if icon_mode == "svg":
            icon_drawn = _draw_svg()
        elif icon_mode == "custom":
            icon_drawn = _draw_pm(self._get_pixmap(cust_icon)) or _draw_svg()
        else:  # "auto"
            if cust_icon:
                icon_drawn = _draw_pm(self._get_pixmap(cust_icon))
            if not icon_drawn and action and target:
                icon_drawn = _draw_pm(get_app_icon(action, target, size=actual_sz * 2))
            if not icon_drawn:
                icon_drawn = _draw_svg()

        # Label
        p.setPen(TEXT_H if hov else TEXT_N)
        font = QFont("Segoe UI", 7, QFont.DemiBold if hov else QFont.Normal)
        p.setFont(font)
        fm  = QFontMetrics(font)
        txt = fm.elidedText(label, Qt.ElideRight, 56)
        label_y = pos.y() + (y_off + actual_sz / 2.0 + 3) if icon_drawn else pos.y() - 6
        p.drawText(QRectF(pos.x() - 30, label_y, 60, 14), Qt.AlignCenter, txt)

    def _draw_submenu_dot(self, p: QPainter, idx: int, count: int):
        """Ponta laranja na borda externa indicando submenu."""
        ang = -math.pi / 2 + (2 * math.pi / count) * idx
        r   = self.OUTER_R - 8
        x   = self._cx() + r * math.cos(ang)
        y   = self._cy() + r * math.sin(ang)
        p.save()
        p.setPen(Qt.NoPen)
        p.setBrush(SUBMENU_IND)
        p.drawEllipse(QPointF(x, y), 4, 4)
        p.restore()

    def _draw_center(self, p: QPainter, cx: float, cy: float):
        hov = self._center_hov
        p.setPen(Qt.NoPen)
        p.setBrush(QBrush(CENTER_H if hov else CENTER_N))
        p.drawEllipse(QPointF(cx, cy), self.INNER_R - 2, self.INNER_R - 2)

        # Anel border
        col = QColor(0, 220, 255, 140 if hov else 50)
        p.setPen(QPen(col, 1.5))
        p.setBrush(Qt.NoBrush)
        p.drawEllipse(QPointF(cx, cy), self.INNER_R - 2, self.INNER_R - 2)

        if self._nav_stack:
            # Submenu: seta voltar (esq) + "+" verde (dir)
            col_back = QColor(0, 220, 255, 230 if hov else 170)
            p.setPen(col_back)
            p.setFont(QFont("Segoe UI", 13, QFont.Bold))
            p.drawText(QRectF(cx - 20, cy - 16, 40, 22), Qt.AlignCenter, "\u2190")

            # Pequeno "+" verde canto inf-dir do circulo
            p.setFont(QFont("Segoe UI", 9, QFont.Bold))
            p.setPen(QColor(80, 255, 140, 230))
            p.drawText(QRectF(cx + 12, cy + 2, 18, 16), Qt.AlignCenter, "+")

            # Hint controls abaixo do circulo
            p.setFont(QFont("Segoe UI", 6))
            p.setPen(QColor(0, 220, 255, 80))
            p.drawText(QRectF(cx - 45, cy + self.INNER_R + 2, 90, 12),
                       Qt.AlignCenter, "\u25c4 voltar  |  dir: adicionar")
        else:
            # Root: so "+"
            col2 = QColor(0, 220, 255, 230 if hov else 160)
            p.setPen(col2)
            p.setFont(QFont("Segoe UI", 18, QFont.Bold))
            p.drawText(QRectF(cx - 20, cy - 14, 40, 28), Qt.AlignCenter, "+")

    def _draw_breadcrumb(self, p: QPainter):
        parts = [lbl for lbl, _ in self._nav_stack]
        text  = "Root › " + " › ".join(parts)
        p.setPen(QColor(0, 220, 255, 130))
        p.setFont(QFont("Segoe UI", 7))
        p.drawText(QRectF(0, 4, self.SIZE, 16), Qt.AlignCenter, text)

    # ── Eventos de Mouse ────────────────────────────────────

    def mouseMoveEvent(self, ev):
        pos  = ev.position()
        cx, cy = self._cx(), self._cy()
        dist = math.hypot(pos.x() - cx, pos.y() - cy)
        old_h  = self._hovered
        old_ch = self._center_hov

        self._center_hov = dist < self.INNER_R
        self._hovered    = -1

        if self.INNER_R < dist < self.OUTER_R:
            count = len(self._active)
            for i in range(count):
                if self._slice_path(i, count).contains(pos):
                    self._hovered = i
                    break

        if self._hovered >= 0 or self._center_hov:
            self.setCursor(Qt.PointingHandCursor)
        else:
            self.setCursor(Qt.ArrowCursor)

        if old_h != self._hovered or old_ch != self._center_hov:
            self.update()

    def mousePressEvent(self, ev):
        pos  = ev.position()
        cx, cy = self._cx(), self._cy()
        dist = math.hypot(pos.x() - cx, pos.y() - cy)
        count = len(self._active)

        if ev.button() == Qt.LeftButton:
            if dist < self.INNER_R:
                if self._nav_stack:
                    self._go_back()       # esq no centro em submenu = voltar
                else:
                    self._open_add()      # esq no centro em root = adicionar
                return
            if self.INNER_R < dist < self.OUTER_R:
                for i in range(count):
                    if self._slice_path(i, count).contains(pos):
                        self._open_edit(i)
                        return

        elif ev.button() == Qt.RightButton:
            if dist < self.INNER_R:
                # Clique direito no centro = adicionar (em qualquer nivel)
                self._open_add()
                return
            if self.INNER_R < dist < self.OUTER_R:
                for i in range(count):
                    if self._slice_path(i, count).contains(pos):
                        self._show_ctx(ev.globalPosition().toPoint(), i)
                        return
            # Clique direito fora das fatias = menu p/ adicionar
            self._show_empty_ctx(ev.globalPosition().toPoint())

    def leaveEvent(self, _ev):
        self._hovered   = -1
        self._center_hov = False
        self.setCursor(Qt.ArrowCursor)
        self.update()

    # ── Navegação ────────────────────────────────────────────

    def _enter_submenu(self, idx: int):
        item = self._active[idx]
        if "children" not in item:
            item["children"] = []
        self._nav_stack.append((item.get("label", "?"), self._active))
        self._active  = item["children"]
        self._hovered = -1
        self.update()
        path = "Root › " + " › ".join(l for l, _ in self._nav_stack)
        self.nav_label.emit(path)

    def _go_back(self):
        if self._nav_stack:
            _lbl, parent = self._nav_stack.pop()
            self._active  = parent
            self._hovered = -1
            self.update()
            path = ("Root › " + " › ".join(l for l, _ in self._nav_stack)
                    if self._nav_stack else "Root")
            self.nav_label.emit(path)

    # ── Ações ────────────────────────────────────────────────

    def _show_ctx(self, gpos, idx: int):
        item   = self._active[idx]
        menu   = QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background: #161927; color: #e8eaf6;
                border: 1px solid #2a2f45; border-radius: 8px;
                padding: 4px;
            }
            QMenu::item { padding: 6px 16px; border-radius: 6px; }
            QMenu::item:selected { background: rgba(0,220,255,0.15); }
        """)
        a_add    = menu.addAction("\u2795  Adicionar item aqui")
        menu.addSeparator()
        a_edit   = menu.addAction("\u270f  Editar")
        a_sub    = menu.addAction("\u21b3  Ver / Editar Submenu")
        menu.addSeparator()
        a_remove = menu.addAction("\U0001f5d1  Remover")

        chosen = menu.exec(gpos)
        if chosen == a_add:
            self._open_add()
        elif chosen == a_edit:
            self._open_edit(idx)
        elif chosen == a_sub:
            self._enter_submenu(idx)
        elif chosen == a_remove:
            self._confirm_remove(idx)

    def _show_empty_ctx(self, gpos):
        """Menu de contexto ao clicar com botao direito em area vazia do anel."""
        menu = QMenu(self)
        menu.setStyleSheet("""
            QMenu {
                background: #161927; color: #e8eaf6;
                border: 1px solid #2a2f45; border-radius: 8px;
                padding: 4px;
            }
            QMenu::item { padding: 6px 16px; border-radius: 6px; }
            QMenu::item:selected { background: rgba(0,220,255,0.15); }
        """)
        where = " ao Submenu" if self._nav_stack else ""
        a_add = menu.addAction(f"\u2795  Adicionar item{where}")
        chosen = menu.exec(gpos)
        if chosen == a_add:
            self._open_add()


    def _open_edit(self, idx: int):
        # Import inline para evitar dependência circular
        from .settings_window import AppEditDialog
        from PySide6.QtWidgets import QDialog
        dlg = AppEditDialog(self._active[idx], parent=self)
        if dlg.exec() == QDialog.Accepted:
            self._active[idx] = dlg.result_data()
            self.update()
            self.changed.emit()

    def _open_add(self):
        from .settings_window import AppEditDialog
        from PySide6.QtWidgets import QDialog
        dlg = AppEditDialog(parent=self)
        if dlg.exec() == QDialog.Accepted:
            self._active.append(dlg.result_data())
            self.update()
            self.changed.emit()

    def _confirm_remove(self, idx: int):
        name  = self._active[idx].get("label", "?")
        reply = QMessageBox.question(
            self, "Remover App", f'Remover "{name}"?',
            QMessageBox.Yes | QMessageBox.No)
        if reply == QMessageBox.Yes:
            self._active.pop(idx)
            if self._hovered >= len(self._active):
                self._hovered = -1
            self.update()
            self.changed.emit()

    # ── Ícones ───────────────────────────────────────────────

    def _get_svg(self, name: str) -> QSvgRenderer | None:
        if not name:
            return None
        if name in self._svg_cache:
            return self._svg_cache[name]
        path = self._icons_dir / f"{name}.svg"
        if path.exists():
            svg = path.read_text(encoding="utf-8")
            svg = svg.replace('stroke="currentColor"', 'stroke="white"')
            svg = svg.replace('fill="currentColor"',   'fill="white"')
            r   = QSvgRenderer(svg.encode())
            if r.isValid():
                self._svg_cache[name] = r
                return r
        return None

    def _get_pixmap(self, path: str) -> QPixmap | None:
        if not path:
            return None
        if path in self._pix_cache:
            return self._pix_cache[path]
        pm = QPixmap(path)
        if not pm.isNull():
            self._pix_cache[path] = pm
            return pm
        return None
