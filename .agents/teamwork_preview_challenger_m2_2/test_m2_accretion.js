const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.resolve(__dirname, '../../universe_simulation.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract JS script from HTML
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/i);
if (!scriptMatch) {
  console.error("FAILED to extract <script> tag from universe_simulation.html");
  process.exit(1);
}

let jsCode = scriptMatch[1];

// Append bindings to expose top-level let variables and functions to sandbox root
jsCode += `
globalThis.getParticles = () => particles;
globalThis.setParticles = (p) => { particles = p; };
globalThis.getBodies = () => bodies;
globalThis.setBodies = (b) => { bodies = b; };
globalThis.getMilestones = () => milestones;
globalThis.Particle = Particle;
globalThis.Body = Body;
globalThis.doMerge = doMerge;
globalThis.physicsStep = physicsStep;
globalThis.triggerSN = triggerSN;
`;

// Create Mock Browser / DOM environment
const mockCtx2D = {
  fillRect: () => {},
  clearRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  stroke: () => {},
  drawImage: () => {},
  save: () => {},
  restore: () => {},
  scale: () => {},
  translate: () => {},
  rotate: () => {},
  fillText: () => {},
  measureText: () => ({ width: 10 }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  fillStyle: '',
  strokeStyle: '',
  globalAlpha: 1,
  lineWidth: 1
};

const mockElement = () => ({
  textContent: '',
  innerHTML: '',
  style: {},
  children: [],
  classList: {
    add: () => {},
    remove: () => {},
    contains: () => false
  },
  appendChild: () => {},
  prepend: () => {},
  removeChild: () => {},
  addEventListener: () => {},
  getContext: (type) => (type === '2d' ? mockCtx2D : null),
  width: 1920,
  height: 1080
});

const sandbox = {
  console,
  Math,
  Number,
  Set,
  Map,
  Array,
  Object,
  Date,
  Infinity,
  isNaN,
  parseFloat,
  parseInt,
  setTimeout: (fn) => setTimeout(fn, 0),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn) => setInterval(fn, 1000),
  clearInterval: (id) => clearInterval(id),
  innerWidth: 1920,
  innerHeight: 1080,
  document: {
    getElementById: (id) => mockElement(),
    createElement: (tag) => mockElement(),
    body: mockElement(),
    addEventListener: () => {}
  },
  window: {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {}
  },
  AudioContext: class {
    createOscillator() {
      return {
        type: '',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        connect: () => {}
      };
    }
    createBufferSource() { return { connect: () => {}, start: () => {} }; }
    createBuffer() { return {}; }
    get destination() { return {}; }
    get currentTime() { return 0; }
  },
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {}
};

sandbox.webkitAudioContext = sandbox.AudioContext;

const ctx = vm.createContext(sandbox);

try {
  vm.runInContext(jsCode, ctx);
  console.log("Successfully initialized universe_simulation.html in VM context.");
} catch (err) {
  console.error("Error executing JS code in VM:", err);
  process.exit(1);
}

// Helper test harness
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  bugs: [],
  tests: []
};

function assert(condition, name, details = "") {
  results.total++;
  if (condition) {
    results.passed++;
    results.tests.push({ name, status: 'PASS', details });
    console.log(`✅ [PASS] ${name}`);
  } else {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', details });
    results.bugs.push({ name, details });
    console.error(`❌ [FAIL] ${name} - ${details}`);
  }
}

function resetUniverse() {
  ctx.setParticles([]);
  ctx.setBodies([]);
  const m = ctx.getMilestones();
  m.star = false;
  m.planet = false;
  m.supernova = false;
  m.life = false;
}

console.log("\n==================================================");
console.log("SUITE 1: PLANETARY ACCRETION & COMPOSITION LOGIC");
console.log("==================================================");

// Test 1.1: Gas particle merger composition tracking & planet formation
resetUniverse();
const p1 = new ctx.Particle(100, 100, 'Fe', 0, 0); // mass 1e9
const p2 = new ctx.Particle(102, 100, 'Si', 0, 0); // mass 1e9

