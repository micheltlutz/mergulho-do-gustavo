// O desenho do mergulho em <canvas>: céu e superfície, mar em camadas pela
// profundidade, raios de luz, rochas (guardadas em pedaços prontos), algas
// e corais, bolhas das letras, guincho, bichos, barquinho, o mergulhador,
// partículas e a escuridão das cavernas (com a luz do capacete e o flash).

import { BOAT_Y, type Dive, type LetterBubble } from '../game/dive.ts';
import type { Ocean } from '../game/ocean.ts';
import { letterColor } from './colors.ts';
import type { PetId } from './faces.ts';
import { boatSvg, creatureSvg, diverSvg, puffedSvg, svgImage, WINCH_TIP, type SuitId } from './sprites.ts';

const FONT = `ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, -apple-system, sans-serif`;
const CHUNK = 12;
/** Quanto o céu aparece acima da água quando o mergulhador está na superfície. */
const SKY = 5.4;

interface Particle {
  kind: 'bubble' | 'spark' | 'drop';
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  color: string;
}

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
}

/** Cor da água em cada profundidade. */
const WATER: [number, string][] = [
  [0, '#4FC3F7'],
  [8, '#0398D6'],
  [20, '#0270B0'],
  [32, '#03457A'],
  [42, '#062A4E'],
];

export class Scene {
  readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D;
  private readonly darkCv = document.createElement('canvas');
  private readonly tiny = document.createElement('canvas');
  private readonly chunks = new Map<string, HTMLCanvasElement>();
  private darkLevel: Float32Array | null = null;
  private ocean: Ocean | null = null;
  private w = 0;
  private h = 0;
  private dpr = 1;
  /** Pixels (CSS) por metro. */
  cell = 40;
  camX = 0;
  camY = 0;
  private t = 0;
  private parts: Particle[] = [];
  private pet: PetId = 'pipoca';
  private suit: SuitId = 'amarelo';
  private crew: [PetId, PetId] = ['mimi', 'bolinha'];
  private frame: 0 | 1 = 0;
  private frameT = 0;
  private helmetT = 0;
  private ventT = 0;
  private snap = true;

  constructor() {
    this.canvas.className = 'scene';
    this.ctx = this.canvas.getContext('2d')!;
  }

  setCrew(pet: PetId, suit: SuitId): void {
    this.pet = pet;
    this.suit = suit;
    const others = (['pipoca', 'mimi', 'bolinha'] as PetId[]).filter((p) => p !== pet);
    // A gatinha prefere ser a capitã; senão, o primeiro que sobrou.
    this.crew = others.includes('mimi') ? ['mimi', others.find((p) => p !== 'mimi')!] : [others[0], others[1]];
  }

  reset(): void {
    this.parts = [];
    this.snap = true;
  }

  resize(w: number, h: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    // Deitado: ~20 m de largura; em pé: ~12,5 m.
    const cell = w > h ? Math.min(w / 20, h / 12.5) : w / 12.5;
    if (Math.abs(cell - this.cell) > 0.01) this.chunks.clear();
    this.cell = cell;
    this.darkCv.width = Math.ceil(w / 4);
    this.darkCv.height = Math.ceil(h / 4);
    this.snap = true;
  }

  get viewW(): number {
    return this.w / this.cell;
  }

  get viewH(): number {
    return this.h / this.cell;
  }

  toWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: this.camX + sx / this.cell, y: this.camY + sy / this.cell };
  }

  toScreen(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.camX) * this.cell, y: (y - this.camY) * this.cell };
  }

  // ---------- partículas ----------

  private add(p: Omit<Particle, 'life'>): void {
    if (this.parts.length > 260) this.parts.shift();
    this.parts.push({ ...p, life: 0 });
  }

  bubbles(x: number, y: number, n = 3, spread = 0.3): void {
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'bubble', x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread, vx: 0, vy: -1.2 - Math.random(), r: 0.05 + Math.random() * 0.1, max: 4, color: '#fff' });
    }
  }

  sparkle(x: number, y: number, n = 16, color = '#FFF59D'): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 3;
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 0.07 + Math.random() * 0.08, max: 0.7, color: i % 3 ? color : '#fff' });
    }
  }

  splash(x: number): void {
    for (let i = 0; i < 22; i++) {
      this.add({ kind: 'drop', x: x + (Math.random() - 0.5) * 0.8, y: -0.05, vx: (Math.random() - 0.5) * 4, vy: -3 - Math.random() * 4, r: 0.06 + Math.random() * 0.08, max: 1.4, color: '#E1F5FE' });
    }
    this.bubbles(x, 1, 12, 1.2);
  }

  private stepParticles(dt: number): void {
    for (const p of this.parts) {
      p.life += dt;
      if (p.kind === 'bubble') {
        p.x += Math.sin(p.life * 6 + p.max * 9) * 0.3 * dt;
        p.y += p.vy * dt;
        if (p.y < 0.05) p.life = p.max;
      } else if (p.kind === 'drop') {
        p.vy += 12 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.y > 0.1) p.life = p.max;
      } else {
        p.vx *= 1 - dt * 3;
        p.vy *= 1 - dt * 3;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    this.parts = this.parts.filter((p) => p.life < p.max);
  }

  // ---------- quadro a quadro ----------

  render(dive: Dive, dt: number, party = false): void {
    this.t += dt;
    const c = this.ctx;
    if (this.ocean !== dive.ocean) {
      this.ocean = dive.ocean;
      this.chunks.clear();
      this.darkLevel = null;
    }
    this.camera(dive, dt);
    this.stepParticles(dt);
    this.emit(dive, dt);

    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground(dive);
    this.drawTerrain(dive.ocean);
    this.drawWreck();
    this.drawDecor(dive.ocean);
    this.drawLetters(dive);
    this.drawCreatures(dive);
    this.drawBoat(dive, party);
    this.drawDiver(dive, dt, party);
    this.drawParticles();
    this.drawSurface();
    this.drawDarkness(dive);
    if (dive.flashT > 0) {
      c.fillStyle = `rgba(255,255,255,${Math.min(0.7, dive.flashT) * 0.75})`;
      c.fillRect(0, 0, this.w, this.h);
    }
  }

  private camera(dive: Dive, dt: number): void {
    const d = dive.diver;
    const ocean = dive.ocean;
    const tx = Math.max(0, Math.min(ocean.w - this.viewW, d.x - this.viewW / 2));
    const ty = Math.max(-SKY, Math.min(ocean.h - this.viewH, d.y - this.viewH * 0.45));
    if (this.snap) {
      this.camX = tx;
      this.camY = ty;
      this.snap = false;
    } else {
      const k = Math.min(1, dt * 3.5);
      this.camX += (tx - this.camX) * k;
      this.camY += (ty - this.camY) * k;
    }
  }

  private emit(dive: Dive, dt: number): void {
    // Fontes de bolhas no chão.
    this.ventT += dt;
    if (this.ventT > 0.12) {
      this.ventT = 0;
      for (const v of dive.ocean.vents) {
        if (Math.abs(v.x - (this.camX + this.viewW / 2)) < this.viewW && Math.random() < 0.8) this.bubbles(v.x, v.y - 0.2, 1, 0.5);
      }
    }
    // Bolhinhas do capacete.
    this.helmetT += dt;
    if (this.helmetT > 1.3 && dive.phase !== 'intro' && dive.diver.y > 0.8) {
      this.helmetT = 0;
      this.bubbles(dive.diver.x + dive.diver.facing * 0.35, dive.diver.y - 0.45, 3, 0.15);
    }
    // Letras subindo deixam rastro.
    for (const l of dive.letters) if (l.state === 'rising' && Math.random() < 0.4) this.bubbles(l.x, l.y + 0.3, 1, 0.4);
  }

  private sy(y: number): number {
    return (y - this.camY) * this.cell;
  }

  private sx(x: number): number {
    return (x - this.camX) * this.cell;
  }

  private drawBackground(dive: Dive): void {
    const c = this.ctx;
    const top = this.sy(0);
    if (top > 0) {
      const g = c.createLinearGradient(0, this.sy(-SKY), 0, top);
      g.addColorStop(0, '#81D4FA');
      g.addColorStop(1, '#E1F5FE');
      c.fillStyle = g;
      c.fillRect(0, 0, this.w, top);
      // Sol e nuvens (andam um pouco com a câmera).
      c.fillStyle = '#FFF59D';
      c.beginPath();
      c.arc(this.w * 0.82 - this.camX * 2, this.sy(-2.6), this.cell * 0.9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 17 - this.camX * this.cell * 0.3 + this.t * 8) % (this.w + 300)) - 150 + i * 40;
        const cy = this.sy(-2.9 + (i % 3) * 0.5);
        c.beginPath();
        c.ellipse(cx, cy, this.cell * 1.2, this.cell * 0.4, 0, 0, Math.PI * 2);
        c.ellipse(cx + this.cell * 0.7, cy - this.cell * 0.2, this.cell * 0.7, this.cell * 0.35, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
    // Água: degradê pela profundidade.
    const g = c.createLinearGradient(0, this.sy(0), 0, this.sy(dive.ocean.h));
    for (const [y, col] of WATER) g.addColorStop(y / dive.ocean.h, col);
    c.fillStyle = g;
    c.fillRect(0, Math.max(0, top), this.w, this.h);
    // Raios de luz perto da superfície.
    if (this.camY < 14) {
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (let i = -1; i < 8; i++) {
        const wx = Math.floor(this.camX / 7) * 7 + i * 7 + Math.sin(this.t * 0.4 + i) * 0.8;
        const a = 0.035 + 0.02 * Math.sin(this.t * 0.7 + i * 1.7);
        const gr = c.createLinearGradient(0, this.sy(0), 0, this.sy(16));
        gr.addColorStop(0, `rgba(255,255,255,${a})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr;
        c.beginPath();
        c.moveTo(this.sx(wx), this.sy(0));
        c.lineTo(this.sx(wx + 1.4), this.sy(0));
        c.lineTo(this.sx(wx + 5.4), this.sy(16));
        c.lineTo(this.sx(wx + 2.6), this.sy(16));
        c.closePath();
        c.fill();
      }
      c.restore();
    }
    // Morros e algas lá longe (andam mais devagar: profundidade).
    c.fillStyle = 'rgba(2, 60, 100, 0.28)';
    c.beginPath();
    const base = this.h + 10;
    c.moveTo(0, base);
    for (let px = 0; px <= this.w + 20; px += 16) {
      const wx = px / this.cell + this.camX * 0.5;
      const hy = 26 - 3 * Math.sin(wx * 0.17) - 2 * Math.sin(wx * 0.43 + 1);
      c.lineTo(px, (hy - this.camY * 0.8) * this.cell);
    }
    c.lineTo(this.w + 20, base);
    c.closePath();
    c.fill();
  }

  // ---------- rochas (pedaços prontos) ----------

  private chunk(ocean: Ocean, cx: number, cy: number): HTMLCanvasElement {
    const key = `${cx},${cy}`;
    let cv = this.chunks.get(key);
    if (cv) return cv;
    const cell = this.cell;
    cv = document.createElement('canvas');
    cv.width = Math.ceil(CHUNK * cell * this.dpr);
    cv.height = Math.ceil(CHUNK * cell * this.dpr);
    const c = cv.getContext('2d')!;
    c.scale(this.dpr, this.dpr);
    const water = (x: number, y: number) => !ocean.solid(x + 0.5, y + 0.5) && y >= 0;
    for (let j = 0; j < CHUNK; j++) {
      for (let i = 0; i < CHUNK; i++) {
        const x = cx * CHUNK + i;
        const y = cy * CHUNK + j;
        const type = ocean.cell(x + 0.5, y + 0.5);
        if (type === 'water' || y < 0) continue;
        const deep = Math.min(0.6, y / 55);
        const base = type === 'sand' ? '#E6D3A3' : type === 'wood' ? '#8D6E63' : '#6B6893';
        const rim = type === 'sand' ? '#F7EBC6' : type === 'wood' ? '#A1887F' : '#8F8BBA';
        const px = i * cell;
        const py = j * cell;
        const up = water(x, y - 1);
        const dn = water(x, y + 1);
        const lf = water(x - 1, y);
        const rt = water(x + 1, y);
        const r = cell * 0.42;
        const rTL = up && lf ? r : 0;
        const rTR = up && rt ? r : 0;
        const rBR = dn && rt ? r : 0;
        const rBL = dn && lf ? r : 0;
        c.fillStyle = mix(base, '#0B3D6B', deep);
        c.beginPath();
        const e = 0.6;
        c.moveTo(px + rTL, py - e);
        c.lineTo(px + cell - rTR + e, py - e);
        if (rTR) c.arcTo(px + cell, py, px + cell, py + rTR, rTR);
        c.lineTo(px + cell + e, py + cell - rBR + e);
        if (rBR) c.arcTo(px + cell, py + cell, px + cell - rBR, py + cell, rBR);
        c.lineTo(px + rBL - e, py + cell + e);
        if (rBL) c.arcTo(px, py + cell, px, py + cell - rBL, rBL);
        c.lineTo(px - e, py + rTL - e);
        if (rTL) c.arcTo(px, py, px + rTL, py, rTL);
        c.closePath();
        c.fill();
        const hsh = hash(x, y);
        if (type === 'wood') {
          c.strokeStyle = mix('#5D4037', '#0B3D6B', deep);
          c.lineWidth = Math.max(1, cell * 0.05);
          for (let k = 1; k < 3; k++) {
            c.beginPath();
            c.moveTo(px, py + (cell * k) / 3);
            c.lineTo(px + cell, py + (cell * k) / 3);
            c.stroke();
          }
        } else {
          c.fillStyle = mix(type === 'sand' ? '#CDB57E' : '#575479', '#0B3D6B', deep);
          for (let k = 0; k < 2; k++) {
            c.beginPath();
            c.arc(px + cell * hash(x + k, y * 3), py + cell * hash(x * 5, y + k), cell * (0.05 + 0.05 * hsh), 0, Math.PI * 2);
            c.fill();
          }
        }
        if (up) {
          // Beirada de cima mais clara (e musgo verde nas rochas).
          c.fillStyle = mix(rim, '#0B3D6B', deep);
          c.beginPath();
          c.moveTo(px + rTL, py);
          c.lineTo(px + cell - rTR, py);
          c.lineTo(px + cell - rTR * 0.6, py + cell * 0.18);
          c.lineTo(px + rTL * 0.6, py + cell * 0.18);
          c.closePath();
          c.fill();
          if (type === 'rock' && hsh < 0.5) {
            c.fillStyle = mix('#66BB6A', '#0B3D6B', deep);
            c.beginPath();
            c.ellipse(px + cell * (0.3 + hsh), py + cell * 0.06, cell * 0.22, cell * 0.12, 0, 0, Math.PI * 2);
            c.fill();
          }
        }
      }
    }
    this.chunks.set(key, cv);
    return cv;
  }

  private drawTerrain(ocean: Ocean): void {
    const c = this.ctx;
    const x0 = Math.floor(this.camX / CHUNK);
    const x1 = Math.floor((this.camX + this.viewW) / CHUNK);
    const y0 = Math.max(0, Math.floor(this.camY / CHUNK));
    const y1 = Math.floor((this.camY + this.viewH) / CHUNK);
    const size = CHUNK * this.cell;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (cx < 0 || cx * CHUNK >= ocean.w || cy * CHUNK >= ocean.h) continue;
        c.drawImage(this.chunk(ocean, cx, cy), this.sx(cx * CHUNK), this.sy(cy * CHUNK), size, size);
      }
    }
  }

  /** Detalhes do navio afundado: bandeira rasgada, escotilhas, âncora e um baú. */
  private drawWreck(): void {
    const c = this.ctx;
    const k = this.cell;
    if (this.camX > 64 || this.camX + this.viewW < 44) return;
    c.save();
    // Bandeira no mastro.
    c.fillStyle = '#C62828';
    c.beginPath();
    const fx = this.sx(52.5);
    const fy = this.sy(14.1);
    const wave = Math.sin(this.t * 2) * k * 0.1;
    c.moveTo(fx, fy);
    c.lineTo(fx + k * 1.4, fy + k * 0.2 + wave);
    c.lineTo(fx + k * 1.1, fy + k * 0.5 + wave);
    c.lineTo(fx + k * 1.4, fy + k * 0.8 + wave);
    c.lineTo(fx, fy + k * 0.9);
    c.closePath();
    c.fill();
    // Escotilhas no casco (por cima da madeira).
    c.fillStyle = '#3E2723';
    c.strokeStyle = '#FFB300';
    c.lineWidth = k * 0.06;
    for (const x of [48.5, 51, 55.5]) {
      c.beginPath();
      c.arc(this.sx(x), this.sy(28.5), k * 0.22, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    // Baú do tesouro dentro do navio.
    const bx = this.sx(56.6);
    const by = this.sy(27.2);
    c.fillStyle = '#8D6E63';
    c.fillRect(bx - k * 0.5, by - k * 0.1, k, k * 0.5);
    c.fillStyle = '#6D4C41';
    c.beginPath();
    c.ellipse(bx, by - k * 0.1, k * 0.5, k * 0.25, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = '#FFCA28';
    c.fillRect(bx - k * 0.08, by - k * 0.12, k * 0.16, k * 0.22);
    // Âncora do lado de fora.
    c.strokeStyle = '#78909C';
    c.lineWidth = k * 0.12;
    c.lineCap = 'round';
    const ax = this.sx(61.2);
    const ay = this.sy(27.4);
    c.beginPath();
    c.moveTo(ax, ay - k * 0.9);
    c.lineTo(ax, ay + k * 0.4);
    c.moveTo(ax - k * 0.45, ay + k * 0.1);
    c.quadraticCurveTo(ax, ay + k * 0.7, ax + k * 0.45, ay + k * 0.1);
    c.moveTo(ax - k * 0.3, ay - k * 0.6);
    c.lineTo(ax + k * 0.3, ay - k * 0.6);
    c.stroke();
    c.restore();
  }

  private drawDecor(ocean: Ocean): void {
    const c = this.ctx;
    const k = this.cell;
    const left = this.camX - 2;
    const right = this.camX + this.viewW + 2;
    for (const d of ocean.decor) {
      if (d.x < left || d.x > right || d.y < this.camY - 10 || d.y > this.camY + this.viewH + 2) continue;
      const h = hash(Math.floor(d.x * 7), Math.floor(d.y * 3));
      const x = this.sx(d.x);
      const y = this.sy(d.y);
      const deep = Math.min(0.55, d.y / 60);
      c.save();
      if (d.kind === 'kelp') {
        // Alga comprida balançando.
        const tall = 5 + h * 5;
        c.strokeStyle = mix(h < 0.5 ? '#558B2F' : '#7CB342', '#0B3D6B', deep);
        c.lineWidth = k * 0.22;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y);
        for (let i = 1; i <= tall; i++) {
          const sway = Math.sin(this.t * 1.1 + i * 0.6 + d.x) * 0.18 * i;
          c.lineTo(x + sway * k, y - i * k);
        }
        c.stroke();
        c.fillStyle = c.strokeStyle;
        for (let i = 1; i < tall; i += 1.3) {
          const sway = Math.sin(this.t * 1.1 + i * 0.6 + d.x) * 0.18 * i;
          c.beginPath();
          c.ellipse(x + sway * k + (i % 2.6 < 1.3 ? 1 : -1) * k * 0.28, y - i * k, k * 0.32, k * 0.12, 0.6, 0, Math.PI * 2);
          c.fill();
        }
      } else if (d.kind === 'coral') {
        const col = mix(['#FF7043', '#F06292', '#BA68C8', '#FFCA28'][Math.floor(h * 4)], '#0B3D6B', deep);
        c.strokeStyle = col;
        c.lineWidth = k * 0.2;
        c.lineCap = 'round';
        const tall = 0.8 + h * 0.6;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x, y - tall * k);
        c.moveTo(x, y - tall * 0.4 * k);
        c.quadraticCurveTo(x - k * 0.4, y - tall * 0.5 * k, x - k * 0.45, y - tall * 0.95 * k);
        c.moveTo(x, y - tall * 0.55 * k);
        c.quadraticCurveTo(x + k * 0.4, y - tall * 0.6 * k, x + k * 0.42, y - tall * 1.05 * k);
        c.stroke();
        c.fillStyle = col;
        for (const [ox, oy] of [
          [0, tall],
          [-0.45, tall * 0.95],
          [0.42, tall * 1.05],
        ]) {
          c.beginPath();
          c.arc(x + ox * k, y - oy * k, k * 0.14, 0, Math.PI * 2);
          c.fill();
        }
      } else if (d.kind === 'anemone') {
        const col = mix(h < 0.5 ? '#EC407A' : '#AB47BC', '#0B3D6B', deep);
        c.strokeStyle = col;
        c.lineWidth = k * 0.1;
        c.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
          const a = -Math.PI / 2 + (i - 3) * 0.32;
          const sway = Math.sin(this.t * 2 + i) * 0.1;
          c.beginPath();
          c.moveTo(x, y - k * 0.2);
          c.quadraticCurveTo(x + Math.cos(a + sway) * k * 0.4, y - k * 0.5, x + Math.cos(a + sway * 2) * k * 0.6, y - k * 0.2 + Math.sin(a) * k * 0.6);
          c.stroke();
        }
        c.fillStyle = mix('#F8BBD0', '#0B3D6B', deep);
        c.beginPath();
        c.ellipse(x, y - k * 0.12, k * 0.3, k * 0.16, 0, 0, Math.PI * 2);
        c.fill();
      } else {
        // Concha em leque.
        const col = mix(h < 0.5 ? '#FFCCBC' : '#F8BBD0', '#0B3D6B', deep);
        c.fillStyle = col;
        c.beginPath();
        c.moveTo(x, y - k * 0.05);
        c.arc(x, y - k * 0.05, k * 0.32, Math.PI * 1.05, Math.PI * 1.95);
        c.closePath();
        c.fill();
        c.strokeStyle = mix('#E64A19', '#0B3D6B', deep);
        c.lineWidth = k * 0.03;
        for (let i = 1; i < 5; i++) {
          const a = Math.PI * (1.05 + (0.9 * i) / 5);
          c.beginPath();
          c.moveTo(x, y - k * 0.05);
          c.lineTo(x + Math.cos(a) * k * 0.3, y - k * 0.05 + Math.sin(a) * k * 0.3);
          c.stroke();
        }
      }
      c.restore();
    }
  }

  // ---------- letras ----------

  private letterTile(l: LetterBubble, x: number, y: number, size: number): void {
    const c = this.ctx;
    const s = size * this.cell;
    c.fillStyle = '#fff';
    c.strokeStyle = letterColor(l.letter);
    c.lineWidth = s * 0.08;
    c.beginPath();
    c.roundRect(x - s / 2, y - s / 2, s, s, s * 0.22);
    c.fill();
    c.stroke();
    c.fillStyle = letterColor(l.letter);
    c.font = `900 ${Math.round(s * 0.72)}px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(l.letter, x, y + s * 0.04);
  }

  private drawLetters(dive: Dive): void {
    const c = this.ctx;
    const k = this.cell;
    const tip = { x: dive.boatX + WINCH_TIP.x, y: WINCH_TIP.y + Math.sin(this.t * 1.5) * 0.08 };
    for (const l of dive.letters) {
      if (l.state === 'stored') continue;
      const x = this.sx(l.x);
      const y = this.sy(l.y);
      if (x < -3 * k || x > this.w + 3 * k || y < -3 * k || y > this.h + 3 * k) {
        if (l.state !== 'reeling') continue;
      }
      if (l.state === 'float') {
        const pulse = 1 + Math.sin(this.t * 3 + l.id) * 0.05;
        const r = 0.72 * k * pulse;
        const glow = c.createRadialGradient(x, y, r * 0.5, x, y, r * 2);
        glow.addColorStop(0, 'rgba(255,245,157,0.55)');
        glow.addColorStop(1, 'rgba(255,245,157,0)');
        c.fillStyle = glow;
        c.beginPath();
        c.arc(x, y, r * 2, 0, Math.PI * 2);
        c.fill();
        const g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        g.addColorStop(0, 'rgba(255,255,255,0.55)');
        g.addColorStop(0.7, 'rgba(178,235,242,0.25)');
        g.addColorStop(1, 'rgba(129,212,250,0.5)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = letterColor(l.letter);
        c.strokeStyle = '#fff';
        c.lineWidth = r * 0.14;
        c.font = `900 ${Math.round(r * 1.2)}px ${FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.strokeText(l.letter, x, y + r * 0.05);
        c.fillText(l.letter, x, y + r * 0.05);
        c.strokeStyle = 'rgba(255,255,255,0.95)';
        c.lineWidth = k * 0.06;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.arc(x, y, r * 0.75, Math.PI * 1.1, Math.PI * 1.45);
        c.stroke();
      } else {
        if (l.state === 'reeling') {
          // Corda do guincho e o gancho.
          c.strokeStyle = '#ECEFF1';
          c.lineWidth = Math.max(1.5, k * 0.05);
          c.beginPath();
          c.moveTo(this.sx(tip.x), this.sy(tip.y));
          c.lineTo(x, y - 0.5 * k);
          c.stroke();
          c.strokeStyle = '#90A4AE';
          c.lineWidth = k * 0.08;
          c.beginPath();
          c.arc(x, y - 0.42 * k, k * 0.14, Math.PI * 0.1, Math.PI * 1.2);
          c.stroke();
        }
        this.letterTile(l, x, y, 0.85);
      }
    }
  }

  // ---------- bichos ----------

  private drawCreatures(dive: Dive): void {
    const c = this.ctx;
    const k = this.cell;
    for (const cr of dive.creatures) {
      const s = cr.species;
      const size = s.size * k;
      const x = this.sx(cr.x);
      const y = this.sy(cr.y);
      if (x < -size * 1.5 || x > this.w + size * 1.5 || y < -size || y > this.h + size) continue;
      if (s.glow) {
        const g = c.createRadialGradient(x, y, 0, x, y, size * 1.3);
        g.addColorStop(0, s.id === 'aguaviva' ? 'rgba(248,187,208,0.5)' : 'rgba(255,245,157,0.45)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, size * 1.3, 0, Math.PI * 2);
        c.fill();
      }
      const puffed = s.id === 'baiacu' && cr.scared > 0;
      const img = puffed ? svgImage('puffed', puffedSvg) : svgImage(`c:${s.id}`, () => creatureSvg(s.id));
      if (!img.complete) continue;
      const w = size * 1.4 * (puffed ? 1.25 : 1);
      const hgt = w * (120 / 140);
      c.save();
      c.translate(x, y);
      let peek = 0;
      if (s.behavior === 'peek') {
        // Moreia: põe a cabeça para fora da toca e volta.
        peek = (Math.sin(this.t * 0.9) * 0.5 + 0.5) * 0.6;
        c.translate(-peek * k * 0.2, peek * k * 0.8);
        c.rotate(0.9);
      }
      if (cr.facing < 0 && s.behavior !== 'peek') c.scale(-1, 1);
      if (s.behavior === 'drift') {
        const p = 1 + Math.sin(this.t * 3 + cr.id) * 0.06;
        c.scale(1 / p, p);
      } else if (s.speed > 0 && s.behavior !== 'floor') {
        c.rotate(Math.sin(this.t * 5 + cr.id) * 0.05 + Math.max(-0.4, Math.min(0.4, cr.vy * 0.15)) * (cr.facing < 0 ? -1 : 1));
      }
      c.drawImage(img, -w / 2, -hgt / 2, w, hgt);
      c.restore();
    }
  }

  // ---------- barco e mergulhador ----------

  private boatY(): number {
    return Math.sin(this.t * 1.5) * 0.08;
  }

  private drawBoat(dive: Dive, party: boolean): void {
    const c = this.ctx;
    const k = this.cell;
    const img = svgImage(`boat:${this.crew.join(',')}`, () => boatSvg(this.crew[0], this.crew[1]));
    if (!img.complete) return;
    const bx = this.sx(dive.boatX);
    const by = this.sy(this.boatY() - (party ? Math.abs(Math.sin(this.t * 6)) * 0.15 : 0));
    if (by < -2 * k || by > this.h + 5 * k) return;
    c.save();
    c.translate(bx, by);
    c.rotate(Math.sin(this.t * 1.1) * 0.03);
    c.drawImage(img, (-150 / 40) * k, (-150 / 40) * k, (300 / 40) * k, (190 / 40) * k);
    c.restore();
  }

  private drawDiver(dive: Dive, dt: number, party: boolean): void {
    const c = this.ctx;
    const k = this.cell;
    const d = dive.diver;
    const speed = Math.hypot(d.vx, d.vy);
    this.frameT += dt;
    if (this.frameT > (speed > 0.6 ? 0.18 : 0.5)) {
      this.frameT = 0;
      this.frame = this.frame ? 0 : 1;
    }
    const onDeck = dive.phase === 'intro' || dive.phase === 'done';
    const img = svgImage(`diver:${this.pet}:${this.suit}:${this.frame}`, () => diverSvg(this.pet, this.suit, this.frame));
    if (!img.complete) return;
    const w = 2.3 * k;
    const h = w * (120 / 150);
    let x = d.x;
    let y = d.y;
    let rot = Math.max(-0.5, Math.min(0.5, d.vy * 0.12)) * d.facing;
    let face = d.facing;
    if (onDeck) {
      x = dive.boatX + 1.4;
      y = BOAT_Y - 0.55 + this.boatY() - (party ? Math.abs(Math.sin(this.t * 6)) * 0.5 : 0);
      rot = party ? Math.sin(this.t * 6) * 0.2 : -0.1;
      face = 1;
    } else if (d.y < 0.4) {
      y = d.y + Math.sin(this.t * 2) * 0.05;
      rot *= 0.3;
    }
    c.save();
    c.translate(this.sx(x), this.sy(y));
    c.rotate(rot);
    if (face < 0) c.scale(-1, 1);
    c.drawImage(img, -w / 2, -h / 2, w, h);
    c.restore();
  }

  private drawParticles(): void {
    const c = this.ctx;
    const k = this.cell;
    for (const p of this.parts) {
      const x = this.sx(p.x);
      const y = this.sy(p.y);
      const a = 1 - p.life / p.max;
      if (p.kind === 'bubble') {
        c.strokeStyle = `rgba(255,255,255,${0.75 * Math.min(1, a * 3)})`;
        c.lineWidth = Math.max(1, k * 0.025);
        c.beginPath();
        c.arc(x, y, p.r * k, 0, Math.PI * 2);
        c.stroke();
      } else {
        c.globalAlpha = a;
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(x, y, p.r * k, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
    }
  }

  private drawSurface(): void {
    const c = this.ctx;
    const k = this.cell;
    const y0 = this.sy(0);
    if (y0 < -k || y0 > this.h + k) return;
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.moveTo(0, y0 + k * 0.25);
    for (let px = 0; px <= this.w + 10; px += 10) {
      const wx = px / k + this.camX;
      c.lineTo(px, y0 + Math.sin(wx * 1.3 + this.t * 2) * k * 0.08);
    }
    c.lineTo(this.w + 10, y0 + k * 0.25);
    c.closePath();
    c.fill();
  }

  // ---------- escuridão ----------

  private levels(ocean: Ocean): Float32Array {
    if (this.darkLevel) return this.darkLevel;
    const W = ocean.w;
    const H = ocean.h;
    const raw = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) raw[y * W + x] = ocean.dark(x + 0.5, y + 0.5) ? 1 : 0;
    // Suaviza a borda entre claro e escuro.
    const out = new Float32Array(W * H);
    const R = 2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let sum = 0;
        let n = 0;
        for (let dy = -R; dy <= R; dy++) {
          for (let dx = -R; dx <= R; dx++) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            sum += raw[yy * W + xx];
            n++;
          }
        }
        out[y * W + x] = sum / n;
      }
    }
    this.darkLevel = out;
    return out;
  }

  private drawDarkness(dive: Dive): void {
    const ocean = dive.ocean;
    const lv = this.levels(ocean);
    const x0 = Math.max(0, Math.floor(this.camX));
    const x1 = Math.min(ocean.w - 1, Math.ceil(this.camX + this.viewW));
    const y0 = Math.max(0, Math.floor(this.camY));
    const y1 = Math.min(ocean.h - 1, Math.ceil(this.camY + this.viewH));
    let any = false;
    for (let y = y0; y <= y1 && !any; y++) for (let x = x0; x <= x1; x++) if (lv[y * ocean.w + x] > 0) any = true;
    if (!any) return;
    const dc = this.darkCv.getContext('2d')!;
    const q = 0.25;
    dc.setTransform(1, 0, 0, 1, 0, 0);
    dc.clearRect(0, 0, this.darkCv.width, this.darkCv.height);
    const strength = 0.88 * (1 - Math.min(1, dive.flashT * 1.6));
    const k = this.cell * q;
    // Um pixel por casa (num canvas pequenino) e depois esticado com suavização:
    // a escuridão fica sem quadradinhos.
    const cols = x1 - x0 + 1;
    const rows = y1 - y0 + 1;
    const tiny = this.tiny;
    if (tiny.width !== cols || tiny.height !== rows) {
      tiny.width = cols;
      tiny.height = rows;
    }
    const tc = tiny.getContext('2d')!;
    const img = tc.createImageData(cols, rows);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = ((y - y0) * cols + (x - x0)) * 4;
        img.data[i] = 2;
        img.data[i + 1] = 8;
        img.data[i + 2] = 26;
        img.data[i + 3] = Math.round(lv[y * ocean.w + x] * strength * 255);
      }
    }
    tc.putImageData(img, 0, 0);
    dc.imageSmoothingEnabled = true;
    // Cada pixel vale o meio da casa: desloca meia casa.
    dc.drawImage(tiny, (x0 + 0.5 - this.camX) * k - k / 2, (y0 + 0.5 - this.camY) * k - k / 2, cols * k, rows * k);
    // Luzes: capacete, bichos que brilham, bolhas das letras.
    dc.globalCompositeOperation = 'destination-out';
    const light = (wx: number, wy: number, r: number) => {
      const x = (wx - this.camX) * k;
      const y = (wy - this.camY) * k;
      const g = dc.createRadialGradient(x, y, 0, x, y, r * k);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.85)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dc.fillStyle = g;
      dc.beginPath();
      dc.arc(x, y, r * k, 0, Math.PI * 2);
      dc.fill();
    };
    const d = dive.diver;
    light(d.x + d.facing * 0.8, d.y, 4.6);
    for (const cr of dive.creatures) if (cr.species.glow) light(cr.x, cr.y, 2.2);
    for (const l of dive.letters) if (l.state === 'float') light(l.x, l.y, 2.2);
    dc.globalCompositeOperation = 'source-over';
    const c = this.ctx;
    c.imageSmoothingEnabled = true;
    c.drawImage(this.darkCv, 0, 0, this.darkCv.width / q, this.darkCv.height / q);
  }
}
