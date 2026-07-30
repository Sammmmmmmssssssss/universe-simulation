const fs = require('fs');
const path = require('path');
const vm = require('vm');

const htmlPath = path.join(__dirname, '../../universe_simulation.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
const jsCode = scriptMatch[1];

const mockCtx = {
  fillRect: () => {}, beginPath: () => {}, arc: () => {}, fill: () => {},
  stroke: () => {}, clearRect: () => {}, drawImage: () => {}, fillText: () => {},
  ellipse: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
  setLineDash: () => {}, createRadialGradient: () => ({ addColorStop: () => {} }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
};

function createMockElement(id = '') {
  return {
    id, style: {}, classList: { add: () => {}, remove: () => {} },
    textContent: '', value: '50', children: [], appendChild: () => {},
    removeChild: () => {}, prepend: () => {}, addEventListener: () => {},
    getContext: () => mockCtx, clientWidth: 800, clientHeight: 600
  };
}

const sandbox = {
  window: { innerWidth: 1920, innerHeight: 1080, addEventListener: () => {} },
  document: { getElementById: (id) => createMockElement(id), querySelectorAll: () => [createMockElement()], createElement: () => createMockElement(), addEventListener: () => {} },
  console, setTimeout, clearTimeout, setInterval, clearInterval, Math, Date, Number, Object, Array, Set, Infinity, isNaN, isFinite, parseFloat, parseInt,
  innerWidth: 1920, innerHeight: 1080
};

const wrappedCode = jsCode + `
  globalThis.Particle = Particle;
  globalThis.Body = Body;
  globalThis.QT = QT;
  globalThis.physicsStep = physicsStep;
  globalThis.particles = particles;
  globalThis.bodies = bodies;
`;

vm.createContext(sandbox);
vm.runInContext(wrappedCode, sandbox);

const P = sandbox.Particle;
const pA = new P(-50, 0, 'H', 0, 0);
const pB = new P(50, 0, 'H', 0, 0);
sandbox.particles.length = 0;
sandbox.bodies.length = 0;
sandbox.particles.push(pA, pB);

console.log('Before step: pA.x =', pA.x, 'pA.vx =', pA.vx, 'pB.x =', pB.x, 'pB.vx =', pB.vx);
sandbox.physicsStep(0.016, 1600);
console.log('After step 1: pA.x =', pA.x, 'pA.vx =', pA.vx, 'pB.x =', pB.x, 'pB.vx =', pB.vx);
sandbox.physicsStep(0.016, 1600);
console.log('After step 2: pA.x =', pA.x, 'pA.vx =', pA.vx, 'pB.x =', pB.x, 'pB.vx =', pB.vx);
