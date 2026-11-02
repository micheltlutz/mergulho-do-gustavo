// O mergulho, sem desenho: o pet nada, estoura as bolhas das letras, a
// letra sobe até a superfície e o guincho da Mimi puxa para o barco. Os
// bichos passeiam; o flash tira foto de quem está perto. A Bolinha dá dicas.
// Quando todas as letras chegam ao barco, o pet volta e começa a festa.

import { SPECIES, type Species } from './creatures.ts';
import { Ocean, type Spot } from './ocean.ts';
import { newBody, PHYS, swim, type Body } from './physics.ts';
import { rng, type Word } from './words.ts';

export const BOAT_Y = -0.6;
export const START_X = 8;
/** Encostar na bolha: distância entre os centros. */
export const POP_RANGE = PHYS.radius + 0.75;
export const RISE_SPEED = 3.2;
export const REEL_TIME = 0.9;
export const PHOTO_RANGE = 6.5;
/** Sem achar letra por este tempo, a Bolinha dá uma dica. */
export const HINT_EVERY = 12;
const INTRO_TIME = 1.6;

export type Phase = 'intro' | 'dive' | 'party' | 'done';

export interface LetterBubble {
  id: number;
  letter: string;
  /** Lugar da letra no painel. */
  slot: number;
  spot: Spot;
  x: number;
  y: number;
  state: 'float' | 'rising' | 'reeling' | 'stored';
  t: number;
  /** De onde começou a ser puxada pelo guincho. */
  from?: { x: number; y: number };
  /** Caminho até a superfície (sai da caverna e do navio pelas aberturas). */
  route?: { x: number; y: number }[];
}

export interface Creature {
  id: number;
  species: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  tx: number;
  ty: number;
  /** Seguindo quem (cardume). */
  leader?: Creature;
  ox: number;
  oy: number;
  t: number;
  /** Assustado (peixe-balão estufa). */
  scared: number;
}

export type DiveEvent =
  | { t: 'splash'; x: number }
  | { t: 'pop'; bubble: LetterBubble }
  | { t: 'stored'; bubble: LetterBubble }
  | { t: 'hint'; bubble: LetterBubble }
  | { t: 'flash' }
  | { t: 'photo'; species: Species[]; best: Creature }
  | { t: 'vent'; x: number; y: number }
  | { t: 'party' }
  | { t: 'aboard' };

/** Distância pelo caminho (em casas) do barco até cada casa de água. */
function distances(ocean: Ocean, fromX: number, fromY: number): Map<number, number> {
  const W = ocean.w;
  const start = Math.floor(fromY) * W + Math.floor(fromX);
  const dist = new Map<number, number>([[start, 0]]);
  const q = [start];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
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
      if (nx < 0 || ny < 0 || nx >= W || ny >= ocean.h) continue;
      const n = ny * W + nx;
      if (dist.has(n) || ocean.solid(nx + 0.5, ny + 0.5)) continue;
      dist.set(n, dist.get(c)! + 1);
      q.push(n);
    }
  }
  return dist;
}

/**
 * Escolhe os cantinhos das letras: espalhados pelo mar, as primeiras
 * letras mais perto do barco e as últimas mais longe (com um pouco de sorte
 * para cada mergulho ser diferente).
 */
export function pickSpots(ocean: Ocean, n: number, rand: () => number): Spot[] {
  const dist = distances(ocean, START_X, 0.5);
  const sorted = [...ocean.spots].sort(
    (a, b) => (dist.get(Math.floor(a.y) * ocean.w + Math.floor(a.x)) ?? 1e9) - (dist.get(Math.floor(b.y) * ocean.w + Math.floor(b.x)) ?? 1e9),
  );
  const S = sorted.length;
  if (n >= S) return sorted.slice(0, n);
  const used = new Set<number>();
  const out: Spot[] = [];
  for (let i = 0; i < n; i++) {
    const ideal = n === 1 ? 0 : (i * (S - 1)) / (n - 1);
    let k = Math.round(ideal + (rand() - 0.5) * (S / n) * 0.8);
    k = Math.max(0, Math.min(S - 1, k));
    // Sem repetir: procura o livre mais perto.
    for (let d = 0; used.has(k); d++) {
      const a = k + (d % 2 ? -(d + 1) / 2 : d / 2);
      if (a >= 0 && a < S && !used.has(a)) k = a;
    }
    used.add(k);
    out.push(sorted[k]);
  }
  return out.sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
}

