// Tela inicial: quem mergulha (Pipoca, Mimi ou Bolinha), a roupa de
// mergulho, o álbum e as palavras.

import { music } from '../audio/music.ts';
import { voice } from '../audio/speech.ts';
import { WORDS } from '../game/words.ts';
import { letterColor } from '../render/colors.ts';
import { PET_IDS, PET_NAMES } from '../render/faces.ts';
import { diverSvg, SUITS } from '../render/sprites.ts';
import { PHOTOS_PER_SUIT, store } from '../storage.ts';
import { backToGames, h, makeScreen, onTap, TROPHY_SVG } from './dom.ts';
import { ICONS, iconButton } from './icons.ts';

export interface TitleNav {
  play(wordIndex: number): void;
  album(): void;
}

export class TitleScreen {
  readonly el = makeScreen('title-screen');
  private readonly cards = h('div', 'words scroll');
  private readonly pets = h('div', 'pets');
  private readonly suits = h('div', 'suits');
  private readonly albumBtn: HTMLButtonElement;
  private readonly soundBtn: HTMLButtonElement;
  private readonly musicBtn: HTMLButtonElement;

  constructor(nav: TitleNav) {
    const title = h('h1', 'title', '<span>Mergulho do</span>Gustavo');
    WORDS.forEach((w, i) => {
      const card = h('button', 'word-card');
      card.type = 'button';
      card.setAttribute('aria-label', w.spoken);
      card.dataset.word = w.id;
      onTap(card, () => nav.play(i));
      this.cards.append(card);
    });
    for (const id of PET_IDS) {
      const b = h('button', 'pet');
      b.type = 'button';
      b.dataset.pet = id;
      b.setAttribute('aria-label', PET_NAMES[id]);
      onTap(b, () => {
        store.diver = id;
        voice.say(`${PET_NAMES[id]} vai mergulhar!`);
        this.refresh();
      });
      this.pets.append(b);
    }
    for (const s of SUITS) {
      const b = h('button', 'suit');
      b.type = 'button';
      b.dataset.suit = s.id;
      b.style.setProperty('--c', s.color);
      b.setAttribute('aria-label', `Roupa ${s.id}`);
      onTap(b, () => {
        if (!store.suitUnlocked(s.id)) {
          const need = SUITS.indexOf(s) * PHOTOS_PER_SUIT - store.album.length;
          voice.say(`Fotografe mais ${need} ${need === 1 ? 'bichinho' : 'bichinhos'} do mar para ganhar esta roupa!`);
          b.classList.remove('nope');
          void b.offsetWidth;
          b.classList.add('nope');
          return;
        }
        store.suit = s.id;
        this.refresh();
      });
      this.suits.append(b);
    }
    this.albumBtn = onTap(iconButton('album', 'Álbum', 'album-btn'), () => nav.album());
    this.soundBtn = onTap(iconButton('soundOn', 'Som', 'small'), () => {
      store.sound = !store.sound;
      this.refresh();
    });
    this.musicBtn = onTap(iconButton('music', 'Música', 'small'), () => {
      store.music = !store.music;
      this.refresh();
    });
    const corner = h('div', 'corner');
    corner.append(this.musicBtn, this.soundBtn);
    const crew = h('div', 'crew');
    const row = h('div', 'crew-row');
    row.append(this.suits, this.albumBtn);
    crew.append(this.pets, row);
    const hero = h('div', 'hero');
    hero.append(title, crew);
    this.el.append(hero, this.cards, corner);
    backToGames(this.el);
  }

  show(): void {
    music.setSong('sea');
    this.refresh();
  }

  private refresh(): void {
    this.soundBtn.innerHTML = store.sound ? ICONS.soundOn : ICONS.soundOff;
    this.soundBtn.classList.toggle('off', !store.sound);
    this.musicBtn.classList.toggle('off', !store.music || !store.sound);
    for (const b of this.pets.children as HTMLCollectionOf<HTMLElement>) {
      const id = b.dataset.pet as (typeof PET_IDS)[number];
      b.innerHTML = diverSvg(id, store.suit, 0);
      b.classList.toggle('on', id === store.diver);
    }
    for (const b of this.suits.children as HTMLCollectionOf<HTMLElement>) {
      const id = b.dataset.suit as (typeof SUITS)[number]['id'];
      const open = store.suitUnlocked(id);
      b.classList.toggle('locked', !open);
      b.classList.toggle('on', id === store.suit);
      b.innerHTML = open ? '' : '🔒';
    }
    this.albumBtn.dataset.count = `${store.album.length}`;
    [...this.cards.children].forEach((card, i) => {
      const w = WORDS[i];
      const n = store.trophies(w.id);
      card.innerHTML =
        (w.emoji ? `<i class="pic">${w.emoji}</i>` : '') +
        `<span class="tiles">${w.letters.map((l) => `<b style="--c:${letterColor(l)}">${l}</b>`).join('')}</span>` +
        (n > 0 ? `<span class="cup">${TROPHY_SVG}${n > 1 ? `<em>${n}</em>` : ''}</span>` : '');
    });
  }
}
