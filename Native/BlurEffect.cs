// Native/BlurEffect.cs — Efeito Acrylic Blur via SetWindowCompositionAttribute.
// Port 1:1 de blur_effect.py
using System;
using System.Runtime.InteropServices;
using System.Windows.Media;

namespace MenuRadialCS.Native;

/// <summary>
/// Acrylic blur nativo do Windows via API não-documentada SetWindowCompositionAttribute.
/// </summary>
internal static class BlurEffect
{
    private const int ACCENT_DISABLED = 0;
    private const int ACCENT_ENABLE_BLURBEHIND = 3;
    private const int ACCENT_ENABLE_ACRYLICBLURBEHIND = 4;
    private const int WCA_ACCENT_POLICY = 19;

    [StructLayout(LayoutKind.Sequential)]
    private struct AccentPolicy
    {
        public int AccentState;
        public int AccentFlags;
        public int GradientColor; // Formato ABGR
        public int AnimationId;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct WindowCompositionAttributeData
    {
        public int Attribute;
        public IntPtr Data;
        public int SizeOfData;
    }

    [DllImport("user32.dll")]
    private static extern int SetWindowCompositionAttribute(IntPtr hwnd, ref WindowCompositionAttributeData data);

    private static int RgbaToAbgr(byte r, byte g, byte b, byte a)
        => (a << 24) | (b << 16) | (g << 8) | r;

    /// <summary>
    /// Ativa o efeito de blur acrílico na janela.
    /// </summary>
    /// <param name="hwnd">Handle da janela</param>
    /// <param name="tint">Cor de tint (R, G, B, A)</param>
    /// <returns>True se o blur foi aplicado com sucesso</returns>
    public static bool EnableBlur(IntPtr hwnd, Color? tint = null)
    {
        var color = tint ?? Color.FromArgb(153, 0, 0, 0); // ~60% preto
        try
        {
            var accent = new AccentPolicy
            {
                AccentState = ACCENT_ENABLE_ACRYLICBLURBEHIND,
                AccentFlags = 2, // ACCENT_FLAG_DRAW_ALL_BORDERS
                GradientColor = RgbaToAbgr(color.R, color.G, color.B, color.A),
                AnimationId = 0
            };

            var data = new WindowCompositionAttributeData
            {
                Attribute = WCA_ACCENT_POLICY,
                SizeOfData = Marshal.SizeOf<AccentPolicy>()
            };

            var ptr = Marshal.AllocHGlobal(data.SizeOfData);
            try
            {
                Marshal.StructureToPtr(accent, ptr, false);
                data.Data = ptr;

                int result = SetWindowCompositionAttribute(hwnd, ref data);
                if (result != 0) return true;

                // Fallback: blur simples (Win10 pre-1803)
                accent.AccentState = ACCENT_ENABLE_BLURBEHIND;
                Marshal.StructureToPtr(accent, ptr, false);
                return SetWindowCompositionAttribute(hwnd, ref data) != 0;
            }
            finally
            {
                Marshal.FreeHGlobal(ptr);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[BlurEffect] Falha: {ex.Message}");
            return false;
        }
    }

    /// <summary>Desativa o efeito de blur na janela.</summary>
    public static void DisableBlur(IntPtr hwnd)
    {
        try
        {
            var accent = new AccentPolicy { AccentState = ACCENT_DISABLED };
            var data = new WindowCompositionAttributeData
            {
                Attribute = WCA_ACCENT_POLICY,
                SizeOfData = Marshal.SizeOf<AccentPolicy>()
            };

            var ptr = Marshal.AllocHGlobal(data.SizeOfData);
            try
            {
                Marshal.StructureToPtr(accent, ptr, false);
                data.Data = ptr;
                SetWindowCompositionAttribute(hwnd, ref data);
            }
            finally
            {
                Marshal.FreeHGlobal(ptr);
            }
        }
        catch { /* ignore */ }
    }
}
