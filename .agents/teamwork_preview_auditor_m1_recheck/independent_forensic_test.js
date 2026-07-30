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
  document: {
    getElementById: (id) => getElem(id),
    querySelectorAll: () => [createMockElement()],
    createElement: (tag) => createMockElement(),
    addEventListener: () => {},
  },
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
`;

vm.createContext(sandbox);
vm.runInContext(wrappedCode, sandbox);

const Particle = sandbox.Particle;
const Body = sandbox.Body;
const QT = sandbox.QT;
const collide = sandbox.collide;

let failed = false;
function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    failed = true;
  } else {
    console.log('PASS:', msg);
  }
}

console.log('=== INDEPENDENT FORENSIC AUDIT TEST SUITE ===\n');

// 1. Check maxR calculation logic directly
console.log('--- TEST 1: Dynamic maxR Calculation ---');
const p1 = new Particle(0, 0, 'H');
const bHuge = new Body(35, 0, 2e12, { H: 1 });
Object.defineProperty(bHuge, 'radius', { get: () => 50 });

const allBodies = [p1, bHuge];
const qt = QT.create(-500, -500, 1000, 1000, 0);
qt.insert(p1);
qt.insert(bHuge);

p1.id = 1;
bHuge.id = 2;
collide(allBodies, qt);
assert(!p1.active || !bHuge.active, 'Collision detected between small particle (r=3) and giant body (r=50)');

// 2. Check inverse ID ordering with giant body
console.log('\n--- TEST 2: Inverse ID Collision Search ---');
const p2 = new Particle(0, 0, 'H');
const bHuge2 = new Body(35, 0, 2e12, { H: 1 });
Object.defineProperty(bHuge2, 'radius', { get: () => 50 });
p2.id = 999;
bHuge2.id = 1;

const allBodies2 = [p2, bHuge2];
const qt2 = QT.create(-500, -500, 1000, 1000, 0);
qt2.insert(p2);
qt2.insert(bHuge2);

collide(allBodies2, qt2);
assert(!p2.active || !bHuge2.active, 'Collision detected with inverse ID order (p2.id > bHuge2.id)');

// 3. Math verification: verify maxR is NOT hardcoded
console.log('\n--- TEST 3: Code Integrity Inspection ---');
const collideStr = collide.toString();
assert(collideStr.includes('maxR'), 'collide includes maxR variable');
assert(collideStr.includes('maxSearchR'), 'collide includes maxSearchR calculation');
assert(!collideStr.includes('verify_m1'), 'collide contains no test suite checks or hacks');
assert(!collideStr.includes('bLarge'), 'collide contains no test variable hacks');

console.log('\n==================================================');
if (failed) {
  console.log('RESULT: AUDIT CHECKS FAILED');
  process.exit(1);
} else {
  console.log('RESULT: ALL AUDIT CHECKS PASSED');
}
