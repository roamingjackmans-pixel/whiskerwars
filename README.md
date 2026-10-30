# 🐱 Whisker Wars

Real-time cat-kingdom strategy for the browser. Drag to send your army of adorable cats, capture cottages,
cast silly spells and battle your friends online with a 5-number room code.

**Play:** https://josephjackman.com/whiskerwars/

## Play locally

```bash
npm install
npm start
```

Open http://localhost:8080. To test online play by yourself, open a second browser window
(or an incognito window), create a room in one and join it from the other.

## What's inside

| Feature | Details |
| --- | --- |
| Online 1v1 | Room codes + invite links (`?room=CODE`), lobby with hero/map/time pick, ready check, emotes, rematch, ping display, 20-second reconnect if someone's connection drops |
| Fun modifiers | Zoomies (fast cats), Catnip Frenzy, Kitten Boom, Big Start — toggle in the lobby or practice setup |
| 12 heroes | 4 clans, each hero has a passive + 3 spells (36 spells), unlocked with fish coins earned by playing |
| 5 building types | Kitten Cottage (5 levels), Scratch Tower, Yarn Forge, Catnip Garden, Grand Cat Tree. Upgrade or convert any time |
| Maps | 19 maps: 6 open fields and 13 with terrain (ponds, rivers, islands joined by bridges, hedges, walls, snow ridges, dirt mounds) that make cats walk the long way round. Random maps get lumps and ponds too. Every map is point-symmetric, and both sides' roads are identical |
| Core mechanics | Drag-to-send (the arrow shows the road your cats will take), swipe across buildings for multi-send, 25/50/75/100% send, field battles between squads, towers, Purr Power stars (momentum), catnip spell energy. A building taken from the other player drops one upgrade level |
| Solo | 12-level campaign with 3-star ratings, practice vs 4 AI difficulties, live AI battle on the menu background |
| Progression | Coins, XP & levels, daily gift, first-win bonus, 13 achievements, 15 furs + 12 hats (your whole army wears them), match history |
| Polish | Procedural art, synthesized music & SFX, spell VFX, screen shake, keyboard shortcuts |
| Phones | Own layout, on by default on phones: the field stands up in portrait (your base at the bottom), zooms onto the buildings, big tap zones, thumb dock (send %, 🐾 ALL, spells), compact upgrade bar, hold-to-read spells, vibration, full screen on Android, screen stays awake, back button opens the battle menu. Settings → Battle layout overrides it |

## How online play works

The person who creates the room is the **host**: their browser runs the game simulation and streams
it to the guest 10×/second. Moves travel through one of two connections, chosen automatically:

1. **Game server mode** (most reliable): when the site is served by `server/index.js`, players connect
   through its WebSocket relay at `/ws`.
2. **Peer-to-peer mode** (zero setup): when the files sit on a plain static host, browsers connect
   directly using WebRTC. Matchmaking uses the free public PeerJS service, with its TURN relay as fallback.

Joining tries the server first, then peer-to-peer, so both kinds of rooms work from the same page.

## Deploying

### Option A — any static website (easiest)
Upload the contents of `public/` to any web host (GitHub Pages, Netlify, Cloudflare Pages, your own site,
or a sub-folder of one). It runs in peer-to-peer mode. Done.

This repo already does this: `.github/workflows/pages.yml` publishes `public/` to GitHub Pages on every
push to `main`. The site appears under the account's custom domain at `/whiskerwars/` because the repo
is named `whiskerwars`.

### Option B — Node server (most reliable online play)
Deploy this whole folder to any Node host that supports WebSockets (Render, Railway, Fly.io, a VPS):

- Build command: `npm install`
- Start command: `npm start`
- Port: taken from the `PORT` environment variable (default 8080)

A `render.yaml` is included for one-click Render deploys.

### Option C — files on your website, server elsewhere
Put `public/` on your website and run the server on a Node host, then edit `public/config.js`:

```js
window.WW_CONFIG = { server: 'wss://your-server.onrender.com/ws', peerPrefix: 'whiskerwars-v1-' };
```

## Tools

```bash
node tools/simtest.mjs 40     # AI-vs-AI crash test on all maps
node tools/maptest.mjs        # every map: clear ground under buildings, every road walkable, fair to both sides
node tools/maptest.mjs ridge  # ...and draws the named map(s) as text
node tools/balance.mjs        # round-robin hero win rates (both sides Hard AI)
node tools/probe.mjs duchess  # one hero vs everyone (add a spell id or "passive" to disable it)
node tools/relaytest.mjs      # tests the WebSocket relay (server must be running)
node tools/rejointest.mjs     # tests reconnecting into a room (server must be running)
node tools/lobbytest.mjs      # tests the lobby/match message protocol in memory
```

Add `?p2p` to the page URL to force peer-to-peer mode even when the server is available.
`public/dev/art-test.html` and `public/dev/audio-test.html` are preview pages for the art and sound,
and `public/dev/maps.html` shows every map's real background (also stood up the way phones see it).

## Project layout

```
public/            the game (deploy this folder for static hosting)
  index.html, config.js, css/style.css
  shared/          data.js (heroes, spells, buildings, maps), game.js (simulation), ai.js, nav.js (terrain + roads)
  js/              main, ui (menus), match (game loop/input), render, hud, art, audio, net, online, profile
  vendor/          peerjs.min.js
server/index.js    static file server + WebSocket room relay
tools/             headless tests
```

Progress (coins, unlocks, stats) is saved in each player's browser (localStorage).
