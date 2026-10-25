//! Posicionamento da janela do menu em relação ao cursor.
//!
//! Usa a API do Tauri (multiplataforma) em vez de `GetCursorPos`, então o mesmo
//! código vale para Windows, Linux e macOS.

use tauri::{PhysicalPosition, WebviewWindow};

/// Posição atual do cursor em coordenadas físicas globais.
pub fn current_cursor_position(window: &WebviewWindow) -> PhysicalPosition<i32> {
    match window.cursor_position() {
        Ok(position) => PhysicalPosition::new(
            position.x.round() as i32,
            position.y.round() as i32,
        ),
        Err(_) => PhysicalPosition::new(0, 0),
    }
}

/// Mantém a janela inteira dentro do monitor, mesmo quando o cursor está na borda.
pub fn clamp_to_monitor(
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    origin: (i32, i32),
    size: (i32, i32),
) -> (i32, i32) {
    let max_x = origin.0 + size.0 - width;
    let max_y = origin.1 + size.1 - height;
    (
        x.clamp(origin.0, max_x.max(origin.0)),
        y.clamp(origin.1, max_y.max(origin.1)),
    )
}

/// Centraliza a janela no cursor e a mantém visível no monitor mais próximo.
pub fn clamped_window_position(
    window: &WebviewWindow,
    point: PhysicalPosition<i32>,
) -> PhysicalPosition<i32> {
    let size = window.outer_size().ok();
    let width = size.map(|size| size.width as i32).unwrap_or(600);
    let height = size.map(|size| size.height as i32).unwrap_or(600);
    let x = point.x - width / 2;
    let y = point.y - height / 2;

    if let Ok(monitors) = window.available_monitors() {
        if let Some(monitor) = monitors.into_iter().find(|monitor| {
            let position = monitor.position();
            let size = monitor.size();
            point.x >= position.x
                && point.x <= position.x + size.width as i32
                && point.y >= position.y
                && point.y <= position.y + size.height as i32
        }) {
            let position = monitor.position();
            let size = monitor.size();
            let (x, y) = clamp_to_monitor(
                x,
                y,
                width,
                height,
                (position.x, position.y),
                (size.width as i32, size.height as i32),
            );
            return PhysicalPosition { x, y };
        }
    }

    PhysicalPosition { x, y }
}

#[cfg(test)]
mod tests {
    use super::clamp_to_monitor;

    #[test]
    fn keeps_window_inside_the_monitor() {
        // Cursor no canto superior esquerdo, janela 1080x1080 em um monitor 1920x1080.
        let (x, y) = clamp_to_monitor(-535, -540, 1080, 1080, (0, 0), (1920, 1080));
        assert_eq!(x, 0);
        assert_eq!(y, 0);
    }

    #[test]
    fn clamps_to_the_right_and_bottom_edges() {
        let (x, y) = clamp_to_monitor(1500, 900, 1080, 1080, (0, 0), (1920, 1080));
        assert_eq!(x, 840);
        assert_eq!(y, 0);
    }

    #[test]
    fn respects_secondary_monitor_origin() {
        // Janela de 1080x1080 em um monitor 1920x1080 posicionado à esquerda:
        // x válido vai de -1920 a -1080, então -1500 é mantido.
        let (x, y) = clamp_to_monitor(-1500, 100, 1080, 1080, (-1920, 0), (1920, 1080));
        assert_eq!(x, -1500);
        assert_eq!(y, 0);
    }

    #[test]
    fn window_larger_than_monitor_sticks_to_origin() {
        let (x, y) = clamp_to_monitor(500, 500, 3000, 2000, (0, 0), (1920, 1080));
        assert_eq!((x, y), (0, 0));
    }
}
