const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('=== STARTING EMPIRICAL STRESS-TEST HARNESS M1 ===');

// 1. Load HTML content and extract script
const htmlPath = path.resolve(__dirname, '../../universe_simulation.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/i);
if (!scriptMatch) {
  console.error('ERROR: Could not find <script> tag in universe_simulation.html');
  process.exit(1);
}
const jsCode = scriptMatch[1];

// 2. Build DOM and Audio Mocks
function createMockElement() {
  return {
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    textContent: '',
    innerHTML: '',
    appendChild: () => {},
    prepend: () => {},
    removeChild: () => {},
    children: [],
    value: '10',
    addEventListener: () => {},
    dispatchEvent: () => {}
  };
}

const mockCtx = {
  clearRect: () => {},
  fillRect: () => {},
  drawImage: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  moveTo: () => {},
  lineTo: () => {},
  fillText: () => {},
  measureText: () => ({ width: 10 }),
  save: () => {},
  restore: () => {},
  scale: () => {},
  translate: () => {},
  rotate: () => {},
  setLineDash: () => {},
  createRadialGradient: () => ({ addColorStop: () => {} }),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  font: ''
};

const mockCanvas = {
  width: 1920,
  height: 1080,
  getContext: () => mockCtx,
  addEventListener: () => {},
  classList: { add: () => {}, remove: () => {} },
  style: {}
};

const sandbox = {
  console: console,
  Math: Math,
  Date: Date,
  Set: Set,
  Object: Object,
  Array: Array,
  Number: Number,
  String: String,
  Boolean: Boolean,
  parseInt: parseInt,
  parseFloat: parseFloat,
  isNaN: isNaN,
  isFinite: isFinite,
  Infinity: Infinity,
  NaN: NaN,
  setTimeout: (fn) => fn(),
  clearTimeout: () => {},
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
  innerWidth: 1920,
  innerHeight: 1080,
  window: {
    addEventListener: () => {}
  },
  document: {
    getElementById: (id) => {
      if (id === 'main-canvas' || id === 'bio-canvas') return mockCanvas;
      return createMockElement();
    },
    createElement: () => mockCanvas,
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  AudioContext: function() {
    return {
      createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {}, type: '', frequency: { value: 0 } }),
      createGain: () => ({ connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }),
      destination: {}
    };
  },
  webkitAudioContext: function() {
    return this.AudioContext();
  }
};

vm.createContext(sandbox);

// Execute the simulation script in sandbox (ignoring auto loop start if possible or overriding window event handlers)
try {
  // We wrap script to export top-level bindings to window/globalThis
  const exportWrapper = jsCode + `
    window.Particle = Particle;
    window.Body = Body;
    window.QT = QT;
    window.physicsStep = physicsStep;
    window.triggerSN = triggerSN;
    window.G = G;
    window.DT_BASE = DT_BASE;
    window.YEAR_SCALE = YEAR_SCALE;
  `;
  vm.runInContext(exportWrapper, sandbox);
  console.log('Successfully initialized simulation JS in VM sandbox.');
} catch (err) {
  console.error('VM Execution Error during initialization:', err);
  process.exit(1);
}

// Convenient handles to sandbox exported classes & globals
const Particle = sandbox.window.Particle;
const Body = sandbox.window.Body;
const QT = sandbox.window.QT;
const physicsStep = sandbox.window.physicsStep;
const triggerSN = sandbox.window.triggerSN;
const G = sandbox.window.G;
const DT_BASE = sandbox.window.DT_BASE;
const YEAR_SCALE = sandbox.window.YEAR_SCALE;

