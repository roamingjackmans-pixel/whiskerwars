// Whisker Wars online session: lobby + match messaging over a transport (server relay or P2P).
import { hostRoom, joinRoom } from './net.js';
import { publicProfile, profile } from './profile.js';

const PROTO = 1;

export class OnlineSession {
  constructor(transport, isHost, code) {
    this.t = transport; this.isHost = isHost; this.code = code;
    this.me = isHost ? 0 : 1;
    this.h = {};
    this.ping = null;
    this.peerHere = false;
    this.closed = false;
    this.lobby = { players: [isHost ? publicProfile() : null, isHost ? null : publicProfile()], ready: [false, false], map: 'meadow', time: 600, rules: {}, phase: 'lobby', seed: (Math.random() * 1e9) | 0 };
    this.wire(transport);
    if (!isHost) { this.peerHere = true; this.send({ type: 'hello', p: publicProfile(), v: PROTO }); }
    this.pingTimer = setInterval(() => { if (this.peerHere) this.send({ type: 'ping', t: performance.now() }); }, 2000);
  }
  wire(transport) {
    const live = () => transport === this.t;
    transport.on('message', m => live() && this.onMsg(m));
    transport.on('peer-join', () => { if (!live()) return; this.peerHere = true; this.emit('peer-join'); });
    transport.on('peer-leave', () => {
      if (!live()) return;
      this.peerHere = false;
      if (this.isHost) { this.lobby.players[1] = null; this.lobby.ready = [false, false]; this.lobby.phase = 'lobby'; }
      this.emit('peer-leave');
      this.emit('lobby', this.lobby);
    });
    transport.on('close', () => { if (live() && !this.closed) this.emit('disconnected'); });
  }
  /** Guest: try to get back into the same room after a connection drop. */
  async rejoin() {
    const t = await joinRoom(this.code, profile().id);
    try { this.t.close(); } catch { }
    this.t = t;
    this.wire(t);
    this.peerHere = true;
    this.send({ type: 'hello', p: publicProfile(), v: PROTO, resume: true });
  }
  static async host() { const { transport, code } = await hostRoom(); return new OnlineSession(transport, true, code); }
  static async join(code) { const t = await joinRoom(code, profile().id); return new OnlineSession(t, false, code); }

  get kind() { return this.t.kind; }
  on(ev, fn) { (this.h[ev] ||= []).push(fn); return () => { this.h[ev] = this.h[ev].filter(f => f !== fn); }; }
  emit(ev, ...a) { for (const f of this.h[ev] || []) { try { f(...a); } catch (e) { console.error(e); } } }
  send(m) { this.t.send(m); }

  onMsg(m) {
    if (!m || typeof m !== 'object') return;
    switch (m.type) {
      case 'hello':
        if (!this.isHost) return;
        this.peerHere = true;
        this.lobby.players[1] = sanitize(m.p);
        this.lobby.ready[1] = false;
        if (this.inMatch) { this.lobby.phase = 'match'; this.emit('guest-resume', this.lobby.players[1]); break; }
        this.broadcast();
        this.emit('guest-hello', this.lobby.players[1]);
        break;
      case 'lobby':
        if (this.isHost) return;
        this.lobby = m.s;
        this.emit('lobby', this.lobby);
        break;
      case 'pick':
        if (!this.isHost || !this.lobby.players[1]) return;
        Object.assign(this.lobby.players[1], sanitize({ ...this.lobby.players[1], ...m.p }));
        this.broadcast();
        break;
      case 'ready':
        if (!this.isHost) return;
        this.lobby.ready[1] = !!m.v;
        this.broadcast();
        break;
      case 'start': if (!this.isHost) { this.lobby.phase = 'match'; this.emit(m.resume ? 'resume' : 'start', m); } break;
      case 'snap': this.emit('snap', m.s); break;
      case 'cmd': if (this.isHost) this.emit('cmd', m.c); break;
      case 'lemote': this.emit('lemote', m.id, this.isHost ? 1 : 0); break;
      case 'tolobby':
        if (this.isHost) this.resetLobby();
        this.emit('rematch-request');
        break;
      case 'ping': this.send({ type: 'pong', t: m.t }); break;
      case 'pong': this.ping = Math.round(performance.now() - m.t); break;
      case 'full': this.emit('error', new Error('That room is already full')); break;
    }
  }
  broadcast() {
    if (!this.isHost) return;
    this.send({ type: 'lobby', s: this.lobby });
    this.emit('lobby', this.lobby);
  }

  // ---- lobby actions ----
  setPick(p) {
    if (this.isHost) { Object.assign(this.lobby.players[0], p); this.broadcast(); }
    else { Object.assign(this.lobby.players[1] || {}, p); this.send({ type: 'pick', p }); }
  }
  setReady(v) {
    if (this.isHost) { this.lobby.ready[0] = !!v; this.broadcast(); }
    else { this.lobby.ready[1] = !!v; this.send({ type: 'ready', v: !!v }); this.emit('lobby', this.lobby); }
  }
  setMap(id) { if (this.isHost) { this.lobby.map = id; if (id === 'random') this.lobby.seed = (Math.random() * 1e9) | 0; this.broadcast(); } }
  setTime(s) { if (this.isHost) { this.lobby.time = s; this.broadcast(); } }
  toggleRule(id) { if (this.isHost) { this.lobby.rules = { ...this.lobby.rules, [id]: !this.lobby.rules[id] }; this.broadcast(); } }
  lobbyEmote(id) { this.send({ type: 'lemote', id }); }
  canStart() { return this.isHost && this.lobby.players[1] && this.lobby.ready[1]; }
  markMatch() { this.lobby.phase = 'match'; this.lobby.ready = [false, false]; if (this.isHost) this.broadcast(); }
  resetLobby() {
    this.lobby.phase = 'lobby'; this.lobby.ready = [false, false]; this.lobby.seed = (Math.random() * 1e9) | 0;
    this.broadcast();
  }
  /** Ask for a rematch: both players return to the lobby. */
  toLobby() {
    if (this.isHost) this.resetLobby();
    this.send({ type: 'tolobby' });
  }
  close() {
    this.closed = true;
    clearInterval(this.pingTimer);
    try { this.t.close(); } catch { }
  }
}

function sanitize(p) {
  if (!p) return null;
  return {
    id: String(p.id || '').slice(0, 16), name: String(p.name || 'Kitty').slice(0, 16), level: Math.max(1, Math.min(999, p.level | 0)),
    hero: String(p.hero || 'whiskers').slice(0, 16), fur: String(p.fur || 'ginger').slice(0, 16), hat: String(p.hat || 'none').slice(0, 16),
    heroes: Array.isArray(p.heroes) ? p.heroes.slice(0, 20).map(String) : [],
    fc: /^\d{8}$/.test(String(p.fc || '')) ? String(p.fc) : '',
  };
}
