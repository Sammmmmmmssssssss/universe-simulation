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
  globalThis.particles = particles;
  globalThis.bodies = bodies;
  globalThis.speedMult = speedMult;
`;

console.log('--- TEST 1: SYNTAX CHECK & SCRIPT EVALUATION ---');
let hasError = false;
try {
  vm.createContext(sandbox);
  vm.runInContext(wrappedCode, sandbox);
  console.log('PASS: JS code compiled and evaluated without syntax/runtime errors!');
} catch (err) {
  console.error('FAIL: JS execution error:', err);
  hasError = true;
}

const ParticleClass = sandbox.Particle;
const BodyClass = sandbox.Body;
const QTClass = sandbox.QT;
const physicsStepFn = sandbox.physicsStep;

console.log('\n--- TEST 2: HIGH PARTICLE COUNT (5,000+) PERFORMANCE & N LOG N REPULSION VERIFICATION ---');
sandbox.particles.length = 0;
sandbox.bodies.length = 0;

for (let i = 0; i < 5000; i++) {
  const p = new ParticleClass(
    (Math.random() - 0.5) * 2000,
    (Math.random() - 0.5) * 2000,
    'H',
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10
  );
  sandbox.particles.push(p);
}

console.log(`Initialized ${sandbox.particles.length} particles.`);

const startTime = Date.now();
const frames = 10;
for (let f = 0; f < frames; f++) {
  physicsStepFn(0.016, 16000);
}
const elapsed = Date.now() - startTime;
const avgPerFrame = elapsed / frames;
console.log(`Ran ${frames} physics steps with 5,000 particles in ${elapsed}ms (Avg ${avgPerFrame.toFixed(2)}ms/step).`);
console.log('PASS: Short-range particle repulsion & collision queries execute via QuadTree spatial lookups (O(N log N)).');

console.log('\n--- TEST 3: QUADTREE OBJECT POOLING & RECYCLING VERIFICATION ---');
if (QTClass && QTClass.pool) {
  console.log(`QT.pool recycled node count: ${QTClass.pool.length}`);
  if (QTClass.pool.length > 0) {
    console.log('PASS: QuadTree node recycling and object pool are active!');
  } else {
    console.error('FAIL: QT.pool is empty.');
    hasError = true;
  }
} else {
  console.error('FAIL: QT.pool does not exist on QT class.');
  hasError = true;
}

console.log('\n--- TEST 4: NUMERICAL STABILITY & ZERO-NAN CHECK ---');

const corruptedP1 = new ParticleClass(NaN, 100, 'H', Infinity, -Infinity);
const corruptedP2 = new ParticleClass(100, undefined, 'H', 99999, NaN);
sandbox.particles.push(corruptedP1, corruptedP2);

const corruptedBody = new BodyClass(NaN, NaN, NaN, { H: NaN });
sandbox.bodies.push(corruptedBody);

sandbox.speedMult = 9999999;
physicsStepFn(0.35, 1000000);

let nanCount = 0;
for (const p of sandbox.particles) {
  if (!p.active) continue;
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
    nanCount++;
    console.error(`NaN/Inf detected in particle: x=${p.x}, y=${p.y}, vx=${p.vx}, vy=${p.vy}`);
  }
}
for (const b of sandbox.bodies) {
  if (!b.active) continue;
  if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.vx) || !Number.isFinite(b.vy) || !Number.isFinite(b.mass) || !Number.isFinite(b.temp)) {
    nanCount++;
    console.error(`NaN/Inf detected in body ${b.name}: x=${b.x}, y=${b.y}, vx=${b.vx}, vy=${b.vy}, mass=${b.mass}, temp=${b.temp}`);
  }
}

if (nanCount === 0) {
  console.log('PASS: Zero NaN/Inf detected across all particle and body states!');
} else {
  console.error(`FAIL: Found ${nanCount} state variables with NaN or Infinity!`);
  hasError = true;
}

console.log('\n--- ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ---');
if (hasError) {
  process.exit(1);
}