// Helper to inspect numerical values in particles/bodies
function inspectState(sandbox, label) {
  const { particles, bodies, lastQt } = sandbox;
  const issues = [];

  let particleCount = 0;
  for (const p of particles) {
    if (!p.active) continue;
    particleCount++;
    if (!Number.isFinite(p.x) || isNaN(p.x)) issues.push(`${label}: Particle ${p.id} x is ${p.x}`);
    if (!Number.isFinite(p.y) || isNaN(p.y)) issues.push(`${label}: Particle ${p.id} y is ${p.y}`);
    if (!Number.isFinite(p.vx) || isNaN(p.vx)) issues.push(`${label}: Particle ${p.id} vx is ${p.vx}`);
    if (!Number.isFinite(p.vy) || isNaN(p.vy)) issues.push(`${label}: Particle ${p.id} vy is ${p.vy}`);
    if (!Number.isFinite(p.mass) || isNaN(p.mass)) issues.push(`${label}: Particle ${p.id} mass is ${p.mass}`);
  }

  let bodyCount = 0;
  for (const b of bodies) {
    if (!b.active) continue;
    bodyCount++;
    if (!Number.isFinite(b.x) || isNaN(b.x)) issues.push(`${label}: Body ${b.id} x is ${b.x}`);
    if (!Number.isFinite(b.y) || isNaN(b.y)) issues.push(`${label}: Body ${b.id} y is ${b.y}`);
    if (!Number.isFinite(b.vx) || isNaN(b.vx)) issues.push(`${label}: Body ${b.id} vx is ${b.vx}`);
    if (!Number.isFinite(b.vy) || isNaN(b.vy)) issues.push(`${label}: Body ${b.id} vy is ${b.vy}`);
    if (!Number.isFinite(b.mass) || isNaN(b.mass)) issues.push(`${label}: Body ${b.id} mass is ${b.mass}`);
    if (!Number.isFinite(b.temp) || isNaN(b.temp)) issues.push(`${label}: Body ${b.id} temp is ${b.temp}`);
  }

  if (lastQt) {
    if (isNaN(lastQt.mass) || (lastQt.mass !== 0 && !Number.isFinite(lastQt.mass))) {
      issues.push(`${label}: QuadTree total mass is ${lastQt.mass}`);
    }
  }

  return { particleCount, bodyCount, issues };
}

const testResults = {
  scenarioA: { pass: false, details: '' },
  scenarioB: { pass: false, details: '' },
  scenarioC: { pass: false, details: '' },
  scenarioD: { pass: false, details: '' }
};

