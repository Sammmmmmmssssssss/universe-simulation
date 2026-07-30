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

const mockCtx = {
  fillRect: () => {}, beginPath: () => {}, arc: () => {}, fill: () => {},
  stroke: () => {}, clearRect: () => {}, drawImage: () => {}, fillText: () => {},
  ellipse: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
  setLineDash: () => {}, createRadialGradient: () => ({ addColorStop: () => {} }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
};

function createMockElement(id = '') {
  return {
    id, style: {}, classList: { add: () => {}, remove: () => {} },
    textContent: '', value: '50', children: [], appendChild: () => {},
    removeChild: () => {}, prepend: () => {}, addEventListener: () => {},
    getContext: () => mockCtx, clientWidth: 800, clientHeight: 600
  };
}

const sandbox = {
  window: { innerWidth: 1920, innerHeight: 1080, addEventListener: () => {} },
  document: { getElementById: (id) => createMockElement(id), querySelectorAll: () => [createMockElement()], createElement: () => createMockElement(), addEventListener: () => {} },
  console, setTimeout, clearTimeout, setInterval, clearInterval, Math, Date, Number, Object, Array, Set, Infinity, isNaN, isFinite, parseFloat, parseInt,
  innerWidth: 1920, innerHeight: 1080
};

const wrappedCode = jsCode + `
  globalThis.Particle = Particle;
  globalThis.Body = Body;
  globalThis.QT = QT;
  globalThis.physicsStep = physicsStep;
  globalThis.collide = collide;
  globalThis.getParticles = () => particles;
  globalThis.getBodies = () => bodies;
  globalThis.setSpeed = setSpeed;
  globalThis.cosmicAge = cosmicAge;
`;

vm.createContext(sandbox);
vm.runInContext(wrappedCode, sandbox);

let auditFailed = false;

console.log('=== AUDITOR FORENSIC TEST SUITE ===\n');

// TEST 1: QuadTree Spatial Broad-phase & Narrow-phase Ground Truth
console.log('[AUDIT CHECK 1] QuadTree Spatial Query Accuracy (Broad + Narrow Phase)');
const P = sandbox.Particle;
const QT = sandbox.QT;

const testParticles = [];
for (let i = 0; i < 1000; i++) {
  testParticles.push(new P((Math.random() - 0.5) * 1000, (Math.random() - 0.5) * 1000, 'H'));
}

const qt = QT.create(-600, -600, 1200, 1200, 0);
for (const p of testParticles) qt.insert(p);

const queryPoint = { x: 50, y: 50, radius: 100 };
const qtCandidates = new Set();
qt.queryRange(queryPoint.x, queryPoint.y, queryPoint.radius, (p) => qtCandidates.add(p));

const bfExact = new Set();
for (const p of testParticles) {
  if (p.x >= queryPoint.x - queryPoint.radius && p.x <= queryPoint.x + queryPoint.radius &&
      p.y >= queryPoint.y - queryPoint.radius && p.y <= queryPoint.y + queryPoint.radius) {
    bfExact.add(p);
  }
}

let zeroFalseNegatives = true;
for (const p of bfExact) {
  if (!qtCandidates.has(p)) {
    zeroFalseNegatives = false;
  }
}

const filteredQt = new Set();
for (const p of qtCandidates) {
  if (p.x >= queryPoint.x - queryPoint.radius && p.x <= queryPoint.x + queryPoint.radius &&
      p.y >= queryPoint.y - queryPoint.radius && p.y <= queryPoint.y + queryPoint.radius) {
    filteredQt.add(p);
  }
}
const narrowPhaseMatch = (filteredQt.size === bfExact.size);

if (zeroFalseNegatives && narrowPhaseMatch) {
  console.log(`PASS: queryRange broad-phase retrieved ${qtCandidates.size} candidates with zero false negatives. Narrow-phase matches ground truth (${filteredQt.size} particles).`);
} else {
  console.error(`FAIL: Spatial query mismatch! False negatives: ${!zeroFalseNegatives}, Filtered size: ${filteredQt.size}, Ground truth: ${bfExact.size}`);
  auditFailed = true;
}

// TEST 2: QuadTree Recycling Memory Stability across 100 frames
console.log('\n[AUDIT CHECK 2] Object Pooling & Memory Stability across 100 Frames');
const liveParticles = sandbox.getParticles();
const liveBodies = sandbox.getBodies();
liveParticles.length = 0;
liveBodies.length = 0;
sandbox.setSpeed(1);

for (let i = 0; i < 2000; i++) {
  liveParticles.push(new P((Math.random() - 0.5) * 2000, (Math.random() - 0.5) * 2000, 'H'));
}

for (let frame = 0; frame < 100; frame++) {
  sandbox.physicsStep(0.016, 16000);
}

const finalPoolCount = QT.pool.length;
console.log(`QT.pool recycled node count after 100 frames: ${finalPoolCount}`);

if (finalPoolCount > 100) {
  console.log('PASS: QuadTree object pool is actively recycling hundreds of nodes without GC allocation pauses.');
} else {
  console.error(`FAIL: Object pool empty or inactive (count: ${finalPoolCount}).`);
  auditFailed = true;
}

// TEST 3: Extreme Speed Multipliers & Zero NaN Safety
console.log('\n[AUDIT CHECK 3] Extreme Speed Multipliers & Zero-NaN Stability');
const speeds = [1, 10, 100, 1000, 10000, 100000, 1e6];
let nanFound = false;

for (const spd of speeds) {
  sandbox.setSpeed(spd);
  try {
    sandbox.physicsStep(0.016, 100000);
  } catch(e) {
    console.error(`FAIL: Exception thrown during speed ${spd}:`, e.message);
    nanFound = true;
  }
}

for (const p of sandbox.getParticles()) {
  if (!p.active) continue;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
    nanFound = true;
  }
}
for (const b of sandbox.getBodies()) {
  if (!b.active) continue;
  if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.vx) || !Number.isFinite(b.vy) || !Number.isFinite(b.mass) || !Number.isFinite(b.temp)) {
    nanFound = true;
  }
}

if (!nanFound) {
  console.log('PASS: All extreme speed multiplier step evaluations maintained zero-NaN numerical stability.');
} else {
  console.error('FAIL: NaNs or Infinities detected under extreme speed inputs!');
  auditFailed = true;
}

// TEST 4: Verification of Genuine Physics vs Facades
console.log('\n[AUDIT CHECK 4] Genuine Physics Computation Check');
const pList = sandbox.getParticles();
const bList = sandbox.getBodies();
pList.length = 0;
bList.length = 0;
sandbox.setSpeed(1);

const pA = new P(-50, 0, 'H', 0, 0);
const pB = new P(50, 0, 'H', 0, 0);
pList.push(pA, pB);

sandbox.physicsStep(0.016, 1600);
console.log(`After TEST 4 step 1: pA.vx=${pA.vx.toFixed(4)}, pB.vx=${pB.vx.toFixed(4)}`);

if (pA.vx > 0 && pB.vx < 0) {
  console.log(`PASS: Gravitational forces actively accelerated particles towards each other (pA.vx: ${pA.vx.toFixed(4)}, pB.vx: ${pB.vx.toFixed(4)}). Logic is authentic.`);
} else {
  console.error(`FAIL: Particles did not accelerate under gravity! pA.vx=${pA.vx}, pB.vx=${pB.vx}`);
  auditFailed = true;
}

console.log('\n=== AUDIT SUMMARY ===');
if (auditFailed) {
  console.error('VERDICT: INTEGRITY VIOLATION');
  process.exit(1);
} else {
  console.log('VERDICT: CLEAN');
}
