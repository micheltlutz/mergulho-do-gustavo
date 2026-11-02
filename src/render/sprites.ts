// Desenhos em SVG (viram imagem uma vez): o pet mergulhador de capacete,
// o barquinho com a Mimi e a Bolinha, e os 16 bichos do mar.
// Todos olham para a direita (a cena espelha quando precisa).

import { face, FUR, type PetId } from './faces.ts';

export type SuitId = 'amarelo' | 'vermelho' | 'azul' | 'rosa';
export const SUITS: readonly { id: SuitId; color: string; dark: string }[] = [
  { id: 'amarelo', color: '#FDD835', dark: '#F9A825' },
  { id: 'vermelho', color: '#E53935', dark: '#B71C1C' },
  { id: 'azul', color: '#1E88E5', dark: '#0D47A1' },
  { id: 'rosa', color: '#F06292', dark: '#AD1457' },
];

const EYE = (x: number, y: number, r: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x + r * 0.25}" cy="${y + r * 0.1}" r="${r * 0.55}" fill="#263238"/><circle cx="${x + r * 0.45}" cy="${y - r * 0.25}" r="${r * 0.22}" fill="#fff"/>`;

// ---------- mergulhador ----------

function tail(pet: PetId): string {
  const f = FUR[pet];
  if (pet === 'bolinha') return `<circle cx="-60" cy="2" r="11" fill="${f.light}" stroke="${f.dark}" stroke-width="2"/>`;
  if (pet === 'mimi') return `<path d="M-46 4 Q-70 -4 -66 -26" fill="none" stroke="${f.main}" stroke-width="7" stroke-linecap="round"/>`;
  return `<path d="M-44 0 Q-72 -6 -74 -22 Q-60 -14 -46 -8 Z" fill="${f.dark}"/>`;
}

/** Perna com nadadeira (gira para "pedalar"). */
function leg(x: number, y: number, angle: number, fur: string): string {
  return `<g transform="translate(${x} ${y}) rotate(${angle})">
    <rect x="-6" y="-4" width="12" height="24" rx="6" fill="${fur}"/>
    <path d="M-10 18 L10 18 L16 34 L-16 34 Z" fill="#26A69A" stroke="#00796B" stroke-width="2" stroke-linejoin="round"/>
  </g>`;
}

export function diverSvg(pet: PetId, suit: SuitId, frame: 0 | 1, happy = true): string {
  const f = FUR[pet];
  const s = SUITS.find((x) => x.id === suit)!;
  const a = frame ? 28 : -18;
  const stars =
    suit === 'rosa'
      ? `<g fill="#fff" opacity=".9">${[
          [-26, 4],
          [-8, 16],
          [6, 0],
        ]
          .map(([x, y]) => `<path transform="translate(${x} ${y}) scale(.6)" d="M0 -9 L2.6 -3 L9 -2.8 L4 1.6 L5.6 8 L0 4.6 L-5.6 8 L-4 1.6 L-9 -2.8 L-2.6 -3 Z"/>`)
          .join('')}</g>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -64 150 120" width="300" height="240">
    ${tail(pet)}
    ${leg(-34, 18, a, f.main)}
    ${leg(10, 20, -a, f.main)}
    <ellipse cx="-12" cy="6" rx="38" ry="21" fill="${s.color}"/>
    <path d="M-44 14 Q-12 30 22 14" fill="none" stroke="${s.dark}" stroke-width="5" opacity=".6"/>
    ${stars}
    <rect x="-42" y="-24" width="42" height="17" rx="8.5" fill="#FFCA28" stroke="#F57F17" stroke-width="3"/>
    <rect x="-2" y="-21" width="8" height="10" rx="2" fill="#90A4AE"/>
    <path d="M4 -16 Q20 -30 26 -24" fill="none" stroke="#546E7A" stroke-width="4" stroke-linecap="round"/>
    ${leg(-26, 20, -a * 0.8, f.dark)}
    ${leg(18, 20, a * 0.8, f.dark)}
    <circle cx="34" cy="-8" r="34" fill="${s.color}"/>
    <g transform="translate(34 -8) scale(.48)">${face(pet, happy)}</g>
    <circle cx="34" cy="-8" r="31" fill="#B2EBF2" fill-opacity=".28" stroke="#CFD8DC" stroke-width="5"/>
    <path d="M14 -26 Q22 -36 36 -37" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/>
    <circle cx="58" cy="2" r="3" fill="#fff" opacity=".7"/>
  </svg>`;
}

