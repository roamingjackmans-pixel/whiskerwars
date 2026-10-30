// A guest whose old socket is still "open" (stale) can rejoin with the same player id.
import WebSocket from 'ws';
const url = process.argv[2] || 'ws://localhost:8080/ws';
const open = () => new Promise((res, rej) => { const w = new WebSocket(url); w.on('open', () => res(w)); w.on('error', rej); });
const next = (w, pred) => new Promise(res => { const h = raw => { const m = JSON.parse(raw); if (pred(m)) { w.off('message', h); res(m); } }; w.on('message', h); });
const host = await open(), g1 = await open(), g2 = await open(), intruder = await open();
host.send(JSON.stringify({ t: 'host' }));
const { code } = await next(host, m => m.t === 'hosted');
g1.send(JSON.stringify({ t: 'join', code, pid: 'player-A' })); await next(g1, m => m.t === 'joined');
intruder.send(JSON.stringify({ t: 'join', code, pid: 'someone-else' }));
console.log('different player while room busy ->', (await next(intruder, m => m.t === 'error')).code);
g2.send(JSON.stringify({ t: 'join', code, pid: 'player-A' }));
console.log('same player rejoining ->', (await next(g2, m => m.t === 'joined')).t);
const got = next(g2, m => m.t === 'msg');
host.send(JSON.stringify({ t: 'msg', d: 'hello again' }));
console.log('new socket receives ->', (await got).d);
[host, g1, g2, intruder].forEach(w => w.close());
process.exit(0);
