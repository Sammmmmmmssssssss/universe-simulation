import math
import random
from config import *
from elements import get_elem, elem_fusion, elem_decay
from life import compute_molecules, compute_habitability

NAME_BASES = ["Kepler","Lyra","Vega","Nova","Atlas","Orion","Draco","Hydra","Pavo","Cygni","Solus","Helios","Aquila","Astra","Lupus","Phoenix","Centauri","Rigel","Aldebaran","Sirius"]
_name_idx = [0]

def gen_name():
    n = NAME_BASES[_name_idx[0] % len(NAME_BASES)]
    _name_idx[0] += 1
    return f"{n}-{100+random.randint(0,999)}"

# ── Quadtree (Barnes-Hut) ──
class QTNode:
    def __init__(self, x, y, w, h, depth=0, max_depth=30, theta=0.5):
        self.x=x; self.y=y; self.w=w; self.h=h; self.depth=depth
        self.mass=0; self.cx=0; self.cy=0; self.p=None; self.ch=None
        self.max_depth=max_depth; self.theta=theta
    def insert(self, p):
        if not p.active or math.isnan(p.x) or math.isnan(p.y): return
        if not self.ch and not self.p:
            self.p=p; self.mass=p.mass; self.cx=p.x; self.cy=p.y; return
        if not self.ch:
            if self.depth>=self.max_depth: self.mass+=p.mass; return
            hw=self.w/2; hh=self.h/2; nd=self.depth+1
            self.ch=[
                QTNode(self.x,self.y,hw,hh,nd,self.max_depth,self.theta),
                QTNode(self.x+hw,self.y,hw,hh,nd,self.max_depth,self.theta),
                QTNode(self.x,self.y+hh,hw,hh,nd,self.max_depth,self.theta),
                QTNode(self.x+hw,self.y+hh,hw,hh,nd,self.max_depth,self.theta),
            ]
            if self.p:
                if self.p.x==p.x and self.p.y==p.y:
                    p.x+=(random.random()-0.5)*0.1; p.y+=(random.random()-0.5)*0.1
                self._ins(self.p); self.p=None
        self._ins(p)
        tm=self.mass+p.mass
        self.cx=(self.cx*self.mass+p.x*p.mass)/tm; self.cy=(self.cy*self.mass+p.y*p.mass)/tm
        self.mass=tm
    def _ins(self, p):
        mx=self.x+self.w/2; my=self.y+self.h/2
        self.ch[(0 if p.x<mx else 1)+(0 if p.y<my else 2)].insert(p)
    def force(self, p):
        if not self.mass: return (0.0,0.0)
        dx=self.cx-p.x; dy=self.cy-p.y; r2=dx*dx+dy*dy+SOFTEN
        if not self.ch or (self.w*self.w)/r2<self.theta*self.theta:
            if r2<9: return (0.0,0.0)
            f=G*p.mass*self.mass/r2; r=math.sqrt(r2)
            return (f*dx/r, f*dy/r)
        fx=0.0; fy=0.0
        for c in self.ch:
            a,b=c.force(p); fx+=a; fy+=b
        return (fx,fy)

# ── Particle ──
class Particle:
    def __init__(self, x=0, y=0, elem="H", vx=0.0, vy=0.0):
        self.x=x; self.y=y; self.vx=vx; self.vy=vy; self.ax=0; self.ay=0
        self.elem=elem; self.active=True; self.temp=2.7
        self.mass=MASS_BASE; self.radius=6.0
        self.id=f"p{random.getrandbits(48):013x}"
    @property
    def color(self):
        e=get_elem(self.elem); return e["color"] if e else "#ffffff"
    def to_dict(self):
        return {"id":self.id,"x":self.x,"y":self.y,"elem":self.elem,"mass":self.mass}

