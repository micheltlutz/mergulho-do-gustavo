// Progresso salvo no próprio iPad. Se o armazenamento falhar (modo privado,
// por exemplo), o jogo continua funcionando, só não lembra o progresso.

import { PET_IDS, type PetId } from './render/faces.ts';
import { SUITS, type SuitId } from './render/sprites.ts';

const KEY = 'mergulho-do-gustavo:v1';

/** A cada 4 bichos novos no álbum, abre uma roupa de mergulho. */
export const PHOTOS_PER_SUIT = 4;

interface SaveData {
  trophies: Record<string, number>;
  /** Espécies já fotografadas (ordem em que foram achadas). */
  album: string[];
  suit: SuitId;
  diver: PetId;
  sound: boolean;
  music: boolean;
}

function read(): SaveData {
  const empty: SaveData = { trophies: {}, album: [], suit: 'amarelo', diver: 'pipoca', sound: true, music: true };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const d = JSON.parse(raw) as Partial<SaveData>;
    return {
      trophies: d.trophies && typeof d.trophies === 'object' ? d.trophies : {},
      album: Array.isArray(d.album) ? d.album.filter((x) => typeof x === 'string') : [],
      suit: SUITS.some((s) => s.id === d.suit) ? (d.suit as SuitId) : 'amarelo',
      diver: PET_IDS.includes(d.diver as PetId) ? (d.diver as PetId) : 'pipoca',
      sound: d.sound !== false,
      music: d.music !== false,
    };
  } catch {
    return empty;
  }
}

const state = read();

function write(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sem armazenamento disponível
  }
}

export const store = {
  trophies: (word: string) => state.trophies[word] ?? 0,
  win(word: string): void {
    state.trophies[word] = (state.trophies[word] ?? 0) + 1;
    write();
  },
  get album(): readonly string[] {
    return state.album;
  },
  /** Guarda a foto; devolve true se é bicho novo. */
  photo(species: string): boolean {
    if (state.album.includes(species)) return false;
    state.album.push(species);
    write();
    return true;
  },
  /** Roupas liberadas pelo álbum. */
  suitUnlocked(id: SuitId): boolean {
    const i = SUITS.findIndex((s) => s.id === id);
    return state.album.length >= i * PHOTOS_PER_SUIT;
  },
  get suit(): SuitId {
    return state.suit;
  },
  set suit(id: SuitId) {
    state.suit = id;
    write();
  },
  get diver(): PetId {
    return state.diver;
  },
  set diver(id: PetId) {
    state.diver = id;
    write();
  },
  get sound(): boolean {
    return state.sound;
  },
  set sound(on: boolean) {
    state.sound = on;
    write();
  },
  get music(): boolean {
    return state.music;
  },
  set music(on: boolean) {
    state.music = on;
    write();
  },
};
