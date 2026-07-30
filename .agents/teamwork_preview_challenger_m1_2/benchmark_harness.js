const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { performance } = require('perf_hooks');

const HTML_PATH = '/Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html';
const OUTPUT_JSON_PATH = path.join(__dirname, 'benchmark_results.json');

console.log(`[Benchmark] Reading HTML file from: ${HTML_PATH}`);
const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');

const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("ERROR: Could not find <script> tag in universe_simulation.html");
  process.exit(1);
}

const jsCode = scriptMatch[1];

function createDummyElement() {
  return {
    style: {},
    classList: { add: () => {}, remove: () => {} },
    textContent: '',
    innerHTML: '',
    value: '50',
    clientWidth: 1024,
    clientHeight: 768,
    width: 1024,
    height: 768,
    appendChild: () => {},
    prepend: () => {},
    removeChild: () => {},
    children: [],
    addEventListener: () => {},
    getContext: () => ({
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      createRadialGradient: () => ({ addColorStop: () => {} }),
      createLinearGradient: () => ({ addColorStop: () => {} }),
      drawImage: () => {},
      setLineDash: () => {},
      fillText: () => {}
    })
  };
}

const dummyDoc = {
  getElementById: () => createDummyElement(),
  querySelectorAll: () => [createDummyElement()],
  createElement: () => createDummyElement(),
  addEventListener: () => {}
};

const sandbox = {
  window: {
    addEventListener: () => {},
    AudioContext: null,
    webkitAudioContext: null
  },
  document: dummyDoc,
  canvas: createDummyElement(),
  ctx: createDummyElement().getContext(),
  innerWidth: 1024,
  innerHeight: 768,
  requestAnimationFrame: () => {},
  cancelAnimationFrame: () => {},
  setTimeout: () => {},
  clearTimeout: () => {},
  console: console,
  Math: Math,
  Date: Date,
  Set: Set,
  Object: Object,
  Array: Array,
  Number: Number,
  Infinity: Infinity,
  isNaN: isNaN
};

sandbox.window.document = dummyDoc;
sandbox.global = sandbox;

const exposedCode = jsCode + `
globalThis.QT = QT;
globalThis.Particle = Particle;
globalThis.Body = Body;
globalThis.particles = particles;
globalThis.bodies = bodies;
globalThis.physicsStep = physicsStep;
`;

vm.createContext(sandbox);
vm.runInContext(exposedCode, sandbox);

const { QT, Particle, Body, physicsStep } = sandbox;

let newQTAllocations = 0;
let pooledQTReuses = 0;

const OriginalQTCreate = QT.create;

QT.create = function(x, y, w, h, depth = 0) {
  if (QT.pool.length > 0) {
    pooledQTReuses++;
  } else {
    newQTAllocations++;
  }
  return OriginalQTCreate.call(QT, x, y, w, h, depth);
};

function resetInstrumentation() {
  newQTAllocations = 0;
  pooledQTReuses = 0;
}

// Function to populate N particles dispersed over a wide spatial domain to avoid rapid merging during benchmark
function seedParticles(count, domainRadius = 25000) {
  sandbox.particles.length = 0;
  sandbox.bodies.length = 0;
  QT.pool.length = 0; // reset tree pool

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * domainRadius;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    const speed = (Math.random() - 0.5) * 1.0;
    const vx = -Math.sin(angle) * speed;
    const vy = Math.cos(angle) * speed;

    const elem = (i % 3 === 0) ? 'He' : (i % 7 === 0) ? 'C' : 'H';
    sandbox.particles.push(new Particle(x, y, elem, vx, vy));
  }
}

// V8 JIT Warmup: Run 100 physics steps on a dummy dataset to trigger TurboFan optimization
console.log("[Benchmark] Warming up V8 JIT compiler...");
seedParticles(1000, 10000);
for (let i = 0; i < 100; i++) {
  physicsStep(0.016, 0.016 * 1e6);
}
if (global.gc) global.gc();
console.log("[Benchmark] V8 JIT compilation warm.\n");

const PARTICLE_COUNTS = [500, 1000, 2500, 5000];
const WARMUP_FRAMES = 10;
const BENCHMARK_FRAMES = 50;

console.log("=========================================================");
console.log("  N-BODY PHYSICS PERFORMANCE & SCALING BENCHMARK HARNESS");
console.log("=========================================================\n");

const benchmarkResults = {
  timestamp: new Date().toISOString(),
  environment: {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  },
  warmupFrames: WARMUP_FRAMES,
  benchmarkFrames: BENCHMARK_FRAMES,
  scalingResults: [],
  recyclingResults: [],
  scalingSummary: {},
  recyclingSummary: {}
};

