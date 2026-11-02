import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/game/creatures.ts';
import { Dive, pickSpots, START_X, type DiveEvent } from '../src/game/dive.ts';
import { Ocean, ZONES } from '../src/game/ocean.ts';
import { newBody, PHYS, swim } from '../src/game/physics.ts';
import { rng, WORDS } from '../src/game/words.ts';

const DT = 1 / 60;
const ocean = new Ocean();

/** O ponto mais longe do caminho (até 6 passos) que dá para ver em linha reta, como um dedo. */
function aim(dive: Dive, path: { x: number; y: number }[]): { x: number; y: number } | undefined {
  const d = dive.diver;
  for (let k = Math.min(6, path.length - 1); k > 0; k--) if (ocean.clear(d.x, d.y, path[k].x, path[k].y, d.r)) return path[k];
  return path[0];
}

describe('física do nado', () => {
  it('solto, ele boia devagar até a superfície e para lá', () => {
    const b = newBody(10, 6);
    let maxUp = 0;
    for (let i = 0; i < 60 * 30; i++) {
      swim(b, null, DT, ocean);
      maxUp = Math.max(maxUp, -b.vy);
    }
    expect(b.y).toBeCloseTo(PHYS.surface, 5);
    expect(maxUp).toBeLessThan(0.6); // sobe devagar
  });

  it('arrastando, vai até o dedo e para perto dele', () => {
    const b = newBody(10, 3);
    for (let i = 0; i < 60 * 6; i++) swim(b, { x: 20, y: 6 }, DT, ocean);
    expect(Math.hypot(b.x - 20, b.y - 6)).toBeLessThan(0.4);
    expect(b.facing).toBe(1);
  });

  it('soltou: desliza um pouquinho e para', () => {
    const b = newBody(30, 6);
    b.vx = 5;
    for (let i = 0; i < 60 * 3; i++) swim(b, null, DT, ocean);
    expect(Math.abs(b.vx)).toBeLessThan(0.01);
    expect(b.x).toBeGreaterThan(31);
    expect(b.x).toBeLessThan(33.5);
  });

  it('não atravessa rocha, nem rápido', () => {
    // Em cima do recife (chão em y = 14), tentando ir para baixo.
    const b = newBody(4, 10);
    for (let i = 0; i < 60 * 5; i++) swim(b, { x: 4, y: 30 }, DT, ocean);
    expect(b.y).toBeLessThan(14 - PHYS.radius + 0.01);
    for (let y = b.y - b.r + 0.05; y < b.y + b.r; y += 0.1) expect(ocean.solid(b.x, y)).toBe(false);
  });
});

describe('mapa do mar', () => {
  const reach = ocean.reachable(START_X, 0.5);
  const at = (x: number, y: number) => reach.has(Math.floor(y) * ocean.w + Math.floor(x));

  it('tem cantinhos para a palavra mais comprida e todos dá para alcançar', () => {
    const longest = Math.max(...WORDS.map((w) => w.letters.length));
    expect(ocean.spots.length).toBeGreaterThanOrEqual(longest);
    for (const s of ocean.spots) expect(at(s.x, s.y)).toBe(true);
  });

  it('todos os lugares têm pelo menos um cantinho de letra', () => {
    for (const z of ZONES) expect(ocean.spots.some((s) => s.zone.id === z.id)).toBe(true);
  });

  it('os cantinhos escolhidos não se repetem e as primeiras letras ficam mais perto', () => {
    for (const w of WORDS) {
      for (let seed = 1; seed <= 20; seed++) {
        const spots = pickSpots(ocean, w.letters.length, rng(seed));
        expect(new Set(spots).size).toBe(spots.length);
        const p0 = ocean.path(START_X, 0.5, spots[0].x, spots[0].y)!;
        const pn = ocean.path(START_X, 0.5, spots.at(-1)!.x, spots.at(-1)!.y)!;
        if (spots.length > 2) expect(p0.length).toBeLessThan(pn.length);
      }
    }
  });

  it('as fontes de bolhas ficam no chão', () => {
    for (const v of ocean.vents) expect(ocean.solid(v.x, v.y + 0.5)).toBe(true);
  });
});

/** Robô: nada pelo caminho até a próxima letra que falta. */
function diveBot(dive: Dive): DiveEvent[] {
  const all: DiveEvent[] = [];
  let path: { x: number; y: number }[] = [];
  let goal = -1;
  for (let i = 0; i < 60 * 600 && dive.phase !== 'done'; i++) {
    const l = dive.letters.find((x) => x.state === 'float');
    if (dive.phase === 'dive' && l) {
      if (goal !== l.id || !path.length || i % 30 === 0) {
        goal = l.id;
        path = ocean.path(dive.diver.x, dive.diver.y, l.spot.x, l.spot.y) ?? [];
      }
      while (path.length > 1 && Math.hypot(path[0].x - dive.diver.x, path[0].y - dive.diver.y) < 0.8) path.shift();
      dive.target = aim(dive, path) ?? { x: l.x, y: l.y };
    } else {
      dive.target = null;
    }
    dive.step(DT);
    all.push(...dive.events.splice(0));
  }
  return all;
}

