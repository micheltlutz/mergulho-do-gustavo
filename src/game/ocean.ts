// O mar: grade de blocos de 1 m (água, rocha, areia, madeira do navio),
// lugares com nome (para as dicas da Bolinha), cantinhos das letras,
// fontes de bolhas e enfeites. A superfície da água é y = 0 (y cresce para baixo).

import { OCEAN_ROWS } from './oceanMap.ts';

export type Cell = 'water' | 'rock' | 'sand' | 'wood';
export type Decor = 'coral' | 'anemone' | 'kelp' | 'shell';

export interface Zone {
  id: string;
  /** Como a Bolinha fala do lugar ("estou vendo a letra S perto do navio"). */
  hint: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  dark: boolean;
}

/** Ordem importa: o primeiro que contém o ponto vale. */
export const ZONES: readonly Zone[] = [
  { id: 'caverna', hint: 'dentro da caverna escura', x0: 14, y0: 24, x1: 36, y1: 33, dark: true },
  { id: 'fundo', hint: 'lá no fundo, perto das águas-vivas', x0: 72, y0: 26, x1: 89, y1: 41, dark: true },
  { id: 'corais', hint: 'perto dos corais', x0: 0, y0: 0, x1: 23, y1: 23, dark: false },
  { id: 'algas', hint: 'nas algas', x0: 24, y0: 0, x1: 43, y1: 23, dark: false },
  { id: 'navio', hint: 'perto do navio afundado', x0: 44, y0: 0, x1: 61, y1: 41, dark: false },
  { id: 'conchas', hint: 'no jardim de conchas', x0: 62, y0: 0, x1: 71, y1: 41, dark: false },
  { id: 'aberto', hint: 'lá longe, no mar aberto', x0: 72, y0: 0, x1: 89, y1: 25, dark: false },
];

export interface Spot {
  x: number;
  y: number;
  zone: Zone;
}

const CELLS: Record<string, Cell> = { '#': 'rock', s: 'sand', w: 'wood' };
const DECOR: Record<string, Decor> = { c: 'coral', a: 'anemone', k: 'kelp', h: 'shell' };

export class Ocean {
  readonly w: number;
  readonly h: number;
  private readonly cells: Cell[];
  readonly spots: Spot[] = [];
  readonly vents: { x: number; y: number }[] = [];
  readonly decor: { x: number; y: number; kind: Decor }[] = [];

  constructor(rows: readonly string[] = OCEAN_ROWS) {
    this.h = rows.length;
    this.w = rows[0].length;
    this.cells = [];
    rows.forEach((row, y) => {
      if (row.length !== this.w) throw new Error(`linha ${y} com tamanho errado`);
      [...row].forEach((ch, x) => {
        this.cells.push(CELLS[ch] ?? 'water');
        if (ch === '*') this.spots.push({ x: x + 0.5, y: y + 0.5, zone: this.zoneAt(x + 0.5, y + 0.5) });
        else if (ch === 'v') this.vents.push({ x: x + 0.5, y: y + 1 });
        else if (DECOR[ch]) this.decor.push({ x: x + 0.5, y: y + 1, kind: DECOR[ch] });
      });
    });
  }

  cell(x: number, y: number): Cell {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    // Fora do mapa: paredes nos lados e no fundo; acima da superfície é "água" (a superfície segura).
    if (cx < 0 || cx >= this.w || cy >= this.h) return 'rock';
    if (cy < 0) return 'water';
    return this.cells[cy * this.w + cx];
  }

  solid(x: number, y: number): boolean {
    return this.cell(x, y) !== 'water';
  }

  zoneAt(x: number, y: number): Zone {
    return ZONES.find((z) => x >= z.x0 && x < z.x1 + 1 && y >= z.y0 && y < z.y1 + 1) ?? ZONES[ZONES.length - 1];
  }

  zoneById(id: string): Zone | undefined {
    return ZONES.find((z) => z.id === id);
  }

  dark(x: number, y: number): boolean {
    return this.zoneAt(x, y).dark;
  }

  /**
   * Casas de água alcançáveis a partir de um ponto (busca na grade, só
   * passando por casas de água). Serve para testes, dicas e para os bichos.
   */
  reachable(fromX: number, fromY: number): Set<number> {
    const start = Math.floor(fromY) * this.w + Math.floor(fromX);
    const seen = new Set<number>([start]);
    const q = [start];
    for (let i = 0; i < q.length; i++) {
      const c = q[i];
      const x = c % this.w;
      const y = Math.floor(c / this.w);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
        const n = ny * this.w + nx;
        if (seen.has(n) || this.cells[n] !== 'water') continue;
        seen.add(n);
        q.push(n);
      }
    }
    return seen;
  }

  /** Dá para ir em linha reta de um ponto a outro com esta largura (raio)? */
  clear(x0: number, y0: number, x1: number, y1: number, r = 0): boolean {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.ceil(d / 0.2));
    const px = d ? (-(y1 - y0) / d) * r : 0;
    const py = d ? ((x1 - x0) / d) * r : 0;
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      if (this.solid(x, y) || this.solid(x + px, y + py) || this.solid(x - px, y - py)) return false;
    }
    return true;
  }

  /** Caminho mais curto (em casas) de um ponto até a superfície (para a letra subir). */
  pathToSurface(fromX: number, fromY: number): { x: number; y: number }[] {
    const W = this.w;
    const start = Math.floor(fromY) * W + Math.floor(fromX);
    const prev = new Map<number, number>([[start, -1]]);
    const q = [start];
    let end = start;
    for (let i = 0; i < q.length; i++) {
      const c = q[i];
      if (Math.floor(c / W) === 0) {
        end = c;
        break;
      }
      const x = c % W;
      const y = Math.floor(c / W);
      // Para cima primeiro: o caminho prefere subir reto.
      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [-1, 0],
        [0, 1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= this.h) continue;
        const n = ny * W + nx;
        if (prev.has(n) || this.cells[n] !== 'water') continue;
        prev.set(n, c);
        q.push(n);
      }
    }
    const out: { x: number; y: number }[] = [];
    for (let c = end; c !== -1; c = prev.get(c)!) out.push({ x: (c % W) + 0.5, y: Math.floor(c / W) + 0.5 });
    out.reverse();
    // Junta os trechos retos (a letra vai direto de canto a canto).
    return out.filter((p, i) => i === 0 || i === out.length - 1 || !(out[i - 1].x === p.x && out[i + 1].x === p.x) && !(out[i - 1].y === p.y && out[i + 1].y === p.y));
  }

  /** Caminho mais curto (em casas) entre dois pontos, ou null. */
  path(fromX: number, fromY: number, toX: number, toY: number): { x: number; y: number }[] | null {
    const W = this.w;
    const start = Math.floor(fromY) * W + Math.floor(fromX);
    const goal = Math.floor(toY) * W + Math.floor(toX);
    const prev = new Map<number, number>([[start, -1]]);
    const q = [start];
    for (let i = 0; i < q.length; i++) {
      const c = q[i];
      if (c === goal) break;
      const x = c % W;
      const y = Math.floor(c / W);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= this.h) continue;
        const n = ny * W + nx;
        if (prev.has(n) || this.cells[n] !== 'water') continue;
        prev.set(n, c);
        q.push(n);
      }
    }
    if (!prev.has(goal)) return null;
    const out: { x: number; y: number }[] = [];
    for (let c = goal; c !== -1; c = prev.get(c)!) out.push({ x: (c % W) + 0.5, y: Math.floor(c / W) + 0.5 });
    return out.reverse();
  }
}
