const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

let ws = null;
let connected = false;

let state = {
  particles: [],
  bodies: [],
  cosmic_age: 0,
  paused: false,
  speed_mult: 1,
  unlocked: ['H','He','Li','Be','B'],
  discovered_molecules: [],
  milestones: {},
  supernova_flashes: [],
  star_count: 0,
  planet_count: 0,
  particle_count: 0,
  body_count: 0,
};

let currentTool = 'place';
let selectedElem = null;
let selectedBody = null;
let mousePos = null;
let isDragging = false;
let dragStart = null;
let camDragStart = null;
let velocityDrag = null;

const cam = { x: 0, y: 0, zoom: 1 };

let lastT = 0;
let fpsBuf = [];
let fc = 0;

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
window.addEventListener('resize', resize);
resize();

const ELEM_COLORS = {
  'H':'#88ccff','He':'#ffee88','Li':'#cc44ff','Be':'#aa22dd','B':'#88dd88',
  'C':'#aaaaaa','N':'#4488ff','O':'#ff5555','F':'#88dd44','Ne':'#ffaa44',
  'Na':'#ffcc22','Mg':'#44ffaa','Al':'#bbbbcc','Si':'#ffcc44','P':'#ff44aa',
  'S':'#ffff44','Cl':'#44ee44','Ar':'#88ddee','K':'#dd88ff','Ca':'#ff8844',
  'Sc':'#88aacc','Ti':'#88aacc','V':'#aacc88','Cr':'#aa4444','Mn':'#cc3344',
  'Fe':'#cc4422','Co':'#4466cc','Ni':'#aa6633','Cu':'#dd7722','Zn':'#88bb99',
  'Ga':'#cc99aa','Ge':'#8899aa','As':'#aa88cc','Se':'#66aa44','Br':'#aa2244',
  'Kr':'#88dddd','Rb':'#cc6688','Sr':'#88cc66','Y':'#99bbcc','Zr':'#aaaa88',
  'Nb':'#ccaa88','Mo':'#889988','Tc':'#448888','Ru':'#8899aa','Rh':'#cccc99',
  'Pd':'#99bbaa','Ag':'#dddddd','Cd':'#aa9988','In':'#bb88cc','Sn':'#aaaaaa',
  'Sb':'#aaaa88','Te':'#88aa66','I':'#8844aa','Xe':'#88ffcc','Cs':'#aa8844',
  'Ba':'#ee8833','La':'#aabb88','Ce':'#bbaa88','Pr':'#88bb88','Nd':'#aa88aa',
  'Pm':'#886688','Sm':'#99aa88','Eu':'#aa88cc','Gd':'#99aaaa','Tb':'#88aa99',
  'Dy':'#88bbaa','Ho':'#aa88aa','Er':'#99bb88','Tm':'#88aacc','Yb':'#99aaaa',
  'Lu':'#88aa99','Hf':'#8899aa','Ta':'#99aabb','W':'#99bbcc','Re':'#aabb88',
  'Os':'#9999aa','Ir':'#aabbdd','Pt':'#cccccc','Au':'#ffd700','Hg':'#aa88aa',
  'Tl':'#aabb88','Pb':'#888899','Bi':'#aa99aa','Po':'#8866aa','At':'#664488',
  'Rn':'#88aacc','Fr':'#aa6688','Ra':'#88aa66','Ac':'#66aa88','Th':'#44aa44',
  'Pa':'#44aa88','U':'#22ff44','Np':'#44dd88','Pu':'#aa44aa','Am':'#88aa66',
  'Cm':'#669988','Bk':'#886688','Cf':'#6688aa','Es':'#886666','Fm':'#668888',
  'Md':'#886688','No':'#668866','Lr':'#886666','Rf':'#888866','Db':'#668888',
  'Sg':'#888866','Bh':'#886688','Hs':'#888866','Mt':'#666688','Ds':'#888888',
  'Rg':'#888688','Cn':'#888866','Nh':'#868888','Fl':'#888866','Mc':'#868888',
  'Lv':'#888888','Ts':'#888888','Og':'#888888',
};

