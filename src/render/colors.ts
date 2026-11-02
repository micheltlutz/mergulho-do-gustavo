// Cor de cada letra (a mesma da Corrida).

const LETTER_COLORS = ['#E53935', '#1E88E5', '#43A047', '#8E24AA', '#FB8C00', '#00897B', '#D81B60', '#3949AB'];

export function letterColor(l: string): string {
  const code = l === 'Ã' ? 65 : l.charCodeAt(0);
  return LETTER_COLORS[(code - 65) % LETTER_COLORS.length];
}
