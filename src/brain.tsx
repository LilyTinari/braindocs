import { useEffect, useRef } from "react";

type P = { x: number; y: number; z: number };

function sphere(i: number, n: number): P {
  const y = 1 - (i / Math.max(1, n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = Math.PI * (3 - Math.sqrt(5)) * i;
  return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
}

function sculpt(i: number, n: number): P {
  const p = sphere(i, n);
  const hemi = p.x >= 0 ? 1 : -1;
  const theta = Math.atan2(p.z, p.x);
  const sulci = 0.9 + 0.07 * Math.sin(theta * 7 + p.y * 9) * Math.cos(p.y * 6);
  const fissure = hemi * 0.12;
  return {
    x: p.x * 0.78 * sulci + fissure,
    y: p.y * 0.92 * sulci + 0.06,
    z: p.z * 0.62 * sulci,
  };
}

export function DocBrain({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = 220;
    const pts = Array.from({ length: count }, (_, i) => sculpt(i, count));
    const stem: P[] = Array.from({ length: 18 }, (_, i) => ({
      x: Math.sin(i) * 0.05,
      y: -0.95 - i * 0.035,
      z: Math.cos(i * 0.7) * 0.04,
    }));
    const all = pts.concat(stem);
    let frame = 0;
    let alive = true;

    const draw = (t: number) => {
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

      const yaw = reduce ? 0.5 : t * 0.00022;
      const bob = reduce ? 0 : Math.sin(t * 0.0008) * h * 0.02;
      const cx = w * 0.5;
      const cy = h * 0.46 + bob;
      const scale = Math.min(w, h) * 0.34;
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);

      const proj = all.map((p) => {
        const x = p.x * cos - p.z * sin;
        const z = p.x * sin + p.z * cos;
        const depth = (z + 1.4) / 2.2;
        return { x: cx + x * scale, y: cy - p.y * scale, z, depth };
      });

      ctx.lineWidth = 1;
      for (let i = 0; i < proj.length; i++) {
        const a = proj[i];
        for (let j = i + 1; j < Math.min(proj.length, i + 14); j++) {
          const b = proj[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          if (dx * dx + dy * dy > 28 * 28) continue;
          const alpha = 0.05 + (a.depth + b.depth) * 0.12;
          ctx.strokeStyle = `rgba(61, 214, 140, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const p of proj) {
        ctx.fillStyle = p.depth > 0.55 ? "rgba(232, 255, 244, 0.9)" : "rgba(61, 214, 140, 0.75)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.15 + p.depth, 0, Math.PI * 2);
        ctx.fill();
      }

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
