// Whisker Wars networking: two interchangeable transports.
//  - WSTransport: relay through the included Node server (most reliable)
//  - P2PTransport: direct WebRTC via PeerJS (works on any static website)
// A room has a host and up to 3 guests. Guests are numbered by slot (1-3). Events: 'message'(data, fromSlot),
// 'peer-join'(slot), 'peer-leave'(slot); a guest hears from the host as slot 0. send(data, toSlot?) on the
// host goes to one guest or, without a slot, to all of them.
const MAX_GUESTS = 3;
// Room codes are 5 digits: easy to read out and type on a phone's number pad.
const CODE_ALPHABET = '0123456789';
export function genCode(n = 5) {
  let c = '';
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  for (let i = 0; i < n; i++) c += i === 0 ? String(1 + (a[i] % 9)) : CODE_ALPHABET[a[i] % CODE_ALPHABET.length]; // never starts with 0
  return c;
}
// (letters are still accepted so a room made with an old letter code can be joined)
export function cleanCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); }

class Emitter {
  constructor() { this._h = {}; }
  on(ev, fn) { (this._h[ev] ||= []).push(fn); return this; }
  off(ev, fn) { this._h[ev] = (this._h[ev] || []).filter(f => f !== fn); }
  emit(ev, ...a) { for (const f of this._h[ev] || []) { try { f(...a); } catch (e) { console.error(e); } } }
}

const cfg = () => window.WW_CONFIG || {};

let detected;
const FORCE_P2P = typeof location !== 'undefined' && new URLSearchParams(location.search).has('p2p');
/** Returns the relay server ws:// URL to use, or null for peer-to-peer. */
export async function detectServer() {
  if (detected !== undefined) return detected;
  const s = FORCE_P2P ? 'p2p' : (cfg().server || 'auto');
  if (s === 'p2p' || s === 'none') return (detected = null);
  if (/^wss?:\/\//.test(s)) return (detected = s);
  // GitHub Pages only serves static files, so there is never a server to find there
  if (location.protocol === 'file:' || /\.github\.io$/.test(location.hostname)) return (detected = null);
  // the server answers at <app folder>/api/health (or the site root)
  for (const rel of ['api/health', '/api/health']) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 2500);
      const url = new URL(rel, location.href);
      const r = await fetch(url, { cache: 'no-store', signal: ctl.signal });
      clearTimeout(timer);
      const j = await r.json();
      if (j && j.ok && j.name === 'whisker-wars') {
        const ws = new URL(rel.replace('api/health', 'ws'), location.href);
        ws.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return (detected = ws.href);
      }
    } catch { /* static host */ }
  }
  return (detected = null);
}

export class WSTransport extends Emitter {
  constructor(url) { super(); this.url = url; this.kind = 'server'; this.ws = null; this.code = null; this.isHost = false; }
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.url);
      const timer = setTimeout(() => { try { ws.close(); } catch {} reject(new Error('Server timeout')); }, 6000);
      ws.onopen = () => { clearTimeout(timer); resolve(); };
      ws.onerror = () => { clearTimeout(timer); reject(new Error('Could not reach the game server')); };
      ws.onclose = () => { if (this.ws === ws) { this.ws = null; this.emit('close'); } };
      ws.onmessage = ev => this._onMsg(ev.data);
      this.ws = ws;
    });
  }
  _onMsg(raw) {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'msg') this.emit('message', m.d, m.from || 0);
    else if (m.t === 'peer-join') this.emit('peer-join', m.slot || 1);
    else if (m.t === 'peer-leave') this.emit('peer-leave', m.slot || 0);
    else if (m.t === 'pong') this.emit('server-pong', m.ts);
    else this.emit('ctl', m);
  }
  _await(types, ms = 6000) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.off('ctl', h); reject(new Error('Server did not answer')); }, ms);
      const h = m => {
        if (m.t === 'error') { clearTimeout(t); this.off('ctl', h); const e = new Error(m.msg || 'Error'); e.code = m.code; reject(e); }
        else if (types.includes(m.t)) { clearTimeout(t); this.off('ctl', h); resolve(m); }
      };
      this.on('ctl', h);
    });
  }
  async host() {
    await this.connect();
    this.ws.send(JSON.stringify({ t: 'host' }));
    const m = await this._await(['hosted']);
    this.code = m.code; this.isHost = true;
    return m.code;
  }
  async join(code, pid) {
    await this.connect();
    this.ws.send(JSON.stringify({ t: 'join', code, pid }));
    const m = await this._await(['joined']);
    this.code = code; this.isHost = false; this.slot = m.slot || 1;
  }
  send(d, to) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(to ? { t: 'msg', d, to } : { t: 'msg', d })); }
  get connected() { return !!this.ws && this.ws.readyState === 1; }
  close() { const ws = this.ws; this.ws = null; if (ws) { try { ws.send(JSON.stringify({ t: 'leave' })); } catch {} try { ws.close(); } catch {} } }
}

