// Efeitos sonoros sintetizados (sem arquivos de áudio).

import { noiseBurst, tone } from './core.ts';

function chime(notes: number[], gap: number, dur: number, peak: number, type: OscillatorType = 'triangle'): void {
  notes.forEach((f, i) => tone(type, f, i * gap, dur, peak));
}

export const sfx = {
  pop(): void {
    tone('sine', 500, 0, 0.1, 0.35, 900);
  },
  /** Pulo na água. */
  splash(): void {
    noiseBurst(0, 0.5, 0.35, 'lowpass', 1800, 300);
    noiseBurst(0.05, 0.4, 0.15, 'bandpass', 900, 400);
    for (let i = 0; i < 5; i++) tone('sine', 500 + Math.random() * 600, 0.2 + i * 0.06, 0.08, 0.05, 1200);
  },
  /** Bolha da letra estourando: "plóp" e brilho. */
  letterPop(): void {
    tone('sine', 260, 0, 0.12, 0.35, 900);
    noiseBurst(0, 0.06, 0.15, 'highpass', 3000);
    chime([783.99, 987.77, 1174.66, 1567.98], 0.07, 0.24, 0.16);
  },
  /** Guincho puxando e a letra chegando no barco. */
  stored(): void {
    for (let i = 0; i < 8; i++) tone('square', 200, i * 0.04, 0.03, 0.05, 160);
    chime([1318.51, 1567.98, 2093], 0.08, 0.25, 0.1, 'sine');
  },
  /** Clique da câmera com flash. */
  camera(): void {
    noiseBurst(0, 0.05, 0.3, 'highpass', 4000);
    tone('square', 1800, 0.02, 0.03, 0.05);
    noiseBurst(0.06, 0.06, 0.2, 'highpass', 3000);
    tone('sine', 2400, 0.05, 0.3, 0.05, 4000);
  },
  /** Bicho novo no álbum. */
  newPhoto(): void {
    chime([1046.5, 1318.51, 1567.98, 2093], 0.06, 0.22, 0.12, 'sine');
  },
  /** Fonte de bolhas: "blub-blub". */
  vent(): void {
    for (let i = 0; i < 5; i++) {
      const f = 300 + Math.random() * 400;
      tone('sine', f, i * 0.07, 0.08, 0.06, f * 1.8);
    }
  },
  /** A Bolinha avisa (antes da voz). */
  hint(): void {
    chime([880, 1174.66], 0.1, 0.2, 0.08, 'sine');
  },
  /** Festa da palavra completa. */
  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => tone('triangle', f, i * 0.11, 0.22, 0.3));
    for (const f of [523.25, 659.25, 783.99]) tone('triangle', f, 0.5, 0.9, 0.22);
    [1568, 2093, 1760, 2637].forEach((f, i) => tone('sine', f, 0.55 + i * 0.09, 0.12, 0.08));
  },
  /** Buzina do barco: "fom-fom". */
  horn(at = 0): void {
    for (const k of [0, 0.3]) {
      tone('sawtooth', 196, at + k, 0.22, 0.06);
      tone('sawtooth', 247, at + k, 0.22, 0.04);
    }
  },
  /** Cada letra soletrada. */
  spell(i: number): void {
    tone('triangle', [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66, 1318.51][i % 10], 0, 0.3, 0.16);
  },
};