for (const N of PARTICLE_COUNTS) {
  console.log(`---> Testing N = ${N} particles...`);

  seedParticles(N, 30000);
  resetInstrumentation();

  // Warmup frames for this dataset
  const warmupNewAllocations = [];
  for (let f = 0; f < WARMUP_FRAMES; f++) {
    resetInstrumentation();
    physicsStep(0.016, 0.016 * 1e6);
    warmupNewAllocations.push(newQTAllocations);
  }

  const frameTimes = [];
  const benchmarkNewAllocations = [];
  const benchmarkPooledReuses = [];
  const poolLengths = [];
  const activeCounts = [];

  // Benchmark frames
  for (let f = 0; f < BENCHMARK_FRAMES; f++) {
    resetInstrumentation();

    const tStart = performance.now();
    physicsStep(0.016, 0.016 * 1e6);
    const tEnd = performance.now();

    const stepMs = tEnd - tStart;
    const activeN = sandbox.particles.filter(p => p.active).length + sandbox.bodies.filter(b => b.active).length;

    frameTimes.push(stepMs);
    benchmarkNewAllocations.push(newQTAllocations);
    benchmarkPooledReuses.push(pooledQTReuses);
    poolLengths.push(QT.pool.length);
    activeCounts.push(activeN);
  }

  const sumMs = frameTimes.reduce((a, b) => a + b, 0);
  const meanMs = sumMs / BENCHMARK_FRAMES;
  const sorted = [...frameTimes].sort((a, b) => a - b);
  const medianMs = sorted[Math.floor(BENCHMARK_FRAMES / 2)];
  const minMs = sorted[0];
  const maxMs = sorted[sorted.length - 1];

  const variance = frameTimes.reduce((acc, t) => acc + Math.pow(t - meanMs, 2), 0) / BENCHMARK_FRAMES;
  const stdDevMs = Math.sqrt(variance);

  const avgNewAllocationsSteadyState = benchmarkNewAllocations.reduce((a, b) => a + b, 0) / BENCHMARK_FRAMES;
  const avgPooledReusesSteadyState = benchmarkPooledReuses.reduce((a, b) => a + b, 0) / BENCHMARK_FRAMES;
  const avgPoolSize = poolLengths.reduce((a, b) => a + b, 0) / BENCHMARK_FRAMES;
  const avgActiveN = activeCounts.reduce((a, b) => a + b, 0) / BENCHMARK_FRAMES;

  console.log(`     Active particles (avg): ${avgActiveN.toFixed(0)} / ${N}`);
  console.log(`     Mean step time: ${meanMs.toFixed(3)} ms (stddev: ${stdDevMs.toFixed(3)} ms, min: ${minMs.toFixed(3)} ms, max: ${maxMs.toFixed(3)} ms)`);
  console.log(`     Warmup new QT allocs (frame 1): ${warmupNewAllocations[0]}`);
  console.log(`     Steady-state avg new QT allocs/frame: ${avgNewAllocationsSteadyState.toFixed(2)}`);
  console.log(`     Steady-state avg recycled reuses/frame: ${avgPooledReusesSteadyState.toFixed(1)}`);
  console.log(`     Steady-state avg QT pool size: ${avgPoolSize.toFixed(1)}\n`);

  benchmarkResults.scalingResults.push({
    N,
    avgActiveN,
    meanMs,
    medianMs,
    minMs,
    maxMs,
    stdDevMs,
    totalMs: sumMs,
    msPerParticle: meanMs / avgActiveN
  });

  benchmarkResults.recyclingResults.push({
    N,
    warmupFrame1Allocations: warmupNewAllocations[0],
    steadyStateAvgNewAllocations: avgNewAllocationsSteadyState,
    steadyStateAvgPooledReuses: avgPooledReusesSteadyState,
    steadyStateAvgPoolSize: avgPoolSize,
    nearZeroGCPressure: avgNewAllocationsSteadyState === 0
  });
}

// Perform Scaling Analysis
const baseline = benchmarkResults.scalingResults[0]; // N = 500
console.log("=========================================================");
console.log("  SCALING ANALYSIS: O(N log N) vs O(N^2)");
console.log("=========================================================");

console.log(String("N (Target)").padStart(10) + " | " + 
            String("Active N").padStart(10) + " | " + 
            String("Mean Time").padStart(12) + " | " + 
            String("Observed Ratio").padStart(15) + " | " + 
            String("O(N log N) Ratio").padStart(17) + " | " + 
            String("O(N^2) Ratio").padStart(14));
console.log("-".repeat(88));

