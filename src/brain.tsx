import { useEffect, useRef } from "react";

function lobe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  t: number,
  flip: number,
) {
  for (let ring = 1; ring <= 7; ring++) {
    const k = ring / 7;
    ctx.beginPath();
    for (let step = 0; step <= 64; step++) {
      const a = (step / 64) * Math.PI * 2;
      const wave = 1 + 0.045 * Math.sin(a * 5 + ring + t) + 0.02 * Math.sin(a * 11 - t);
      const x = cx + Math.cos(a) * rx * k * wave * flip;
      const y = cy + Math.sin(a) * ry * k * wave * (0.92 + 0.04 * Math.sin(t + ring));
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.15 * flip, cy - ry * 0.55);
  ctx.quadraticCurveTo(cx + rx * 0.35 * flip, cy, cx - rx * 0.05 * flip, cy + ry * 0.72);
  ctx.stroke();
}

export function DocBrain({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let alive = true;

    const draw = (now: number) => {
      if (!alive) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 2 || h < 2) {
        frame = requestAnimationFrame(draw);
        return;
      }
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = reduce ? 0.6 : now * 0.0007;
      const bob = reduce ? 0 : Math.sin(now * 0.0008) * 6;
      const cx = w * 0.5;
      const cy = h * 0.48 + bob;
      const rx = Math.min(w, h) * 0.2;
      const ry = rx * 1.15;
      ctx.lineWidth = 1.15;
      ctx.strokeStyle = "rgba(61, 214, 140, 0.78)";
      lobe(ctx, cx - rx * 0.72, cy, rx, ry, t, 1);
      ctx.strokeStyle = "rgba(158, 201, 212, 0.72)";
      lobe(ctx, cx + rx * 0.72, cy, rx, ry, t + 0.8, -1);
      ctx.strokeStyle = "rgba(61, 214, 140, 0.35)";
      ctx.beginPath();
      ctx.moveTo(cx, cy - ry * 0.2);
      ctx.lineTo(cx, cy + ry * 1.15);
      ctx.stroke();
      if (!reduce) frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
