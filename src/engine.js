import { ELEMENTS } from "./engine/chemistry/elements.js";
import { MOLECULES } from "./engine/chemistry/molecules.js";
import { BIOCHEMISTRIES, EVO_STAGES } from "./engine/chemistry/biochemistries.js";
import { CosmicTimeline } from "./engine/universe/timeline.js";
import { Civilizations } from "./engine/universe/civilization.js";
import { globalEvents } from "./engine/events.js";





window.document.getElementByIdSafe = function(id) {
  return document.getElementById(id) || {
    classList: { add: () => {}, remove: () => {} },
    style: { setProperty: () => {} },
    innerHTML: '',
    textContent: '',
    value: '60',
    addEventListener: () => {},
    appendChild: () => {},
    prepend: () => {},
    removeChild: () => {},
    children: []
  };
};

window.initSimulation = function() {
// ═══════════════════════════════════════════════════
// NATIVE SYNTHESIZED AUDIO (Web Audio API)
// ═══════════════════════════════════════════════════
let audioCtx = null;
let soundEnabled = true;

function initAudio(){
  if(!audioCtx){
    try{
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }catch(e){}
  }
  if(audioCtx && audioCtx.state === 'suspended'){
    audioCtx.resume();
  }
}

function playTone(freq, type='sine', duration=0.2, vol=0.1){
  if(!soundEnabled || !audioCtx) return;
  try{
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }catch(e){}
}

function playBoom(){
  if(!soundEnabled || !audioCtx) return;
  try{
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 1.2);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.2);
  }catch(e){}
}

function playChime(){
  playTone(523.25, 'sine', 0.4, 0.15); // C5
  setTimeout(()=>playTone(659.25, 'sine', 0.4, 0.15), 100); // E5
  setTimeout(()=>playTone(783.99, 'sine', 0.5, 0.2), 200); // G5
}

function playDrone(){
  if(!soundEnabled || !audioCtx) return;
  try{
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(40 + Math.random()*20, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 1.0);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.0);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 3.0);
  }catch(e){}
}
function playHarmonic(){
  if(!soundEnabled || !audioCtx) return;
  try{
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200 + Math.random()*400, audioCtx.currentTime);
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1.5);
  }catch(e){}
}
function toggleAudio(){
  soundEnabled = !soundEnabled;
  document.getElementByIdSafe('sound-btn').textContent = soundEnabled ? '🔊' : '🔇';
}

// ═══════════════════════════════════════════════════
// CONSTANTS & REGISTRIES
// ═══════════════════════════════════════════════════
const G=6.674e-5, SOFTEN=40, MAX_P=1500, DT_BASE=0.016, YEAR_SCALE=1e6;

const ELEM_COLORS={};
for(const e of ELEMENTS) ELEM_COLORS[e.sym] = e.color;

let particles=[], bodies=[];
let cosmicAge=0, paused=false, speedMult=1000;
let selectedElem='H'; // DEFAULT Hydrogen selected so user can click right away!
let currentTool='place', selectedBody=null;
let bioPlanet=null;
const unlockedElements=new Set(['H','²H','He','³He','Li','Be']);
const discoveredMolecules=new Set();
const milestones={star:false,planet:false,supernova:false,life:false};
let supernovaFlashes=[];
let mousePos=null, isDragging=false, dragStart=null, camDragStart=null;
let velocityDrag=null;
const cam={x:0,y:0,zoom:1};
let bgCanvas=null;
let nameIdx=0;
let bioOrganisms=[], bioTerrain=null, bioAnimId=null;
let lastQt=null;
let _nextId=1;
const _acc=[0,0];

// ═══════════════════════════════════════════════════
// BARNES-HUT QUADTREE
// ═══════════════════════════════════════════════════
class QT{
  static pool = [];

  static create(x,y,w,h,depth=0){
    if(QT.pool.length > 0){
      const n = QT.pool.pop();
      n.x = x; n.y = y; n.w = w; n.h = h; n.depth = depth;
      n.mass = 0; n.cx = 0; n.cy = 0; n.p = null; n.ch = null;
      return n;
    }
    return new QT(x,y,w,h,depth);
  }

  static recycle(node){
    if(!node) return;
    if(node.ch){
      for(let i = 0; i < 4; i++){
        if(node.ch[i]) QT.recycle(node.ch[i]);
      }
      node.ch = null;
    }
    node.p = null;
    node.mass = 0; node.cx = 0; node.cy = 0;
    QT.pool.push(node);
  }

  constructor(x,y,w,h,depth=0){
    this.x=x;this.y=y;this.w=w;this.h=h;this.depth=depth;
    this.mass=0;this.cx=0;this.cy=0;this.p=null;this.ch=null;
  }
  insert(p){
    if(!p.active || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
    if(!this.ch&&!this.p){this.p=p;this.mass=p.mass;this.cx=p.x;this.cy=p.y;return;}
    if(!this.ch){
      if(this.depth>22){this.mass+=p.mass;return;} // Anti stack overflow
      const hw=this.w/2,hh=this.h/2,nd=this.depth+1;
      this.ch=[
        QT.create(this.x,this.y,hw,hh,nd),
        QT.create(this.x+hw,this.y,hw,hh,nd),
        QT.create(this.x,this.y+hh,hw,hh,nd),
        QT.create(this.x+hw,this.y+hh,hw,hh,nd)
      ];
      if(this.p){
        if(this.p.x===p.x&&this.p.y===p.y){p.x+=(Math.random()-0.5)*0.1;p.y+=(Math.random()-0.5)*0.1;}
        this._ins(this.p);this.p=null;
      }
    }
    this._ins(p);
    const tm=this.mass+p.mass;
    if (tm > 0 && Number.isFinite(tm)) {
      this.cx=(this.cx*this.mass+p.x*p.mass)/tm;
      this.cy=(this.cy*this.mass+p.y*p.mass)/tm;
    }
    this.mass=tm;
  }
  _ins(p){
    const mx=this.x+this.w/2,my=this.y+this.h/2;
    this.ch[(p.x>=mx?1:0)+(p.y>=my?2:0)].insert(p);
  }
  force(p,theta=0.5,acc=null){
    let isRoot = false;
    if(!acc){ acc = _acc; acc[0] = 0; acc[1] = 0; isRoot = true; }
    if(!this.mass || !Number.isFinite(this.cx) || !Number.isFinite(this.cy)){
      return isRoot ? [acc[0],acc[1]] : undefined;
    }
    const dx=this.cx-p.x,dy=this.cy-p.y,r2=dx*dx+dy*dy+SOFTEN;
    if(!this.ch||(this.w*this.w)/r2<theta*theta){
      if(r2>=4){
        const f=G*p.mass*this.mass/r2,r=Math.sqrt(r2);
        if(Number.isFinite(f) && Number.isFinite(r) && r > 0){
          acc[0] += f*dx/r; acc[1] += f*dy/r;
        }
      }
      return isRoot ? [acc[0],acc[1]] : undefined;
    }
    for(let i=0; i<4; i++){
      if(this.ch[i]) this.ch[i].force(p,theta,acc);
    }
    return isRoot ? [acc[0],acc[1]] : undefined;
  }
  queryRange(x,y,radius,callback){
    if(!this.mass || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) return;
    if(x + radius < this.x || x - radius > this.x + this.w || y + radius < this.y || y - radius > this.y + this.h){
      return;
    }
    if(this.p && this.p.active){
      callback(this.p);
    }
    if(this.ch){
      for(let i=0; i<4; i++){
        if(this.ch[i]) this.ch[i].queryRange(x,y,radius,callback);
      }
    }
  }
  repulsion(p,acc=null){
    let isRoot = false;
    if(!acc){ acc = _acc; acc[0] = 0; acc[1] = 0; isRoot = true; }
    this.queryRange(p.x, p.y, 4, (q) => {
      if(q !== p && q.active){
        const dx = p.x - q.x, dy = p.y - q.y, r2 = dx*dx + dy*dy;
        if(r2 < 16 && r2 > 0.1){
          const k = 1e6 / r2;
          acc[0] += dx * k;
          acc[1] += dy * k;
        }
      }
    });
    return isRoot ? [acc[0],acc[1]] : undefined;
  }
}

// ═══════════════════════════════════════════════════
// PARTICLE CLASS
// ═══════════════════════════════════════════════════
class Particle{
  constructor(x,y,elem,vx=0,vy=0){
    this.x=Number.isFinite(x)?x:0;
    this.y=Number.isFinite(y)?y:0;
    this.vx=Number.isFinite(vx)?vx:0;
    this.vy=Number.isFinite(vy)?vy:0;
    this.ax=0;this.ay=0;
    this.elem=elem||'H';this.active=true;this.temp=2.7;
    this.mass=1e9; // 1 particle = 1e9 mass units
    this.radius=3;
    this.id=_nextId++;
  }
  get color(){return ELEM_COLORS[this.elem]||'#ffffff';}
}

// ═══════════════════════════════════════════════════
// BODY CLASS (FIXED ASTROPHYSICAL CLASSIFICATION)
// ═══════════════════════════════════════════════════
const NAMES=['Kepler','Lyra','Vega','Nova','Atlas','Orion','Draco','Hydra','Pavo','Cygni','Solus','Helios','Aquila','Astra','Lupus'];
function genName(){const n=NAMES[nameIdx%NAMES.length],num=100+Math.floor(Math.random()*900);nameIdx++;return n+'-'+num;}

class Body{
  constructor(x,y,mass,comp={}){
    this.x=Number.isFinite(x)?x:0;
    this.y=Number.isFinite(y)?y:0;
    this.vx=0;this.vy=0;this.ax=0;this.ay=0;
    this.mass=(Number.isFinite(mass)&&mass>0)?mass:1e9;
    this.composition=comp||{};this.active=true;
    this.name=genName();this.temp=100;this.type='';this.stageAge=0;
    this.luminosity=0;this.hasAtmosphere=false;this.molecules={};
    this.habitability=0;this.lifeDetected=false;this.biochemistry=null;
    this.bioStage=-1;this.bioAge=0;this.bioEvents=[];
    this.hasMagnetosphere=false;this.atmosphericPressure=0;
    this.id=_nextId++;
    this.classify();
  }
  get hFrac(){return this.composition['H']||0;}
  get surface(){
    if(!this._surface && this.isPlanet()){
      this._surface = new PlanetSurface(100, 100, this);
    }
    return this._surface;
  }
  get radius(){
    if(this.type==='black_hole'||this.type==='supermassive_bh')return Math.log(this.mass)*1.8;
    if(this.type==='neutron_star'||this.type==='pulsar')return 5;
    if(this.type==='white_dwarf')return 7;
    if(this.type==='protostellar_cloud')return Math.max(8,Math.cbrt(this.mass)*0.008);
    return Math.max(5,Math.cbrt(this.mass)*0.005);
  }
  isStar(){return['blue_giant','main_sequence_star','red_dwarf','brown_dwarf','red_giant','white_dwarf','neutron_star','pulsar','black_hole','supermassive_bh'].includes(this.type);}
  isPlanet(){return['terrestrial_planet','gas_giant','ice_giant','dwarf_planet'].includes(this.type);}
  
