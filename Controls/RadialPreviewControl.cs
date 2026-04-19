// Controls/RadialPreviewControl.cs — Preview interativo do menu radial para Settings.
// Port 1:1 de radial_preview.py (482 linhas)
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using MenuRadialCS.Models;
using MenuItem = MenuRadialCS.Models.MenuItem;
using MenuRadialCS.Services;
using MenuRadialCS.Windows;

namespace MenuRadialCS.Controls;

/// <summary>Preview interativo do menu radial para o editor de configurações.</summary>
public class RadialPreviewControl : FrameworkElement
{
    private const int SIZE = 300;
    private const int INNER_R = 52;
    private const int OUTER_R = 130;
    private const double GAP = 2.5;
    private const int ICON_SZ = 20;

    // Paleta
    private static readonly Color DARK_BG = Color.FromArgb(255, 15, 17, 25);
    private static readonly Color SLICE_BG = Color.FromArgb(215, 28, 32, 45);
    private static readonly Color SLICE_HOV = Color.FromArgb(55, 0, 220, 255);
    private static readonly Color ACCENT_COL = Color.FromArgb(255, 0, 220, 255);
    private static readonly Color BORDER_N = Color.FromArgb(75, 0, 220, 255);
    private static readonly Color BORDER_H = Color.FromArgb(220, 0, 220, 255);
    private static readonly Color TEXT_N = Color.FromArgb(165, 255, 255, 255);
    private static readonly Color TEXT_H = Color.FromArgb(235, 255, 255, 255);
    private static readonly Color CENTER_N = Color.FromArgb(230, 12, 14, 22);
    private static readonly Color CENTER_H = Color.FromArgb(35, 0, 220, 255);
    private static readonly Color SUBMENU_IND = Color.FromArgb(200, 255, 200, 50);

    private List<MenuItem> _allItems;
    private List<MenuItem> _active;
    private readonly List<(string label, List<MenuItem> parent)> _navStack = new();
    private readonly SvgIconService _svgService;

    private int _hovered = -1;
    private bool _centerHov;

    public event Action? Changed;
    public event Action<string>? NavLabel;

    public RadialPreviewControl(List<MenuItem> items, string iconsDir)
    {
        _allItems = items;
        _active = items;
        _svgService = new SvgIconService(iconsDir);
        Width = SIZE;
        Height = SIZE;
    }

    public void SetItems(List<MenuItem> items)
    {
        _allItems = items;
        _active = items;
        _navStack.Clear();
        _hovered = -1;
        InvalidateVisual();
        NavLabel?.Invoke("Root");
    }

    // ═══════════════════════════════════════════════════════
    //  GEOMETRIA
    // ═══════════════════════════════════════════════════════
    private double Cx => SIZE / 2.0;
    private double Cy => SIZE / 2.0;

    private PathGeometry SlicePath(int idx, int count)
    {
        if (count == 0) return new PathGeometry();
        double span = 360.0 / count;
        double eff = span - GAP;
        double startAngle = 90.0 - span * idx + eff / 2.0;

        var fig = new PathFigure
        {
            StartPoint = AnglePt(startAngle, OUTER_R),
            IsClosed = true, IsFilled = true,
        };
        fig.Segments.Add(new ArcSegment(AnglePt(startAngle - eff, OUTER_R),
            new Size(OUTER_R, OUTER_R), 0, eff > 180, SweepDirection.Clockwise, true));
        fig.Segments.Add(new LineSegment(AnglePt(startAngle - eff, INNER_R), true));
        fig.Segments.Add(new ArcSegment(AnglePt(startAngle, INNER_R),
            new Size(INNER_R, INNER_R), 0, eff > 180, SweepDirection.Counterclockwise, true));

        return new PathGeometry(new[] { fig });
    }

    private Point ItemPos(int idx, int count)
    {
        double ang = -Math.PI / 2 + (2 * Math.PI / count) * idx;
        double r = (INNER_R + OUTER_R) / 2.0;
        return new Point(Cx + r * Math.Cos(ang), Cy + r * Math.Sin(ang));
    }

