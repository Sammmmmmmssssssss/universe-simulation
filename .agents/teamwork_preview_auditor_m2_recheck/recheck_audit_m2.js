const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log("==================================================================");
console.log("INDEPENDENT FORENSIC RE-CHECK AUDIT — MILESTONE 2 REMEDIATION");
console.log("==================================================================");

const targetPath = '/Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html';
const html = fs.readFileSync(targetPath, 'utf8');

// 1. Prohibited Pattern Scan
console.log("\n--- Phase 1: Prohibited Patterns & Facade Checks ---");

const prohibited = [
  { name: "Hardcoded Test Match / Flag", regex: /if\s*\(\s*.*(?:isTest|testMode|mockFlag).*\)/i },
  { name: "Hardcoded Function Return", regex: /function\s+(?:triggerSN|doMerge|classify|evolveStars)\s*\([^)]*\)\s*\{\s*return\s+(?:true|false|\{.*\}|"[^"]*");?\s*\}/ },
  { name: "Fake Test String Literal in Source", regex: /"PASSED: 4\/4"|"Forensic audit CLEAN"/ },
  { name: "Self-Certifying Test Environment Check", regex: /process\.env\.NODE_ENV/ }
];

let p1Success = true;
for(const p of prohibited) {
  if (p.regex.test(html)) {
    console.error(`[FAIL] Prohibited pattern detected: ${p.name}`);
    p1Success = false;
  } else {
    console.log(`[PASS] Clean: No ${p.name}`);
  }
}

// 2. Setup VM Context
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("[FATAL] Missing <script> tag");
  process.exit(1);
}

const mockElement = (id) => ({
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
  setTimeout: () => {}, clearTimeout: () => {}, requestAnimationFrame: () => {}, cancelAnimationFrame: () => {},
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
  document: { getElementById: mockElement, createElement: mockElement, querySelectorAll: () => [], addEventListener: () => {} },
  innerWidth: 1920, innerHeight: 1080
};
sandbox.globalThis = sandbox;
sandbox.global = sandbox;

const vmCode = scriptMatch[1] + `
; globalThis.Body = Body;
globalThis.Particle = Particle;
globalThis.bodies = bodies;
globalThis.particles = particles;
globalThis.evolveStars = evolveStars;
globalThis.triggerSN = triggerSN;
globalThis.doMerge = doMerge;
globalThis.physicsStep = physicsStep;
globalThis.MAX_P = MAX_P;
`;

vm.createContext(sandbox);
vm.runInContext(vmCode, sandbox);

const { Body, Particle, bodies, particles, triggerSN, doMerge, evolveStars, MAX_P } = sandbox;

console.log("\n--- Phase 2: Empirical Behavioral & Mathematical Verification ---");

let auditFailures = [];

// Check 2.1: triggerSN Mass Conservation
try {
  bodies.length = 0; particles.length = 0;
  const starMass = 4e11;
  const s = new Body(0, 0, starMass, { H: 0.1, He: 0.2, C: 0.3, O: 0.4 });
  bodies.push(s);

  triggerSN(s);

  let totalMass = 0;
  for (const b of bodies) if (b.active) totalMass += b.mass;
  for (const p of particles) if (p.active) totalMass += p.mass;

  assert.strictEqual(totalMass, starMass, `Mass not strictly conserved in triggerSN! Expected ${starMass}, got ${totalMass}`);
  console.log(`[PASS] triggerSN Mass Conservation: Progenitor mass ${starMass} == Remnant + Ejecta mass ${totalMass}`);
} catch (e) {
  console.error(`[FAIL] triggerSN Mass Conservation: ${e.message}`);
  auditFailures.push(`triggerSN Mass Conservation: ${e.message}`);
}

// Check 2.2: Remnant & Merge Composition Sum Normalization
try {
  bodies.length = 0; particles.length = 0;
  const s = new Body(0, 0, 4e11, { H: 0.5, He: 0.5 });
  bodies.push(s);
  triggerSN(s);

  const rem = bodies.find(b => b.active);
  assert.ok(rem, "Remnant body missing");

  let remSum = 0;
  for (const k in rem.composition) remSum += rem.composition[k];
  assert.ok(Math.abs(remSum - 1.0) < 1e-9, `Remnant composition sum != 1.0 (got ${remSum})`);
  console.log(`[PASS] triggerSN Remnant Composition Normalization: sum = ${remSum.toFixed(6)}`);

  // Merge composition check
  bodies.length = 0;
  const b1 = new Body(0, 0, 1e10, { H: 0.7, He: 0.3 });
  const b2 = new Body(0, 0, 1e10, { Fe: 0.6, Si: 0.4 });
  doMerge(b1, b2);

  const merged = bodies.find(b => b.active);
  let mergeSum = 0;
  for (const k in merged.composition) mergeSum += merged.composition[k];
  assert.ok(Math.abs(mergeSum - 1.0) < 1e-9, `Merged composition sum != 1.0 (got ${mergeSum})`);
  console.log(`[PASS] doMerge Composition Normalization: sum = ${mergeSum.toFixed(6)}`);
} catch (e) {
  console.error(`[FAIL] Composition Normalization: ${e.message}`);
  auditFailures.push(`Composition Normalization: ${e.message}`);
}

// Check 2.3: Body.classify Regimes & Transitions
try {
  // Gas giant at sub-stellar gas-rich regime (m = 1.6e10, H=0.8, He=0.2)
  const gGiant = new Body(0, 0, 1.6e10, { H: 0.8, He: 0.2 });
  assert.strictEqual(gGiant.type, 'gas_giant', `Sub-stellar gas body should be gas_giant, got ${gGiant.type}`);

  // Red dwarf (m = 5e10, H=0.75, He=0.25)
  const redD = new Body(0, 0, 5e10, { H: 0.75, He: 0.25 });
  assert.strictEqual(redD.type, 'red_dwarf', `m = 5e10 gas body should be red_dwarf, got ${redD.type}`);

  // White Dwarf Chandrasekhar Limit
  bodies.length = 0; particles.length = 0;
  const wd = new Body(0, 0, 1.5e11, { C: 0.5, O: 0.5 });
  wd.type = 'white_dwarf';
  wd.classify();
  assert.strictEqual(wd.active, false, "White dwarf over 1.4e11 mass should explode via triggerSN");

  // TOV limit neutron star collapse
  const ns = new Body(0, 0, 4.5e11, { Fe: 1.0 });
  ns.type = 'neutron_star';
  ns.classify();
  assert.strictEqual(ns.type, 'black_hole', `Neutron star over 4e11 should collapse to black_hole, got ${ns.type}`);

  console.log("[PASS] Body.classify Regimes & Boundary Limits Verified");
} catch (e) {
  console.error(`[FAIL] Body.classify: ${e.message}`);
  auditFailures.push(`Body.classify: ${e.message}`);
}

console.log("\n==================================================================");
if (!p1Success || auditFailures.length > 0) {
  console.error("VERDICT: INTEGRITY VIOLATION");
  process.exit(1);
} else {
  console.log("VERDICT: CLEAN");
  process.exit(0);
}
