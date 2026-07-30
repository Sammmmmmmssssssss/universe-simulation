const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log("=================================================================");
console.log("  EMPIRICAL STRESS TEST SUITE: MILESTONE 2 ASTROPHYSICS & FUSION");
console.log("=================================================================\n");

const htmlPath = '/Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html';
const html = fs.readFileSync(htmlPath, 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("FAIL: Could not find <script> tag in universe_simulation.html");
  process.exit(1);
}

const code = scriptMatch[1] + `
;
globalThis.Body = Body;
globalThis.Particle = Particle;
globalThis.getBodies = () => bodies;
globalThis.getParticles = () => particles;
globalThis.evolveStars = evolveStars;
globalThis.triggerSN = triggerSN;
globalThis.doMerge = doMerge;
globalThis.physicsStep = physicsStep;
globalThis.calcMolecules = calcMolecules;
globalThis.unlockedElements = unlockedElements;
globalThis.ELEMENTS = ELEMENTS;
globalThis.MOLECULES = MOLECULES;
globalThis.G = G;
globalThis.MAX_P = MAX_P;
globalThis.DT_BASE = DT_BASE;
globalThis.YEAR_SCALE = YEAR_SCALE;
`;

const createMockElement = (id) => ({
  id,
  classList: { add: () => {}, remove: () => {} },
  getContext: () => ({
    fillStyle: '', fillRect: () => {}, fill: () => {}, beginPath: () => {}, arc: () => {},
    drawImage: () => {}, clearRect: () => {}, stroke: () => {}, moveTo: () => {}, lineTo: () => {},
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createLinearGradient: () => ({ addColorStop: () => {} })
  }),
  style: {},
  textContent: '',
  children: [],
  appendChild: (child) => {},
  prepend: (child) => {},
  removeChild: (child) => {},
  querySelectorAll: () => [],
  value: '60',
  addEventListener: () => {}
});

const sandbox = {
  console: {
    log: () => {},
    error: console.error,
    warn: console.warn,
    info: console.info
  },
  setTimeout: () => {},
  clearTimeout: () => {},
  requestAnimationFrame: () => {},
  cancelAnimationFrame: () => {},
  Date,
  Math,
  Number,
  Object,
  Set,
  Array,
  Infinity,
  isNaN,
  parseInt,
  parseFloat,
  window: {
    addEventListener: () => {},
    innerWidth: 1920,
    innerHeight: 1080,
    AudioContext: class {
      resume() {}
      createOscillator() {
        return {
          type: '',
          frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() {}, start() {}, stop() {}
        };
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
      }
      destination = {};
    }
  },
  document: {
    getElementById: (id) => createMockElement(id),
    createElement: (tag) => createMockElement(tag),
    querySelectorAll: () => [],
    addEventListener: () => {}
  },
  innerWidth: 1920,
  innerHeight: 1080
};

sandbox.globalThis = sandbox;
sandbox.global = sandbox;
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;

vm.createContext(sandbox);

try {
  vm.runInContext(code, sandbox);
} catch (e) {
  console.error("Error executing simulation code in VM context:", e);
  process.exit(1);
}

const {
  Body, Particle, getBodies, getParticles, physicsStep, doMerge, triggerSN, evolveStars,
  unlockedElements, ELEMENTS, MOLECULES, calcMolecules, G
} = sandbox;

function checkNaNAndBounds(contextName, checkNorm = true) {
  const issues = [];
  const particles = getParticles();
  const bodies = getBodies();

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.active) continue;
    if (!Number.isFinite(p.x) || isNaN(p.x)) issues.push(`Particle #${i} x is NaN/non-finite: ${p.x}`);
    if (!Number.isFinite(p.y) || isNaN(p.y)) issues.push(`Particle #${i} y is NaN/non-finite: ${p.y}`);
    if (!Number.isFinite(p.vx) || isNaN(p.vx)) issues.push(`Particle #${i} vx is NaN/non-finite: ${p.vx}`);
    if (!Number.isFinite(p.vy) || isNaN(p.vy)) issues.push(`Particle #${i} vy is NaN/non-finite: ${p.vy}`);
  }

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    if (!b.active) continue;
    if (!Number.isFinite(b.x) || isNaN(b.x)) issues.push(`Body '${b.name}' x is NaN: ${b.x}`);
    if (!Number.isFinite(b.y) || isNaN(b.y)) issues.push(`Body '${b.name}' y is NaN: ${b.y}`);
    if (!Number.isFinite(b.vx) || isNaN(b.vx)) issues.push(`Body '${b.name}' vx is NaN: ${b.vx}`);
    if (!Number.isFinite(b.vy) || isNaN(b.vy)) issues.push(`Body '${b.name}' vy is NaN: ${b.vy}`);
    if (!Number.isFinite(b.mass) || isNaN(b.mass)) issues.push(`Body '${b.name}' mass is NaN: ${b.mass}`);
    if (!Number.isFinite(b.temp) || isNaN(b.temp)) issues.push(`Body '${b.name}' temp is NaN: ${b.temp}`);
    if (!Number.isFinite(b.luminosity) || isNaN(b.luminosity)) issues.push(`Body '${b.name}' luminosity is NaN: ${b.luminosity}`);
    if (!Number.isFinite(b.habitability) || isNaN(b.habitability)) issues.push(`Body '${b.name}' habitability is NaN: ${b.habitability}`);

    let sumComp = 0;
    for (const [el, frac] of Object.entries(b.composition)) {
      if (!Number.isFinite(frac) || isNaN(frac)) {
        issues.push(`Body '${b.name}' composition['${el}'] is NaN: ${frac}`);
      } else {
        if (frac < 0 || frac > 1.000001) {
          issues.push(`Body '${b.name}' composition['${el}'] out of bounds [0, 1]: ${frac}`);
        }
        sumComp += frac;
      }
    }
    if (checkNorm && Object.keys(b.composition).length > 0 && Math.abs(sumComp - 1.0) > 1e-3) {
      issues.push(`Body '${b.name}' composition sum != 1.0: ${sumComp}`);
    }
  }

  return issues;
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  console.log(`[TEST ${totalTests}] ${name}...`);
  try {
    fn();
    console.log(`  => PASS\n`);
    passedTests++;
  } catch (err) {
    console.error(`  => FAIL: ${err.message}\n`);
    failedTests++;
  }
}

