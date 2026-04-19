// Native/DwmHelper.cs — Correções DWM para transparência real no Windows 10/11.
using System;
using System.Runtime.InteropServices;

namespace MenuRadialCS.Native;

/// <summary>
/// Aplica correções DWM para transparência per-pixel.
/// Port 1:1 do showEvent() em menu_window.py e child_radial.py.
/// </summary>
internal static class DwmHelper
{
    [StructLayout(LayoutKind.Sequential)]
    private struct MARGINS
    {
        public int left, right, top, bottom;
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmExtendFrameIntoClientArea(IntPtr hwnd, ref MARGINS margins);

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    private const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;
    private const int DWMWCP_DONOTROUND = 1;
    private const int DWMWA_SYSTEMBACKDROP_TYPE = 38;
    private const int DWMSBT_NONE = 1;
    private const int DWMWA_MICA_EFFECT = 1029;

    /// <summary>
    /// Aplica todas as correções DWM para a janela overlay:
    /// 1. DwmExtendFrameIntoClientArea(-1,-1,-1,-1) — alpha per-pixel real
    /// 2. DWMWA_SYSTEMBACKDROP_TYPE=NONE — desativa Mica/Acrylic no Win11
    /// 3. DWMWA_MICA_EFFECT=0 — desativa Mica legado
    /// 4. DWMWA_WINDOW_CORNER_PREFERENCE=DONOTROUND — cantos retos
    /// </summary>
    public static void ApplyTransparencyFixes(IntPtr hwnd)
    {
        if (hwnd == IntPtr.Zero) return;

        try
        {
            // 1. Alpha per-pixel real
            var margins = new MARGINS { left = -1, right = -1, top = -1, bottom = -1 };
            DwmExtendFrameIntoClientArea(hwnd, ref margins);

            // 2. Desativar Mica/Acrylic (Win11 22H2+)
            int backdropNone = DWMSBT_NONE;
            DwmSetWindowAttribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, ref backdropNone, sizeof(int));

            // 3. Desativar Mica legado (Win11 pre-22H2)
            int micaOff = 0;
            DwmSetWindowAttribute(hwnd, DWMWA_MICA_EFFECT, ref micaOff, sizeof(int));

            // 4. Cantos retos
            int doNotRound = DWMWCP_DONOTROUND;
            DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, ref doNotRound, sizeof(int));
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[DWM] Aviso: {ex.Message}");
        }
    }
}