ctx.doMerge(p1, p2);
const bodies1 = ctx.getBodies();
assert(bodies1.length === 1, "Two heavy particles merge into 1 Body");
const planet1 = bodies1[0];
assert(planet1.mass === 2e9, `Merged mass is exact sum (expected 2e9, got ${planet1.mass})`);
assert(Math.abs(planet1.composition['Fe'] - 0.5) < 1e-6, "Composition Fe is 50%");
assert(Math.abs(planet1.composition['Si'] - 0.5) < 1e-6, "Composition Si is 50%");
assert(planet1.type === 'dwarf_planet', `Classified as dwarf_planet for mass 2e9 heavy fraction 1.0 (got ${planet1.type})`);

// Test 1.2: Accretion up to Terrestrial Planet and Gas Giant thresholds
resetUniverse();
// Create heavy body mass 1.6e10, heavyFrac = 0.50
const rockyBody = new ctx.Body(0, 0, 1.6e10, { Fe: 0.3, Si: 0.3, H: 0.2, O: 0.2 });
assert(rockyBody.type === 'terrestrial_planet', `Mass 1.6e10 with 80% heavy elements is terrestrial_planet (got ${rockyBody.type})`);

// Gas giant with heavyFrac = 0.25 (> 0.20) and H frac = 0.50
const gasBodyHighHeavy = new ctx.Body(0, 0, 1.6e10, { H: 0.5, He: 0.25, O: 0.25 });
assert(gasBodyHighHeavy.type === 'gas_giant', `Mass 1.6e10 with heavyFrac 0.25 (>0.20) and H frac 0.5 is gas_giant (got ${gasBodyHighHeavy.type})`);

// Bug test: Low-heavy / Pure H-He gas giant (heavyFrac <= 0.20) with mass 1.6e10
const gasBodyPure = new ctx.Body(0, 0, 1.6e10, { H: 0.8, He: 0.2 });
assert(
  gasBodyPure.type === 'gas_giant',
  "Gas Giant classification for gas-rich body (H 80%, He 20%, mass 1.6e10)",
  `BUG FOUND in classify(): Pure H/He body of mass 1.6e10 is classified as '${gasBodyPure.type}' instead of 'gas_giant' because heavyFrac (0.0) <= 0.20 causes line 694 to bypass planet classification!`
);

console.log("\n==================================================");
console.log("SUITE 2: ORBITAL MOMENTUM & KINEMATICS CONSERVATION");
console.log("==================================================");

// Test 2.1: Two-body linear momentum conservation
resetUniverse();
const bodyA = new ctx.Body(10, 20, 2e10, { H: 1 });
bodyA.vx = 15; bodyA.vy = -8;

const bodyB = new ctx.Body(30, -10, 3e10, { H: 1 });
bodyB.vx = -10; bodyB.vy = 12;

const pxBefore = bodyA.mass * bodyA.vx + bodyB.mass * bodyB.vx;
const pyBefore = bodyA.mass * bodyA.vy + bodyB.mass * bodyB.vy;

ctx.doMerge(bodyA, bodyB);
const merged = ctx.getBodies()[0];
const pxAfter = merged.mass * merged.vx;
const pyAfter = merged.mass * merged.vy;

assert(Math.abs(pxAfter - pxBefore) < 1e-3, `Linear momentum Px conserved (Before: ${pxBefore}, After: ${pxAfter})`);
assert(Math.abs(pyAfter - pyBefore) < 1e-3, `Linear momentum Py conserved (Before: ${pyBefore}, After: ${pyAfter})`);

// Test 2.2: Center of Mass position preservation
const expectedCx = (10 * 2e10 + 30 * 3e10) / 5e10;
const expectedCy = (20 * 2e10 + (-10) * 3e10) / 5e10;
assert(Math.abs(merged.x - expectedCx) < 1e-6, `Center of mass X conserved (Expected ${expectedCx}, got ${merged.x})`);
assert(Math.abs(merged.y - expectedCy) < 1e-6, `Center of mass Y conserved (Expected ${expectedCy}, got ${merged.y})`);

