// In-memory test of the lobby/session protocol (no network): node tools/lobbytest.mjs
import { OnlineSession } from '../public/js/online.js';
class Fake { constructor() { this.h = {}; this.kind = 'test'; } on(e, f) { (this.h[e] ||= []).push(f); } emit(e, ...a) { (this.h[e] || []).forEach(f => f(...a)); }
  send(m) { const d = JSON.parse(JSON.stringify(m)); setTimeout(() => this.other.emit('message', d), 1); } close() {} }
const a = new Fake(), b = new Fake(); a.other = b; b.other = a;
const host = new OnlineSession(a, true, 'ABCDE');
setTimeout(() => a.emit('peer-join'), 0);
const guest = new OnlineSession(b, false, 'ABCDE');
const wait = ms => new Promise(r => setTimeout(r, ms));
const log = [];
host.on('guest-hello', p => log.push('host saw hello from ' + p.name));
guest.on('lobby', L => log.push(`guest lobby: map=${L.map} ready=${L.ready} p1=${L.players[1] && L.players[1].hero}`));
await wait(20);
guest.setPick({ hero: 'shadow' }); await wait(20);
host.setMap('candy'); await wait(20);
console.log('canStart before ready:', !!host.canStart());
guest.setReady(true); await wait(20);
console.log('canStart after ready:', !!host.canStart());
let started = null; guest.on('start', m => started = m);
host.markMatch(); host.send({ type: 'start', info: { x: 1 }, snap: { t: 0 } }); await wait(20);
console.log('guest got start:', !!started, 'host phase:', host.lobby.phase, 'ready reset:', host.lobby.ready);
let cmd = null; host.on('cmd', c => cmd = c); guest.send({ type: 'cmd', c: { k: 'send', from: [1], to: 2, pct: .5 } }); await wait(20);
console.log('host got cmd:', JSON.stringify(cmd));
let rr = 0; host.on('rematch-request', () => rr++); guest.on('rematch-request', () => rr++);
guest.toLobby(); await wait(20);
console.log('after guest rematch: host phase', host.lobby.phase, 'requests seen', rr);
host.toLobby(); await wait(20);
console.log('after host rematch: requests seen', rr);
guest.send({ type: 'ping', t: 0 }); await wait(10);
console.log(log.slice(-3).join('\n'));
host.close(); guest.close();
