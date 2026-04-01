"""
blur_effect.py — Efeito Acrylic Blur via Win32 API (Windows 10/11).

Usa SetWindowCompositionAttribute (API não-documentada) para ativar
o blur nativo do Desktop Window Manager por trás da janela.
"""

import ctypes
from ctypes import Structure, c_int, POINTER, byref, sizeof

# ── Constantes ──────────────────────────────────────────────
ACCENT_DISABLED = 0
ACCENT_ENABLE_GRADIENT = 1
ACCENT_ENABLE_TRANSPARENTGRADIENT = 2
ACCENT_ENABLE_BLURBEHIND = 3
ACCENT_ENABLE_ACRYLICBLURBEHIND = 4

WCA_ACCENT_POLICY = 19


# ── Estruturas C ────────────────────────────────────────────
class AccentPolicy(Structure):
    _fields_ = [
        ("AccentState", c_int),
        ("AccentFlags", c_int),
        ("GradientColor", c_int),   # Formato ABGR
        ("AnimationId", c_int),
    ]


class WindowCompositionAttributeData(Structure):
    _fields_ = [
        ("Attribute", c_int),
        ("Data", POINTER(AccentPolicy)),
        ("SizeOfData", c_int),
    ]


def _rgba_to_abgr(r: int, g: int, b: int, a: int) -> int:
    """Converte RGBA (0-255) para o formato ABGR usado pela API do Windows."""
    return (a << 24) | (b << 16) | (g << 8) | r


def enable_blur(hwnd: int, tint_color: tuple = (0, 0, 0, 153)):
    """
    Ativa o efeito de blur acrílico na janela.
    
    Args:
        hwnd: Handle da janela (int(widget.winId()))
        tint_color: Tupla (R, G, B, A) com valores 0-255.
                    Default: preto com ~60% de opacidade.
    
    Returns:
        True se o blur foi aplicado com sucesso, False caso contrário.
    """
    try:
        user32 = ctypes.windll.user32
        
        # Verificar se a função existe
        set_window_attr = user32.SetWindowCompositionAttribute
        
        r, g, b, a = tint_color
        abgr = _rgba_to_abgr(r, g, b, a)
        
        accent = AccentPolicy()
        accent.AccentState = ACCENT_ENABLE_ACRYLICBLURBEHIND
        accent.AccentFlags = 2  # ACCENT_FLAG_DRAW_ALL_BORDERS (desativar borda no win)
        accent.GradientColor = abgr
        accent.AnimationId = 0
        
        data = WindowCompositionAttributeData()
        data.Attribute = WCA_ACCENT_POLICY
        data.Data = ctypes.pointer(accent)
        data.SizeOfData = sizeof(accent)
        
        result = set_window_attr(hwnd, byref(data))
        
        if result:
            return True
        
        # Fallback: tentar blur simples (Windows 10 pre-1803)
        accent.AccentState = ACCENT_ENABLE_BLURBEHIND
        accent.GradientColor = abgr
        data.Data = ctypes.pointer(accent)
        
        return bool(set_window_attr(hwnd, byref(data)))
        
    except Exception as e:
        print(f"[blur_effect] Falha ao aplicar blur: {e}")
        print("[blur_effect] Usando fundo semi-transparente como fallback.")
        return False


def disable_blur(hwnd: int):
    """Desativa o efeito de blur na janela."""
    try:
        user32 = ctypes.windll.user32
        
        accent = AccentPolicy()
        accent.AccentState = ACCENT_DISABLED
        
        data = WindowCompositionAttributeData()
        data.Attribute = WCA_ACCENT_POLICY
        data.Data = ctypes.pointer(accent)
        data.SizeOfData = sizeof(accent)
        
        user32.SetWindowCompositionAttribute(hwnd, byref(data))
    except Exception:
        pass