// -------------------------------------------------------------
// TEST 1: 50 Stellar Lifecycles & Supernovae at 100,000x Time Warp
// -------------------------------------------------------------
runTest("50 Stellar Lifecycles & Supernova Detonations (100,000x Warp)", () => {
  const particles = getParticles();
  const bodies = getBodies();
  particles.length = 0;
  bodies.length = 0;

  const speedMult = 100000;
  const physDt = 0.35;
  const ageDt = 0.016 * speedMult * 1e6; // 1.6e9 years/step

  for (let i = 0; i < 50; i++) {
    const x = (i % 10 - 4.5) * 500;
    const y = (Math.floor(i / 10) - 2) * 500;
    const mass = i < 20 ? 2e11 + i * 1e10 : 1e11 + (i - 20) * 2e9;
    bodies.push(new Body(x, y, mass, { H: 0.75, He: 0.25 }));
  }

  console.log(`   Simulating 50 stellar lifecycles over 50 steps at 100,000x warp...`);

  let nanFound = false;
  let normViolationFound = false;
  let firstNormError = '';

  for (let step = 0; step < 50; step++) {
    physicsStep(physDt, ageDt);
    
    // Check for NaNs
    const nanIssues = checkNaNAndBounds(`Step ${step}`, false);
    if (nanIssues.length > 0) {
      nanFound = true;
      console.error(`   [NaN Detected] Step ${step}:`, nanIssues[0]);
    }

    // Check for normalization violations
    const normIssues = checkNaNAndBounds(`Step ${step}`, true);
    if (normIssues.length > 0 && !normViolationFound) {
      normViolationFound = true;
      firstNormError = normIssues[0];
    }
  }

  assert.strictEqual(nanFound, false, "Zero NaN values allowed during fusion/physics steps");
  
  if (normViolationFound) {
    assert.fail(`Composition normalization failure detected during stellar lifecycles: ${firstNormError}`);
  }
});

// -------------------------------------------------------------
// TEST 2: Supernova Chain Reaction (Multiple Detonations in Close Proximity)
// -------------------------------------------------------------
runTest("Supernova Chain Reaction (10 Proximity Detonations)", () => {
  const particles = getParticles();
  const bodies = getBodies();
  particles.length = 0;
  bodies.length = 0;

  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    const x = Math.cos(angle) * 50;
    const y = Math.sin(angle) * 50;
    bodies.push(new Body(x, y, 4e11, { H: 0.2, He: 0.3, C: 0.2, O: 0.3 }));
  }

  // Add surrounding gas and target bodies to test kinetic shockwave interaction
  for (let i = 0; i < 30; i++) {
    particles.push(new Particle((Math.random() - 0.5) * 400, (Math.random() - 0.5) * 400, 'H'));
  }

  console.log(`   Triggering 10 simultaneous supernovae in close proximity...`);
  const stars = bodies.filter(b => b.active);
  for (const s of stars) {
    triggerSN(s);
  }

  // Verify shockwave dynamics over 20 steps
  for (let step = 0; step < 20; step++) {
    physicsStep(0.35, 1.6e9);
  }

  const issues = checkNaNAndBounds("Supernova Chain Reaction", true);
  if (issues.length > 0) {
    assert.fail(`Supernova chain reaction caused state errors: ${issues[0]}`);
  }
});

// -------------------------------------------------------------
// TEST 3: Accretion of 1,000 Gas & Heavy Element Particles into Planets
// -------------------------------------------------------------
runTest("Accretion of 1,000 Gas/Heavy Element Particles Around Remnants", () => {
  const particles = getParticles();
  const bodies = getBodies();
  particles.length = 0;
  bodies.length = 0;

  const wd = new Body(-150, 0, 5e10, { C: 0.5, O: 0.5 });
  const ns = new Body(150, 0, 1e11, { Fe: 1.0 });
  bodies.push(wd, ns);

  const elems = ['H', 'He', 'C', 'N', 'O', 'Si', 'Fe', 'Au', 'Pt', 'U'];
  for (let i = 0; i < 1000; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 300;
    const center = i % 2 === 0 ? wd : ns;
    const px = center.x + Math.cos(angle) * r;
    const py = center.y + Math.sin(angle) * r;
    const v = Math.sqrt(G * center.mass / r) * 0.9;
    particles.push(new Particle(px, py, elems[i % elems.length], -Math.sin(angle) * v, Math.cos(angle) * v));
  }

  console.log(`   Simulating 1,000 particle accretion over 100 physics steps...`);
  const initCount = getParticles().length;

  for (let step = 0; step < 100; step++) {
    physicsStep(0.1, 1e7);
  }

  const finalParticles = getParticles().filter(p => p.active).length;
  console.log(`   Particles accreted from ${initCount} down to ${finalParticles}`);

  const issues = checkNaNAndBounds("1000 Particle Accretion", true);
  if (issues.length > 0) {
    assert.fail(`Accretion caused state errors: ${issues[0]}`);
  }
});

console.log("=================================================================");
console.log(`  STRESS TEST SUMMARY RESULTS`);
console.log(`  TOTAL: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
console.log("=================================================================");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