  classify(){
    const preservedStates = ['red_giant','white_dwarf','neutron_star','pulsar','black_hole','supermassive_bh'];
    if(this.type && preservedStates.includes(this.type)){
      if(this.type === 'white_dwarf'){
        if(this.mass > 1.4e11){
          triggerSN(this);
          return;
        }
        this.temp = 10000;
        this.updateLum();
        return;
      }
      if(this.type === 'neutron_star' || this.type === 'pulsar'){
        if(this.mass > 4e11){
          this.type = 'black_hole';
          this.temp = 0;
          playDrone();
          CosmicTimeline.addEvent('COLLAPSE', this.name, 'A neutron star collapsed into a black hole.', cosmicAge, '#4400aa');
        }
        this.updateLum();
        return;
      }
      if(this.type === 'black_hole' || this.type === 'supermassive_bh'){
        this.type = this.mass > 2e12 ? 'supermassive_bh' : 'black_hole';
        this.temp = 0;
        this.updateLum();
        return;
      }
      if(this.type === 'red_giant'){
        if(this.mass > 8e11){
          this.type = 'black_hole';
          this.temp = 0;
          playDrone();
          CosmicTimeline.addEvent('COLLAPSE', this.name, 'A massive red giant collapsed directly into a black hole.', cosmicAge, '#4400aa');
        }
        this.updateLum();
        return;
      }
    }

    const m = this.mass;
    const heavyFrac = 1 - (this.composition['H'] || 0) - (this.composition['He'] || 0);

    // Compact remnant mass scale (m >= 5e11)
    if(m >= 5e11){
      if(m >= 2e12) this.type = 'supermassive_bh';
      else if(m >= 8e11) this.type = 'black_hole';
      else if(m >= 5e11) this.type = 'pulsar';
      this.temp = (this.type === 'pulsar' || this.type === 'neutron_star') ? 1e6 : 0;
      this.updateLum();
      return;
    }

    // Planetary thresholds (metal/rock rich or sub-stellar mass gas giants)
    if(heavyFrac > 0.20 || (m >= 1.5e10 && m < 1.8e10)){
      if(m > 1.5e10){
        if(this.hFrac > 0.35){
          if(m >= 1.5e11) this.type = 'blue_giant';
          else if(m >= 8e10) this.type = 'main_sequence_star';
          else this.type = 'gas_giant';
        } else {
          this.type = 'terrestrial_planet';
        }
      } else if(m > 4e9){
        this.type = (this.hFrac > 0.40) ? 'gas_giant' : (heavyFrac < 0.40 ? 'ice_giant' : 'terrestrial_planet');
      } else {
        this.type = 'dwarf_planet';
      }
      if(this.isPlanet()){
        this.temp = 250;
        this.updateLum();
        return;
      }
    }

    // Stellar hierarchy & protostellar cloud
    if(m < 1.5e10){
      this.type = 'protostellar_cloud';
      this.temp = 150;
    } else if(m < 1.8e10){
      this.type = 'gas_giant';
      this.temp = 250;
    } else if(m < 3e10){
      this.type = 'brown_dwarf';
      this.temp = 800;
    } else if(m < 8e10){
      this.type = 'red_dwarf';
      this.temp = 3200;
    } else if(m < 1.5e11){
      this.type = 'main_sequence_star';
      this.temp = 5800;
    } else {
      this.type = 'blue_giant';
      this.temp = 25000;
    }
    this.updateLum();
  }
  
  updateLum(){
    if(!this.isStar() || this.type === 'protostellar_cloud' || this.type === 'black_hole' || this.type === 'supermassive_bh'){
      this.luminosity = 0;
      return;
    }
    if(this.type === 'white_dwarf'){
      this.luminosity = 0.05;
      return;
    }
    if(this.type === 'neutron_star' || this.type === 'pulsar'){
      this.luminosity = 0.1;
      return;
    }
    const rel = this.mass / 5e10;
    this.luminosity = Math.pow(Math.max(0.01, rel), 3.5);
  }
  
  updatePlanetTemp(star){
    if(!star||!this.isPlanet())return;
    const dx=this.x-star.x,dy=this.y-star.y,r=Math.sqrt(dx*dx+dy*dy);
    const dist = Math.max(r, 1);
    const res = star.temp * Math.pow(star.radius / (2 * dist), 0.5) * 0.8;
    this.temp = (Number.isFinite(res) && !isNaN(res)) ? Math.max(10, res) : 250;
    
    // Calculate Atmospheric Pressure based on mass (Earth ~ 5e9 mass)
    this.atmosphericPressure = this.hasAtmosphere ? Math.pow(this.mass / 5e9, 1.5) : 0;

    if(this.hasAtmosphere){
      let greenhouseBonus = 1.1; // Base atmospheric warming
      if(this.molecules['CO₂']) greenhouseBonus += 0.35 * Math.min(this.atmosphericPressure, 5);
      if(this.molecules['CH₄']) greenhouseBonus += 0.60 * Math.min(this.atmosphericPressure, 5);
      this.temp *= greenhouseBonus;
    }
  }

  computeHab(){
    if(!this.isPlanet()){this.habitability=0;this.lifeDetected=false;return 0;}
    let s=0;
    // Temperature Score
    if(this.temp>=253&&this.temp<=393) s+=35*(1-Math.abs(this.temp-298)/95); // Ideal 298K (25°C)
    else if(this.temp>=80&&this.temp<=120) s+=18; // Methane liquid range
    else if(this.temp>=150&&this.temp<=245) s+=15; // Ammonia range
    
    // Solvent Molecules
    if(this.molecules['H₂O']) s+=25;
    if(this.molecules['CH₄']) s+=12;
    if(this.molecules['NH₃']) s+=10;
    
    // Carbon / Organic Presence
    if((this.composition['C']||0)>0.03) s+=20;
    else if((this.composition['C']||0)>0.005) s+=10;
    
    // Atmosphere
    if(this.hasAtmosphere) s+=15;
    
    this.habitability=Math.min(100,Math.round(s));
    this.lifeDetected=this.habitability>=50;
    return this.habitability;
  }
  