export class Dive {
  readonly word: Word;
  readonly ocean: Ocean;
  readonly diver: Body;
  readonly letters: LetterBubble[] = [];
  readonly creatures: Creature[] = [];
  readonly events: DiveEvent[] = [];
  phase: Phase = 'intro';
  time = 0;
  boatX = START_X;
  /** Ponto do dedo no mar (ou null). */
  target: { x: number; y: number } | null = null;
  flashT = 0;
  private flashCool = 0;
  lastFound = 0;
  private lastHint = -99;
  private nextId = 1;
  private readonly rand: () => number;
  private partyT = 0;
  /** Na fonte de bolhas agora (para o som). */
  private inVent = false;

  constructor(word: Word, seed = Date.now(), ocean = new Ocean()) {
    this.word = word;
    this.ocean = ocean;
    this.rand = rng(seed);
    this.diver = newBody(START_X + 1.2, BOAT_Y - 0.6);
    const spots = pickSpots(ocean, word.letters.length, this.rand);
    word.letters.forEach((letter, slot) => {
      const spot = spots[slot];
      this.letters.push({ id: this.nextId++, letter, slot, spot, x: spot.x, y: spot.y, state: 'float', t: this.rand() * 6 });
    });
    this.spawnCreatures();
  }

  get found(): number {
    return this.letters.filter((l) => l.state !== 'float').length;
  }

  get stored(): number {
    return this.letters.filter((l) => l.state === 'stored').length;
  }

