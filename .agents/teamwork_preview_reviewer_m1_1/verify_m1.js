const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '../../universe_simulation.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('FAIL: Could not find <script> tag');
  process.exit(1);
}

const jsCode = scriptMatch[1];

function createMockElement(id = '') {
  return {
    id,
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    textContent: '',
    value: '50',
    children: [],
    appendChild: function(c) { this.children.push(c); },
    removeChild: function(c) {
      const idx = this.children.indexOf(c);
      if (idx >= 0) this.children.splice(idx, 1);
    },
    prepend: function(c) { this.children.unshift(c); },
    addEventListener: () => {},
    getContext: () => mockCtx,
    clientWidth: 800,
    clientHeight: 600,
  };
}

const mockCtx = {
  fillRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  clearRect: () => {},
  drawImage: () => {},
  fillText: () => {},
  ellipse: () => {},
  moveTo: () => {},
  lineTo: () => {},
  closePath: () => {},
  setLineDash: () => {},
  createRadialGradient: () => ({ addColorStop: () => {} }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
};

const domElements = {};
const getElem = (id) => {
  if (!domElements[id]) domElements[id] = createMockElement(id);
  return domElements[id];
};

const mockDocument = {
  getElementById: (id) => getElem(id),
  querySelectorAll: () => [createMockElement()],
  createElement: (tag) => createMockElement(),
  addEventListener: () => {},
};

const sandbox = {
  window: {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {},
    AudioContext: class {
      constructor() { this.state = 'running'; this.destination = {}; }
      resume() {}
      createOscillator() {
        return {
          type: '',
          frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
      }
      createGain() {
        return {
          gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          connect: () => {},
        };
      }
    },
    webkitAudioContext: class {},
  },
  document: mockDocument,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  Math: Math,
  Date: Date,
  Number: Number,
  Object: Object,
  Array: Array,
  Set: Set,
  Infinity: Infinity,
  isNaN: isNaN,
  isFinite: isFinite,
  parseFloat: parseFloat,
  parseInt: parseInt,
  innerWidth: 1920,
  innerHeight: 1080,
};

const wrappedCode = jsCode + `
  globalThis.Particle = Particle;
  globalThis.Body = Body;
  globalThis.QT = QT;
  globalThis.physicsStep = physicsStep;
  globalThis.collide = collide;
  globalThis.doMerge = doMerge;
  globalThis.particles = particles;
  globalThis.bodies = bodies;
  globalThis.speedMult = speedMult;
`;

vm.createContext(sandbox);
vm.runInContext(wrappedCode, sandbox);

const Particle = sandbox.Particle;
const Body = sandbox.Body;
const QT = sandbox.QT;
const physicsStep = sandbox.physicsStep;
const collide = sandbox.collide;
const doMerge = sandbox.doMerge;

let failed = false;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed = true;
  } else {
    console.log('PASS:', msg);
  }
}

console.log('=== REVIEWER VERIFICATION SUITE FOR MILESTONE 1 ===\n');

// 1. Syntax & Context test
assert(typeof Particle === 'function' && typeof Body === 'function' && typeof QT === 'function', 'Core classes exist');

// 2. Test QuadTree creation & pool recycling
console.log('\n--- 1. QUADTREE POOL & RECYCLING TEST ---');
const poolLenBefore = QT.pool.length;
const root = QT.create(-1000, -1000, 2000, 2000, 0);
for (let i = 0; i < 100; i++) {
  root.insert(new Particle((Math.random() - 0.5) * 500, (Math.random() - 0.5) * 500, 'H'));
}
assert(root.mass > 0, 'QuadTree root mass accumulated');
QT.recycle(root);
assert(QT.pool.length > poolLenBefore, `Nodes recycled into QT.pool (pool count: ${QT.pool.length})`);

// Test reusing from pool
const reusedNode = QT.create(0, 0, 100, 100, 0);
assert(reusedNode.mass === 0 && reusedNode.ch === null && reusedNode.p === null, 'Recycled node properly reset upon reuse');
QT.recycle(reusedNode);

