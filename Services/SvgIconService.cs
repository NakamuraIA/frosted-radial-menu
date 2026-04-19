// Services/SvgIconService.cs — Carrega e renderiza SVGs Lucide como DrawingImage.
using System;
using System.Collections.Generic;
using System.IO;
using System.Windows;
using System.Windows.Media;

namespace MenuRadialCS.Services;

/// <summary>Carrega SVGs Lucide e renderiza como WPF DrawingImage.</summary>
public class SvgIconService
{
    private readonly string _iconsDir;
    private readonly Dictionary<string, Drawing?> _cache = new();

    public SvgIconService(string iconsDir)
    {
        _iconsDir = iconsDir;
    }

    /// <summary>Renderiza um ícone SVG no DrawingContext.</summary>
    public void RenderIcon(DrawingContext dc, string iconName, Rect rect, double opacity = 1.0)
    {
        if (string.IsNullOrEmpty(iconName)) return;
        var drawing = GetDrawing(iconName);
        if (drawing == null) return;

        dc.PushOpacity(opacity);
        dc.PushTransform(new TranslateTransform(rect.X, rect.Y));
        dc.PushTransform(new ScaleTransform(
            rect.Width / drawing.Bounds.Width,
            rect.Height / drawing.Bounds.Height,
            0, 0));
        // Offset para que o desenho comece em (0,0)
        dc.PushTransform(new TranslateTransform(-drawing.Bounds.X, -drawing.Bounds.Y));
        dc.DrawDrawing(drawing);
        dc.Pop(); // translate bounds
        dc.Pop(); // scale
        dc.Pop(); // translate rect
        dc.Pop(); // opacity
    }

    private Drawing? GetDrawing(string iconName)
    {
        if (_cache.TryGetValue(iconName, out var cached))
            return cached;

        var clean = iconName.Replace(".svg", "");
        var path = Path.Combine(_iconsDir, $"{clean}.svg");
        if (!File.Exists(path))
        {
            _cache[iconName] = null;
            return null;
        }

        try
        {
            var svg = File.ReadAllText(path);
            var drawing = ParseSimpleSvg(svg);
            _cache[iconName] = drawing;
            return drawing;
        }
        catch
        {
            _cache[iconName] = null;
            return null;
        }
    }

