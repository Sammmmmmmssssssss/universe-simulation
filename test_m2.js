const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log("=== RUNNING MILESTONE 2 ASTROPHYSICAL LIFECYCLE & FUSION TEST SUITE ===");

const html = fs.readFileSync('/Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html', 'utf8');

// Extract script tag content
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("FAIL: Could not find <script> tag in universe_simulation.html");
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
globalThis.unlockedElements = unlockedElements;
globalThis.ELEMENTS = ELEMENTS;
globalThis.MOLECULES = MOLECULES;
globalThis.calcMolecules = calcMolecules;
`;

// Create browser DOM mock environment
const createMockElement = (id) => {
  const el = {
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
    appendChild: (child) => el.children.push(child),
    prepend: (child) => el.children.unshift(child),
    removeChild: (child) => {
      const idx = el.children.indexOf(child);
      if (idx >= 0) el.children.splice(idx, 1);
      else el.children.pop();
    },
    querySelectorAll: () => [],
    value: '60',
    addEventListener: () => {}
  };
  return el;
};

const sandbox = {
  console,
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

// Helper to access sandbox variables
const {
  Body, Particle, particles, bodies, physicsStep, doMerge, triggerSN, evolveStars,
  unlockedElements, ELEMENTS, MOLECULES, calcMolecules
} = sandbox;

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    testsFailed++;
  }
}

// -------------------------------------------------------------
// TEST 1: Stellar Mass Thresholds & Lifecycle Classifications
// -------------------------------------------------------------
runTest("Stellar Mass Thresholds & Lifecycle States", () => {
  const protostellar = new Body(0, 0, 1e10, { H: 0.9, He: 0.1 });
  assert.strictEqual(protostellar.type, 'protostellar_cloud', "Mass 1e10 should be protostellar_cloud");

  const brownDwarf = new Body(0, 0, 2e10, { H: 0.8, He: 0.2 });
  assert.strictEqual(brownDwarf.type, 'brown_dwarf', "Mass 2e10 should be brown_dwarf");

  const redDwarf = new Body(0, 0, 5e10, { H: 0.75, He: 0.25 });
  assert.strictEqual(redDwarf.type, 'red_dwarf', "Mass 5e10 should be red_dwarf");

  const mainSeq = new Body(0, 0, 1e11, { H: 0.75, He: 0.25 });
  assert.strictEqual(mainSeq.type, 'main_sequence_star', "Mass 1e11 should be main_sequence_star");

  const blueGiant = new Body(0, 0, 2e11, { H: 0.75, He: 0.25 });
  assert.strictEqual(blueGiant.type, 'blue_giant', "Mass 2e11 should be blue_giant");

  const whiteDwarf = new Body(0, 0, 5e10, { C: 0.5, O: 0.5 });
  whiteDwarf.type = 'white_dwarf';
  whiteDwarf.classify();
  assert.strictEqual(whiteDwarf.type, 'white_dwarf', "White Dwarf state should be preserved");

  const neutronStar = new Body(0, 0, 2e11, { Fe: 1.0 });
  neutronStar.type = 'neutron_star';
  neutronStar.classify();
  assert.strictEqual(neutronStar.type, 'neutron_star', "Neutron Star state should be preserved");

  const pulsar = new Body(0, 0, 6e11, { Fe: 1.0 });
  assert.strictEqual(pulsar.type, 'pulsar', "Mass 6e11 should be pulsar");

  const blackHole = new Body(0, 0, 1e12, { Fe: 1.0 });
  assert.strictEqual(blackHole.type, 'black_hole', "Mass 1e12 should be black_hole");

  const supermassive = new Body(0, 0, 3e12, { Fe: 1.0 });
  assert.strictEqual(supermassive.type, 'supermassive_bh', "Mass 3e12 should be supermassive_bh");
});

// -------------------------------------------------------------
// TEST 2: Stellar Nucleosynthesis and Fusion Chains
// -------------------------------------------------------------
runTest("Stellar Nucleosynthesis & Element Accumulation", () => {
  sandbox.bodies.length = 0;
  sandbox.particles.length = 0;

  const star = new Body(0, 0, 1e11, { H: 0.80, He: 0.20 });
  sandbox.bodies.push(star);

  const initialH = star.composition['H'];
  const initialHe = star.composition['He'];

  // Run evolution over main sequence phase
  for (let i = 0; i < 3; i++) {
    evolveStars(1e6); // 1 million years per step
  }

  assert.ok(star.composition['H'] < initialH, "Hydrogen should decrease during fusion");
  assert.ok(star.composition['He'] > initialHe, "Helium should accumulate during fusion");
  assert.ok(star.composition['C'] > 0, "Carbon should be synthesized in fusion chain");
  assert.ok(star.composition['O'] > 0, "Oxygen should be synthesized in fusion chain");
  assert.ok(unlockedElements.has('C'), "Carbon should be unlocked in UI/registry");

  // Force Star into Red Giant and test He fusion
  star.type = 'red_giant';
  star.composition['He'] = 0.50;
  const initialRedHe = star.composition['He'];
  for (let i = 0; i < 3; i++) {
    evolveStars(1e6);
  }
  assert.ok(star.composition['He'] < initialRedHe, "Red giant should burn Helium");
  assert.ok(star.composition['Si'] > 0, "Silicon should be synthesized during Red Giant He fusion");
  assert.ok(unlockedElements.has('Si'), "Silicon should be unlocked");
});

// -------------------------------------------------------------
// TEST 3: Supernova Heavy Element Seeding & Kinetic Shockwave
// -------------------------------------------------------------
runTest("Supernova r/s-Process Seeding & Kinetic Shockwaves", () => {
  sandbox.bodies.length = 0;
  sandbox.particles.length = 0;

  const massiveStar = new Body(0, 0, 3e11, { H: 0.1, He: 0.3, C: 0.3, O: 0.3 });
  sandbox.bodies.push(massiveStar);

  // Add a nearby target body to verify kinetic shockwave push
  const targetBody = new Body(50, 0, 1e9, { H: 1.0 });
  sandbox.bodies.push(targetBody);
  const initialVx = targetBody.vx;

  triggerSN(massiveStar);

  assert.ok(!massiveStar.active, "Star should be deactivated after supernova detonation");
  assert.ok(targetBody.vx > initialVx, "Nearby body should be pushed away by kinetic shockwave");

  const spawnedHeavyParticles = sandbox.particles.filter(p => p.active);
  assert.ok(spawnedHeavyParticles.length > 0, "Supernova should scatter heavy element particles");

  const rProcessElements = ['Fe', 'Au', 'Pt', 'U'];
  for (const elem of rProcessElements) {
    assert.ok(unlockedElements.has(elem), `r-process element ${elem} should be unlocked after supernova`);
  }

  // Verify remnant creation
  const remnants = sandbox.bodies.filter(b => b.active && (b.type === 'neutron_star' || b.type === 'pulsar' || b.type === 'black_hole' || b.type === 'white_dwarf'));
  assert.ok(remnants.length > 0, "Supernova should leave behind a stellar remnant");
});

// -------------------------------------------------------------
// TEST 4: Planetary Accretion & Elemental Composition Tracking
// -------------------------------------------------------------
runTest("Planetary Accretion & Composition Merging", () => {
  sandbox.bodies.length = 0;
  sandbox.particles.length = 0;

  // Accrete a heavy metal core (Fe, Si) with surrounding gas (H, O)
  const partFe = new Particle(0, 0, 'Fe', 2, 0);
  const partSi = new Particle(0.5, 0.5, 'Si', 0, 2);
  const partO = new Particle(-0.5, 0.5, 'O', 1, 1);
  const partH = new Particle(0, -0.5, 'H', -1, 0);

  // Merge particles into planet
  doMerge(partFe, partSi);
  const body1 = sandbox.bodies[sandbox.bodies.length - 1];
  doMerge(body1, partO);
  const body2 = sandbox.bodies[sandbox.bodies.length - 1];
  doMerge(body2, partH);
  const planet = sandbox.bodies[sandbox.bodies.length - 1];

  assert.ok(planet.isPlanet() || planet.type === 'terrestrial_planet' || planet.type === 'dwarf_planet', `Accreted body should be classified as a planet (got ${planet.type})`);
  assert.ok(planet.composition['Fe'] > 0, "Planet composition should contain Fe");
  assert.ok(planet.composition['Si'] > 0, "Planet composition should contain Si");
  assert.ok(planet.composition['O'] > 0, "Planet composition should contain O");
  assert.ok(planet.composition['H'] > 0, "Planet composition should contain H");

  // Sum of composition fractions should equal ~1.0
  const compSum = Object.values(planet.composition).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(compSum - 1.0) < 1e-5, `Composition fractions must sum to 1.0 (got ${compSum})`);

  // Verify molecules synthesis on accreted planet
  calcMolecules();
  assert.ok(planet.molecules['FeO'] || planet.molecules['SiO₂'] || planet.molecules['H₂O'], "Accreted elements should synthesize molecules on planet");
});

console.log(`\n=== TEST RESULTS SUMMARY ===`);
console.log(`PASSED: ${testsPassed}`);
console.log(`FAILED: ${testsFailed}`);

if (testsFailed > 0) {
  console.error("SUITE FAILED!");
  process.exit(1);
} else {
  console.log("ALL TESTS PASSED CLEANLY (0 ERRORS)");
  process.exit(0);
}