describe('mergulho', () => {
  for (const word of WORDS) {
    it(`o robô resgata todas as letras de ${word.text} e volta para o barco`, () => {
      const dive = new Dive(word, 3, ocean);
      const events = diveBot(dive);
      expect(dive.phase).toBe('done');
      const stored = events.filter((e) => e.t === 'stored').map((e) => (e as { bubble: { slot: number } }).bubble.slot);
      expect(stored.sort((a, b) => a - b)).toEqual(word.letters.map((_, i) => i));
      expect(events.some((e) => e.t === 'party')).toBe(true);
      expect(events.at(-1)?.t).toBe('aboard');
    });
  }

  it('começa no barco, pula na água e a Bolinha dá a primeira dica', () => {
    const dive = new Dive(WORDS[0], 1, ocean);
    expect(dive.phase).toBe('intro');
    const ev: DiveEvent[] = [];
    for (let i = 0; i < 120; i++) {
      dive.step(DT);
      ev.push(...dive.events.splice(0));
    }
    expect(dive.phase).toBe('dive');
    expect(ev.map((e) => e.t)).toEqual(['splash', 'hint']);
  });

  it('parado sem achar letra, ganha outra dica depois de um tempo', () => {
    const dive = new Dive(WORDS[0], 1, ocean);
    let hints = 0;
    for (let i = 0; i < 60 * 30; i++) {
      dive.step(DT);
      hints += dive.events.splice(0).filter((e) => e.t === 'hint').length;
    }
    expect(hints).toBeGreaterThanOrEqual(2);
  });

  it('a letra estourada sobe e o guincho leva para o barco', () => {
    const dive = new Dive(WORDS[0], 2, ocean);
    for (let i = 0; i < 120; i++) dive.step(DT);
    const l = dive.letters[0];
    dive.diver.x = l.x;
    dive.diver.y = l.y;
    const seq: string[] = [];
    for (let i = 0; i < 60 * 15 && l.state !== 'stored'; i++) {
      dive.step(DT);
      seq.push(l.state);
    }
    expect([...new Set(seq)]).toEqual(['rising', 'reeling', 'stored']);
  });
});

describe('bichos e fotos', () => {
  it('todas as 16 espécies aparecem no mar, na água', () => {
    const dive = new Dive(WORDS[0], 5, ocean);
    const ids = new Set(dive.creatures.map((c) => c.species.id));
    expect(ids.size).toBe(SPECIES.length);
    for (const c of dive.creatures) expect(ocean.solid(c.x, c.y)).toBe(false);
  });

  it('os bichos ficam no mar durante um mergulho comprido', () => {
    const dive = new Dive(WORDS[0], 8, ocean);
    for (let i = 0; i < 60 * 120; i++) dive.step(DT);
    for (const c of dive.creatures) {
      expect(c.x).toBeGreaterThan(0);
      expect(c.x).toBeLessThan(ocean.w);
      expect(c.y).toBeGreaterThan(0.5);
      if (c.species.size < 3) expect(ocean.solid(c.x, c.y)).toBe(false);
    }
  });

  it('um robô fotógrafo consegue fotografar as 16 espécies', () => {
    for (let seed = 1; seed <= 3; seed++) {
      const dive = new Dive(WORDS[0], seed, ocean);
      for (let i = 0; i < 120; i++) dive.step(DT);
      const album = new Set<string>();
      for (const s of SPECIES) {
        let path: { x: number; y: number }[] = [];
        for (let t = 0; t < 60 * 90 && !album.has(s.id); t++) {
          const c = dive.creatures.find((x) => x.species.id === s.id)!;
          const d = Math.hypot(dive.diver.x - c.x, dive.diver.y - c.y);
          if (t % 30 === 0) {
            // Caminho até a água mais perto do bicho (os grandes passam por cima das pedras).
            let gx = c.x;
            let gy = c.y;
            for (let r = 0; r < 4 && ocean.solid(gx, gy); r++) gy -= 1;
            path = ocean.path(dive.diver.x, dive.diver.y, gx, gy) ?? [];
          }
          while (path.length > 1 && Math.hypot(path[0].x - dive.diver.x, path[0].y - dive.diver.y) < 0.8) path.shift();
          dive.target = d < 2.5 ? { x: c.x - Math.sign(c.x - dive.diver.x) * 1.5, y: c.y } : (aim(dive, path) ?? { x: c.x, y: c.y });
          dive.step(DT);
          if (d < 4 && t % 20 === 0) dive.flash();
          for (const e of dive.events.splice(0)) if (e.t === 'photo') for (const sp of e.species) album.add(sp.id);
        }
      }
      expect([...album].sort()).toEqual(SPECIES.map((s) => s.id).sort());
    }
  });
});