    /// <summary>
    /// Minimal SVG parser for Lucide icons (simple paths with stroke).
    /// Lucide icons are 24x24 viewBox with stroke=currentColor.
    /// </summary>
    private static Drawing? ParseSimpleSvg(string svg)
    {
        var group = new DrawingGroup();
        var whitePen = new Pen(Brushes.White, 2) { LineJoin = PenLineJoin.Round, StartLineCap = PenLineCap.Round, EndLineCap = PenLineCap.Round };

        // Parse viewBox
        double vbW = 24, vbH = 24;

        // Extract all path d="..." and basic shapes
        var idx = 0;
        while (idx < svg.Length)
        {
            // Find <path, <circle, <rect, <line, <polyline, <polygon
            var tagStart = svg.IndexOf('<', idx);
            if (tagStart < 0) break;
            var tagEnd = svg.IndexOf('>', tagStart);
            if (tagEnd < 0) break;

            var tag = svg.Substring(tagStart, tagEnd - tagStart + 1);
            idx = tagEnd + 1;

            if (tag.StartsWith("<path"))
            {
                var d = ExtractAttr(tag, "d");
                if (!string.IsNullOrEmpty(d))
                {
                    try
                    {
                        var geo = Geometry.Parse(d);
                        var hasStroke = !tag.Contains("fill=\"none\"") || tag.Contains("stroke=");
                        var hasFill = ExtractAttr(tag, "fill");
                        
                        Brush? fillBrush = null;
                        Pen? strokePen = null;
                        
                        if (string.IsNullOrEmpty(hasFill) || hasFill == "none" || hasFill == "currentColor")
                        {
                            // Lucide default: no fill, stroke white
                            fillBrush = null;
                            strokePen = whitePen;
                        }
                        else
                        {
                            fillBrush = Brushes.White;
                        }
                        
                        if (tag.Contains("fill=\"currentColor\"") || tag.Contains("fill='currentColor'"))
                            fillBrush = Brushes.White;

                        group.Children.Add(new GeometryDrawing(fillBrush, strokePen, geo));
                    }
                    catch { /* skip invalid paths */ }
                }
            }
            else if (tag.StartsWith("<circle"))
            {
                var cx = ParseDouble(ExtractAttr(tag, "cx"));
                var cy = ParseDouble(ExtractAttr(tag, "cy"));
                var r = ParseDouble(ExtractAttr(tag, "r"));
                if (r > 0)
                {
                    var geo = new EllipseGeometry(new Point(cx, cy), r, r);
                    group.Children.Add(new GeometryDrawing(null, whitePen, geo));
                }
            }
            else if (tag.StartsWith("<rect") && !tag.StartsWith("<rect "))
            {
                // skip
            }
            else if (tag.StartsWith("<line"))
            {
                var x1 = ParseDouble(ExtractAttr(tag, "x1"));
                var y1 = ParseDouble(ExtractAttr(tag, "y1"));
                var x2 = ParseDouble(ExtractAttr(tag, "x2"));
                var y2 = ParseDouble(ExtractAttr(tag, "y2"));
                var geo = new LineGeometry(new Point(x1, y1), new Point(x2, y2));
                group.Children.Add(new GeometryDrawing(null, whitePen, geo));
            }
            else if (tag.StartsWith("<polyline"))
            {
                var points = ExtractAttr(tag, "points");
                if (!string.IsNullOrEmpty(points))
                {
                    try
                    {
                        var pc = PointCollection.Parse(points);
                        if (pc.Count > 1)
                        {
                            var fig = new PathFigure { StartPoint = pc[0], IsClosed = false, IsFilled = false };
                            for (int i = 1; i < pc.Count; i++)
                                fig.Segments.Add(new LineSegment(pc[i], true));
                            var geo = new PathGeometry(new[] { fig });
                            group.Children.Add(new GeometryDrawing(null, whitePen, geo));
                        }
                    }
                    catch { }
                }
            }
            else if (tag.StartsWith("<polygon"))
            {
                var points = ExtractAttr(tag, "points");
                if (!string.IsNullOrEmpty(points))
                {
                    try
                    {
                        var pc = PointCollection.Parse(points);
                        if (pc.Count > 1)
                        {
                            var fig = new PathFigure { StartPoint = pc[0], IsClosed = true, IsFilled = false };
                            for (int i = 1; i < pc.Count; i++)
                                fig.Segments.Add(new LineSegment(pc[i], true));
                            var geo = new PathGeometry(new[] { fig });
                            group.Children.Add(new GeometryDrawing(null, whitePen, geo));
                        }
                    }
                    catch { }
                }
            }
        }

        if (group.Children.Count == 0) return null;

        // Set the bounds to 24x24 (Lucide standard)
        group.ClipGeometry = new RectangleGeometry(new Rect(0, 0, vbW, vbH));
        group.Freeze();
        return group;
    }

    private static string ExtractAttr(string tag, string attrName)
    {
        var search = attrName + "=\"";
        var start = tag.IndexOf(search, StringComparison.OrdinalIgnoreCase);
        if (start < 0)
        {
            search = attrName + "='";
            start = tag.IndexOf(search, StringComparison.OrdinalIgnoreCase);
            if (start < 0) return "";
        }
        start += search.Length;
        var end = tag.IndexOf(search.EndsWith("\"") ? '"' : '\'', start);
        return end > start ? tag.Substring(start, end - start) : "";
    }

    private static double ParseDouble(string s)
        => double.TryParse(s, System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var v) ? v : 0;
}
