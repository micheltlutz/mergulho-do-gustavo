// A tela do mergulho: o mar (canvas), o painel do barco com as letras, o
// botão da câmera, a seta da Bolinha, o polaroide das fotos, a festa e o troféu.

import { music } from '../audio/music.ts';
import { sfx } from '../audio/sfx.ts';
import { voice } from '../audio/speech.ts';
import { Dive, type DiveEvent } from '../game/dive.ts';
import { LETTERS } from '../game/letters.ts';
import { Ocean } from '../game/ocean.ts';
import { letterName, letterRef, WORDS, type Word } from '../game/words.ts';
import { letterColor } from '../render/colors.ts';
import { face, PET_IDS } from '../render/faces.ts';
import { Scene } from '../render/scene.ts';
import { creatureSvg, SUITS } from '../render/sprites.ts';
import { PHOTOS_PER_SUIT, store } from '../storage.ts';
import { clearConfetti, confetti } from './confetti.ts';
import { h, makeScreen, onTap, TROPHY_SVG } from './dom.ts';
import { ICONS, iconButton } from './icons.ts';

export interface DiveNav {
  title(): void;
  play(wordIndex: number): void;
}

const STEP = 1 / 60;

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** O rosto do pet (para a festa). */
function petFace(id: (typeof PET_IDS)[number]): string {
  return `<svg viewBox="-80 -125 160 190" aria-hidden="true">${face(id, true)}</svg>`;
}

export class DiveScreen {
  readonly el = makeScreen('dive');
  private readonly nav: DiveNav;
  private readonly scene = new Scene();
  private readonly ocean = new Ocean();
  private dive: Dive | null = null;
  private word: Word = WORDS[0];
  private wordIndex = 0;
  private readonly panel = h('div', 'panel');
  private slots: HTMLElement[] = [];
  private readonly camBtn = h('button', 'cam');
  private readonly arrow = h('div', 'arrow');
  private readonly polaroid = h('div', 'polaroid');
  private readonly flyLayer = h('div', 'fly-layer');
  private readonly confirmEl = h('div', 'overlay confirm');
  private readonly trophyEl = h('div', 'overlay trophy');
  private raf = 0;
  private last = 0;
  private acc = 0;
  private active = false;
  private paused = false;
  private timers: number[] = [];
  private pointer: { id: number; x: number; y: number } | null = null;
  private keys = new Set<string>();
  private polaroidT = 0;
  private photoSaid = -99;