# ── Body ──
class Body:
    def __init__(self, x, y, mass, comp):
        self.x=x; self.y=y; self.vx=0; self.vy=0; self.ax=0; self.ay=0
        self.mass=mass; self.composition=comp; self.active=True
        self.name=gen_name(); self.temp=100; self.type=""; self.stage_age=0
        self.luminosity=0; self.has_atmosphere=False; self.molecules={}
        self.habitability=0; self.life_detected=False; self.biochemistry=None
        self.bio_stage=-1; self.bio_age=0; self.bio_events=[]
        self.id=f"b{random.getrandbits(48):013x}"
        self.classify()
    @property
    def hFrac(self): return self.composition.get("H",0)
    @property
    def radius(self):
        if self.type in ("black_hole","supermassive_bh"): return math.log(self.mass)*1.5
        if self.type in ("neutron_star","pulsar"): return 4
        if self.type=="white_dwarf": return 7
        return max(4, math.cbrt(self.mass)*0.004)
    def is_star(self):
        return self.type in ("blue_giant","main_sequence_star","red_dwarf","brown_dwarf","red_giant","white_dwarf","neutron_star","pulsar","black_hole","supermassive_bh")
    def is_planet(self):
        return self.type in ("terrestrial_planet","gas_giant","ice_giant","dwarf_planet")
    def classify(self):
        m=self.mass; h=self.hFrac
        if m>MASS_SUPERMASSIVE_BH: self.type="supermassive_bh"; self.temp=0
        elif m>MASS_BLACK_HOLE: self.type="black_hole"; self.temp=0
        elif m>MASS_NEUTRON_STAR: self.type="neutron_star"; self.temp=1e6
        elif m>MASS_WHITE_DWARF: self.type="white_dwarf"; self.temp=25000
        elif m>MASS_STAR_MIN and h>0.1:
            if m>8e10: self.type="blue_giant"; self.temp=30000
            elif m>5e10: self.type="main_sequence_star"; self.temp=10000
            elif m>3.5e10: self.type="red_dwarf"; self.temp=4000
            else: self.type="brown_dwarf"; self.temp=1500
        elif m>MASS_PLANET_MIN:
            o=self.composition.get("O",0); n=self.composition.get("N",0)
            if h>0.4: self.type="gas_giant"; self.temp=150
            elif o+n>0.1: self.type="ice_giant"; self.temp=60
            else: self.type="terrestrial_planet"; self.temp=250
        elif m>MASS_DWARF_PLANET: self.type="dwarf_planet"
        elif m>MASS_MOON_MIN: self.type="major_moon" if self.hFrac>0.3 else "minor_moon"
        elif m>MASS_ASTEROID: self.type="asteroid"
        else: self.type="meteoroid"
        self._update_luminosity()
    def _update_luminosity(self):
        if not self.is_star(): self.luminosity=0; return
        rel=self.mass/5e10; self.luminosity=pow(max(0.001,rel),3.5)
    def update_temp(self, stars):
        if not self.is_planet() or not stars: return
        nd=min((math.hypot(self.x-s.x,self.y-s.y) for s in stars if s.active and s.luminosity>0), default=float('inf'))
        if nd==float('inf'): return
        hr=max((s for s in stars if s.active and s.luminosity>0), key=lambda s:s.luminosity, default=None)
        if not hr: return
        self.temp=max(3, hr.temp * pow(hr.radius/(2*max(nd,1)),0.5)*0.7)
        if self.has_atmosphere: self.temp*=1.25

# ── Physics Step ──
def physics_step(particles, bodies, phys_dt, age_dt, star_dt, events_out):
    all_objs = [p for p in particles if p.active] + [b for b in bodies if b.active]
    if not all_objs: return

    mnX=min((p.x for p in all_objs), default=0)
    mxX=max((p.x for p in all_objs), default=0)
    mnY=min((p.y for p in all_objs), default=0)
    mxY=max((p.y for p in all_objs), default=0)

    pad=500
    qt=QTNode(mnX-pad, mnY-pad, mxX-mnX+pad*2, mxY-mnY+pad*2)
    for p in all_objs:
        if not p.active or math.isnan(p.x) or math.isnan(p.y): continue
        qt.insert(p)

    for p in all_objs:
        if not p.active: continue
        spd=math.hypot(p.vx,p.vy)
        if spd>MAX_SPEED:
            p.vx=(p.vx/spd)*MAX_SPEED; p.vy=(p.vy/spd)*MAX_SPEED
        p.x+=p.vx*phys_dt+0.5*p.ax*phys_dt*phys_dt
        p.y+=p.vy*phys_dt+0.5*p.ay*phys_dt*phys_dt
        if math.isnan(p.x): p.x=0
        if math.isnan(p.y): p.y=0

    for p in all_objs:
        if not p.active: continue
        fx,fy=qt.force(p)
        nax=fx/p.mass; nay=fy/p.mass
        rx=ry=0.0
        if isinstance(p, Particle):
            for q in all_objs:
                if q is p or not q.active: continue
                dx=p.x-q.x; dy=p.y-q.y; r2=dx*dx+dy*dy
                if 0.5<r2<1000:
                    k=6e8/(r2*math.sqrt(r2))
                    rx+=dx*k; ry+=dy*k
        p.vx+=0.5*(p.ax+nax+rx/p.mass)*phys_dt
        p.vy+=0.5*(p.ay+nay+ry/p.mass)*phys_dt
        p.vx*=0.999; p.vy*=0.999
        p.ax=nax; p.ay=nay
        if isinstance(p, Particle):
            for b in bodies:
                if not b.active or not b.is_star() or not b.luminosity: continue
                dx=p.x-b.x; dy=p.y-b.y; r2=dx*dx+dy*dy
                if r2<2e5:
                    w=b.luminosity*2000/(r2+1)
                    p.vx+=dx*w*phys_dt; p.vy+=dy*w*phys_dt

    _handle_collisions(particles, bodies, events_out)
    _evolve_stars(bodies, star_dt, events_out)
    compute_molecules(bodies, events_out)
    for b in bodies:
        if not b.active or not b.is_planet(): continue
        stars=[s for s in bodies if s.active and s.is_star() and s.luminosity>0]
        b.update_temp(stars)
        compute_habitability(b)
        if b.life_detected:
            b.bio_age+=age_dt
    for b in bodies:
        if not b.active or not b.is_star(): continue
        _do_decay(b, age_dt)

