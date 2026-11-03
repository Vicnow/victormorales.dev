import * as THREE from 'three';
import { fmtMs, Journey, JourneyInfo, NodeKey, RowKey } from './journey';
import type { JourneyStore } from './journey-store';

/**
 * Escena 3D del recorrido Route 53 → CloudFront → S3.
 * Solo corre en el navegador: el hero la importa de forma diferida en afterNextRender.
 */

export interface SceneElements {
  hero: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  tags: Record<NodeKey, HTMLElement>;
}

interface SceneNode {
  group: THREE.Group;
  core: THREE.Group;
  body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  edges: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  halo: THREE.Sprite;
  ping: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  base: THREE.Vector3;
  lift: number;
  phase: number;
  level: number;
  lvl: number;
  pulse: number;
}

interface Link {
  a: NodeKey;
  b: NodeKey;
  curve: THREE.QuadraticBezierCurve3;
  material: THREE.MeshBasicMaterial;
  heat: number;
}

interface Tween {
  t: number;
  duration: number;
  update: (t: number) => void;
  resolve: () => void;
  reject: (reason: unknown) => void;
}

const COLOR = {
  bg: 0x0b111b, line: 0x8db8e0,
  you: 0x8db8e0, r53: 0xa48cf0, cf: 0x5d9fe0, s3: 0x4fd1a1,
  req: 0xffb35c, res: 0x4fd1a1,
} as const;

// Posiciones de cada servicio; `lift` es la altura de su etiqueta.
const NODES: Record<NodeKey, { pos: [number, number, number]; lift: number }> = {
  you: { pos: [-3.4, -0.9, 1.2], lift: 0.8 },
  r53: { pos: [-1.2, 1.7, -0.8], lift: 0.85 },
  cf: { pos: [1.0, -0.3, 0.6], lift: 1.15 },
  s3: { pos: [3.4, 1.0, -1.4], lift: 0.9 },
};
const LINKS: [NodeKey, NodeKey][] = [['you', 'r53'], ['you', 'cf'], ['cf', 's3']];
const FLOOR_Y = -2.4;
const SPAN = 7.6; // ancho que ocupan los nodos con sus etiquetas
const IDLE = 0.18;
const FLOW = 6;
const TRAIL = 40;
const CANCEL = Symbol('cancel');

const clamp = THREE.MathUtils.clamp;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
// Los milisegundos reales marcan el ritmo, en cámara lenta y con topes para que se lea.
const pace = (ms: number, k = 1) => clamp((0.45 + ms / 320) * k, 0.45, 1.5);

const SHAPES: Record<NodeKey, () => THREE.BufferGeometry> = {
  you: () => new THREE.BoxGeometry(0.95, 0.6, 0.06), // tu pantalla
  r53: () => new THREE.OctahedronGeometry(0.48),
  cf: () => new THREE.IcosahedronGeometry(0.55, 1), // red global
  s3: () => new THREE.CylinderGeometry(0.46, 0.36, 0.86, 32), // un bucket, literal
};

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function lines(points: number[][], material: THREE.LineBasicMaterial) {
  const vectors = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(vectors), material);
}

function ring(radius: number, y: number, material: THREE.LineBasicMaterial) {
  const points = Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius);
  });
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

export class JourneyScene {
  readonly hasWebGL: boolean;

  private readonly el: SceneElements;
  private readonly store: JourneyStore;
  private readonly reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private readonly desktop = matchMedia('(min-width: 1080px)');
  private readonly abort = new AbortController();
  private readonly observers: (ResizeObserver | IntersectionObserver)[] = [];

  private readonly renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  private readonly glowMap = glowTexture();
  private readonly centroid = new THREE.Vector3(0, 0.3, 0);
  private readonly nodes = {} as Record<NodeKey, SceneNode>;
  private readonly links: Link[];
  private readonly lineColor = new THREE.Color(COLOR.line);

  private readonly flowPositions = new Float32Array(LINKS.length * FLOW * 3);
  private readonly flowGeometry = new THREE.BufferGeometry();
  private readonly orbit: THREE.Mesh;

