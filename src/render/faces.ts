// Rostos dos pets (os mesmos do Estilingue e das Patinhas): rosto de raio 50
// no centro (0, 0). Vão dentro do capacete de mergulho e no barco.

export type PetId = 'pipoca' | 'mimi' | 'bolinha';
export const PET_IDS: readonly PetId[] = ['pipoca', 'mimi', 'bolinha'];
export const PET_NAMES: Record<PetId, string> = { pipoca: 'Pipoca', mimi: 'Mimi', bolinha: 'Bolinha' };
/** Cor do pelo (patas, rabo, corpo). */
export const FUR: Record<PetId, { main: string; dark: string; light: string }> = {
  pipoca: { main: '#F0B44C', dark: '#C98A2B', light: '#FCE6BA' },
  mimi: { main: '#B0BEC5', dark: '#78909C', light: '#ECEFF1' },
  bolinha: { main: '#FAFAFA', dark: '#E0E0E0', light: '#FFFFFF' },
};

const INK = '#3E2723';

// ---------- bichinhos ----------

function eyes(color = INK, pupil = false): string {
  if (pupil) {
    // Gatinha: olho verde com pupila fininha.
    return `<ellipse cx="-18" cy="-6" rx="9" ry="10" fill="#7CB342"/><ellipse cx="18" cy="-6" rx="9" ry="10" fill="#7CB342"/>
      <ellipse cx="-18" cy="-6" rx="3" ry="8" fill="${INK}"/><ellipse cx="18" cy="-6" rx="3" ry="8" fill="${INK}"/>
      <circle cx="-15" cy="-10" r="2.5" fill="#fff"/><circle cx="21" cy="-10" r="2.5" fill="#fff"/>`;
  }
  return `<circle cx="-18" cy="-6" r="8.5" fill="${color}"/><circle cx="18" cy="-6" r="8.5" fill="${color}"/>
    <circle cx="-15" cy="-9.5" r="3" fill="#fff"/><circle cx="21" cy="-9.5" r="3" fill="#fff"/>`;
}

const mouthHappy = `<path d="M-12 21 Q0 38 12 21 Z" fill="#5D4037"/><path d="M-6 28 Q0 35 6 28 Q0 25 -6 28 Z" fill="#FF8A80"/>`;
const mouthSmile = `<path d="M0 15 V20 M-11 20 Q-5.5 26 0 20 Q5.5 26 11 20" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;

export function face(id: PetId, happy: boolean): string {
  const mouth = happy ? mouthHappy : mouthSmile;
  if (id === 'pipoca') {
    return `
      <path d="M-40 -34 Q-74 -24 -62 22 Q-52 36 -38 14 Z" fill="#C98A2B"/>
      <path d="M40 -34 Q74 -24 62 22 Q52 36 38 14 Z" fill="#C98A2B"/>
      <circle r="50" fill="#F0B44C"/>
      <ellipse cy="-28" rx="26" ry="13" fill="#F8CF78"/>
      <ellipse cy="18" rx="27" ry="20" fill="#FCE6BA"/>
      <circle cx="-31" cy="14" r="6" fill="#FF8A80" opacity=".5"/><circle cx="31" cy="14" r="6" fill="#FF8A80" opacity=".5"/>
      ${eyes()}
      <ellipse cy="9" rx="10" ry="7" fill="${INK}"/><ellipse cx="-3" cy="6.5" rx="3" ry="1.8" fill="#fff" opacity=".7"/>
      ${mouth}`;
  }
  if (id === 'mimi') {
    return `
      <path d="M-46 -12 L-40 -64 L-8 -44 Z" fill="#90A4AE" stroke="#78909C" stroke-width="3" stroke-linejoin="round"/>
      <path d="M46 -12 L40 -64 L8 -44 Z" fill="#90A4AE" stroke="#78909C" stroke-width="3" stroke-linejoin="round"/>
      <path d="M-38 -24 L-36 -52 L-18 -40 Z M38 -24 L36 -52 L18 -40 Z" fill="#F8BBD0"/>
      <circle r="50" fill="#B0BEC5"/>
      <path d="M-10 -48 L-8 -32 M0 -50 L0 -33 M10 -48 L8 -32" stroke="#78909C" stroke-width="4" stroke-linecap="round"/>
      <ellipse cy="20" rx="24" ry="17" fill="#ECEFF1"/>
      <circle cx="-32" cy="14" r="6" fill="#FF8A80" opacity=".45"/><circle cx="32" cy="14" r="6" fill="#FF8A80" opacity=".45"/>
      ${eyes(INK, true)}
      <path d="M-6 8 L6 8 L0 15 Z" fill="#F06292"/>
      <path d="M-46 10 L-22 14 M-46 22 L-22 19 M46 10 L22 14 M46 22 L22 19" stroke="#607D8B" stroke-width="2" stroke-linecap="round"/>
      ${mouth}`;
  }
  return `
    <ellipse cx="-20" cy="-74" rx="15" ry="44" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="3" transform="rotate(-10 -20 -40)"/>
    <ellipse cx="20" cy="-74" rx="15" ry="44" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="3" transform="rotate(10 20 -40)"/>
    <ellipse cx="-20" cy="-72" rx="7" ry="32" fill="#F8BBD0" transform="rotate(-10 -20 -40)"/>
    <ellipse cx="20" cy="-72" rx="7" ry="32" fill="#F8BBD0" transform="rotate(10 20 -40)"/>
    <circle r="50" fill="#FAFAFA" stroke="#E0E0E0" stroke-width="3"/>
    <ellipse cy="18" rx="22" ry="16" fill="#FFFFFF"/>
    <circle cx="-31" cy="14" r="7" fill="#F48FB1" opacity=".55"/><circle cx="31" cy="14" r="7" fill="#F48FB1" opacity=".55"/>
    ${eyes()}
    <ellipse cy="8" rx="6" ry="4.5" fill="#F06292"/>
    ${happy ? mouthHappy : `${mouthSmile}<rect x="-6" y="21" width="12" height="9" rx="2" fill="#fff" stroke="#BDBDBD" stroke-width="1.5"/>`}`;
}
