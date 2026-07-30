const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log("=== ADVERSARIAL STRESS-TEST SUITE FOR MILESTONE 2 ===");

const html = fs.readFileSync('/Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html', 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("FAIL: Could not find <script> tag in universe_simulation.html");
  process.exit(1);
}

const code = scriptMatch[1] + `
; globalThis.Body = Body;
globalThis.Particle = Particle;
globalThis.getBodies = () => bodies;
globalThis.getParticles = () => particles;
globalThis.resetArrays = () => { particles.length = 0; bodies.length = 0; };
globalThis.evolveStars = evolveStars;
globalThis.triggerSN = triggerSN;
globalThis.doMerge = doMerge;
globalThis.unlockedElements = unlockedElements;
globalThis.ELEMENTS = ELEMENTS;
globalThis.MOLECULES = MOLECULES;
globalThis.calcMolecules = calcMolecules;
globalThis.physicsStep = physicsStep;
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
  appendChild: () => {},
  prepend: () => {},
  removeChild: () => {},
  querySelectorAll: () => [],
  value: '60',
  addEventListener: () => {}
});

const sandbox = {
  console,
  setTimeout: () => {},
  clearTimeout: () => {},
  requestAnimationFrame: () => {},
  cancelAnimationFrame: () => {},
  Date, Math, Number, Object, Set, Array, Infinity, isNaN, parseInt, parseFloat,
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

vm.createContext(sandbox);
vm.runInContext(code, sandbox);

const { Body, Particle, getBodies, getParticles, resetArrays, doMerge, triggerSN, evolveStars, calcMolecules, physicsStep, unlockedElements } = sandbox;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (e) {
    console.error(`[FAIL] ${name}:`, e.message, e.stack);
    failed++;
  }
}

// 1. Chandrasekhar Limit Test (White Dwarf accreted mass > 1.4e11 triggers Supernova)
test("Chandrasekhar Limit Detonation on White Dwarf Mass Overload", () => {
  resetArrays();
  const bodies = getBodies();
  const particles = getParticles();

  const wd = new Body(0, 0, 1.3e11, { C: 0.5, O: 0.5 });
  wd.type = 'white_dwarf';
  bodies.push(wd);

  // Accrete particle to push mass > 1.4e11
  const feeder = new Body(0, 0, 2e10, { C: 1.0 });
  doMerge(wd, feeder);

  // The original WD should be deactivated by triggerSN or merged
  assert.ok(!wd.active, "White dwarf should be deactivated after Chandrasekhar detonation");
  assert.ok(unlockedElements.has('Au') || unlockedElements.has('Fe'), "Supernova r-process elements unlocked");
  assert.ok(particles.length > 0, "Supernova heavy particles created");
});

// 2. TOV Limit Test (Neutron Star accreted mass > 4e11 collapses to Black Hole)
test("TOV Limit Collapse of Neutron Star to Black Hole", () => {
  resetArrays();
  const bodies = getBodies();

  const ns = new Body(0, 0, 3.8e11, { Fe: 1.0 });
  ns.type = 'neutron_star';
  bodies.push(ns);

  const acc = new Body(0, 0, 3e10, { Fe: 1.0 });
  doMerge(ns, acc);

  const remnantBH = bodies.find(b => b.active && (b.type === 'black_hole' || b.type === 'supermassive_bh'));
  assert.ok(remnantBH, "Neutron star above TOV limit (4e11) must collapse into Black Hole");
  assert.strictEqual(remnantBH.type, 'black_hole', "Type must be black_hole");
});

// 3. Multi-Particle Accretion Mass & Composition Conservation Test
test("100-Particle Accretion Mass & Composition Conservation", () => {
  resetArrays();
  const bodies = getBodies();

  let expectedMass = 0;
  let expectedHMass = 0;
  let expectedFeMass = 0;

  const p1 = new Particle(0, 0, 'Fe', 1, 0);
  p1.mass = 1e9;
  expectedMass += 1e9;
  expectedFeMass += 1e9;

  const p2 = new Particle(1, 0, 'H', -1, 0);
  p2.mass = 2e9;
  expectedMass += 2e9;
  expectedHMass += 2e9;

  doMerge(p1, p2);

  let currentBody = bodies[bodies.length - 1];

  for (let i = 0; i < 98; i++) {
    const isH = i % 2 === 0;
    const elem = isH ? 'H' : 'Fe';
    const p = new Particle(Math.sin(i), Math.cos(i), elem, 0, 0);
    p.mass = 5e8;
    expectedMass += 5e8;
    if (isH) expectedHMass += 5e8;
    else expectedFeMass += 5e8;

    doMerge(currentBody, p);
    currentBody = bodies[bodies.length - 1];
  }

  assert.strictEqual(bodies.filter(b => b.active).length, 1, "Exactly 1 active body after mergers");
  const finalBody = bodies.find(b => b.active);

  assert.ok(Math.abs(finalBody.mass - expectedMass) < 1e-3, `Mass conserved: expected ${expectedMass}, got ${finalBody.mass}`);

  const calcHFrac = expectedHMass / expectedMass;
  const calcFeFrac = expectedFeMass / expectedMass;

  assert.ok(Math.abs((finalBody.composition['H'] || 0) - calcHFrac) < 1e-4, `H fraction accurate: expected ${calcHFrac}, got ${finalBody.composition['H']}`);
  assert.ok(Math.abs((finalBody.composition['Fe'] || 0) - calcFeFrac) < 1e-4, `Fe fraction accurate: expected ${calcFeFrac}, got ${finalBody.composition['Fe']}`);

  const compSum = Object.values(finalBody.composition).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(compSum - 1.0) < 1e-5, "Sum of composition fractions must equal 1.0");
});

// 4. Extended Evolution & Zero-NaN Stress Test
test("1,000 Step Physics & Fusion Stress Test (Zero NaN)", () => {
  resetArrays();
  const bodies = getBodies();
  const particles = getParticles();

  const bg = new Body(0, 0, 2e11, { H: 0.8, He: 0.2 });
  const ms = new Body(300, 300, 1e11, { H: 0.75, He: 0.25 });
  const rd = new Body(-300, 200, 5e10, { H: 0.7, He: 0.3 });

  bodies.push(bg, ms, rd);

  for (let i = 0; i < 15; i++) {
    const el = i < 10 ? 'H' : 'Fe';
    particles.push(new Particle(100 + i * 20, 100 - i * 15, el, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10));
  }

  for (let step = 0; step < 1000; step++) {
    physicsStep(0.016, 1e5);
  }

  const currentBodies = getBodies();
  const currentParticles = getParticles();

  const allActive = [...currentParticles.filter(p => p.active), ...currentBodies.filter(b => b.active)];
  for (const obj of allActive) {
    assert.ok(Number.isFinite(obj.x), `x must be finite at step 1000 for ${obj.id}`);
    assert.ok(Number.isFinite(obj.y), `y must be finite at step 1000 for ${obj.id}`);
    assert.ok(Number.isFinite(obj.vx), `vx must be finite at step 1000 for ${obj.id}`);
    assert.ok(Number.isFinite(obj.vy), `vy must be finite at step 1000 for ${obj.id}`);
    assert.ok(Number.isFinite(obj.mass), `mass must be finite at step 1000 for ${obj.id}`);
    if (obj instanceof Body) {
      assert.ok(Number.isFinite(obj.temp), `temp must be finite for body ${obj.id}`);
      assert.ok(Number.isFinite(obj.luminosity), `luminosity must be finite for body ${obj.id}`);
    }
  }
});

// 5. Planetary Accretion & Molecule Synthesis from Supernova Ejecta
test("Planetary Accretion & Molecule Synthesis from SN Ejecta", () => {
  resetArrays();
  const bodies = getBodies();
  const particles = getParticles();

  const star = new Body(0, 0, 3e11, { H: 0.1, He: 0.3, C: 0.3, O: 0.3 });
  bodies.push(star);

  triggerSN(star);

  const currentParticles = getParticles();
  const heavyP = currentParticles.filter(p => p.active);
  assert.ok(heavyP.length >= 4, `Should have heavy particles from SN (got ${heavyP.length})`);

  let planetSeed = heavyP[0];
  for (let i = 1; i < heavyP.length; i++) {
    doMerge(planetSeed, heavyP[i]);
    const currentBodies = getBodies();
    planetSeed = currentBodies[currentBodies.length - 1];
  }

  assert.ok(planetSeed.isPlanet(), `Merged SN ejecta should form a planet (got type: ${planetSeed.type})`);
  calcMolecules();
  assert.ok(Object.keys(planetSeed.molecules).length > 0, "Planetary molecules synthesized from SN ejecta");
});

console.log("\n=== SUMMARY ===");
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL ADVERSARIAL STRESS-TESTS PASSED CLEANLY!");
  process.exit(0);
}