  detectBiochem(){
    if(this.biochemistry)return this.biochemistry;
    const t=this.temp;let best=null,bs=0;
    for(const bio of BIOCHEMISTRIES){
      if(t<bio.tempMin||t>bio.tempMax)continue;
      let sc=bio.chance;
      for(const el of bio.elements)if((this.composition[el]||0)>0.005)sc+=0.2;
      if(this.molecules[bio.solvent==='H₂O'?'H₂O':bio.solvent==='CH₄'?'CH₄':'NH₃'])sc+=0.3;
      if(sc>bs){bs=sc;best=bio;}
    }
    return best;
  }
}

// ═══════════════════════════════════════════════════
// PHYSICS ENGINE (GAS COLLAPSE & STABILITY)
// ═══════════════════════════════════════════════════
function physicsStep(physDt, ageDt){
  physDt = (Number.isFinite(physDt) && physDt > 0) ? Math.min(physDt, 0.35) : DT_BASE;

  const all=[...particles.filter(p=>p.active),...bodies.filter(b=>b.active)];
  if(!all.length)return;
  
  // Floating Origin: Prevent Floating-Point precision loss at huge cosmic scales
  if (Math.hypot(cam.x, cam.y) > 25000) {
    const shiftX = cam.x;
    const shiftY = cam.y;
    for (const p of all) {
      if (Number.isFinite(p.x)) p.x -= shiftX;
      if (Number.isFinite(p.y)) p.y -= shiftY;
    }
    cam.x = 0;
    cam.y = 0;
    // Also shift supernova flashes if any exist
    for (const f of supernovaFlashes) {
      if (Number.isFinite(f.x)) f.x -= shiftX;
      if (Number.isFinite(f.y)) f.y -= shiftY;
    }
  }
  
  let mnX=Infinity,mxX=-Infinity,mnY=Infinity,mxY=-Infinity;
  for(const p of all){
    if(!p.active || !Number.isFinite(p.x) || !Number.isFinite(p.y)){p.active=false;continue;}
    mnX=Math.min(mnX,p.x);mxX=Math.max(mxX,p.x);mnY=Math.min(mnY,p.y);mxY=Math.max(mxY,p.y);
  }
  
  if(!Number.isFinite(mnX)) mnX = -1000;
  if(!Number.isFinite(mxX)) mxX = 1000;
  if(!Number.isFinite(mnY)) mnY = -1000;
  if(!Number.isFinite(mxY)) mxY = 1000;

  if (lastQt) { QT.recycle(lastQt); }
  const pad=400;
  const qt=QT.create(mnX-pad,mnY-pad,mxX-mnX+pad*2,mxY-mnY+pad*2,0);
  lastQt=qt;

  for(const p of all)qt.insert(p);
  
  // Velocity Verlet Position Update with MAX_SPEED & finite bounds checks
  const MAX_SPEED = 250;
  for(const p of all){
    if (!Number.isFinite(p.vx)) p.vx = 0;
    if (!Number.isFinite(p.vy)) p.vy = 0;
    if (!Number.isFinite(p.ax)) p.ax = 0;
    if (!Number.isFinite(p.ay)) p.ay = 0;

    const spd = Math.hypot(p.vx, p.vy);
    if (!Number.isFinite(spd) || spd > MAX_SPEED) {
      if (spd > 0 && Number.isFinite(spd)) {
        p.vx = (p.vx / spd) * MAX_SPEED;
        p.vy = (p.vy / spd) * MAX_SPEED;
      } else {
        p.vx = 0; p.vy = 0;
      }
    }

    p.x += p.vx * physDt + 0.5 * p.ax * physDt * physDt;
    p.y += p.vy * physDt + 0.5 * p.ay * physDt * physDt;

    if (!Number.isFinite(p.x) || isNaN(p.x)) p.x = 0;
    if (!Number.isFinite(p.y) || isNaN(p.y)) p.y = 0;
  }
  
  // Forces & Repulsion
  const lumStars = bodies.filter(b => b.active && b.isStar() && b.luminosity > 0);

  for(const p of all){
    _acc[0] = 0; _acc[1] = 0;
    qt.force(p, 0.5, _acc);
    let fx = Number.isFinite(_acc[0]) ? _acc[0] : 0;
    let fy = Number.isFinite(_acc[1]) ? _acc[1] : 0;

    const nax = (p.mass > 0) ? fx / p.mass : 0;
    const nay = (p.mass > 0) ? fy / p.mass : 0;
    
    // Soft short-range repulsion via QuadTree lookup (strictly O(N log N))
    let rx = 0, ry = 0;
    if(p instanceof Particle){
      _acc[0] = 0; _acc[1] = 0;
      qt.repulsion(p, _acc);
      rx = Number.isFinite(_acc[0]) ? _acc[0] : 0;
      ry = Number.isFinite(_acc[1]) ? _acc[1] : 0;
    }

    const dVx = 0.5 * (p.ax + (Number.isFinite(nax)?nax:0) + (p.mass > 0 ? rx / p.mass : 0)) * physDt;
    const dVy = 0.5 * (p.ay + (Number.isFinite(nay)?nay:0) + (p.mass > 0 ? ry / p.mass : 0)) * physDt;
    if (Number.isFinite(dVx)) p.vx += dVx;
    if (Number.isFinite(dVy)) p.vy += dVy;

    p.ax = Number.isFinite(nax) ? nax : 0;
    p.ay = Number.isFinite(nay) ? nay : 0;
    
    // Stellar wind pushing gas away from luminous stars
    if(p instanceof Particle && lumStars.length > 0){
      for(const b of lumStars){
        const dx=p.x-b.x,dy=p.y-b.y,r2=dx*dx+dy*dy;
        if(r2<1.5e5 && r2>0.01){
          const w=b.luminosity*1500/(r2+1);
          if (Number.isFinite(w)) {
            p.vx+=dx*w*physDt;
            p.vy+=dy*w*physDt;
          }
        }
      }
    }

    // Final velocity clamping
    const finalSpd = Math.hypot(p.vx, p.vy);
    if (!Number.isFinite(finalSpd) || finalSpd > MAX_SPEED) {
      if (finalSpd > 0 && Number.isFinite(finalSpd)) {
        p.vx = (p.vx / finalSpd) * MAX_SPEED;
        p.vy = (p.vy / finalSpd) * MAX_SPEED;
      } else {
        p.vx = 0; p.vy = 0;
      }
    }
  }
  
  collide(all, qt);
  evolveStars(ageDt);
  calcMolecules(ageDt);
  Civilizations.update(ageDt, bodies, particles);
  updateHUD();
  
  particles=particles.filter(p=>p.active);
  bodies=bodies.filter(b=>b.active);
  
}

function collide(all, qt){
  let maxR = 20;
  for(let i=0;i<all.length;i++){
    if(all[i].active){
      const r = all[i].radius || 3;
      if(r > maxR) maxR = r;
    }
  }
  for(let i=0;i<all.length;i++){
    const a=all[i];if(!a.active)continue;
    const maxSearchR = (a.radius || 3) + maxR;
    qt.queryRange(a.x, a.y, maxSearchR, (b) => {
      if(b === a || !b.active || !a.active) return;
      if(a.id >= b.id) return;

      const dx=a.x-b.x,dy=a.y-b.y,r2=dx*dx+dy*dy;
      const ra=a.radius||3,rb=b.radius||3;
      if(r2>(ra+rb)*(ra+rb)) return;
      const vx=a.vx-b.vx,vy=a.vy-b.vy;
      const r_normal=Math.sqrt(r2)||0.001; const nx=dx/r_normal,ny=dy/r_normal; const vr=vx*nx+vy*ny;
      if(vr>0) return; // Moving apart
      
      const spd=Math.hypot(vx,vy);
            globalEvents.emit('onCollision', { entityA: a, entityB: b });
            // Inelastic gravitational accretion
      let escapeV = Math.sqrt(2 * 6.674e-5 * Math.max(a.mass, b.mass) / Math.max(1, r2));
      if(spd < 35 + escapeV){
        doMerge(a,b);
      }else{
        // Elastic bounce with energy loss
        
        const tm = a.mass + b.mass;
        if (tm > 0) {
          const imp=1.5*vr/tm;
          if (Number.isFinite(imp)) {
            a.vx-=imp*b.mass*nx;a.vy-=imp*b.mass*ny;
            b.vx+=imp*a.mass*nx;b.vy+=imp*a.mass*ny;
          }
        }
      }
    });
  }
}

function doMerge(a,b){
  const tm=a.mass+b.mass;
  if (!Number.isFinite(tm) || tm <= 0) return;
  const nx=(a.x*a.mass+b.x*b.mass)/tm,ny=(a.y*a.mass+b.y*b.mass)/tm;
  const nvx=(a.vx*a.mass+b.vx*b.mass)/tm,nvy=(a.vy*a.mass+b.vy*b.mass)/tm;
  const ac=a instanceof Body?a.composition:(a.composition||{[a.elem]:1});
  const bc=b instanceof Body?b.composition:(b.composition||{[b.elem]:1});
  const comp={};
  const keys=new Set([...Object.keys(ac),...Object.keys(bc)]);
  for(const k of keys)comp[k]=((ac[k]||0)*a.mass+(bc[k]||0)*b.mass)/tm;
  let compSum=0;for(const k in comp)compSum+=comp[k];
  if(compSum>0){for(const k in comp)comp[k]/=compSum;}
  a.active=false;b.active=false;
  
  const nb=new Body(nx,ny,tm,comp);
  nb.vx=Number.isFinite(nvx)?nvx:0;
  nb.vy=Number.isFinite(nvy)?nvy:0;
  nb.temp=Math.max(a.temp||100,b.temp||100);

  const evolved=[a,b].find(item=>item instanceof Body && ['red_giant','white_dwarf','neutron_star','pulsar','black_hole','supermassive_bh'].includes(item.type));
  if(evolved){
    nb.type=evolved.type;
    nb.classify();
  }

  bodies.push(nb);
  onMerge(nb);
}

function onMerge(b){
  if(b.isStar()&&!milestones.star){
    milestones.star=true;
    document.getElementByIdSafe('ms-star').classList.add('done');
    showNotif('⭐ First Star Formed! Stellar Fusion Unlocked!','#ffdd44');
    addLog('⭐ First Star ignited! Fusing H → C, N, O, Si');
    playChime();
    ['C','N','O','Ne','Mg','Si','S','Ca','Na','Al','Ti','Cr'].forEach(unlockElem);
    updateGuide('Star formed! Keep adding gas or watch it evolve & produce heavy elements!');
    CosmicTimeline.addEvent("STELLAR", b.name, "First Star ignited. Nucleosynthesis begins.", cosmicAge, "#ffdd44");
  }
  if(b.isPlanet()&&!milestones.planet){
    milestones.planet=true;
    document.getElementByIdSafe('ms-planet').classList.add('done');
    showNotif('🪐 First Planet Formed!','#88aaff');
    addLog('🪐 First Planet formed — Molecules can now synthesize!');
    updateGuide('Planet formed! Check its composition & temperature for Habitability!');
    CosmicTimeline.addEvent("PLANETARY", b.name, "First Planet coalesced from orbital dust and gas.", cosmicAge, "#88aaff");
  }
}

function evolveStars(ageDt){
  for(const b of bodies){
    if(!b.active)continue;

    // Protostellar Cloud Collapse
    if(b.type === 'protostellar_cloud'){
      b.stageAge += ageDt;
      // Quantum fluctuation or mass critical limit triggers collapse
      if(b.mass >= 1.5e10 || b.stageAge > 15 || (b.stageAge > 2 && Math.random() < (0.01 * ageDt))){
        const m = b.mass;
        if(m < 3e10) b.type = 'brown_dwarf';
        else if(m < 8e10) b.type = 'red_dwarf';
        else if(m < 1.5e11) b.type = 'main_sequence_star';
        else b.type = 'blue_giant';
        b.stageAge = 0;
        b.classify();
        playHarmonic();
        showNotif(`⭐ Cloud collapsed into ${b.name} (${b.type.replace('_',' ')})!`, '#ffdd44');
        addLog(`⭐ Cloud collapsed into ${b.type.replace('_',' ')}`);
      }
      continue;
    }

    if(!b.isStar())continue;
    b.stageAge+=ageDt;
    b.updateLum();

    // Continuous Stellar Nucleosynthesis & Fusion Chains
    if(b.type === 'brown_dwarf'){
      const hBurn = Math.min(b.composition['H'] || 0, 1e-8 * ageDt);
      if(hBurn > 0){
        b.composition['H'] = (b.composition['H'] || 0) - hBurn;
        b.composition['He'] = (b.composition['He'] || 0) + hBurn;
      }
    }
    else if(b.type === 'red_dwarf'){
      const hBurn = Math.min(b.composition['H'] || 0, 3e-8 * ageDt);
      if(hBurn > 0){
        b.composition['H'] = (b.composition['H'] || 0) - hBurn;
        b.composition['He'] = (b.composition['He'] || 0) + hBurn;
      }
    }
    else if(b.type === 'main_sequence_star'){
      const hBurn = Math.min(b.composition['H'] || 0, 1.5e-7 * ageDt);
      if(hBurn > 0){
        b.composition['H'] = (b.composition['H'] || 0) - hBurn;
        b.composition['He'] = (b.composition['He'] || 0) + hBurn * 0.82;
        b.composition['C'] = (b.composition['C'] || 0) + hBurn * 0.10;
        b.composition['N'] = (b.composition['N'] || 0) + hBurn * 0.05;
        b.composition['O'] = (b.composition['O'] || 0) + hBurn * 0.03;
        ['C','N','O'].forEach(unlockElem);
      }
      const maxLifespan = 1e9 * (8e10 / b.mass) * 100;
      if((b.composition['H'] || 0) < 0.10 || b.stageAge > maxLifespan){
        b.type = 'red_giant';
        b.temp = 3800;
        b.stageAge = 0;
        showNotif(`🔴 ${b.name} expanded into a Red Giant!`, '#ff4444');
        addLog(`🔴 ${b.name} became a Red Giant (Hydrogen core depleted)`);
      }
    }
    else if(b.type === 'blue_giant'){
      const hBurn = Math.min(b.composition['H'] || 0, 5e-7 * ageDt);
      if(hBurn > 0){
        b.composition['H'] = (b.composition['H'] || 0) - hBurn;
        b.composition['He'] = (b.composition['He'] || 0) + hBurn * 0.50;
        b.composition['C'] = (b.composition['C'] || 0) + hBurn * 0.25;
        b.composition['O'] = (b.composition['O'] || 0) + hBurn * 0.15;
        b.composition['Si'] = (b.composition['Si'] || 0) + hBurn * 0.10;
        ['C','O','Si'].forEach(unlockElem);
      }
      const maxLifespan = 1e9 * (1.5e11 / b.mass) * 30;
      if((b.composition['H'] || 0) < 0.05 || b.stageAge > maxLifespan){
        if(b.mass >= 1.5e11){
          triggerSN(b);
        } else {
          b.type = 'red_giant';
          b.temp = 3800;
          b.stageAge = 0;
          showNotif(`🔴 ${b.name} expanded into a Red Giant!`, '#ff4444');
          addLog(`🔴 ${b.name} expanded into a Red Giant`);
        }
      }
    }
    else if(b.type === 'red_giant'){
      const heBurn = Math.min(b.composition['He'] || 0, 2e-7 * ageDt);
      if(heBurn > 0){
        b.composition['He'] = (b.composition['He'] || 0) - heBurn;
        b.composition['C'] = (b.composition['C'] || 0) + heBurn * 0.35;
        b.composition['N'] = (b.composition['N'] || 0) + heBurn * 0.15;
        b.composition['O'] = (b.composition['O'] || 0) + heBurn * 0.25;
        b.composition['Si'] = (b.composition['Si'] || 0) + heBurn * 0.15;
        b.composition['S'] = (b.composition['S'] || 0) + heBurn * 0.10;
        ['C','N','O','Si','S'].forEach(unlockElem);
      }
      const maxLifespan = 1e9 * (8e10 / b.mass) * 20;
      if(b.stageAge > maxLifespan || (b.composition['He'] || 0) < 0.02){
        if(b.mass >= 8e10){
          triggerSN(b);
        } else {
          b.type = 'white_dwarf';
          b.temp = 10000;
          b.stageAge = 0;
          showNotif(`⚪ ${b.name} shed outer envelope into a White Dwarf!`, '#ffffff');
          addLog(`⚪ ${b.name} became a White Dwarf`);
        }
      }
    }
  }

  const stars=bodies.filter(b=>b.active&&b.isStar()&&b.luminosity>0);
  for(const b of bodies){
    if(!b.active||!b.isPlanet())continue;
    let nd=Infinity,ns=null;
    for(const s of stars){const d=Math.hypot(b.x-s.x,b.y-s.y);if(d<nd){nd=d;ns=s;}}
    b.updatePlanetTemp(ns);
    b.computeHab();

    if(b.lifeDetected){
      b.bioAge += ageDt;
      if(!milestones.life){
        milestones.life=true;
        document.getElementByIdSafe('ms-life').classList.add('done');
        showNotif('🧬 LIFE DETECTED! Click Planet -> ENTER BIOSPHERE VIEW!','#00ff88');
        CosmicTimeline.addEvent('BIOLOGY', b.name, 'Primordial life emerged in the primordial soup.', cosmicAge, '#00ff88');
        addLog('🧬 Life potential discovered on '+b.name);
        playChime();
        updateGuide('🧬 Life Detected! Click the planet to enter Biosphere View!');
      }
    }
  }
}

function triggerSN(star){
  star.active=false;
  playBoom();
  if(!milestones.supernova){
    milestones.supernova=true;
    document.getElementByIdSafe('ms-supernova').classList.add('done');
    showNotif('💥 SUPERNOVA! All r-process & s-process elements unlocked!','#ff8800');
    addLog('💥 Supernova! Heavy metals (Fe, Au, Pt, U) seeded across space.');
    ['Fe','Ni','Co','Cu','Zn','Ag','Au','Pb','Pt','U','Mn','Ba','W','Ir','Xe'].forEach(unlockElem);
    updateGuide('Supernova exploded! Heavy metals scattered to build rocky planets & life!');
  }else{showNotif(`💥 ${star.name} went Supernova!`,'#ff8800');}
  CosmicTimeline.addEvent('SUPERNOVA', star.name, 'Core collapse resulted in a massive supernova explosion.', cosmicAge, '#ff8800');

  supernovaFlashes.push({x:star.x,y:star.y,r:star.radius,t:0,mt:90});

  // 1. Kinetic Shockwave
  const shockRadius = Math.max(100, star.radius * 25);
  const allObjects = [...particles.filter(p=>p.active), ...bodies.filter(b=>b.active)];
  for(const obj of allObjects){
    const dx = obj.x - star.x;
    const dy = obj.y - star.y;
    const dist = Math.hypot(dx, dy);
    if(dist > 0.1 && dist < shockRadius){
      const push = 120 / (dist + 10);
      obj.vx += (dx / dist) * push;
      obj.vy += (dy / dist) * push;
    }
  }

  // 2. Heavy Element Seeding & Mass Conservation
  const heavyElements = ['Fe','Au','Pt','U','Ni','Co','Cu','Zn','Ag','Pb','Si','O','C'];
  heavyElements.forEach(el => unlockElem(el));

  let remnantMass = Math.max(1e9, star.mass * 0.25);
  const ejectedMass = Math.max(0, star.mass - remnantMass);

  const canAdd = Math.min(24, MAX_P - particles.length - bodies.length);
  if(canAdd > 0 && ejectedMass > 0){
    const pMass = ejectedMass / canAdd;
    for(let i = 0; i < canAdd; i++){
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 16;
      const el = heavyElements[i % heavyElements.length];
      const px = star.x + Math.cos(angle) * (star.radius * 1.5 + 5);
      const py = star.y + Math.sin(angle) * (star.radius * 1.5 + 5);
      const pvx = star.vx + Math.cos(angle) * speed;
      const pvy = star.vy + Math.sin(angle) * speed;
      const p = new Particle(px, py, el, pvx, pvy);
      p.mass = pMass;
      p.composition = { [el]: 1.0 };
      particles.push(p);
      
    }
  } else {
    remnantMass = star.mass;
  }

  // 3. Stellar Remnant
  const remComp = Object.assign({}, star.composition, { Fe: 0.3, Si: 0.2, C: 0.2, O: 0.2 });
  let sum = 0; for(let k in remComp) sum += remComp[k];
  if (sum > 0) { for(let k in remComp) remComp[k] /= sum; }

  const rem = new Body(star.x, star.y, remnantMass, remComp);
  rem.vx = star.vx;
  rem.vy = star.vy;

  if(star.mass >= 1e12){
    rem.type = 'supermassive_bh';
    rem.temp = 0;
  } else if(star.mass >= 5e11){
    rem.type = 'black_hole';
    rem.temp = 0;
  } else if(star.mass >= 3e11){
    rem.type = 'pulsar';
    rem.temp = 1e6;
  } else if(star.mass >= 8e10){
    rem.type = 'neutron_star';
    rem.temp = 1e6;
  } else {
    rem.type = 'white_dwarf';
    rem.temp = 10000;
  }

  rem.updateLum();
  bodies.push(rem);
}

function calcMolecules(ageDt){
  const lumStars = bodies.filter(b => b.active && b.isStar() && b.luminosity > 0);
  for(const b of bodies){
    if(!b.active||!b.isPlanet())continue;
    const c=b.composition;
    
    // Magnetosphere (needs mass & molten iron core)
    b.hasMagnetosphere = (c['Fe'] || 0) > 0.15 && b.mass > 3e9;
    
    // Solar Wind Stripping of Atmospheres
    if(!b.hasMagnetosphere && lumStars.length > 0){
      let nd=Infinity,ns=null;
      for(const s of lumStars){const d=Math.hypot(b.x-s.x,b.y-s.y);if(d<nd){nd=d;ns=s;}}
      if(ns && nd < 350){
        const strip = (ns.luminosity * (ageDt||0.016) * 0.005) / Math.max(1, nd/10);
        c['H'] = Math.max(0, (c['H']||0) - strip);
        c['C'] = Math.max(0, (c['C']||0) - strip * 0.2);
        c['N'] = Math.max(0, (c['N']||0) - strip * 0.2);
        c['O'] = Math.max(0, (c['O']||0) - strip * 0.2);
      }
    }
    
    b.molecules={};
    for(const mol of MOLECULES){
      let ok=true;
      for(const[el,cnt]of Object.entries(mol.inputs)){if((c[el]||0)<0.005*cnt){ok=false;break;}}
      if(ok){
        b.molecules[mol.formula]=1;
        if(!discoveredMolecules.has(mol.formula)){
          discoveredMolecules.add(mol.formula);
          showNotif(`🔬 Molecule Synthesized: ${mol.name} (${mol.formula})`,'#88ccff');
          addLog(`🔬 ${mol.formula}: ${mol.name}`);
        }
      }
    }
    
    // If escape velocity is too low, planet cannot hold any gas
    const escapeVel = Math.sqrt(b.mass / Math.max(1, b.radius));
    b.hasAtmosphere = (Object.keys(b.molecules).length > 0) && (escapeVel > 25000); 
    // Wait, let's normalize escape velocity threshold based on our scale
    // mass is e.g. 5e9, radius is 5. sqrt(1e9) = ~31622
    b.hasAtmosphere = (Object.keys(b.molecules).length > 0) && (escapeVel > 20000);
  }
}

function updateHUD(){
  const pc=particles.filter(p=>p.active).length,bc=bodies.filter(b=>b.active).length;
  document.getElementByIdSafe('hud-particles').textContent=pc;
  document.getElementByIdSafe('hud-bodies').textContent=bc;
  document.getElementByIdSafe('hud-stars').textContent=bodies.filter(b=>b.active&&b.isStar()).length;
  document.getElementByIdSafe('hud-planets').textContent=bodies.filter(b=>b.active&&b.isPlanet()).length;
}

function updateGuide(msg){
  window.dispatchEvent(new CustomEvent('engine-guide', { detail: { msg } }));
}

// ═══════════════════════════════════════════════════
// RENDERER
// ═══════════════════════════════════════════════════
const canvas=document.getElementById('main-canvas');
const ctx=canvas.getContext('2d');
function resize(){canvas.width=innerWidth;canvas.height=innerHeight;makeBG();}
function makeBG(){
  bgCanvas=document.createElement('canvas');bgCanvas.width=canvas.width;bgCanvas.height=canvas.height;
  const bc=bgCanvas.getContext('2d');bc.fillStyle='#000008';bc.fillRect(0,0,bgCanvas.width,bgCanvas.height);
  for(let i=0;i<Math.floor(canvas.width*canvas.height/600);i++){
    const x=Math.random()*bgCanvas.width,y=Math.random()*bgCanvas.height;
    bc.globalAlpha=0.2+Math.random()*0.6;
    bc.fillStyle=`hsl(${200+Math.random()*60},50%,90%)`;
    bc.beginPath();bc.arc(x,y,Math.random()*1.4,0,Math.PI*2);bc.fill();
  }
  bc.globalAlpha=1;
}
const w2s=(wx,wy)=>[(wx-cam.x)*cam.zoom+canvas.width/2,(wy-cam.y)*cam.zoom+canvas.height/2];
const s2w=(sx,sy)=>[(sx-canvas.width/2)/cam.zoom+cam.x,(sy-canvas.height/2)/cam.zoom+cam.y];

function render(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(bgCanvas)ctx.drawImage(bgCanvas,0,0);
  
  // Supernova shockwaves
  for(let i=supernovaFlashes.length-1;i>=0;i--){
    const f=supernovaFlashes[i];f.t++;
    if(f.t>f.mt){supernovaFlashes.splice(i,1);continue;}
    const[sx,sy]=w2s(f.x,f.y),pr=f.t/f.mt,fr=f.r*pr*cam.zoom*16,al=1-pr;
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,Math.max(1,fr));
    g.addColorStop(0,`rgba(255,230,120,${al})`);g.addColorStop(0.4,`rgba(255,100,40,${al*0.6})`);g.addColorStop(1,'rgba(255,30,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,Math.max(1,fr),0,Math.PI*2);ctx.fill();
  }
  
  // Particles
  for(const p of particles){
    if(!p.active)continue;
    const[sx,sy]=w2s(p.x,p.y);
    if(sx<-20||sx>canvas.width+20||sy<-20||sy>canvas.height+20)continue;
    const sr=Math.max(1.8,p.radius*cam.zoom);
    ctx.globalAlpha=0.85;ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
    if(sr>3.5){
      ctx.globalAlpha=0.25;const g=ctx.createRadialGradient(sx,sy,0,sx,sy,sr*2.5);
      g.addColorStop(0,p.color);g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,sr*2.5,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  
  // Bodies
  for(const b of bodies){
    if(!b.active)continue;
    const[sx,sy]=w2s(b.x,b.y),sr=Math.max(4,b.radius*cam.zoom);
    if(sx<-sr*4||sx>canvas.width+sr*4||sy<-sr*4||sy>canvas.height+sr*4)continue;
    drawBody(b,sx,sy,sr);
  }
  
  // Drag Velocity Vector
  if(velocityDrag&&currentTool==='place'){
    const[sx,sy]=w2s(velocityDrag.wx,velocityDrag.wy);
    ctx.strokeStyle='rgba(0,212,255,0.8)';ctx.lineWidth=2;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(velocityDrag.ex,velocityDrag.ey);ctx.stroke();ctx.setLineDash([]);
  }
  
  // Nebula Brush Indicator
  if(currentTool==='nebula'&&mousePos){
    const bs=parseInt(document.getElementByIdSafe('brush-size').value);
    ctx.strokeStyle='rgba(100,180,255,0.4)';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(mousePos.x,mousePos.y,bs,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }
  
  // Selected Body Indicator
  if(selectedBody&&selectedBody.active){
    const[sx,sy]=w2s(selectedBody.x,selectedBody.y),sr=Math.max(6,selectedBody.radius*cam.zoom);
    ctx.strokeStyle='rgba(0,255,136,0.9)';ctx.lineWidth=1.8;ctx.setLineDash([6,4]);
    ctx.beginPath();ctx.arc(sx,sy,sr+7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }
}

function drawBody(b,sx,sy,sr){
  const t=b.type;
  
  if(t==='protostellar_cloud'){
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,sr*2.5);
    g.addColorStop(0,'rgba(255,200,100,0.6)');g.addColorStop(0.5,'rgba(200,100,50,0.3)');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,sr*2.5,0,Math.PI*2);ctx.fill();return;
  }
  if(t==='black_hole'||t==='supermassive_bh'){
    const dr=sr*3.8,g=ctx.createRadialGradient(sx,sy,sr*0.4,sx,sy,dr);
    g.addColorStop(0,'rgba(255,140,0,0.95)');g.addColorStop(0.5,'rgba(255,50,0,0.4)');g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,dr,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#000';ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,220,100,0.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sx,sy,sr*1.5,0,Math.PI*2);ctx.stroke();
    return;
  }
  if(t==='neutron_star'||t==='pulsar'){
    const g=ctx.createRadialGradient(sx,sy,0,sx,sy,sr*3.5);
    g.addColorStop(0,'rgba(220,240,255,1)');g.addColorStop(0.4,'rgba(100,160,255,0.6)');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,sr*3.5,0,Math.PI*2);ctx.fill();
    if(t==='pulsar'){
      const ang=(Date.now()/180)%(Math.PI*2);
      ctx.strokeStyle='rgba(180,220,255,0.65)';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(sx+Math.cos(ang)*sr,sy+Math.sin(ang)*sr);ctx.lineTo(sx+Math.cos(ang)*sr*10,sy+Math.sin(ang)*sr*10);ctx.stroke();
      ctx.beginPath();ctx.moveTo(sx-Math.cos(ang)*sr,sy-Math.sin(ang)*sr);ctx.lineTo(sx-Math.cos(ang)*sr*10,sy-Math.sin(ang)*sr*10);ctx.stroke();
    }
    return;
  }
  if(b.isStar()){
    const sc={blue_giant:'#aaccff',main_sequence_star:'#fffaaa',red_dwarf:'#ff6644',brown_dwarf:'#8B4513',red_giant:'#ff3300'}[t]||'#fff';
    const gr=sr*(t==='red_giant'?4.5:3.2),g=ctx.createRadialGradient(sx,sy,0,sx,sy,gr);
    g.addColorStop(0,'white');g.addColorStop(0.2,sc);g.addColorStop(0.7,sc+'66');g.addColorStop(1,'transparent');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(sx,sy,gr,0,Math.PI*2);ctx.fill();
    return;
  }
  
  // Planet / Moon rendering
  let col='#778899';
  if(t==='terrestrial_planet') col=b.molecules['H₂O']?'#3388cc':(b.composition['Fe']||0)>0.25?'#aa5533':'#668866';
  else if(t==='gas_giant') col='#cc9944';
  else if(t==='ice_giant') col='#44aacc';
  else if(t==='dwarf_planet') col='#889999';
  
  ctx.fillStyle=col;ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();
  
  if(b.hasAtmosphere&&sr>4){
    ctx.globalAlpha=0.22;
    const ac=b.molecules['H₂O']?'#4488ff':b.molecules['CH₄']?'#ee8800':'#88aaff';
    const ag=ctx.createRadialGradient(sx,sy,sr*0.8,sx,sy,sr*1.7);
    ag.addColorStop(0,ac);ag.addColorStop(1,'transparent');
    ctx.fillStyle=ag;ctx.beginPath();ctx.arc(sx,sy,sr*1.7,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
  
  if(b.lifeDetected){
    ctx.globalAlpha=0.15+Math.sin(Date.now()/500)*0.1;
    const lg=ctx.createRadialGradient(sx,sy,sr,sx,sy,sr*2.8);
    lg.addColorStop(0,'rgba(0,255,136,0.6)');lg.addColorStop(1,'rgba(0,255,136,0)');
    ctx.fillStyle=lg;ctx.beginPath();ctx.arc(sx,sy,sr*2.8,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  }
  
  if(sr>9&&cam.zoom>0.35){
    ctx.fillStyle='rgba(220,240,255,0.7)';ctx.font=`${Math.max(9,Math.min(12,sr*0.45))}px Inter`;
    ctx.fillText(b.name,sx+sr+4,sy-sr*0.5);
  }
}

// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// PROCEDURAL TERRAIN GENERATOR (BACKEND LOGIC)
// ═══════════════════════════════════════════════════
class SimpleNoise {
  constructor(seed = 1) {
    this.p = new Uint8Array(256);
    let s = seed;
    // Linear Congruential Generator for deterministic seeded randomness
    for (let i = 0; i < 256; i++) {
      s = (s * 1664525 + 1013904223) % 4294967296;
      this.p[i] = Math.floor((s / 4294967296) * 256);
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
  }
  fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  lerp(t, a, b) { return a + t * (b - a); }
  grad(hash, x, y) {
    const h = hash & 15;
    const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
  noise(x, y) {
    let X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = this.fade(x), v = this.fade(y);
    const A = this.perm[X] + Y, B = this.perm[X + 1] + Y;
    return this.lerp(v, 
      this.lerp(u, this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y)),
      this.lerp(u, this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1))
    );
  }
  fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0, frequency = 1, amplitude = 1, maxValue = 0;
    for(let i = 0; i < octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
}

class PlanetSurface {
  constructor(width, height, planetBody) {
    this.width = width;
    this.height = height;
    this.grid = new Array(width * height);
    this.planet = planetBody;
    // Use the planet's unique ID + name string length for persistent, deterministic terrain
    let seed = planetBody.id * 73 + (planetBody.name ? planetBody.name.length : 1);
    this.noiseGen = new SimpleNoise(seed);
    this.seaLevel = 0.45;
    this.generate();
  }
  
  getBiomeSet() {
    const p = this.planet;
    const t = p.temp;
    const bio = p.biochemistry ? p.biochemistry.id : 'none';
    
    // Default Earth-like biomes
    let b = { deep_sea: 'deep_water', sea: 'shallow_water', coast: 'sand', desert: 'desert', plains: 'plains', forest: 'forest', mountain: 'mountain', peak: 'snow' };
    
    if (t > 500) { // Molten / Super hot planet
      b = { deep_sea: 'magma', sea: 'lava', coast: 'basalt', desert: 'obsidian', plains: 'rock', forest: 'ash', mountain: 'volcano', peak: 'crater' };
    } else if (t < 150) { // Extremely cold (Cryo)
      b = { deep_sea: 'deep_methane', sea: 'methane_lake', coast: 'methane_ice', desert: 'dry_ice', plains: 'frozen_plains', forest: 'cryo_spires', mountain: 'ice_mountain', peak: 'frozen_peak' };
    }
    
    // Override based on specific biochemistries if life is present
    if (bio === 'methano-carbon') {
      b.deep_sea = 'deep_methane'; b.sea = 'methane_sea'; b.coast = 'hydrocarbon_sludge'; b.forest = 'cryo_flora';
    } else if (bio === 'ammonia-carbon') {
      b.deep_sea = 'deep_ammonia'; b.sea = 'ammonia_sea'; b.coast = 'ammonia_ice'; b.forest = 'amide_flora';
    } else if (bio === 'sulfuric-carbon') {
      b.deep_sea = 'deep_acid'; b.sea = 'sulfuric_acid'; b.coast = 'sulfur_crust'; b.forest = 'acid_flora';
    } else if (bio === 'silicon-thermo') {
      b.deep_sea = 'deep_magma'; b.sea = 'silicate_melt'; b.coast = 'glass_coast'; b.forest = 'crystal_forest';
    } else if (bio === 'radiotrophic') {
      b.forest = 'fungal_forest'; b.plains = 'lichen_plains';
    }
    
    // If no liquid solvents are present (and it's not molten), reduce sea level (dry planet)
    if (!p.molecules['H₂O'] && !p.molecules['CH₄'] && !p.molecules['NH₃'] && t < 500) {
      this.seaLevel = 0.2; 
    }

    return b;
  }

  generate() {
    const biomes = this.getBiomeSet();
    const sl = this.seaLevel;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const nx = x / 25, ny = y / 25;
        // Layered FBM for natural terrain features
        let e = this.noiseGen.fbm(nx, ny, 5) * 0.5 + 0.5;
        let m = this.noiseGen.fbm(nx + 13.3, ny + 7.1, 3) * 0.5 + 0.5;
        
        let type = '';
        if (e < sl - 0.1) type = biomes.deep_sea;
        else if (e < sl) type = biomes.sea;
        else if (e < sl + 0.05) type = biomes.coast;
        else if (e < 0.7) {
          if (m < 0.35) type = biomes.desert;
          else if (m < 0.65) type = biomes.plains;
          else type = biomes.forest;
        } else if (e < 0.85) type = biomes.mountain;
        else type = biomes.peak;
        
        let nutrients = { C: 10 + e * 20, N: 5 + m * 10, P: 2 + e * 5 };
        if(type === biomes.coast || type === biomes.deep_sea) {
          nutrients.N += 10;
          nutrients.P += 5;
        }
        
        let life = null;
        if(this.planet.lifeDetected && (type === biomes.deep_sea || type === biomes.coast) && this.noiseGen.fbm(nx, ny, 1) > 0.8) {
          life = { type: 'organic_soup', mass: 1, age: 0 };
        }
        
        this.grid[y * this.width + x] = { elevation: e, moisture: m, type: type, nutrients: nutrients, life: life };
      }
    }
  }
  
  tickAutomata() {
    if (!this.planet.lifeDetected) return;
    
    // Simple double-buffer array for life updates
    const newLife = new Array(this.width * this.height);
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        const tile = this.grid[idx];
        
        // Background nutrient replenishment (e.g. from vents/weathering)
        if (tile.nutrients.C < 50) tile.nutrients.C += 0.01;
        if (tile.nutrients.N < 50) tile.nutrients.N += 0.01;
        
        if (tile.life) {
          let l = { ...tile.life };
          l.age++;
          
          // Consume nutrients to grow
          if (tile.nutrients.C > 0.2 && tile.nutrients.N > 0.2) {
            tile.nutrients.C -= 0.2;
            tile.nutrients.N -= 0.2;
            l.mass += 0.1;
          } else {
            l.mass -= 0.15; // Starvation
          }
          
          if (l.mass <= 0) {
            // Death: return nutrients to soil
            tile.nutrients.C += 1.0;
            tile.nutrients.N += 1.0;
            newLife[idx] = null;
          } else {
            newLife[idx] = l;
            
            // Reproduction / Spreading
            if (l.mass > 2.0) {
              const neighbors = [
                {nx: x+1, ny: y}, {nx: x-1, ny: y}, {nx: x, ny: y+1}, {nx: x, ny: y-1}
              ];
              // Pick a random valid neighbor
              const valid = neighbors.filter(n => n.nx>=0 && n.nx<this.width && n.ny>=0 && n.ny<this.height);
              if (valid.length > 0) {
                 const target = valid[Math.floor(Math.random() * valid.length)];
                 const tidx = target.ny * this.width + target.nx;
                 const ttile = this.grid[tidx];
                 
                 // Can only spread to tiles with nutrients and not extreme heat
                 if (!newLife[tidx] && !ttile.life && ttile.nutrients.C > 1 && ttile.type !== 'magma' && ttile.type !== 'lava') {
                    newLife[tidx] = { type: l.type, mass: 0.5, age: 0 };
                    l.mass -= 0.5; // Cost of reproduction
                 }
              }
            }
          }
        }
      }
    }
    
    // Apply buffer
    for (let i = 0; i < this.grid.length; i++) {
      this.grid[i].life = newLife[i] || null;
    }
  }
  
  getTile(x, y) {
    if(x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.grid[Math.floor(y) * this.width + Math.floor(x)];
  }
}

// ═══════════════════════════════════════════════════
// BIOSPHERE VIEW
// ═══════════════════════════════════════════════════
const bioCanvas=document.getElementById('bio-canvas');
const bioCtx=bioCanvas.getContext('2d');

function enterBiosphere(){
  if(!selectedBody||!selectedBody.isPlanet())return;
  bioPlanet=selectedBody;
  document.getElementByIdSafe('biosphere-overlay').style.display='flex';
  document.getElementByIdSafe('bio-title').textContent='Biosphere: '+bioPlanet.name;
  document.getElementByIdSafe('detail-panel').style.display='none';
  const wrap=document.getElementByIdSafe('bio-canvas-wrap');
  bioCanvas.width=wrap.clientWidth;bioCanvas.height=wrap.clientHeight;
  makeTerrain();makeOrgs();updateBioPanel();
  if(bioAnimId)cancelAnimationFrame(bioAnimId);
  bioLoop();
}

function exitBiosphere(){
  document.getElementByIdSafe('biosphere-overlay').style.display='none';
  if(bioAnimId){cancelAnimationFrame(bioAnimId);bioAnimId=null;}
}

function makeTerrain(){
  bioTerrain=[];const w=bioCanvas.width;
  for(let i=0;i<=90;i++){
    const x=(i/90)*w,y=bioCanvas.height*0.55+Math.sin(i*0.14)*35+Math.sin(i*0.06)*45+Math.sin(i*0.28)*18;
    bioTerrain.push({x,y});
  }
}

function getTY(x){
  if(!bioTerrain)return bioCanvas.height*0.55;
  const w=bioCanvas.width,idx=Math.min(bioTerrain.length-2,Math.floor((x/w)*(bioTerrain.length-1)));
  const t=(x/w)*(bioTerrain.length-1)-idx;
  return(bioTerrain[idx]||{y:bioCanvas.height*0.55}).y*(1-t)+(bioTerrain[idx+1]||{y:bioCanvas.height*0.55}).y*t;
}

function getBioTheme(){
  const bio=bioPlanet&&bioPlanet.biochemistry;
  if(!bio||bio.id==='aqua-carbon')return{sky:'#0a1a3a',land:'#2a3a2a',water:'#1a3a6a',plant:'#22aa44',org:bio?bio.color:'#00d4ff'};
  if(bio.id==='methano-carbon')return{sky:'#1a0a00',land:'#3a2a11',water:'#664400',plant:'#884400',org:bio.color};
  if(bio.id==='silicon-thermo')return{sky:'#220800',land:'#551100',water:'#882200',plant:'#aa3300',org:bio.color};
  if(bio.id==='ammonia-carbon')return{sky:'#0a1a0a',land:'#1a2a1a',water:'#1a3a2a',plant:'#33aa66',org:bio.color};
  if(bio.id==='sulfuric-carbon')return{sky:'#1a1a00',land:'#3a3a00',water:'#aaaa00',plant:'#888800',org:bio.color};
  if(bio.id==='radiotrophic')return{sky:'#000a00',land:'#001800',water:'#002200',plant:'#00aa22',org:bio.color};
  return{sky:'#0a0a2a',land:'#2a3a2a',water:'#1a2a5a',plant:'#22aa44',org:bio?bio.color:'#00d4ff'};
}

function makeOrgs(){
  bioOrganisms=[];
  const stage=bioPlanet?bioPlanet.bioStage:-1;
  if(stage<1)return;
  const w=bioCanvas.width,n=Math.min(45,stage*7+5),th=getBioTheme();
  for(let i=0;i<n;i++){
    bioOrganisms.push({
      x:Math.random()*w,y:0,vx:(Math.random()-0.5)*0.3,
      size:3.5+Math.random()*stage*2.8,
      color:Math.random()<0.5?th.org:th.plant,
      type:Math.random()<0.4?'flora':'fauna',
      wig:Math.random()*Math.PI*2,ws:0.02+Math.random()*0.05,
      legs:stage>=4?Math.floor(Math.random()*4)+2:0,
    });
  }
}

function bioLoop(){
  bioAnimId=requestAnimationFrame(bioLoop);
  const w=bioCanvas.width,h=bioCanvas.height;
  const th=getBioTheme(),bio=bioPlanet&&bioPlanet.biochemistry,stage=bioPlanet?bioPlanet.bioStage:-1;
  bioCtx.clearRect(0,0,w,h);
  
  // Tick cellular automata on backend
  if(bioPlanet && bioPlanet.surface) {
    bioPlanet.surface.tickAutomata();
  }
  
  const sg=bioCtx.createLinearGradient(0,0,0,h*0.55);
  sg.addColorStop(0,th.sky);sg.addColorStop(1,lighten(th.sky,20));
  bioCtx.fillStyle=sg;bioCtx.fillRect(0,0,w,h*0.6);
  
  // Sun glow
  const sunC=bio?bio.color:'#fffaaa',sg2=bioCtx.createRadialGradient(w*0.82,h*0.12,0,w*0.82,h*0.12,70);
  sg2.addColorStop(0,'white');sg2.addColorStop(0.4,sunC);sg2.addColorStop(1,'transparent');
  bioCtx.fillStyle=sg2;bioCtx.beginPath();bioCtx.arc(w*0.82,h*0.12,70,0,Math.PI*2);bioCtx.fill();
  
  // Background hills
  bioCtx.fillStyle=darken(th.land,25);bioCtx.beginPath();bioCtx.moveTo(0,h);
  for(let x=0;x<=w;x+=25)bioCtx.lineTo(x,h*0.45+Math.sin(x*0.013)*55+Math.sin(x*0.007)*35);
  bioCtx.lineTo(w,h);bioCtx.closePath();bioCtx.fill();
  
  // Main terrain
  bioCtx.fillStyle=th.land;bioCtx.beginPath();bioCtx.moveTo(0,h);
  if(bioTerrain){bioCtx.moveTo(bioTerrain[0].x,h);for(const p of bioTerrain)bioCtx.lineTo(p.x,p.y);bioCtx.lineTo(bioTerrain[bioTerrain.length-1].x,h);}
  bioCtx.closePath();bioCtx.fill();
  
  // Liquid Sea
  const wy=h*0.58;bioCtx.fillStyle=th.water+'aa';bioCtx.fillRect(0,wy,w,h-wy);
  bioCtx.strokeStyle=th.water;bioCtx.lineWidth=1;bioCtx.globalAlpha=0.4;
  for(let i=0;i<3;i++){bioCtx.beginPath();for(let x=0;x<=w;x+=10){const y=wy+Math.sin((x+Date.now()/250+i*50)*0.05)*6;if(x===0)bioCtx.moveTo(x,y);else bioCtx.lineTo(x,y);}bioCtx.stroke();}
  bioCtx.globalAlpha=1;
  
  // Flora & Organisms
  if(stage>=4){for(let i=0;i<24;i++){const fx=(i/23)*w*0.9+w*0.05,fy=getTY(fx);drawFlora2(fx,fy,16+Math.sin(i*7)*8+stage*3,th.plant,bio);}}
  else if(stage>=2){bioCtx.globalAlpha=0.3;bioCtx.fillStyle=th.plant;for(let i=0;i<70;i++){const fx=Math.random()*w;bioCtx.beginPath();bioCtx.ellipse(fx,getTY(fx),7,2.5,0,0,Math.PI*2);bioCtx.fill();}bioCtx.globalAlpha=1;}
  
  for(const org of bioOrganisms){
    org.wig+=org.ws;
    if(org.type==='fauna'){org.x+=org.vx+Math.sin(org.wig)*0.2;if(org.x<0)org.x=w;if(org.x>w)org.x=0;org.y=getTY(org.x)-org.size;}
    else org.y=getTY(org.x)-org.size;
    drawOrg2(org,stage,th);
  }
  
  // Civilization structures
  if(stage>=6){
    bioCtx.fillStyle='rgba(255,200,100,0.6)';
    for(let i=0;i<9;i++){const bx=70+i*(w-140)/8,by=getTY(bx),bh=20+i%3*14;bioCtx.fillRect(bx-8,by-bh,16,bh);}
    bioCtx.fillStyle='rgba(255,230,120,0.4)';
    for(let i=0;i<30;i++){const lx=Math.random()*w;bioCtx.beginPath();bioCtx.arc(lx,getTY(lx)-3,1.8,0,Math.PI*2);bioCtx.fill();}
    const ph=(Date.now()/900)%1;
    bioCtx.strokeStyle=`rgba(0,230,255,${0.6-ph*0.6})`;bioCtx.lineWidth=1.5;bioCtx.beginPath();bioCtx.arc(w*0.5,getTY(w*0.5)-5,ph*90,0,Math.PI*2);bioCtx.stroke();
  }
  
  // Top HUD Bar
  bioCtx.fillStyle='rgba(0,0,25,0.7)';bioCtx.fillRect(0,0,w,28);
  bioCtx.fillStyle='rgba(0,230,255,0.9)';bioCtx.font='11px Orbitron,sans-serif';
  const sn=['Prebiotic','Replicators','Prokaryotic','Eukaryotic','Multicellular','Ecosystems','Sentient','Post-Bio'][Math.max(0,stage)]||'Unknown';
  bioCtx.fillText(`🧬 ${bioPlanet?bioPlanet.name:'—'} | Stage: ${sn} | ${bio?bio.name:'?'} | ${formatAge(bioPlanet?bioPlanet.bioAge:0)}`,12,18);
  
  if(bioPlanet){
    document.getElementByIdSafe('bio-age-display').textContent='Age: '+formatAge(bioPlanet.bioAge);
    advanceBio();
  }
}

function drawFlora2(x,y,h,col,bio){
  bioCtx.strokeStyle=darken(col,35);bioCtx.lineWidth=2;bioCtx.beginPath();bioCtx.moveTo(x,y);bioCtx.lineTo(x,y-h*0.55);bioCtx.stroke();
  bioCtx.fillStyle=col;bioCtx.globalAlpha=0.85;
  if(bio&&bio.id==='silicon-thermo'){
    bioCtx.beginPath();bioCtx.moveTo(x,y-h);for(let i=0;i<6;i++){const a=(i/6)*Math.PI*2;bioCtx.lineTo(x+Math.cos(a)*h*0.4,y-h*0.55+Math.sin(a)*h*0.4);}bioCtx.closePath();bioCtx.fill();
  }else{bioCtx.beginPath();bioCtx.arc(x,y-h*0.8,h*0.4,0,Math.PI*2);bioCtx.fill();}
  bioCtx.globalAlpha=1;
}

function drawOrg2(org,stage,th){
  bioCtx.fillStyle=org.color;const s=org.size;
  if(stage<=2){bioCtx.beginPath();bioCtx.ellipse(org.x,org.y,s,s*0.6,org.wig,0,Math.PI*2);bioCtx.fill();}
  else if(stage<=4){for(let i=0;i<3;i++){bioCtx.beginPath();bioCtx.arc(org.x+i*s*0.75,org.y+Math.sin(org.wig+i)*s*0.4,s*0.65,0,Math.PI*2);bioCtx.fill();}}
  else{
    bioCtx.beginPath();bioCtx.ellipse(org.x,org.y,s*1.5,s,0,0,Math.PI*2);bioCtx.fill();
    bioCtx.beginPath();bioCtx.arc(org.x+s*1.5,org.y,s*0.7,0,Math.PI*2);bioCtx.fill();
    bioCtx.strokeStyle=org.color;bioCtx.lineWidth=1.2;
    for(let i=0;i<Math.min(org.legs,4);i++){const la=(i/(org.legs-1||1)-0.5)*Math.PI*0.8;bioCtx.beginPath();bioCtx.moveTo(org.x,org.y+s*0.5);bioCtx.lineTo(org.x+Math.sin(la+org.wig*2)*s*2,org.y+s*1.5);bioCtx.stroke();}
  }
}

function advanceBio(){
  if(!bioPlanet)return;
  bioPlanet.computeHab();
  const hab=bioPlanet.habitability;
  if(hab<30)return;
  
  if(bioPlanet.bioStage<0){
    if(!bioPlanet.biochemistry)bioPlanet.biochemistry=bioPlanet.detectBiochem();
    if(bioPlanet.biochemistry)bioPlanet.bioStage=0;
  }
  if(bioPlanet.bioStage>=7)return;
  const ns=EVO_STAGES[bioPlanet.bioStage+1];if(!ns)return;
  const needed=ns.time*(50/Math.max(1,hab));
  
  if(bioPlanet.bioAge>needed){
    bioPlanet.bioStage++;makeOrgs();playChime();
    const nm=EVO_STAGES[bioPlanet.bioStage].name;
    bioPlanet.bioEvents.unshift({t:bioPlanet.bioAge,msg:'Stage '+bioPlanet.bioStage+': '+nm});
    CosmicTimeline.addEvent('EVOLUTION', bioPlanet.name, `Evolutionary milestone reached: ${nm}.`, cosmicAge, '#44ff88');
    const ev=document.getElementByIdSafe('bio-events');
    if(ev){
      const d=document.createElement('div');
      d.style.cssText='font-size:9px;padding:3px 7px;margin-bottom:3px;border-radius:4px;background:rgba(0,200,100,0.1);border:1px solid rgba(0,200,100,0.25);color:#44ff88;';
      d.textContent=formatAge(bioPlanet.bioAge)+': '+nm;if(ev.prepend) ev.prepend(d);
    }
    updateBioPanel();
    if(bioPlanet.bioStage===6){
      const civName = NAMES[Math.floor(Math.random()*NAMES.length)] + "ian";
      Civilizations.add(bioPlanet, civName);
      showNotif(`🏙️ ${civName} Empire evolved on ${bioPlanet.name}!`,'#00ff88');
      CosmicTimeline.addEvent('CIVILIZATION', civName + ' Empire', `A sentient civilization has emerged on ${bioPlanet.name}, beginning to manipulate its environment.`, cosmicAge, '#00ff88');
    }
  }
}

function updateBioPanel(){
  if(!bioPlanet)return;
  bioPlanet.computeHab();
  const bio=bioPlanet.detectBiochem();bioPlanet.biochemistry=bio;
  const chemDiv=document.getElementByIdSafe('bio-chem-info');
  chemDiv.innerHTML=bio?`<div style="color:${bio.color};font-weight:700;margin-bottom:3px;">${bio.name}</div><div>Solvent: ${bio.solvent}</div><div>Backbone: ${bio.backbone}</div><div>Energy: ${bio.energySrc}</div><div style="color:#8090a0;margin-top:3px;font-size:10px;">${bio.desc}</div>`:'<span style="color:#6080a0;">No biochemistry detected.</span>';
  
  const hab=bioPlanet.habitability,hc=hab>=75?'#00ff88':hab>=50?'#ffd700':hab>=25?'#ff8800':'#ff4444';
  document.getElementByIdSafe('bio-hab-info').innerHTML=`<div style="font-family:Orbitron;font-size:26px;font-weight:900;color:${hc};text-align:center;">${Math.round(hab)}<span style="font-size:12px;">/100</span></div><div style="background:rgba(80,150,255,0.1);border-radius:4px;height:6px;overflow:hidden;"><div style="width:${hab}%;height:100%;background:${hc};"></div></div><div style="font-size:10px;color:#8090a0;text-align:center;margin-top:4px;">${Math.round(bioPlanet.temp)}K surface temp</div>${bioPlanet.lifeDetected?'<div class="life-flag">🧬 LIFE POTENTIAL DETECTED</div>':''}`;
  
  const stage=bioPlanet.bioStage;
  document.getElementByIdSafe('evo-tree').innerHTML=EVO_STAGES.map(s=>`<div class="evo-stage${s.id<stage?' done':s.id===stage?' active':''}"><div class="evo-dot"></div><div><div style="font-weight:600;">${s.icon} ${s.name}</div><div style="color:#6080a0;">${s.desc}</div></div></div>`).join('');
  
  const atmo=document.getElementByIdSafe('bio-atmo');
  atmo.innerHTML=bioPlanet.hasAtmosphere?Object.keys(bioPlanet.molecules).map(k=>`<div style="padding:1px 0;">${k}: ✓ Present</div>`).join(''):'<span style="color:#6080a0;">No atmosphere.</span>';
}

function lighten(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);const c=v=>Math.min(255,v+a).toString(16).padStart(2,'0');return'#'+c(r)+c(g)+c(b);}
function darken(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);const c=v=>Math.max(0,v-a).toString(16).padStart(2,'0');return'#'+c(r)+c(g)+c(b);}

// ═══════════════════════════════════════════════════
// UI & CONTROLS
// ═══════════════════════════════════════════════════
function renderElemGrid(){
  const grid=document.getElementByIdSafe('element-grid');grid.innerHTML='';
  for(const el of ELEMENTS){
    const locked=!unlockedElements.has(el.sym),sel=selectedElem===el.sym;
    const d=document.createElement('div');
    d.className=`elem-btn${locked?' locked':''}${sel?' selected':''}`;
    d.id='e_'+el.sym.replace(/[^a-zA-Z0-9]/g,'_');
    d.title=el.name+'\n'+el.desc;
    d.innerHTML=`${locked?'<span class="lock-icon">🔒</span>':''}<div class="elem-symbol" style="color:${el.color}">${el.sym}</div><div class="elem-name">${el.name.split('-')[0]}</div>`;
    if(!locked)d.onclick=()=>selectElem2(el.sym);
    if(grid.appendChild) grid.appendChild(d);
  }
}

function renderProgress(){
  const div=document.getElementByIdSafe('progress-list');
  const phases=[
    {l:'BBN Elements',tot:6,un:[...unlockedElements].filter(s=>ELEMENTS.find(e=>e.sym===s&&e.phase==='BBN')).length},
    {l:'Stellar',tot:12,un:[...unlockedElements].filter(s=>ELEMENTS.find(e=>e.sym===s&&e.phase==='STELLAR')).length},
    {l:'Supernova',tot:15,un:[...unlockedElements].filter(s=>ELEMENTS.find(e=>e.sym===s&&e.phase==='SUPERNOVA')).length},
    {l:'Molecules',tot:MOLECULES.length,un:discoveredMolecules.size},
  ];
  div.innerHTML=phases.map(p=>`<div style="margin-bottom:7px;"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;"><span>${p.l}</span><span style="color:var(--accent2)">${p.un}/${p.tot}</span></div><div class="progress-wrap"><div class="progress-fill" style="width:${(p.un/p.tot)*100}%"></div></div></div>`).join('');
}

function selectElem2(sym){
  if(!unlockedElements.has(sym))return;
  selectedElem=sym;setTool('place');renderElemGrid();
  playTone(400, 'sine', 0.05, 0.05);
}

function unlockElem(sym){
  if(unlockedElements.has(sym))return;unlockedElements.add(sym);
  const el=ELEMENTS.find(e=>e.sym===sym);if(!el)return;
  showNotif(`🔓 Element Unlocked: ${el.name} (${sym})`,'#00d4ff');
  addLog(`⚛ ${el.name} (${sym}) — ${el.phase}`);
  renderElemGrid();
  setTimeout(()=>{const btn=document.getElementByIdSafe('e_'+sym.replace(/[^a-zA-Z0-9]/g,'_'));if(btn){btn.classList.add('new-unlock');}},100);
}

const notifBuffer = new Map();
function showNotif(msg, col='#ffd700', groupKey=null, count=1) {
  let key = groupKey;
  if (!key) {
    if (msg.includes('Cloud collapsed')) key = 'cloud_collapse';
    else if (msg.includes('Molecule Synthesized')) key = 'molecule_synth';
    else if (msg.includes('expanded into a Red Giant')) key = 'red_giant';
    else if (msg.includes('went Supernova') || msg.includes('SUPERNOVA')) key = 'supernova';
    else if (msg.includes('Element Unlocked')) key = 'element_unlock';
    else if (msg.includes('shed outer envelope')) key = 'white_dwarf';
    else if (msg.includes('Particle cap reached')) key = 'cap_reached';
    else key = msg;
  }

  if (!notifBuffer.has(key)) {
    notifBuffer.set(key, { count, col, origMsg: msg, timer: null });
    
    if (key.startsWith('spawn_')) {
      notifBuffer.get(key).timer = setTimeout(() => {
        const data = notifBuffer.get(key);
        notifBuffer.delete(key);
        const elemName = key.split('_')[1];
        if (data.count > 10) {
           const finalMsg = `${data.count}+ ${elemName} particles spawned`;
           window.dispatchEvent(new CustomEvent('engine-notif', { detail: { msg: finalMsg, col: data.col } }));
        } else if (data.count > 0) {
           window.dispatchEvent(new CustomEvent('engine-notif', { detail: { msg: `${data.count} ${elemName} particle(s) spawned`, col: data.col } }));
        }
      }, 500);
    } else {
      window.dispatchEvent(new CustomEvent('engine-notif', { detail: { msg, col } }));
      notifBuffer.get(key).timer = setTimeout(() => {
        const data = notifBuffer.get(key);
        notifBuffer.delete(key);
        if (data.count > 1) {
          let summary = `${data.count} identical events occurred`;
          if (key === 'cloud_collapse') summary = `${data.count}+ protostellar clouds collapsed into stars`;
          else if (key === 'molecule_synth') summary = `${data.count}+ new molecules synthesized`;
          else if (key === 'red_giant') summary = `${data.count}+ stars expanded into Red Giants`;
          else if (key === 'supernova') summary = `${data.count}+ stars went Supernova`;
          else if (key === 'white_dwarf') summary = `${data.count}+ stars shed envelopes into White Dwarfs`;
          else if (key === 'element_unlock') summary = `${data.count}+ new elements unlocked`;
          else if (key === 'cap_reached') summary = `Particle cap reached (${data.count} blocked)`;
          
          window.dispatchEvent(new CustomEvent('engine-notif', { detail: { msg: summary, col: data.col } }));
        }
      }, 2000);
    }
  } else {
    notifBuffer.get(key).count += count;
  }
}

function addLog(msg){
  window.dispatchEvent(new CustomEvent('engine-log', { detail: { msg } }));
}

function setTool(t){
  currentTool=t;document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
  const b=document.getElementByIdSafe('tool-'+t);if(b)b.classList.add('active');
  document.getElementByIdSafe('brush-controls').style.display=t==='nebula'?'block':'none';
  canvas.style.cursor=t==='pan'?'grab':'crosshair';
}

function setSpeed(s,btn){
  speedMult=s;
  document.querySelectorAll('.speed-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
}

function togglePause(){
  paused=!paused;
  document.getElementByIdSafe('pause-btn').textContent=paused?'▶':'⏸';
}

function formatAge(y){
  if(y<1e3)return Math.round(y)+' Yr';
  if(y<1e6)return(y/1e3).toFixed(1)+' Kyr';
  if(y<1e9)return(y/1e6).toFixed(2)+' Myr';
  return(y/1e9).toFixed(3)+' Gyr';
}

function showDetail(b){
  selectedBody=b;const panel=document.getElementByIdSafe('detail-panel');panel.style.display='block';
  document.getElementByIdSafe('dp-title').textContent=b.name;
  
  const tl={'protostellar_cloud':'🌌 Protostellar Cloud','terrestrial_planet':'🪨 Terrestrial Planet','gas_giant':'🪐 Gas Giant','ice_giant':'❄️ Ice Giant','dwarf_planet':'⬜ Dwarf Planet','main_sequence_star':'⭐ Main Sequence Star','red_dwarf':'🔴 Red Dwarf','blue_giant':'💙 Blue Giant','red_giant':'🔴 Red Giant','brown_dwarf':'🟤 Brown Dwarf','white_dwarf':'⚪ White Dwarf','neutron_star':'💫 Neutron Star','pulsar':'📡 Pulsar','black_hole':'⚫ Black Hole','supermassive_bh':'🕳️ Supermassive BH'};
  const top=Object.entries(b.composition).sort((a,c)=>c[1]-a[1]).slice(0,5);
  const cHTML=top.map(([el,f])=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"><div style="width:${Math.round(f*100)}%;height:5px;background:${ELEM_COLORS[el]||'#888'};border-radius:2px;min-width:4px;"></div><span style="font-size:10px;color:${ELEM_COLORS[el]||'#888'};min-width:28px;">${el}</span><span style="font-size:9px;color:#8090a0;">${(f*100).toFixed(1)}%</span></div>`).join('');
  const mHTML=Object.keys(b.molecules||{}).length>0?Object.keys(b.molecules).map(m=>`<span style="background:rgba(80,150,255,0.15);border:1px solid rgba(80,150,255,0.3);border-radius:4px;padding:2px 6px;font-size:9px;margin:2px;display:inline-block;">${m}</span>`).join(''):'<span style="color:#6080a0;font-size:9px;">None</span>';
  
  b.computeHab();const hab=b.habitability,hc=hab>=75?'#00ff88':hab>=50?'#ffd700':hab>=25?'#ff8800':'#ff4444';
  
  document.getElementByIdSafe('dp-content').innerHTML=`
    <div class="detail-row"><span class="detail-key">Type</span><span class="detail-val">${tl[b.type]||b.type}</span></div>
    <div class="detail-row"><span class="detail-key">Mass</span><span class="detail-val">${b.mass.toExponential(2)}</span></div>
    <div class="detail-row"><span class="detail-key">Temp</span><span class="detail-val">${Math.round(b.temp)}K</span></div>
    <div style="margin:8px 0 4px;font-size:9px;color:var(--text-dim);text-transform:uppercase;">Composition</div>${cHTML}
    <div style="margin:8px 0 4px;font-size:9px;color:var(--text-dim);text-transform:uppercase;">Molecules</div>${mHTML}
    ${b.isPlanet()?`<div style="margin:8px 0 4px;font-size:9px;color:var(--text-dim);text-transform:uppercase;">Habitability</div><div style="font-family:Orbitron;font-size:24px;font-weight:900;color:${hc};text-align:center;">${Math.round(hab)}<span style="font-size:11px;">/100</span></div><div style="background:rgba(80,150,255,0.1);border-radius:4px;height:5px;overflow:hidden;"><div style="width:${hab}%;height:100%;background:${hc};"></div></div>${b.lifeDetected?'<div class="life-flag">🧬 Life Potential Detected!</div>':''}`:''}
  `;
  
  const bb=document.getElementByIdSafe('bio-enter-btn');
  if(bb)bb.style.display=(b.isPlanet()&&b.lifeDetected)?'block':'none';
}

// ═══════════════════════════════════════════════════
// PRESET SPAWNERS
// ═══════════════════════════════════════════════════
function spawnPreset(type){
  initAudio();
  const wx=cam.x, wy=cam.y;
  if(type==='star'){
    const star=new Body(wx,wy,6e10,{H:0.75,He:0.25});
    bodies.push(star);onMerge(star);
    showNotif('⭐ Star Created!','#ffdd44');
  }else if(type==='system'){
    const star=new Body(wx,wy,8e10,{H:0.75,He:0.25});
    bodies.push(star);onMerge(star);
    
    // Spawn 2 planets in orbit
    const p1=new Body(wx+140,wy,8e9,{Si:0.4,O:0.3,Fe:0.2,C:0.1});
    p1.vy=Math.sqrt(G*star.mass/140)*1.8;
    bodies.push(p1);onMerge(p1);
    
    const p2=new Body(wx-240,wy,1.5e10,{H:0.5,He:0.3,O:0.1,C:0.1});
    p2.vy=-Math.sqrt(G*star.mass/240)*1.8;
    bodies.push(p2);onMerge(p2);
    
    showNotif('🪐 Solar System Spawned!','#00d4ff');
  }
}

// ═══════════════════════════════════════════════════
// INPUT CONTROLS
// ═══════════════════════════════════════════════════
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('mousedown',e=>{
  initAudio();
  if(e.target!==canvas)return;
  const[wx,wy]=s2w(e.clientX,e.clientY);
  
  if(e.button===1||e.button===2||currentTool==='pan'){
    isDragging=true;dragStart={x:e.clientX,y:e.clientY};camDragStart={x:cam.x,y:cam.y};
    canvas.classList.add('panning');return;
  }
  
  if(currentTool==='delete'){
    let nd=35,nb=null;
    for(const b of bodies){if(!b.active)continue;const[sx,sy]=w2s(b.x,b.y);const d=Math.hypot(sx-e.clientX,sy-e.clientY);if(d<nd){nd=d;nb=b;}}
    for(const p of particles){if(!p.active)continue;const[sx,sy]=w2s(p.x,p.y);const d=Math.hypot(sx-e.clientX,sy-e.clientY);if(d<nd){nd=d;nb=p;}}
    if(nb)nb.active=false;return;
  }
  
  if(currentTool==='nebula'){spawnNebula(wx,wy);return;}
  
  if(currentTool==='place'){
    let hit=null;
    for(const b of bodies){if(!b.active)continue;const[sx,sy]=w2s(b.x,b.y);const sr=Math.max(10,b.radius*cam.zoom);if(Math.hypot(sx-e.clientX,sy-e.clientY)<sr){hit=b;break;}}
    if(hit){showDetail(hit);return;}
    if(!selectedElem)selectedElem='H';
    velocityDrag={wx,wy,ex:e.clientX,ey:e.clientY,sx:e.clientX,sy:e.clientY};
  }
});

canvas.addEventListener('mousemove',e=>{
  mousePos={x:e.clientX,y:e.clientY};
  if(isDragging&&dragStart){cam.x=camDragStart.x-(e.clientX-dragStart.x)/cam.zoom;cam.y=camDragStart.y-(e.clientY-dragStart.y)/cam.zoom;}
  if(velocityDrag){velocityDrag.ex=e.clientX;velocityDrag.ey=e.clientY;}
});

canvas.addEventListener('mouseup',e=>{
  isDragging=false;dragStart=null;canvas.classList.remove('panning');
  if(velocityDrag&&currentTool==='place'&&selectedElem){
    const{wx,wy,sx,sy}=velocityDrag;
    const vx=(sx-e.clientX)*0.035/cam.zoom,vy=(sy-e.clientY)*0.035/cam.zoom;
    spawn(wx,wy,selectedElem,vx,vy);velocityDrag=null;
  }
});

canvas.addEventListener('wheel',e=>{
  if(e.target!==canvas)return;
  e.preventDefault();
  const[wx,wy]=s2w(e.clientX,e.clientY);
  cam.zoom=Math.max(0.01,Math.min(100,cam.zoom*(e.deltaY>0?0.88:1.14)));
  const[nsx,nsy]=w2s(wx,wy);cam.x+=(nsx-e.clientX)/cam.zoom;cam.y+=(nsy-e.clientY)/cam.zoom;
},{passive:false});

document.addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault();togglePause();}
  if(e.code==='Escape'){selectedBody=null;document.getElementByIdSafe('detail-panel').style.display='none';}
});