// 3. Test queryRange Spatial Query
console.log('\n--- 2. QUADTREE queryRange TEST ---');
const qtRange = QT.create(-100, -100, 200, 200, 0);
const pIn = new Particle(10, 10, 'H');
const pOut = new Particle(80, 80, 'H');
qtRange.insert(pIn);
qtRange.insert(pOut);

let foundList = [];
qtRange.queryRange(0, 0, 25, (p) => foundList.push(p));
assert(foundList.includes(pIn) && !foundList.includes(pOut), 'queryRange correctly returns only particles within radius');

// 4. Test Collision Radius Asymmetry / Large Body Collision
console.log('\n--- 3. COLLISION QUERY ASYMMETRY & LARGE RADIUS TEST ---');

// Case A: Particle id < Large Body id
const pSmall1 = new Particle(0, 0, 'H'); // radius 3
const bLarge1 = new Body(35, 0, 2e12, { H: 1 }); // radius ~51 (supermassive BH)
pSmall1.id = 10;
bLarge1.id = 20;

const qtColl1 = QT.create(-200, -200, 400, 400, 0);
qtColl1.insert(pSmall1);
qtColl1.insert(bLarge1);

let mergedCount1 = 0;
const all1 = [pSmall1, bLarge1];
collide(all1, qtColl1);
assert(!pSmall1.active || !bLarge1.active, 'Collision detected when pSmall.id < bLarge.id');

// Case B: Particle id > Large Body id (the potential asymmetry flaw!)
const pSmall2 = new Particle(0, 0, 'H'); // radius 3
const bLarge2 = new Body(35, 0, 2e12, { H: 1 }); // radius ~51
pSmall2.id = 20;
bLarge2.id = 10;

const qtColl2 = QT.create(-200, -200, 400, 400, 0);
qtColl2.insert(pSmall2);
qtColl2.insert(bLarge2);

const all2 = [pSmall2, bLarge2];
collide(all2, qtColl2);
assert(!pSmall2.active || !bLarge2.active, 'Collision detected when pSmall.id > bLarge.id (Large body collision search radius check)');

// 5. Velocity Verlet & Velocity Clamping Test
console.log('\n--- 4. VELOCITY VERLET & MAX SPEED CLAMPING TEST ---');
sandbox.particles.length = 0;
sandbox.bodies.length = 0;

const fastP = new Particle(0, 0, 'H', 500, 500); // spd = ~707 > 250
sandbox.particles.push(fastP);
physicsStep(0.016, 16);

const speed = Math.hypot(fastP.vx, fastP.vy);
assert(speed <= 250.001, `Fast particle velocity clamped to MAX_SPEED (speed: ${speed.toFixed(2)})`);

// 6. Timestep Clamping Test
console.log('\n--- 5. TIMESTEP CLAMPING TEST ---');
sandbox.speedMult = 100000;
physicsStep(99999, 10000000); // huge dt passed
// verify no NaN/Inf
let nanFound = false;
for (const p of sandbox.particles) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) nanFound = true;
}
assert(!nanFound, 'Zero NaN/Inf under extreme speed multiplier (100kX)');

// 7. Sanitization Test
console.log('\n--- 6. ISFINITE SANITIZATION TEST ---');
const nanP = new Particle(NaN, undefined, 'H', Infinity, -Infinity);
sandbox.particles.push(nanP);
physicsStep(0.016, 16);
assert(Number.isFinite(nanP.x) && Number.isFinite(nanP.y) && Number.isFinite(nanP.vx) && Number.isFinite(nanP.vy), 'Corrupted particle sanitized to finite values');

console.log('\n==================================================');
if (failed) {
  console.log('RESULT: VERIFICATION FAILED');
  process.exit(1);
} else {
  console.log('RESULT: ALL VERIFICATION CHECKS PASSED');
}
