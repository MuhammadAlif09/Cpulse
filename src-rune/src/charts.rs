// charts.rs — Zero-atlas GPU vector charts & gauges powered by rune::Shape and rune::canvas
//
// Renders 60-second real-time CPU, RAM, Disk I/O, and Network area charts, the
// System Health Radial Gauge, and the Monthly Freed Space Bar Chart directly
// on the GPU every frame with zero DOM/WebView overhead.

use rune::*;

/// Renders a real-time area waveform chart using `rune::Shape` and `rune::canvas`.
pub fn area_chart<S>(
    samples: &[f32],
    max_val: f32,
    width: f32,
    height: f32,
    stroke_color: Color,
    fill_color: Color,
    grid_color: Color,
) -> El<S> {
    let w = width.max(120.0);
    let h = height.max(60.0);
    let max_v = max_val.max(1.0);

    let mut shape = Shape::new().view_box(w, h);

    // Subtle horizontal grid lines at 25%, 50%, 75%
    for frac in [0.25f32, 0.50, 0.75] {
        let y = h * frac;
        shape = shape.line((0.0, y), (w, y), 1.0, grid_color);
    }

    if samples.len() >= 2 {
        let n = samples.len();
        let step_x = w / ((n - 1) as f32);

        let mut line_pts: Vec<(f32, f32)> = Vec::with_capacity(n);
        let mut poly_pts: Vec<(f32, f32)> = Vec::with_capacity(n + 2);

        poly_pts.push((0.0, h));
        for (i, &val) in samples.iter().enumerate() {
            let x = (i as f32) * step_x;
            let norm = (val / max_v).clamp(0.0, 1.0);
            let y = h - norm * (h - 8.0) - 4.0;
            line_pts.push((x, y));
            poly_pts.push((x, y));
        }
        poly_pts.push((w, h));

        shape = shape
            .fill(poly_pts, fill_color)
            .stroke(line_pts.clone(), 2.0, stroke_color);

        if let Some(&(last_x, last_y)) = line_pts.last() {
            shape = shape.circle((last_x, last_y), 3.5, stroke_color);
        }
    }

    canvas(shape).w_full().h(h)
}

/// Renders a dual-series area chart (e.g., Disk Read/Write or Network Down/Up).
pub fn dual_area_chart<S>(
    primary: &[f32],
    secondary: &[f32],
    max_val: f32,
    width: f32,
    height: f32,
    primary_stroke: Color,
    primary_fill: Color,
    secondary_stroke: Color,
    grid_color: Color,
) -> El<S> {
    let w = width.max(120.0);
    let h = height.max(60.0);
    let max_v = max_val.max(1.0);

    let mut shape = Shape::new().view_box(w, h);

    for frac in [0.25f32, 0.50, 0.75] {
        let y = h * frac;
        shape = shape.line((0.0, y), (w, y), 1.0, grid_color);
    }

    if primary.len() >= 2 {
        let n = primary.len();
        let step_x = w / ((n - 1) as f32);
        let mut line_pts = Vec::with_capacity(n);
        let mut poly_pts = Vec::with_capacity(n + 2);
        poly_pts.push((0.0, h));
        for (i, &val) in primary.iter().enumerate() {
            let x = (i as f32) * step_x;
            let norm = (val / max_v).clamp(0.0, 1.0);
            let y = h - norm * (h - 8.0) - 4.0;
            line_pts.push((x, y));
            poly_pts.push((x, y));
        }
        poly_pts.push((w, h));
        shape = shape
            .fill(poly_pts, primary_fill)
            .stroke(line_pts, 2.0, primary_stroke);
    }

    if secondary.len() >= 2 {
        let n = secondary.len();
        let step_x = w / ((n - 1) as f32);
        let mut line_pts = Vec::with_capacity(n);
        for (i, &val) in secondary.iter().enumerate() {
            let x = (i as f32) * step_x;
            let norm = (val / max_v).clamp(0.0, 1.0);
            let y = h - norm * (h - 8.0) - 4.0;
            line_pts.push((x, y));
        }
        shape = shape.stroke(line_pts, 1.75, secondary_stroke);
    }

    canvas(shape).w_full().h(h)
}

/// Renders a GPU-accelerated radial gauge for the System Health Score (0..=100).
pub fn health_radial_gauge<S>(
    score: u32,
    size: f32,
    track_color: Color,
    accent_color: Color,
) -> El<S> {
    let s = size.max(64.0);
    let cx = s * 0.5;
    let cy = s * 0.5;
    let r = s * 0.41;
    let stroke_w = (s * 0.085).clamp(5.0, 12.0);

    // 270-degree sweep starting from 135 deg (bottom-left) to 405 deg (bottom-right)
    let start_deg = 135.0f32;
    let sweep_deg = 270.0f32;
    let steps = 48usize;

    let mut track_pts = Vec::with_capacity(steps + 1);
    for i in 0..=steps {
        let t = (i as f32) / (steps as f32);
        let rad = (start_deg + sweep_deg * t).to_radians();
        track_pts.push((cx + r * rad.cos(), cy + r * rad.sin()));
    }

    let frac = (score.min(100) as f32) / 100.0;
    let active_steps = ((steps as f32) * frac).round() as usize;
    let mut active_pts = Vec::with_capacity(active_steps + 1);
    for i in 0..=active_steps {
        let t = if active_steps == 0 {
            0.0
        } else {
            (i as f32) / (steps as f32)
        };
        let rad = (start_deg + sweep_deg * t).to_radians();
        active_pts.push((cx + r * rad.cos(), cy + r * rad.sin()));
    }

    let mut shape = Shape::new()
        .view_box(s, s)
        .stroke(track_pts, stroke_w, track_color);

    if active_pts.len() >= 2 {
        shape = shape.stroke(active_pts, stroke_w, accent_color);
    }

    canvas(shape).size(s)
}

/// Renders a 12-month bar chart for the History tab using `rune::Shape`.
pub fn monthly_bar_chart<S>(
    monthly_mb: &[f32; 12],
    width: f32,
    height: f32,
    bar_color: Color,
    track_color: Color,
) -> El<S> {
    let w = width.max(240.0);
    let h = height.max(90.0);
    let max_v = monthly_mb
        .iter()
        .copied()
        .fold(100.0f32, f32::max);

    let mut shape = Shape::new().view_box(w, h);
    let slot_w = w / 12.0;
    let bar_w = (slot_w * 0.46).clamp(8.0, 24.0);

    for (i, &val) in monthly_mb.iter().enumerate() {
        let x_center = (i as f32 + 0.5) * slot_w;
        let top_pad = 8.0;
        let bot_y = h - 8.0;
        let usable_h = (bot_y - top_pad).max(16.0);

        // Background track bar
        shape = shape.line((x_center, bot_y), (x_center, top_pad), bar_w, track_color);

        // Active value bar
        if val > 0.0 {
            let norm = (val / max_v).clamp(0.06, 1.0);
            let y_top = bot_y - norm * usable_h;
            shape = shape.line((x_center, bot_y), (x_center, y_top), bar_w, bar_color);
        }
    }

    canvas(shape).w_full().h(h)
}
