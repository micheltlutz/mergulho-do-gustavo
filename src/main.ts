import './styles.css';
import { initAudio } from './audio/core.ts';
import { initSpeech } from './audio/speech.ts';
import { applyPendingUpdate, setupPWA } from './pwa.ts';
import { AlbumScreen } from './ui/album.ts';
import { DiveScreen } from './ui/diveScreen.ts';
import { TitleScreen } from './ui/title.ts';

/** Bloqueia zoom, menu de toque longo, seleção e rolagem do Safari (menos nas listas que rolam). */
function blockBrowserGestures(): void {
  const prevent = (e: Event) => e.preventDefault();
  for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu', 'selectstart']) {
    document.addEventListener(type, prevent, { passive: false });
  }
  document.addEventListener(
    'touchmove',
    (e) => {
      if (!(e.target instanceof Element && e.target.closest('.scroll'))) e.preventDefault();
    },
    { passive: false },
  );
  // Sem um listener de touchstart, o iOS não mostra o efeito de botão apertado (:active).
  document.addEventListener('touchstart', () => {}, { passive: true });
}

blockBrowserGestures();
initAudio();
initSpeech();

type ScreenName = 'title' | 'dive' | 'album';
let current: ScreenName = 'title';

const title = new TitleScreen({ play: (i) => play(i), album: () => show('album') });
const dive = new DiveScreen({ title: () => show('title'), play: (i) => play(i) });
const album = new AlbumScreen(() => show('title'));
document.getElementById('app')!.append(title.el, dive.el, album.el);

function play(i: number): void {
  current = 'dive';
  title.el.hidden = true;
  album.el.hidden = true;
  dive.el.hidden = false;
  dive.open(i);
}

function show(name: Exclude<ScreenName, 'dive'>): void {
  if (current === 'dive') dive.close();
  current = name;
  dive.el.hidden = true;
  title.el.hidden = name !== 'title';
  album.el.hidden = name !== 'album';
  if (name === 'title') title.show();
  else album.show();
  // Atualizações só fora do mergulho.
  applyPendingUpdate();
}

document.addEventListener('visibilitychange', () => {
  if (current !== 'dive') return;
  if (document.visibilityState === 'hidden') dive.pause();
  else dive.resume();
});

show('title');
setupPWA(() => current !== 'dive');