  /** A letra que falta mais perto do mergulhador. */
  nearestLetter(): LetterBubble | null {
    let best: LetterBubble | null = null;
    let bd = Infinity;
    for (const l of this.letters) {
      if (l.state !== 'float') continue;
      const d = Math.hypot(l.x - this.diver.x, l.y - this.diver.y);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best;
  }

  /** Botão da câmera: flash que ilumina e fotografa quem está perto. */
  flash(): void {
    if (this.phase !== 'dive' || this.flashCool > 0) return;
    this.flashT = 0.7;
    this.flashCool = 0.8;
    this.events.push({ t: 'flash' });
    const d = this.diver;
    const seen = this.creatures
      .map((c) => ({ c, dist: Math.hypot(c.x - d.x, c.y - d.y) - c.species.size * 0.4 }))
      .filter(({ c, dist }) => dist < PHOTO_RANGE && (dist < 2.5 || (c.x - d.x) * d.facing > -1))
      .sort((a, b) => a.dist - b.dist);
    if (!seen.length) return;
    const species = [...new Set(seen.map((s) => s.c.species))];
    this.events.push({ t: 'photo', species, best: seen[0].c });
  }

  step(dt: number): void {
    this.time += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.flashCool = Math.max(0, this.flashCool - dt);
    const d = this.diver;
    if (this.phase === 'intro') {
      // No convés, depois pula na água.
      d.x = this.boatX + 1.2;
      d.y = BOAT_Y - 0.6;
      if (this.time >= INTRO_TIME) {
        this.phase = 'dive';
        d.x = this.boatX + 2.6;
        d.y = 1.4;
        d.vy = 2.5;
        d.vx = 1;
        this.lastFound = this.time;
        this.events.push({ t: 'splash', x: d.x });
        const first = this.nearestLetter();
        if (first) {
          this.lastHint = this.time;
          this.events.push({ t: 'hint', bubble: first });
        }
      }
    } else if (this.phase === 'dive' || this.phase === 'party') {
      let push = 0;
      let vent: { x: number; y: number } | null = null;
      for (const v of this.ocean.vents) {
        if (Math.abs(d.x - v.x) < 0.8 && d.y < v.y && d.y > v.y - 7) {
          push = 5;
          vent = v;
        }
      }
      if (vent && !this.inVent) this.events.push({ t: 'vent', x: vent.x, y: vent.y });
      this.inVent = !!vent;
      let target = this.target;
      if (this.phase === 'party') {
        // Volta sozinho para o lado do barco.
        target = { x: this.boatX + 2.2, y: PHYS.surface };
      }
      swim(d, target, dt, this.ocean, push);
      d.x = Math.max(0.6, Math.min(this.ocean.w - 0.6, d.x));
      if (this.phase === 'party') {
        this.partyT += dt;
        if (Math.hypot(d.x - (this.boatX + 2.2), d.y - PHYS.surface) < 0.9 || this.partyT > 12) {
          this.phase = 'done';
          this.events.push({ t: 'aboard' });
        }
      }
    }

    // Barco acompanha o mergulhador pela superfície.
    if (this.phase === 'dive') {
      const want = Math.max(6, Math.min(this.ocean.w - 8, d.x - 1.5));
      const dx = want - this.boatX;
      if (Math.abs(dx) > 2.5) this.boatX += Math.sign(dx) * Math.min(Math.abs(dx) - 2.5, 3.6 * dt);
    }

    this.stepLetters(dt);
    this.stepCreatures(dt);

    // Dica da Bolinha quando fica muito tempo sem achar letra.
    if (this.phase === 'dive' && this.time - this.lastFound > HINT_EVERY && this.time - this.lastHint > HINT_EVERY) {
      const l = this.nearestLetter();
      if (l) {
        this.lastHint = this.time;
        this.events.push({ t: 'hint', bubble: l });
      }
    }
  }

  private stepLetters(dt: number): void {
    const d = this.diver;
    for (const l of this.letters) {
      l.t += dt;
      if (l.state === 'float') {
        // Balança devagar no lugar.
        l.x = l.spot.x + Math.sin(l.t * 0.9) * 0.15;
        l.y = l.spot.y + Math.sin(l.t * 1.3) * 0.2;
        if (this.phase === 'dive' && Math.hypot(l.x - d.x, l.y - d.y) < POP_RANGE) {
          l.state = 'rising';
          l.t = 0;
          l.route = this.ocean.pathToSurface(l.x, l.y);
          this.lastFound = this.time;
          this.events.push({ t: 'pop', bubble: l });
        }
      } else if (l.state === 'rising') {
        // Sobe pelo caminho até a superfície.
        let step = RISE_SPEED * dt;
        const route = l.route!;
        while (step > 0 && route.length) {
          const p = route[0];
          const dx = p.x - l.x;
          const dy = Math.max(0.4, p.y) - l.y;
          const d = Math.hypot(dx, dy);
          if (d <= step) {
            l.x = p.x;
            l.y = Math.max(0.4, p.y);
            step -= d;
            route.shift();
          } else {
            l.x += (dx / d) * step;
            l.y += (dy / d) * step;
            step = 0;
          }
        }
        if (!route.length) {
          l.state = 'reeling';
          l.t = 0;
          l.from = { x: l.x, y: l.y };
        }
      } else if (l.state === 'reeling') {
        const k = Math.min(1, l.t / REEL_TIME);
        const e = k * k * (3 - 2 * k);
        l.x = l.from!.x + (this.boatX - 0.4 - l.from!.x) * e;
        l.y = l.from!.y + (BOAT_Y - 0.4 - l.from!.y) * e - Math.sin(k * Math.PI) * 0.8;
        if (k >= 1) {
          l.state = 'stored';
          this.events.push({ t: 'stored', bubble: l });
          if (this.letters.every((x) => x.state === 'stored') && this.phase === 'dive') {
            this.phase = 'party';
            this.partyT = 0;
            this.target = null;
            this.events.push({ t: 'party' });
          }
        }
      }
    }
  }

  // ---------- bichos ----------

  private waterIn(zones: string[], depth?: [number, number], rangeX?: [number, number]): { x: number; y: number } | null {
    for (let tries = 0; tries < 300; tries++) {
      const z = this.zoneRect(zones[Math.floor(this.rand() * zones.length)]);
      if (!z) return null;
      const x0 = rangeX ? rangeX[0] : z.x0;
      const x1 = rangeX ? rangeX[1] : z.x1 + 1;
      const y0 = depth ? Math.max(depth[0], z.y0) : Math.max(1, z.y0);
      const y1 = depth ? Math.min(depth[1], z.y1 + 1) : z.y1 + 1;
      const x = x0 + this.rand() * (x1 - x0);
      const y = y0 + this.rand() * Math.max(0.1, y1 - y0);
      if (!this.ocean.solid(x, y) && (rangeX || zones.includes(this.ocean.zoneAt(x, y).id))) return { x, y };
    }
    return null;
  }

  private zoneRect(id: string) {
    return this.ocean.zoneById(id);
  }

  /** Um lugar no chão (em cima de areia/rocha) num dos lugares. */
  private floorIn(zones: string[]): { x: number; y: number } | null {
    for (let tries = 0; tries < 300; tries++) {
      const z = this.zoneRect(zones[Math.floor(this.rand() * zones.length)])!;
      const x = z.x0 + 1 + this.rand() * (z.x1 - z.x0 - 1);
      for (let y = Math.max(1, z.y0); y <= z.y1; y++) {
        if (!this.ocean.solid(x, y + 0.5) && this.ocean.solid(x, y + 1.5)) {
          if (this.ocean.zoneAt(x, y).id === z.id) return { x, y: y + 0.75 };
        }
      }
    }
    return null;
  }

  private spawnCreatures(): void {
    for (const s of SPECIES) {
      let leader: Creature | undefined;
      for (let i = 0; i < s.count; i++) {
        let p: { x: number; y: number } | null;
        if (s.home) p = { x: s.home[0], y: s.home[1] };
        else if (s.behavior === 'floor') p = this.floorIn(s.zones);
        else if (leader && s.behavior === 'school') p = { x: leader.x - 0.8 * (i + 1), y: leader.y + (i % 2 ? 0.5 : -0.5) };
        else p = this.waterIn(s.zones, s.depth, s.range);
        if (!p) continue;
        const c: Creature = {
          id: this.nextId++,
          species: s,
          x: p.x,
          y: p.y,
          vx: 0,
          vy: 0,
          facing: this.rand() < 0.5 ? 1 : -1,
          tx: p.x,
          ty: p.y,
          ox: -0.8 * i,
          oy: i % 2 ? 0.5 : -0.5,
          t: this.rand() * 10,
          scared: 0,
        };
        if (s.behavior === 'school') {
          if (leader) c.leader = leader;
          else leader = c;
        }
        this.creatures.push(c);
      }
    }
  }

  private newTarget(c: Creature): void {
    const s = c.species;
    if (s.behavior === 'cruise' && s.range) {
      // Vai até a outra ponta.
      c.tx = c.x < (s.range[0] + s.range[1]) / 2 ? s.range[1] : s.range[0];
      c.ty = s.depth ? s.depth[0] + this.rand() * (s.depth[1] - s.depth[0]) : c.y;
      return;
    }
    const p = this.waterIn(s.zones, s.depth, s.range);
    if (p) {
      c.tx = p.x;
      c.ty = p.y;
    }
  }

  private stepCreatures(dt: number): void {
    const d = this.diver;
    for (const c of this.creatures) {
      const s = c.species;
      c.t += dt;
      c.scared = Math.max(0, c.scared - dt);
      const near = Math.hypot(c.x - d.x, c.y - d.y);
      if (near < 2.2 && this.phase === 'dive') c.scared = 1.5;
      if (s.behavior === 'peek' || s.speed === 0) {
        if (s.behavior === 'floor') c.facing = 1;
        continue;
      }
      let vx = 0;
      let vy = 0;
      if (s.behavior === 'school' && c.leader) {
        vx = (c.leader.x + c.ox * c.leader.facing - c.x) * 2;
        vy = (c.leader.y + c.oy - c.y) * 2;
      } else if (s.behavior === 'floor') {
        // Caranguejo: anda de lado no chão.
        if (Math.abs(c.tx - c.x) < 0.2 || c.t > 6) {
          c.t = 0;
          c.tx = c.x + (this.rand() - 0.5) * 6;
        }
        const nx = c.x + Math.sign(c.tx - c.x) * s.speed * dt;
        if (!this.ocean.solid(nx, c.y) && this.ocean.solid(nx, c.y + 1)) c.x = nx;
        else c.tx = c.x;
        continue;
      } else {
        const dx = c.tx - c.x;
        const dy = c.ty - c.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.4 || c.t > 14) {
          c.t = 0;
          this.newTarget(c);
        } else {
          const sp = s.behavior === 'drift' ? s.speed * 0.6 : s.speed;
          vx = (dx / dist) * sp;
          vy = (dy / dist) * sp;
        }
        if (s.behavior === 'drift') vy += Math.sin(c.t * 1.6) * 0.35;
      }
      // Os tímidos se afastam do mergulhador.
      if (s.shy && near < 2.6 && this.phase === 'dive') {
        vx += ((c.x - d.x) / near) * s.speed * 1.4;
        vy += ((c.y - d.y) / near) * s.speed * 1.4;
      }
      const k = Math.min(1, dt * 2.5);
      c.vx += (vx - c.vx) * k;
      c.vy += (vy - c.vy) * k;
      const nx = c.x + c.vx * dt;
      const ny = c.y + c.vy * dt;
      const big = s.size > 3;
      if (big || (!this.ocean.solid(nx, ny) && ny > 0.6)) {
        c.x = nx;
        c.y = Math.max(0.6, ny);
      } else {
        c.vx = c.vy = 0;
        this.newTarget(c);
      }
      if (Math.abs(c.vx) > 0.08) c.facing = c.vx > 0 ? 1 : -1;
    }
  }
}
