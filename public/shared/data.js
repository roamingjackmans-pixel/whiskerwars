// Whisker Wars - shared game data (used by browser and Node server)

export const WORLD_W = 1600;
export const WORLD_H = 900;
export const TICK = 0.05;            // simulation step, seconds (20 Hz)
export const SNAP_EVERY = 2;         // send a network snapshot every N ticks (10 Hz)
export const BASE_SPEED = 72;        // world units per second
export const MAX_CATNIP = 100;
export const BASE_CATNIP_REGEN = 1.15; // per second
export const START_CATNIP = 25;
export const TIME_LIMIT = 600;       // seconds; then most cats wins
export const OVERCAP_DECAY = 1.0;    // cats per second lost when above capacity
export const SQUAD_CHUNK = 24;       // big sends split into waves of this size
export const PURR_PER_STAR = 20;     // purr points per star (5 stars max)
export const PURR_ATK_PER_STAR = 0.04;
export const PURR_SPD_PER_STAR = 0.03;

export const TEAM_COLORS = [
  { id: 0, name: 'Blue',  main: '#3d9bff', dark: '#1d5fb8', light: '#b5dcff', glow: 'rgba(61,155,255,0.55)' },
  { id: 1, name: 'Red',   main: '#ff5468', dark: '#b8243a', light: '#ffc0c8', glow: 'rgba(255,84,104,0.55)' },
  { id: 2, name: 'Green', main: '#3fd47a', dark: '#1f8a4c', light: '#bff5d4', glow: 'rgba(63,212,122,0.55)' },
  { id: 3, name: 'Gold',  main: '#ffc23d', dark: '#b8851d', light: '#ffe9b5', glow: 'rgba(255,194,61,0.55)' },
];
export const NEUTRAL_COLOR = { id: -1, name: 'Stray', main: '#cfc6ba', dark: '#8e857a', light: '#f2ede6', glow: 'rgba(220,210,200,0.4)' };
export function teamColor(owner) { return owner >= 0 ? TEAM_COLORS[owner] : NEUTRAL_COLOR; }

// ---------------- Buildings ----------------
// type ids are strings in data, ints on the wire (BTYPE index)
export const BTYPES = ['cottage', 'tower', 'forge', 'garden', 'cattree'];

export const BUILDINGS = {
  cottage: {
    name: 'Kitten Cottage', icon: '🏠', maxLevel: 5,
    desc: 'Makes new kittens. Upgrade it to make them faster and hold more.',
    cap: [20, 30, 40, 50, 60], prod: [0.55, 0.75, 0.95, 1.15, 1.35],
    upgradeCost: [10, 15, 20, 25], defense: 1.0, radius: [34, 36, 38, 40, 42],
  },
  tower: {
    name: 'Scratch Tower', icon: '🗼', maxLevel: 3,
    desc: 'Flings hairballs at enemy cats walking past. Each upgrade reaches much farther. Tough to capture.',
    cap: [20, 30, 40], prod: [0, 0, 0], range: [175, 255, 340], fireEvery: [1.25, 0.95, 0.7], dmg: 1,
    upgradeCost: [15, 25], defense: 1.5, radius: [36, 38, 40],
  },
  forge: {
    name: 'Yarn Forge', icon: '🧶', maxLevel: 3,
    desc: 'Spins battle yarn. Every forge you own makes ALL your cats hit harder.',
    cap: [20, 30, 40], prod: [0, 0, 0], atkBonus: [0.12, 0.2, 0.3],
    upgradeCost: [15, 25], defense: 1.0, radius: [37, 39, 41],
  },
  garden: {
    name: 'Catnip Garden', icon: '🌿', maxLevel: 3,
    desc: 'Grows catnip. Every garden you own speeds up your spell energy.',
    cap: [20, 30, 40], prod: [0, 0, 0], catnipBonus: [0.25, 0.4, 0.6],
    upgradeCost: [15, 25], defense: 1.0, radius: [36, 38, 40],
  },
  cattree: {
    name: 'Grand Cat Tree', icon: '🌳', maxLevel: 1,
    desc: 'A legendary landmark. Makes kittens fast, holds a huge army and defends itself.',
    cap: [90], prod: [1.3], range: [200], fireEvery: [1.1], dmg: 1,
    upgradeCost: [], defense: 1.3, radius: [56], noConvert: true,
  },
};
// Prof. Purrcival's Auto-Turret spell bolts on a fixed-size hairball turret
export const TURRET = { range: 195, fireEvery: 0.95 };
// cost (in cats) to convert a building into another type (resets to level 1)
export const CONVERT_COST = { cottage: 10, tower: 20, forge: 20, garden: 20 };

// ---------------- Clans & Heroes ----------------
export const CLANS = {
  royal:  { name: 'Royal Court',   color: '#ffcf4d', icon: '👑', desc: 'Nobles of the Velvet Cushion.' },
  alley:  { name: 'Alley Cats',    color: '#ff8a3d', icon: '🗑️', desc: 'Scrappy rogues of the back streets.' },
  mystic: { name: 'Moon Mystics',  color: '#b08cff', icon: '🌙', desc: 'Keepers of old cat magic.' },
  tech:   { name: 'Tech Whiskers', color: '#3de0ff', icon: '🔧', desc: 'Inventors with too many gadgets.' },
};