export class P2PTransport extends Emitter {
  constructor() { super(); this.kind = 'p2p'; this.peer = null; this.conn = null; this.conns = new Map(); this.code = null; this.isHost = false; }
  _peerOpts() {
    const o = { debug: 1 };
    const ice = cfg().iceServers;
    if (Array.isArray(ice) && ice.length) {
      o.config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, ...ice] };
    }
    return o;
  }
  _newPeer(id) {
    if (!window.Peer) throw new Error('Peer-to-peer library failed to load');
    return new Promise((resolve, reject) => {
      const peer = id ? new window.Peer(id, this._peerOpts()) : new window.Peer(this._peerOpts());
      const timer = setTimeout(() => reject(new Error('Could not reach the matchmaking service')), 10000);
      peer.on('open', () => { clearTimeout(timer); resolve(peer); });
      peer.on('error', err => { clearTimeout(timer); reject(err); });
    });
  }
  /** guest: the one connection to the host */
  _wire(conn) {
    this.conn = conn;
    conn.on('data', d => this.emit('message', d, 0));
    conn.on('close', () => { if (this.conn === conn) { this.conn = null; this.emit('peer-leave', 0); } });
    conn.on('error', () => {});
  }
  /** host: one connection per guest slot */
  _wireGuest(conn, slot) {
    this.conns.set(slot, conn);
    conn.on('data', d => { if (this.conns.get(slot) === conn) this.emit('message', d, slot); });
    conn.on('close', () => { if (this.conns.get(slot) === conn) { this.conns.delete(slot); this.emit('peer-leave', slot); } });
    conn.on('error', () => {});
  }
  async host() {
    const prefix = cfg().peerPrefix || 'whiskerwars-v1-';
    let lastErr;
    for (let attempt = 0; attempt < 4; attempt++) {
      const code = genCode();
      try {
        this.peer = await this._newPeer(prefix + code);
        this.code = code; this.isHost = true;
        this.peer.on('connection', conn => {
          // the same player reconnecting takes back their slot; otherwise the next free one (up to 3 guests)
          const pid = conn.metadata && conn.metadata.pid;
          let slot = 0;
          for (const [s, c] of this.conns) if (pid && c.metadata && c.metadata.pid === pid) { slot = s; this.conns.delete(s); try { c.close(); } catch {} }
          if (!slot) for (let s = 1; s <= MAX_GUESTS && !slot; s++) if (!this.conns.has(s) || !this.conns.get(s).open) slot = s;
          if (!slot) { conn.on('open', () => { conn.send({ type: 'full' }); setTimeout(() => conn.close(), 300); }); return; }
          this.conns.set(slot, conn);
          conn.on('open', () => { this._wireGuest(conn, slot); this.emit('peer-join', slot); });
        });
        this.peer.on('disconnected', () => { try { this.peer && !this.peer.destroyed && this.peer.reconnect(); } catch {} });
        this.peer.on('error', e => console.warn('peer error', e && e.type));
        return code;
      } catch (e) {
        lastErr = e;
        try { this.peer && this.peer.destroy(); } catch {}
        if (!(e && e.type === 'unavailable-id')) break;
      }
    }
    throw lastErr || new Error('Could not create room');
  }
  async join(code, pid) {
    const prefix = cfg().peerPrefix || 'whiskerwars-v1-';
    this.peer = await this._newPeer(null);
    await new Promise((resolve, reject) => {
      const conn = this.peer.connect(prefix + code, { reliable: true, serialization: 'json', metadata: { pid } });
      const timer = setTimeout(() => reject(Object.assign(new Error('Room not found (or your friend\'s network blocked the connection)'), { code: 'notfound' })), 15000);
      this.peer.on('error', e => {
        clearTimeout(timer);
        if (e && e.type === 'peer-unavailable') reject(Object.assign(new Error('Room not found'), { code: 'notfound' }));
        else reject(e);
      });
      conn.on('open', () => {
        clearTimeout(timer);
        this._wire(conn);
        resolve();
      });
    });
    this.code = code; this.isHost = false;
  }
  send(d, to) {
    const out = c => { if (c && c.open) { try { c.send(d); } catch (e) { console.warn(e); } } };
    if (!this.isHost) return out(this.conn);
    if (to) out(this.conns.get(to)); else for (const c of this.conns.values()) out(c);
  }
  get connected() { return this.isHost ? [...this.conns.values()].some(c => c.open) : !!this.conn && this.conn.open; }
  close() {
    try { this.conn && this.conn.close(); } catch {}
    for (const c of this.conns.values()) { try { c.close(); } catch {} }
    try { this.peer && this.peer.destroy(); } catch {}
    this.conn = null; this.conns.clear(); this.peer = null;
  }
}

/** Create a room. Returns { transport, code }. */
export async function hostRoom() {
  const url = await detectServer();
  if (url) {
    const t = new WSTransport(url);
    try { const code = await t.host(); return { transport: t, code }; }
    catch (e) { console.warn('server host failed, falling back to P2P', e); t.close(); }
  }
  const t = new P2PTransport();
  const code = await t.host();
  return { transport: t, code };
}

/** Join a room by code. Tries the relay server first, then peer-to-peer. */
export async function joinRoom(code, pid) {
  code = cleanCode(code);
  if (code.length < 4) throw new Error('Room codes are 5 numbers');
  const url = await detectServer();
  let firstErr;
  if (url) {
    const t = new WSTransport(url);
    try { await t.join(code, pid); return t; }
    catch (e) { firstErr = e; t.close(); }
  }
  const t = new P2PTransport();
  try { await t.join(code, pid); return t; }
  catch (e) { t.close(); throw (firstErr && firstErr.code !== 'notfound') ? firstErr : e; }
}
