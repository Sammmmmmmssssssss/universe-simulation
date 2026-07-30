const fs = require('fs');
const vm = require('vm');

const htmlContent = fs.readFileSync('/Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html', 'utf8');

const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error("Could not find <script> tag!");
  process.exit(1);
}

const jsCode = scriptMatch[1];

// Dummy DOM element implementation
function createDummyElement() {
  return {
    style: {},
    classList: {
      add: () => {},
      remove: () => {}
    },
    textContent: '',
    innerHTML: '',
    value: '50',
    clientWidth: 800,
    clientHeight: 600,
    width: 800,
    height: 600,
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
  getElementById: (id) => createDummyElement(),
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

try {
  vm.runInContext(exposedCode, sandbox);
  console.log("SUCCESS loading script in VM context!");
  console.log("QT defined:", typeof sandbox.QT);
  console.log("Particle defined:", typeof sandbox.Particle);
  console.log("physicsStep defined:", typeof sandbox.physicsStep);
} catch (err) {
  console.error("Error executing script in VM:", err);
}