// Spell target kinds:
//  'own'     - one of your buildings
//  'enemy'   - an opponent building
//  'neutral' - a stray (neutral) building
//  'notown'  - enemy or neutral building
//  'area'    - a point on the map (uses radius)
//  'global'  - no target
// fx: visual effect key the renderer understands
export const HEROES = [
  {
    id: 'whiskers', name: 'Sir Whiskers', title: 'The Valiant', clan: 'royal', cost: 0, fur: 'ginger',
    blurb: 'A noble knight who never backs down from a scrap. Great for learning the ropes.',
    passive: { id: 'chivalry', name: 'Chivalry', desc: 'Your cats deal +10% damage when attacking buildings.' },
    spells: [
      { id: 'rally', name: 'Rally Cry', icon: '📯', cost: 30, cd: 20, target: 'global', dur: 6, fx: 'rally',
        desc: 'All your cats on the field run 60% faster for 6s.' },
      { id: 'shieldwall', name: 'Shield Wall', icon: '🛡️', cost: 35, cd: 18, target: 'own', dur: 8, fx: 'shield',
        desc: 'Your building takes 70% less damage for 8s.' },
      { id: 'decree', name: 'Royal Decree', icon: '📜', cost: 55, cd: 30, target: 'own', fx: 'upgrade',
        desc: 'Instantly upgrade one of your buildings for free.' },
    ],
  },
  {
    id: 'mittens', name: 'Mittens', title: 'Apprentice Archmage', clan: 'mystic', cost: 0, fur: 'white',
    blurb: 'Tiny paws, enormous spells. Mittens turns catnip into chaos.',
    passive: { id: 'arcane', name: 'Arcane Purr', desc: 'Your catnip refills 25% faster.' },
    spells: [
      { id: 'meteor', name: 'Yarnball Meteor', icon: '☄️', cost: 40, cd: 18, target: 'area', radius: 125, delay: 1.2, fx: 'meteor',
        desc: 'A flaming yarnball lands after 1.2s: knocks out up to 16 cats from each enemy squad in the area, and 10 from enemy buildings.' },
      { id: 'frost', name: 'Frost Hiss', icon: '❄️', cost: 35, cd: 20, target: 'area', radius: 140, dur: 4, fx: 'frost',
        desc: 'Freezes enemy cats in the area for 4s and stops enemy kitten-making there for 6s.' },
      { id: 'polymorph', name: 'Purrlymorph', icon: '🪄', cost: 55, cd: 35, target: 'notown', fx: 'polymorph',
        desc: 'Turns an enemy or stray tower, forge or garden into a plain level 1 cottage.' },
    ],
  },
  {
    id: 'shadow', name: 'Shadow', title: 'Ninja of the Night Roofs', clan: 'alley', cost: 750, fur: 'black',
    blurb: 'You never see Shadow coming. Neither do the towers.',
    passive: { id: 'lightpaws', name: 'Light Paws', desc: 'Your cats move 20% faster.' },
    spells: [
      { id: 'smoke', name: 'Smoke Bomb', icon: '💨', cost: 30, cd: 18, target: 'area', radius: 150, dur: 6, fx: 'smoke',
        desc: 'Your cats in the area turn invisible for 6s: towers ignore them and they slip past enemy squads.' },
      { id: 'shuriken', name: 'Shuriken Storm', icon: '✴️', cost: 35, cd: 18, target: 'enemy', fx: 'shuriken',
        desc: 'Knocks out 35% of an enemy building\'s cats (up to 22).' },
      { id: 'shadowstep', name: 'Shadow Step', icon: '🌀', cost: 45, cd: 25, target: 'own', dur: 10, fx: 'portal',
        desc: 'The next squad sent from this building (within 10s) teleports straight to its target.' },
    ],
  },
  {
    id: 'chef', name: 'Chef Pawtisserie', title: 'Master of the Fish Kitchen', clan: 'royal', cost: 3000, fur: 'cream',
    blurb: 'An army marches on its stomach. Chef keeps every belly full.',
    passive: { id: 'wellfed', name: 'Well Fed', desc: 'Your buildings hold 20% more cats.' },
    spells: [
      { id: 'feast', name: 'Fish Feast', icon: '🐟', cost: 30, cd: 15, target: 'own', fx: 'feast',
        desc: 'Serves dinner: +12 cats in your building.' },
      { id: 'pepper', name: 'Hot Pepper', icon: '🌶️', cost: 35, cd: 18, target: 'area', radius: 140, dur: 6, fx: 'pepper',
        desc: 'Your cats in the area run twice as fast and hit 30% harder for 6s.' },
      { id: 'sardines', name: 'Stinky Sardines', icon: '🥫', cost: 45, cd: 25, target: 'enemy', dur: 8, fx: 'stink',
        desc: 'Enemy cats in this building refuse to leave for 8s and its defense drops 30%.' },
    ],
  },
  {
    id: 'chonk', name: 'Sgt. Chonk', title: 'The Unmovable', clan: 'alley', cost: 5000, fur: 'orange',
    blurb: 'Twenty-two pounds of pure determination.',
    passive: { id: 'bigboned', name: 'Big Boned', desc: 'Your buildings take 15% less damage.' },
    spells: [
      { id: 'bellyflop', name: 'Belly Flop', icon: '💥', cost: 40, cd: 18, target: 'area', radius: 120, dur: 2, fx: 'flop',
        desc: 'Chonk lands with a boom: knocks out 8 enemy cats in the area and stuns the rest for 2s.' },
      { id: 'fortify', name: 'Fortify', icon: '🏰', cost: 35, cd: 22, target: 'own', dur: 20, fx: 'fortify',
        desc: 'Your building holds 50% more cats and defends 50% better for 20s.' },
      { id: 'naptime', name: 'Nap Time', icon: '😴', cost: 60, cd: 40, target: 'global', dur: 3.5, fx: 'nap',
        desc: 'Every enemy cat on the field falls asleep for 3.5s.' },
    ],
  },
  {
    id: 'duchess', name: 'Duchess Fluffington', title: 'Heiress of the Velvet Cushion', clan: 'royal', cost: 7000, fur: 'persian',
    blurb: 'Why fight when you can simply... buy the kingdom?',
    passive: { id: 'pampered', name: 'Pampered', desc: 'Your cottages make kittens 8% faster.' },
    spells: [
      { id: 'teaparty', name: 'Tea Party', icon: '🫖', cost: 40, cd: 22, target: 'own', dur: 10, fx: 'tea',
        desc: 'Your building makes kittens 2x faster for 10s (towers, forges and gardens make 1 per second).' },
      { id: 'bribe', name: 'Bribe', icon: '💰', cost: 60, cd: 40, target: 'neutral', max: 20, fx: 'bribe',
        desc: 'A stray building with 20 or fewer cats joins you instantly, cats and all.' },
      { id: 'goldenlitter', name: 'Golden Litter', icon: '✨', cost: 50, cd: 45, target: 'global', fx: 'golden',
        desc: '+3 cats in every building you own.' },
    ],
  },
  {
    id: 'clawbeard', name: 'Captain Clawbeard', title: 'Terror of the Fish Docks', clan: 'alley', cost: 9500, fur: 'calico',
    blurb: 'Arrr. Every building is treasure if you claw hard enough.',
    passive: { id: 'plunder', name: 'Plunder', desc: 'Capturing a building gives you +8 catnip.' },
    spells: [
      { id: 'cannon', name: 'Cannonball', icon: '💣', cost: 40, cd: 18, target: 'enemy', dur: 5, fx: 'cannon',
        desc: 'Knocks out 15 cats in an enemy building and jams it for 5s (no kittens, no shooting).' },
      { id: 'grog', name: 'Grog Rush', icon: '🍺', cost: 35, cd: 25, target: 'global', dur: 8, fx: 'grog',
        desc: 'All your cats hit 50% harder for 8s.' },
      { id: 'mutiny', name: 'Mutiny', icon: '🏴‍☠️', cost: 60, cd: 40, target: 'area', radius: 110, fx: 'mutiny',
        desc: 'Enemy squads in the area switch sides and fight for you.' },
    ],
  },
  {
    id: 'neko', name: 'Neko-chan', title: 'The Lucky Charm', clan: 'mystic', cost: 11500, fur: 'maneki',
    blurb: 'One wave of her paw and fortune smiles on you.',
    passive: { id: 'fortune', name: 'Fortune', desc: 'Each capture has a 30% chance to grant +5 bonus cats.' },
    spells: [
      { id: 'luckycoin', name: 'Lucky Coin', icon: '🪙', cost: 25, cd: 15, target: 'global', fx: 'coin',
        desc: 'Flip a coin: +30 catnip, OR +3 cats everywhere, OR a free upgrade on a random building.' },
      { id: 'beckon', name: 'Beckoning Paw', icon: '🐾', cost: 40, cd: 22, target: 'notown', max: 15, fx: 'beckon',
        desc: '30% of a building\'s cats (up to 15) walk over to your side.' },
      { id: 'jackpot', name: 'Jackpot', icon: '🎰', cost: 65, cd: 40, target: 'own', max: 30, fx: 'jackpot',
        desc: 'Doubles the cats in your building (up to +30).' },
    ],
  },
  {
    id: 'astro', name: 'Astro', title: 'First Cat on the Moon', clan: 'tech', cost: 13500, fur: 'siamese',
    blurb: 'Astro has seen the stars. Now the stars fight for Astro.',
    passive: { id: 'starcharts', name: 'Star Charts', desc: 'Your towers reach 25% farther and fire 25% faster. Your cats move 8% faster.' },
    spells: [
      { id: 'zerog', name: 'Zero Gravity', icon: '🪐', cost: 30, cd: 16, target: 'area', radius: 150, dur: 6, fx: 'zerog',
        desc: 'Enemy cats in the area float helplessly, moving 70% slower for 6s, and 4 cats from each squad drift away.' },
      { id: 'tractor', name: 'Tractor Beam', icon: '🛸', cost: 45, cd: 22, target: 'area', radius: 120, fx: 'tractor',
        desc: 'A UFO turns enemy squads in the area around and sends them back home.' },
      { id: 'orbital', name: 'Orbital Strike', icon: '🛰️', cost: 60, cd: 38, target: 'enemy', delay: 2.5, fx: 'orbital',
        desc: 'After 2.5s a space laser knocks out 35 cats in an enemy building.' },
    ],
  },
  {
    id: 'purrcival', name: 'Prof. Purrcival', title: 'Inventor Extraordinaire', clan: 'tech', cost: 15500, fur: 'graytabby',
    blurb: 'His gadgets are 90% genius and 10% explosion.',
    passive: { id: 'engineering', name: 'Engineering', desc: 'Upgrades and conversions cost 25% fewer cats.' },
    spells: [
      { id: 'laser', name: 'Laser Pointer', icon: '🔴', cost: 30, cd: 16, target: 'area', radius: 130, dur: 4, fx: 'laser',
        desc: 'Enemy cats in the area drop everything to chase the red dot for 4s.' },
      { id: 'turret', name: 'Auto-Turret', icon: '🔫', cost: 40, cd: 22, target: 'own', dur: 15, fx: 'turret',
        desc: 'Bolts a hairball turret onto your building: it shoots like a tower for 15s.' },
      { id: 'vacuum', name: 'Robo-Vacuum', icon: '🤖', cost: 55, cd: 30, target: 'area', radius: 150, fx: 'vacuum',
        desc: 'Unleashes every cat\'s nightmare: removes 45% of each enemy squad in the area.' },
    ],
  },
  {
    id: 'luna', name: 'Luna', title: 'Witch of the Silver Moon', clan: 'mystic', cost: 18000, fur: 'void',
    blurb: 'Cats have nine lives. Luna knows where the other eight went.',
    passive: { id: 'ninelives', name: 'Nine Lives', desc: '12% of your cats knocked out in battle return to your nearest building.' },
    spells: [
      { id: 'moonbeam', name: 'Moonbeam', icon: '🌕', cost: 35, cd: 18, target: 'own', max: 18, fx: 'moon',
        desc: 'Moonlight fills your building: +35% cats (at least 5, up to 18).' },
      { id: 'curse', name: 'Black Cat Curse', icon: '🐈‍⬛', cost: 45, cd: 25, target: 'enemy', dur: 10, fx: 'curse',
        desc: 'An enemy building stops making kittens and loses 1.5 cats per second for 10s.' },
      { id: 'eclipse', name: 'Eclipse', icon: '🌑', cost: 70, cd: 45, target: 'global', dur: 7, fx: 'eclipse',
        desc: 'Darkness falls: enemy towers stop shooting and enemy kitten-making stops for 7s.' },
    ],
  },
  {
    id: 'glitch', name: 'Glitch', title: 'The Keyboard Cat', clan: 'tech', cost: 20000, fur: 'tuxedo',
    blurb: 'Sits on your keyboard. Sits on your network. Sits on your towers.',
    passive: { id: 'overclock', name: 'Overclock', desc: 'Your spell cooldowns are 25% shorter.' },
    spells: [
      { id: 'firewall', name: 'Firewall', icon: '🔥', cost: 30, cd: 18, target: 'own', dur: 10, fx: 'firewall',
        desc: 'Your building defends 60% better and ignores enemy spells for 10s.' },
      { id: 'hack', name: 'Tower Hack', icon: '💻', cost: 50, cd: 30, target: 'enemy', dur: 10, fx: 'hack',
        desc: 'An enemy tower (or Cat Tree) shoots at its OWN side\'s cats for 10s.' },
      { id: 'drain', name: 'Data Drain', icon: '📡', cost: 35, cd: 25, target: 'global', max: 35, fx: 'drain',
        desc: 'Steal up to 35 catnip from your opponent.' },
    ],
  },
];
export const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h]));
export function findSpell(id) {
  for (const h of HEROES) for (const s of h.spells) if (s.id === id) return s;
  return null;
}

