// Services/IconService.cs — Utilitários de ícone para o Menu Radial.
// Port 1:1 de icon_utils.py
using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Windows;
using System.Windows.Interop;
using System.Windows.Media;
using System.Windows.Media.Imaging;

namespace MenuRadialCS.Services;

/// <summary>Extrai ícones de executáveis/atalhos usando o Shell do Windows.</summary>
public static class IconService
{
    private static readonly Dictionary<string, ImageSource?> Cache = new();

    /// <summary>
    /// Resolve o caminho completo de um executável.
    /// Ex: "notepad.exe" → "C:\Windows\System32\notepad.exe"
    /// </summary>
    public static string ResolveExePath(string target)
    {
        if (string.IsNullOrEmpty(target)) return "";

        // Caminho absoluto que já existe
        if (Path.IsPathRooted(target) && File.Exists(target))
            return target;

        // Tentar via PATH do sistema
        var envPath = Environment.GetEnvironmentVariable("PATH") ?? "";
        foreach (var dir in envPath.Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            var candidate = Path.Combine(dir.Trim(), target);
            if (File.Exists(candidate)) return candidate;
        }

        // Tentar System32, Windows, SysWOW64
        var winRoot = Environment.GetFolderPath(Environment.SpecialFolder.Windows);
        string[] searchDirs = { Path.Combine(winRoot, "System32"), winRoot, Path.Combine(winRoot, "SysWOW64") };
        foreach (var dir in searchDirs)
        {
            var candidate = Path.Combine(dir, target);
            if (File.Exists(candidate)) return candidate;
        }

        return "";
    }

    /// <summary>
    /// Retorna o ícone do sistema para um item do menu.
    /// </summary>
    public static ImageSource? GetAppIcon(string action, string target, int size = 64)
    {
        var cacheKey = $"{action}:{target}:{size}";
        if (Cache.TryGetValue(cacheKey, out var cached))
            return cached;

        var icon = Extract(action, target, size);
        Cache[cacheKey] = icon;
        return icon;
    }

    private static ImageSource? Extract(string action, string target, int size)
    {
        if (action == "url") return null; // Favicon exigiria rede

        string path;
        if (action == "folder")
            path = Directory.Exists(target) ? target : "";
        else if (action is "run" or "script" or "shortcut")
            path = ResolveExePath(target);
        else
            return null;

        if (string.IsNullOrEmpty(path) || (!File.Exists(path) && !Directory.Exists(path)))
            return null;

        try
        {
            var icon = System.Drawing.Icon.ExtractAssociatedIcon(path);
            if (icon == null) return null;

            using var bitmap = icon.ToBitmap();
            var hBitmap = bitmap.GetHbitmap();
            try
            {
                return Imaging.CreateBitmapSourceFromHBitmap(
                    hBitmap, IntPtr.Zero, Int32Rect.Empty,
                    BitmapSizeOptions.FromWidthAndHeight(size, size));
            }
            finally
            {
                DeleteObject(hBitmap);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[icon] Falha ao extrair ícone de '{path}': {ex.Message}");
            return null;
        }
    }

    [System.Runtime.InteropServices.DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr hObject);

    public static void ClearCache() => Cache.Clear();
}
