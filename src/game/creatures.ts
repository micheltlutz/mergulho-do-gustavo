// Os bichos do mar (16 espécies para o álbum). Ninguém faz mal: alguns se
// afastam um pouquinho quando o mergulhador chega perto.

export type Behavior =
  /** Passeia de um ponto a outro do seu lugar. */
  | 'wander'
  /** Em cardume, seguindo o primeiro. */
  | 'school'
  /** Sobe e desce devagar (água-viva). */
  | 'drift'
  /** Anda no chão (caranguejo) ou fica parado nele (estrela-do-mar). */
  | 'floor'
  /** Vai e volta de um lado ao outro, grande e calmo. */
  | 'cruise'
  /** Fica na toca e põe a cabeça para fora (moreia). */
  | 'peek';

export interface Species {
  id: string;
  /** Com artigo, para a voz: "Um polvo!". */
  say: string;
  /** Lugares onde vive (ids de ZONES). */
  zones: string[];
  count: number;
  /** Tamanho (comprimento) em metros. */
  size: number;
  speed: number;
  behavior: Behavior;
  /** Brilha no escuro. */
  glow?: boolean;
  /** Faixa de profundidade (y) preferida. */
  depth?: [number, number];
  /** Foge do mergulhador (os grandes não). */
  shy?: boolean;
  /** Ponto fixo (toca da moreia). */
  home?: [number, number];
  /** Faixa de x para quem vai e volta (passa por vários lugares). */
  range?: [number, number];
}

export const SPECIES: readonly Species[] = [
  { id: 'palhaco', say: 'Um peixe-palhaço', zones: ['corais'], count: 3, size: 0.9, speed: 1.6, behavior: 'school', shy: true, depth: [5, 12] },
  { id: 'cirurgiao', say: 'Um peixe-cirurgião azul', zones: ['corais'], count: 2, size: 1.0, speed: 1.8, behavior: 'wander', shy: true, depth: [3, 11] },
  { id: 'cavalo', say: 'Um cavalo-marinho', zones: ['algas'], count: 2, size: 0.9, speed: 0.5, behavior: 'drift', depth: [8, 18] },
  { id: 'tartaruga', say: 'Uma tartaruga', zones: ['algas', 'corais'], count: 1, size: 1.9, speed: 1.1, behavior: 'wander', depth: [3, 12] },
  { id: 'polvo', say: 'Um polvo', zones: ['navio'], count: 1, size: 1.4, speed: 0.9, behavior: 'wander', shy: true, depth: [17, 28] },
  { id: 'aguaviva', say: 'Uma água-viva', zones: ['fundo'], count: 4, size: 1.2, speed: 0.6, behavior: 'drift', glow: true, depth: [27, 39] },
  { id: 'estrela', say: 'Uma estrela-do-mar', zones: ['conchas'], count: 2, size: 0.9, speed: 0, behavior: 'floor' },
  { id: 'caranguejo', say: 'Um caranguejo', zones: ['conchas', 'corais'], count: 2, size: 0.9, speed: 0.9, behavior: 'floor', shy: true },
  { id: 'baiacu', say: 'Um peixe-balão', zones: ['algas'], count: 1, size: 1.1, speed: 0.8, behavior: 'wander', depth: [6, 16] },
  { id: 'arraia', say: 'Uma arraia', zones: ['conchas'], count: 1, size: 1.8, speed: 1.3, behavior: 'cruise', depth: [27, 29], range: [63, 70] },
  { id: 'golfinho', say: 'Um golfinho', zones: ['aberto', 'conchas'], count: 2, size: 2.0, speed: 3.2, behavior: 'cruise', depth: [2, 6], range: [58, 86] },
  { id: 'baleia', say: 'Uma baleia', zones: ['aberto'], count: 1, size: 6.5, speed: 1.2, behavior: 'cruise', depth: [9, 13], range: [64, 84] },
  { id: 'lula', say: 'Uma lula', zones: ['navio'], count: 2, size: 1.2, speed: 1.4, behavior: 'wander', shy: true, depth: [4, 13] },
  { id: 'moreia', say: 'Uma moreia', zones: ['caverna'], count: 1, size: 1.6, speed: 0, behavior: 'peek', home: [30, 25.55] },
  { id: 'lanterna', say: 'Um peixe-lanterna', zones: ['fundo', 'caverna'], count: 2, size: 1.0, speed: 1.2, behavior: 'wander', glow: true, depth: [26, 39] },
  { id: 'tubarao', say: 'Um tubarão-baleia', zones: ['aberto'], count: 1, size: 5.5, speed: 1.0, behavior: 'cruise', depth: [17, 21], range: [64, 83] },
];

export function speciesById(id: string): Species | undefined {
  return SPECIES.find((s) => s.id === id);
}
