// ── TOOL SETUP ──
document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const toolMap = { 'tool-place': 'place', 'tool-nebula': 'nebula', 'tool-delete': 'delete', 'tool-pan': 'pan' };
    const t = toolMap[btn.id] || 'place';
    currentTool = t;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('brush-controls').style.display = t === 'nebula' ? 'block' : 'none';
    canvas.style.cursor = t === 'pan' ? 'grab' : 'crosshair';
  });
});

// ── SPEED CONTROLS ──
document.querySelectorAll('.speed-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mult = parseInt(btn.dataset.speed);
    setSpeed(mult);
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

document.getElementById('pause-btn').addEventListener('click', () => {
  togglePause();
  const btn = document.getElementById('pause-btn');
  btn.textContent = state.paused ? '▶' : '⏸';
});

// ── BRUSH CONTROLS ──
document.getElementById('brush-size').addEventListener('input', function() {
  document.getElementById('brush-val').textContent = this.value;
});
document.getElementById('spin-amount').addEventListener('input', function() {
  document.getElementById('spin-val').textContent = (this.value / 10).toFixed(1);
});
document.getElementById('nebula-count').addEventListener('input', function() {
  document.getElementById('count-val').textContent = this.value;
});

// ── ELEMENT DATA ──
const ELEMENTS_DATA = [
  {z:1,sym:'H',name:'Hydrogen',cat:'BBN',color:'#88ccff'},{z:2,sym:'He',name:'Helium-4',cat:'BBN',color:'#ffee88'},
  {z:3,sym:'Li',name:'Lithium-7',cat:'BBN',color:'#cc44ff'},{z:4,sym:'Be',name:'Beryllium-9',cat:'BBN',color:'#aa22dd'},
  {z:5,sym:'B',name:'Boron-11',cat:'BBN',color:'#88dd88'},{z:6,sym:'C',name:'Carbon-12',cat:'STELLAR',color:'#aaaaaa'},
  {z:7,sym:'N',name:'Nitrogen-14',cat:'STELLAR',color:'#4488ff'},{z:8,sym:'O',name:'Oxygen-16',cat:'STELLAR',color:'#ff5555'},
  {z:9,sym:'F',name:'Fluorine-19',cat:'STELLAR',color:'#88dd44'},{z:10,sym:'Ne',name:'Neon-20',cat:'STELLAR',color:'#ffaa44'},
  {z:11,sym:'Na',name:'Sodium-23',cat:'STELLAR',color:'#ffcc22'},{z:12,sym:'Mg',name:'Magnesium-24',cat:'STELLAR',color:'#44ffaa'},
  {z:13,sym:'Al',name:'Aluminum-27',cat:'STELLAR',color:'#bbbbcc'},{z:14,sym:'Si',name:'Silicon-28',cat:'STELLAR',color:'#ffcc44'},
  {z:15,sym:'P',name:'Phosphorus-31',cat:'STELLAR',color:'#ff44aa'},{z:16,sym:'S',name:'Sulfur-32',cat:'STELLAR',color:'#ffff44'},
  {z:17,sym:'Cl',name:'Chlorine-35',cat:'STELLAR',color:'#44ee44'},{z:18,sym:'Ar',name:'Argon-40',cat:'STELLAR',color:'#88ddee'},
  {z:19,sym:'K',name:'Potassium-39',cat:'STELLAR',color:'#dd88ff'},{z:20,sym:'Ca',name:'Calcium-40',cat:'STELLAR',color:'#ff8844'},
  {z:21,sym:'Sc',name:'Scandium-45',cat:'STELLAR',color:'#88aacc'},{z:22,sym:'Ti',name:'Titanium-48',cat:'STELLAR',color:'#88aacc'},
  {z:23,sym:'V',name:'Vanadium-51',cat:'STELLAR',color:'#aacc88'},{z:24,sym:'Cr',name:'Chromium-52',cat:'STELLAR',color:'#aa4444'},
  {z:25,sym:'Mn',name:'Manganese-55',cat:'SUPERNOVA',color:'#cc3344'},{z:26,sym:'Fe',name:'Iron-56',cat:'SUPERNOVA',color:'#cc4422'},
  {z:27,sym:'Co',name:'Cobalt-59',cat:'SUPERNOVA',color:'#4466cc'},{z:28,sym:'Ni',name:'Nickel-58',cat:'SUPERNOVA',color:'#aa6633'},
  {z:29,sym:'Cu',name:'Copper-63',cat:'SUPERNOVA',color:'#dd7722'},{z:30,sym:'Zn',name:'Zinc-64',cat:'SUPERNOVA',color:'#88bb99'},
  {z:31,sym:'Ga',name:'Gallium-69',cat:'SUPERNOVA',color:'#cc99aa'},{z:32,sym:'Ge',name:'Germanium-74',cat:'SUPERNOVA',color:'#8899aa'},
  {z:33,sym:'As',name:'Arsenic-75',cat:'SUPERNOVA',color:'#aa88cc'},{z:34,sym:'Se',name:'Selenium-80',cat:'SUPERNOVA',color:'#66aa44'},
  {z:35,sym:'Br',name:'Bromine-79',cat:'SUPERNOVA',color:'#aa2244'},{z:36,sym:'Kr',name:'Krypton-84',cat:'SUPERNOVA',color:'#88dddd'},
  {z:37,sym:'Rb',name:'Rubidium-85',cat:'SUPERNOVA',color:'#cc6688'},{z:38,sym:'Sr',name:'Strontium-88',cat:'SUPERNOVA',color:'#88cc66'},
  {z:39,sym:'Y',name:'Yttrium-89',cat:'SUPERNOVA',color:'#99bbcc'},{z:40,sym:'Zr',name:'Zirconium-90',cat:'SUPERNOVA',color:'#aaaa88'},
  {z:41,sym:'Nb',name:'Niobium-93',cat:'SUPERNOVA',color:'#ccaa88'},{z:42,sym:'Mo',name:'Molybdenum-96',cat:'SUPERNOVA',color:'#889988'},
  {z:43,sym:'Tc',name:'Technetium-98',cat:'SUPERNOVA',color:'#448888'},{z:44,sym:'Ru',name:'Ruthenium-102',cat:'SUPERNOVA',color:'#8899aa'},
  {z:45,sym:'Rh',name:'Rhodium-103',cat:'SUPERNOVA',color:'#cccc99'},{z:46,sym:'Pd',name:'Palladium-106',cat:'SUPERNOVA',color:'#99bbaa'},
  {z:47,sym:'Ag',name:'Silver-107',cat:'SUPERNOVA',color:'#dddddd'},{z:48,sym:'Cd',name:'Cadmium-114',cat:'SUPERNOVA',color:'#aa9988'},
  {z:49,sym:'In',name:'Indium-115',cat:'SUPERNOVA',color:'#bb88cc'},{z:50,sym:'Sn',name:'Tin-120',cat:'SUPERNOVA',color:'#aaaaaa'},
  {z:51,sym:'Sb',name:'Antimony-121',cat:'SUPERNOVA',color:'#aaaa88'},{z:52,sym:'Te',name:'Tellurium-128',cat:'SUPERNOVA',color:'#88aa66'},
  {z:53,sym:'I',name:'Iodine-127',cat:'SUPERNOVA',color:'#8844aa'},{z:54,sym:'Xe',name:'Xenon-132',cat:'SUPERNOVA',color:'#88ffcc'},
  {z:55,sym:'Cs',name:'Cesium-133',cat:'SUPERNOVA',color:'#aa8844'},{z:56,sym:'Ba',name:'Barium-138',cat:'SUPERNOVA',color:'#ee8833'},
  {z:57,sym:'La',name:'Lanthanum-139',cat:'SUPERNOVA',color:'#aabb88'},{z:58,sym:'Ce',name:'Cerium-140',cat:'SUPERNOVA',color:'#bbaa88'},
  {z:59,sym:'Pr',name:'Praseodymium-141',cat:'SUPERNOVA',color:'#88bb88'},{z:60,sym:'Nd',name:'Neodymium-144',cat:'SUPERNOVA',color:'#aa88aa'},
  {z:61,sym:'Pm',name:'Promethium-145',cat:'SUPERNOVA',color:'#886688'},{z:62,sym:'Sm',name:'Samarium-152',cat:'SUPERNOVA',color:'#99aa88'},
  {z:63,sym:'Eu',name:'Europium-153',cat:'SUPERNOVA',color:'#aa88cc'},{z:64,sym:'Gd',name:'Gadolinium-158',cat:'SUPERNOVA',color:'#99aaaa'},
  {z:65,sym:'Tb',name:'Terbium-159',cat:'SUPERNOVA',color:'#88aa99'},{z:66,sym:'Dy',name:'Dysprosium-164',cat:'SUPERNOVA',color:'#88bbaa'},
  {z:67,sym:'Ho',name:'Holmium-165',cat:'SUPERNOVA',color:'#aa88aa'},{z:68,sym:'Er',name:'Erbium-166',cat:'SUPERNOVA',color:'#99bb88'},
  {z:69,sym:'Tm',name:'Thulium-169',cat:'SUPERNOVA',color:'#88aacc'},{z:70,sym:'Yb',name:'Ytterbium-174',cat:'SUPERNOVA',color:'#99aaaa'},
  {z:71,sym:'Lu',name:'Lutetium-175',cat:'SUPERNOVA',color:'#88aa99'},{z:72,sym:'Hf',name:'Hafnium-180',cat:'SUPERNOVA',color:'#8899aa'},
  {z:73,sym:'Ta',name:'Tantalum-181',cat:'SUPERNOVA',color:'#99aabb'},{z:74,sym:'W',name:'Tungsten-184',cat:'SUPERNOVA',color:'#99bbcc'},
  {z:75,sym:'Re',name:'Rhenium-187',cat:'SUPERNOVA',color:'#aabb88'},{z:76,sym:'Os',name:'Osmium-192',cat:'SUPERNOVA',color:'#9999aa'},
  {z:77,sym:'Ir',name:'Iridium-193',cat:'SUPERNOVA',color:'#aabbdd'},{z:78,sym:'Pt',name:'Platinum-195',cat:'SUPERNOVA',color:'#cccccc'},
  {z:79,sym:'Au',name:'Gold-197',cat:'SUPERNOVA',color:'#ffd700'},{z:80,sym:'Hg',name:'Mercury-202',cat:'SUPERNOVA',color:'#aa88aa'},
  {z:81,sym:'Tl',name:'Thallium-205',cat:'SUPERNOVA',color:'#aabb88'},{z:82,sym:'Pb',name:'Lead-208',cat:'SUPERNOVA',color:'#888899'},
  {z:83,sym:'Bi',name:'Bismuth-209',cat:'SUPERNOVA',color:'#aa99aa'},{z:84,sym:'Po',name:'Polonium-209',cat:'SUPERNOVA',color:'#8866aa'},
  {z:85,sym:'At',name:'Astatine-210',cat:'SUPERNOVA',color:'#664488'},{z:86,sym:'Rn',name:'Radon-222',cat:'SUPERNOVA',color:'#88aacc'},
  {z:87,sym:'Fr',name:'Francium-223',cat:'SUPERNOVA',color:'#aa6688'},{z:88,sym:'Ra',name:'Radium-226',cat:'SUPERNOVA',color:'#88aa66'},
  {z:89,sym:'Ac',name:'Actinium-227',cat:'SUPERNOVA',color:'#66aa88'},{z:90,sym:'Th',name:'Thorium-232',cat:'SUPERNOVA',color:'#44aa44'},
  {z:91,sym:'Pa',name:'Protactinium-231',cat:'SUPERNOVA',color:'#44aa88'},{z:92,sym:'U',name:'Uranium-238',cat:'SUPERNOVA',color:'#22ff44'},
  {z:93,sym:'Np',name:'Neptunium-237',cat:'SYNTH',color:'#44dd88'},{z:94,sym:'Pu',name:'Plutonium-244',cat:'SYNTH',color:'#aa44aa'},
  {z:95,sym:'Am',name:'Americium-243',cat:'SYNTH',color:'#88aa66'},{z:96,sym:'Cm',name:'Curium-247',cat:'SYNTH',color:'#669988'},
  {z:97,sym:'Bk',name:'Berkelium-247',cat:'SYNTH',color:'#886688'},{z:98,sym:'Cf',name:'Californium-251',cat:'SYNTH',color:'#6688aa'},
  {z:99,sym:'Es',name:'Einsteinium-252',cat:'SYNTH',color:'#886666'},{z:100,sym:'Fm',name:'Fermium-257',cat:'SYNTH',color:'#668888'},
  {z:101,sym:'Md',name:'Mendelevium-258',cat:'SYNTH',color:'#886688'},{z:102,sym:'No',name:'Nobelium-259',cat:'SYNTH',color:'#668866'},
  {z:103,sym:'Lr',name:'Lawrencium-262',cat:'SYNTH',color:'#886666'},{z:104,sym:'Rf',name:'Rutherfordium-267',cat:'SYNTH',color:'#888866'},
  {z:105,sym:'Db',name:'Dubnium-268',cat:'SYNTH',color:'#668888'},{z:106,sym:'Sg',name:'Seaborgium-269',cat:'SYNTH',color:'#888866'},
  {z:107,sym:'Bh',name:'Bohrium-270',cat:'SYNTH',color:'#886688'},{z:108,sym:'Hs',name:'Hassium-270',cat:'SYNTH',color:'#888866'},
  {z:109,sym:'Mt',name:'Meitnerium-278',cat:'SYNTH',color:'#666688'},{z:110,sym:'Ds',name:'Darmstadtium-281',cat:'SYNTH',color:'#888888'},
  {z:111,sym:'Rg',name:'Roentgenium-282',cat:'SYNTH',color:'#888688'},{z:112,sym:'Cn',name:'Copernicium-285',cat:'SYNTH',color:'#888866'},
  {z:113,sym:'Nh',name:'Nihonium-286',cat:'SYNTH',color:'#868888'},{z:114,sym:'Fl',name:'Flerovium-289',cat:'SYNTH',color:'#888866'},
  {z:115,sym:'Mc',name:'Moscovium-290',cat:'SYNTH',color:'#868888'},{z:116,sym:'Lv',name:'Livermorium-293',cat:'SYNTH',color:'#888888'},
  {z:117,sym:'Ts',name:'Tennessine-294',cat:'SYNTH',color:'#888888'},{z:118,sym:'Og',name:'Oganesson-294',cat:'SYNTH',color:'#888888'},
];
const ELEM_MAP = {};
ELEMENTS_DATA.forEach(e => ELEM_MAP[e.sym] = e);

let lastUnlocked = new Set();
let lastMolecules = new Set();
let lastMilestones = {};

function updateUI() {
  renderElementGrid();
  renderProgress();
  updateHUD();
  checkNewDiscoveries();
}

function renderElementGrid() {
  const grid = document.getElementById('element-grid');
  const unlocked = new Set(state.unlocked || []);
  const prevCount = grid.children.length;

  if (prevCount === 0 || !setsEqual(lastUnlocked, unlocked)) {
    grid.innerHTML = '';
    ELEMENTS_DATA.forEach(el => {
      const locked = !unlocked.has(el.sym);
      const sel = selectedElem === el.sym;
      const d = document.createElement('div');
      d.className = `elem-btn${locked ? ' locked' : ''}${sel ? ' selected' : ''}`;
      d.id = 'e_' + el.sym.replace(/[^a-zA-Z0-9]/g, '_');
      d.innerHTML = `<div class="elem-z">${el.z}</div><div class="elem-symbol" style="color:${el.color}">${el.sym}</div><div class="elem-name">${el.name.split('-')[0].slice(0,8)}</div>`;
      if (!locked) {
        d.addEventListener('click', () => {
          selectedElem = el.sym;
          currentTool = 'place';
          renderElementGrid();
        });
      }
      if (!locked && !lastUnlocked.has(el.sym)) {
        d.classList.add('new-unlock');
        setTimeout(() => d.classList.remove('new-unlock'), 3000);
      }
      grid.appendChild(d);
    });
    document.getElementById('elem-count').textContent = `(${unlocked.size}/118)`;
    lastUnlocked = new Set(unlocked);
  } else {
    // Just update selection states
    grid.querySelectorAll('.elem-btn').forEach(btn => {
      const sym = btn.querySelector('.elem-symbol')?.textContent;
      btn.classList.toggle('selected', sym === selectedElem);
    });
  }
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function renderProgress() {
  const div = document.getElementById('progress-list');
  const unlocked = state.unlocked || [];
  const phases = [
    { l: 'BBN', tot: 5, un: unlocked.filter(s => { const e = ELEM_MAP[s]; return e && e.cat === 'BBN'; }).length },
    { l: 'Stellar Fusion', tot: 19, un: unlocked.filter(s => { const e = ELEM_MAP[s]; return e && e.cat === 'STELLAR'; }).length },
    { l: 'Supernova', tot: 68, un: unlocked.filter(s => { const e = ELEM_MAP[s]; return e && e.cat === 'SUPERNOVA'; }).length },
    { l: 'Synthetic', tot: 26, un: unlocked.filter(s => { const e = ELEM_MAP[s]; return e && e.cat === 'SYNTH'; }).length },
  ];
  div.innerHTML = phases.map(p =>
    `<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:1px"><span>${p.l}</span><span style="color:var(--accent2)">${p.un}/${p.tot}</span></div><div class="progress-wrap"><div class="progress-fill" style="width:${(p.un/p.tot)*100}%"></div></div></div>`
  ).join('');
}

function updateHUD() {
  document.getElementById('hud-particles').textContent = state.particle_count || 0;
  document.getElementById('hud-bodies').textContent = state.body_count || 0;
  document.getElementById('hud-age').textContent = formatAge(state.cosmic_age || 0);
  document.getElementById('hud-stars').textContent = state.star_count || 0;
  document.getElementById('hud-planets').textContent = state.planet_count || 0;
  document.getElementById('pause-btn').textContent = state.paused ? '▶' : '⏸';
}

function checkNewDiscoveries() {
  const log = document.getElementById('unlock-log');
  const mols = new Set(state.discovered_molecules || []);
  if (!setsEqual(mols, lastMolecules)) {
    for (const m of mols) {
      if (!lastMolecules.has(m)) {
        const d = document.createElement('div');
        d.className = 'unlock-item';
        d.textContent = `🔬 ${m}`;
        log.prepend(d);
      }
    }
    lastMolecules = new Set(mols);
    if (log.children.length > 30) {
      while (log.children.length > 30) log.removeChild(log.lastChild);
    }
  }
}

// ── DETAIL PANEL ──
function showDetailFromState(b) {
  if (!b) return;
  selectedBody = b;
  const panel = document.getElementById('detail-panel');
  panel.style.display = 'block';
  document.getElementById('dp-title').textContent = b.name || 'Body';

  const tl = {
    'terrestrial_planet': '🪨 Terrestrial Planet', 'gas_giant': '🪐 Gas Giant',
    'ice_giant': '❄️ Ice Giant', 'dwarf_planet': '⬜ Dwarf Planet',
    'main_sequence_star': '⭐ Main Sequence Star', 'red_dwarf': '🔴 Red Dwarf',
    'blue_giant': '💙 Blue Giant', 'red_giant': '🔴 Red Giant',
    'brown_dwarf': '🟤 Brown Dwarf', 'white_dwarf': '⚪ White Dwarf',
    'neutron_star': '💫 Neutron Star', 'pulsar': '📡 Pulsar',
    'black_hole': '⚫ Black Hole', 'supermassive_bh': '🕳️ Supermassive BH',
    'asteroid': '🪨 Asteroid', 'major_moon': '🌕 Moon', 'minor_moon': '🌑 Minor Moon',
    'meteoroid': '💫 Meteoroid',
  };

  const comp = b.composition || {};
  const top = Object.entries(comp).sort((a, c) => c[1] - a[1]).slice(0, 5);
  const cHTML = top.length ? top.map(([el, f]) =>
    `<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><div style="width:${Math.round(f*100)}%;height:4px;background:${ELEM_COLORS[el]||'#888'};border-radius:2px;min-width:3px"></div><span style="font-size:9px;color:${ELEM_COLORS[el]||'#888'};min-width:24px">${el}</span><span style="font-size:8px;color:#8090a0">${(f*100).toFixed(1)}%</span></div>`
  ).join('') : '<div style="font-size:9px;color:#6080a0">Unknown</div>';

  const mols = b.molecules || [];
  const mHTML = mols.length ? mols.map(m =>
    `<span style="background:rgba(80,150,255,.15);border:1px solid rgba(80,150,255,.3);border-radius:3px;padding:1px 5px;font-size:8px;margin:1px;display:inline-block">${m}</span>`
  ).join('') : '<span style="color:#6080a0;font-size:9px">None</span>';

  document.getElementById('dp-content').innerHTML = `
    <div class="detail-row"><span class="detail-key">Type</span><span class="detail-val">${tl[b.type]||b.type||'Unknown'}</span></div>
    <div class="detail-row"><span class="detail-key">Mass</span><span class="detail-val">${(b.mass||0).toExponential(2)}</span></div>
    <div class="detail-row"><span class="detail-key">Temp</span><span class="detail-val">${b.temp||0}K</span></div>
    <div style="margin:5px 0 2px;font-size:8px;color:var(--text-dim);text-transform:uppercase">Composition</div>${cHTML}
    <div style="margin:5px 0 2px;font-size:8px;color:var(--text-dim);text-transform:uppercase">Molecules</div>${mHTML}
    ${b.is_planet ? `<div style="margin:5px 0 2px;font-size:8px;color:var(--text-dim);text-transform:uppercase">Habitability</div>
      <div style="font-family:Orbitron;font-size:20px;font-weight:900;color:${(b.habitability||0)>=75?'#00ff88':(b.habitability||0)>=50?'#ffd700':(b.habitability||0)>=25?'#ff8800':'#ff4444'};text-align:center">${Math.round(b.habitability||0)}<span style="font-size:10px">/100</span></div>
      ${b.life_detected ? '<div class="life-flag" style="margin-top:5px">🧬 Life Potential Detected!</div>' : ''}` : ''}
  `;

  const bb = document.getElementById('bio-enter-btn');
  if (bb) {
    bb.style.display = (b.is_planet && b.life_detected) ? 'block' : 'none';
    bb.onclick = () => enterBiosphere(b.id);
  }
}

function showDetailFromServer(body) {
  selectedBody = body;
  showDetailFromState(body);
}

// ── BIOSPHERE ──
const bioCanvas = document.getElementById('bio-canvas');
const bioCtx = bioCanvas ? bioCanvas.getContext('2d') : null;

document.getElementById('bio-back')?.addEventListener('click', exitBiosphere);

let bioPlanet = null;
let bioAnimId = null;
let bioTerrain = [];
let bioOrganisms = [];
let bioTheme = { sky: '#0a1a3a', land: '#2a3a2a', water: '#1a3a6a', plant: '#22aa44', org: '#00d4ff' };
let bioAge = 0;
let bioStage = -1;

function showBiosphereFromServer(data) {
  if (!data) return;
  bioPlanet = data;
  document.getElementById('biosphere-overlay').style.display = 'flex';
  document.getElementById('bio-title').textContent = 'Biosphere: ' + (data.name || 'Unknown');
  const wrap = document.getElementById('biosphere-overlay').querySelector('div:last-child > div:first-child');
  if (bioCanvas && wrap) {
    bioCanvas.width = wrap.clientWidth || 600;
    bioCanvas.height = wrap.clientHeight || 400;
  }
  bioStage = data.bio_stage || -1;
  bioAge = 0;
  bioTerrain = [];
  bioOrganisms = [];
  bioTheme = getBioTheme(data);
  makeTerrain();
  makeOrgs();
  updateBioPanel(data);
  if (bioAnimId) cancelAnimationFrame(bioAnimId);
  bioLoop();
}

function exitBiosphere() {
  document.getElementById('biosphere-overlay').style.display = 'none';
  if (bioAnimId) { cancelAnimationFrame(bioAnimId); bioAnimId = null; }
}

function getBioTheme(data) {
  if (!data) return { sky: '#0a1a3a', land: '#2a3a2a', water: '#1a3a6a', plant: '#22aa44', org: '#00d4ff' };
  const bio = data.biochemistry;
  if (!bio) return { sky: '#0a1a3a', land: '#2a3a2a', water: '#1a3a6a', plant: '#22aa44', org: '#00d4ff' };
  const themes = {
    'aqua-carbon': { sky: '#0a1a3a', land: '#2a3a2a', water: '#1a3a6a', plant: '#22aa44', org: bio.color || '#00d4ff' },
    'methano-carbon': { sky: '#1a0a00', land: '#3a2a11', water: '#664400', plant: '#884400', org: bio.color || '#ee8800' },
    'silicon-thermo': { sky: '#220800', land: '#551100', water: '#882200', plant: '#aa3300', org: bio.color || '#ff6622' },
    'ammonia-carbon': { sky: '#0a1a0a', land: '#1a2a1a', water: '#1a3a2a', plant: '#33aa66', org: bio.color || '#88eeaa' },
    'sulfuric-carbon': { sky: '#1a1a00', land: '#3a3a00', water: '#aaaa00', plant: '#888800', org: bio.color || '#ffff44' },
    'radiotrophic': { sky: '#000a00', land: '#001800', water: '#002200', plant: '#00aa22', org: bio.color || '#44ff44' },
  };
  return themes[bio.id] || { sky: '#0a0a2a', land: '#2a3a2a', water: '#1a2a5a', plant: '#22aa44', org: bio.color || '#00d4ff' };
}

function makeTerrain() {
  if (!bioCanvas) return;
  const w = bioCanvas.width || 600;
  bioTerrain = [];
  for (let i = 0; i <= 80; i++) {
    const x = (i / 80) * w;
    const y = (bioCanvas.height || 400) * 0.55 + Math.sin(i * 0.15) * 30 + Math.sin(i * 0.07) * 50 + Math.sin(i * 0.31) * 15;
    bioTerrain.push({ x, y });
  }
}

function getTY(x) {
  if (!bioTerrain.length || !bioCanvas) return (bioCanvas.height || 400) * 0.55;
  const w = bioCanvas.width || 600;
  const idx = Math.min(bioTerrain.length - 2, Math.floor((x / w) * (bioTerrain.length - 1)));
  const t = (x / w) * (bioTerrain.length - 1) - idx;
  return (bioTerrain[idx] || { y: (bioCanvas.height || 400) * 0.55 }).y * (1 - t) +
         (bioTerrain[Math.min(idx + 1, bioTerrain.length - 1)] || { y: (bioCanvas.height || 400) * 0.55 }).y * t;
}

function makeOrgs() {
  if (!bioCanvas) return;
  bioOrganisms = [];
  if (bioStage < 1) return;
  const w = bioCanvas.width || 600;
  const n = Math.min(40, bioStage * 6 + 4);
  for (let i = 0; i < n; i++) {
    bioOrganisms.push({
      x: Math.random() * w, y: 0, vx: (Math.random() - 0.5) * 0.25,
      size: 3 + Math.random() * bioStage * 2.5,
      color: Math.random() < 0.5 ? bioTheme.org : bioTheme.plant,
      type: Math.random() < 0.35 ? 'flora' : 'fauna',
      wig: Math.random() * Math.PI * 2, ws: 0.02 + Math.random() * 0.04,
      legs: bioStage >= 4 ? Math.floor(Math.random() * 4) + 2 : 0,
    });
  }
}

function bioLoop() {
  if (!bioCtx || !bioCanvas) return;
  bioAnimId = requestAnimationFrame(bioLoop);
  const w = bioCanvas.width;
  const h = bioCanvas.height;
  if (!w || !h) return;

  bioCtx.clearRect(0, 0, w, h);

  // Sky
  const sg = bioCtx.createLinearGradient(0, 0, 0, h * 0.55);
  sg.addColorStop(0, bioTheme.sky);
  sg.addColorStop(1, lighten(bioTheme.sky, 20));
  bioCtx.fillStyle = sg;
  bioCtx.fillRect(0, 0, w, h * 0.6);

  // Sun glow
  const sunC = bioPlanet?.biochemistry?.color || '#fffaaa';
  const sg2 = bioCtx.createRadialGradient(w * 0.82, h * 0.1, 0, w * 0.82, h * 0.1, 60);
  sg2.addColorStop(0, 'white');
  sg2.addColorStop(0.4, sunC);
  sg2.addColorStop(1, 'transparent');
  bioCtx.fillStyle = sg2;
  bioCtx.beginPath();
  bioCtx.arc(w * 0.82, h * 0.1, 60, 0, Math.PI * 2);
  bioCtx.fill();

  // Background hills
  bioCtx.fillStyle = darken(bioTheme.land, 25);
  bioCtx.beginPath();
  bioCtx.moveTo(0, h);
  for (let x = 0; x <= w; x += 25) bioCtx.lineTo(x, h * 0.45 + Math.sin(x * 0.013) * 55 + Math.sin(x * 0.007) * 35);
  bioCtx.lineTo(w, h);
  bioCtx.closePath();
  bioCtx.fill();

  // Main terrain
  bioCtx.fillStyle = bioTheme.land;
  bioCtx.beginPath();
  bioCtx.moveTo(0, h);
  if (bioTerrain.length) {
    bioCtx.moveTo(bioTerrain[0].x, h);
    bioTerrain.forEach(p => bioCtx.lineTo(p.x, p.y));
    bioCtx.lineTo(bioTerrain[bioTerrain.length - 1].x, h);
  }
  bioCtx.closePath();
  bioCtx.fill();

  // Water
  const wy = h * 0.58;
  bioCtx.fillStyle = bioTheme.water + 'aa';
  bioCtx.fillRect(0, wy, w, h - wy);
  bioCtx.strokeStyle = bioTheme.water;
  bioCtx.lineWidth = 1;
  bioCtx.globalAlpha = 0.35;
  for (let i = 0; i < 3; i++) {
    bioCtx.beginPath();
    for (let x = 0; x <= w; x += 10) {
      const y = wy + Math.sin((x + Date.now() / 300 + i * 50) * 0.05) * 5;
      x === 0 ? bioCtx.moveTo(x, y) : bioCtx.lineTo(x, y);
    }
    bioCtx.stroke();
  }
  bioCtx.globalAlpha = 1;

  // Flora
  if (bioStage >= 4) {
    for (let i = 0; i < 22; i++) {
      const fx = (i / 21) * w * 0.9 + w * 0.05;
      const fy = getTY(fx);
      drawFlora(fx, fy, 14 + Math.sin(i * 7) * 8 + bioStage * 2.5, bioTheme.plant);
    }
  } else if (bioStage >= 2) {
    bioCtx.globalAlpha = 0.28;
    bioCtx.fillStyle = bioTheme.plant;
    for (let i = 0; i < 60; i++) {
      const fx = Math.random() * w;
      bioCtx.beginPath();
      bioCtx.ellipse(fx, getTY(fx), 7, 2.5, 0, 0, Math.PI * 2);
      bioCtx.fill();
    }
    bioCtx.globalAlpha = 1;
  }

  // Organisms
  for (const org of bioOrganisms) {
    org.wig += org.ws;
    if (org.type === 'fauna') {
      org.x += org.vx + Math.sin(org.wig) * 0.15;
      if (org.x < 0) org.x = w;
      if (org.x > w) org.x = 0;
      org.y = getTY(org.x) - org.size;
    } else {
      org.y = getTY(org.x) - org.size;
    }
    drawOrg(org);
  }

  // Civilization
  if (bioStage >= 6) {
    bioCtx.fillStyle = 'rgba(255,200,100,0.5)';
    for (let i = 0; i < 8; i++) {
      const bx = 80 + i * (w - 160) / 7;
      const by = getTY(bx);
      const bh = 18 + i % 3 * 12;
      bioCtx.fillRect(bx - 7, by - bh, 14, bh);
    }
    bioCtx.fillStyle = 'rgba(255,220,100,0.35)';
    for (let i = 0; i < 25; i++) {
      const lx = Math.random() * w;
      bioCtx.beginPath();
      bioCtx.arc(lx, getTY(lx) - 2, 1.5, 0, Math.PI * 2);
      bioCtx.fill();
    }
  }

  // HUD
  bioCtx.fillStyle = 'rgba(0,0,20,0.55)';
  bioCtx.fillRect(0, 0, w, 26);
  bioCtx.fillStyle = 'rgba(0,220,255,0.85)';
  bioCtx.font = '11px Orbitron,monospace';
  const sn = ['Prebiotic', 'Replicators', 'Prokaryotic', 'Eukaryotic', 'Multicellular', 'Ecosystems', 'Sentient', 'Post-Bio'][Math.max(0, bioStage)] || 'Unknown';
  const bioName = bioPlanet?.name || '—';
  const bioChem = bioPlanet?.biochemistry?.name || '?';
  bioCtx.fillText(`🧬 ${bioName} | Stage: ${sn} | ${bioChem} | ${formatAge(bioAge)}`, 10, 17);
  bioAge += 50000;

  document.getElementById('bio-age-display').textContent = 'Age: ' + formatAge(bioAge);
}

function drawFlora(x, y, h, col) {
  if (!bioCtx) return;
  bioCtx.strokeStyle = darken(col, 35);
  bioCtx.lineWidth = 1.8;
  bioCtx.beginPath();
  bioCtx.moveTo(x, y);
  bioCtx.lineTo(x, y - h * 0.55);
  bioCtx.stroke();
  bioCtx.fillStyle = col;
  bioCtx.globalAlpha = 0.8;
  bioCtx.beginPath();
  bioCtx.arc(x, y - h * 0.8, h * 0.38, 0, Math.PI * 2);
  bioCtx.fill();
  bioCtx.globalAlpha = 1;
}

function drawOrg(org) {
  if (!bioCtx) return;
  bioCtx.fillStyle = org.color;
  const s = org.size;
  if (bioStage <= 2) {
    bioCtx.beginPath();
    bioCtx.ellipse(org.x, org.y, s, s * 0.55, org.wig, 0, Math.PI * 2);
    bioCtx.fill();
  } else if (bioStage <= 4) {
    for (let i = 0; i < 3; i++) {
      bioCtx.beginPath();
      bioCtx.arc(org.x + i * s * 0.75, org.y + Math.sin(org.wig + i) * s * 0.4, s * 0.65, 0, Math.PI * 2);
      bioCtx.fill();
    }
  } else {
    bioCtx.beginPath();
    bioCtx.ellipse(org.x, org.y, s * 1.5, s, 0, 0, Math.PI * 2);
    bioCtx.fill();
    bioCtx.beginPath();
    bioCtx.arc(org.x + s * 1.5, org.y, s * 0.7, 0, Math.PI * 2);
    bioCtx.fill();
    bioCtx.strokeStyle = org.color;
    bioCtx.lineWidth = 1;
    for (let i = 0; i < Math.min(org.legs, 4); i++) {
      const la = (i / (Math.max(org.legs - 1, 1)) - 0.5) * Math.PI * 0.8;
      bioCtx.beginPath();
      bioCtx.moveTo(org.x, org.y + s * 0.5);
      bioCtx.lineTo(org.x + Math.sin(la + org.wig * 2) * s * 2, org.y + s * 1.5);
      bioCtx.stroke();
    }
  }
}

function updateBioPanel(data) {
  if (!data) return;
  const chemDiv = document.getElementById('bio-chem-info');
  const bio = data.biochemistry;
  chemDiv.innerHTML = bio
    ? `<div style="color:${bio.color||'#00d4ff'};font-weight:600;margin-bottom:3px">${bio.name||'Unknown'}</div><div>Solvent: ${bio.solvent||'?'}</div><div>Backbone: ${bio.backbone||'?'}</div><div>Energy: ${bio.energy||'?'}</div><div style="color:#8090a0;margin-top:3px;font-size:10px">${bio.desc||''}</div>`
    : '<span style="color:#6080a0">No biochemistry detected.</span>';

  const hab = data.habitability || 0;
  const hc = hab >= 75 ? '#00ff88' : hab >= 50 ? '#ffd700' : hab >= 25 ? '#ff8800' : '#ff4444';
  document.getElementById('bio-hab-info').innerHTML =
    `<div style="font-family:Orbitron;font-size:26px;font-weight:900;color:${hc};text-align:center">${Math.round(hab)}<span style="font-size:12px">/100</span></div><div style="background:rgba(80,150,255,.1);border-radius:4px;height:5px;overflow:hidden"><div style="width:${hab}%;height:100%;background:${hc}"></div></div><div style="font-size:10px;color:#8090a0;text-align:center;margin-top:3px">${data.temp||0}K surface</div>${data.life_detected ? '<div class="life-flag" style="margin-top:7px">🧬 LIFE DETECTED</div>' : ''}`;

  const stage = data.bio_stage || -1;
  const evoStages = [
    {id:0,name:'Prebiotic Chemistry',icon:'⚗️',desc:'Monomers form'},
    {id:1,name:'First Replicators',icon:'🔗',desc:'Self-replicating molecules'},
    {id:2,name:'Prokaryotic Analogs',icon:'🦠',desc:'Single-cell life'},
    {id:3,name:'Eukaryotic Complexity',icon:'🔬',desc:'Compartmentalization'},
    {id:4,name:'Multicellularity',icon:'🌿',desc:'Flora and Fauna'},
    {id:5,name:'Complex Ecosystems',icon:'🌍',desc:'Food webs'},
    {id:6,name:'Sentience & Technology',icon:'🏙️',desc:'Civilization'},
    {id:7,name:'Post-Biological',icon:'🤖',desc:'Digital consciousness'},
  ];
  document.getElementById('evo-tree').innerHTML = evoStages.map(s =>
    `<div class="evo-stage${s.id < stage ? ' done' : s.id === stage ? ' active' : ''}"><div class="evo-dot"></div><div><div style="font-weight:600">${s.icon} ${s.name}</div><div style="color:#6080a0">${s.desc}</div></div></div>`
  ).join('');

  const events = data.bio_events || [];
  const evDiv = document.getElementById('bio-events');
  evDiv.innerHTML = events.map(e =>
    `<div style="font-size:9px;padding:2px 6px;margin-bottom:2px;border-radius:4px;background:rgba(0,200,100,.08);border:1px solid rgba(0,200,100,.2);color:#44ff88">${formatAge(e.age || 0)}: ${e.msg || ''}</div>`
  ).join('');

  const mols = data.molecules || [];
  document.getElementById('bio-atmo').innerHTML = mols.length
    ? mols.map(m => `<div style="padding:1px 0">${m}: ✓</div>`).join('')
    : '<span style="color:#6080a0">No atmosphere.</span>';
}

function lighten(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const c = v => Math.min(255, v + a).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

function darken(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const c = v => Math.max(0, v - a).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