    private Point AnglePt(double angleDeg, double radius)
    {
        double rad = angleDeg * Math.PI / 180.0;
        return new Point(Cx + radius * Math.Cos(rad), Cy - radius * Math.Sin(rad));
    }

    // ═══════════════════════════════════════════════════════
    //  RENDERING
    // ═══════════════════════════════════════════════════════
    protected override void OnRender(DrawingContext dc)
    {
        // Fundo circular
        dc.DrawEllipse(new SolidColorBrush(DARK_BG), null, new Point(Cx, Cy), OUTER_R + 14, OUTER_R + 14);

        int count = _active.Count;
        if (count == 0)
        {
            var hint = FmtText("Clique + para adicionar", 8, Color.FromArgb(100, 0, 220, 255));
            dc.DrawText(hint, new Point(Cx - hint.Width / 2, Cy + 22));
        }
        else
        {
            for (int i = 0; i < count; i++)
                PaintSlice(dc, i, count);
        }

        PaintCenter(dc);

        if (_navStack.Count > 0)
            PaintBreadcrumb(dc);
    }

    private void PaintSlice(DrawingContext dc, int idx, int count)
    {
        var item = _active[idx];
        bool hov = idx == _hovered;
        bool hasCh = item.HasChildren;

        var path = SlicePath(idx, count);
        dc.DrawGeometry(new SolidColorBrush(hov ? SLICE_HOV : SLICE_BG), null, path);
        dc.DrawGeometry(null, new Pen(new SolidColorBrush(hov ? BORDER_H : BORDER_N), hov ? 2.0 : 1.2), path);

        var pos = ItemPos(idx, count);
        double iconScale = Math.Max(0.3, item.IconScale);
        int actualSz = Math.Max(6, (int)(ICON_SZ * iconScale));
        double yOff = -(actualSz / 2.0 + 2);
        double opacity = hov ? 0.95 : 0.78;

        // Icon (respeita IconMode)
        var iconRect = new Rect(pos.X - actualSz / 2.0, pos.Y + yOff - actualSz / 2.0, actualSz, actualSz);
        bool iconDrawn = false;

        switch (item.IconMode)
        {
            case "auto":
                if (!string.IsNullOrEmpty(item.Target))
                {
                    var appIcon = MenuRadialCS.Services.IconService.GetAppIcon(item.Action, item.Target, actualSz * 2);
                    if (appIcon != null)
                    {
                        dc.PushOpacity(opacity);
                        dc.DrawImage(appIcon, iconRect);
                        dc.Pop();
                        iconDrawn = true;
                    }
                }
                if (!iconDrawn && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;

            case "svg":
                if (!string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;

            case "custom":
                if (!string.IsNullOrEmpty(item.CustomIcon) && System.IO.File.Exists(item.CustomIcon))
                {
                    try
                    {
                        var bmp = new System.Windows.Media.Imaging.BitmapImage(new Uri(item.CustomIcon));
                        dc.PushOpacity(opacity);
                        dc.DrawImage(bmp, iconRect);
                        dc.Pop();
                        iconDrawn = true;
                    }
                    catch { }
                }
                if (!iconDrawn && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;

            default:
                if (!string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;
        }

        // Label
        var textCol = hov ? TEXT_H : TEXT_N;
        var fmt = FmtText(item.Label, 7, textCol, hov);
        fmt.MaxTextWidth = 56;
        fmt.TextAlignment = TextAlignment.Center;
        double labelY = pos.Y + yOff + actualSz / 2.0 + 3;
        dc.DrawText(fmt, new Point(pos.X - 28, labelY));

        // Submenu dot
        if (hasCh)
        {
            double ang = -Math.PI / 2 + (2 * Math.PI / count) * idx;
            double r = OUTER_R - 8;
            dc.DrawEllipse(new SolidColorBrush(SUBMENU_IND), null,
                new Point(Cx + r * Math.Cos(ang), Cy + r * Math.Sin(ang)), 4, 4);
        }
    }

    private void PaintCenter(DrawingContext dc)
    {
        var bg = _centerHov ? CENTER_H : CENTER_N;
        dc.DrawEllipse(new SolidColorBrush(bg), null, new Point(Cx, Cy), INNER_R - 2, INNER_R - 2);
        byte a = (byte)(_centerHov ? 140 : 50);
        dc.DrawEllipse(null, new Pen(new SolidColorBrush(Color.FromArgb(a, 0, 220, 255)), 1.5),
            new Point(Cx, Cy), INNER_R - 2, INNER_R - 2);

        if (_navStack.Count > 0)
        {
            var arrowCol = Color.FromArgb((byte)(_centerHov ? 230 : 170), 0, 220, 255);
            var arrow = FmtText("←", 13, arrowCol, true);
            dc.DrawText(arrow, new Point(Cx - arrow.Width / 2, Cy - 14));

            var plus = FmtText("+", 9, Color.FromArgb(230, 80, 255, 140), true);
            dc.DrawText(plus, new Point(Cx + 12, Cy + 2));
        }
        else
        {
            var plusCol = Color.FromArgb((byte)(_centerHov ? 230 : 160), 0, 220, 255);
            var plus = FmtText("+", 18, plusCol, true);
            dc.DrawText(plus, new Point(Cx - plus.Width / 2, Cy - 14));
        }
    }

    private void PaintBreadcrumb(DrawingContext dc)
    {
        var parts = new List<string> { "Root" };
        foreach (var (lbl, _) in _navStack) parts.Add(lbl);
        var text = string.Join(" › ", parts);
        var fmt = FmtText(text, 7, Color.FromArgb(130, 0, 220, 255));
        fmt.TextAlignment = TextAlignment.Center;
        dc.DrawText(fmt, new Point(Cx - fmt.Width / 2, 4));
    }

    // ═══════════════════════════════════════════════════════
    //  MOUSE
    // ═══════════════════════════════════════════════════════
    protected override void OnMouseMove(MouseEventArgs e)
    {
        var pos = e.GetPosition(this);
        double dist = Dist(pos, new Point(Cx, Cy));
        int oldH = _hovered;
        bool oldCH = _centerHov;

        _centerHov = dist < INNER_R;
        _hovered = -1;

        if (dist > INNER_R && dist < OUTER_R)
        {
            int count = _active.Count;
            for (int i = 0; i < count; i++)
            {
                if (SlicePath(i, count).FillContains(pos))
                { _hovered = i; break; }
            }
        }

        Cursor = (_hovered >= 0 || _centerHov) ? Cursors.Hand : Cursors.Arrow;
        if (oldH != _hovered || oldCH != _centerHov) InvalidateVisual();
    }

    protected override void OnMouseDown(MouseButtonEventArgs e)
    {
        var pos = e.GetPosition(this);
        double dist = Dist(pos, new Point(Cx, Cy));

        if (e.ChangedButton == MouseButton.Left)
        {
            if (dist < INNER_R)
            {
                if (_navStack.Count > 0) GoBack();
                else OpenAdd();
                return;
            }
            if (dist > INNER_R && dist < OUTER_R && _hovered >= 0)
            { OpenEdit(_hovered); return; }
        }
        else if (e.ChangedButton == MouseButton.Right)
        {
            if (dist < INNER_R) { OpenAdd(); return; }
            if (dist > INNER_R && dist < OUTER_R && _hovered >= 0)
            { ShowContextMenu(e, _hovered); return; }
            ShowEmptyContextMenu(e);
        }
    }

    protected override void OnMouseLeave(MouseEventArgs e)
    {
        _hovered = -1;
        _centerHov = false;
        Cursor = Cursors.Arrow;
        InvalidateVisual();
    }

    // ═══════════════════════════════════════════════════════
    //  NAVIGATION  
    // ═══════════════════════════════════════════════════════
    private void EnterSubmenu(int idx)
    {
        var item = _active[idx];
        if (item.Children == null) item.Children = new();
        _navStack.Add((item.Label, _active));
        _active = item.Children;
        _hovered = -1;
        InvalidateVisual();
        EmitNavLabel();
    }

    private void GoBack()
    {
        if (_navStack.Count == 0) return;
        var (_, parent) = _navStack[^1];
        _navStack.RemoveAt(_navStack.Count - 1);
        _active = parent;
        _hovered = -1;
        InvalidateVisual();
        EmitNavLabel();
    }

    private void EmitNavLabel()
    {
        if (_navStack.Count == 0)
            NavLabel?.Invoke("Root");
        else
        {
            var parts = new List<string> { "Root" };
            foreach (var (lbl, _) in _navStack) parts.Add(lbl);
            NavLabel?.Invoke(string.Join(" › ", parts));
        }
    }

    // ═══════════════════════════════════════════════════════
    //  ACTIONS
    // ═══════════════════════════════════════════════════════
    private void OpenEdit(int idx)
    {
        if (idx < 0 || idx >= _active.Count) return;
        var dlg = new AppEditDialog(_active[idx]);
        if (dlg.ShowDialog() == true)
        {
            _active[idx] = dlg.ResultItem;
            InvalidateVisual();
            Changed?.Invoke();
        }
    }

    private void OpenAdd()
    {
        var dlg = new AppEditDialog();
        if (dlg.ShowDialog() == true)
        {
            _active.Add(dlg.ResultItem);
            InvalidateVisual();
            Changed?.Invoke();
        }
    }

    private void ShowContextMenu(MouseButtonEventArgs e, int idx)
    {
        var item = _active[idx];
        var menu = new ContextMenu();
        menu.Style = null; // Use default for now

        var addItem = new System.Windows.Controls.MenuItem { Header = "➕  Adicionar item aqui" };
        addItem.Click += (_, _) => OpenAdd();
        menu.Items.Add(addItem);

        menu.Items.Add(new Separator());

        var editItem = new System.Windows.Controls.MenuItem { Header = "✏  Editar" };
        editItem.Click += (_, _) => OpenEdit(idx);
        menu.Items.Add(editItem);

        var subItem = new System.Windows.Controls.MenuItem { Header = "↳  Ver / Editar Submenu" };
        subItem.Click += (_, _) => EnterSubmenu(idx);
        menu.Items.Add(subItem);

        menu.Items.Add(new Separator());

        var removeItem = new System.Windows.Controls.MenuItem { Header = "🗑  Remover" };
        removeItem.Click += (_, _) =>
        {
            var name = _active[idx].Label;
            if (MessageBox.Show($"Remover \"{name}\"?", "Remover App",
                MessageBoxButton.YesNo) == MessageBoxResult.Yes)
            {
                _active.RemoveAt(idx);
                _hovered = -1;
                InvalidateVisual();
                Changed?.Invoke();
            }
        };
        menu.Items.Add(removeItem);

        menu.IsOpen = true;
    }

    private void ShowEmptyContextMenu(MouseButtonEventArgs e)
    {
        var menu = new ContextMenu();
        var where = _navStack.Count > 0 ? " ao Submenu" : "";
        var addItem = new System.Windows.Controls.MenuItem { Header = $"➕  Adicionar item{where}" };
        addItem.Click += (_, _) => OpenAdd();
        menu.Items.Add(addItem);
        menu.IsOpen = true;
    }

    // ═══════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════
    private static double Dist(Point a, Point b) =>
        Math.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y));

    private static FormattedText FmtText(string text, double size, Color color, bool bold = false)
    {
        return new FormattedText(text, CultureInfo.InvariantCulture, FlowDirection.LeftToRight,
            new Typeface(new FontFamily("Segoe UI"), FontStyles.Normal,
                bold ? FontWeights.Bold : FontWeights.Normal, FontStretches.Normal),
            size, new SolidColorBrush(color), 96);
    }
}