  private readonly packet = new THREE.Group();
  private readonly packetCore: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly packetGlow: THREE.Sprite;
  private readonly packetColor = new THREE.Color(COLOR.req);
  private readonly trailPositions = new Float32Array(TRAIL * 3);
  private readonly trailColors = new Float32Array(TRAIL * 3);
  private readonly trailGeometry = new THREE.BufferGeometry();
  private readonly trail: THREE.Line;

  private readonly view = { x: 0, dist: 12, lift: 0, w: 0, h: 0 };
  private readonly pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private readonly tagWidths = new Map<Element, number>();
  private readonly projected = new THREE.Vector3();
  private readonly flowPoint = new THREE.Vector3();
  private readonly tweens = new Set<Tween>();

  private scrollProgress = 0;
  private heroVisible = true;
  private frameId = 0;
  private last = 0;
  private elapsed = 0;
  private current: { d: Journey; info: JourneyInfo } | null = null;

  constructor(el: SceneElements, store: JourneyStore) {
    this.el = el;
    this.store = store;

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: el.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    } catch {
      // Sin WebGL: el hero oculta la escena y la línea de tiempo sigue corriendo.
    }
    this.hasWebGL = this.renderer !== null;

    this.scene.fog = new THREE.Fog(COLOR.bg, 14, 34);

    const grid = new THREE.GridHelper(60, 60, COLOR.line, COLOR.line);
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.07;
    grid.position.y = FLOOR_Y;
    this.scene.add(grid);

    for (const key of Object.keys(NODES) as NodeKey[]) this.nodes[key] = this.buildNode(key);
    this.orbit = this.nodes.cf.group.getObjectByName('orbit') as THREE.Mesh;
    this.links = LINKS.map(([a, b]) => this.buildLink(a, b));

    // Tráfico de fondo: partículas que van y vienen por cada enlace.
    this.flowGeometry.setAttribute('position', new THREE.BufferAttribute(this.flowPositions, 3));
    this.scene.add(new THREE.Points(this.flowGeometry, new THREE.PointsMaterial({
      map: this.glowMap, color: COLOR.line, size: 0.18, opacity: 0.5, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    })));

