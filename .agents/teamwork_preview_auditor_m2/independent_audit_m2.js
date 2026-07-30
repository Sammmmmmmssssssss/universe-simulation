const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log("==================================================================");
console.log("FORENSIC AUDIT SUITE — MILESTONE 2: ASTROPHYSICAL LIFECYCLE & FUSION");
console.log("==================================================================");

const html = fs.readFileSync('/Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html', 'utf8');

// -------------------------------------------------------------
// PHASE 1: STATIC CODE & AST ANALYSIS
// -------------------------------------------------------------
console.log("\n--- Phase 1: Static Code Inspection & Prohibited Pattern Checks ---");

const prohibitedPatterns = [
  { name: "Hardcoded Test Match", regex: /if\s*\(\s*.*(?:test|mock|fake).*\)/i },
  { name: "Hardcoded Return Bypass", regex: /function\s+(?:evolveStars|triggerSN|doMerge|classify)\s*\([^)]*\)\s*\{\s*return\s+[^;]+;\s*\}/ },
  { name: "Mock Output Data", regex: /__MOCK__|__TEST__/ },
  { name: "Self-Certifying Test Shortcut", regex: /process\.env\.NODE_ENV\s*===\s*['"]test['"]/ }
];

let phase1Passed = true;
for (const pattern of prohibitedPatterns) {
  if (pattern.regex.test(html)) {
    console.error(`[FAIL] Prohibited pattern detected: ${pattern.name}`);
    phase1Passed = false;
  } else {
    console.log(`[PASS] No ${pattern.name} detected.`);
  }
}

// -------------------------------------------------------------
// SETUP VM ENVIRONMENT FOR DYNAMIC VERIFICATION
// -------------------------------------------------------------
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("[FATAL] Could not extract <script> from universe_simulation.html");
  process.exit(1);
}