// ---------- barquinho com a Mimi (no guincho) e a Bolinha (vigia) ----------

/** 40 unidades = 1 m. O ponto (0, 0) é o meio do barco na linha da água. */
export const BOAT_SCALE = 40;
/** Ponta do guincho (em metros, a partir do meio do barco na linha da água). */
export const WINCH_TIP = { x: -0.4, y: -2.6 };

function petOnBoat(pet: PetId, x: number, extra: string): string {
  const f = FUR[pet];
  return `<g transform="translate(${x} -28)">
    <ellipse cx="0" cy="-18" rx="17" ry="20" fill="${f.main}"/>
    <ellipse cx="0" cy="-14" rx="10" ry="13" fill="${f.light}"/>
    <g transform="translate(0 -50) scale(.4)">${face(pet, true)}</g>
    ${extra}
  </g>`;
}

export function boatSvg(captain: PetId, lookout: PetId): string {
  const hat = `<g transform="translate(0 -70)"><path d="M-20 4 Q0 -12 20 4 Z" fill="#fff" stroke="#263238" stroke-width="2"/><rect x="-22" y="2" width="44" height="6" rx="3" fill="#263238"/><circle cx="0" cy="-2" r="4" fill="#FDD835"/></g>`;
  const binos = `<g transform="translate(6 -54)"><rect x="-14" y="-6" width="12" height="12" rx="4" fill="#37474F"/><rect x="2" y="-6" width="12" height="12" rx="4" fill="#37474F"/><circle cx="-8" cy="0" r="3.5" fill="#81D4FA"/><circle cx="8" cy="0" r="3.5" fill="#81D4FA"/><path d="M-14 8 Q-22 16 -16 22 M14 8 Q22 16 16 22" stroke="${FUR[lookout].main}" stroke-width="7" stroke-linecap="round" fill="none"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 190" width="600" height="380">
    <rect x="22" y="-86" width="64" height="58" rx="8" fill="#FAFAFA" stroke="#B0BEC5" stroke-width="3"/>
    <rect x="16" y="-96" width="76" height="14" rx="6" fill="#1E88E5"/>
    <circle cx="54" cy="-58" r="12" fill="#81D4FA" stroke="#90A4AE" stroke-width="4"/>
    <path d="M70 -96 V-124" stroke="#78909C" stroke-width="4"/>
    <path d="M70 -124 L96 -116 L70 -108 Z" fill="#E53935"/>
    <text x="78" y="-113" font-family="sans-serif" font-weight="900" font-size="11" fill="#fff">G</text>
    <rect x="-64" y="-104" width="8" height="78" rx="3" fill="#FFB300"/>
    <path d="M-60 -102 L-14 -106" stroke="#FFB300" stroke-width="7" stroke-linecap="round"/>
    <circle cx="-16" cy="-104" r="6" fill="#546E7A"/>
    <circle cx="-60" cy="-40" r="10" fill="#546E7A" stroke="#37474F" stroke-width="3"/>
    ${petOnBoat(captain, -96, hat)}
    ${petOnBoat(lookout, 108, binos)}
    <path d="M-132 -30 L136 -30 Q144 -30 140 -18 L118 22 Q112 30 96 30 L-104 30 Q-118 30 -124 18 L-138 -18 Q-140 -30 -132 -30 Z" fill="#E53935"/>
    <path d="M-136 -26 L139 -26 L137 -16 L-133 -16 Z" fill="#fff"/>
    <path d="M-122 12 L126 12 L118 22 Q112 30 96 30 L-104 30 Q-118 30 -124 18 Z" fill="#B71C1C"/>
    <circle cx="-30" cy="0" r="6" fill="#FFF59D" stroke="#fff" stroke-width="2"/>
    <circle cx="10" cy="0" r="6" fill="#FFF59D" stroke="#fff" stroke-width="2"/>
    <circle cx="50" cy="0" r="6" fill="#FFF59D" stroke="#fff" stroke-width="2"/>
    <path d="M-118 -8 Q-108 4 -98 -8" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  </svg>`;
}

// ---------- bichos do mar (100 unidades = o tamanho do bicho) ----------