// ---------------- Cosmetics ----------------
// pattern: solid | tabby | calico | tuxedo | points | spots | galaxy | gold | void
export const FURS = [
  { id: 'ginger',    name: 'Ginger Tabby',  cost: 0,    base: '#f39a3c', dark: '#c96b1c', belly: '#ffe3c2', pattern: 'tabby' },
  { id: 'gray',      name: 'Smoky Gray',    cost: 0,    base: '#9aa3ad', dark: '#6b737c', belly: '#e3e7eb', pattern: 'solid' },
  { id: 'white',     name: 'Snowball',      cost: 150,  base: '#fbfaf7', dark: '#d9d4cc', belly: '#ffffff', pattern: 'solid' },
  { id: 'black',     name: 'Midnight',      cost: 150,  base: '#2c2a33', dark: '#16151b', belly: '#45424f', pattern: 'solid' },
  { id: 'cream',     name: 'Vanilla Cream', cost: 150,  base: '#f4dfb8', dark: '#d6b98a', belly: '#fff6e6', pattern: 'solid' },
  { id: 'orange',    name: 'Chonky Orange', cost: 200,  base: '#ff8c2b', dark: '#d1621a', belly: '#ffd9a8', pattern: 'tabby' },
  { id: 'graytabby', name: 'Silver Tabby',  cost: 200,  base: '#b9bfc6', dark: '#5e646b', belly: '#eef0f2', pattern: 'tabby' },
  { id: 'tuxedo',    name: 'Tuxedo',        cost: 250,  base: '#25232b', dark: '#121117', belly: '#ffffff', pattern: 'tuxedo' },
  { id: 'calico',    name: 'Calico',        cost: 300,  base: '#fbf6ee', dark: '#e07b2c', belly: '#ffffff', pattern: 'calico', spot2: '#3a3434' },
  { id: 'siamese',   name: 'Siamese',       cost: 350,  base: '#f3e6d2', dark: '#5a3f33', belly: '#fff8ee', pattern: 'points' },
  { id: 'persian',   name: 'Fluffy Persian',cost: 350,  base: '#f7f2ff', dark: '#cfc3e6', belly: '#ffffff', pattern: 'solid', fluffy: true },
  { id: 'maneki',    name: 'Lucky Maneki',  cost: 450,  base: '#ffffff', dark: '#e8473f', belly: '#ffffff', pattern: 'spots', spot2: '#2d2a2a' },
  { id: 'void',      name: 'Void Witch',    cost: 600,  base: '#1d1630', dark: '#0d0a18', belly: '#3b2d63', pattern: 'void' },
  { id: 'galaxy',    name: 'Galaxy',        cost: 900,  base: '#3b2a7a', dark: '#1a1240', belly: '#7b6cff', pattern: 'galaxy' },
  { id: 'golden',    name: 'Solid Gold',    cost: 1500, base: '#ffd34d', dark: '#c8961b', belly: '#fff2b0', pattern: 'gold' },
];
export const FUR_BY_ID = Object.fromEntries(FURS.map(f => [f.id, f]));

