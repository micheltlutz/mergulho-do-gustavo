// O nado do mergulhador (a física do roteiro, por segundo):
// - o empuxo é um pouco maior que o peso: solto, ele boia devagar para cima;
// - com o dedo na tela, ele nada até o dedo (mais longe, mais rápido, até um limite);
// - a água freia tudo com suavidade (desliza um pouco e para);
// - na superfície ele fica boiando com a cabeça para fora (não sai voando);
// - não atravessa rocha nem o navio (desliza encostado).

import type { Ocean } from './ocean.ts';

export const PHYS = {
  /** Subida quando solto (empuxo − peso), em m/s². */
  float: 0.9,
  /** Freio da água (por segundo). */
  drag: 2.2,
  /** Velocidade máxima nadando (m/s). */
  maxSpeed: 5.2,
  /** Quanto a velocidade cresce com a distância até o dedo. */
  reach: 1.3,
  /** Quão rápido ele pega a velocidade desejada (com reach, sem passar do dedo). */
  turn: 5.5,
  radius: 0.42,
  /** Altura do centro quando boia na superfície (a cabeça fica para fora). */
  surface: 0.15,
};

export interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 1 = olhando para a direita, −1 = esquerda. */
  facing: 1 | -1;
  r: number;
}

export function newBody(x: number, y: number): Body {
  return { x, y, vx: 0, vy: 0, facing: 1, r: PHYS.radius };
}

/** Um passo de física. `target` é o ponto do dedo (no mar), ou null se solto. */
export function swim(b: Body, target: { x: number; y: number } | null, dt: number, ocean: Ocean, push = 0): void {
  b.vy -= PHYS.float * dt;
  if (push) b.vy -= push * dt;
  if (target) {
    const dx = target.x - b.x;
    const dy = target.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.08) {
      const speed = Math.min(PHYS.maxSpeed, d * PHYS.reach);
      const k = Math.min(1, dt * PHYS.turn);
      b.vx += ((dx / d) * speed - b.vx) * k;
      b.vy += ((dy / d) * speed - b.vy) * k;
    }
  } else {
    const f = Math.exp(-PHYS.drag * dt);
    b.vx *= f;
    b.vy *= f;
  }
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  collide(b, ocean);
  if (b.y < PHYS.surface) {
    b.y = PHYS.surface;
    if (b.vy < 0) b.vy = 0;
  }
  if (Math.abs(b.vx) > 0.5) b.facing = b.vx > 0 ? 1 : -1;
}

/** Empurra o círculo para fora das casas sólidas e tira a velocidade contra a parede. */
export function collide(b: Body, ocean: Ocean): void {
  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    const x0 = Math.floor(b.x - b.r);
    const x1 = Math.floor(b.x + b.r);
    const y0 = Math.floor(b.y - b.r);
    const y1 = Math.floor(b.y + b.r);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        if (!ocean.solid(cx + 0.5, cy + 0.5)) continue;
        // Ponto da casa mais perto do centro.
        const px = Math.max(cx, Math.min(b.x, cx + 1));
        const py = Math.max(cy, Math.min(b.y, cy + 1));
        let nx = b.x - px;
        let ny = b.y - py;
        let d = Math.hypot(nx, ny);
        if (d >= b.r) continue;
        if (d < 1e-6) {
          // Centro dentro da casa: sai pelo lado mais perto.
          const opts = [
            { nx: -1, ny: 0, k: b.x - cx },
            { nx: 1, ny: 0, k: cx + 1 - b.x },
            { nx: 0, ny: -1, k: b.y - cy },
            { nx: 0, ny: 1, k: cy + 1 - b.y },
          ].sort((a, c) => a.k - c.k)[0];
          nx = opts.nx;
          ny = opts.ny;
          d = -opts.k;
        } else {
          nx /= d;
          ny /= d;
        }
        const pen = b.r - d;
        b.x += nx * pen;
        b.y += ny * pen;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= vn * nx;
          b.vy -= vn * ny;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
}