const CREATURE_ART: Record<string, string> = {
  palhaco: `<path d="M-46 0 Q-62 -16 -66 -12 Q-60 0 -66 12 Q-62 16 -46 0 Z" fill="#FF7043" stroke="#263238" stroke-width="2"/>
    <ellipse rx="44" ry="26" fill="#FF7043" stroke="#263238" stroke-width="2"/>
    <path d="M14 -24 Q6 0 14 24 L24 21 Q16 0 24 -21 Z M-16 -26 Q-24 0 -16 26 L-6 26 Q-14 0 -6 -26 Z" fill="#fff" stroke="#263238" stroke-width="2"/>
    <path d="M-10 -26 Q0 -40 12 -26 Z" fill="#FF7043" stroke="#263238" stroke-width="2"/>
    ${EYE(30, -6, 7)}`,
  cirurgiao: `<path d="M-40 0 L-62 -18 L-58 0 L-62 18 Z" fill="#FDD835"/>
    <ellipse rx="44" ry="30" fill="#1E88E5"/>
    <path d="M-30 -14 Q0 -30 26 -12 Q0 -16 -14 0 Q-24 10 -30 -14 Z" fill="#0D47A1"/>
    <ellipse cx="0" cy="18" rx="26" ry="8" fill="#64B5F6"/>
    ${EYE(28, -8, 7)}<path d="M38 8 Q42 12 38 14" stroke="#0D47A1" stroke-width="2" fill="none"/>`,
  cavalo: `<path d="M0 -40 Q22 -46 26 -30 L44 -30 Q46 -22 28 -20 Q30 0 14 14 Q4 26 10 40 Q14 52 0 52 Q-14 50 -10 40 Q-6 28 -14 12 Q-22 -10 -10 -30 Z" fill="#FFB74D" stroke="#E65100" stroke-width="2"/>
    <path d="M-12 -24 L-24 -30 M-16 -10 L-28 -12 M-16 4 L-28 8" stroke="#FFB74D" stroke-width="5" stroke-linecap="round"/>
    <path d="M-2 52 Q-20 50 -14 38 Q-6 32 2 40" fill="none" stroke="#E65100" stroke-width="3"/>
    ${EYE(10, -30, 6)}`,
  tartaruga: `<ellipse cx="-4" cy="4" rx="40" ry="24" fill="#8BC34A"/>
    <path d="M-40 -2 Q-4 -40 34 -2 Z" fill="#558B2F"/>
    <path d="M-24 -12 L-8 -24 L10 -24 L22 -10 M-8 -24 L-4 -2 M10 -24 L8 -2" stroke="#33691E" stroke-width="3" fill="none"/>
    <path d="M-30 12 Q-50 30 -38 34 Q-26 30 -20 18 Z M14 14 Q20 34 34 30 Q34 20 24 12 Z" fill="#9CCC65"/>
    <ellipse cx="44" cy="-2" rx="14" ry="11" fill="#9CCC65"/>
    ${EYE(48, -6, 5)}<path d="M50 4 Q54 6 56 3" stroke="#33691E" stroke-width="2" fill="none"/>`,
  polvo: `<path d="M-30 10 Q-46 34 -30 40 M-14 14 Q-22 40 -6 44 M4 14 Q4 42 18 40 M20 10 Q34 34 40 26" fill="none" stroke="#AB47BC" stroke-width="10" stroke-linecap="round"/>
    <ellipse cx="0" cy="-12" rx="34" ry="30" fill="#BA68C8"/>
    <circle cx="-14" cy="-26" r="5" fill="#CE93D8"/><circle cx="12" cy="-32" r="4" fill="#CE93D8"/>
    ${EYE(-10, -6, 8)}${EYE(14, -6, 8)}<path d="M-6 8 Q2 14 10 8" stroke="#6A1B9A" stroke-width="3" fill="none"/>`,
  aguaviva: `<path d="M-24 4 Q-28 24 -20 40 M-8 6 Q-12 28 -4 46 M8 6 Q12 26 6 44 M24 4 Q28 22 20 38" fill="none" stroke="#F8BBD0" stroke-width="4" stroke-linecap="round" opacity=".9"/>
    <path d="M-34 6 Q-34 -38 0 -38 Q34 -38 34 6 Q17 0 0 6 Q-17 0 -34 6 Z" fill="#F48FB1" fill-opacity=".85" stroke="#FCE4EC" stroke-width="3"/>
    <path d="M-18 -24 Q-6 -32 6 -28" stroke="#fff" stroke-width="4" fill="none" opacity=".7" stroke-linecap="round"/>
    ${EYE(-10, -10, 5)}${EYE(10, -10, 5)}`,
  estrela: `<path d="M0 -46 L12 -14 L46 -14 L18 6 L28 40 L0 20 L-28 40 L-18 6 L-46 -14 L-12 -14 Z" fill="#FF8A65" stroke="#E64A19" stroke-width="3" stroke-linejoin="round"/>
    <g fill="#FFCCBC"><circle cx="0" cy="-28" r="3"/><circle cx="26" cy="-10" r="3"/><circle cx="-26" cy="-10" r="3"/><circle cx="16" cy="22" r="3"/><circle cx="-16" cy="22" r="3"/></g>
    ${EYE(-8, -2, 5)}${EYE(8, -2, 5)}<path d="M-5 10 Q0 14 5 10" stroke="#BF360C" stroke-width="2" fill="none"/>`,
  caranguejo: `<path d="M-30 10 L-44 26 M-20 14 L-28 32 M30 10 L44 26 M20 14 L28 32" stroke="#D84315" stroke-width="5" stroke-linecap="round"/>
    <path d="M-28 -6 L-44 -24 M28 -6 L44 -24" stroke="#E64A19" stroke-width="6" stroke-linecap="round"/>
    <path d="M-52 -30 Q-56 -44 -42 -42 L-40 -30 Z M52 -30 Q56 -44 42 -42 L40 -30 Z" fill="#F4511E"/>
    <ellipse cx="0" cy="4" rx="36" ry="20" fill="#F4511E"/>
    <path d="M-10 -12 V-26 M10 -12 V-26" stroke="#E64A19" stroke-width="4"/>
    ${EYE(-10, -28, 6)}${EYE(10, -28, 6)}<path d="M-8 8 Q0 14 8 8" stroke="#BF360C" stroke-width="3" fill="none"/>`,
  baiacu: `<path d="M-34 0 L-52 -14 L-48 0 L-52 14 Z" fill="#FBC02D"/>
    <ellipse rx="38" ry="30" fill="#FFEE58"/>
    <ellipse cx="0" cy="12" rx="26" ry="14" fill="#FFF9C4"/>
    <g fill="#8D6E63"><circle cx="-14" cy="-14" r="3"/><circle cx="2" cy="-20" r="3"/><circle cx="-24" cy="2" r="3"/></g>
    ${EYE(18, -8, 9)}<ellipse cx="36" cy="6" rx="4" ry="3" fill="#F57F17"/>`,
  arraia: `<path d="M-46 0 Q-10 -30 34 -4 Q42 0 34 4 Q-10 30 -46 0 Z" fill="#78909C"/>
    <path d="M-46 0 Q-70 4 -90 -4" fill="none" stroke="#607D8B" stroke-width="4" stroke-linecap="round"/>
    <g fill="#B0BEC5"><circle cx="-14" cy="-6" r="4"/><circle cx="2" cy="4" r="3"/><circle cx="-24" cy="6" r="3"/></g>
    ${EYE(22, -6, 5)}<path d="M28 4 Q32 6 34 3" stroke="#455A64" stroke-width="2" fill="none"/>`,
  golfinho: `<path d="M-46 -2 Q-60 -18 -62 -6 Q-60 0 -62 8 Q-58 12 -46 2 Z" fill="#5C7FA6"/>
    <path d="M-48 0 Q-30 -26 10 -22 Q38 -20 52 -6 Q58 0 50 4 Q30 16 -10 14 Q-36 12 -48 0 Z" fill="#78A6D6"/>
    <path d="M-36 8 Q0 18 40 6 Q20 16 -10 14 Q-30 12 -36 8 Z" fill="#E3F2FD"/>
    <path d="M-6 -22 Q2 -40 10 -22 Z" fill="#5C7FA6"/>
    ${EYE(30, -8, 5)}<path d="M40 2 Q48 4 54 0" stroke="#37474F" stroke-width="2" fill="none"/>`,
  baleia: `<path d="M-44 -4 Q-58 -24 -64 -16 Q-58 -6 -64 4 Q-56 10 -44 4 Z" fill="#3F6FB5"/>
    <path d="M-46 0 Q-36 -30 6 -30 Q44 -30 50 0 Q50 22 10 24 Q-30 26 -46 0 Z" fill="#4A80CC"/>
    <path d="M-30 10 Q10 30 48 6 Q46 22 10 24 Q-22 26 -30 10 Z" fill="#E1F5FE"/>
    <path d="M-18 12 L36 10 M-14 17 L32 16" stroke="#B3E5FC" stroke-width="2"/>
    ${EYE(30, -6, 4)}<path d="M38 4 Q44 6 48 3" stroke="#1A237E" stroke-width="2" fill="none"/>`,
  lula: `<path d="M-30 -6 Q-50 -10 -58 -20 M-30 0 Q-52 2 -62 -4 M-30 6 Q-50 14 -60 12 M-30 10 Q-46 22 -52 26" fill="none" stroke="#F06292" stroke-width="5" stroke-linecap="round"/>
    <path d="M-30 -14 Q10 -18 34 -4 L50 0 L34 4 Q10 18 -30 14 Z" fill="#F48FB1"/>
    <path d="M34 -4 L50 -16 L44 0 L50 16 L34 4 Z" fill="#EC407A"/>
    ${EYE(-14, -4, 6)}`,
  moreia: `<path d="M-50 20 Q-20 4 0 -4 Q24 -14 40 -6 Q50 0 42 8 Q24 14 4 10 Q-20 16 -50 34 Z" fill="#7CB342"/>
    <g fill="#AED581"><circle cx="-20" cy="14" r="3"/><circle cx="0" cy="4" r="3"/><circle cx="-34" cy="24" r="3"/></g>
    <path d="M30 6 Q38 10 44 6" stroke="#33691E" stroke-width="3" fill="none"/>
    ${EYE(26, -6, 6)}`,
  lanterna: `<path d="M-40 0 L-56 -14 L-52 0 L-56 14 Z" fill="#37474F"/>
    <ellipse rx="40" ry="26" fill="#455A64"/>
    <path d="M10 -24 Q20 -48 42 -40" fill="none" stroke="#546E7A" stroke-width="3"/>
    <circle cx="44" cy="-40" r="8" fill="#FFF59D"/><circle cx="44" cy="-40" r="4" fill="#fff"/>
    <path d="M22 10 L42 6 L24 18 Z" fill="#fff"/>
    ${EYE(16, -6, 8)}`,
  tubarao: `<path d="M-44 -4 Q-56 -28 -62 -22 Q-58 -6 -62 10 Q-56 12 -44 4 Z" fill="#2E4A6B"/>
    <path d="M-46 0 Q-30 -26 10 -24 Q44 -22 52 -2 Q52 14 20 18 Q-24 20 -46 0 Z" fill="#37597F"/>
    <path d="M-34 8 Q10 22 50 4 Q48 14 20 18 Q-20 20 -34 8 Z" fill="#CFD8DC"/>
    <path d="M-8 -22 Q-2 -40 8 -23 Z" fill="#2E4A6B"/>
    <g fill="#E3F2FD">${Array.from({ length: 14 }, (_, i) => `<circle cx="${-36 + (i % 7) * 11}" cy="${-14 + Math.floor(i / 7) * 10 + (i % 2) * 3}" r="2.6"/>`).join('')}</g>
    ${EYE(34, -8, 4)}<path d="M40 6 Q48 8 52 4" stroke="#1A237E" stroke-width="3" fill="none"/>`,
};

/** O bicho (centrado, cabe em 140 × 120 unidades; 100 unidades = o tamanho dele). */
export function creatureSvg(id: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 -60 140 120" width="280" height="240">${CREATURE_ART[id] ?? ''}</svg>`;
}

/** O peixe-balão estufado (quando o mergulhador chega perto). */
export function puffedSvg(): string {
  const spikes = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return `<path d="M${Math.cos(a) * 34} ${Math.sin(a) * 34} L${Math.cos(a) * 46} ${Math.sin(a) * 46}" stroke="#F9A825" stroke-width="4" stroke-linecap="round"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 -60 140 120" width="280" height="240">
    ${spikes}<circle r="38" fill="#FFEE58"/><ellipse cx="0" cy="14" rx="28" ry="16" fill="#FFF9C4"/>
    ${EYE(14, -10, 10)}<circle cx="34" cy="6" r="5" fill="#F57F17"/>
  </svg>`;
}

const cache = new Map<string, HTMLImageElement>();

/** Imagem de um SVG (guardada para reusar). */
export function svgImage(key: string, svg: () => string): HTMLImageElement {
  let img = cache.get(key);
  if (!img) {
    img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg())}`;
    cache.set(key, img);
  }
  return img;
}