export const HATS = [
  { id: 'none',      name: 'No Hat',          cost: 0 },
  { id: 'bow',       name: 'Ribbon Bow',      cost: 100 },
  { id: 'party',     name: 'Party Hat',       cost: 150 },
  { id: 'beanie',    name: 'Cozy Beanie',     cost: 150 },
  { id: 'flower',    name: 'Flower Crown',    cost: 200 },
  { id: 'wizard',    name: 'Wizard Hat',      cost: 250 },
  { id: 'pirate',    name: 'Pirate Hat',      cost: 300 },
  { id: 'cowboy',    name: 'Cowboy Hat',      cost: 300 },
  { id: 'viking',    name: 'Viking Helmet',   cost: 350 },
  { id: 'tophat',    name: 'Fancy Top Hat',   cost: 400 },
  { id: 'crown',     name: 'Royal Crown',     cost: 600 },
  { id: 'halo',      name: 'Angel Halo',      cost: 750 },
];
export const HAT_BY_ID = Object.fromEntries(HATS.map(h => [h.id, h]));

export const EMOTES = [
  { id: 'meow',  text: 'Meow!',      icon: '😺' },
  { id: 'gg',    text: 'Good game!', icon: '🤝' },
  { id: 'hiss',  text: 'Hissss!',    icon: '😾' },
  { id: 'lol',   text: 'LOL',        icon: '😹' },
  { id: 'love',  text: 'Purr~',      icon: '😻' },
  { id: 'wow',   text: 'Whoa!',      icon: '🙀' },
  { id: 'nap',   text: 'Zzz...',     icon: '😴' },
  { id: 'fish',  text: 'Fish pls',   icon: '🐟' },
];

// ---------------- Map themes ----------------
export const THEMES = {
  meadow:  { name: 'Sunny Meadow',    ground: '#8fd16a', ground2: '#7cc35a', accent: '#ffe27a', ambient: 'petals' },
  rooftop: { name: 'Sunset Rooftops', ground: '#c98f6b', ground2: '#b77c5a', accent: '#ffb36b', ambient: 'leaves' },
  snow:    { name: 'Snowy Peaks',     ground: '#eaf4ff', ground2: '#d6e7f7', accent: '#9fd0ff', ambient: 'snow' },
  night:   { name: 'Moonlit Garden',  ground: '#2f4a5e', ground2: '#28405a', accent: '#b9a6ff', ambient: 'fireflies' },
  beach:   { name: 'Fishmarket Docks',ground: '#f2d9a0', ground2: '#e6c886', accent: '#5fd0e6', ambient: 'bubbles' },
  candy:   { name: 'Candy Kingdom',   ground: '#ffc6e2', ground2: '#ffb3d8', accent: '#b8f0ff', ambient: 'sparkles' },
};

// ---------------- Maps ----------------
// Each map lists P0's half; mirror() adds the point-symmetric half for P1.
// owner: 0 = player 1, -1 = neutral. center:true means it sits on the center and is not mirrored.
function mirror(half) {
  const out = [];
  for (const b of half) {
    out.push({ ...b });
    if (!b.center) out.push({ ...b, x: WORLD_W - b.x, y: WORLD_H - b.y, owner: b.owner === 0 ? 1 : b.owner });
  }
  return out.map((b, i) => ({ id: i, x: b.x, y: b.y, type: b.type, level: b.level || 1, owner: b.owner ?? -1, count: b.count ?? 10 }));
}

// ---------------- Terrain ----------------
// Obstacles cats must walk around (see shared/nav.js for the shapes). Like buildings, a map lists P0's half and
// terrain() adds the point-symmetric copy for P1; center:true pieces are symmetric already and listed once.
//   water: ponds, rivers, the sea (rooftop maps draw it as an alley drop)   island / bridge: walkable land over water
//   mound / rock / gumdrop: raised lumps        hedge / wall: long barriers
function terrain(half) {
  const R = ([x, y]) => [WORLD_W - x, WORLD_H - y];
  const out = [];
  for (const o of half) {
    const { center, ...s } = o;
    out.push(s);
    if (center) continue;
    const m = { ...s };
    if (m.poly) m.poly = m.poly.map(R);
    if (m.pts) m.pts = m.pts.map(R);
    if (m.x != null) { m.x = WORLD_W - m.x; m.y = WORLD_H - m.y; }
    out.push(m);
  }
  return out;
}
// lumpy outline; sym = point-symmetric around its own centre (for pieces sitting on the map centre)
function blobPoly(x, y, rx, ry, rough, sym) {
  const rnd = mulberry32(((Math.round(x) * 73856093) ^ (Math.round(y) * 19349663)) >>> 0);
  const ph = [rnd() * 6.283, rnd() * 6.283, rnd() * 6.283], H = sym ? [2, 4, 6] : [2, 3, 5], n = 22, pts = [];
  for (let k = 0; k < n; k++) {
    const u = k / n * Math.PI * 2;
    const f = 1 + rough * (0.5 * Math.sin(H[0] * u + ph[0]) + 0.3 * Math.sin(H[1] * u + ph[1]) + 0.2 * Math.sin(H[2] * u + ph[2]));
    pts.push([Math.round((x + Math.cos(u) * rx * f) * 10) / 10, Math.round((y + Math.sin(u) * ry * f) * 10) / 10]);
  }
  return pts;
}
const pond = (x, y, rx, ry = rx, a = 0) => ({ t: 'water', x, y, rx, ry, a });
const sea = poly => ({ t: 'water', poly });
const river = (pts, w) => ({ t: 'water', pts, w });
const island = (x, y, rx, ry = rx) => ({ t: 'island', x, y, rx, ry });
const bridge = (x1, y1, x2, y2, w = 90) => ({ t: 'bridge', pts: [[x1, y1], [x2, y2]], w });
const mound = (x, y, rx, ry = rx * 0.8, rough = 0.16, sym = false) => ({ t: 'mound', poly: blobPoly(x, y, rx, ry, rough, sym) });
const rock = (x, y, r) => ({ t: 'rock', poly: blobPoly(x, y, r, r * 0.85, 0.22, false) });
const gumdrop = (x, y, rx, ry = rx * 0.8) => ({ t: 'gumdrop', poly: blobPoly(x, y, rx, ry, 0.08, false) });
const ridge = (pts, w = 56) => ({ t: 'mound', pts, w });
const hedge = (pts, w = 42) => ({ t: 'hedge', pts, w });
const wall = (pts, w = 44) => ({ t: 'wall', pts, w });
const C = o => ({ ...o, center: true });

