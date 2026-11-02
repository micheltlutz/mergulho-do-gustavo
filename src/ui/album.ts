// Álbum Submarino do Gustavo: as 16 fotos (os bichos ainda não achados
// aparecem como sombra) e as roupas de mergulho que o álbum libera.

import { voice } from '../audio/speech.ts';
import { SPECIES } from '../game/creatures.ts';
import { creatureSvg, diverSvg, SUITS } from '../render/sprites.ts';
import { PHOTOS_PER_SUIT, store } from '../storage.ts';
import { h, makeScreen, onTap } from './dom.ts';
import { iconButton } from './icons.ts';

export class AlbumScreen {
  readonly el = makeScreen('album');
  private readonly grid = h('div', 'grid scroll');
  private readonly suits = h('div', 'album-suits');

  constructor(back: () => void) {
    const top = h('div', 'album-top');
    top.append(onTap(iconButton('back', 'Voltar', 'small'), back), this.suits);
    this.el.append(top, this.grid);
  }

  show(): void {
    this.grid.textContent = '';
    const have = new Set(store.album);
    for (const s of SPECIES) {
      const got = have.has(s.id);
      const card = h('button', `photo-card${got ? '' : ' missing'}`, `<div class="photo">${creatureSvg(s.id)}</div>`);
      card.type = 'button';
      card.setAttribute('aria-label', got ? s.say : 'Bicho ainda não fotografado');
      card.style.setProperty('--r', `${((s.id.charCodeAt(0) * 7) % 9) - 4}deg`);
      onTap(card, () => {
        voice.say(got ? `${s.say}!` : 'Esse ainda falta! Procure no fundo do mar e tire uma foto!');
        card.classList.remove('wiggle');
        void card.offsetWidth;
        card.classList.add('wiggle');
      });
      this.grid.append(card);
    }
    // Roupas: as liberadas e quanto falta para as outras.
    this.suits.textContent = '';
    const n = store.album.length;
    SUITS.forEach((s, i) => {
      const open = store.suitUnlocked(s.id);
      const el = h('div', `album-suit${open ? '' : ' locked'}`, diverSvg(store.diver, s.id, 0));
      if (!open) el.append(h('b', '', `${Math.max(0, i * PHOTOS_PER_SUIT - n)}`));
      this.suits.append(el);
    });
    const count = h('div', 'album-count', `${n}<small>/${SPECIES.length}</small>`);
    this.suits.append(count);
  }
}