// ----------------------------------------------------
// TEST SCENARIO A: 5,000+ gas particles for 1,000 iterations
// ----------------------------------------------------
console.log('\n--- Running Scenario A: 5,000+ Gas Particles for 1,000 Iterations ---');
try {
  // Clear arrays
  sandbox.particles = [];
  sandbox.bodies = [];
  sandbox.cosmicAge = 0;

  const targetParticles = 5200;
  console.log(`Spawning ${targetParticles} gas particles...`);
  for (let i = 0; i < targetParticles; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 800;
    const px = Math.cos(angle) * r;
    const py = Math.sin(angle) * r;
    const p = new Particle(px, py, 'H', (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    sandbox.particles.push(p);
  }

  const startTime = Date.now();
  let totalIssues = [];
  const iterCount = 1000;
  const physDt = 0.016;
  const ageDt = 0.016 * 1e6;

  for (let step = 1; step <= iterCount; step++) {
    physicsStep(physDt, ageDt);
    if (step % 200 === 0 || step === iterCount) {
      const state = inspectState(sandbox, `Step ${step}`);
      if (state.issues.length > 0) {
        totalIssues.push(...state.issues);
      }
      console.log(`Step ${step}/${iterCount}: Active Particles=${state.particleCount}, Active Bodies=${state.bodyCount}, Issues=${state.issues.length}, QT Pool Size=${QT.pool.length}`);
    }
  }
  const duration = Date.now() - startTime;
  console.log(`Completed 1,000 iterations in ${duration}ms (${(duration/iterCount).toFixed(2)}ms/step).`);

  if (totalIssues.length === 0) {
    testResults.scenarioA.pass = true;
    testResults.scenarioA.details = `SUCCESS: 5,200 particles ran for 1,000 iterations in ${duration}ms without NaN/Infinity. Final particles: ${sandbox.particles.filter(p=>p.active).length}, bodies: ${sandbox.bodies.filter(b=>b.active).length}.`;
  } else {
    testResults.scenarioA.pass = false;
    testResults.scenarioA.details = `FAILED: Found ${totalIssues.length} numerical issues. First issues: ${totalIssues.slice(0, 5).join('; ')}`;
  }
} catch (err) {
  testResults.scenarioA.pass = false;
  testResults.scenarioA.details = `CRASH: ${err.stack || err.message}`;
}

// ----------------------------------------------------
// TEST SCENARIO B: 100,000x Time Warp Speed Multiplier
// ----------------------------------------------------
console.log('\n--- Running Scenario B: 100,000x Time Warp Speed Multiplier ---');
try {
  sandbox.particles = [];
  sandbox.bodies = [];
  sandbox.cosmicAge = 0;
  sandbox.speedMult = 100000;

  // Spawn solar system
  const star = new Body(0, 0, 8e10, { H: 0.75, He: 0.25 });
  sandbox.bodies.push(star);

  for (let i = 0; i < 200; i++) {
    const r = 100 + Math.random() * 500;
    const a = Math.random() * Math.PI * 2;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    const v = Math.sqrt(G * star.mass / r);
    const p = new Particle(px, py, 'H', -Math.sin(a) * v, Math.cos(a) * v);
    sandbox.particles.push(p);
  }

  const validSpeedMult = sandbox.speedMult;
  const physDt = Math.min(Math.max(0.001, DT_BASE * validSpeedMult), 0.35); // 0.35 clamped
  const ageDt = DT_BASE * validSpeedMult * YEAR_SCALE; // 1.6e9 years per step

  console.log(`Time Warp settings: speedMult=${sandbox.speedMult}, physDt=${physDt}, ageDt=${ageDt} yrs/step`);

  let totalIssues = [];
  const iterCount = 1000;
  for (let step = 1; step <= iterCount; step++) {
    sandbox.cosmicAge += ageDt;
    physicsStep(physDt, ageDt);
    if (step % 200 === 0 || step === iterCount) {
      const state = inspectState(sandbox, `Warp Step ${step}`);
      if (state.issues.length > 0) totalIssues.push(...state.issues);
      console.log(`Warp Step ${step}/${iterCount}: cosmicAge=${sandbox.cosmicAge.toExponential(2)} Yrs, Active Particles=${state.particleCount}, Active Bodies=${state.bodyCount}, Issues=${state.issues.length}`);
    }
  }

  if (totalIssues.length === 0 && Number.isFinite(sandbox.cosmicAge)) {
    testResults.scenarioB.pass = true;
    testResults.scenarioB.details = `SUCCESS: 100,000x time warp ran 1,000 steps reaching Cosmic Age ${sandbox.cosmicAge.toExponential(2)} Yrs without NaN/Infinity.`;
  } else {
    testResults.scenarioB.pass = false;
    testResults.scenarioB.details = `FAILED: Numerical issues or invalid cosmicAge (${sandbox.cosmicAge}). Issues: ${totalIssues.slice(0, 5).join('; ')}`;
  }
} catch (err) {
  testResults.scenarioB.pass = false;
  testResults.scenarioB.details = `CRASH: ${err.stack || err.message}`;
}

// ----------------------------------------------------
// TEST SCENARIO C: Extreme & Invalid Inputs
// ----------------------------------------------------
console.log('\n--- Running Scenario C: Extreme & Invalid Inputs ---');
try {
  sandbox.particles = [];
  sandbox.bodies = [];
  let extremeIssues = [];

  // Test C1: Zero Mass Particles
  console.log('C1: Testing Zero Mass Particles...');
  const zeroMassP1 = new Particle(10, 10, 'H', 1, 1);
  zeroMassP1.mass = 0;
  const zeroMassP2 = new Particle(20, 20, 'He', -1, -1);
  zeroMassP2.mass = 0;
  sandbox.particles.push(zeroMassP1, zeroMassP2);

  // Test C2: Negative Positions
  console.log('C2: Testing Extreme Negative Positions...');
  const negP = new Particle(-1e9, -1e9, 'H', 5, 5);
  sandbox.particles.push(negP);

  // Test C3: Infinite & NaN Coordinates
  console.log('C3: Testing Infinite/NaN Coordinates...');
  const infP = new Particle(Infinity, -Infinity, 'H', Infinity, NaN);
  sandbox.particles.push(infP);

  // Test C4: Overlapping Particles (0 distance)
  console.log('C4: Testing Overlapping Particles at (100, 100)...');
  for (let i = 0; i < 50; i++) {
    const ovP = new Particle(100, 100, 'H', 0, 0);
    sandbox.particles.push(ovP);
  }

  // Run 100 physics steps on these extreme inputs
  for (let step = 1; step <= 100; step++) {
    physicsStep(0.016, 16000);
    const state = inspectState(sandbox, `Extreme Step ${step}`);
    if (state.issues.length > 0) {
      extremeIssues.push(...state.issues);
    }
  }

  console.log(`Extreme input test complete. Active particles: ${sandbox.particles.filter(p=>p.active).length}, Active bodies: ${sandbox.bodies.filter(b=>b.active).length}`);
  if (extremeIssues.length === 0) {
    testResults.scenarioC.pass = true;
    testResults.scenarioC.details = `SUCCESS: Zero mass, negative coords, infinite/NaN inputs, and 50 overlapping particles handled safely without unhandled NaN/Infinity.`;
  } else {
    testResults.scenarioC.pass = false;
    testResults.scenarioC.details = `FAILED: Found issues in extreme inputs: ${extremeIssues.slice(0, 5).join('; ')}`;
  }
} catch (err) {
  testResults.scenarioC.pass = false;
  testResults.scenarioC.details = `CRASH: ${err.stack || err.message}`;
}

// ----------------------------------------------------
// TEST SCENARIO D: Memory Leak & QuadTree Pool Check
// ----------------------------------------------------
console.log('\n--- Running Scenario D: Memory Leak & QuadTree Pool Check ---');
try {
  sandbox.particles = [];
  sandbox.bodies = [];

  const initialMemory = process.memoryUsage().heapUsed;
  const initialPoolSize = QT.pool.length;

  console.log(`Initial Heap: ${(initialMemory / 1024 / 1024).toFixed(2)} MB, Initial QT Pool: ${initialPoolSize}`);

  // Run 1,500 iterations continually adding and removing particles (e.g. via merges/supernovae)
  for (let step = 1; step <= 1500; step++) {
    // Add 10 particles every step up to 1000
    if (sandbox.particles.filter(p=>p.active).length < 1000) {
      for (let k = 0; k < 10; k++) {
        sandbox.particles.push(new Particle((Math.random()-0.5)*500, (Math.random()-0.5)*500, 'H', (Math.random()-0.5)*2, (Math.random()-0.5)*2));
      }
    }
    // Periodically trigger supernova or merge to test recycling
    if (step % 100 === 0) {
      const star = new Body(0, 0, 1e11, { H: 0.8 });
      sandbox.bodies.push(star);
      triggerSN(star);
    }
    physicsStep(0.016, 16000);
  }

  // Force GC if available or check Heap delta
  if (global.gc) global.gc();
  const finalMemory = process.memoryUsage().heapUsed;
  const finalPoolSize = QT.pool.length;
  const memoryDeltaMB = (finalMemory - initialMemory) / 1024 / 1024;

  console.log(`Final Heap: ${(finalMemory / 1024 / 1024).toFixed(2)} MB (Delta: ${memoryDeltaMB.toFixed(2)} MB), Final QT Pool: ${finalPoolSize}`);

  // Check if QT.pool has recycled node references properly
  let leakedNodeRefs = 0;
  for (const node of QT.pool) {
    if (node.ch !== null || node.p !== null) {
      leakedNodeRefs++;
    }
  }

  if (leakedNodeRefs === 0 && memoryDeltaMB < 50) {
    testResults.scenarioD.pass = true;
    testResults.scenarioD.details = `SUCCESS: QuadTree pool recycling verified. 0 un-recycled node references in pool of ${finalPoolSize} nodes. Heap delta: ${memoryDeltaMB.toFixed(2)} MB over 1,500 dynamic steps.`;
  } else {
    testResults.scenarioD.pass = false;
    testResults.scenarioD.details = `FAILED: Leaked node references: ${leakedNodeRefs}, Heap delta: ${memoryDeltaMB.toFixed(2)} MB.`;
  }
} catch (err) {
  testResults.scenarioD.pass = false;
  testResults.scenarioD.details = `CRASH: ${err.stack || err.message}`;
}

// ----------------------------------------------------
// TEST SCENARIO E: High-Density Collapse (10,000 particles)
// ----------------------------------------------------
console.log('\n--- Running Scenario E: 10,000 Particle High-Density Collapse ---');
try {
  sandbox.particles = [];
  sandbox.bodies = [];
  
  for (let i = 0; i < 10000; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 400;
    const p = new Particle(Math.cos(angle)*r, Math.sin(angle)*r, 'H', (Math.random()-0.5)*2, (Math.random()-0.5)*2);
    sandbox.particles.push(p);
  }

  let totalIssues = [];
  const startTime = Date.now();
  for (let step = 1; step <= 500; step++) {
    physicsStep(0.016, 16000);
    if (step % 100 === 0 || step === 500) {
      const state = inspectState(sandbox, `Collapse Step ${step}`);
      if (state.issues.length > 0) totalIssues.push(...state.issues);
      console.log(`Collapse Step ${step}/500: Active Particles=${state.particleCount}, Active Bodies=${state.bodyCount}, Issues=${state.issues.length}`);
    }
  }
  const duration = Date.now() - startTime;
  console.log(`10,000 particle collapse completed in ${duration}ms.`);

  testResults.scenarioE = {
    pass: totalIssues.length === 0,
    details: totalIssues.length === 0 ? `SUCCESS: 10,000 particles collapsed in ${duration}ms without issues.` : `FAILED: ${totalIssues.slice(0, 5).join('; ')}`
  };
} catch (err) {
  testResults.scenarioE = { pass: false, details: `CRASH: ${err.stack || err.message}` };
}

// ----------------------------------------------------
// TEST SCENARIO F: Rapid Birth & Death Cycle
// ----------------------------------------------------
console.log('\n--- Running Scenario F: Rapid Birth & Death Cycle ---');
try {
  sandbox.particles = [];
  sandbox.bodies = [];
  let totalIssues = [];

  for (let step = 1; step <= 300; step++) {
    // Spawn 50 particles
    for (let k = 0; k < 50; k++) {
      sandbox.particles.push(new Particle((Math.random()-0.5)*100, (Math.random()-0.5)*100, 'H'));
    }
    // Deactivate 20 particles
    for (let k = 0; k < 20 && k < sandbox.particles.length; k++) {
      sandbox.particles[k].active = false;
    }
    physicsStep(0.016, 16000);
  }

  const state = inspectState(sandbox, `BirthDeath End`);
  testResults.scenarioF = {
    pass: state.issues.length === 0,
    details: state.issues.length === 0 ? `SUCCESS: Rapid birth/death cycling completed without numerical corruption.` : `FAILED: ${state.issues.slice(0, 5).join('; ')}`
  };
} catch (err) {
  testResults.scenarioF = { pass: false, details: `CRASH: ${err.stack || err.message}` };
}

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log('FINAL TEST HARNESS SUMMARY FOR MILESTONE 1');
console.log('====================================================');
console.log(`Scenario A (5,000+ Particles, 1,000 steps): ${testResults.scenarioA.pass ? 'PASS' : 'FAIL'} -> ${testResults.scenarioA.details}`);
console.log(`Scenario B (100,000x Time Warp): ${testResults.scenarioB.pass ? 'PASS' : 'FAIL'} -> ${testResults.scenarioB.details}`);
console.log(`Scenario C (Extreme Inputs): ${testResults.scenarioC.pass ? 'PASS' : 'FAIL'} -> ${testResults.scenarioC.details}`);
console.log(`Scenario D (Memory & Pool Leak Check): ${testResults.scenarioD.pass ? 'PASS' : 'FAIL'} -> ${testResults.scenarioD.details}`);
console.log(`Scenario E (10,000 Particle Collapse): ${testResults.scenarioE.pass ? 'PASS' : 'FAIL'} -> ${testResults.scenarioE.details}`);
console.log(`Scenario F (Birth & Death Cycle): ${testResults.scenarioF.pass ? 'PASS' : 'FAIL'} -> ${testResults.scenarioF.details}`);

const overallPass = Object.values(testResults).every(r => r.pass);
console.log(`\nOVERALL VERDICT: ${overallPass ? 'PASS' : 'FAIL'}`);

fs.writeFileSync(
  path.resolve(__dirname, 'test_results.json'),
  JSON.stringify({ overallPass, testResults, timestamp: new Date().toISOString() }, null, 2)
);

process.exit(overallPass ? 0 : 1);
