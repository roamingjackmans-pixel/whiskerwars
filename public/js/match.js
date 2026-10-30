// Whisker Wars match controller: runs/receives the simulation, handles input, feeds renderer + HUD.
import { Game, radiusOf, BFX, SFX } from '../shared/game.js';
import { AI } from '../shared/ai.js';
import { TICK, SNAP_EVERY, BTYPES, BUILDINGS, HERO_BY_ID, PURR_ATK_PER_STAR, WORLD_W, WORLD_H } from '../shared/data.js';
import { Renderer, spellTargetOk } from './render.js';
import { Hud } from './hud.js';
import { audio } from './audio.js';

const BBIT = n => 1 << BFX.indexOf(n);
const LEFT_BIT = 1 << SFX.indexOf('left');
const PCTS = [0.25, 0.5, 0.75, 1];

// A tiny worker-based metronome keeps the simulation running even when the tab is in the background.
let metronomeUrl = null;
function makeMetronome(ms, fn) {
  try {
    if (!metronomeUrl) metronomeUrl = URL.createObjectURL(new Blob([`let i=null;onmessage=e=>{clearInterval(i);if(e.data>0)i=setInterval(()=>postMessage(0),e.data)}`], { type: 'text/javascript' }));
    const w = new Worker(metronomeUrl);
    w.onmessage = fn;
    w.postMessage(ms);
    return { stop: () => { w.postMessage(0); w.terminate(); } };
  } catch {
    const i = setInterval(fn, ms);
    return { stop: () => clearInterval(i) };
  }
}

class Interp {
  constructor(delay) { this.buf = []; this.delay = delay; this.clock = null; }
  push(s) {
    s._b = new Map(s.b.map(a => [a[0], a]));
    s._s = new Map(s.s.map(a => [a[0], a]));
    this.buf.push(s);
    if (this.buf.length > 60) this.buf.shift();
    if (this.clock == null) this.clock = s.t - this.delay;
  }
  get latest() { return this.buf[this.buf.length - 1]; }
  advance(dt) {
    if (!this.buf.length) return;
    const latest = this.latest.t;
    this.clock += dt;
    const target = latest - this.delay;
    const err = target - this.clock;
    if (Math.abs(err) > 0.6) this.clock = target;
    else this.clock += err * Math.min(1, dt * 1.5);
    if (this.clock > latest) this.clock = latest;
  }
  frame() {
    const B = this.buf;
    if (!B.length) return null;
    let a = B[0], b = B[0];
    for (let k = 0; k < B.length; k++) {
      if (B[k].t <= this.clock) a = B[k];
      if (B[k].t >= this.clock) { b = B[k]; break; }
      b = B[k];
    }
    const span = b.t - a.t;
    const u = span > 0 ? Math.max(0, Math.min(1, (this.clock - a.t) / span)) : 1;
    return { a, b, u };
  }
}

export class Match {
  /**
   * opts: { mode:'practice'|'campaign'|'online'|'attract', role:'local'|'host'|'guest', me, cfg?, info?,
   *         aiLevel?, send?(msg), onEnd?(result), level? }
   */
  constructor(canvas, hudRoot, opts) {
    this.canvas = canvas;
    this.opts = opts;
    this.mode = opts.mode;
    this.role = opts.role;
    this.me = opts.me ?? 0;
    this.attract = opts.mode === 'attract';
    this.renderer = new Renderer(canvas);
    this.renderer.fxLevel = opts.fxLevel || 'high';
    if (this.attract) this.renderer.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
    else this.renderer.setPadding(window.innerWidth < 700 ? { top: 46, bottom: 80, left: 2, right: 2 } : { top: 52, bottom: 76, left: 6, right: 6 });
    this.interp = new Interp(opts.role === 'guest' ? 0.16 : 0.05);
    this.ui = { sources: [], point: null, hover: null, target: null, selected: null, targeting: null, targetingSlot: -1, prediction: null };
    this.pct = 0.5;
    this.over = false;
    this.ended = false;
    this.lastTap = { id: -1, t: 0 };
    this.remoteEvents = [];

    if (this.role !== 'guest') {
      this.game = new Game(opts.cfg);
      this.info = this.game.staticInfo();
      this.ais = [];
      this.game.players.forEach((p, i) => { if (p.ai) this.ais.push(new AI(this.game, i, p.ai)); });
      this.interp.push(this.game.snapshot());
    } else {
      this.info = opts.info;
      if (opts.firstSnap) this.interp.push(opts.firstSnap);
    }
    // Player 2 sees the (point-symmetric) map rotated, so everyone's base starts on the left.
    this.flip = this.me === 1;
    const disp = this.flip ? { ...this.info, buildings: this.info.buildings.map(b => ({ ...b, x: WORLD_W - b.x, y: WORLD_H - b.y })) } : this.info;
    this.renderer.setMatch(disp, this.me);
    if (!this.attract) {
      this.hud = new Hud(hudRoot, this);
      this.hud.setup(this.info, this.me);
      this.bindInput();
    }
    this.onResize = () => {
      if (!this.attract) this.renderer.setPadding(window.innerWidth < 700 ? { top: 46, bottom: 80, left: 2, right: 2 } : { top: 52, bottom: 76, left: 6, right: 6 });
      else this.renderer.resize();
    };
    window.addEventListener('resize', this.onResize);
  }

