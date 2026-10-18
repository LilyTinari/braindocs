import { useEffect, useRef } from "react";

type V3 = [number, number, number];

const GYRI: [number, number, number] = [10, 7, 12];

function gyriWarp(theta: number, phi: number) {
  return (
    1 +
    0.085 * Math.sin(theta * GYRI[0] + phi * 2) +
    0.11 * Math.sin(phi * GYRI[1] - 0.4) +
    0.06 * Math.sin(theta * GYRI[2] + phi * 5) +
    0.035 * Math.sin(theta * 18 + phi * 9)
  );
}

function cortex(x: number, y: number, z: number): V3 {
  const r0 = Math.hypot(x, y, z) || 1;
  const nx = x / r0;
  const ny = y / r0;
  const nz = z / r0;
  const theta = Math.atan2(nz, nx);
  const phi = Math.acos(Math.max(-1, Math.min(1, ny)));
  const g = gyriWarp(theta, phi);
  const lobe = nx >= 0 ? 1 : -1;
  const yaw = lobe * 0.22;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const cx = nx * c - nz * s;
  const cz = nx * s + nz * c;
  let px = cx * 0.8 * g;
  let py = ny * 1.02 * g * (ny < 0 ? 0.8 : 1);
  let pz = cz * 0.7 * g;
  px += lobe * 0.2;
  const fiss = Math.exp(-px * px * 46) * 0.07;
  py -= fiss * 0.5;
  px += lobe * fiss * 0.6;
  if (Math.abs(px) > 0.28 && py < 0.1 && pz > 0.02) py -= 0.1 * g;
  if (pz < -0.18 && py < 0.16) {
    pz -= 0.08;
    py -= 0.06;
    px *= 0.9;
  }
  return [px, py, pz];
}

function normalize(v: V3): V3 {
  const m = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / m, v[1] / m, v[2] / m];
}

