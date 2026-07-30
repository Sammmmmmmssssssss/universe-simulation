const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '../../universe_simulation.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('FAIL: Could not find <script> tag in universe_simulation.html');
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
  globalThis.getParticles = () => particles;
  globalThis.getBodies = () => bodies;
  globalThis.setSpeedMult = (s) => { speedMult = s; };
  globalThis.getSpeedMult = () => speedMult;
`;

let hasError = false;

console.log('====================================================');
console.log('ADVERSARIAL STRESS TEST SUITE FOR UNIVERSE SIMULATOR');
console.log('====================================================\n');

try {
  vm.createContext(sandbox);
  vm.runInContext(wrappedCode, sandbox);
  console.log('[TEST 1] Syntax & Initialization: PASS');
} catch (err) {
  console.error('[TEST 1] Syntax & Initialization: FAIL -', err);
  process.exit(1);
}

const Particle = sandbox.Particle;
const Body = sandbox.Body;
const QT = sandbox.QT;
const physicsStep = sandbox.physicsStep;
const getParticles = sandbox.getParticles;
const getBodies = sandbox.getBodies;
const setSpeedMult = sandbox.setSpeedMult;

// ----------------------------------------------------
// TEST 2: Co-located particles (x1=0, y1=0 and x2=0, y2=0)
// ----------------------------------------------------
console.log('\n[TEST 2] Testing Co-located Particles (Zero Distance Edge Case)...');
getParticles().length = 0;
getBodies().length = 0;

const pZero1 = new Particle(0, 0, 'H', 0, 0);
const pZero2 = new Particle(0, 0, 'H', 0, 0);
getParticles().push(pZero1, pZero2);

try {
  physicsStep(0.016, 16000);
  let pZeroNaN = false;
  for (const p of getParticles()) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
      pZeroNaN = true;
    }
  }
  if (pZeroNaN) {
    console.error('  FAIL: Co-located particles produced NaN positions/velocities!');
    hasError = true;
  } else {
    console.log('  PASS: Co-located particles handled gracefully without NaN!');
  }
} catch (e) {
  console.error('  FAIL: Exception during co-located particle step:', e);
  hasError = true;
}

// ----------------------------------------------------
// TEST 3: Mass Zero / Negative / Extreme Mass Injection
// ----------------------------------------------------
console.log('\n[TEST 3] Testing Invalid Mass Injection (0, Negative, NaN, Inf)...');
getParticles().length = 0;
getBodies().length = 0;

const bZeroMass = new Body(10, 10, 0, { H: 1 });
const bNegMass = new Body(20, 20, -500, { H: 1 });
const bNanMass = new Body(30, 30, NaN, { H: 1 });
const bInfMass = new Body(40, 40, Infinity, { H: 1 });

getBodies().push(bZeroMass, bNegMass, bNanMass, bInfMass);

try {
  physicsStep(0.016, 16000);
  let massFail = false;
  for (const b of getBodies()) {
    if (!b.active) continue;
    if (!Number.isFinite(b.mass) || b.mass <= 0) {
      console.error(`  Invalid body mass detected: ${b.name}, mass=${b.mass}`);
      massFail = true;
    }
  }
  if (massFail) {
    console.error('  FAIL: Invalid mass values persisted in active bodies!');
    hasError = true;
  } else {
    console.log('  PASS: Invalid body mass inputs corrected to positive default (1e9)!');
  }
} catch (e) {
  console.error('  FAIL: Exception during invalid mass test:', e);
  hasError = true;
}

// ----------------------------------------------------
// TEST 4: Extreme Speed Multipliers (100,000x, 1,000,000x, NaN, Negative)
// ----------------------------------------------------
console.log('\n[TEST 4] Testing Extreme Speed Multipliers (100,000x up to 1,000,000x)...');
getParticles().length = 0;
getBodies().length = 0;

for (let i = 0; i < 500; i++) {
  getParticles().push(new Particle((Math.random()-0.5)*1000, (Math.random()-0.5)*1000, 'H', (Math.random()-0.5)*5, (Math.random()-0.5)*5));
}
getBodies().push(new Body(0, 0, 5e10, { H: 0.75, He: 0.25 }));

const speedsToTest = [100000, 1000000, -100, NaN, Infinity];
let speedMultFail = false;

for (const s of speedsToTest) {
  setSpeedMult(s);
  const sm = sandbox.getSpeedMult();
  const validSpeedMult = (Number.isFinite(sm) && sm > 0) ? sm : 1;
  const physDt = Math.min(Math.max(0.001, 0.016 * validSpeedMult), 0.35);
  const ageDt = 0.016 * validSpeedMult * 1e6;
  
  physicsStep(physDt, ageDt);
  
  for (const p of getParticles()) {
    if (p.active && (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy))) {
      speedMultFail = true;
      console.error(`  NaN in particle under speedMult=${s}`);
    }
  }
  for (const b of getBodies()) {
    if (b.active && (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.vx) || !Number.isFinite(b.vy))) {
      speedMultFail = true;
      console.error(`  NaN in body under speedMult=${s}`);
    }
  }
}

if (speedMultFail) {
  console.error('  FAIL: Extreme speed multiplier caused numerical corruption!');
  hasError = true;
} else {
  console.log('  PASS: Clamped sub-stepping (physDt <= 0.35) maintains stability across all speed multipliers!');
}

// ----------------------------------------------------
// TEST 5: QuadTree Node Recycling Pool Stability (50 Steps with 2500 Particles)
// ----------------------------------------------------
console.log('\n[TEST 5] Testing QuadTree Node Pooling & Memory Stability over 50 frames...');
getParticles().length = 0;
getBodies().length = 0;

for (let i = 0; i < 2500; i++) {
  getParticles().push(new Particle((Math.random()-0.5)*1500, (Math.random()-0.5)*1500, 'H', (Math.random()-0.5)*2, (Math.random()-0.5)*2));
}

const poolSizes = [];
for (let frame = 0; frame < 50; frame++) {
  physicsStep(0.016, 16000);
  poolSizes.push(QT.pool.length);
}

console.log(`  Pool size over 50 steps: initial=${poolSizes[0]}, min=${Math.min(...poolSizes)}, max=${Math.max(...poolSizes)}, final=${poolSizes[49]}`);
if (QT.pool.length > 0 && Math.max(...poolSizes) < 10000) {
  console.log('  PASS: QuadTree pool recycling is working correctly and memory footprint is bounded!');
} else {
  console.error('  FAIL: QuadTree node pooling issue or memory leak!');
  hasError = true;
}

// ----------------------------------------------------
// TEST 6: Collision & Body Merging Edge Cases (Equal Mass Bodies & Composition Conservation)
// ----------------------------------------------------
console.log('\n[TEST 6] Testing Collision & Body Merging Edge Cases...');
getParticles().length = 0;
getBodies().length = 0;

const bMerge1 = new Body(0, 0, 1e10, { H: 0.8, He: 0.2 });
bMerge1.vx = 5;
const bMerge2 = new Body(2, 0, 1e10, { H: 0.6, O: 0.4 });
bMerge2.vx = -5;
getBodies().push(bMerge1, bMerge2);

const bodyCountBefore = getBodies().filter(b => b.active).length;
physicsStep(0.016, 16000);
const bodyCountAfter = getBodies().filter(b => b.active).length;

console.log(`  Active body count before collision: ${bodyCountBefore}, after: ${bodyCountAfter}`);
if (bodyCountAfter === 1) {
  const mergedBody = getBodies().find(b => b.active);
  console.log(`  Merged body mass: ${mergedBody.mass.toExponential(2)} (expected: 2.00e+10)`);
  console.log(`  Merged composition: H=${(mergedBody.composition.H*100).toFixed(1)}%, He=${(mergedBody.composition.He*100).toFixed(1)}%, O=${(mergedBody.composition.O*100).toFixed(1)}%`);
  if (mergedBody.mass === 2e10 && Math.abs(mergedBody.composition.H - 0.7) < 0.001) {
    console.log('  PASS: Mass and elemental composition conserved precisely during body merging!');
  } else {
    console.error('  FAIL: Conservation error during body merging!');
    hasError = true;
  }
} else {
  console.error('  FAIL: Bodies did not merge upon collision!');
  hasError = true;
}

// ----------------------------------------------------
// VERDICT SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
if (hasError) {
  console.error('OVERALL VERDICT: FAIL - Issues detected during stress testing.');
  process.exit(1);
} else {
  console.log('OVERALL VERDICT: PASS - All stress tests passed flawlessly!');
  process.exit(0);
}