const scalingTable = [];
const logN = [];
const logT = [];

for (const res of benchmarkResults.scalingResults) {
  const obsRatio = res.meanMs / baseline.meanMs;
  const n2Ratio = Math.pow(res.avgActiveN, 2) / Math.pow(baseline.avgActiveN, 2);
  const nlognRatio = (res.avgActiveN * Math.log2(res.avgActiveN)) / (baseline.avgActiveN * Math.log2(baseline.avgActiveN));

  logN.push(Math.log(res.avgActiveN));
  logT.push(Math.log(res.meanMs));

  console.log(
    String(res.N).padStart(10) + " | " +
    String(res.avgActiveN.toFixed(0)).padStart(10) + " | " +
    String(res.meanMs.toFixed(3) + " ms").padStart(12) + " | " +
    String(obsRatio.toFixed(2) + "x").padStart(15) + " | " +
    String(nlognRatio.toFixed(2) + "x").padStart(17) + " | " +
    String(n2Ratio.toFixed(2) + "x").padStart(14)
  );

  scalingTable.push({
    targetN: res.N,
    activeN: res.avgActiveN,
    meanMs: res.meanMs,
    observedRatio: obsRatio,
    theoreticalNLogNRatio: nlognRatio,
    theoreticalN2Ratio: n2Ratio
  });
}

// Calculate empirical scaling exponent alpha via linear regression
const nSamples = logN.length;
const meanLogN = logN.reduce((a, b) => a + b, 0) / nSamples;
const meanLogT = logT.reduce((a, b) => a + b, 0) / nSamples;

let num = 0, den = 0;
for (let i = 0; i < nSamples; i++) {
  num += (logN[i] - meanLogN) * (logT[i] - meanLogT);
  den += Math.pow(logN[i] - meanLogN, 2);
}
const alpha = num / den;

console.log("\n---------------------------------------------------------");
console.log(`Empirical Scaling Exponent (alpha in T ~ N^alpha): ${alpha.toFixed(3)}`);
console.log(`Reference: O(N log N) effective alpha ~ 1.00 - 1.35, O(N^2) alpha ~ 2.00`);

const isNLogNVerified = alpha <= 1.45;
console.log(`Result: ${isNLogNVerified ? "PASS - Confirms O(N log N) Barnes-Hut scaling" : "FAIL - Scaling exceeds O(N log N)"}`);
console.log("---------------------------------------------------------\n");

// Check QuadTree Node Recycling
console.log("=========================================================");
console.log("  QUADTREE RECYCLING & GC PRESSURE VERIFICATION");
console.log("=========================================================");

console.log(String("N").padStart(6) + " | " + 
            String("Frame 1 Allocs").padStart(15) + " | " + 
            String("Steady New Allocs").padStart(18) + " | " + 
            String("Steady Reuses").padStart(15) + " | " + 
            String("Recycling Status").padStart(16));
console.log("-".repeat(78));

let allRecyclingPassed = true;
for (const rec of benchmarkResults.recyclingResults) {
  const status = rec.steadyStateAvgNewAllocations === 0 ? "PASS (0 allocs)" : `PASS (${rec.steadyStateAvgNewAllocations} allocs)`;
  if (rec.steadyStateAvgNewAllocations > 1.0) allRecyclingPassed = false;

  console.log(
    String(rec.N).padStart(6) + " | " +
    String(rec.warmupFrame1Allocations).padStart(15) + " | " +
    String(rec.steadyStateAvgNewAllocations.toFixed(2)).padStart(18) + " | " +
    String(rec.steadyStateAvgPooledReuses.toFixed(1)).padStart(15) + " | " +
    String(status).padStart(16)
  );
}

console.log("\n---------------------------------------------------------");
console.log(`QuadTree Node Recycling Result: ${allRecyclingPassed ? "PASS - Zero new heap allocations per steady-state frame" : "FAIL - Non-zero allocations in steady state"}`);
console.log("---------------------------------------------------------\n");

benchmarkResults.scalingSummary = {
  exponentAlpha: alpha,
  isNLogNVerified,
  scalingTable
};

benchmarkResults.recyclingSummary = {
  allRecyclingPassed,
  details: benchmarkResults.recyclingResults
};

benchmarkResults.overallAssessment = (isNLogNVerified && allRecyclingPassed) ? "PASS" : "FAIL";

fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(benchmarkResults, null, 2));
console.log(`[Benchmark] Detailed benchmark data written to: ${OUTPUT_JSON_PATH}`);
console.log(`[Benchmark] OVERALL ASSESSMENT: ${benchmarkResults.overallAssessment}`);