export const MAPS = [
  {
    id: 'meadow', name: 'Sunny Meadow', theme: 'meadow', size: 'Small', desc: 'A gentle first battlefield. Grab the strays and charge!',
    buildings: mirror([
      { x: 210, y: 450, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 390, y: 250, type: 'cottage', count: 8 },
      { x: 390, y: 655, type: 'cottage', count: 8 },
      { x: 575, y: 450, type: 'cottage', count: 14 },
      { x: 640, y: 215, type: 'tower', count: 14 },
      { x: 800, y: 450, type: 'cottage', level: 2, count: 24, center: true },
    ]),
  },
  {
    id: 'rooftops', name: 'Rooftop Rumble', theme: 'rooftop', size: 'Medium', desc: 'Leap across the chimneys. Hold the central tower!',
    buildings: mirror([
      { x: 180, y: 300, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 175, y: 650, type: 'cottage', count: 8 },
      { x: 390, y: 470, type: 'forge', count: 14 },
      { x: 520, y: 215, type: 'cottage', count: 12 },
      { x: 560, y: 705, type: 'tower', count: 16 },
      { x: 690, y: 330, type: 'cottage', count: 15 },
      { x: 800, y: 520, type: 'tower', level: 2, count: 28, center: true },
    ]),
  },
  {
    id: 'snowy', name: 'Snowy Paws', theme: 'snow', size: 'Medium', desc: 'The Grand Cat Tree stands in the snow. Whoever holds it rules the peak.',
    buildings: mirror([
      { x: 150, y: 450, type: 'cottage', level: 2, owner: 0, count: 22 },
      { x: 300, y: 205, type: 'cottage', count: 10 },
      { x: 300, y: 700, type: 'cottage', count: 10 },
      { x: 480, y: 345, type: 'forge', count: 14 },
      { x: 480, y: 565, type: 'garden', count: 14 },
      { x: 650, y: 180, type: 'tower', count: 16 },
      { x: 640, y: 725, type: 'cottage', count: 18 },
      { x: 800, y: 450, type: 'cattree', count: 45, center: true },
    ]),
  },
  {
    id: 'moonlit', name: 'Moonlit Garden', theme: 'night', size: 'Medium', desc: 'Catnip glows under the moon. Spells fly fast here.',
    buildings: mirror([
      { x: 200, y: 225, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 195, y: 680, type: 'cottage', count: 8 },
      { x: 410, y: 455, type: 'garden', count: 12 },
      { x: 560, y: 165, type: 'cottage', count: 12 },
      { x: 600, y: 740, type: 'garden', count: 16 },
      { x: 690, y: 450, type: 'tower', count: 20 },
    ]),
  },
  {
    id: 'docks', name: 'Fishmarket Docks', theme: 'beach', size: 'Large', desc: 'Salty air, big fish, bigger battles.',
    buildings: mirror([
      { x: 160, y: 760, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 160, y: 510, type: 'cottage', count: 10 },
      { x: 365, y: 640, type: 'cottage', count: 10 },
      { x: 330, y: 300, type: 'tower', count: 18 },
      { x: 570, y: 770, type: 'forge', count: 15 },
      { x: 600, y: 480, type: 'cottage', level: 2, count: 20 },
      { x: 545, y: 170, type: 'cottage', count: 12 },
      { x: 760, y: 300, type: 'garden', count: 18 },
    ]),
  },
  {
    id: 'candy', name: 'Candy Kingdom', theme: 'candy', size: 'Huge', desc: 'Sugar-rushed chaos with a Cat Tree in the middle. Expect mayhem.',
    buildings: mirror([
      { x: 150, y: 150, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 335, y: 145, type: 'cottage', count: 6 },
      { x: 150, y: 345, type: 'cottage', count: 6 },
      { x: 350, y: 360, type: 'forge', count: 12 },
      { x: 545, y: 200, type: 'cottage', count: 15 },
      { x: 200, y: 600, type: 'tower', count: 15 },
      { x: 480, y: 560, type: 'cottage', count: 14 },
      { x: 670, y: 370, type: 'garden', count: 16 },
      { x: 420, y: 765, type: 'cottage', count: 10 },
      { x: 660, y: 720, type: 'tower', count: 20 },
      { x: 800, y: 450, type: 'cattree', count: 50, center: true },
    ]),
  },
  // ---- terrain maps: the road between two buildings can be much longer than the straight line
  {
    id: 'ponds', name: 'Lily Pad Lanes', theme: 'meadow', size: 'Medium', desc: 'Two long ponds split the meadow into three lanes.',
    buildings: mirror([
      { x: 170, y: 450, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 330, y: 215, type: 'cottage', count: 8 },
      { x: 330, y: 685, type: 'cottage', count: 8 },
      { x: 480, y: 450, type: 'cottage', count: 12 },
      { x: 680, y: 130, type: 'cottage', count: 12 },
      { x: 560, y: 775, type: 'tower', count: 14 },
      { x: 800, y: 450, type: 'cottage', level: 2, count: 24, center: true },
    ]),
    obstacles: terrain([
      pond(800, 285, 255, 68),
      rock(215, 140, 34),
    ]),
  },
  {
    id: 'hedgerow', name: 'The Long Hedge', theme: 'meadow', size: 'Medium', desc: 'A hedge runs right across the middle. The only way over is all the way around.',
    buildings: mirror([
      { x: 520, y: 205, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 290, y: 250, type: 'cottage', count: 8 },
      { x: 770, y: 120, type: 'cottage', count: 10 },
      { x: 640, y: 345, type: 'cottage', count: 12 },
      { x: 1080, y: 240, type: 'tower', count: 14 },
      { x: 150, y: 450, type: 'cottage', count: 14 },
    ]),
    obstacles: terrain([
      C(hedge([[340, 450], [1260, 450]], 46)),
      rock(400, 110, 30),
    ]),
  },
  {
    id: 'molehills', name: 'Molehill Meadow', theme: 'meadow', size: 'Large', desc: 'The moles have been busy. Every road wiggles between dirt mounds.',
    buildings: mirror([
      { x: 160, y: 760, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 160, y: 500, type: 'cottage', count: 10 },
      { x: 380, y: 640, type: 'cottage', count: 10 },
      { x: 330, y: 290, type: 'tower', count: 18 },
      { x: 590, y: 790, type: 'forge', count: 15 },
      { x: 610, y: 480, type: 'cottage', level: 2, count: 20 },
      { x: 560, y: 160, type: 'cottage', count: 12 },
      { x: 780, y: 285, type: 'garden', count: 18 },
    ]),
    obstacles: terrain([
      mound(268, 700, 58, 40),
      mound(240, 395, 52, 58),
      mound(492, 562, 62, 46),
      mound(445, 222, 56, 44),
      mound(600, 640, 70, 42),
      mound(692, 385, 46, 40),
      C(mound(800, 450, 82, 70, 0.16, true)),
    ]),
  },
  {
    id: 'moat', name: 'Moonlit Moat', theme: 'night', size: 'Medium', desc: 'The Grand Cat Tree sits on an island. One bridge each, so guard yours!',
    buildings: mirror([
      { x: 170, y: 450, type: 'cottage', level: 2, owner: 0, count: 22 },
      { x: 330, y: 200, type: 'cottage', count: 10 },
      { x: 330, y: 700, type: 'cottage', count: 10 },
      { x: 480, y: 450, type: 'garden', count: 14 },
      { x: 610, y: 135, type: 'tower', count: 16 },
      { x: 570, y: 770, type: 'cottage', count: 16 },
      { x: 800, y: 450, type: 'cattree', count: 45, center: true },
    ]),
    obstacles: terrain([
      C(pond(800, 450, 215, 200)),
      C(island(800, 450, 125, 112)),
      bridge(560, 360, 720, 420, 92),
      hedge([[430, 250], [470, 330]], 40),
    ]),
  },
  {
    id: 'archipelago', name: 'Cattail Archipelago', theme: 'beach', size: 'Large', desc: 'Island hopping! Every bridge is a chokepoint.',
    buildings: mirror([
      { x: 200, y: 450, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 235, y: 235, type: 'cottage', count: 8 },
      { x: 235, y: 665, type: 'cottage', count: 8 },
      { x: 570, y: 215, type: 'cottage', count: 12 },
      { x: 570, y: 685, type: 'forge', count: 14 },
      { x: 800, y: 450, type: 'cottage', level: 2, count: 26, center: true },
    ]),
    obstacles: terrain([
      C(sea([[-60, -60], [1660, -60], [1660, 960], [-60, 960]])),
      island(220, 450, 205, 330),
      island(575, 215, 140, 115),
      island(575, 685, 140, 115),
      C(island(800, 450, 150, 128)),
      bridge(345, 300, 480, 245),
      bridge(345, 600, 480, 655),
      bridge(655, 265, 735, 360),
      bridge(660, 705, 940, 705, 86),
    ]),
  },
  {
    id: 'piers', name: 'Pier Pressure', theme: 'beach', size: 'Medium', desc: 'Two bays bite into the docks. Take the pier or walk round the long way.',
    buildings: mirror([
      { x: 180, y: 300, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 200, y: 650, type: 'cottage', count: 10 },
      { x: 420, y: 470, type: 'cottage', count: 12 },
      { x: 420, y: 170, type: 'cottage', count: 8 },
      { x: 600, y: 620, type: 'tower', count: 16 },
      { x: 900, y: 180, type: 'cottage', count: 14 },
      { x: 800, y: 450, type: 'garden', count: 18, center: true },
    ]),
    obstacles: terrain([
      sea([[555, -60], [785, -60], [770, 280], [740, 405], [665, 425], [595, 300]]),
      bridge(520, 135, 815, 135, 84),
      rock(330, 790, 36),
    ]),
  },
  {
    id: 'alleys', name: 'Alley Leap', theme: 'rooftop', size: 'Medium', desc: 'Two deep alleys and one plank across each. Zig-zag to victory.',
    buildings: mirror([
      { x: 210, y: 450, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 230, y: 190, type: 'cottage', count: 8 },
      { x: 230, y: 710, type: 'cottage', count: 8 },
      { x: 390, y: 450, type: 'forge', count: 14 },
      { x: 700, y: 170, type: 'cottage', count: 12 },
      { x: 690, y: 610, type: 'cottage', count: 14 },
      { x: 800, y: 450, type: 'tower', count: 20, center: true },
    ]),
    obstacles: terrain([
      river([[530, -60], [545, 300], [560, 600], [545, 960]], 78),
      bridge(470, 205, 625, 205, 100),
    ]),
  },
  {
    id: 'chimneys', name: 'Chimney Switchback', theme: 'rooftop', size: 'Medium', desc: 'Brick walls drop from the sky. The road snakes down, across and up again.',
    buildings: mirror([
      { x: 200, y: 250, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 200, y: 650, type: 'cottage', count: 10 },
      { x: 420, y: 460, type: 'cottage', count: 12 },
      { x: 430, y: 150, type: 'tower', count: 14 },
      { x: 470, y: 770, type: 'cottage', count: 12 },
      { x: 760, y: 240, type: 'cottage', count: 14 },
      { x: 800, y: 450, type: 'garden', count: 16, center: true },
    ]),
    obstacles: terrain([
      wall([[600, -40], [600, 590]], 46),
      rock(300, 450, 30),
    ]),
  },
  {
    id: 'fjord', name: 'Frozen Fjord', theme: 'snow', size: 'Large', desc: 'An icy river winds through the peaks. Only two bridges cross it.',
    buildings: mirror([
      { x: 200, y: 260, type: 'cottage', level: 2, owner: 0, count: 22 },
      { x: 190, y: 620, type: 'cottage', count: 10 },
      { x: 420, y: 430, type: 'cottage', count: 12 },
      { x: 380, y: 130, type: 'cottage', count: 8 },
      { x: 470, y: 770, type: 'forge', count: 14 },
      { x: 640, y: 570, type: 'cottage', level: 2, count: 18 },
      { x: 760, y: 800, type: 'tower', count: 16 },
    ]),
    obstacles: terrain([
      C(river([[560, -60], [640, 180], [720, 330], [800, 450], [880, 570], [960, 720], [1040, 960]], 110)),
      bridge(573, 257, 747, 163, 92),
      mound(300, 440, 50, 38),
      rock(560, 300, 34),
    ]),
  },
  {
    id: 'ridge', name: 'Snowdrift Ridge', theme: 'snow', size: 'Medium', desc: 'A great snowy ridge zig-zags across the peak. Neighbours are close, roads are long.',
    buildings: mirror([
      { x: 190, y: 520, type: 'cottage', level: 2, owner: 0, count: 22 },
      { x: 210, y: 250, type: 'cottage', count: 8 },
      { x: 400, y: 730, type: 'cottage', count: 10 },
      { x: 520, y: 430, type: 'forge', count: 14 },
      { x: 680, y: 565, type: 'cottage', count: 14 },
      { x: 600, y: 105, type: 'tower', count: 16 },
      { x: 840, y: 170, type: 'cottage', count: 12 },
    ]),
    obstacles: terrain([
      C(ridge([[380, 185], [760, 300], [840, 600], [1220, 715]], 60)),
    ]),
  },
  {
    id: 'chocoriver', name: 'Chocolate River', theme: 'candy', size: 'Large', desc: 'A river of melted chocolate. Wafer bridges, gumdrop hills, sticky decisions.',
    buildings: mirror([
      { x: 200, y: 600, type: 'cottage', level: 2, owner: 0, count: 22 },
      { x: 420, y: 790, type: 'cottage', count: 10 },
      { x: 450, y: 470, type: 'cottage', count: 12 },
      { x: 160, y: 390, type: 'cottage', count: 8 },
      { x: 700, y: 700, type: 'forge', count: 14 },
      { x: 640, y: 525, type: 'cottage', level: 2, count: 18 },
      { x: 920, y: 795, type: 'tower', count: 16 },
    ]),
    obstacles: terrain([
      C(river([[-60, 265], [300, 200], [600, 300], [800, 450], [1000, 600], [1300, 700], [1660, 635]], 100)),
      C(bridge(857, 374, 743, 526, 92)),
      bridge(300, 115, 300, 290, 90),
      mound(320, 655, 46, 38),
      mound(575, 640, 40, 34),
    ]),
  },
  {
    id: 'gumdrops', name: 'Gumdrop Ring', theme: 'candy', size: 'Medium', desc: 'A ring of giant gumdrops guards the Cat Tree. Slip through the gaps!',
    buildings: mirror([
      { x: 170, y: 450, type: 'cottage', level: 2, owner: 0, count: 22 },
      { x: 330, y: 210, type: 'cottage', count: 10 },
      { x: 330, y: 690, type: 'cottage', count: 10 },
      { x: 500, y: 450, type: 'cottage', count: 14 },
      { x: 600, y: 140, type: 'garden', count: 14 },
      { x: 590, y: 770, type: 'tower', count: 16 },
      { x: 800, y: 450, type: 'cattree', count: 48, center: true },
    ]),
    obstacles: terrain([
      gumdrop(982, 540, 58, 48),
      gumdrop(800, 630, 62, 46),
      gumdrop(618, 540, 58, 48),
      rock(200, 820, 30),
    ]),
  },
  {
    id: 'maze', name: 'Moonlit Maze', theme: 'night', size: 'Medium', desc: 'Hedges twist through the moonlit garden. Find the way in before they do.',
    buildings: mirror([
      { x: 180, y: 250, type: 'cottage', level: 2, owner: 0, count: 20 },
      { x: 180, y: 690, type: 'cottage', count: 10 },
      { x: 470, y: 230, type: 'cottage', count: 10 },
      { x: 420, y: 465, type: 'forge', count: 14 },
      { x: 680, y: 150, type: 'cottage', count: 12 },
      { x: 640, y: 690, type: 'cottage', count: 14 },
      { x: 800, y: 285, type: 'cottage', level: 2, count: 18 },
    ]),
    obstacles: terrain([
      hedge([[370, 115], [370, 365], [570, 365]]),
      hedge([[290, 565], [525, 565], [525, 780]]),
      C(hedge([[700, 330], [700, 450], [900, 450], [900, 570]])),
    ]),
  },
];
// map pickers list each theme's classic open map first, then its terrain maps
{ const order = Object.keys(THEMES); MAPS.sort((a, b) => order.indexOf(a.theme) - order.indexOf(b.theme)); }
export const MAP_BY_ID = Object.fromEntries(MAPS.map(m => [m.id, m]));

