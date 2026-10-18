import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// brain.glb is CC0, adapted from MakeHuman.

const surfaceVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vPos;
  void main() {
    vPos = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const surfaceFrag = /* glsl */ `
  uniform float uTime;
  uniform float uEase;
  varying vec3 vN;
  varying vec3 vWorld;
  varying vec3 vPos;
  void main() {
    vec3 n = normalize(vN);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 2.0);
    float gold = smoothstep(-0.35, 0.8, n.x);
    vec3 teal = vec3(0.2, 0.86, 0.78);
    vec3 amber = vec3(1.0, 0.74, 0.26);
    vec3 upLight = normalize(vec3(0.1, 0.75, 0.6));
    vec3 keyLight = normalize(vec3(0.75, 0.2, 0.5));
    float up = clamp(dot(n, upLight) * 0.65 + 0.35, 0.0, 1.0);
    float key = clamp(dot(n, keyLight) * 0.6 + 0.4, 0.0, 1.0);
    vec3 body = mix(vec3(0.02, 0.14, 0.16), teal, up);
    body = mix(body, amber, gold * key * 0.78);
    body += teal * pow(key, 2.2) * 0.25;
    vec3 col = body + mix(teal, amber, gold) * fres * 0.85;
    col *= 0.96 + 0.04 * sin(uTime * 0.6 + vPos.y * 5.0);
    gl_FragColor = vec4(col, uEase);
  }
`;

const nodeVert = /* glsl */ `
  attribute float aGold;
  uniform float uEase;
  varying float vGold;
  void main() {
    vGold = aGold;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp((aGold > 0.5 ? 7.0 : 4.5) * (160.0 / -mv.z), 1.5, 12.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const nodeFrag = /* glsl */ `
  uniform float uEase;
  varying float vGold;
  void main() {
    vec2 uv = gl_PointCoord * 2.0 - 1.0;
    float r = dot(uv, uv);
    if (r > 1.0) discard;
    float core = exp(-r * 7.0);
    float halo = exp(-r * 2.0);
    vec3 teal = vec3(0.45, 0.9, 0.86);
    vec3 amber = vec3(1.0, 0.82, 0.4);
    vec3 col = mix(teal, amber, vGold);
    gl_FragColor = vec4(col, (core + halo * 0.45) * uEase);
  }
`;

export function DocBrain({
  className,
  assembled = false,
}: {
  className?: string;
  count?: number;
  assembled?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const view = canvas.current;
    const host = root.current;
    const sheet = paper.current;
    if (!view || !host || !sheet) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({
      canvas: view,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
    camera.position.set(0, 0.05, 3.5);

    const turn = new THREE.Group();
    const spin = new THREE.Group();
    scene.add(turn);
    turn.add(spin);

    const easeUniform = { value: assembled || still ? 1 : 0 };
    const timeUniform = { value: 0 };
    const surface = new THREE.ShaderMaterial({
      vertexShader: surfaceVert,
      fragmentShader: surfaceFrag,
      transparent: true,
      depthWrite: true,
      toneMapped: false,
      uniforms: { uTime: timeUniform, uEase: easeUniform },
    });

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x8fe3d4,
      transparent: true,
      opacity: 0.28,
      toneMapped: false,
    });
    const goldRing = new THREE.MeshBasicMaterial({
      color: 0xe2b15a,
      transparent: true,
      opacity: 0.22,
      toneMapped: false,
    });

    let alive = true;
    const loader = new GLTFLoader();
    loader.load("/brain.glb", (gltf) => {
      if (!alive) return;
      const model = gltf.scene;
      model.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const geo = mesh.geometry;
        if (!geo.getAttribute("normal")) geo.computeVertexNormals();
        mesh.material = surface;
      });
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      const fit = 1.62 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(fit);
      model.rotation.x = 0.28;
      spin.add(model);

      const reach = Math.max(size.x, size.y) * fit * 0.72;
      const rings: Array<[number, number, number, THREE.Material]> = [
        [reach * 1.15, 1.15, 0.2, ringMat],
        [reach * 1.32, 0.35, 1.1, goldRing],
        [reach * 1.05, 1.7, -0.4, ringMat],
      ];
      for (const [radius, rx, ry, material] of rings) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.01, 8, 96), material);
        ring.rotation.set(rx, ry, 0);
        turn.add(ring);
      }

      const nodeCount = 28;
      const positions = new Float32Array(nodeCount * 3);
      const golds = new Float32Array(nodeCount);
      for (let i = 0; i < nodeCount; i++) {
        const ring = rings[i % rings.length]!;
        const a = (i / nodeCount) * Math.PI * 2 + i;
        const r = ring[0];
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = Math.sin(a) * r * 0.35;
        positions[i * 3 + 2] = Math.sin(a) * r;
        golds[i] = i % 3 === 0 ? 1 : 0;
      }
      const nodes = new THREE.BufferGeometry();
      nodes.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      nodes.setAttribute("aGold", new THREE.BufferAttribute(golds, 1));
      turn.add(
        new THREE.Points(
          nodes,
          new THREE.ShaderMaterial({
            vertexShader: nodeVert,
            fragmentShader: nodeFrag,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
            uniforms: { uEase: easeUniform },
          }),
        ),
      );
    });

    const drag = { x: 0.35, y: 0.08 };
    const born = performance.now();
    let frame = 0;
    let visible = true;
    let pointer = 0;
    let origin = { x: 0, y: 0, yaw: drag.x, pitch: drag.y };

    const resize = () => {
      const w = sheet.clientWidth;
      const h = sheet.clientHeight;
      if (w < 2 || h < 2) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observed = new ResizeObserver(resize);
    observed.observe(sheet);
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) frame = requestAnimationFrame(draw);
    });
    seen.observe(host);

    const draw = (now: number) => {
      if (!alive) return;
      const raw = still || assembled ? 1 : Math.min(1, Math.max(0, (now - born - 400) / 1600));
      const ease = raw * raw * (3 - 2 * raw);
      easeUniform.value = ease;
      timeUniform.value = now * 0.001;
      ringMat.opacity = 0.3 * ease;
      goldRing.opacity = 0.24 * ease;
      if (!still) spin.rotation.y += 0.0016;
      turn.rotation.y += (drag.x - turn.rotation.y) * 0.12;
      turn.rotation.x += (drag.y - turn.rotation.x) * 0.12;
      renderer.render(scene, camera);
      if (visible) frame = requestAnimationFrame(draw);
    };

    const onDown = (event: PointerEvent) => {
      pointer = event.pointerId;
      origin = { x: event.clientX, y: event.clientY, yaw: drag.x, pitch: drag.y };
    };
    const onMove = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      if (event.pointerType === "mouse" && event.buttons === 0) return;
      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      if (Math.abs(dy) > Math.abs(dx)) return;
      drag.x = origin.yaw + dx * 0.008;
      drag.y = Math.max(-0.55, Math.min(0.55, origin.pitch + dy * 0.004));
    };
    view.addEventListener("pointerdown", onDown);
    view.addEventListener("pointermove", onMove);
    const onUp = () => {
      pointer = 0;
    };
    window.addEventListener("pointerup", onUp);
    frame = requestAnimationFrame(draw);

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observed.disconnect();
      seen.disconnect();
      view.removeEventListener("pointerdown", onDown);
      view.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      surface.dispose();
      ringMat.dispose();
      goldRing.dispose();
      scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      });
      renderer.dispose();
    };
  }, [assembled]);

  return (
    <div className={className ?? "doc-brain"} ref={root}>
      <div className="paper" ref={paper}>
        <span className="rules" />
        <canvas ref={canvas} aria-hidden="true" />
        <span className="fold" />
      </div>
    </div>
  );
}