def _handle_collisions(particles, bodies, events_out):
    all_objs=[p for p in particles if p.active]+[b for b in bodies if b.active]
    for i in range(len(all_objs)):
        a=all_objs[i]
        if not a.active:
            continue
        for j in range(i+1,len(all_objs)):
            b=all_objs[j]
            if not b.active: continue
            dx=a.x-b.x; dy=a.y-b.y; r2=dx*dx+dy*dy
            ra=a.radius if isinstance(a,Body) else 2.5
            rb=b.radius if isinstance(b,Body) else 2.5
            if r2>(ra+rb)*(ra+rb): continue
            vx=a.vx-b.vx; vy=a.vy-b.vy
            if vx*dx+vy*dy>0: continue
            mr=max(a.mass,b.mass)/min(a.mass,b.mass)
            spd=math.hypot(vx,vy)
            if isinstance(a,Body) or isinstance(b,Body) or mr>1.5 or spd<20:
                _do_merge(a,b,particles,bodies,events_out)
                break
            else:
                r=math.sqrt(r2) or 0.001; nx=dx/r; ny=dy/r
                imp=0.8*(vx*dx+vy*dy)/(a.mass+b.mass)
                a.vx-=imp*b.mass*nx; a.vy-=imp*b.mass*ny
                b.vx+=imp*a.mass*nx; b.vy+=imp*a.mass*ny

def _do_merge(a,b,particles,bodies,events_out):
    tm=a.mass+b.mass
    nx=(a.x*a.mass+b.x*b.mass)/tm; ny=(a.y*a.mass+b.y*b.mass)/tm
    nvx=(a.vx*a.mass+b.vx*b.mass)/tm; nvy=(a.vy*a.mass+b.vy*b.mass)/tm
    ac=a.composition if isinstance(a,Body) else {a.elem:1}
    bc=b.composition if isinstance(b,Body) else {b.elem:1}
    comp={}
    keys=set(list(ac.keys())+list(bc.keys()))
    for k in keys: comp[k]=((ac.get(k,0)*a.mass)+(bc.get(k,0)*b.mass))/tm
    a.active=False; b.active=False
    nb=Body(nx,ny,tm,comp)
    nb.vx=nvx; nb.vy=nvy
    nb.stage_age=max(getattr(a,'stage_age',0),getattr(b,'stage_age',0))
    bodies.append(nb)
    _on_merge(nb,bodies,particles,events_out)
    _check_caps(nb,bodies,events_out)

def _check_caps(nb, bodies, events_out):
    if nb.is_star():
        stars=[b for b in bodies if b.active and b.is_star()]
        if len(stars)>MAX_STARS:
            oldest=min(stars, key=lambda s: s.stage_age)
            events_out.append(f"⚠ {oldest.name} consumed — star cap ({MAX_STARS}) reached")
            oldest.active=False
    if nb.is_planet():
        planets=[b for b in bodies if b.active and b.is_planet()]
        if len(planets)>MAX_PLANETS:
            oldest=min(planets, key=lambda s: s.bio_age)
            events_out.append(f"⚠ {oldest.name} consumed — planet cap ({MAX_PLANETS}) reached")
            oldest.active=False

UNLOCKED_ELEMENTS_GLOBAL = {"H","He","Li","Be","B"}
MILESTONES_GLOBAL = {"star":False,"planet":False,"supernova":False,"synthetic":False}

def _on_merge(nb, bodies, particles, events_out):
    if nb.is_star() and not MILESTONES_GLOBAL["star"]:
        MILESTONES_GLOBAL["star"]=True
        events_out.append("⭐ First Star — Stellar Nucleosynthesis unlocked!")
        for s in ["C","N","O","Ne","Mg","Si","S","Ca","Na","Al","Ti","Cr","F","P","Cl","Ar","K","Sc","V"]:
            if s not in UNLOCKED_ELEMENTS_GLOBAL:
                UNLOCKED_ELEMENTS_GLOBAL.add(s)
                events_out.append(f"🔓 Unlocked: {s}")
    if nb.is_planet() and not MILESTONES_GLOBAL["planet"]:
        MILESTONES_GLOBAL["planet"]=True
        events_out.append("🪐 First Planet — Molecules can now form!")
    if nb.type in ("black_hole","supermassive_bh") and not MILESTONES_GLOBAL["supernova"]:
        MILESTONES_GLOBAL["supernova"]=True
        events_out.append("🕳️ Black Hole formed — You've witnessed extreme gravity!")