function spawn(wx,wy,el,vx=0,vy=0){
  if(!unlockedElements.has(el))return;
  if(particles.filter(p=>p.active).length+bodies.filter(b=>b.active).length>=MAX_P){showNotif('⚠️ Particle cap reached!','#ff8800');return;}
  const p = new Particle(wx,wy,el,vx,vy); particles.push(p); 
  showNotif(`1 ${el} particle spawned`, '#ffffff', `spawn_${el}`, 1);
  playTone(500+Math.random()*200, 'sine', 0.04, 0.04);
}

function spawnNebula(wx,wy){
  if(!selectedElem||!unlockedElements.has(selectedElem))selectedElem='H';
  const bs=parseInt(document.getElementByIdSafe('brush-size').value);
  const spin=parseFloat(document.getElementByIdSafe('spin-amount').value)/10;
  const cnt=parseInt(document.getElementByIdSafe('nebula-count').value);
  const tot=particles.filter(p=>p.active).length+bodies.filter(b=>b.active).length;
  const can=Math.min(cnt,MAX_P-tot);
  
  for(let i=0;i<can;i++){
    const a=Math.random()*Math.PI*2,r=Math.random()*bs/cam.zoom;
    const px=wx+Math.cos(a)*r,py=wy+Math.sin(a)*r;
    const tx=-Math.sin(a)*spin*r*0.02,ty=Math.cos(a)*spin*r*0.02;
    spawn(px,py,selectedElem,tx+(Math.random()-0.5)*0.3,ty+(Math.random()-0.5)*0.3);
  }
}