function icosphere(detail: number) {
  const t = (1 + Math.sqrt(5)) / 2;
  const verts: V3[] = [
    [-1, t, 0],
    [1, t, 0],
    [-1, -t, 0],
    [1, -t, 0],
    [0, -1, t],
    [0, 1, t],
    [0, -1, -t],
    [0, 1, -t],
    [t, 0, -1],
    [t, 0, 1],
    [-t, 0, -1],
    [-t, 0, 1],
  ].map((v) => normalize(v as V3));
  let faces: [number, number, number][] = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  for (let level = 0; level < detail; level++) {
    const cache = new Map<string, number>();
    const next: [number, number, number][] = [];
    const mid = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      const hit = cache.get(key);
      if (hit !== undefined) return hit;
      const v = normalize([
        (verts[a]![0] + verts[b]![0]) / 2,
        (verts[a]![1] + verts[b]![1]) / 2,
        (verts[a]![2] + verts[b]![2]) / 2,
      ]);
      const index = verts.length;
      verts.push(v);
      cache.set(key, index);
      return index;
    };
    for (const [a, b, c] of faces) {
      const ab = mid(a, b);
      const bc = mid(b, c);
      const ca = mid(c, a);
      next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  return { verts, faces };
}

function glowSprite() {
  const sprite = document.createElement("canvas");
  sprite.width = 64;
  sprite.height = 64;
  const ctx = sprite.getContext("2d");
  if (!ctx) return sprite;
  const paint = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  paint.addColorStop(0, "rgba(248, 248, 246, 1)");
  paint.addColorStop(0.16, "rgba(214, 236, 242, 0.95)");
  paint.addColorStop(0.38, "rgba(158, 201, 212, 0.28)");
  paint.addColorStop(1, "rgba(158, 201, 212, 0)");
  ctx.fillStyle = paint;
  ctx.fillRect(0, 0, 64, 64);
  return sprite;
}

type Soma = { x: number; y: number; z: number; seed: number; rind: boolean };
type Tract = { a: V3; b: V3 };

function buildModel(count: number) {
  const shell = icosphere(3);
  const verts = shell.verts.map((v) => cortex(v[0], v[1], v[2]));
  const cere = icosphere(2);
  const cereFaces = cere.faces.map(
    ([a, b, c]) =>
      [a + verts.length, b + verts.length, c + verts.length] as [number, number, number],
  );
  for (const v of cere.verts) {
    const p = cortex(v[0] * 0.42, v[1] * 0.34, v[2] * 0.42);
    verts.push([p[0] * 0.92, p[1] - 0.78, p[2] - 0.32]);
  }
  const faces = shell.faces.concat(cereFaces);
  const somata: Soma[] = [];
  const n = Math.min(count, 1600);
  for (let i = 0; i < n; i++) {
    const rind = i < n * 0.28;
    const y = 1 - (i / (n - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.399963;
    const p = cortex(Math.cos(theta) * ring, y, Math.sin(theta) * ring);
    const depth = rind ? 1.02 : 0.72 + ((i * 0.17) % 1) * 0.2;
    somata.push({
      x: p[0] * depth,
      y: p[1] * depth,
      z: p[2] * depth,
      seed: (i * 0.618) % 1,
      rind,
    });
  }
  const tracts: Tract[] = [];
  for (let i = 0; i < 36; i++) {
    const a = somata[i % somata.length]!;
    const b = somata[(i * 47) % somata.length]!;
    if (a.x * b.x > 0 && i % 3 !== 0) continue;
    tracts.push({ a: [a.x, a.y, a.z], b: [b.x, b.y, b.z] });
  }
  return { verts, faces, somata, tracts };
}

export function DocBrain({
  className,
  count = 1400,
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
    const model = buildModel(count);
    const sprite = glowSprite();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const drag = { x: 0.55, y: 0.18 };
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
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const yaw = drag.x + (still ? 0 : now * 0.00008);
      const pitch = drag.y;
      const raw = still || assembled ? 1 : Math.min(1, Math.max(0, (now - born - 700) / 1900));
      const ease = raw * raw * (3 - 2 * raw);
      const pageRaw = still || assembled ? 1 : Math.min(1, Math.max(0, (now - born - 180) / 700));
      const pageEase = pageRaw * pageRaw * (3 - 2 * pageRaw);
      const cyaw = Math.cos(yaw);
      const syaw = Math.sin(yaw);
      const cpitch = Math.cos(pitch);
      const spitch = Math.sin(pitch);
      const pageW = Math.min(w * 0.7, h * 0.56, 440);
      const pageH = pageW * 1.28;
      const pageX = w * 0.5 - pageW / 2;
      const pageY = Math.max(16, h * 0.05);
      const cx = w * 0.5;
      const cy = pageY + pageH * 0.46;
      const scale = pageW * 0.32;

      const project = (p: V3) => {
        const x1 = p[0] * cyaw - p[2] * syaw;
        const z1 = p[0] * syaw + p[2] * cyaw;
        const y1 = p[1] * cpitch - z1 * spitch;
        const z2 = p[1] * spitch + z1 * cpitch;
        return { x: cx + x1 * scale, y: cy - y1 * scale, z: z2, nx: x1, ny: y1 };
      };

      ctx.globalAlpha = pageEase;
      ctx.beginPath();
      ctx.roundRect(pageX, pageY, pageW, pageH, 14);
      ctx.fillStyle = "rgba(10, 12, 14, 0.94)";
      ctx.fill();
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = "rgba(236, 234, 228, 0.7)";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pageX + pageW - 26, pageY + 1);
      ctx.lineTo(pageX + pageW - 26, pageY + 26);
      ctx.lineTo(pageX + pageW - 1, pageY + 26);
      ctx.strokeStyle = "rgba(158, 201, 212, 0.7)";
      ctx.stroke();
      ctx.globalAlpha = pageEase * (0.07 + (1 - ease) * 0.28);
      ctx.strokeStyle = "rgba(244, 244, 242, 0.85)";
      ctx.lineWidth = 1;
      for (let line = 0; line < 9; line++) {
        const y = pageY + 34 + line * ((pageH - 68) / 8);
        ctx.beginPath();
        ctx.moveTo(pageX + 26, y);
        ctx.lineTo(pageX + pageW - 26, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pageX + 1, pageY + 1, pageW - 2, pageH - 2, 12);
      ctx.clip();

      const rotated = model.verts.map((v) => project(v));
      const painted = model.faces.map((face) => {
        const a = rotated[face[0]]!;
        const b = rotated[face[1]]!;
        const c = rotated[face[2]]!;
        const ux = b.nx - a.nx;
        const uy = b.ny - a.ny;
        const uz = b.z - a.z;
        const vx = c.nx - a.nx;
        const vy = c.ny - a.ny;
        const vz = c.z - a.z;
        const nz = ux * vy - uy * vx;
        const nx = uy * vz - uz * vy;
        const ny = uz * vx - ux * vz;
        const mag = Math.hypot(nx, ny, nz) || 1;
        return { a, b, c, z: (a.z + b.z + c.z) / 3, fres: Math.pow(1 - Math.abs(nz / mag), 2.1) };
      });
      painted.sort((a, b) => a.z - b.z);
      for (const face of painted) {
        const alpha = (0.05 + face.fres * 0.62) * ease;
        if (alpha < 0.02) continue;
        ctx.beginPath();
        ctx.moveTo(face.a.x, face.a.y);
        ctx.lineTo(face.b.x, face.b.y);
        ctx.lineTo(face.c.x, face.c.y);
        ctx.closePath();
        ctx.fillStyle =
          face.fres > 0.55
            ? `rgba(236, 234, 228, ${alpha})`
            : `rgba(126, 176, 190, ${alpha})`;
        ctx.fill();
      }

      ctx.lineWidth = 0.8;
      for (const tract of model.tracts) {
        const a = project(tract.a);
        const b = project(tract.b);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2 - scale * 0.12;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.strokeStyle = `rgba(186, 214, 222, ${0.28 * ease})`;
        ctx.stroke();
      }

      for (const soma of model.somata) {
        const at = project([soma.x, soma.y, soma.z]);
        const row = Math.floor(soma.seed * 9);
        const fromX = pageX + 26 + ((soma.seed * 13) % 1) * (pageW - 52);
        const fromY = pageY + 34 + row * ((pageH - 68) / 8);
        const x = fromX + (at.x - fromX) * ease;
        const y = fromY + (at.y - fromY) * ease;
        const depth = (at.z + 1.4) / 2.6;
        const size = (soma.rind ? 7.5 : 3.4) * (0.65 + depth * 0.55);
        ctx.globalAlpha = (soma.rind ? 0.95 : 0.55) * (0.35 + ease * 0.65) * (0.45 + depth * 0.55);
        ctx.drawImage(sprite, x - size, y - size, size * 2, size * 2);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
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
      drag.y = Math.max(-0.65, Math.min(0.65, origin.pitch + dy * 0.005));
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    const onUp = () => {
      pointer = 0;
    };
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