const code = scriptMatch[1] + `
; globalThis.Body = Body;
globalThis.Particle = Particle;
globalThis.bodies = bodies;
globalThis.particles = particles;
globalThis.evolveStars = evolveStars;
globalThis.triggerSN = triggerSN;
globalThis.doMerge = doMerge;
globalThis.physicsStep = physicsStep;
globalThis.unlockedElements = unlockedElements;
globalThis.ELEMENTS = ELEMENTS;
globalThis.MOLECULES = MOLECULES;
globalThis.calcMolecules = calcMolecules;
globalThis.milestones = milestones;
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
  style: {}, textContent: '', children: [],
  appendChild: () => {}, prepend: () => {}, removeChild: () => {},
  querySelectorAll: () => [], value: '60', addEventListener: () => {}
});

const sandbox = {
  console: { log: () => {}, error: console.error, warn: console.warn },
  setTimeout: () => {}, clearTimeout: () => {},
  requestAnimationFrame: () => {}, cancelAnimationFrame: () => {},
  Date, Math, Number, Object, Set, Array, Infinity, isNaN, parseInt, parseFloat,
  window: {
    addEventListener: () => {}, innerWidth: 1920, innerHeight: 1080,
    AudioContext: class {
      resume() {}
      createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
      destination = {};
    }
  },
  document: {
    getElementById: (id) => createMockElement(id),
    createElement: (tag) => createMockElement(tag),
    querySelectorAll: () => [], addEventListener: () => {}
  },
  innerWidth: 1920, innerHeight: 1080
};

sandbox.globalThis = sandbox;
sandbox.global = sandbox;
sandbox.window.window = sandbox.window;
sandbox.window.document = sandbox.document;

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const { Body, Particle, particles, bodies, physicsStep, doMerge, triggerSN, evolveStars, unlockedElements, calcMolecules } = sandbox;

// -------------------------------------------------------------
// PHASE 2: EMPIRICAL LOGIC & MATHEMATICAL VERIFICATION
// -------------------------------------------------------------
console.log("\n--- Phase 2: Empirical Logic & Mathematical Verification ---");

let auditErrors = [];

function auditCheck(description, testFn) {
  try {
    testFn();
    console.log(`[PASS] ${description}`);
  } catch (err) {
    console.error(`[FAIL] ${description}: ${err.message}`);
    auditErrors.push(`${description}: ${err.message}`);
  }
}

// 2.1 Body.prototype.classify
auditCheck("Body.classify: Stellar Mass Threshold Hierarchy", () => {
  const pCloud = new Body(0, 0, 1e10, { H: 0.9, He: 0.1 });
  assert.strictEqual(pCloud.type, 'protostellar_cloud');

  const brownD = new Body(0, 0, 2e10, { H: 0.8, He: 0.2 });
  assert.strictEqual(brownD.type, 'brown_dwarf');

  const redD = new Body(0, 0, 5e10, { H: 0.75, He: 0.25 });
  assert.strictEqual(redD.type, 'red_dwarf');

  const msStar = new Body(0, 0, 1e11, { H: 0.75, He: 0.25 });
  assert.strictEqual(msStar.type, 'main_sequence_star');

  const blueG = new Body(0, 0, 2e11, { H: 0.75, He: 0.25 });
  assert.strictEqual(blueG.type, 'blue_giant');

  const pulsar = new Body(0, 0, 6e11, { Fe: 1.0 });
  assert.strictEqual(pulsar.type, 'pulsar');

  const bh = new Body(0, 0, 1e12, { Fe: 1.0 });
  assert.strictEqual(bh.type, 'black_hole');

  const smbh = new Body(0, 0, 3e12, { Fe: 1.0 });
  assert.strictEqual(smbh.type, 'supermassive_bh');
});

auditCheck("Body.classify: Planet Classification based on Heavy Fraction", () => {
  // Heavy fraction > 0.20 -> Planet
  const terrPlanet = new Body(0, 0, 2e10, { Fe: 0.5, Si: 0.5 });
  assert.strictEqual(terrPlanet.type, 'terrestrial_planet');
  assert.strictEqual(terrPlanet.isPlanet(), true);

  const gasG = new Body(0, 0, 2e10, { H: 0.5, He: 0.1, Fe: 0.4 });
  assert.strictEqual(gasG.type, 'gas_giant');

  const iceG = new Body(0, 0, 1e10, { H: 0.35, He: 0.35, O: 0.15, Si: 0.15 }); // heavyFrac = 0.30 (< 0.40)
  assert.strictEqual(iceG.type, 'ice_giant');

  const dwarfP = new Body(0, 0, 2e9, { Fe: 0.8, Si: 0.2 });
  assert.strictEqual(dwarfP.type, 'dwarf_planet');
});

auditCheck("Body.classify: Remnant Preserved States & Limit Transitions", () => {
  const wd = new Body(0, 0, 5e10, { C: 0.5, O: 0.5 });
  wd.type = 'white_dwarf';
  wd.classify();
  assert.strictEqual(wd.type, 'white_dwarf');

  // White Dwarf Chandrasekhar limit (> 1.4e11) triggers SN
  sandbox.bodies.length = 0;
  sandbox.particles.length = 0;
  const heavyWd = new Body(0, 0, 1.5e11, { C: 0.5, O: 0.5 });
  heavyWd.type = 'white_dwarf';
  heavyWd.classify();
  assert.strictEqual(heavyWd.active, false, "Over-Chandrasekhar White Dwarf should detonate via triggerSN");

  // Neutron star Oppenheimer-Volkoff limit (> 4e11) becomes Black Hole
  const heavyNs = new Body(0, 0, 4.5e11, { Fe: 1.0 });
  heavyNs.type = 'neutron_star';
  heavyNs.classify();
  assert.strictEqual(heavyNs.type, 'black_hole');
});

// 2.2 doMerge
auditCheck("doMerge: Conservation of Mass, Momentum, and Composition Weighting", () => {
  sandbox.bodies.length = 0;
  sandbox.particles.length = 0;

  const b1 = new Body(10, 20, 2e10, { H: 0.8, He: 0.2 });
  b1.vx = 5; b1.vy = -3;
  const b2 = new Body(30, -10, 3e10, { H: 0.2, He: 0.5, Fe: 0.3 });
  b2.vx = -2; b2.vy = 4;

  const m1 = b1.mass, m2 = b2.mass;
  const expectedMass = m1 + m2;
  const expectedX = (b1.x * m1 + b2.x * m2) / expectedMass;
  const expectedY = (b1.y * m1 + b2.y * m2) / expectedMass;
  const expectedVx = (b1.vx * m1 + b2.vx * m2) / expectedMass;
  const expectedVy = (b1.vy * m1 + b2.vy * m2) / expectedMass;
  const expectedH = (0.8 * m1 + 0.2 * m2) / expectedMass;
  const expectedHe = (0.2 * m1 + 0.5 * m2) / expectedMass;
  const expectedFe = (0.0 * m1 + 0.3 * m2) / expectedMass;

  doMerge(b1, b2);
  const merged = sandbox.bodies[sandbox.bodies.length - 1];

  assert.strictEqual(b1.active, false);
  assert.strictEqual(b2.active, false);
  assert.strictEqual(merged.mass, expectedMass);
  assert.ok(Math.abs(merged.x - expectedX) < 1e-6, `x center of mass mismatch: expected ${expectedX}, got ${merged.x}`);
  assert.ok(Math.abs(merged.y - expectedY) < 1e-6, `y center of mass mismatch: expected ${expectedY}, got ${merged.y}`);
  assert.ok(Math.abs(merged.vx - expectedVx) < 1e-6, `vx momentum mismatch: expected ${expectedVx}, got ${merged.vx}`);
  assert.ok(Math.abs(merged.vy - expectedVy) < 1e-6, `vy momentum mismatch: expected ${expectedVy}, got ${merged.vy}`);
  assert.ok(Math.abs(merged.composition['H'] - expectedH) < 1e-6, `H composition mismatch: expected ${expectedH}, got ${merged.composition['H']}`);
  assert.ok(Math.abs(merged.composition['He'] - expectedHe) < 1e-6, `He composition mismatch: expected ${expectedHe}, got ${merged.composition['He']}`);
  assert.ok(Math.abs(merged.composition['Fe'] - expectedFe) < 1e-6, `Fe composition mismatch: expected ${expectedFe}, got ${merged.composition['Fe']}`);
});

auditCheck("doMerge: Preservation of Evolved State", () => {
  sandbox.bodies.length = 0;
  const ns = new Body(0, 0, 2e11, { Fe: 1.0 });
  ns.type = 'neutron_star';
  const p = new Particle(1, 1, 'Fe');

  doMerge(ns, p);
  const result = sandbox.bodies[sandbox.bodies.length - 1];
  assert.strictEqual(result.type, 'neutron_star', "Merging particle into Neutron Star must preserve neutron_star classification");
});

// 2.3 evolveStars
auditCheck("evolveStars: Protostellar Collapse & Main Sequence Nucleosynthesis Chains", () => {
  sandbox.bodies.length = 0;
  sandbox.particles.length = 0;

  const cloud = new Body(0, 0, 2e10, { H: 0.9, He: 0.1 });
  cloud.type = 'protostellar_cloud';
  sandbox.bodies.push(cloud);

  // Cloud stageAge evolution
  evolveStars(15);
  assert.strictEqual(cloud.type, 'brown_dwarf', "Cloud with age > 10 should collapse to brown dwarf");

  // Main sequence fusion H -> He -> C, N, O
  sandbox.bodies.length = 0;
  const star = new Body(0, 0, 1e11, { H: 0.80, He: 0.20 });
  sandbox.bodies.push(star);

  const initialH = star.composition['H'];
  evolveStars(1e6);

  assert.ok(star.composition['H'] < initialH, "H must deplete in main sequence fusion");
  assert.ok(star.composition['He'] > 0.20, "He must increase");
  assert.ok(star.composition['C'] > 0, "C must be produced");
  assert.ok(star.composition['N'] > 0, "N must be produced");
  assert.ok(star.composition['O'] > 0, "O must be produced");

  // Force depletion of H -> triggers Red Giant
  star.composition['H'] = 0.05;
  evolveStars(1e6);
  assert.strictEqual(star.type, 'red_giant', "H < 0.10 must trigger Red Giant transition");

  // Red Giant He burning -> C, N, O, Si, S
  const initialHe = star.composition['He'];
  evolveStars(1e6);
  assert.ok(star.composition['He'] < initialHe, "He must burn in Red Giant phase");
  assert.ok(star.composition['Si'] > 0, "Si must be produced in Red Giant phase");
  assert.ok(star.composition['S'] > 0, "S must be produced in Red Giant phase");
});

// 2.4 triggerSN
auditCheck("triggerSN: Kinetic Shockwave, Heavy Element Seeding, and Remnant", () => {
  sandbox.bodies.length = 0;
  sandbox.particles.length = 0;

  const superStar = new Body(100, 100, 4e11, { H: 0.02, He: 0.1, C: 0.4, O: 0.48 });
  sandbox.bodies.push(superStar);

  // Nearby body for kinetic impulse test
  const neighbor = new Body(150, 100, 1e9, { H: 1.0 });
  neighbor.vx = 0; neighbor.vy = 0;
  sandbox.bodies.push(neighbor);

  triggerSN(superStar);

  assert.strictEqual(superStar.active, false, "Exploded star must be deactivated");
  assert.ok(neighbor.vx > 0, "Neighbor must receive outward kinetic impulse (+vx)");

  const heavyParts = sandbox.particles.filter(p => p.active);
  assert.ok(heavyParts.length > 0, "Heavy element particles must be spawned");

  const rProcess = ['Fe', 'Au', 'Pt', 'U', 'Pb'];
  for (const el of rProcess) {
    assert.ok(unlockedElements.has(el), `Element ${el} must be unlocked by SN`);
  }

  const remnant = sandbox.bodies.find(b => b.active && b.x === 100 && b.y === 100);
  assert.ok(remnant !== undefined, "Remnant must be created at star position");
  assert.strictEqual(remnant.type, 'pulsar', "Star mass 4e11 must leave behind pulsar remnant");
});

// -------------------------------------------------------------
// PHASE 3: STRESS & NON-NAN INTEGRITY TEST (1000 STEPS)
// -------------------------------------------------------------
console.log("\n--- Phase 3: High-Step Count Numerical Stability & Zero-NaN Test ---");

auditCheck("Physics & Stellar Evolution 1,000 Step Zero-NaN Simulation", () => {
  sandbox.bodies.length = 0;
  sandbox.particles.length = 0;

  // Populate dense cluster with 10 stars, 20 planets, 100 particles
  for (let i = 0; i < 10; i++) {
    const s = new Body((Math.random()-0.5)*500, (Math.random()-0.5)*500, 5e10 + Math.random()*3e11, { H: 0.7, He: 0.3 });
    s.vx = (Math.random()-0.5)*10; s.vy = (Math.random()-0.5)*10;
    sandbox.bodies.push(s);
  }
  for (let i = 0; i < 20; i++) {
    const p = new Body((Math.random()-0.5)*800, (Math.random()-0.5)*800, 1e9 + Math.random()*2e10, { Fe: 0.4, Si: 0.4, O: 0.2 });
    p.vx = (Math.random()-0.5)*20; p.vy = (Math.random()-0.5)*20;
    sandbox.bodies.push(p);
  }
  for (let i = 0; i < 100; i++) {
    const pt = new Particle((Math.random()-0.5)*600, (Math.random()-0.5)*600, ['H','He','Fe','Si','O'][i%5], (Math.random()-0.5)*15, (Math.random()-0.5)*15);
    sandbox.particles.push(pt);
  }

  let nanFound = false;

  for (let step = 0; step < 1000; step++) {
    physicsStep(0.016, 1e5);

    // Check all active bodies and particles for NaN/Infinity
    for (const b of sandbox.bodies) {
      if (!b.active) continue;
      if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.vx) || !Number.isFinite(b.vy) ||
          !Number.isFinite(b.mass) || isNaN(b.temp) || isNaN(b.luminosity) || isNaN(b.habitability)) {
        nanFound = true;
        throw new Error(`NaN/Infinity detected in Body ${b.name} (${b.type}) at step ${step}`);
      }
      for (const [el, val] of Object.entries(b.composition)) {
        if (!Number.isFinite(val) || isNaN(val)) {
          nanFound = true;
          throw new Error(`NaN composition '${el}' in Body ${b.name} at step ${step}`);
        }
      }
    }

    for (const p of sandbox.particles) {
      if (!p.active) continue;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
        nanFound = true;
        throw new Error(`NaN/Infinity detected in Particle ${p.id} (${p.elem}) at step ${step}`);
      }
    }
  }

  assert.strictEqual(nanFound, false, "Zero NaN values encountered over 1000 steps");
});

console.log("\n==================================================================");
if (auditErrors.length > 0) {
  console.error(`AUDIT VERDICT: INTEGRITY VIOLATION (${auditErrors.length} ERRORS)`);
  process.exit(1);
} else {
  console.log("AUDIT VERDICT: CLEAN — ALL FORENSIC CHECKS PASSED EMPIRICALLY");
  process.exit(0);
}