def _evolve_stars(bodies, star_dt, events_out):
    for b in bodies:
        if not b.active or not b.is_star(): continue
        orig_type=b.type
        b.stage_age+=star_dt
        b._update_luminosity()
        if b.type in ("blue_giant","main_sequence_star","red_dwarf","brown_dwarf") and b.stage_age>MAIN_SEQ_LIFETIME(b.mass):
            b.type="red_giant"; b.temp=4000; b.stage_age=0
            events_out.append(f"🔴 {b.name} became a Red Giant!")
        if b.type=="red_giant" and b.stage_age>RED_GIANT_LIFETIME(b.mass):
            _trigger_supernova(b, bodies, particles=[], events_out=events_out)
            continue
        b._update_luminosity()

def _trigger_supernova(star, bodies, particles, events_out):
    star.active=False
    if not MILESTONES_GLOBAL["supernova"]:
        MILESTONES_GLOBAL["supernova"]=True
        events_out.append("💥 SUPERNOVA! Heavy elements seeded!")
    else:
        events_out.append(f"💥 {star.name} went Supernova!")
    supernova_elems=["Fe","Ni","Co","Cu","Zn","Ag","Au","Pb","Pt","U","Mn","Ba","W","Ir","Xe",
                     "Ga","Ge","As","Se","Br","Kr","Rb","Sr","Y","Zr","Nb","Mo","Tc","Ru","Rh",
                     "Pd","Cd","In","Sn","Sb","Te","I","Cs","La","Ce","Pr","Nd","Pm","Sm","Eu",
                     "Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu","Hf","Ta","Re","Os","Hg","Tl","Bi",
                     "Po","At","Rn","Fr","Ra","Ac","Th","Pa"]
    for s in supernova_elems:
        if s not in UNLOCKED_ELEMENTS_GLOBAL:
            UNLOCKED_ELEMENTS_GLOBAL.add(s)
            events_out.append(f"🔓 Unlocked: {s}")
    elems=["Fe","Ni","O","Si","Ca","C"]
    can_add=min(12, MAX_PARTICLES-len(particles)-len(bodies))
    for _ in range(can_add):
        a=random.random()*math.pi*2; sp=4+random.random()*12
        el=random.choice(elems)
        if el in UNLOCKED_ELEMENTS_GLOBAL:
            particles.append(Particle(star.x+math.cos(a)*star.radius*2, star.y+math.sin(a)*star.radius*2, el, star.vx+math.cos(a)*sp, star.vy+math.sin(a)*sp))
    rem_type="white_dwarf"
    if star.mass>3e15: rem_type="black_hole"
    elif star.mass>1.5e15: rem_type="neutron_star"
    rem=Body(star.x,star.y,star.mass*0.18,star.composition)
    rem.vx=star.vx; rem.vy=star.vy; rem.type=rem_type
    rem.temp=0 if rem_type=="black_hole" else (1e6 if rem_type=="neutron_star" else 25000)
    bodies.append(rem)
    if len([b for b in bodies if b.active and b.is_star()])<MAX_STARS:
        _check_nuclear_reactor_trigger(bodies, events_out)

def _check_nuclear_reactor_trigger(bodies, events_out):
    planets=[b for b in bodies if b.active and b.is_planet() and b.life_detected and b.bio_stage>=6]
    if not planets: return
    if MILESTONES_GLOBAL.get("synthetic"): return
    MILESTONES_GLOBAL["synthetic"]=True
    events_out.append("🔬 Synthetic elements discovered! Nuclear reactors unlocked!")
    for s in ["Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds","Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og"]:
        if s not in UNLOCKED_ELEMENTS_GLOBAL:
            UNLOCKED_ELEMENTS_GLOBAL.add(s)
            events_out.append(f"🔓 Unlocked: {s}")

def _do_decay(b, age_dt):
    for sym, frac in list(b.composition.items()):
        d=elem_decay(sym)
        if d and d.get("hl"):
            decay_const=math.log(2)/d["hl"]
            decayed=frac*(1-math.exp(-decay_const*age_dt))
            if decayed>1e-12:
                b.composition[sym]=frac-decayed
                to=d["to"]
                b.composition[to]=b.composition.get(to,0)+decayed
                b.classify()