// Seeded random symmetric map
export function randomMap(seed) {
  const rnd = mulberry32(seed >>> 0);
  const themes = Object.keys(THEMES);
  const theme = themes[Math.floor(rnd() * themes.length)];
  const half = [{ x: 150 + rnd() * 80, y: 200 + rnd() * 500, type: 'cottage', level: 2, owner: 0, count: 20 }];
  const n = 5 + Math.floor(rnd() * 4);
  const types = ['cottage', 'cottage', 'cottage', 'cottage', 'tower', 'forge', 'garden'];
  let tries = 0;
  while (half.length < n + 1 && tries++ < 600) {
    const x = 120 + rnd() * 600, y = 130 + rnd() * 640;
    const ok = half.every(b => Math.hypot(b.x - x, b.y - y) > 150 && Math.hypot((WORLD_W - b.x) - x, (WORLD_H - b.y) - y) > 150)
      && Math.hypot(WORLD_W - x - x, WORLD_H - y - y) > 160;
    if (!ok) continue;
    const t = types[Math.floor(rnd() * types.length)];
    half.push({ x, y, type: t, count: 6 + Math.floor(rnd() * 14) });
  }
  if (rnd() < 0.5) half.push({ x: 800, y: 450, type: rnd() < 0.5 ? 'cattree' : 'cottage', level: 2, count: 30 + Math.floor(rnd() * 15), center: true });
  return { id: 'random', name: 'Wild Lands #' + (seed % 1000), theme, size: 'Random', desc: 'A freshly generated battlefield.', buildings: mirror(half), obstacles: randomTerrain(rnd, theme, half) };
}
// A few lumps and ponds dropped between the buildings. Every piece keeps a wide gap to the buildings, the edges and
// the other pieces, so no road is ever cut off.
function randomTerrain(rnd, theme, half) {
  if (rnd() < 0.3) return [];
  const kinds = theme === 'rooftop' ? ['rock', 'mound', 'mound'] : theme === 'beach' ? ['pond', 'mound', 'rock'] : ['mound', 'pond', 'rock', 'mound'];
  const blds = half.flatMap(b => [b, { x: WORLD_W - b.x, y: WORLD_H - b.y }]);
  const placed = [], out = [];
  const want = 2 + Math.floor(rnd() * 3);
  for (let tries = 0; placed.length < want && tries < 400; tries++) {
    const r = 42 + rnd() * 38, R = r * 1.25;
    const x = 110 + R + rnd() * (WORLD_W / 2 - 110 - R), y = 110 + R + rnd() * (WORLD_H - 220 - 2 * R);
    if (blds.some(b => Math.hypot(b.x - x, b.y - y) < R + 100)) continue;
    if (Math.hypot(WORLD_W - 2 * x, WORLD_H - 2 * y) < 2 * R + 120) continue; // too close to its own mirror image
    if (placed.some(o => Math.hypot(o.x - x, o.y - y) < o.R + R + 120 || Math.hypot(WORLD_W - o.x - x, WORLD_H - o.y - y) < o.R + R + 120)) continue;
    placed.push({ x, y, R });
    const k = kinds[Math.floor(rnd() * kinds.length)], X = Math.round(x), Y = Math.round(y);
    out.push(k === 'pond' ? pond(X, Y, Math.round(r * 1.15), Math.round(r * 0.75), Math.round(rnd() * 10) / 10 - 0.5) : k === 'rock' ? rock(X, Y, Math.round(r * 0.75)) : mound(X, Y, Math.round(r), Math.round(r * 0.8)));
  }
  return terrain(out);
}

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------- AI difficulty ----------------
export const AI_LEVELS = {
  easy:   { name: 'Kitten',    think: 3.4, aggression: 0.3,  spellUse: 0.2,  upgrade: 0.25, mistakes: 0.4,  coinsWin: 40,  coinsLoss: 15, bonusProd: -0.25 },
  normal: { name: 'House Cat', think: 2.0, aggression: 0.6,  spellUse: 0.55, upgrade: 0.55, mistakes: 0.15, coinsWin: 70,  coinsLoss: 25, bonusProd: -0.08 },
  hard:   { name: 'Alley Boss', think: 1.0, aggression: 0.85, spellUse: 0.9, upgrade: 0.8,  mistakes: 0.04, coinsWin: 100, coinsLoss: 35, bonusProd: 0.05 },
  insane: { name: 'Lion King', think: 0.5, aggression: 1.0,  spellUse: 1.0,  upgrade: 0.95, mistakes: 0.0,  coinsWin: 140, coinsLoss: 45, bonusProd: 0.2 },
};