  // ---------- lifecycle ----------
  start(countdown = 3) {
    this.running = true;
    let last = performance.now();
    const frame = now => {
      if (!this.running) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.raf = requestAnimationFrame(frame);
      try { this.frame(dt); }
      catch (e) { if (!this._errLogged) { this._errLogged = true; console.error('frame error', e); } }
    };
    this.raf = requestAnimationFrame(frame);
    const go = () => {
      if (!this.running) return;
      if (this.role !== 'guest') this.startSim();
      if (!this.attract) audio.music('battle');
    };
    if (countdown > 0 && !this.attract) {
      this.hud.countdown(countdown, go);
    } else go();
  }
  startSim() {
    let last = performance.now(), acc = 0;
    this.metro = makeMetronome(25, () => {
      const now = performance.now();
      if (this.paused) { last = now; return; }
      acc += Math.min(1.5, (now - last) / 1000);
      last = now;
      let steps = 0;
      while (acc >= TICK && steps < 30) {
        acc -= TICK; steps++;
        this.simStep();
        if (this.game.over) break;
      }
    });
  }
  simStep() {
    const g = this.game;
    if (!g.over) {
      for (const ai of this.ais) ai.update(TICK);
      g.step(TICK);
    } else if (this.finalSent) return;
    // (a match can also end between ticks, e.g. a surrender command)
    this.publish(g.snapshot(), g.over);
    if (g.over) {
      this.finalSent = true;
      if (this.metro) { this.metro.stop(); this.metro = null; }
    }
  }
  publish(snap, force) {
    this.interp.push(snap);
    if (this.role === 'host' && this.opts.send) {
      if (snap.e.length) this.remoteEvents.push(...snap.e);
      if (this.game.tickNo % SNAP_EVERY === 0 || force) {
        const out = { t: snap.t, b: snap.b, s: snap.s, p: snap.p, e: this.remoteEvents };
        if (snap.over) out.over = snap.over;
        this.opts.send({ type: 'snap', s: out });
        this.remoteEvents = [];
      }
    }
  }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    if (this.metro) { this.metro.stop(); this.metro = null; }
    window.removeEventListener('resize', this.onResize);
    this.unbindInput && this.unbindInput();
    if (this.hud) this.hud.destroy();
  }

  get canPause() { return this.role === 'local'; }
  setPaused(v) { if (this.canPause) this.paused = !!v; }
  netPause(v) { this.paused = !!v; }
  currentSnap() { const s = this.interp.latest; return { t: s.t, b: s.b, s: s.s, p: s.p, e: [] }; }

  // network entry points
  remoteCommand(c, from = 1) { if (this.game && !this.game.over) this.game.command(from, c); }
  pushRemoteSnap(s) { this.interp.push(s); }
  forceEnd(winner, why) {
    if (this.game) { if (!this.game.over) { this.game.finish(winner, why); this.simStep(); } }
    else if (!this.over) { const last = this.interp.latest; this.handleOver({ w: winner, why, stats: null, time: last ? Math.round(last.t) : 0 }); }
  }

  sendCmd(c) {
    if (this.over) return;
    if (this.role === 'guest') this.opts.send && this.opts.send({ type: 'cmd', c });
    else this.game.command(this.me, c);
  }

  // ---------- per-frame ----------
  frame(dt) {
    this.interp.advance(dt);
    const f = this.interp.frame();
    if (!f) { this.renderer.draw(null, null, dt); return; }
    const V = this.buildView(f.a, f.b, f.u);
    this.view = V;
    // process events for snapshots we've now reached
    for (const s of this.interp.buf) {
      if (s._done || s.t > this.interp.clock + 1e-6) continue;
      s._done = true;
      for (const e of s.e) this.handleEvent(e, V);
      if (s.over) this.handleOver(s.over);
    }
    if (!this.attract) this.refreshUI(V);
    this.renderer.draw(V, this.attract ? null : this.ui, dt);
    if (this.hud) this.hud.update(V, dt);
    if (this.attract && this.game && this.game.over && !this.restarting) {
      this.restarting = true;
      setTimeout(() => this.opts.onEnd && this.opts.onEnd({ attract: true }), 2500);
    }
  }

  buildView(a, b, u) {
    const pos = this.renderer.bpos;
    const buildings = [], byId = new Map();
    for (const arr of b.b) {
      const [id, owner, ti, level, count, fx, cap, hackBy] = arr;
      const p = pos.get(id);
      const prev = a._b.get(id);
      const c = prev && prev[1] === owner ? prev[4] + (count - prev[4]) * u : count;
      const type = BTYPES[ti];
      const o = { id, x: p.x, y: p.y, owner, type, level, count: c, fx, cap, hackBy, radius: radiusOf(type, level) };
      buildings.push(o); byId.set(id, o);
    }
    const squads = [], squadById = new Map();
    for (const arr of b.s) {
      const [id, owner, count, x, y, fx0, to] = arr;
      const prev = a._s.get(id);
      let sx = prev ? prev[3] + (x - prev[3]) * u : x, sy = prev ? prev[4] + (y - prev[4]) * u : y, fx = fx0;
      if (this.flip) { sx = WORLD_W - sx; sy = WORLD_H - sy; fx ^= LEFT_BIT; }
      const o = { id, owner, count, x: sx, y: sy, fx, to };
      squads.push(o); squadById.set(id, o);
    }
    const players = b.p.map(arr => ({ catnip: arr[0], purr: arr[1], cds: [arr[2], arr[3], arr[4]], buffs: arr[5], alive: arr[6], army: arr[7], stars: arr[8], gcd: arr[9] }));
    return { t: a.t + (b.t - a.t) * u, buildings, byId, squads, squadById, players, timeLimit: this.info.timeLimit };
  }

  handleEvent(e, V) {
    if (this.flip && (e.x != null || e.y != null)) e = { ...e, x: e.x != null ? WORLD_W - e.x : e.x, y: e.y != null ? WORLD_H - e.y : e.y };
    this.renderer.event(e, V);
    if (this.hud) this.hud.onEvent(e, V);
    if (this.attract) return;
    const me = this.me;
    switch (e.k) {
      case 'send': if (e.o === me) audio.play('send', { vol: 0.6 }); break;
      case 'arrive': audio.play(e.f ? 'pop' : 'hit', { vol: e.f ? 0.35 : 0.6 }); break;
      case 'cap': audio.play(e.o === me ? 'capture' : e.prev === me ? 'lost' : 'pop', { vol: e.o === me || e.prev === me ? 0.9 : 0.5 }); if (e.o === me && Math.random() < 0.5) audio.play('meow', { vol: 0.5 }); break;
      case 'fight': audio.play('fight', { vol: 0.55 }); break;
      case 'shot': audio.play('shot', { vol: 0.28 }); break;
      case 'up': audio.play('upgrade', { vol: e.o === me ? 0.8 : 0.4 }); break;
      case 'conv': audio.play('convert', { vol: e.o === me ? 0.8 : 0.4 }); break;
      case 'star': if (e.o === me) audio.play('star'); break;
      case 'emote': audio.play(e.id === 'hiss' ? 'hiss' : e.id === 'love' ? 'purr' : e.id === 'nap' ? 'snore' : 'meow', { vol: 0.7, pitch: e.o === me ? 1.1 : 0.95 }); break;
      case 'warp': audio.play('warp'); break;
      case 'boom': audio.play(e.fx === 'orbital' ? 'orbital' : 'explosion'); break;
      case 'blocked': audio.play('shield'); break;
      case 'err': if (e.o === me) audio.play('error'); break;
      case 'spell': {
        const s = {
          rally: 'buff', shield: 'shield', upgrade: 'upgrade', meteor: 'magic', frost: 'freeze', polymorph: 'magic', smoke: 'smoke',
          shuriken: 'zap', portal: 'warp', feast: 'heal', pepper: 'buff', stink: 'curse', flop: 'explosion', fortify: 'shield',
          nap: 'snore', tea: 'heal', bribe: 'coins', golden: 'coins', cannon: 'cannon', grog: 'buff', mutiny: 'hiss', coin: 'coinflip',
          beckon: 'meow', jackpot: 'coins', zerog: 'magic', tractor: 'ufo', orbital: 'zap', laser: 'laser', turret: 'zap',
          vacuum: 'vacuum', moon: 'heal', curse: 'curse', eclipse: 'curse', firewall: 'shield', hack: 'zap', drain: 'drain',
        }[e.fx] || 'spell';
        audio.play('spell', { vol: 0.5 });
        audio.play(s, { vol: 0.85 });
        break;
      }
    }
  }

  handleOver(over) {
    if (this.over) return;
    this.over = true;
    this.ui.sources = []; this.ui.targeting = null; this.ui.selected = null;
    if (this.attract) return;
    const win = over.w === this.me, draw = over.w < 0;
    audio.music(null);
    audio.play(win ? 'victory' : draw ? 'coin' : 'defeat');
    this.hud.banner(win ? 'VICTORY!' : draw ? 'DRAW!' : 'DEFEAT', win ? 'win' : draw ? 'draw' : 'lose', over.why);
    setTimeout(() => {
      if (this.ended) return;
      this.ended = true;
      this.opts.onEnd && this.opts.onEnd({ win, draw, winner: over.w, why: over.why, stats: over.stats, time: over.time ?? Math.round(this.view ? this.view.t : 0), me: this.me, info: this.info });
    }, 2600);
  }

  // ---------- helpers for UI ----------
  myHero() { return HERO_BY_ID[this.info.players[this.me].hero]; }
  estAttack(V) {
    let forge = 0;
    for (const b of V.buildings) if (b.owner === this.me && b.type === 'forge') forge += BUILDINGS.forge.atkBonus[b.level - 1];
    const P = V.players[this.me];
    let a = 1 + Math.min(0.6, forge) + (P ? P.stars * PURR_ATK_PER_STAR : 0) + (P && (P.buffs & 2) ? 0.5 : 0);
    if (this.myHero().passive.id === 'chivalry') a *= 1.1;
    return a;
  }
  estDefense(b) {
    let d = BUILDINGS[b.type].defense;
    if (b.fx & BBIT('fortify')) d *= 1.5;
    if (b.fx & BBIT('firewall')) d *= 1.6;
    if (b.fx & BBIT('stink')) d *= 0.7;
    if (b.fx & BBIT('shield')) d /= 0.3;
    if (b.owner >= 0 && HERO_BY_ID[this.info.players[b.owner].hero].passive.id === 'bigboned') d /= 0.85;
    return d;
  }
  refreshUI(V) {
    const ui = this.ui;
    ui.prediction = null;
    if (ui.sources.length && ui.target != null) {
      const tb = V.byId.get(ui.target);
      if (tb) {
        let n = 0;
        for (const id of ui.sources) { if (id === tb.id) continue; const b = V.byId.get(id); if (b) n += Math.floor(b.count * this.pct); }
        if (tb.owner === this.me) ui.prediction = { text: `+${n} 🐾`, neutral: true };
        else {
          const need = tb.count * this.estDefense(tb) / this.estAttack(V);
          const good = n > need + 0.3;
          ui.prediction = { text: `${n} ⚔ ${Math.ceil(need)}${good ? ' ✔' : ''}`, good };
        }
      }
    }
    // drop sources we no longer own
    if (ui.sources.length) ui.sources = ui.sources.filter(id => { const b = V.byId.get(id); return b && b.owner === this.me; });
    if (ui.selected != null) { const b = V.byId.get(ui.selected); if (!b || b.owner !== this.me) { ui.selected = null; this.hud.closeBMenu(); } else this.hud.positionBMenu(b); }
  }

  pick(wx, wy, slack = 14) {
    const V = this.view;
    if (!V) return null;
    let best = null, bd = Infinity;
    for (const b of V.buildings) {
      const dx = wx - b.x, dy = (wy - (b.y - b.radius * 0.45)) * 0.85;
      const d = Math.hypot(dx, dy);
      if (d < b.radius + slack && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  // ---------- commands from HUD ----------
  setPct(p) { this.pct = p; this.hud && this.hud.setPct(p); audio.play('click', { vol: 0.5 }); }
  selectSpell(slot) {
    if (this.over || !this.view) return;
    const hero = this.myHero();
    const sp = hero.spells[slot];
    const P = this.view.players[this.me];
    if (this.ui.targetingSlot === slot) { this.cancelTargeting(); return; }
    if (!P || P.cds[slot] > 0 || P.gcd > 0) { audio.play('error'); this.hud.flashSpell(slot, 'Recharging...'); return; }
    if (P.catnip < sp.cost) { audio.play('error'); this.hud.flashSpell(slot, 'Need more catnip!'); return; }
    this.closeMenu();
    if (sp.target === 'global') { this.sendCmd({ k: 'spell', slot }); return; }
    this.ui.targeting = sp; this.ui.targetingSlot = slot;
    this.canvas.style.cursor = 'crosshair';
    this.hud.setTargeting(slot);
    audio.play('click');
  }
  cancelTargeting() {
    this.ui.targeting = null; this.ui.targetingSlot = -1;
    this.canvas.style.cursor = '';
    this.hud && this.hud.setTargeting(-1);
  }
  castAt(wx, wy) {
    const sp = this.ui.targeting, slot = this.ui.targetingSlot;
    if (!sp) return;
    if (sp.target === 'area') {
      const x = this.flip ? WORLD_W - wx : wx, y = this.flip ? WORLD_H - wy : wy;
      this.sendCmd({ k: 'spell', slot, x: Math.round(x), y: Math.round(y) }); this.cancelTargeting(); return;
    }
    const b = this.pick(wx, wy, 24);
    if (b && spellTargetOk(sp, b, this.me)) { this.sendCmd({ k: 'spell', slot, b: b.id }); this.cancelTargeting(); }
    else { audio.play('error'); this.hud.toast('Pick a highlighted building', 'warn'); }
  }
  upgrade(id) { this.sendCmd({ k: 'up', b: id }); }
  convert(id, to) { this.sendCmd({ k: 'conv', b: id, to }); this.closeMenu(); }
  emote(id) { this.sendCmd({ k: 'emote', id }); }
  surrender() { this.sendCmd({ k: 'surrender' }); }
  openMenu(b) { this.ui.selected = b.id; this.hud.openBMenu(b, this.view); audio.play('click', { vol: 0.6 }); }
  closeMenu() { if (this.ui.selected != null) { this.ui.selected = null; this.hud.closeBMenu(); } }

  // ---------- input ----------
  bindInput() {
    const c = this.canvas;
    const W = ev => { const r = c.getBoundingClientRect(); return this.renderer.toWorld(ev.clientX - r.left, ev.clientY - r.top); };
    let drag = null;
    const down = ev => {
      if (this.over) return;
      if (ev.button === 2) { this.cancelAll(); return; }
      audio.init();
      const p = W(ev);
      this.ui.point = p;
      if (this.ui.targeting) { this.castAt(p.x, p.y); return; }
      const b = this.pick(p.x, p.y);
      if (this.ui.selected != null && b && b.id !== this.ui.selected) {
        this.sendCmd({ k: 'send', from: [this.ui.selected], to: b.id, pct: this.pct });
        audio.play('mew', { vol: 0.5 });
        this.closeMenu();
        return;
      }
      if (b && b.owner === this.me) {
        drag = { sources: [b.id], sx: ev.clientX, sy: ev.clientY, t0: performance.now(), moved: false, pid: ev.pointerId };
        this.ui.sources = [b.id];
        try { c.setPointerCapture(ev.pointerId); } catch { }
      } else {
        this.closeMenu();
        if (b) { this.ui.hover = b.id; }
      }
    };
    const move = ev => {
      const p = W(ev);
      this.ui.point = p;
      const b = this.pick(p.x, p.y);
      this.ui.hover = b ? b.id : null;
      if (!drag) { this.ui.target = null; return; }
      if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 9) { drag.moved = true; this.closeMenu(); }
      if (!drag.moved) return;
      if (b && b.owner === this.me && !drag.sources.includes(b.id)) {
        drag.sources.push(b.id);
        audio.play('hover', { pitch: 1 + drag.sources.length * 0.08 });
      }
      this.ui.sources = drag.sources;
      this.ui.target = b && !(drag.sources.length === 1 && drag.sources[0] === b.id) ? b.id : null;
    };
    const up = ev => {
      if (!drag) return;
      const d = drag; drag = null;
      try { c.releasePointerCapture(d.pid); } catch { }
      const p = W(ev);
      const b = this.pick(p.x, p.y);
      if (!d.moved && performance.now() - d.t0 < 450) {
        const id = d.sources[0];
        const now = performance.now();
        if (this.lastTap.id === id && now - this.lastTap.t < 330) { this.upgrade(id); this.lastTap.id = -1; this.closeMenu(); }
        else {
          this.lastTap = { id, t: now };
          const vb = this.view.byId.get(id);
          if (this.ui.selected === id) this.closeMenu(); else if (vb) this.openMenu(vb);
        }
      } else if (b && d.moved) {
        const from = d.sources.filter(id => id !== b.id);
        if (from.length) {
          this.sendCmd({ k: 'send', from, to: b.id, pct: this.pct });
          audio.play('mew', { vol: 0.55, pitch: 1 + Math.random() * 0.2 });
        }
      }
      this.ui.sources = []; this.ui.target = null;
    };
    const ctx = ev => { ev.preventDefault(); this.cancelAll(); };
    const wheel = ev => {
      if (this.over) return;
      ev.preventDefault();
      const i = PCTS.indexOf(this.pct);
      const n = Math.max(0, Math.min(PCTS.length - 1, i + (ev.deltaY > 0 ? -1 : 1)));
      if (n !== i) this.setPct(PCTS[n]);
    };
    const key = ev => {
      if (this.over || ev.target.tagName === 'INPUT') return;
      const k = ev.key.toLowerCase();
      if (k === '1' || k === '2' || k === '3') this.selectSpell(+k - 1);
      else if (k === 'q') this.setPct(0.25); else if (k === 'w') this.setPct(0.5); else if (k === 'e') this.setPct(0.75); else if (k === 'r') this.setPct(1);
      else if (k === 'escape') this.cancelAll();
      else if (k === 'u' && this.ui.hover != null) { const b = this.view.byId.get(this.ui.hover); if (b && b.owner === this.me) this.upgrade(b.id); }
      else if (k === 't') this.hud.toggleEmotes();
      else if (k === 'm') this.hud.toggleMute();
    };
    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('contextmenu', ctx);
    c.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', key);
    this.unbindInput = () => {
      c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up);
      c.removeEventListener('pointercancel', up); c.removeEventListener('contextmenu', ctx); c.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', key);
      c.style.cursor = '';
    };
  }
  cancelAll() { this.cancelTargeting(); this.closeMenu(); this.ui.sources = []; this.ui.target = null; this.hud && this.hud.closeEmotes(); }
}
