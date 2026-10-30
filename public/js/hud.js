// Whisker Wars in-match HUD (HTML overlay on top of the canvas).
import { HERO_BY_ID, BUILDINGS, CONVERT_COST, EMOTES, MAX_CATNIP, RULES, teamColor, findSpell } from '../shared/data.js';
import { heroPortraitURL } from './art.js';
import { audio } from './audio.js';
import { profile, setSetting } from './profile.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const TARGET_LABEL = { own: 'Your building', enemy: 'Enemy building', neutral: 'Stray building', notown: 'Enemy or stray building', area: 'Area', global: 'Instant' };
const safeURL = (id, s) => { try { return heroPortraitURL(id, s); } catch { return ''; } };

export class Hud {
  constructor(root, match) {
    this.root = root;
    this.m = match;
    root.innerHTML = '';
    root.className = 'hud active';
    this.acc = 0;
    this.tense = false;
  }

  setup(info, me) {
    this.info = info; this.me = me;
    const opp = me === 0 ? 1 : 0;
    this.opp = opp;
    const P = info.players;
    const card = (i, side) => {
      const h = HERO_BY_ID[P[i].hero];
      const c = teamColor(i);
      return `<div class="pcard ${side}" style="--tc:${c.main};--td:${c.dark}">
        <img class="portrait" src="${safeURL(h.id, 96)}" alt="">
        <div class="pinfo">
          <div class="pname">${esc(P[i].name)}${P[i].ai ? ' <span class="tag">AI</span>' : ''}</div>
          <div class="phero">${h.name}</div>
          <div class="pmeta"><span class="stars" title="Purr Power: boosts attack & speed">☆☆☆☆☆</span><span class="bcount" title="Buildings">🏠 0</span></div>
        </div>
        <div class="emote-pop"></div>
      </div>`;
    };
    const hero = HERO_BY_ID[P[me].hero];
    this.root.innerHTML = `
      <div class="hud-top">
        ${card(me, 'me')}
        <div class="hud-center">
          <div class="timer">--:--</div>
          ${RULES.filter(r => info.rules && info.rules[r.id]).length ? `<div class="rule-icons">${RULES.filter(r => info.rules[r.id]).map(r => `<span title="${r.name}: ${r.desc}">${r.icon}</span>`).join('')}</div>` : ''}
          <div class="armybar" title="Total cats (yours vs theirs)">
            <div class="fill me" style="background:${teamColor(me).main}"></div>
            <div class="fill opp" style="background:${teamColor(opp).main}"></div>
            <span class="l">0</span><span class="r">0</span>
          </div>
        </div>
        ${card(opp, 'opp')}
      </div>
      <div class="hud-bottom">
        <div class="pct" title="How many cats to send (wheel or Q/W/E/R)">
          <div class="pct-label">SEND</div>
          ${[0.25, 0.5, 0.75, 1].map((p, k) => `<button class="pct-btn" data-p="${p}">${p * 100}%<kbd>${'QWER'[k]}</kbd></button>`).join('')}
        </div>
        <div class="spellbar">
          <div class="catnip" title="Catnip: spell energy. Gardens make it faster.">
            <div class="catnip-fill"></div><span class="catnip-txt">🌿 0</span>
          </div>
          <div class="spells">
            ${hero.spells.map((s, k) => `<button class="spell" data-slot="${k}">
              <span class="sicon">${s.icon}</span><span class="scost">${s.cost}</span>
              <div class="scd"></div><span class="scdtxt"></span><kbd>${k + 1}</kbd></button>`).join('')}
          </div>
          <div class="passive" title="${esc(hero.passive.name + ': ' + hero.passive.desc)}">✦ ${hero.passive.name}</div>
        </div>
        <div class="actions">
          <button class="emote-btn" title="Emotes (T)">😺</button>
          <button class="menu-btn" title="Menu">☰</button>
        </div>
      </div>
      <div class="emote-wheel hidden">${EMOTES.map(e => `<button data-e="${e.id}" title="${e.text}">${e.icon}</button>`).join('')}</div>
      <div class="bmenu hidden"></div>
      <div class="spell-tip hidden"></div>
      <div class="toasts"></div>
      <div class="targeting-hint hidden"></div>
      <div class="countdown hidden"></div>
      <div class="banner hidden"></div>
      <div class="pause hidden"></div>
      <div class="ping"></div>`;
    const $ = s => this.root.querySelector(s);
    this.$ = $;
    this.els = {
      timer: $('.timer'), fillMe: $('.armybar .fill.me'), fillOpp: $('.armybar .fill.opp'), armyL: $('.armybar .l'), armyR: $('.armybar .r'),
      catFill: $('.catnip-fill'), catTxt: $('.catnip-txt'), spells: [...this.root.querySelectorAll('.spell')],
      starsMe: $('.pcard.me .stars'), starsOpp: $('.pcard.opp .stars'), bMe: $('.pcard.me .bcount'), bOpp: $('.pcard.opp .bcount'),
      toasts: $('.toasts'), bmenu: $('.bmenu'), tip: $('.spell-tip'), wheel: $('.emote-wheel'), hint: $('.targeting-hint'), ping: $('.ping'),
    };
    this.root.querySelectorAll('.pct-btn').forEach(b => b.addEventListener('click', () => this.m.setPct(+b.dataset.p)));
    this.setPct(this.m.pct);
    this.els.spells.forEach(b => {
      const slot = +b.dataset.slot;
      b.addEventListener('click', () => { audio.init(); this.m.selectSpell(slot); });
      b.addEventListener('pointerenter', () => this.showTip(slot, b));
      b.addEventListener('pointerleave', () => this.els.tip.classList.add('hidden'));
    });
    $('.emote-btn').addEventListener('click', () => this.toggleEmotes());
    this.els.wheel.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { this.m.emote(b.dataset.e); this.closeEmotes(); }));
    $('.menu-btn').addEventListener('click', () => this.openPause());
    this.bmenuFor = null;
  }

  setPct(p) { this.root.querySelectorAll('.pct-btn').forEach(b => b.classList.toggle('on', +b.dataset.p === p)); }
  showTip(slot, btn) {
    const s = HERO_BY_ID[this.info.players[this.me].hero].spells[slot];
    const tip = this.els.tip;
    tip.innerHTML = `<div class="tt-h">${s.icon} ${s.name}</div><div class="tt-d">${s.desc}</div>
      <div class="tt-m"><span>🌿 ${s.cost}</span><span>⏱ ${s.cd}s</span><span>🎯 ${TARGET_LABEL[s.target]}${s.radius ? '' : ''}</span></div>`;
    tip.classList.remove('hidden');
    const r = btn.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.innerWidth - 268, r.left + r.width / 2 - 130)) + 'px';
    tip.style.bottom = (window.innerHeight - r.top + 10) + 'px';
  }
  flashSpell(slot, msg) {
    const b = this.els.spells[slot];
    b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
    this.toast(msg, 'warn');
  }
  setTargeting(slot) {
    this.els.spells.forEach((b, k) => b.classList.toggle('targeting', k === slot));
    if (slot >= 0) {
      const s = HERO_BY_ID[this.info.players[this.me].hero].spells[slot];
      this.els.hint.innerHTML = `${s.icon} <b>${s.name}</b> — ${s.target === 'area' ? 'tap a spot on the map' : 'tap a glowing building'} <span>(right-click / Esc to cancel)</span>`;
      this.els.hint.classList.remove('hidden');
    } else this.els.hint.classList.add('hidden');
  }

  update(V, dt) {
    this.acc += dt;
    if (this.bmenuFor != null) this.refreshBMenu(V);
    if (this.acc < 0.066) return;
    this.acc = 0;
    const me = V.players[this.me], op = V.players[this.opp];
    if (!me || !op) return;
    const remain = (V.timeLimit || 600) - V.t;
    this.els.timer.textContent = fmtTime(remain);
    this.els.timer.classList.toggle('low', remain < 60);
    if (!this.tense && remain < 90 && !this.m.over) { this.tense = true; audio.music('tense'); }
    const tot = Math.max(1, me.army + op.army);
    this.els.fillMe.style.width = (me.army / tot * 100) + '%';
    this.els.fillOpp.style.width = (op.army / tot * 100) + '%';
    this.els.armyL.textContent = me.army; this.els.armyR.textContent = op.army;
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    this.els.starsMe.textContent = stars(me.stars); this.els.starsOpp.textContent = stars(op.stars);
    let bm = 0, bo = 0;
    for (const b of V.buildings) { if (b.owner === this.me) bm++; else if (b.owner === this.opp) bo++; }
    this.els.bMe.textContent = '🏠 ' + bm; this.els.bOpp.textContent = '🏠 ' + bo;
    this.els.catFill.style.width = (me.catnip / MAX_CATNIP * 100) + '%';
    this.els.catTxt.textContent = '🌿 ' + Math.floor(me.catnip);
    const hero = HERO_BY_ID[this.info.players[this.me].hero];
    hero.spells.forEach((s, k) => {
      const b = this.els.spells[k];
      const cd = me.cds[k];
      const max = s.cd * (hero.passive.id === 'overclock' ? 0.75 : 1);
      b.classList.toggle('poor', me.catnip < s.cost);
      b.classList.toggle('ready', cd <= 0 && me.catnip >= s.cost);
      const cdEl = b.querySelector('.scd'), txt = b.querySelector('.scdtxt');
      if (cd > 0) { cdEl.style.background = `conic-gradient(rgba(20,16,40,0.72) ${cd / max * 360}deg, transparent 0)`; txt.textContent = Math.ceil(cd); }
      else if (me.catnip < s.cost) { const need = (s.cost - me.catnip) / MAX_CATNIP; cdEl.style.background = `linear-gradient(to top, transparent ${100 - need * 100}%, rgba(20,16,40,0.45) 0)`; txt.textContent = ''; }
      else { cdEl.style.background = 'none'; txt.textContent = ''; }
    });
    const ping = this.m.opts.getPing ? this.m.opts.getPing() : null;
    this.els.ping.textContent = ping != null ? `📶 ${ping} ms` : '';
  }

  onEvent(e, V) {
    const me = this.me;
    switch (e.k) {
      case 'spell': {
        const s = findSpell(e.id);
        if (!s) break;
        const who = this.info.players[e.o];
        this.toast(`${s.icon} <b>${esc(who.name)}</b> cast <b>${s.name}</b>${e.res && e.fx === 'coin' ? ` → ${e.res}` : ''}`, e.o === me ? 'mine' : 'theirs', e.o);
        break;
      }
      case 'err': if (e.o === me) this.toast(e.msg, 'warn'); break;
      case 'star': if (e.o === me) this.toast(`⭐ Purr Power ${'★'.repeat(e.n)} — your cats get stronger!`, 'mine'); break;
      case 'emote': {
        const card = this.root.querySelector(e.o === me ? '.pcard.me .emote-pop' : '.pcard.opp .emote-pop');
        const em = EMOTES.find(x => x.id === e.id);
        if (card && em) { card.textContent = `${em.icon} ${em.text}`; card.classList.remove('show'); void card.offsetWidth; card.classList.add('show'); }
        break;
      }
      case 'out': if (e.why === 'surrender') this.toast(`🏳️ ${esc(this.info.players[e.o].name)} surrendered`, 'theirs'); break;
    }
  }

  toast(html, kind = '', owner = -1) {
    const t = el('div', 'toast ' + kind, html);
    if (owner >= 0) t.style.setProperty('--tc', teamColor(owner).main);
    this.els.toasts.prepend(t);
    while (this.els.toasts.children.length > 4) this.els.toasts.lastChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 2600);
  }

  // ---------- building menu ----------
  openBMenu(b, V) {
    this.bmenuFor = b.id;
    this.bmenuKey = '';
    this.els.bmenu.classList.remove('hidden');
    this.refreshBMenu(V, true);
    this.positionBMenu(b);
  }
  closeBMenu() { this.bmenuFor = null; this.els.bmenu.classList.add('hidden'); }
  positionBMenu(b) {
    const s = this.m.renderer.toScreen(b.x, b.y);
    const menu = this.els.bmenu;
    const w = menu.offsetWidth || 230, h = menu.offsetHeight || 120;
    let x = s.x - w / 2, y = s.y + b.radius * this.m.renderer.view.scale * 0.9 + 22;
    if (y + h > window.innerHeight - 100) y = s.y - b.radius * this.m.renderer.view.scale * 2.1 - h;
    menu.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, x)) + 'px';
    menu.style.top = Math.max(60, y) + 'px';
  }
  refreshBMenu(V, force) {
    const b = V.byId.get(this.bmenuFor);
    if (!b) return this.closeBMenu();
    const def = BUILDINGS[b.type];
    const eng = HERO_BY_ID[this.info.players[this.me].hero].passive.id === 'engineering';
    const cost = def.upgradeCost[b.level - 1] != null ? (eng ? Math.ceil(def.upgradeCost[b.level - 1] * 0.75) : def.upgradeCost[b.level - 1]) : null;
    const n = Math.floor(b.count);
    const convs = def.noConvert ? [] : Object.keys(CONVERT_COST).filter(t => t !== b.type).map(t => ({ t, c: eng ? Math.ceil(CONVERT_COST[t] * 0.75) : CONVERT_COST[t] }));
    const key = `${b.id}|${b.type}|${b.level}|${cost != null && n >= cost}|${convs.map(c => n >= c.c ? 1 : 0).join('')}`;
    if (!force && key === this.bmenuKey) return;
    this.bmenuKey = key;
    let info = '';
    if (def.prod[b.level - 1]) info = `🐱 ${def.prod[b.level - 1].toFixed(2)}/s · holds ${b.cap}`;
    else if (def.range) info = `🎯 range ${def.range[b.level - 1]} · holds ${b.cap}`;
    else if (def.atkBonus) info = `⚔ +${Math.round(def.atkBonus[b.level - 1] * 100)}% attack for all cats`;
    else if (def.catnipBonus) info = `🌿 +${Math.round(def.catnipBonus[b.level - 1] * 100)}% catnip regen`;
    const m = this.els.bmenu;
    m.innerHTML = `
      <div class="bm-h">${def.icon} ${def.name} <span class="lv">Lv ${b.level}${def.maxLevel > 1 ? '/' + def.maxLevel : ''}</span><button class="bm-x">✕</button></div>
      <div class="bm-i">${info}</div>
      ${cost != null ? `<button class="bm-up ${n >= cost ? '' : 'off'}">⬆ Upgrade <span>${cost} 🐾</span></button>` : `<div class="bm-max">${def.maxLevel > 1 ? '★ Max level' : ''}</div>`}
      ${convs.length ? `<div class="bm-conv-l">Convert to:</div><div class="bm-conv">${convs.map(c => `<button data-t="${c.t}" class="${n >= c.c ? '' : 'off'}" title="${BUILDINGS[c.t].name}: ${BUILDINGS[c.t].desc}">${BUILDINGS[c.t].icon}<span>${c.c}</span></button>`).join('')}</div>` : ''}
      <div class="bm-tip">Tap another building to send cats · double-tap to upgrade</div>`;
    m.querySelector('.bm-x').onclick = () => this.m.closeMenu();
    const up = m.querySelector('.bm-up');
    if (up) up.onclick = () => { this.m.upgrade(b.id); };
    m.querySelectorAll('.bm-conv button').forEach(x => x.onclick = () => this.m.convert(b.id, x.dataset.t));
  }

  // ---------- emotes / pause ----------
  toggleEmotes() { this.els.wheel.classList.toggle('hidden'); }
  closeEmotes() { this.els.wheel.classList.add('hidden'); }
  toggleMute() { const v = !audio.muted; audio.setMuted(v); setSetting('muted', v); this.toast(v ? '🔇 Sound off' : '🔊 Sound on'); }
  openPause() {
    const p = this.$('.pause');
    const canPause = this.m.canPause;
    this.m.setPaused(true);
    const st = profile().settings;
    p.innerHTML = `<div class="pause-card">
      <h2>${canPause ? '⏸ Paused' : '☰ Menu'}</h2>
      ${canPause ? '' : '<p class="muted">Online matches keep running!</p>'}
      <button class="btn primary p-resume">Resume</button>
      <div class="row"><button class="btn p-music">${st.music > 0 ? '🎵 Music: on' : '🎵 Music: off'}</button><button class="btn p-sound">${audio.muted ? '🔇 Sound: off' : '🔊 Sound: on'}</button></div>
      <div class="help-mini">
        <div><b>Drag</b> from your building to send cats · <b>swipe</b> across several to send from all</div>
        <div><b>Tap</b> a building for upgrade/convert · <b>double-tap</b> to upgrade</div>
        <div><b>1-3</b> spells · <b>Q W E R</b> send 25-100% · <b>T</b> emotes · <b>Esc</b> cancel</div>
      </div>
      <button class="btn danger p-surrender">🏳️ Surrender</button>
    </div>`;
    p.classList.remove('hidden');
    const close = () => { p.classList.add('hidden'); this.m.setPaused(false); };
    p.querySelector('.p-resume').onclick = close;
    p.onclick = ev => { if (ev.target === p) close(); };
    p.querySelector('.p-music').onclick = ev => {
      const on = !(profile().settings.music > 0);
      setSetting('music', on ? 0.45 : 0); audio.setVolumes({ music: on ? 0.45 : 0 });
      ev.target.textContent = on ? '🎵 Music: on' : '🎵 Music: off';
    };
    p.querySelector('.p-sound').onclick = ev => { this.toggleMute(); ev.target.textContent = audio.muted ? '🔇 Sound: off' : '🔊 Sound: on'; };
    p.querySelector('.p-surrender').onclick = ev => {
      if (ev.target.dataset.sure) { close(); this.m.surrender(); }
      else { ev.target.dataset.sure = 1; ev.target.textContent = 'Tap again to give up'; }
    };
  }

  countdown(n, done) {
    const c = this.$('.countdown');
    c.classList.remove('hidden');
    const tick = k => {
      if (!this.m.running) return;
      c.innerHTML = `<span class="cd-num">${k > 0 ? k : 'GO!'}</span>`;
      audio.play(k > 0 ? 'countdown' : 'go');
      if (k > 0) setTimeout(() => tick(k - 1), 800);
      else { done(); setTimeout(() => c.classList.add('hidden'), 700); }
    };
    tick(n);
  }
  banner(text, kind, why) {
    const b = this.$('.banner');
    const sub = why === 'surrender' ? 'by surrender' : why === 'disconnect' ? 'opponent disconnected' : why === 'time' ? 'time ran out — biggest army wins' : '';
    b.className = 'banner ' + kind;
    b.innerHTML = `<div class="banner-t">${text}</div>${sub ? `<div class="banner-s">${sub}</div>` : ''}`;
    this.closeBMenu(); this.closeEmotes();
    this.$('.pause').classList.add('hidden');
  }
  waiting(text) {
    let w = this.root.querySelector('.waiting');
    if (!text) { if (w) w.remove(); return; }
    if (!w) { w = el('div', 'waiting'); this.root.appendChild(w); }
    w.innerHTML = '<div class="waiting-card"><div class="waiting-cat">📡</div><div>' + text + '</div></div>';
  }
  destroy() { this.root.innerHTML = ''; this.root.className = 'hud'; }
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