// ---------------- Campaign ----------------
export const CAMPAIGN = [
  { id: 1,  name: 'First Whiskers',    map: 'meadow',   ai: 'easy',   enemy: 'whiskers', reward: 100, tip: 'Drag from your cottage to a stray building to send cats.' },
  { id: 2,  name: 'Tower Trouble',     map: 'rooftops', ai: 'easy',   enemy: 'mittens',  reward: 100, tip: 'Towers shoot cats walking past. Send a big group at once!' },
  { id: 3,  name: 'Snowball Fight',    map: 'snowy',    ai: 'easy',   enemy: 'chef',     reward: 120, tip: 'Tap your cottage to upgrade it. Upgraded cottages make kittens faster.' },
  { id: 4,  name: 'Garden Party',      map: 'moonlit',  ai: 'normal', enemy: 'duchess',  reward: 130, tip: 'Gardens refill your catnip faster. Spells win battles!' },
  { id: 5,  name: 'Dockside Dash',     map: 'docks',    ai: 'normal', enemy: 'clawbeard',reward: 140, tip: 'Forges make all your cats hit harder.' },
  { id: 6,  name: 'Sugar Rush',        map: 'candy',    ai: 'normal', enemy: 'neko',     reward: 150, tip: 'The Grand Cat Tree is worth fighting for.' },
  { id: 7,  name: 'Ninja Night',       map: 'maze',     ai: 'hard',   enemy: 'shadow',   reward: 170, tip: 'Cats walk around hedges and ponds. Drag onto a building to see the road they will take.' },
  { id: 8,  name: 'Chonk Wall',        map: 'ridge',    ai: 'hard',   enemy: 'chonk',    reward: 180, tip: 'Purr Power stars boost your whole army. Keep capturing!' },
  { id: 9,  name: 'Space Race',        map: 'alleys',   ai: 'hard',   enemy: 'astro',    reward: 200, tip: 'Swipe across several of your buildings to send from all of them at once.' },
  { id: 10, name: 'Mad Science',       map: 'archipelago', ai: 'hard', enemy: 'purrcival',reward: 220, tip: 'Bridges are chokepoints. Spread out so one area spell cannot hit everything.' },
  { id: 11, name: 'Witching Hour',     map: 'chocoriver', ai: 'insane', enemy: 'luna',   reward: 250, tip: 'The enemy grows stronger. So do you. Convert buildings to change their job.' },
  { id: 12, name: 'The Keyboard King', map: 'hedgerow', ai: 'insane', enemy: 'glitch',   reward: 400, tip: 'The final boss. Show them who the real top cat is!' },
];