// ═══════════════════════════════════════════════════
// BIG BANG IGNITION
// ═══════════════════════════════════════════════════
function initStarsBg() {
  const bg=document.getElementByIdSafe('stars-bg');
  if(!bg || !bg.appendChild) return;
  for(let i=0;i<200;i++){
    const s=document.createElement('div');
    s.className='star-dot';
    s.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${Math.random()*2.5}px;height:${Math.random()*2.5}px;animation-delay:${Math.random()*3}s;animation-duration:${2+Math.random()*3}s;`;
    bg.appendChild(s);
  }
}
function triggerBigBang(clientX, clientY){
  CosmicTimeline.addEvent("COSMOS", "Universe", "The Big Bang occurred, releasing primordial elements.", 0, "#ffffff");
  initAudio();playBoom();
  
  const[wx,wy]=s2w(clientX,clientY);
  supernovaFlashes.push({x:wx,y:wy,r:70,t:0,mt:100});
  
  const bbn=['H','H','H','H','²H','He','He','He','³He','Li','Be'];
  for(let i=0;i<120;i++){
    const a=Math.random()*Math.PI*2,sp=0.5+Math.random()*3.5;
    const el=bbn[Math.floor(Math.random()*bbn.length)];
    const p = new Particle(wx + Math.cos(a)*Math.random()*800, wy + Math.sin(a)*Math.random()*800, el, Math.cos(a)*sp*25, Math.sin(a)*sp*25); particles.push(p); 
  }
  
  showNotif('🌌 Big Bang Ignited! Primordial Elements Unlocked!','#ffd700');
  addLog('🌌 Big Bang! BBN Nucleosynthesis begins.');
  renderElemGrid();renderProgress();startLoop();
}

// ═══════════════════════════════════════════════════
// MAIN GAME LOOP
// ═══════════════════════════════════════════════════
let lastT=0,fpsBuf=[],fc=0;
function startLoop(){requestAnimationFrame(loop);}
function loop(ts){
  requestAnimationFrame(loop);
  const rawDt=Math.min(0.05,(ts-lastT)/1000);lastT=ts;
  fpsBuf.push(1/(rawDt||0.016));if(fpsBuf.length>30)fpsBuf.shift();
  fc++;
  if(fc%20===0){
    document.getElementByIdSafe('hud-fps').textContent=Math.round(fpsBuf.reduce((a,b)=>a+b)/fpsBuf.length);
    document.getElementByIdSafe('hud-age').textContent=formatAge(cosmicAge);
    renderProgress();
  }
  
  if(!paused){
    const validSpeedMult = (Number.isFinite(speedMult) && speedMult > 0) ? speedMult : 1;
    
    // Time Dilation / Throttling: If Biosphere (Layer 2) is active, slow down the background universe (Layer 1)
    const isBiosphereActive = (typeof bioPlanet !== 'undefined' && bioPlanet !== null && document.getElementByIdSafe('biosphere-overlay').style.display === 'flex');
    const dilation = isBiosphereActive ? 0.05 : 1.0;
    
    const physDt = Math.min(Math.max(0.001, (DT_BASE * validSpeedMult * dilation)), 0.35); 
    const ageDt = DT_BASE * validSpeedMult * YEAR_SCALE * dilation;
    cosmicAge += Number.isFinite(ageDt) ? ageDt : 0;
    if (!Number.isFinite(cosmicAge) || isNaN(cosmicAge)) cosmicAge = 0;
    physicsStep(physDt, ageDt);
  }
  render();
}

// ═══════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════
window.addEventListener('resize',resize);
window.addEventListener('civ-launch-ship', (e) => {
  const { civ, homePlanet } = e.detail;
  // Spawn a small high-speed body
  const ship = new Body(homePlanet.x + 50, homePlanet.y + 50, 1e7, {Fe: 0.5, Ti: 0.5});
  ship.name = civ.name + " Explorer";
  ship.type = 'dwarf_planet'; // treated as small asteroid/ship
  ship.vx = homePlanet.vx + (Math.random() - 0.5) * 20;
  ship.vy = homePlanet.vy + (Math.random() - 0.5) * 20;
  bodies.push(ship);
  showNotif(`🚀 ${civ.name} launched an interstellar ship!`, civ.color);
});
resize();renderElemGrid();renderProgress();

  

function restoreState(state) {
  cosmicAge = state.age || 0;
  particles = [];
  for(const p of state.particles) {
    const np = new Particle(p.x, p.y, p.elem, p.vx, p.vy);
    np.life = p.life;
    particles.push(np); 
  }
  bodies = [];
  for(const b of state.bodies) {
    const nb = new Body(b.x, b.y, b.mass, b.radius, b.elem, b.vx, b.vy);
    Object.assign(nb, b);
    bodies.push(nb);
  }
  unlockedElements.clear();
  if(state.unlocked) state.unlocked.forEach(el => unlockedElements.add(el));
  updateHUD();
}


  window.sim = {
    Body,
    Particle,
    physicsStep,
    doMerge,
    triggerSN,
    evolveStars,
    calcMolecules,
    QT,
    collide,
    getBodies: () => bodies,
    getParticles: () => particles,
    resetArrays: () => { particles = []; bodies = []; },
    MAX_P,
    restoreState,
    get bodies() { return bodies; },
    get particles() { return particles; },
    get cosmicAge() { return cosmicAge; },
    get paused() { return paused; },
    set paused(v) { paused = v; },
    get speedMult() { return speedMult; },
    set speedMult(v) { speedMult = v; },
    get selectedElem() { return selectedElem; },
    set selectedElem(v) { selectedElem = v; },
    get currentTool() { return currentTool; },
    set currentTool(v) { currentTool = v; },
    get selectedBody() { return selectedBody; },
    set selectedBody(v) { selectedBody = v; },
    get bioPlanet() { return bioPlanet; },
    set bioPlanet(v) { bioPlanet = v; },
    get soundEnabled() { return soundEnabled; },
    set soundEnabled(v) { soundEnabled = v; },
    get cam() { return cam; },
    get bioOrganisms() { return bioOrganisms; },
    get bioTerrain() { return bioTerrain; },
    get unlockedElements() { return unlockedElements; },
    setTool,
    spawnPreset,
    triggerBigBang,
    playBoom,
    playTone,
    formatAge,
    enterBiosphere: typeof enterBiosphere !== 'undefined' ? enterBiosphere : null,
    exitBiosphere: typeof exitBiosphere !== 'undefined' ? exitBiosphere : null,
    triggerDisaster: typeof triggerDisaster !== 'undefined' ? triggerDisaster : null,
    spawnBioEntity: typeof spawnBioEntity !== 'undefined' ? spawnBioEntity : null,
  };
};


