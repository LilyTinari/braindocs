import { useEffect, useRef } from "react";

type Point = { x: number; y: number; z: number; tone: number; size: number; seed: number };

function fold(u: number, v: number) {
  return (
    0.055 * Math.sin(u * 5 + v * 2) * Math.sin(v * 3) +
    0.028 * Math.sin(u * 9 - v * 4) +
    0.016 * Math.cos(u * 3 + v * 7)
  );
}

function hemisphere(u: number, v: number, side: number) {
  const su = Math.sin(v);
  let x = Math.cos(u) * su;
  let y = Math.cos(v);
  let z = Math.sin(u) * su;
  const r = 1 + fold(u, v);
  x *= 1.05 * r;
  y *= 0.72 * r;
  z *= 1.18 * r;
  if (y < -0.05 && z < 0.15) y -= 0.16 * (1 - y);
  if (y > 0.35) x *= 1.06;
  const medial = x * side;
  if (medial < 0.12) x += side * (0.12 - medial) * 0.65;
  x += side * 0.22;
  return { x, y, z };
}

function build(count: number): Point[] {
  const points: Point[] = [];
  const per = Math.floor(count * 0.42);
  for (const side of [-1, 1]) {
    for (let i = 0; i < per; i++) {
      const v = Math.acos(1 - (i / (per - 1)) * 2);
      const u = i * 2.399963;
      const p = hemisphere(u, v, side);
      points.push({
        ...p,
        tone: side < 0 ? 0.2 : 0.62,
        size: i % 19 === 0 ? 1.7 : 0.45 + (i % 3) * 0.22,
        seed: (i * 0.618) % 1,
      });
    }
  }
  const cere = Math.floor(count * 0.12);
  for (let i = 0; i < cere; i++) {
    const v = Math.acos(1 - (i / (cere - 1)) * 2);
    const u = i * 2.399963;
    const s = 0.34 + fold(u * 1.4, v) * 0.4;
    const side = i % 2 === 0 ? -1 : 1;
    points.push({
      x: Math.cos(u) * Math.sin(v) * s * 0.9 + side * 0.12,
      y: Math.cos(v) * s * 0.72 - 0.72,
      z: Math.sin(u) * Math.sin(v) * s - 0.28,
      tone: 0.78,
      size: 0.4,
      seed: (i * 0.414) % 1,
    });
  }
  return points;
}

export function DocBrain({
  className,
  count = 4200,
  assembled = false,
}: {
  className?: string;
  count?: number;
  assembled?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const points = build(count);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drag = { x: 0.45, y: 0.18 };
    const born = performance.now();
    let alive = true;
    let frame = 0;
    let pointer = 0;
    let origin = { x: 0, y: 0, yaw: 0, pitch: 0 };

    const draw = (now: number) => {
      if (!alive) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w < 2 || h < 2) {
        frame = requestAnimationFrame(draw);
        return;
      }
      const pw = Math.floor(w * dpr);
      const ph = Math.floor(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const yaw = drag.x + (still ? 0 : now * 0.00012);
      const pitch = drag.y;
      const raw = still || assembled ? 1 : Math.min(1, Math.max(0, (now - born - 700) / 1900));
      const ease = raw * raw * (3 - 2 * raw);
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cpitch = Math.cos(pitch);
      const spitch = Math.sin(pitch);
      const cx = w * 0.5;
      const cy = h * 0.4;
      const scale = Math.min(w, h) * 0.46;
      const project = (p: { x: number; y: number; z: number }) => {
        const x1 = p.x * cyaw - p.z * syaw;
        const z1 = p.x * syaw + p.z * cyaw;
        const y1 = p.y * cpitch - z1 * spitch;
        const z2 = p.y * spitch + z1 * cpitch;
        return { x: cx + x1 * scale, y: cy + y1 * scale, z: z2 };
      };
      ctx.lineWidth = 1;
      for (const side of [-1, 1]) {
        for (let ring = 1; ring <= 10; ring++) {
          const v = (ring / 11) * Math.PI;
          ctx.beginPath();
          let drawing = false;
          for (let step = 0; step <= 56; step++) {
            const u = (step / 56) * Math.PI * 2;
            const projected = project(hemisphere(u, v, side));
            if (projected.z < -0.05) {
              drawing = false;
              continue;
            }
            if (!drawing) {
              ctx.moveTo(projected.x, projected.y);
              drawing = true;
            } else ctx.lineTo(projected.x, projected.y);
          }
          ctx.strokeStyle = side < 0 ? `rgba(158, 201, 212, ${0.45 * ease})` : `rgba(244, 244, 242, ${0.28 * ease})`;
          ctx.stroke();
        }
      }
      const painted: { x: number; y: number; z: number; tone: number; size: number }[] = [];
      for (const point of points) {
        const scatter = 1 + (1 - ease) * (2.6 + point.seed * 5.2);
        const spin = (1 - ease) * point.seed * 7.5;
        const cs = Math.cos(spin);
        const sn = Math.sin(spin);
        const sx = point.x * cs - point.z * sn;
        const sz = point.x * sn + point.z * cs;
        const sy = point.y + (1 - ease) * (point.seed - 0.5) * 3.4;
        const x1 = sx * scatter * cyaw - sz * scatter * syaw;
        const z1 = sx * scatter * syaw + sz * scatter * cyaw;
        const y1 = sy * scatter * cpitch - z1 * spitch;
        const z2 = sy * scatter * spitch + z1 * cpitch;
        painted.push({
          x: cx + x1 * scale,
          y: cy + y1 * scale,
          z: z2,
          tone: point.tone,
          size: point.size * (0.75 + (z2 + 1.2) * 0.35),
        });
      }
      painted.sort((a, b) => a.z - b.z);
      for (const point of painted) {
        const depth = (point.z + 1.3) / 2.4;
        const alpha = (0.08 + depth * 0.72) * (0.28 + ease * 0.72);
        const neural = point.tone < 0.5;
        ctx.fillStyle = neural
          ? `rgba(158, 201, 212, ${alpha})`
          : `rgba(244, 244, 242, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(point.x, point.y, Math.max(0.6, point.size), 0, Math.PI * 2);
        ctx.fill();
      }
      if (!still) frame = requestAnimationFrame(draw);
    };

    const onDown = (event: PointerEvent) => {
      pointer = event.pointerId;
      origin = { x: event.clientX, y: event.clientY, yaw: drag.x, pitch: drag.y };
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointer || (event.buttons === 0 && event.pointerType === "mouse")) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      if (Math.abs(dy) > Math.abs(dx)) return;
      drag.x = origin.yaw + dx * 0.008;
      drag.y = Math.max(-0.7, Math.min(0.7, origin.pitch + dy * 0.005));
    };
    const onUp = () => {
      pointer = 0;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    frame = requestAnimationFrame(draw);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [assembled, count]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