// ---------------- Achievements ----------------
export const ACHIEVEMENTS = [
  { id: 'firstwin',   name: 'First Paw',        desc: 'Win your first match.',                     reward: 100 },
  { id: 'online1',    name: 'Friendly Fire',    desc: 'Play an online match with a friend.',       reward: 100 },
  { id: 'online5',    name: 'Neighborhood Boss',desc: 'Win 5 online matches.',                     reward: 250 },
  { id: 'maxcottage', name: 'Dream House',      desc: 'Upgrade a cottage to level 5.',             reward: 100 },
  { id: 'capture50',  name: 'Conqueror',        desc: 'Capture 50 buildings (total).',             reward: 150 },
  { id: 'spells50',   name: 'Spell Slinger',    desc: 'Cast 50 spells (total).',                   reward: 150 },
  { id: 'heroes5',    name: 'Cat Collector',    desc: 'Unlock 5 heroes.',                          reward: 250 },
  { id: 'flawless',   name: 'Untouchable',      desc: 'Win without losing a single building.',     reward: 200 },
  { id: 'speedy',     name: 'Zoomies',          desc: 'Win a match in under 3 minutes.',           reward: 200 },
  { id: 'insane',     name: 'Lion Tamer',       desc: 'Beat the Lion King (Insane) AI.',           reward: 300 },
  { id: 'campaign',   name: 'Legend of the Litter', desc: 'Finish the whole campaign.',            reward: 500 },
  { id: 'fashion',    name: 'Cat Walk',         desc: 'Own 5 cosmetic items.',                     reward: 100 },
  { id: 'army200',    name: 'Crazy Cat Lady',   desc: 'Have 200 cats at once.',                    reward: 150 },
];

export const RULES = [
  { id: 'zoomies',  icon: '⚡', name: 'Zoomies',        desc: 'All cats run 50% faster.' },
  { id: 'frenzy',   icon: '🌿', name: 'Catnip Frenzy',  desc: 'Catnip refills twice as fast. Spells everywhere!' },
  { id: 'boom',     icon: '🍼', name: 'Kitten Boom',    desc: 'Buildings make kittens 50% faster.' },
  { id: 'bigstart', icon: '🏰', name: 'Big Start',      desc: 'Every building starts with double the cats.' },
];

export const COINS = { onlineWin: 150, onlineLoss: 60, firstWinOfDay: 100, dailyGift: 50 };