// Test 2.3: Angular momentum quantification
const LxBefore = bodyA.mass * (10 * (-8) - 20 * 15) + bodyB.mass * (30 * 12 - (-10) * (-10));
const LxAfter = merged.mass * (merged.x * merged.vy - merged.y * merged.vx);
const deltaL = Math.abs(LxAfter - LxBefore);
console.log(`[INFO] Orbital Angular Momentum L before: ${LxBefore}, after: ${LxAfter}, delta: ${deltaL}`);
assert(Number.isFinite(merged.vx) && Number.isFinite(merged.vy), "Merged velocities are finite numbers (no NaN)");

console.log("\n==================================================");
console.log("SUITE 3: STELLAR REMNANT MASS THRESHOLDS & TRANSITIONS");
console.log("==================================================");

// Test 3.1: Chandrasekhar Limit (>1.4e11) for White Dwarf
resetUniverse();
const wd = new ctx.Body(0, 0, 1.35e11, { C: 0.5, O: 0.5 });
wd.type = 'white_dwarf';
wd.classify();
assert(wd.type === 'white_dwarf', `Initial state is white_dwarf (mass ${wd.mass})`);

// Accrete a body of mass 0.1e11 to push mass to 1.45e11 > 1.4e11
const donor = new ctx.Body(1, 1, 0.1e11, { Fe: 1 });
ctx.doMerge(wd, donor);

// When wd merges with donor, Chandrasekhar limit is exceeded (>1.4e11), triggering supernova
assert(ctx.getMilestones().supernova === true, "Chandrasekhar limit breach (>1.4e11) triggered Supernova milestone");
const remnantWD = ctx.getBodies().find(b => b.active);
assert(remnantWD !== undefined, "Supernova remnant body exists");
assert(remnantWD.mass === 1.45e11 * 0.25, `Supernova remnant mass is 25% of progenitor (expected ${1.45e11 * 0.25}, got ${remnantWD ? remnantWD.mass : null})`);

// Test 3.2: TOV Limit (>4e11) for Neutron Star / Pulsar collapse into Black Hole
resetUniverse();
const ns = new ctx.Body(0, 0, 3.8e11, { Fe: 0.5, Si: 0.5 });
ns.type = 'neutron_star';
ns.classify();
assert(ns.type === 'neutron_star', `Initial state is neutron_star (mass ${ns.mass})`);

// Accrete body of mass 0.3e11 -> total mass 4.1e11 > 4e11
const donorNS = new ctx.Body(1, 1, 0.3e11, { Fe: 1 });
ctx.doMerge(ns, donorNS);

const bhResult = ctx.getBodies().find(b => b.active);
assert(bhResult !== undefined && bhResult.type === 'black_hole', `Neutron star exceeding TOV limit (>4e11) collapses into black_hole (got ${bhResult ? bhResult.type : 'none'}, mass ${bhResult ? bhResult.mass : 'N/A'})`);
assert(bhResult && bhResult.temp === 0, `Black hole temperature set to 0K (got ${bhResult ? bhResult.temp : 'N/A'})`);
assert(bhResult && bhResult.luminosity === 0, `Black hole luminosity set to 0 (got ${bhResult ? bhResult.luminosity : 'N/A'})`);

// Test 3.3: Pulsar TOV Limit collapse
resetUniverse();
const pulsar = new ctx.Body(0, 0, 3.9e11, { Fe: 0.5, Si: 0.5 });
pulsar.type = 'pulsar';
pulsar.classify();
assert(pulsar.type === 'pulsar', `Initial state is pulsar (mass ${pulsar.mass})`);

const donorPulsar = new ctx.Body(1, 1, 0.2e11, { Fe: 1 });
ctx.doMerge(pulsar, donorPulsar);
const bhPulsarResult = ctx.getBodies().find(b => b.active);
assert(bhPulsarResult !== undefined && bhPulsarResult.type === 'black_hole', `Pulsar exceeding TOV limit (>4e11) collapses into black_hole (got ${bhPulsarResult ? bhPulsarResult.type : 'none'})`);

// Test 3.4: Supermassive Black Hole Transition (>2e12)
resetUniverse();
const bh = new ctx.Body(0, 0, 1.9e12, { Fe: 1 });
bh.type = 'black_hole';
bh.classify();
assert(bh.type === 'black_hole', `Initial state is black_hole (mass ${bh.mass})`);