    // El paquete (tu petición) y su estela.
    this.packetCore = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: COLOR.req }));
    this.packetGlow = this.glow(COLOR.req, 1.1, 0.95);
    this.packet.add(this.packetCore, this.packetGlow);
    this.packet.visible = false;
    this.scene.add(this.packet);

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));
    this.trail = new THREE.Line(this.trailGeometry, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    this.trail.frustumCulled = false;
    this.trail.visible = false;
    this.scene.add(this.trail);

    this.listen();
    this.frame();
    this.store.reset();
    this.last = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  /** Resuelve cuando la escena se ve (en móvil puede quedar bajo el pliegue). */
  whenVisible(): Promise<void> {
    if (!this.renderer) return Promise.resolve();
    return new Promise((resolve) => {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        resolve();
      }, { threshold: 0.35 });
      observer.observe(this.el.stage);
      this.observers.push(observer);
    });
  }

  async play(d: Journey, info: JourneyInfo) {
    this.current = { d, info };
    this.cancelTweens();
    this.reset();
    try {
      await this.sequence(d, info);
    } catch (error) {
      if (error !== CANCEL) throw error;
    }
  }

  replay() {
    if (this.current) void this.play(this.current.d, this.current.info);
  }

  destroy() {
    cancelAnimationFrame(this.frameId);
    this.cancelTweens();
    this.abort.abort();
    for (const observer of this.observers) observer.disconnect();
    this.scene.traverse((object) => {
      const { geometry, material } = object as THREE.Mesh;
      geometry?.dispose();
      for (const m of [material].flat()) m?.dispose();
    });
    this.glowMap.dispose();
    this.renderer?.dispose();
  }

  /* ---------------- Línea de tiempo ---------------- */

  private async sequence(d: Journey, info: JourneyInfo) {
    this.arrive('you');
    await this.wait(0.5);

    // 1. DNS: ¿dónde vive victormorales.dev?
    await this.travel('you', 'r53', pace(d.dns), COLOR.r53);
    this.arrive('r53', `DNS · ${fmtMs(d.dns)}`);
    this.reveal('dns', info);
    await this.travel('r53', 'you', pace(d.dns), COLOR.r53);

    // 2. TLS con el edge de CloudFront (certificado de ACM).
    await this.travel('you', 'cf', pace(d.connect, 0.6), COLOR.cf);
    this.arrive('cf', info.edge);
    await this.travel('cf', 'you', pace(d.connect, 0.6), COLOR.cf);
    this.reveal('tls', info);

    // 3. GET /: si el edge la tiene en caché, S3 ni se entera.
    await this.travel('you', 'cf', pace(d.ttfb, 0.7), COLOR.req);
    this.arrive('cf');
    this.store.chip('cf', d.cache);
    if (info.hit) {
      this.nodes.s3.level = 0.06;
      this.store.dim('s3', 'no hizo falta');
    } else {
      await this.travel('cf', 's3', pace(d.ttfb, 0.6), COLOR.req);
      this.arrive('s3', 'origen · acceso por OAC');
      await this.travel('s3', 'cf', pace(d.ttfb, 0.6), COLOR.res);
    }
    this.reveal('get', info);

    // 4. La respuesta regresa a tu pantalla.
    await this.travel('cf', 'you', pace(d.ttfb, 0.8), COLOR.res);
    this.arrive('you', `200 OK · ${fmtMs(d.total)}`);
    this.reveal('ok', info);
    this.hidePacket();
    this.store.finish(d, info);
  }

  private reset() {
    this.hidePacket();
    for (const node of Object.values(this.nodes)) {
      node.level = IDLE;
      node.pulse = 0;
    }
    this.store.reset();
  }

  private arrive(key: NodeKey, meta?: string) {
    this.nodes[key].level = 1;
    this.nodes[key].pulse = 1;
    this.store.arrive(key, meta);
  }

  private reveal(key: RowKey, info: JourneyInfo) {
    const row = info.rows[key];
    this.store.reveal(key, row);
    if (this.reduceMotion) {
      this.store.setRowMs(key, row.ms);
      return;
    }
    this.tween(0.45, (t) => this.store.setRowMs(key, row.ms * t)).catch(() => {});
  }

  private travel(from: NodeKey, to: NodeKey, seconds: number, color: number) {
    if (this.reduceMotion) return Promise.resolve();
    const link = this.links.find((l) => (l.a === from && l.b === to) || (l.a === to && l.b === from))!;
    const reverse = link.a !== from;
    this.paintPacket(color);
    link.curve.getPoint(reverse ? 1 : 0, this.packet.position);
    this.showPacket();
    return this.tween(seconds, (t) => {
      const k = ease(t);
      link.curve.getPoint(reverse ? 1 - k : k, this.packet.position);
      link.heat = 1;
    });
  }

  private wait(seconds: number) {
    return this.reduceMotion ? Promise.resolve() : this.tween(seconds, () => {});
  }

  private tween(duration: number, update: (t: number) => void) {
    return new Promise<void>((resolve, reject) => this.tweens.add({ t: 0, duration, update, resolve, reject }));
  }

  private stepTweens(dt: number) {
    for (const tw of this.tweens) {
      tw.t = Math.min(tw.t + dt / tw.duration, 1);
      tw.update(tw.t);
      if (tw.t === 1) {
        this.tweens.delete(tw);
        tw.resolve();
      }
    }
  }

  private cancelTweens() {
    for (const tw of this.tweens) tw.reject(CANCEL);
    this.tweens.clear();
  }

  /* ---------------- Construcción de la escena ---------------- */

  private glow(color: number, size: number, opacity: number) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowMap, color, opacity, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    sprite.scale.setScalar(size);
    return sprite;
  }

  private buildNode(key: NodeKey): SceneNode {
    const color = COLOR[key];
    const base = new THREE.Vector3(...NODES[key].pos);
    const group = new THREE.Group();
    const core = new THREE.Group();
    const geometry = SHAPES[key]();
    const body = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.05, depthWrite: false }));
    const edgeMaterial = new THREE.LineBasicMaterial({ color, transparent: true });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, key === 'cf' ? 1 : 18), edgeMaterial);
    const halo = this.glow(color, 2, 0.1);
    core.add(body, edges);
    group.add(core, halo);
    group.position.copy(base);

    if (key === 'you') {
      core.rotation.y = 0.3;
      core.add(lines([
        [0, -0.3, 0], [0, -0.5, 0], [-0.22, -0.5, 0], [0.22, -0.5, 0], // base del monitor
        [-0.32, 0.12, 0.035], [0.18, 0.12, 0.035], [-0.32, 0, 0.035], [0.3, 0, 0.035], [-0.32, -0.12, 0.035], [0.05, -0.12, 0.035],
      ], edgeMaterial));
    }
    if (key === 'cf') {
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.006, 6, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }));
      orbit.name = 'orbit';
      orbit.rotation.x = 1.15;
      group.add(orbit);
    }
    if (key === 's3') core.add(ring(0.432, 0.18, edgeMaterial));

    // Sombra en el piso: aro fijo, aro de "ping" y línea punteada hasta el nodo.
    const foot = new THREE.Vector3(base.x, FLOOR_Y + 0.01, base.z);
    const floorGeometry = new THREE.RingGeometry(0.5, 0.53, 64).rotateX(-Math.PI / 2);
    const floorRing = new THREE.Mesh(floorGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, depthWrite: false }));
    const ping = new THREE.Mesh(floorGeometry, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false }));
    floorRing.position.copy(foot);
    ping.position.copy(foot);
    const drop = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(base.x, base.y - 0.55, base.z), foot]),
      new THREE.LineDashedMaterial({ color, dashSize: 0.07, gapSize: 0.07, transparent: true, opacity: 0.3 }),
    );
    drop.computeLineDistances();
    this.scene.add(group, floorRing, ping, drop);

    return {
      group, core, body, edges, halo, ping, base,
      lift: NODES[key].lift, phase: Math.random() * Math.PI * 2,
      level: IDLE, lvl: IDLE, pulse: 0,
    };
  }

  private buildLink(a: NodeKey, b: NodeKey): Link {
    const from = new THREE.Vector3(...NODES[a].pos);
    const to = new THREE.Vector3(...NODES[b].pos);
    const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 0.9, 0));
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const material = new THREE.MeshBasicMaterial({ color: COLOR.line, transparent: true, opacity: 0.16, depthWrite: false });
    this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.01, 6), material));
    return { a, b, curve, material, heat: 0 };
  }

  private paintPacket(hex: number) {
    this.packetColor.set(hex);
    this.packetCore.material.color.copy(this.packetColor);
    this.packetGlow.material.color.copy(this.packetColor);
    for (let i = 0; i < TRAIL; i++) {
      const fade = (1 - i / TRAIL) ** 1.6;
      this.trailColors[i * 3] = this.packetColor.r * fade;
      this.trailColors[i * 3 + 1] = this.packetColor.g * fade;
      this.trailColors[i * 3 + 2] = this.packetColor.b * fade;
    }
    this.trailGeometry.attributes['color'].needsUpdate = true;
  }

  private showPacket() {
    if (this.packet.visible) return;
    for (let i = 0; i < TRAIL; i++) this.packet.position.toArray(this.trailPositions, i * 3);
    this.trailGeometry.attributes['position'].needsUpdate = true;
    this.packet.visible = this.trail.visible = true;
  }

  private hidePacket() {
    this.packet.visible = this.trail.visible = false;
  }

  /* ---------------- Cámara, encuadre y etiquetas ---------------- */

  private listen() {
    const { signal } = this.abort;
    addEventListener('pointermove', (event) => {
      this.pointer.tx = (event.clientX / innerWidth) * 2 - 1;
      this.pointer.ty = -((event.clientY / innerHeight) * 2 - 1);
    }, { passive: true, signal });
    addEventListener('scroll', () => {
      this.scrollProgress = clamp(scrollY / this.el.hero.offsetHeight, 0, 1);
    }, { passive: true, signal });

    const resize = new ResizeObserver(() => this.frame());
    resize.observe(this.el.stage);

    // Las etiquetas cambian de texto (y de ancho) con cada paso.
    const tagResize = new ResizeObserver((entries) => {
      for (const entry of entries) this.tagWidths.set(entry.target, (entry.target as HTMLElement).offsetWidth);
    });
    for (const tag of Object.values(this.el.tags)) tagResize.observe(tag);

    const visibility = new IntersectionObserver(([entry]) => { this.heroVisible = entry.isIntersecting; });
    visibility.observe(this.el.hero);

    this.observers.push(resize, tagResize, visibility);
  }

  private frame() {
    const w = this.el.stage.clientWidth;
    const h = this.el.stage.clientHeight;
    if (!w || !h) return;
    this.view.w = w;
    this.view.h = h;
    this.renderer?.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // En escritorio la escena vive en la mitad derecha; en móvil, centrada.
    const wide = this.desktop.matches;
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const share = wide ? 0.46 : 0.7;
    this.view.dist = clamp(SPAN / share / 2 / (tan * this.camera.aspect), 8, 20);
    this.view.x = this.centroid.x - (wide ? 0.4 * this.view.dist * tan * this.camera.aspect : 0);
    this.view.lift = wide ? 0.16 * this.view.dist * tan : 0;
    const fog = this.scene.fog as THREE.Fog;
    fog.near = this.view.dist + 2;
    fog.far = this.view.dist + 22;
  }

  private placeTags() {
    for (const key of Object.keys(this.el.tags) as NodeKey[]) {
      const tag = this.el.tags[key];
      const node = this.nodes[key];
      this.projected.copy(node.group.position);
      this.projected.y += node.lift;
      this.projected.project(this.camera);
      const half = (this.tagWidths.get(tag) ?? tag.offsetWidth) / 2 + 8;
      const x = clamp((this.projected.x * 0.5 + 0.5) * this.view.w, half, this.view.w - half);
      const y = (-this.projected.y * 0.5 + 0.5) * this.view.h;
      tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, calc(-100% - 10px))`;
    }
  }

  /* ---------------- Bucle de render ---------------- */

  private readonly loop = (now: number) => {
    this.frameId = requestAnimationFrame(this.loop);
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.elapsed += dt;
    this.stepTweens(dt);
    if (!this.renderer || !this.heroVisible || !this.view.w) return;
    this.animate(dt, this.elapsed);
    this.placeTags();
    this.renderer.render(this.scene, this.camera);
    if (!this.store.sceneReady()) this.store.sceneReady.set(true);
  };

  private animate(dt: number, time: number) {
    const motion = this.reduceMotion ? 0 : 1;
    const { pointer, view, centroid, camera } = this;
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    const s = this.scrollProgress * motion;
    camera.position.set(
      view.x + pointer.x * 0.6 * motion,
      centroid.y + 1.8 + pointer.y * 0.35 * motion + s * 1.5,
      centroid.z + view.dist - s * 3,
    );
    camera.lookAt(view.x, centroid.y - view.lift, centroid.z);

    for (const node of Object.values(this.nodes)) {
      node.lvl += (node.level - node.lvl) * Math.min(dt * 6, 1);
      node.pulse = Math.max(0, node.pulse - dt * 1.4);
      node.group.position.y = node.base.y + Math.sin(time * 0.9 + node.phase) * 0.06 * motion;
      node.edges.material.opacity = 0.28 + 0.72 * node.lvl;
      node.body.material.opacity = 0.04 + 0.1 * node.lvl;
      node.halo.material.opacity = 0.06 + 0.3 * node.lvl + 0.55 * node.pulse;
      node.halo.scale.setScalar(2 + 1.4 * node.pulse);
      node.ping.scale.setScalar(1 + (1 - node.pulse) * 2.2);
      node.ping.material.opacity = 0.7 * node.pulse;
    }
    this.nodes.r53.core.rotation.y += dt * 0.4 * motion;
    this.nodes.cf.core.rotation.y += dt * 0.15 * motion;
    this.orbit.rotation.y = time * 0.6 * motion;

    this.links.forEach((link, li) => {
      link.heat = Math.max(0, link.heat - dt * 0.8);
      link.material.opacity = 0.16 + 0.5 * link.heat;
      link.material.color.copy(this.lineColor).lerp(this.packetColor, link.heat);
      for (let i = 0; i < FLOW; i++) {
        let t = (time * 0.07 * motion + i / FLOW + li * 0.21) % 1;
        if (i % 2) t = 1 - t; // la mitad va, la mitad viene
        link.curve.getPoint(t, this.flowPoint).toArray(this.flowPositions, (li * FLOW + i) * 3);
      }
    });
    this.flowGeometry.attributes['position'].needsUpdate = true;

    if (this.packet.visible) {
      this.trailPositions.copyWithin(3, 0, (TRAIL - 1) * 3);
      this.packet.position.toArray(this.trailPositions, 0);
      this.trailGeometry.attributes['position'].needsUpdate = true;
    }
  }
}