  constructor(nav: DiveNav) {
    this.nav = nav;
    this.camBtn.type = 'button';
    this.camBtn.setAttribute('aria-label', 'Foto');
    this.camBtn.innerHTML = ICONS.camera;
    const home = onTap(iconButton('home', 'Início', 'small home-btn'), () => this.askHome());
    this.arrow.hidden = true;
    this.polaroid.hidden = true;
    this.confirmEl.hidden = true;
    this.trophyEl.hidden = true;
    this.el.append(this.scene.canvas, this.panel, home, this.camBtn, this.arrow, this.polaroid, this.flyLayer, this.confirmEl, this.trophyEl);

    this.camBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dive?.flash();
    });
    const cv = this.scene.canvas;
    cv.addEventListener('pointerdown', (e) => {
      this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
      cv.setPointerCapture?.(e.pointerId);
    });
    cv.addEventListener('pointermove', (e) => {
      if (this.pointer?.id === e.pointerId) this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    const up = (e: PointerEvent) => {
      if (this.pointer?.id === e.pointerId) this.pointer = null;
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('resize', () => this.resize());
  }

  // ---------- abrir e fechar ----------

  open(wordIndex: number): void {
    this.close();
    this.wordIndex = wordIndex;
    this.word = WORDS[wordIndex];
    this.dive = new Dive(this.word, Date.now(), this.ocean);
    this.scene.setCrew(store.diver, store.suit);
    this.scene.reset();
    this.active = true;
    this.paused = false;
    this.acc = 0;
    this.pointer = null;
    this.keys.clear();
    this.trophyEl.hidden = true;
    this.confirmEl.hidden = true;
    this.polaroid.hidden = true;
    this.buildPanel();
    this.resize();
    music.setSong('sea');
    const what = this.word.kind === 'nome' ? `do nome ${this.word.spoken}` : `da palavra ${this.word.spoken}`;
    this.later(200, () => voice.say(`Vamos procurar as letras ${what}!`));
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
    if (import.meta.env.DEV) (window as unknown as { __dive: unknown }).__dive = this;
  }

  close(): void {
    this.active = false;
    cancelAnimationFrame(this.raf);
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    voice.stop();
    clearConfetti(this.el);
    this.flyLayer.textContent = '';
  }

  pause(): void {
    if (!this.active) return;
    this.paused = true;
    voice.stop();
  }

  resume(): void {
    if (!this.active || !this.confirmEl.hidden) return;
    this.paused = false;
    this.last = performance.now();
  }

  private later(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private resize(): void {
    const r = this.el.getBoundingClientRect();
    if (r.width > 0) this.scene.resize(r.width, r.height);
  }

  private buildPanel(): void {
    this.panel.textContent = '';
    this.panel.classList.remove('gold', 'shine');
    this.panel.style.setProperty('--n', String(this.word.letters.length));
    if (this.word.emoji) this.panel.append(h('i', 'pic', this.word.emoji));
    this.slots = this.word.letters.map((l) => {
      const s = h('div', 'slot', `<span>${l}</span>`);
      s.style.setProperty('--c', letterColor(l));
      this.panel.append(s);
      return s;
    });
  }

  // ---------- controles ----------

  private onKey(e: KeyboardEvent, down: boolean): void {
    if (!this.active || this.el.hidden) return;
    const k = e.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) {
      if (down) this.keys.add(k);
      else this.keys.delete(k);
      e.preventDefault();
    } else if (down && (k === ' ' || k === 'Enter')) {
      this.dive?.flash();
      e.preventDefault();
    } else if (down && k === 'Escape') {
      this.askHome();
    }
  }

  /** Para onde nadar: o dedo (no mar) ou as setas. */
  private target(): { x: number; y: number } | null {
    const d = this.dive!.diver;
    if (this.pointer) {
      const r = this.scene.canvas.getBoundingClientRect();
      return this.scene.toWorld(this.pointer.x - r.left, this.pointer.y - r.top);
    }
    if (this.keys.size) {
      let dx = 0;
      let dy = 0;
      if (this.keys.has('ArrowLeft')) dx -= 1;
      if (this.keys.has('ArrowRight')) dx += 1;
      if (this.keys.has('ArrowUp')) dy -= 1;
      if (this.keys.has('ArrowDown')) dy += 1;
      return { x: d.x + dx * 4, y: d.y + dy * 4 };
    }
    return null;
  }

  // ---------- quadro a quadro ----------

  private frame(now: number): void {
    if (!this.active) return;
    this.raf = requestAnimationFrame((t) => this.frame(t));
    const dive = this.dive!;
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.paused) dt = 0;
    if (dive.phase === 'dive') dive.target = this.target();
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      dive.step(STEP);
      for (const ev of dive.events.splice(0)) this.onEvent(ev);
    }
    this.scene.render(dive, dt, dive.phase === 'done');
    this.updateArrow(dt);
    if (this.polaroidT > 0) {
      this.polaroidT -= dt;
      if (this.polaroidT <= 0) this.polaroid.classList.add('out');
    }
  }

  /** Seta na borda da tela apontando para a letra mais perto (quando ela não aparece). */
  private updateArrow(dt: number): void {
    void dt;
    const dive = this.dive!;
    const l = dive.phase === 'dive' && dive.time - dive.lastFound > 6 ? dive.nearestLetter() : null;
    if (!l) {
      this.arrow.hidden = true;
      return;
    }
    const p = this.scene.toScreen(l.x, l.y);
    const r = this.el.getBoundingClientRect();
    const m = 70;
    if (p.x > m && p.x < r.width - m && p.y > m + 80 && p.y < r.height - m) {
      this.arrow.hidden = true;
      return;
    }
    const cx = r.width / 2;
    const cy = r.height / 2;
    const ang = Math.atan2(p.y - cy, p.x - cx);
    // Ponto na borda (num retângulo um pouco menor que a tela).
    const hw = r.width / 2 - m;
    const hh = r.height / 2 - m - 40;
    const k = Math.min(hw / Math.abs(Math.cos(ang) || 1e-6), hh / Math.abs(Math.sin(ang) || 1e-6));
    this.arrow.style.left = `${cx + Math.cos(ang) * k}px`;
    this.arrow.style.top = `${cy + 40 + Math.sin(ang) * k}px`;
    this.arrow.style.setProperty('--a', `${ang}rad`);
    if (this.arrow.dataset.letter !== l.letter) {
      this.arrow.dataset.letter = l.letter;
      this.arrow.innerHTML = `<i class="tip"></i><b style="--c:${letterColor(l.letter)}">${l.letter}</b>`;
    }
    this.arrow.hidden = false;
  }

  private onEvent(ev: DiveEvent): void {
    const dive = this.dive!;
    switch (ev.t) {
      case 'splash':
        sfx.splash();
        this.scene.splash(ev.x);
        break;
      case 'hint': {
        sfx.hint();
        const b = ev.bubble;
        voice.queue(`Gustavo, estou vendo ${letterRef(b.letter)} ${b.spot.zone.hint}!`);
        break;
      }
      case 'pop': {
        sfx.letterPop();
        this.scene.sparkle(ev.bubble.x, ev.bubble.y, 22);
        const l = ev.bubble.letter;
        const info = LETTERS[l];
        const name = cap(letterName(l));
        voice.say(info ? `Letra ${letterName(l)}! ${name} de ${info.word}!` : `${name}!`);
        this.slots[ev.bubble.slot]?.classList.add('coming');
        break;
      }
      case 'stored': {
        sfx.stored();
        const p = this.scene.toScreen(dive.boatX, -1.2);
        const r = this.el.getBoundingClientRect();
        this.flyToSlot(ev.bubble.slot, ev.bubble.letter, r.left + p.x, r.top + p.y);
        break;
      }
      case 'flash':
        sfx.camera();
        break;
      case 'photo': {
        const best = ev.best.species;
        let fresh = false;
        for (const s of ev.species) if (store.photo(s.id)) fresh = true;
        this.showPolaroid(best.id, fresh);
        if (fresh) {
          sfx.newPhoto();
          const n = store.album.length;
          const suit = SUITS[n / PHOTOS_PER_SUIT];
          voice.say(`${best.say}! Foto nova no álbum!${suit && n % PHOTOS_PER_SUIT === 0 ? ' Você ganhou uma roupa de mergulho nova!' : ''}`);
          this.photoSaid = dive.time;
        } else if (dive.time - this.photoSaid > 4) {
          voice.say(`${best.say}!`);
          this.photoSaid = dive.time;
        }
        break;
      }
      case 'vent':
        sfx.vent();
        break;
      case 'party':
        this.arrow.hidden = true;
        music.setSong('party');
        break;
      case 'aboard':
        this.celebrate();
        break;
    }
  }

  private showPolaroid(id: string, fresh: boolean): void {
    const p = this.polaroid;
    p.innerHTML = `<div class="photo">${creatureSvg(id)}</div>${fresh ? `<span class="new">${ICONS.star}</span>` : ''}`;
    p.classList.remove('out');
    p.hidden = false;
    p.animate(
      [
        { transform: 'translateY(60%) rotate(-14deg) scale(0.6)', opacity: 0 },
        { transform: 'translateY(0) rotate(-6deg) scale(1.05)', opacity: 1, offset: 0.7 },
        { transform: 'translateY(0) rotate(-4deg) scale(1)', opacity: 1 },
      ],
      { duration: 450, easing: 'ease-out' },
    );
    this.polaroidT = 2.6;
  }

  /** A letra sai do barco e voa para o lugar dela no painel. */
  private flyToSlot(index: number, letter: string, x: number, y: number): void {
    const slot = this.slots[index];
    if (!slot) return;
    const tile = h('div', 'fly', letter);
    tile.style.setProperty('--c', letterColor(letter));
    tile.style.left = `${x}px`;
    tile.style.top = `${y}px`;
    this.flyLayer.append(tile);
    const r = slot.getBoundingClientRect();
    const tx = r.left + r.width / 2 - x;
    const ty = r.top + r.height / 2 - y;
    const anim = tile.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.8)' },
        { transform: `translate(calc(-50% + ${tx * 0.5}px), calc(-50% + ${ty * 0.5 - 50}px)) scale(1.3)`, offset: 0.45 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${r.width / 80})` },
      ],
      { duration: 700, easing: 'ease-in-out', fill: 'forwards' },
    );
    anim.onfinish = () => {
      tile.remove();
      slot.classList.remove('coming');
      slot.classList.add('got');
      sfx.pop();
    };
  }

  // ---------- festa ----------

  private celebrate(): void {
    voice.stop();
    store.win(this.word.id);
    this.panel.classList.add('gold');
    sfx.win();
    sfx.horn(0.7);
    confetti(this.el, 120);
    const letters = this.word.letters;
    const gap = 850;
    letters.forEach((l, i) => {
      this.later(900 + i * gap, () => {
        const s = this.slots[i];
        s.classList.remove('say');
        void s.offsetWidth;
        s.classList.add('say');
        sfx.spell(i);
        voice.queue(cap(letterName(l)), 0.95);
      });
    });
    const end = 900 + letters.length * gap;
    this.later(end, () => {
      this.panel.classList.add('shine');
      voice.queue(`${cap(this.word.spoken)}!`, 0.9);
      voice.queue(this.word.end);
      sfx.horn();
    });
    this.later(end + 3600, () => this.showTrophy());
  }

  private showTrophy(): void {
    const t = this.trophyEl;
    t.textContent = '';
    const card = h('div', 'card');
    const top = h('div', 'top');
    top.append(h('div', 'cup', TROPHY_SVG));
    if (this.word.emoji) top.append(h('div', 'pic', this.word.emoji));
    const dancers = h('div', 'dancers', PET_IDS.map((p) => `<i>${petFace(p)}</i>`).join(''));
    const word = h('div', 'word', this.word.letters.map((l) => `<span>${l}</span>`).join(''));
    word.style.setProperty('--n', String(this.word.letters.length));
    const buttons = h('div', 'buttons');
    buttons.append(
      onTap(iconButton('home', 'Início', 'small'), () => this.nav.title()),
      onTap(iconButton('restart', 'Mergulhar de novo', 'small'), () => this.nav.play(this.wordIndex)),
      onTap(iconButton('next', 'Próxima palavra', 'big go'), () => this.nav.play((this.wordIndex + 1) % WORDS.length)),
    );
    card.append(top, dancers, word, buttons);
    t.append(card);
    t.hidden = false;
    confetti(this.el, 80);
  }

  // ---------- voltar ao início ----------

  private askHome(): void {
    if (!this.active) return;
    if (this.dive?.phase === 'done' || !this.trophyEl.hidden) {
      this.nav.title();
      return;
    }
    this.pause();
    const c = this.confirmEl;
    c.textContent = '';
    const card = h('div', 'card');
    card.append(
      onTap(iconButton('close', 'Continuar mergulhando', 'big stay'), () => {
        c.hidden = true;
        this.resume();
      }),
      onTap(iconButton('home', 'Sair do mergulho', 'big leave'), () => this.nav.title()),
    );
    c.append(card);
    c.hidden = false;
  }
}
