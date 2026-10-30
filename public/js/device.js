// Phone detection and phone-only niceties (vibration, full screen, keeping the screen awake).
import { profile } from './profile.js';

const setting = (k, d) => { const s = profile().settings || {}; return s[k] ?? d; };

/** True when the phone layout should be used: a touch screen whose short side is phone-sized, or the user's choice. */
export function isPhone() {
  const pref = setting('layout', 'auto');
  if (pref === 'phone') return true;
  if (pref === 'desktop') return false;
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  return !!coarse && Math.min(window.innerWidth, window.innerHeight) < 600;
}

/** Portrait screens show the battlefield standing up so it can use the whole height. */
export const isPortrait = () => window.innerHeight > window.innerWidth * 1.05;

/** Tags <html> so the menus can adapt too. */
export function applyDeviceClass() {
  const el = document.documentElement;
  el.classList.toggle('phone', isPhone());
  el.classList.toggle('portrait', isPortrait());
}

export function vibrate(pattern) {
  try {
    if (!navigator.vibrate || !setting('vibrate', true) || !isPhone()) return;
    // browsers refuse (and complain) until the player has touched the page
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate(pattern);
  } catch { /* not supported */ }
}

// iPhones ignore user-scalable=no; stop pinch-zoom from grabbing the battlefield
document.addEventListener('gesturestart', e => e.preventDefault());

/** Android browsers hide their address bar in full screen. iPhones ignore this (Add to Home Screen does it there). */
export function enterFullscreen() {
  try {
    if (!isPhone() || !setting('fullscreen', true)) return;
    const el = document.documentElement;
    if (document.fullscreenElement || !el.requestFullscreen) return;
    el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  } catch { /* not allowed */ }
}

let lock = null;
/** Stops the screen dimming mid-battle. */
export async function keepAwake(on) {
  try {
    if (on) {
      if (lock || !navigator.wakeLock) return;
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (lock) { const l = lock; lock = null; await l.release(); }
  } catch { lock = null; }
}
// the browser drops the lock when the tab is hidden; take it back when we return mid-match
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && keepAwake.wanted) keepAwake(true); });
keepAwake.wanted = false;
