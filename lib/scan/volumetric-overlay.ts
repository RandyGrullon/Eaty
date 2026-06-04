/** Dibujo del overlay volumétrico animado del escáner en vivo. */

export interface DepthDot {
  x: number;
  y: number;
  z: number; // 0 = lejos, 1 = cerca → afecta tamaño/opacidad/parallax
  vx: number;
  vy: number;
  opacity: number;
  colorRgb: string;
  born: number;
}

const C_GREEN = "52, 211, 153";
const C_BLUE = "96, 165, 250";
const C_ORANGE = "251, 146, 60";
const C_PURPLE = "168, 85, 247";

export interface VolumetricFrameParams {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  dpr: number;
  elapsed: number;
  now: number;
  isAnalyzing: boolean;
  /** Array mutable de partículas de profundidad; se actualiza in-place. */
  dots: DepthDot[];
}

/** Dibuja un frame completo del overlay (grid, contornos, sweep, dots y mesh). */
export function drawVolumetricFrame({
  ctx,
  W,
  H,
  dpr,
  elapsed,
  now,
  isAnalyzing,
  dots,
}: VolumetricFrameParams): DepthDot[] {
  const intensify = isAnalyzing ? 1 : 0.55;

  ctx.clearRect(0, 0, W, H);

  // ── Grid base ──
  ctx.save();
  ctx.strokeStyle = `rgba(${C_GREEN}, ${0.055 * intensify})`;
  ctx.lineWidth = 0.7;
  const step = 36 * dpr;
  for (let x = 0; x <= W; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  // ── Líneas topográficas (concentric contours) – ilusión de volumen ──
  {
    const cx = W / 2;
    const cy = H / 2;
    const sweep = (Math.sin(elapsed * 0.0008) + 1) * 0.5;
    ctx.save();
    ctx.strokeStyle = `rgba(${C_GREEN}, ${0.1 * intensify})`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const r = W * 0.08 + i * (W * 0.045) + sweep * (W * 0.01);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.72, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Sweep radial (depth scan) ──
  {
    const cx = W / 2;
    const cy = H / 2;
    const period = 2600;
    const t = (elapsed % period) / period;
    const maxR = Math.hypot(W, H) * 0.6;
    const r1 = maxR * t;
    ctx.save();
    const grd = ctx.createRadialGradient(cx, cy, Math.max(0, r1 - 30 * dpr), cx, cy, r1 + 30 * dpr);
    grd.addColorStop(0, "transparent");
    grd.addColorStop(0.5, `rgba(${C_GREEN}, ${0.35 * intensify})`);
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, r1 + 30 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Línea horizontal de escaneo ──
  {
    const speed = isAnalyzing ? 0.0024 : 0.0009;
    const t = (elapsed * speed) % 1;
    const y = t * H;
    const alpha = isAnalyzing ? 0.8 : 0.35;
    const grd = ctx.createLinearGradient(0, y - 55 * dpr, 0, y + 55 * dpr);
    grd.addColorStop(0, "transparent");
    grd.addColorStop(0.5, `rgba(${C_GREEN}, ${alpha})`);
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, y - 55 * dpr, W, 110 * dpr);
  }

  // ── Depth dots: 3 capas de profundidad ──
  if (isAnalyzing && dots.length < 48) {
    if (Math.random() < 0.22) {
      const z = Math.random();
      const cx = W / 2;
      const cy = H / 2;
      const spreadX = W * (0.18 + z * 0.32);
      const spreadY = H * (0.14 + z * 0.28);
      const x = cx + (Math.random() - 0.5) * 2 * spreadX;
      const y = cy + (Math.random() - 0.5) * 2 * spreadY;
      const colorRgb =
        Math.random() < 0.55 ? C_GREEN : Math.random() < 0.5 ? C_BLUE : Math.random() < 0.5 ? C_ORANGE : C_PURPLE;
      dots.push({
        x,
        y,
        z,
        vx: (Math.random() - 0.5) * 0.35 * dpr * (0.5 + z),
        vy: (Math.random() - 0.5) * 0.35 * dpr * (0.5 + z),
        opacity: 0,
        colorRgb,
        born: now,
      });
    }
  }

  const liveDots = dots.filter((d) => {
    const age = now - d.born;
    if (age < 220) d.opacity = age / 220;
    else if (age > 2200) d.opacity = Math.max(0, d.opacity - 0.022);
    d.x += d.vx;
    d.y += d.vy;
    // Parallax: dots cercanos se mueven más con el barrido.
    const drift = Math.sin(elapsed * 0.0006 + d.z * 4) * 0.15 * d.z;
    d.x += drift * dpr;
    return d.opacity > 0.005;
  });

  // Render dots por profundidad.
  for (const dot of liveDots) {
    const sizeBase = (1.8 + dot.z * 3) * dpr;
    const a = dot.opacity * (0.45 + dot.z * 0.55);
    ctx.save();
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, sizeBase * 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${dot.colorRgb}, ${a * 0.12})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, sizeBase * 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${dot.colorRgb}, ${a * 0.32})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, sizeBase, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${dot.colorRgb}, ${a})`;
    ctx.fill();
    ctx.restore();
  }

  // Mesh entre dots cercanos en profundidad similar.
  if (liveDots.length > 2) {
    const maxDist = 150 * dpr;
    ctx.save();
    for (let i = 0; i < liveDots.length; i++) {
      for (let j = i + 1; j < liveDots.length; j++) {
        if (Math.abs(liveDots[i].z - liveDots[j].z) > 0.35) continue;
        const dx = liveDots[i].x - liveDots[j].x;
        const dy = liveDots[i].y - liveDots[j].y;
        const d = Math.hypot(dx, dy);
        if (d < maxDist) {
          const a =
            (1 - d / maxDist) *
            0.22 *
            Math.min(liveDots[i].opacity, liveDots[j].opacity) *
            (0.4 + Math.max(liveDots[i].z, liveDots[j].z) * 0.6);
          ctx.beginPath();
          ctx.moveTo(liveDots[i].x, liveDots[i].y);
          ctx.lineTo(liveDots[j].x, liveDots[j].y);
          ctx.strokeStyle = `rgba(${C_GREEN}, ${a})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  return liveDots;
}
