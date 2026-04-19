// Controls/RadialControl.cs — Coração visual do menu radial.
// Visual 2026: glassmorphism, neon glow, submenu inline, animações
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Threading;
using MenuRadialCS.Models;
using MenuItem = MenuRadialCS.Models.MenuItem;
using MenuRadialCS.Services;

namespace MenuRadialCS.Controls;

/// <summary>
/// Controle visual principal do menu radial.
/// Renderiza fatias, LED glow, dashboard central, ícones, labels e submenu inline.
/// </summary>
public class RadialControl : FrameworkElement
{
    // ═══════════════════════════════════════════════════════
    //  CONSTANTES
    // ═══════════════════════════════════════════════════════
    private const double GAP_DEG = 3.0;
    private const int MAX_SUBMENU_ITEMS = 6;
    private const int SUBMENU_HOVER_DELAY_MS = 200;
    private const int SUBMENU_CLOSE_DELAY_MS = 150;
    private const double SUBMENU_RING_WIDTH = 49.0;
    private const double SUBMENU_GAP = 5.0; // gap entre menu e submenu

    // Paleta 2026 — glassmorphism ultra-transparente
    private static readonly Color SliceBg = Color.FromArgb(70, 18, 21, 35);
    private static readonly Color SliceBgTop = Color.FromArgb(90, 26, 30, 48);
    private static readonly Color SliceHover = Color.FromArgb(45, 0, 220, 255);
    private static readonly Color TextNormal = Color.FromArgb(220, 230, 235, 245);
    private static readonly Color TextHov = Color.FromArgb(250, 255, 255, 255);
    private static readonly Color CenterBg = Color.FromArgb(180, 10, 12, 20);
    private static readonly Color CenterEdge = Color.FromArgb(180, 16, 18, 28);
    private static readonly Color SubmenuInd = Color.FromArgb(220, 255, 210, 60);
    private static readonly Color DarkBg = Color.FromArgb(255, 11, 13, 21);

    // ═══════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════
    private List<MenuItem> _items = new();
    private int _hovered = -1;
    private bool _centerHov;
    private int _innerR = 55, _outerR = 155;
    private Color _accent = Color.FromArgb(255, 0, 220, 255);
    private Color _secondary = Color.FromArgb(255, 255, 0, 122);

    // LED Glow
    private double _glowAngle;
    private readonly DispatcherTimer _glowTimer;

    // Monitor
    private float _cpuPercent;
    private string _clockText = "--:--";
    private string _dateText = "";
    private bool _enableMonitoring = true;

    // Ghost levels
    private List<List<MenuItem>> _ghostLevels = new();
    private double _ghostOpacity = 0.3;

    // SVG service
    private SvgIconService? _svgService;

    // ── Animação de abertura ──
    private double _openProgress = 1.0;    // 0→1 (animando) | 1 = pronto
    private bool _isOpening;
    private DateTime _openStartTime;
    private const double OPEN_DURATION_MS = 350.0;

    // ── Animação de fechamento ──
    private double _closeProgress = 0.0;   // 0→1 (animando) | 0 = não fechando
    private bool _isClosing;
    private DateTime _closeStartTime;
    private const double CLOSE_DURATION_MS = 250.0;
    private Action? _closeCallback;

    // ── Submenu inline ──
    private int _submenuParentIdx = -1;       // qual item está mostrando submenu (-1 = nenhum)
    private List<MenuItem> _submenuItems = new();
    private int _submenuHovered = -1;
    private double _submenuProgress = 0.0;    // 0→1 animação reveal
    private bool _submenuOpening;
    private bool _submenuClosing;
    private DateTime _submenuAnimStart;
    private const double SUBMENU_OPEN_MS = 250.0;
    private const double SUBMENU_CLOSE_MS = 150.0;

    // Hover delay para submenu
    private DispatcherTimer? _submenuOpenTimer;
    private DispatcherTimer? _submenuCloseTimer;
    private int _pendingSubmenuIdx = -1;

    // Breathing center glow
    private double _breathPhase;

    // ── Tooltip ──
    private int _tooltipIdx = -1;           // índice do item com tooltip ativo
    private bool _tooltipVisible;
    private double _tooltipOpacity;
    private DateTime _tooltipShowTime;
    private DispatcherTimer? _tooltipTimer;
    private const int TOOLTIP_DELAY_MS = 500;
    private bool _isSubmenuTooltip;         // true se tooltip é de um item do submenu

    // ── Context Menu (right-click) ──
    private int _contextMenuIdx = -1;       // item que abriu o context menu
    private int _contextHovered = -1;       // opção hoverável no context menu
    private bool _contextMenuVisible;
    private double _contextProgress;        // 0→1 animação
    private DateTime _contextAnimStart;
    private Point _contextMenuPos;
    private static readonly string[] ContextOptions = { "✏ Editar", "▲ Mover Cima", "▼ Mover Baixo", "✖ Remover" };

    // ═══════════════════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════════════════
    public event Action<MenuItem>? ItemClicked;
    public event Action<MenuItem>? SubItemClicked;
    public event Action? BackClicked;
    public event Action? CloseRequested;
    public event Action<MenuItem>? EditRequested;
    public event Action<int, int>? MoveRequested;   // fromIdx, direction (-1=up, +1=down)
    public event Action<int>? RemoveRequested;       // idx