function connectWS() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = location.host || 'localhost:8000';
  ws = new WebSocket(`${proto}//${host}/ws`);

  ws.onopen = () => {
    connected = true;
    updateConnectionStatus(true);
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      handleWSMessage(msg);
    } catch(err) {}
  };

  ws.onclose = () => {
    connected = false;
    updateConnectionStatus(false);
    setTimeout(connectWS, 2000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

function sendMsg(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function handleWSMessage(msg) {
  if (msg.type === 'state') {
    state.particles = msg.particles || [];
    state.bodies = msg.bodies || [];
    state.cosmic_age = msg.cosmic_age || 0;
    state.paused = msg.paused || false;
    state.speed_mult = msg.speed_mult || 1;
    state.unlocked = msg.unlocked || state.unlocked;
    state.discovered_molecules = msg.discovered_molecules || state.discovered_molecules;
    state.milestones = msg.milestones || state.milestones;
    state.supernova_flashes = msg.supernova_flashes || [];
    state.star_count = msg.star_count || 0;
    state.planet_count = msg.planet_count || 0;
    state.particle_count = msg.particle_count || 0;
    state.body_count = msg.body_count || 0;
    updateUI();
  } else if (msg.type === 'detail') {
    showDetailFromServer(msg.body);
  } else if (msg.type === 'biosphere_state') {
    showBiosphereFromServer(msg.body);
  } else if (msg.type === 'notification') {
    showNotif(msg.message, msg.color);
  }
}

function updateConnectionStatus(ok) {
  const el = document.getElementById('connection-status');
  if (ok) {
    el.textContent = '● Connected';
    el.style.background = 'rgba(0,255,136,.15)';
    el.style.color = '#00ff88';
    el.style.border = '1px solid rgba(0,255,136,.3)';
  } else {
    el.textContent = '○ Disconnected';
    el.style.background = 'rgba(255,60,60,.2)';
    el.style.color = '#ff4444';
    el.style.border = '1px solid rgba(255,60,60,.4)';
  }
}

function formatAge(y) {
  if (y < 1e3) return Math.round(y) + ' Yr';
  if (y < 1e6) return (y / 1e3).toFixed(1) + ' Kyr';
  if (y < 1e9) return (y / 1e6).toFixed(2) + ' Myr';
  return (y / 1e9).toFixed(3) + ' Gyr';
}

function bigBang(wx, wy) {
  sendMsg({ type: 'big_bang', x: wx, y: wy });
}

function spawnParticle(wx, wy, elem, vx, vy) {
  sendMsg({ type: 'spawn', x: wx, y: wy, elem: elem, vx: vx || 0, vy: vy || 0 });
}

function spawnNebula(wx, wy, elem, size, spin, count) {
  sendMsg({ type: 'spawn_nebula', x: wx, y: wy, elem: elem, size: size, spin: spin, count: count });
}

function setSpeed(mult) {
  sendMsg({ type: 'set_speed', mult: mult });
}

function togglePause() {
  sendMsg({ type: 'toggle_pause' });
}

function deleteAt(wx, wy) {
  sendMsg({ type: 'delete', x: wx, y: wy });
}

function requestDetail(id) {
  sendMsg({ type: 'request_detail', id: id });
}

function enterBiosphere(id) {
  sendMsg({ type: 'enter_biosphere', id: id });
}

// Input handlers
window.w2s = (wx, wy) => [(wx - cam.x) * cam.zoom + canvas.width / 2, (wy - cam.y) * cam.zoom + canvas.height / 2];
window.s2w = (sx, sy) => [(sx - canvas.width / 2) / cam.zoom + cam.x, (sy - canvas.height / 2) / cam.zoom + cam.y];

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', e => {
  if (e.target !== canvas) return;
  const [wx, wy] = s2w(e.clientX, e.clientY);

  if (e.button === 1 || e.button === 2 || currentTool === 'pan') {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    camDragStart = { x: cam.x, y: cam.y };
    canvas.classList.add('panning');
    return;
  }

  if (currentTool === 'delete') {
    deleteAt(wx, wy);
    return;
  }

  if (currentTool === 'nebula') {
    if (!selectedElem) return;
    const size = parseInt(document.getElementById('brush-size').value);
    const spin = parseFloat(document.getElementById('spin-amount').value) / 10;
    const count = parseInt(document.getElementById('nebula-count').value);
    spawnNebula(wx, wy, selectedElem, size / cam.zoom, spin, count);
    return;
  }

  if (currentTool === 'place') {
    let hit = null;
    for (const b of state.bodies) {
      if (!b) continue;
      const [sx, sy] = w2s(b.x, b.y);
      const sr = Math.max(8, (b.radius || 10) * cam.zoom);
      if (Math.hypot(sx - e.clientX, sy - e.clientY) < sr) {
        hit = b;
        break;
      }
    }
    if (hit) {
      requestDetail(hit.id);
      selectedBody = hit;
      showDetailFromState(hit);
      return;
    }
    if (!selectedElem) return;
    velocityDrag = { wx, wy, ex: e.clientX, ey: e.clientY, sx: e.clientX, sy: e.clientY };
  }
});

canvas.addEventListener('mousemove', e => {
  mousePos = { x: e.clientX, y: e.clientY };

  if (isDragging && dragStart) {
    cam.x = camDragStart.x - (e.clientX - dragStart.x) / cam.zoom;
    cam.y = camDragStart.y - (e.clientY - dragStart.y) / cam.zoom;
  }

  if (velocityDrag) {
    velocityDrag.ex = e.clientX;
    velocityDrag.ey = e.clientY;
  }
});

canvas.addEventListener('mouseup', e => {
  isDragging = false;
  dragStart = null;
  canvas.classList.remove('panning');

  if (velocityDrag && currentTool === 'place' && selectedElem) {
    const { wx, wy, sx, sy } = velocityDrag;
    const vx = (sx - e.clientX) * 0.03 / cam.zoom;
    const vy = (sy - e.clientY) * 0.03 / cam.zoom;
    spawnParticle(wx, wy, selectedElem, vx, vy);
    velocityDrag = null;
  }
});

canvas.addEventListener('wheel', e => {
  if (e.target !== canvas) return;
  e.preventDefault();
  const [wx, wy] = s2w(e.clientX, e.clientY);
  cam.zoom = Math.max(0.01, Math.min(100, cam.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
  const [nsx, nsy] = w2s(wx, wy);
  cam.x += (nsx - e.clientX) / cam.zoom;
  cam.y += (nsy - e.clientY) / cam.zoom;
}, { passive: false });

document.addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  if (e.code === 'Escape') { selectedBody = null; document.getElementById('detail-panel').style.display = 'none'; }
});

// Main loop
function loop(ts) {
  requestAnimationFrame(loop);

  const rawDt = Math.min(0.05, (ts - lastT) / 1000);
  lastT = ts;
  fpsBuf.push(1 / (rawDt || 0.016));
  if (fpsBuf.length > 30) fpsBuf.shift();

  fc++;
  if (fc % 10 === 0) {
    document.getElementById('hud-fps').textContent = Math.round(fpsBuf.reduce((a, b) => a + b) / fpsBuf.length);
  }

  render(ctx, canvas, state, cam, mousePos, currentTool, velocityDrag, selectedBody);
}

// Setup Big Bang screen
function setupBB() {
  const bg = document.getElementById('stars-bg');
  for (let i = 0; i < 200; i++) {
    const s = document.createElement('div');
    s.className = 'star-dot';
    s.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;width:${Math.random()*2.5}px;height:${Math.random()*2.5}px;animation-delay:${Math.random()*3}s;animation-duration:${2+Math.random()*3}s;`;
    bg.appendChild(s);
  }

  document.getElementById('bigbang-screen').addEventListener('click', e => {
    const sc = document.getElementById('bigbang-screen');
    sc.style.pointerEvents = 'none';
    sc.style.transition = 'opacity 0.9s';
    sc.style.opacity = '0';
    setTimeout(() => sc.style.display = 'none', 900);
    document.getElementById('ui-overlay').style.display = 'block';
    document.querySelector('.milestone').classList.add('done');

    const [wx, wy] = s2w(e.clientX, e.clientY);
    bigBang(wx, wy);
    showNotif('🌌 The Big Bang! BBN Elements unlocked!', '#ffd700');
  }, { once: true });
}

function showNotif(msg, col = '#ffd700') {
  const n = document.getElementById('notif');
  n.textContent = msg;
  n.style.color = col;
  n.style.borderColor = col;
  n.style.opacity = '1';
  clearTimeout(n._t);
  n._t = setTimeout(() => n.style.opacity = '0', 3200);
}

// Initialize
function init() {
  setupBB();
  connectWS();
  updateUI();
  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);
