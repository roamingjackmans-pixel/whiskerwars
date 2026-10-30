// Whisker Wars entry point
import { initUI, go, handleDeepLink } from './ui.js';
import { audio } from './audio.js';

function boot() {
  initUI();
  if (!handleDeepLink()) go('home');
  audio.music('menu');
  const loader = document.getElementById('loader');
  if (loader) { loader.classList.add('done'); setTimeout(() => loader.remove(), 600); }
}

// make sure the cute font is ready before canvas text is drawn
const fontReady = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('700 20px Fredoka'), new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
fontReady.finally(() => {
  try { boot(); }
  catch (e) {
    console.error(e);
    document.body.insertAdjacentHTML('beforeend', `<div style="position:fixed;inset:0;display:grid;place-items:center;background:#2b1d3a;color:#fff;font:18px sans-serif;padding:20px;text-align:center">😿 Something went wrong loading Whisker Wars.<br><small>${String(e && e.message || e)}</small></div>`);
  }
});

window.addEventListener('error', e => console.error('Uncaught', e.error || e.message));