    // ═══════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════════════════
    public RadialControl()
    {
        _glowTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(33) }; // ~30fps
        _glowTimer.Tick += OnAnimTick;
    }

    private void OnAnimTick(object? sender, EventArgs e)
    {
        _glowAngle = (_glowAngle - 0.55 + 360.0) % 360.0;
        _breathPhase = (_breathPhase + 0.03) % (Math.PI * 2);

        // ── Animação de abertura ──
        if (_isOpening)
        {
            double elapsed = (DateTime.UtcNow - _openStartTime).TotalMilliseconds;
            _openProgress = Math.Min(1.0, elapsed / OPEN_DURATION_MS);
            if (_openProgress >= 1.0) _isOpening = false;
        }

        // ── Animação de fechamento ──
        if (_isClosing)
        {
            double elapsed = (DateTime.UtcNow - _closeStartTime).TotalMilliseconds;
            _closeProgress = Math.Min(1.0, elapsed / CLOSE_DURATION_MS);
            if (_closeProgress >= 1.0)
            {
                _isClosing = false;
                _closeCallback?.Invoke();
                _closeCallback = null;
            }
        }

        // ── Animação de submenu ──
        if (_submenuOpening)
        {
            double elapsed = (DateTime.UtcNow - _submenuAnimStart).TotalMilliseconds;
            _submenuProgress = Math.Min(1.0, elapsed / SUBMENU_OPEN_MS);
            if (_submenuProgress >= 1.0) _submenuOpening = false;
        }
        else if (_submenuClosing)
        {
            double elapsed = (DateTime.UtcNow - _submenuAnimStart).TotalMilliseconds;
            _submenuProgress = Math.Max(0.0, 1.0 - elapsed / SUBMENU_CLOSE_MS);
            if (_submenuProgress <= 0.0)
            {
                _submenuClosing = false;
                _submenuParentIdx = -1;
                _submenuItems.Clear();
                _submenuHovered = -1;
            }
        }

        // ── Tooltip fade in ──
        if (_tooltipVisible && _tooltipOpacity < 1.0)
        {
            double elapsed = (DateTime.UtcNow - _tooltipShowTime).TotalMilliseconds;
            _tooltipOpacity = Math.Min(1.0, elapsed / 200.0);
        }

        // ── Context menu animation ──
        if (_contextMenuVisible && _contextProgress < 1.0)
        {
            double elapsed = (DateTime.UtcNow - _contextAnimStart).TotalMilliseconds;
            _contextProgress = Math.Min(1.0, elapsed / 150.0);
        }

        InvalidateVisual();
    }

    // ═══════════════════════════════════════════════════════
    //  PUBLIC API
    // ═══════════════════════════════════════════════════════
    public void Setup(List<MenuItem> items, int innerR, int outerR, Color accent, Color secondary,
        bool enableMonitoring, double ghostOpacity, SvgIconService svgService)
    {
        _items = items;
        _innerR = innerR;
        _outerR = outerR;
        _accent = accent;
        _secondary = secondary;
        _enableMonitoring = enableMonitoring;
        _ghostOpacity = ghostOpacity;
        _svgService = svgService;
        UpdateSize();
        _glowTimer.Start();
    }

    public void SetItems(List<MenuItem> items, List<List<MenuItem>> ghostLevels)
    {
        _items = items;
        _ghostLevels = ghostLevels;
        _hovered = -1;
        CloseSubmenu();
        InvalidateVisual();
    }

    public void UpdateMonitor(float cpu, string clock, string date)
    {
        _cpuPercent = cpu;
        _clockText = clock;
        _dateText = date;
    }

    /// <summary>Tamanho total incluindo espaço para submenu + glow.</summary>
    public int GetSize() => (int)((_outerR + SUBMENU_GAP + SUBMENU_RING_WIDTH + 20) * 2);

    private void UpdateSize()
    {
        var size = GetSize();
        Width = size;
        Height = size;
    }

    public void StopGlow() => _glowTimer.Stop();

    /// <summary>Inicia animação de abertura do menu.</summary>
    public void PlayOpenAnimation()
    {
        _openProgress = 0.0;
        _isOpening = true;
        _isClosing = false;
        _closeProgress = 0.0;
        _openStartTime = DateTime.UtcNow;
        CloseSubmenu();
    }

    /// <summary>Inicia animação de fechamento do menu. Chama callback ao terminar.</summary>
    public void PlayCloseAnimation(Action onComplete)
    {
        if (_isClosing) return;
        _isClosing = true;
        _closeProgress = 0.0;
        _closeStartTime = DateTime.UtcNow;
        _closeCallback = onComplete;
        CloseSubmenu();
        HideTooltip();
        HideContextMenu();
    }

    // ═══════════════════════════════════════════════════════
    //  EASING
    // ═══════════════════════════════════════════════════════
    /// <summary>CubicEaseOut: rápido no início, suave no final.</summary>
    private static double EaseOutCubic(double t) { double f = 1.0 - t; return 1.0 - f * f * f; }

    /// <summary>QuadraticEaseOut.</summary>
    private static double EaseOutQuad(double t) => t * (2.0 - t);

    /// <summary>BackEase Out (leve overshoot/bounce).</summary>
    private static double EaseOutBack(double t)
    {
        const double s = 1.70158;
        double f = t - 1.0;
        return f * f * ((s + 1) * f + s) + 1.0;
    }

    // ═══════════════════════════════════════════════════════
    //  GEOMETRIA
    // ═══════════════════════════════════════════════════════
    private double Cx => ActualWidth / 2.0;
    private double Cy => ActualHeight / 2.0;

    /// <summary>Fatia do menu principal com fator de escala (para animação).</summary>
    private PathGeometry GetSlicePath(int idx, int count, double scaleFactor = 1.0)
    {
        if (count == 0) return new PathGeometry();
        double span = 360.0 / count;
        double eff = span - GAP_DEG;
        double centerAngle = 90.0 - span * idx;
        double startAngle = centerAngle + eff / 2.0;

        double OR = _outerR * scaleFactor;
        double IR = _innerR * scaleFactor;

        var path = new PathGeometry();
        var fig = new PathFigure { IsClosed = true, IsFilled = true };
        fig.StartPoint = Pt(startAngle, OR);
        fig.Segments.Add(new ArcSegment(Pt(startAngle - eff, OR),
            new Size(OR, OR), 0, eff > 180, SweepDirection.Clockwise, true));
        fig.Segments.Add(new LineSegment(Pt(startAngle - eff, IR), true));
        fig.Segments.Add(new ArcSegment(Pt(startAngle, IR),
            new Size(IR, IR), 0, eff > 180, SweepDirection.Counterclockwise, true));
        path.Figures.Add(fig);
        return path;
    }

    /// <summary>Geometria de uma fatia do submenu inline.</summary>
    private PathGeometry GetSubmenuSlicePath(int subIdx, int subCount, int parentIdx, int parentCount, double progress)
    {
        // Ângulo central do item pai
        double parentSpan = 360.0 / parentCount;
        double parentCenterAngle = 90.0 - parentSpan * parentIdx;

        // Cada sub-fatia tem ~35 graus, max 180° total
        double subSpan = Math.Min(35.0, 180.0 / subCount);
        double subEff = subSpan - 2.0; // gap entre sub-fatias

        // Centro angular de cada sub-fatia, centrado no ângulo do pai:
        // - Ímpar: item do meio fica em parentCenterAngle
        // - Par: fronteira entre os 2 do meio fica em parentCenterAngle
        double subCenterAngle = parentCenterAngle + (subCount - 1) * subSpan / 2.0 - subIdx * subSpan;
        double startAngle = subCenterAngle + subEff / 2.0;

        // Raios do anel externo (animados)
        double subInnerR = _outerR + SUBMENU_GAP;
        double subOuterR = subInnerR + SUBMENU_RING_WIDTH * progress;

        if (subOuterR <= subInnerR + 1) return new PathGeometry();

        var path = new PathGeometry();
        var fig = new PathFigure { IsClosed = true, IsFilled = true };
        fig.StartPoint = Pt(startAngle, subOuterR);
        fig.Segments.Add(new ArcSegment(Pt(startAngle - subEff, subOuterR),
            new Size(subOuterR, subOuterR), 0, subEff > 180, SweepDirection.Clockwise, true));
        fig.Segments.Add(new LineSegment(Pt(startAngle - subEff, subInnerR), true));
        fig.Segments.Add(new ArcSegment(Pt(startAngle, subInnerR),
            new Size(subInnerR, subInnerR), 0, subEff > 180, SweepDirection.Counterclockwise, true));
        path.Figures.Add(fig);
        return path;
    }

    /// <summary>Centro de uma sub-fatia (para posicionar ícone+label).</summary>
    private Point SubmenuSliceCenter(int subIdx, int subCount, int parentIdx, int parentCount, double progress)
    {
        double parentSpan = 360.0 / parentCount;
        double parentCenterAngle = 90.0 - parentSpan * parentIdx;

        double subSpan = Math.Min(35.0, 180.0 / subCount);

        // Mesma fórmula de centralização
        double subCenterAngle = parentCenterAngle + (subCount - 1) * subSpan / 2.0 - subIdx * subSpan;

        double subInnerR = _outerR + SUBMENU_GAP;
        double subOuterR = subInnerR + SUBMENU_RING_WIDTH * progress;
        double midR = (subInnerR + subOuterR) / 2.0;

        double rad = subCenterAngle * Math.PI / 180.0;
        return new Point(Cx + midR * Math.Cos(rad), Cy - midR * Math.Sin(rad));
    }

    /// <summary>Ângulo em graus → ponto no espaço (0°=leste, 90°=norte)</summary>
    private Point Pt(double angleDeg, double radius)
    {
        double rad = angleDeg * Math.PI / 180.0;
        return new Point(Cx + radius * Math.Cos(rad), Cy - radius * Math.Sin(rad));
    }

    /// <summary>Centro da fatia principal.</summary>
    private Point SliceCenter(int idx, int count, double scaleFactor = 1.0)
    {
        double span = 360.0 / count;
        double centerAngle = 90.0 - span * idx;
        double rad = centerAngle * Math.PI / 180.0;
        double midR = (_innerR + _outerR) / 2.0 * scaleFactor;
        return new Point(Cx + midR * Math.Cos(rad), Cy - midR * Math.Sin(rad));
    }

    // ═══════════════════════════════════════════════════════
    //  RENDERING
    // ═══════════════════════════════════════════════════════
    protected override void OnRender(DrawingContext dc)
    {
        if (ActualWidth <= 0 || ActualHeight <= 0) return;
        try
        {
            // Fator de escala global (abertura + fechamento)
            double openScale = 0.3 + 0.7 * EaseOutCubic(_openProgress);
            double closeScale = _isClosing ? (1.0 - EaseOutQuad(_closeProgress) * 0.5) : 1.0;
            double scaleFactor = openScale * closeScale;

            double openOpacity = Math.Min(1.0, _openProgress * 3.0);
            double closeOpacity = _isClosing ? (1.0 - EaseOutQuad(_closeProgress)) : 1.0;
            double globalOpacity = openOpacity * closeOpacity;

            dc.PushOpacity(globalOpacity);

            // ── 1. Fundo circular ──
            dc.DrawEllipse(
                new SolidColorBrush(Color.FromArgb(40, DarkBg.R, DarkBg.G, DarkBg.B)),
                null, new Point(Cx, Cy), _outerR * scaleFactor, _outerR * scaleFactor);

            // ── 2. LED Glow ──
            PaintLedGlow(dc, scaleFactor);

            // ── 3. Ghost rings ──
            PaintGhostRings(dc, scaleFactor);

            // ── 4. Active slices (com stagger) ──
            int count = _items.Count;
            for (int i = 0; i < count; i++)
            {
                // Stagger: cada fatia atrasa 25ms
                double staggerDelay = i * 25.0 / OPEN_DURATION_MS;
                double sliceProgress = Math.Clamp((_openProgress - staggerDelay) / (1.0 - staggerDelay), 0, 1);
                double sliceScale = 0.3 + 0.7 * EaseOutBack(sliceProgress);

                if (sliceProgress > 0.01)
                    PaintSlice(dc, i, count, sliceScale);
            }

            // ── 5. Inner ring separador ──
            dc.DrawEllipse(null,
                new Pen(new SolidColorBrush(Color.FromArgb(30, 60, 80, 120)), 1.0),
                new Point(Cx, Cy), _innerR * scaleFactor + 1, _innerR * scaleFactor + 1);

            // ── 6. Center button ──
            PaintCenter(dc, scaleFactor);

            // ── 7. Submenu inline ──
            if (_submenuParentIdx >= 0 && _submenuProgress > 0.01)
                PaintSubmenuRing(dc);

            // ── 8. Tooltip ──
            if (_tooltipVisible && _tooltipOpacity > 0.01)
                PaintTooltip(dc);

            // ── 9. Context Menu ──
            PaintContextMenu(dc);

            dc.Pop(); // globalOpacity
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[render] ERRO em OnRender: {ex.Message}");
        }
    }

    // ═══════════════════════════════════════════════════════
    //  LED GLOW — Soft Dot-Cloud
    // ═══════════════════════════════════════════════════════
    private void PaintLedGlow(DrawingContext dc, double scaleFactor)
    {
        double OR = _outerR * scaleFactor;
        double ringR = OR + 8;
        double tailLen = 0.32;

        // Anel principal
        PaintSoftDots(dc, ringR, dotR: 14.0, count: 180, maxAlpha: 55, tailLen: tailLen);
        PaintSoftDots(dc, ringR, dotR: 6.0, count: 220, maxAlpha: 150, tailLen: tailLen * 0.85);

        // ── Glow expandido pro submenu ──
        if (_submenuParentIdx >= 0 && _submenuProgress > 0.05)
        {
            double subProgress = EaseOutQuad(_submenuProgress);
            double subOuterR = _outerR + SUBMENU_GAP + SUBMENU_RING_WIDTH * subProgress;
            double subRingR = subOuterR + 6;
            byte subAlpha = (byte)(55 * _submenuProgress);
            byte subAlphaCore = (byte)(120 * _submenuProgress);

            PaintSoftDots(dc, subRingR, dotR: 10.0, count: 140, maxAlpha: subAlpha, tailLen: tailLen);
            PaintSoftDots(dc, subRingR, dotR: 4.0, count: 180, maxAlpha: subAlphaCore, tailLen: tailLen * 0.8);
        }
    }

    private void PaintSoftDots(DrawingContext dc, double ringRadius, double dotR, int count, byte maxAlpha, double tailLen)
    {
        double step = 360.0 / count;

        for (int i = 0; i < count; i++)
        {
            double angle = _glowAngle + i * step;
            double t = i / (double)count;

            double i1 = CometFalloff(t, tailLen);
            double t2 = (t + 0.5) % 1.0;
            double i2 = CometFalloff(t2, tailLen);

            if (i1 < 0.01 && i2 < 0.01) continue;

            double total = i1 + i2;
            double w1 = i1 / Math.Max(0.001, total);
            double w2 = i2 / Math.Max(0.001, total);

            byte r = (byte)(_secondary.R * w1 + _accent.R * w2);
            byte g = (byte)(_secondary.G * w1 + _accent.G * w2);
            byte b = (byte)(_secondary.B * w1 + _accent.B * w2);
            byte a = (byte)Math.Min(255, total * maxAlpha);

            if (a < 3) continue;

            double rad = angle * Math.PI / 180.0;
            var pt = new Point(Cx + ringRadius * Math.Cos(rad), Cy - ringRadius * Math.Sin(rad));

            var centerColor = Color.FromArgb(a, r, g, b);
            var edgeColor = Color.FromArgb(0, r, g, b);
            var brush = new RadialGradientBrush(centerColor, edgeColor)
            {
                Center = new Point(0.5, 0.5),
                GradientOrigin = new Point(0.5, 0.5),
                RadiusX = 0.5, RadiusY = 0.5,
            };

            dc.DrawEllipse(brush, null, pt, dotR, dotR);
        }
    }

    private static double CometFalloff(double dist, double tailLength)
    {
        if (dist > tailLength) return 0;
        double n = dist / tailLength;
        return Math.Pow(1.0 - n, 3.0);
    }

    // ═══════════════════════════════════════════════════════
    //  GHOST RINGS
    // ═══════════════════════════════════════════════════════
    private void PaintGhostRings(DrawingContext dc, double scaleFactor)
    {
        foreach (var level in _ghostLevels)
        {
            dc.PushOpacity(_ghostOpacity);
            int c = level.Count;
            for (int i = 0; i < c; i++)
            {
                var path = GetSlicePath(i, c, scaleFactor);
                var fillColor = SliceBg;
                fillColor.A = (byte)(fillColor.A * _ghostOpacity);
                dc.DrawGeometry(new SolidColorBrush(fillColor), null, path);
            }
            dc.Pop();
        }
    }

    // ═══════════════════════════════════════════════════════
    //  SLICES — glassmorphism 2026
    // ═══════════════════════════════════════════════════════
    private void PaintSlice(DrawingContext dc, int idx, int count, double scaleFactor = 1.0)
    {
        var item = _items[idx];
        bool hov = idx == _hovered;
        bool isSubmenuParent = idx == _submenuParentIdx;
        var path = GetSlicePath(idx, count, scaleFactor);

        // ── Fill ──
        if (hov || isSubmenuParent)
        {
            dc.DrawGeometry(new SolidColorBrush(Color.FromArgb(220, 20, 28, 50)), null, path);
            dc.DrawGeometry(new SolidColorBrush(SliceHover), null, path);
        }
        else
        {
            dc.DrawGeometry(new SolidColorBrush(SliceBg), null, path);
        }

        // ── Border ──
        if (hov || isSubmenuParent)
        {
            dc.DrawGeometry(null,
                new Pen(new SolidColorBrush(Color.FromArgb(35, _accent.R, _accent.G, _accent.B)), 5.0), path);
            dc.DrawGeometry(null,
                new Pen(new SolidColorBrush(Color.FromArgb(220, _accent.R, _accent.G, _accent.B)), 1.8), path);
        }
        else
        {
            dc.DrawGeometry(null,
                new Pen(new SolidColorBrush(Color.FromArgb(90, _accent.R, _accent.G, _accent.B)), 1.5), path);
        }

        // ── Content ──
        var pos = SliceCenter(idx, count, scaleFactor);
        PaintContent(dc, item, pos, hov || isSubmenuParent, scaleFactor);

        // ── Submenu indicator ──
        if (item.HasChildren)
            PaintSubmenuDot(dc, idx, count, scaleFactor);
    }

    // ═══════════════════════════════════════════════════════
    //  SUBMENU INLINE — anel externo
    // ═══════════════════════════════════════════════════════
    private void PaintSubmenuRing(DrawingContext dc)
    {
        int subCount = _submenuItems.Count;
        int parentCount = _items.Count;
        double progress = EaseOutQuad(_submenuProgress);

        dc.PushOpacity(_submenuProgress);

        for (int i = 0; i < subCount; i++)
        {
            var subPath = GetSubmenuSlicePath(i, subCount, _submenuParentIdx, parentCount, progress);
            if (subPath.Figures.Count == 0) continue;

            bool hov = i == _submenuHovered;

            // Fill
            if (hov)
            {
                dc.DrawGeometry(new SolidColorBrush(Color.FromArgb(220, 20, 28, 50)), null, subPath);
                dc.DrawGeometry(new SolidColorBrush(SliceHover), null, subPath);
            }
            else
            {
                dc.DrawGeometry(new SolidColorBrush(Color.FromArgb(200, 16, 19, 32)), null, subPath);
            }

            // Border
            byte borderAlpha = hov ? (byte)220 : (byte)100;
            double borderWidth = hov ? 1.8 : 1.2;
            dc.DrawGeometry(null,
                new Pen(new SolidColorBrush(Color.FromArgb(borderAlpha, _accent.R, _accent.G, _accent.B)), borderWidth),
                subPath);

            // Content (icon + label)
            if (progress > 0.5)
            {
                var pos = SubmenuSliceCenter(i, subCount, _submenuParentIdx, parentCount, progress);
                PaintSubmenuContent(dc, _submenuItems[i], pos, hov);
            }
        }

        dc.Pop();
    }

    private void PaintSubmenuContent(DrawingContext dc, MenuItem item, Point pos, bool hov)
    {
        double iconScale = Math.Max(0.5, item.IconScale);
        int iconSz = Math.Max(8, (int)(20 * iconScale));
        double opacity = hov ? 1.0 : 0.8;
        bool iconDrawn = false;

        double iconTop = pos.Y - iconSz / 2.0 - 4;
        var iconRect = new Rect(pos.X - iconSz / 2.0, iconTop, iconSz, iconSz);

        // ── Renderizar ícone conforme IconMode (mesma lógica do menu pai) ──
        switch (item.IconMode)
        {
            case "auto":
                if (!string.IsNullOrEmpty(item.Target))
                {
                    var appIcon = IconService.GetAppIcon(item.Action, item.Target, iconSz * 2);
                    if (appIcon != null)
                    {
                        dc.PushOpacity(opacity);
                        dc.DrawImage(appIcon, iconRect);
                        dc.Pop();
                        iconDrawn = true;
                    }
                }
                if (!iconDrawn && _svgService != null && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;

            case "svg":
                if (_svgService != null && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;

            case "custom":
                if (!string.IsNullOrEmpty(item.CustomIcon) && File.Exists(item.CustomIcon))
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
                if (!iconDrawn && _svgService != null && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;

            default:
                if (_svgService != null && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;
        }

        // ── Fallback: ícone padrão baseado na ação ──
        if (!iconDrawn && _svgService != null)
        {
            string fallback = GetFallbackIcon(item);
            if (!string.IsNullOrEmpty(fallback))
            {
                _svgService.RenderIcon(dc, fallback, iconRect, opacity * 0.7);
                iconDrawn = true;
            }
        }

        // ── Label (centrado no ponto da fatia) ──
        double maxW = 55;
        var textColor = hov ? TextHov : TextNormal;
        var fmt = new FormattedText(
            item.Label, CultureInfo.InvariantCulture, FlowDirection.LeftToRight,
            new Typeface(new FontFamily("Segoe UI"), FontStyles.Normal,
                hov ? FontWeights.SemiBold : FontWeights.Normal, FontStretches.Normal),
            9.0, new SolidColorBrush(textColor), 96);
        fmt.MaxTextWidth = maxW;
        fmt.TextAlignment = TextAlignment.Center;

        double labelTop = iconDrawn ? iconTop + iconSz + 3 : pos.Y - fmt.Height / 2.0;
        dc.DrawText(fmt, new Point(pos.X - maxW / 2.0, labelTop));
    }

    // ═══════════════════════════════════════════════════════
    //  CONTENT — icon + label (menu principal)
    // ═══════════════════════════════════════════════════════
    private void PaintContent(DrawingContext dc, MenuItem item, Point pos, bool hov, double scaleFactor = 1.0)
    {
        double iconScale = Math.Max(0.5, item.IconScale);
        int iconSz = Math.Max(10, (int)(26 * iconScale * Math.Min(1.0, scaleFactor + 0.3)));
        double opacity = hov ? 1.0 : 0.8;
        bool iconDrawn = false;

        double iconTop = pos.Y - iconSz / 2.0 - 5;
        var iconRect = new Rect(pos.X - iconSz / 2.0, iconTop, iconSz, iconSz);

        switch (item.IconMode)
        {
            case "auto":
                if (!string.IsNullOrEmpty(item.Target))
                {
                    var appIcon = IconService.GetAppIcon(item.Action, item.Target, iconSz * 2);
                    if (appIcon != null)
                    {
                        dc.PushOpacity(opacity);
                        dc.DrawImage(appIcon, iconRect);
                        dc.Pop();
                        iconDrawn = true;
                    }
                }
                if (!iconDrawn && _svgService != null && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;

            case "svg":
                if (_svgService != null && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;

            case "custom":
                if (!string.IsNullOrEmpty(item.CustomIcon) && File.Exists(item.CustomIcon))
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
                if (!iconDrawn && _svgService != null && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;

            default:
                if (_svgService != null && !string.IsNullOrEmpty(item.Icon))
                {
                    _svgService.RenderIcon(dc, item.Icon, iconRect, opacity);
                    iconDrawn = true;
                }
                break;
        }

        // ── Fallback: ícone padrão baseado na ação ──
        if (!iconDrawn && _svgService != null)
        {
            string fallback = GetFallbackIcon(item);
            if (!string.IsNullOrEmpty(fallback))
            {
                _svgService.RenderIcon(dc, fallback, iconRect, opacity * 0.7);
                iconDrawn = true;
            }
        }

        // Label
        var textColor = hov ? TextHov : TextNormal;
        var fmt = new FormattedText(
            item.Label, CultureInfo.InvariantCulture, FlowDirection.LeftToRight,
            new Typeface(new FontFamily("Segoe UI"), FontStyles.Normal,
                hov ? FontWeights.SemiBold : FontWeights.Normal, FontStretches.Normal),
            10.5, new SolidColorBrush(textColor), 96);
        fmt.MaxTextWidth = 70;
        fmt.TextAlignment = TextAlignment.Center;

        double labelTop = iconDrawn ? iconTop + iconSz + 4 : pos.Y - fmt.Height / 2.0;
        dc.DrawText(fmt, new Point(pos.X - 35, labelTop));
    }

    // ═══════════════════════════════════════════════════════
    //  SUBMENU DOT
    // ═══════════════════════════════════════════════════════
    private void PaintSubmenuDot(DrawingContext dc, int idx, int count, double scaleFactor)
    {
        double span = 360.0 / count;
        double ang = (90.0 - span * idx) * Math.PI / 180.0;
        double r = _outerR * scaleFactor - 12;
        var pt = new Point(Cx + r * Math.Cos(ang), Cy - r * Math.Sin(ang));

        dc.DrawEllipse(
            new RadialGradientBrush(Color.FromArgb(50, 255, 220, 60), Colors.Transparent),
            null, pt, 8, 8);
        dc.DrawEllipse(new SolidColorBrush(SubmenuInd), null, pt, 3.5, 3.5);
    }

    // ═══════════════════════════════════════════════════════
    //  CENTER — dashboard 2026
    // ═══════════════════════════════════════════════════════
    private void PaintCenter(DrawingContext dc, double scaleFactor)
    {
        double IR = _innerR * scaleFactor;
        double cx = Cx, cy = Cy;

        var bgBrush = new RadialGradientBrush
        {
            GradientOrigin = new Point(0.45, 0.40),
            Center = new Point(0.5, 0.5),
            RadiusX = 0.7, RadiusY = 0.7,
        };
        bgBrush.GradientStops.Add(new GradientStop(
            _centerHov ? Color.FromArgb(250, 16, 22, 38) : CenterBg, 0.0));
        bgBrush.GradientStops.Add(new GradientStop(CenterEdge, 1.0));
        dc.DrawEllipse(bgBrush, null, new Point(cx, cy), IR - 2, IR - 2);

        double breathIntensity = 0.5 + 0.5 * Math.Sin(_breathPhase);
        byte ringAlpha = _centerHov ? (byte)180 : (byte)(45 + 35 * breathIntensity);
        var ringColor = Color.FromArgb(ringAlpha, _accent.R, _accent.G, _accent.B);

        if (ringAlpha > 30)
        {
            dc.DrawEllipse(null,
                new Pen(new SolidColorBrush(Color.FromArgb((byte)(ringAlpha / 3), _accent.R, _accent.G, _accent.B)), 5.0),
                new Point(cx, cy), IR, IR);
        }
        dc.DrawEllipse(null,
            new Pen(new SolidColorBrush(ringColor), _centerHov ? 2.2 : 1.5),
            new Point(cx, cy), IR - 2, IR - 2);

        // ── Conteúdo do centro: breadcrumb ou dashboard ──
        if (_submenuParentIdx >= 0 && _submenuProgress > 0.3)
        {
            // Breadcrumb: mostra ícone + nome do item pai
            double bcOpacity = Math.Min(1.0, (_submenuProgress - 0.3) / 0.4);
            dc.PushOpacity(bcOpacity);
            PaintBreadcrumb(dc, cx, cy, IR);
            dc.Pop();

            // Dashboard com fade out
            double dashOpacity = Math.Max(0, 1.0 - _submenuProgress * 2.5);
            if (dashOpacity > 0.01)
            {
                dc.PushOpacity(dashOpacity);
                if (_enableMonitoring) PaintDashboard(dc, cx, cy, IR);
                else PaintEscButton(dc, cx, cy);
                dc.Pop();
            }
        }
        else
        {
            if (_enableMonitoring)
                PaintDashboard(dc, cx, cy, IR);
            else
                PaintEscButton(dc, cx, cy);
        }
    }

    private void PaintDashboard(DrawingContext dc, double cx, double cy, double IR)
    {
        var clockFmt = MakeText(_clockText, 19, Color.FromArgb(245, 255, 255, 255), true);
        var dateFmt = MakeText(_dateText, 7.5, Color.FromArgb(120, 200, 210, 230), false);
        var cpuText = $"{_cpuPercent:F0}%";
        var cpuFmt = MakeText(cpuText, 8.5, Color.FromArgb(190, _accent.R, _accent.G, _accent.B), true);

        double gapClockDate = 1.5;
        double gapDateCpu = 5;
        double totalH = clockFmt.Height + gapClockDate + dateFmt.Height + gapDateCpu + cpuFmt.Height;
        double startY = cy - totalH / 2.0;

        dc.DrawText(clockFmt, new Point(cx - clockFmt.Width / 2, startY));
        startY += clockFmt.Height + gapClockDate;

        dc.DrawText(dateFmt, new Point(cx - dateFmt.Width / 2, startY));
        startY += dateFmt.Height + gapDateCpu;

        PaintCpuArc(dc, IR - 8);

        dc.DrawText(cpuFmt, new Point(cx - cpuFmt.Width / 2, startY));
    }

    private void PaintEscButton(DrawingContext dc, double cx, double cy)
    {
        var fmt = MakeText("ESC", 12, Color.FromArgb(180, _accent.R, _accent.G, _accent.B), true);
        dc.DrawText(fmt, new Point(cx - fmt.Width / 2, cy - fmt.Height / 2));
    }

    private void PaintCpuArc(DrawingContext dc, double radius)
    {
        double cx = Cx, cy = Cy;

        dc.DrawEllipse(null,
            new Pen(new SolidColorBrush(Color.FromArgb(18, 255, 255, 255)), 2.0),
            new Point(cx, cy), radius, radius);

        double sweep = Math.Min(360, _cpuPercent / 100.0 * 360);
        if (sweep < 1) return;

        double startAngle = 90;
        var startPt = Pt(startAngle, radius);
        var endPt = Pt(startAngle - sweep, radius);

        var fig = new PathFigure { StartPoint = startPt, IsFilled = false };
        fig.Segments.Add(new ArcSegment(endPt, new Size(radius, radius),
            0, sweep > 180, SweepDirection.Clockwise, true));

        var geo = new PathGeometry(new[] { fig });

        var color = LerpColor(_accent, Color.FromArgb(255, 255, 60, 60), (float)(_cpuPercent / 100.0));

        dc.DrawGeometry(null,
            new Pen(new SolidColorBrush(Color.FromArgb(35, color.R, color.G, color.B)), 6.0)
            { StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round }, geo);

        dc.DrawGeometry(null,
            new Pen(new SolidColorBrush(color), 2.5)
            { StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round }, geo);
    }

    // ═══════════════════════════════════════════════════════
    //  BREADCRUMB — ícone do item pai no centro
    // ═══════════════════════════════════════════════════════
    private void PaintBreadcrumb(DrawingContext dc, double cx, double cy, double IR)
    {
        if (_submenuParentIdx < 0 || _submenuParentIdx >= _items.Count) return;
        var item = _items[_submenuParentIdx];

        // Ícone (pequeno, centralizado acima do label)
        int iconSz = 22;
        double iconTop = cy - iconSz / 2.0 - 8;
        var iconRect = new Rect(cx - iconSz / 2.0, iconTop, iconSz, iconSz);

        bool iconDrawn = false;
        if (item.IconMode == "auto" && !string.IsNullOrEmpty(item.Target))
        {
            var appIcon = IconService.GetAppIcon(item.Action, item.Target, iconSz * 2);
            if (appIcon != null)
            {
                dc.DrawImage(appIcon, iconRect);
                iconDrawn = true;
            }
        }
        if (!iconDrawn && _svgService != null)
        {
            string svgName = !string.IsNullOrEmpty(item.Icon) ? item.Icon : GetFallbackIcon(item);
            _svgService.RenderIcon(dc, svgName, iconRect, 0.9);
        }

        // Label do item pai
        var labelFmt = MakeText(item.Label, 9.0, Color.FromArgb(200, _accent.R, _accent.G, _accent.B), true);
        dc.DrawText(labelFmt, new Point(cx - labelFmt.Width / 2, iconTop + iconSz + 4));
    }

    // ═══════════════════════════════════════════════════════
    //  TOOLTIP — info do item ao hover
    // ═══════════════════════════════════════════════════════
    private void PaintTooltip(DrawingContext dc)
    {
        MenuItem? item = null;
        Point anchor;

        if (_isSubmenuTooltip && _tooltipIdx >= 0 && _tooltipIdx < _submenuItems.Count)
        {
            item = _submenuItems[_tooltipIdx];
            double progress = EaseOutQuad(_submenuProgress);
            anchor = SubmenuSliceCenter(_tooltipIdx, _submenuItems.Count, _submenuParentIdx, _items.Count, progress);
        }
        else if (!_isSubmenuTooltip && _tooltipIdx >= 0 && _tooltipIdx < _items.Count)
        {
            item = _items[_tooltipIdx];
            anchor = SliceCenter(_tooltipIdx, _items.Count);
        }
        else return;

        if (item == null) return;
        string target = item.Target;
        if (string.IsNullOrEmpty(target)) return;

        // Texto do tooltip
        string actionLabel = item.Action switch
        {
            "run" => "App",
            "url" => "URL",
            "folder" => "Pasta",
            "shortcut" => "Atalho",
            "clipboard_history" => "Clipboard",
            _ => item.Action
        };

        string line1 = item.Label;
        string line2 = $"{actionLabel}: {target}";

        var fmt1 = MakeText(line1, 10, Color.FromArgb(250, 255, 255, 255), true);
        var fmt2 = MakeText(line2, 8.5, Color.FromArgb(170, 200, 210, 230), false);
        fmt2.MaxTextWidth = 200;

        double padH = 10, padV = 7;
        double boxW = Math.Max(fmt1.Width, Math.Min(fmt2.Width, 200)) + padH * 2;
        double boxH = fmt1.Height + fmt2.Height + 3 + padV * 2;

        // Posicionar ao lado da fatia (pra fora do centro)
        double angle = Math.Atan2(-(anchor.Y - Cy), anchor.X - Cx);
        double tooltipDist = 45;
        double tooltipX = anchor.X + tooltipDist * Math.Cos(angle) - boxW / 2;
        double tooltipY = anchor.Y - tooltipDist * Math.Sin(angle) - boxH / 2;

        // Clampar dentro do control
        tooltipX = Math.Clamp(tooltipX, 5, ActualWidth - boxW - 5);
        tooltipY = Math.Clamp(tooltipY, 5, ActualHeight - boxH - 5);

        dc.PushOpacity(_tooltipOpacity);

        // Fundo glassmorphism
        var bgRect = new Rect(tooltipX, tooltipY, boxW, boxH);
        dc.DrawRoundedRectangle(
            new SolidColorBrush(Color.FromArgb(230, 18, 20, 32)), null,
            bgRect, 8, 8);

        // Borda accent
        dc.DrawRoundedRectangle(null,
            new Pen(new SolidColorBrush(Color.FromArgb(120, _accent.R, _accent.G, _accent.B)), 1.0),
            bgRect, 8, 8);

        // Textos
        dc.DrawText(fmt1, new Point(tooltipX + padH, tooltipY + padV));
        dc.DrawText(fmt2, new Point(tooltipX + padH, tooltipY + padV + fmt1.Height + 3));

        dc.Pop();
    }

    private void ShowTooltip(int idx, bool isSubmenu)
    {
        _tooltipTimer?.Stop();
        _tooltipIdx = idx;
        _isSubmenuTooltip = isSubmenu;
        _tooltipTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(TOOLTIP_DELAY_MS) };
        _tooltipTimer.Tick += (_, _) =>
        {
            _tooltipTimer!.Stop();
            _tooltipVisible = true;
            _tooltipOpacity = 0;
            _tooltipShowTime = DateTime.UtcNow;
        };
        _tooltipTimer.Start();
    }

    private void HideTooltip()
    {
        _tooltipTimer?.Stop();
        _tooltipVisible = false;
        _tooltipOpacity = 0;
        _tooltipIdx = -1;
    }

    // ═══════════════════════════════════════════════════════
    //  CONTEXT MENU — right-click popup
    // ═══════════════════════════════════════════════════════
    private void PaintContextMenu(DrawingContext dc)
    {
        if (!_contextMenuVisible || _contextProgress < 0.01) return;

        double scale = EaseOutBack(_contextProgress);
        double opacity = Math.Min(1.0, _contextProgress * 2.0);

        double itemH = 28;
        double padH = 14, padV = 6;
        double boxW = 130;
        double boxH = ContextOptions.Length * itemH + padV * 2;

        double x = _contextMenuPos.X;
        double y = _contextMenuPos.Y;

        // Clampar
        x = Math.Clamp(x, 5, ActualWidth - boxW - 5);
        y = Math.Clamp(y, 5, ActualHeight - boxH - 5);

        dc.PushOpacity(opacity);
        dc.PushTransform(new ScaleTransform(scale, scale, x + boxW / 2, y));

        // Fundo
        var bgRect = new Rect(x, y, boxW, boxH);
        dc.DrawRoundedRectangle(
            new SolidColorBrush(Color.FromArgb(240, 18, 20, 32)), null,
            bgRect, 10, 10);
        dc.DrawRoundedRectangle(null,
            new Pen(new SolidColorBrush(Color.FromArgb(100, _accent.R, _accent.G, _accent.B)), 1.0),
            bgRect, 10, 10);

        // Opções
        for (int i = 0; i < ContextOptions.Length; i++)
        {
            double iy = y + padV + i * itemH;
            bool hov = i == _contextHovered;

            if (hov)
            {
                dc.DrawRoundedRectangle(
                    new SolidColorBrush(Color.FromArgb(50, _accent.R, _accent.G, _accent.B)), null,
                    new Rect(x + 4, iy, boxW - 8, itemH), 6, 6);
            }

            var color = hov ? TextHov : TextNormal;
            // Cor vermelha para "Remover"
            if (i == 3) color = hov ? Color.FromArgb(255, 255, 80, 80) : Color.FromArgb(200, 255, 100, 100);

            var fmt = MakeText(ContextOptions[i], 10.5, color, hov);
            dc.DrawText(fmt, new Point(x + padH, iy + (itemH - fmt.Height) / 2));
        }

        dc.Pop(); // transform
        dc.Pop(); // opacity
    }

    private void ShowContextMenu(int itemIdx, Point pos)
    {
        _contextMenuIdx = itemIdx;
        _contextMenuPos = pos;
        _contextMenuVisible = true;
        _contextProgress = 0;
        _contextAnimStart = DateTime.UtcNow;
        _contextHovered = -1;
        HideTooltip();
    }

    private void HideContextMenu()
    {
        _contextMenuVisible = false;
        _contextMenuIdx = -1;
        _contextHovered = -1;
    }

    private Rect GetContextMenuRect()
    {
        double itemH = 28;
        double padV = 6;
        double boxW = 130;
        double boxH = ContextOptions.Length * itemH + padV * 2;
        double x = Math.Clamp(_contextMenuPos.X, 5, ActualWidth - boxW - 5);
        double y = Math.Clamp(_contextMenuPos.Y, 5, ActualHeight - boxH - 5);
        return new Rect(x, y, boxW, boxH);
    }

    private int HitTestContextMenu(Point pos)
    {
        var rect = GetContextMenuRect();
        if (!rect.Contains(pos)) return -1;
        double padV = 6;
        double itemH = 28;
        int idx = (int)((pos.Y - rect.Y - padV) / itemH);
        return (idx >= 0 && idx < ContextOptions.Length) ? idx : -1;
    }

    private void HandleContextClick(int optionIdx)
    {
        if (_contextMenuIdx < 0 || _contextMenuIdx >= _items.Count) return;
        var item = _items[_contextMenuIdx];
        int idx = _contextMenuIdx;
        HideContextMenu();

        switch (optionIdx)
        {
            case 0: EditRequested?.Invoke(item); break;      // Editar
            case 1: MoveRequested?.Invoke(idx, -1); break;   // Mover Cima
            case 2: MoveRequested?.Invoke(idx, 1); break;    // Mover Baixo
            case 3: RemoveRequested?.Invoke(idx); break;     // Remover
        }
    }

    // ═══════════════════════════════════════════════════════
    //  SUBMENU LOGIC (open / close)
    // ═══════════════════════════════════════════════════════
    private void RequestOpenSubmenu(int parentIdx)
    {
        if (parentIdx < 0 || parentIdx >= _items.Count) return;
        var item = _items[parentIdx];
        if (!item.HasChildren) return;

        // Cancelar close pendente
        _submenuCloseTimer?.Stop();

        // Se já está mostrando este submenu, nada a fazer
        if (_submenuParentIdx == parentIdx && !_submenuClosing) return;

        _pendingSubmenuIdx = parentIdx;
        _submenuOpenTimer?.Stop();
        _submenuOpenTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(SUBMENU_HOVER_DELAY_MS) };
        _submenuOpenTimer.Tick += (_, _) =>
        {
            _submenuOpenTimer!.Stop();
            OpenSubmenu(_pendingSubmenuIdx);
        };
        _submenuOpenTimer.Start();
    }

    private void OpenSubmenu(int parentIdx)
    {
        if (parentIdx < 0 || parentIdx >= _items.Count) return;
        var item = _items[parentIdx];
        if (!item.HasChildren) return;

        _submenuParentIdx = parentIdx;
        _submenuItems = item.Children!.Take(MAX_SUBMENU_ITEMS).ToList();
        _submenuHovered = -1;
        _submenuProgress = 0.0;
        _submenuOpening = true;
        _submenuClosing = false;
        _submenuAnimStart = DateTime.UtcNow;
    }

    private void RequestCloseSubmenu()
    {
        _submenuOpenTimer?.Stop();

        if (_submenuParentIdx < 0) return;

        _submenuCloseTimer?.Stop();
        _submenuCloseTimer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(SUBMENU_CLOSE_DELAY_MS) };
        _submenuCloseTimer.Tick += (_, _) =>
        {
            _submenuCloseTimer!.Stop();
            CloseSubmenu();
        };
        _submenuCloseTimer.Start();
    }

    private void CloseSubmenu()
    {
        _submenuOpenTimer?.Stop();
        _submenuCloseTimer?.Stop();

        if (_submenuParentIdx < 0) return;

        _submenuClosing = true;
        _submenuOpening = false;
        _submenuAnimStart = DateTime.UtcNow;
    }

    private void CancelSubmenuClose()
    {
        _submenuCloseTimer?.Stop();
        if (_submenuClosing)
        {
            // Reverter fechamento → reabrir
            _submenuClosing = false;
            _submenuOpening = true;
            _submenuAnimStart = DateTime.UtcNow - TimeSpan.FromMilliseconds(_submenuProgress * SUBMENU_OPEN_MS);
        }
    }

    // ═══════════════════════════════════════════════════════
    //  MOUSE (hit-test)
    // ═══════════════════════════════════════════════════════
    protected override void OnMouseMove(System.Windows.Input.MouseEventArgs e)
    {
        var pos = e.GetPosition(this);
        double dist = Distance(pos, new Point(Cx, Cy));
        int oldH = _hovered;
        bool oldCH = _centerHov;
        int oldSubH = _submenuHovered;

        // ── Context menu hover (prioridade máxima) ──
        if (_contextMenuVisible)
        {
            _contextHovered = HitTestContextMenu(pos);
            InvalidateVisual();
            return;
        }

        _centerHov = dist < _innerR;
        _hovered = -1;
        _submenuHovered = -1;

        // ── Hit-test submenu (anel externo) primeiro ──
        bool inSubmenu = false;
        if (_submenuParentIdx >= 0 && _submenuProgress > 0.3)
        {
            double subInnerR = _outerR + SUBMENU_GAP;
            double subOuterR = subInnerR + SUBMENU_RING_WIDTH * EaseOutQuad(_submenuProgress);

            if (dist > subInnerR - 5 && dist < subOuterR + 5)
            {
                int subCount = _submenuItems.Count;
                for (int i = 0; i < subCount; i++)
                {
                    var subPath = GetSubmenuSlicePath(i, subCount, _submenuParentIdx, _items.Count, EaseOutQuad(_submenuProgress));
                    if (subPath.Figures.Count > 0 && subPath.FillContains(pos))
                    {
                        _submenuHovered = i;
                        inSubmenu = true;
                        CancelSubmenuClose();
                        break;
                    }
                }
            }
        }

        // ── Hit-test menu principal ──
        if (!inSubmenu && dist > _innerR && dist < _outerR)
        {
            int count = _items.Count;
            for (int i = 0; i < count; i++)
            {
                if (GetSlicePath(i, count).FillContains(pos))
                {
                    _hovered = i;
                    break;
                }
            }
        }

        // ── Submenu hover logic ──
        if (_hovered >= 0 && _items[_hovered].HasChildren)
        {
            // Hovering um item com children → abrir submenu
            if (_submenuParentIdx != _hovered)
                RequestOpenSubmenu(_hovered);
            else
                CancelSubmenuClose();
        }
        else if (_hovered >= 0 && !_items[_hovered].HasChildren)
        {
            // Hovering um item SEM children → fechar submenu
            if (_submenuParentIdx >= 0 && !inSubmenu)
                RequestCloseSubmenu();
        }
        else if (_hovered < 0 && !inSubmenu && !_centerHov)
        {
            // Fora de tudo → fechar submenu
            if (_submenuParentIdx >= 0)
                RequestCloseSubmenu();
        }
        // ── Tooltip management ──
        if (_hovered >= 0 && !_isSubmenuTooltip && _hovered != _tooltipIdx)
        {
            HideTooltip();
            ShowTooltip(_hovered, false);
        }
        else if (_submenuHovered >= 0 && (_isSubmenuTooltip ? _submenuHovered != _tooltipIdx : true))
        {
            HideTooltip();
            ShowTooltip(_submenuHovered, true);
        }
        else if (_hovered < 0 && _submenuHovered < 0)
        {
            HideTooltip();
        }

        Cursor = (_hovered >= 0 || _centerHov || _submenuHovered >= 0)
            ? System.Windows.Input.Cursors.Hand
            : System.Windows.Input.Cursors.Arrow;

        if (oldH != _hovered || oldCH != _centerHov || oldSubH != _submenuHovered)
            InvalidateVisual();
    }

    protected override void OnMouseDown(System.Windows.Input.MouseButtonEventArgs e)
    {
        var pos = e.GetPosition(this);
        double dist = Distance(pos, new Point(Cx, Cy));

        if (e.ChangedButton == System.Windows.Input.MouseButton.Left)
        {
            HideTooltip();

            // ── Context menu click ──
            if (_contextMenuVisible)
            {
                int opt = HitTestContextMenu(pos);
                if (opt >= 0)
                    HandleContextClick(opt);
                else
                    HideContextMenu();
                InvalidateVisual();
                return;
            }

            // ── Clique no submenu ──
            if (_submenuHovered >= 0 && _submenuHovered < _submenuItems.Count)
            {
                var item = _submenuItems[_submenuHovered];
                SubItemClicked?.Invoke(item);
                return;
            }

            // ── Clique no centro ──
            if (dist < _innerR)
            {
                BackClicked?.Invoke();
                return;
            }

            // ── Clique em fatia do menu principal ──
            if (dist > _innerR && dist < _outerR)
            {
                int count = _items.Count;
                for (int i = 0; i < count; i++)
                {
                    if (GetSlicePath(i, count).FillContains(pos))
                    {
                        var item = _items[i];
                        if (item.HasChildren)
                        {
                            // Clique em item com submenu → abre submenu imediatamente
                            OpenSubmenu(i);
                        }
                        else
                        {
                            ItemClicked?.Invoke(item);
                        }
                        return;
                    }
                }
            }

            CloseRequested?.Invoke();
        }
        else if (e.ChangedButton == System.Windows.Input.MouseButton.Right)
        {
            HideTooltip();
            HideContextMenu();

            // Right-click em fatia do menu principal → context menu
            if (dist > _innerR && dist < _outerR)
            {
                int count = _items.Count;
                for (int i = 0; i < count; i++)
                {
                    if (GetSlicePath(i, count).FillContains(pos))
                    {
                        ShowContextMenu(i, pos);
                        InvalidateVisual();
                        return;
                    }
                }
            }
        }
    }

    protected override void OnMouseLeave(System.Windows.Input.MouseEventArgs e)
    {
        _hovered = -1;
        _centerHov = false;
        _submenuHovered = -1;
        Cursor = System.Windows.Input.Cursors.Arrow;
        HideTooltip();

        if (_submenuParentIdx >= 0)
            RequestCloseSubmenu();

        InvalidateVisual();
    }

    // ═══════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════
    private static FormattedText MakeText(string text, double size, Color color, bool bold)
    {
        var fmt = new FormattedText(
            text, CultureInfo.InvariantCulture, FlowDirection.LeftToRight,
            new Typeface(new FontFamily("Segoe UI"), FontStyles.Normal,
                bold ? FontWeights.SemiBold : FontWeights.Normal, FontStretches.Normal),
            size, new SolidColorBrush(color), 96);
        return fmt;
    }

    /// <summary>Ícone SVG padrão baseado na ação do item (último fallback).</summary>
    private static string GetFallbackIcon(MenuItem item)
    {
        // Se o item já tem um ícone SVG definido, usar ele
        if (!string.IsNullOrEmpty(item.Icon)) return item.Icon;

        // Mapear ação → ícone padrão
        return item.Action switch
        {
            "url" => "globe",
            "run" => "terminal",
            "folder" => "folder",
            "clipboard_history" => "clipboard",
            "settings" => "settings",
            "power" => "power",
            _ => "grid"
        };
    }

    private static double Distance(Point a, Point b)
        => Math.Sqrt((a.X - b.X) * (a.X - b.X) + (a.Y - b.Y) * (a.Y - b.Y));

    private static Color LerpColor(Color a, Color b, double t)
    {
        t = Math.Clamp(t, 0, 1);
        return Color.FromArgb(
            (byte)(a.A + (b.A - a.A) * t),
            (byte)(a.R + (b.R - a.R) * t),
            (byte)(a.G + (b.G - a.G) * t),
            (byte)(a.B + (b.B - a.B) * t));
    }
}