const donorBH = new ctx.Body(1, 1, 0.2e12, { Fe: 1 });
ctx.doMerge(bh, donorBH);
const smbhResult = ctx.getBodies().find(b => b.active);
assert(smbhResult !== undefined && smbhResult.type === 'supermassive_bh', `Black hole exceeding 2e12 mass becomes supermassive_bh (got ${smbhResult ? smbhResult.type : 'none'}, mass ${smbhResult ? smbhResult.mass : 'N/A'})`);

// Test 3.5: Red Giant Direct Black Hole Collapse (>8e11)
resetUniverse();
const rg = new ctx.Body(0, 0, 8.5e11, { H: 0.2, He: 0.8 });
rg.type = 'red_giant';
rg.classify();
assert(rg.type === 'black_hole', `Red giant with mass >8e11 collapses to black_hole (got ${rg.type})`);

console.log("\n==================================================");
console.log("SUITE 4: RAPID PARTICLE MERGER BURSTS & STRESS HARNESS");
console.log("==================================================");

// Test 4.1: Bombardment of 60 gas particles onto a Neutron Star crossing TOV threshold
resetUniverse();
const targetNS = new ctx.Body(0, 0, 3.95e11, { Fe: 1 });
targetNS.type = 'neutron_star';
targetNS.classify();
const currentBodies = ctx.getBodies();
currentBodies.push(targetNS);
ctx.setBodies(currentBodies);

// Spawn 60 particles surrounding targetNS (1e9 mass each = 60e9 = 0.6e11 total mass -> total mass 4.55e11)
const particleList = [];
for (let i = 0; i < 60; i++) {
  const angle = (i / 60) * Math.PI * 2;
  const dist = 3; // within collision radius (5 + 3 = 8)
  const p = new ctx.Particle(Math.cos(angle) * dist, Math.sin(angle) * dist, 'H', 0, 0);
  particleList.push(p);
}
ctx.setParticles(particleList);

assert(ctx.getParticles().length === 60, "Spawned 60 particles for rapid merger burst");
assert(ctx.getBodies().length === 1, "Target neutron star initialized");

// Run 10 physics steps to simulate rapid accretion
let hasNaN = false;
for (let step = 0; step < 10; step++) {
  ctx.physicsStep(0.016, 1);
  for (const b of ctx.getBodies()) {
    if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.vx) || !Number.isFinite(b.vy) || !Number.isFinite(b.mass)) {
      hasNaN = true;
    }
  }
}

assert(!hasNaN, "Zero NaN values detected during rapid 60-particle merger burst");
const finalBody = ctx.getBodies().find(b => b.active);
assert(finalBody !== undefined, "Active body exists after burst");
assert(finalBody.type === 'black_hole', `Rapid particle burst crossing TOV limit collapsed neutron star into black_hole (got ${finalBody ? finalBody.type : 'none'}, mass ${finalBody ? finalBody.mass : 'N/A'})`);
assert(ctx.getParticles().filter(p => p.active).length === 0, `All 60 particles accreted into target body (remaining: ${ctx.getParticles().filter(p => p.active).length})`);

// Test 4.2: Mergers under high speed vs low speed
resetUniverse();
const fastP1 = new ctx.Particle(0, 0, 'H', 100, 0);
const fastP2 = new ctx.Particle(2, 0, 'H', -100, 0);
ctx.setParticles([fastP1, fastP2]);
ctx.physicsStep(0.016, 1);

// Particles with spd >= 35 should bounce elastically and not merge into a body
const formedBodiesFromFastParticles = ctx.getBodies().length;
assert(formedBodiesFromFastParticles === 0, "Fast particles (spd >= 35) bounce elastically and do NOT accrete into Body");

// Output results summary
console.log("\n==================================================");
console.log(`TEST SUMMARY: Total: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);
console.log("==================================================");

// Save report to JSON
const reportPath = path.resolve(__dirname, 'test_results_m2.json');
fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
console.log(`Saved detailed test results to ${reportPath}`);

// Exit code 0 so process completes and outputs full report
process.exit(0);
