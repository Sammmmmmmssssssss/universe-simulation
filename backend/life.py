import random
from elements import get_elem

# ── MOLECULES ──
MOLECULES = [
    {"formula":"H₂O","name":"Water",             "inputs":{"H":2,"O":1},  "color":"#44aaff"},
    {"formula":"CO₂","name":"Carbon Dioxide",     "inputs":{"C":1,"O":2}, "color":"#888888"},
    {"formula":"CH₄","name":"Methane",            "inputs":{"C":1,"H":4}, "color":"#ee8800"},
    {"formula":"NH₃","name":"Ammonia",            "inputs":{"N":1,"H":3}, "color":"#88eeaa"},
    {"formula":"SiO₂","name":"Silica",            "inputs":{"Si":1,"O":2},"color":"#ccbb88"},
    {"formula":"FeO","name":"Iron Oxide",         "inputs":{"Fe":1,"O":1},"color":"#aa4422"},
    {"formula":"H₂S","name":"Hydrogen Sulfide",   "inputs":{"H":2,"S":1}, "color":"#eeee22"},
    {"formula":"N₂", "name":"Nitrogen Gas",       "inputs":{"N":2},      "color":"#4488ff"},
    {"formula":"O₂", "name":"Oxygen Gas",         "inputs":{"O":2},      "color":"#ff4444"},
    {"formula":"CO", "name":"Carbon Monoxide",    "inputs":{"C":1,"O":1}, "color":"#666666"},
    {"formula":"NaCl","name":"Sodium Chloride",   "inputs":{"Na":1,"Cl":1},"color":"#cccccc"},
    {"formula":"CaO","name":"Calcium Oxide",      "inputs":{"Ca":1,"O":1},"color":"#eeeeee"},
    {"formula":"Al₂O₃","name":"Aluminum Oxide",  "inputs":{"Al":2,"O":3},"color":"#ddddee"},
    {"formula":"Fe₂O₃","name":"Hematite",        "inputs":{"Fe":2,"O":3},"color":"#663322"},
    {"formula":"MgO","name":"Magnesium Oxide",    "inputs":{"Mg":1,"O":1},"color":"#eeeeff"},
    {"formula":"TiO₂","name":"Titanium Dioxide", "inputs":{"Ti":1,"O":2},"color":"#eeeecc"},
    {"formula":"SO₂","name":"Sulfur Dioxide",     "inputs":{"S":1,"O":2}, "color":"#cccc44"},
    {"formula":"H₂SO₄","name":"Sulfuric Acid",    "inputs":{"H":2,"S":1,"O":4},"color":"#ffff66"},
    {"formula":"HNO₃","name":"Nitric Acid",       "inputs":{"H":1,"N":1,"O":3},"color":"#cc8844"},
    {"formula":"CaCO₃","name":"Calcium Carbonate","inputs":{"Ca":1,"C":1,"O":3},"color":"#eeeecc"},
    {"formula":"FeS₂","name":"Pyrite",            "inputs":{"Fe":1,"S":2},"color":"#cccc44"},
    {"formula":"C₂H₆","name":"Ethane",            "inputs":{"C":2,"H":6},"color":"#eeaa44"},
    {"formula":"PH₃","name":"Phosphine",          "inputs":{"P":1,"H":3},"color":"#aa66aa"},
    {"formula":"HCl","name":"Hydrogen Chloride",  "inputs":{"H":1,"Cl":1},"color":"#aabb44"},
    {"formula":"HF","name":"Hydrogen Fluoride",   "inputs":{"H":1,"F":1},"color":"#aaffaa"},
]
DISCOVERED_MOLECULES = set()
UNKNOWN_COMPOUND_COUNTER = [0]

# ── BIOCHEMISTRY ──
BIOCHEMISTRIES = [
    {"id":"aqua-carbon","name":"Carbon-Water Life","solvent":"H₂O","backbone":"Carbon","temp_min":253,"temp_max":393,"elements":["C","H","O","N"],"energy":"Photosynthesis","color":"#00d4ff","chance":1.0,"desc":"DNA/RNA-based. Most versatile biochemistry known."},
    {"id":"methano-carbon","name":"Methane Cryo-Life","solvent":"CH₄","backbone":"Carbon","temp_min":80,"temp_max":120,"elements":["C","H","N"],"energy":"Radiotrophy","color":"#ee8800","chance":0.6,"desc":"Lipid-analog membranes in liquid methane."},
    {"id":"ammonia-carbon","name":"Ammonia-Carbon Life","solvent":"NH₃","backbone":"Carbon","temp_min":150,"temp_max":245,"elements":["C","H","N"],"energy":"Chemosynthesis","color":"#88eeaa","chance":0.5,"desc":"Amide-linked polymers. Dissolves metals well."},
    {"id":"sulfuric-carbon","name":"Sulfuric Acid Life","solvent":"H₂SO₄","backbone":"Carbon","temp_min":270,"temp_max":500,"elements":["C","H","S"],"energy":"Sulfur photo","color":"#ffff44","chance":0.3,"desc":"Acidophilic organisms in corrosive solvent."},
    {"id":"silicon-thermo","name":"Silicon Thermo-Life","solvent":"Silicates","backbone":"Silicon","temp_min":700,"temp_max":1600,"elements":["Si","O","S"],"energy":"Thermal gradients","color":"#ff6622","chance":0.25,"desc":"Si-O-Si chains in molten silicate oceans."},
    {"id":"radiotrophic","name":"Radiotrophic Life","solvent":"H₂O","backbone":"Melanin","temp_min":220,"temp_max":380,"elements":["C","H","O","U"],"energy":"Radiation (U/Th)","color":"#44ff44","chance":0.15,"desc":"Uses ionizing radiation for metabolism."},
    {"id":"boron-based","name":"Boron-Ammonia Life","solvent":"NH₃","backbone":"Boron","temp_min":160,"temp_max":280,"elements":["B","H","N"],"energy":"UV reactions","color":"#aa88ff","chance":0.1,"desc":"Borane polymers. Electron-deficient chemistry."},
    {"id":"plasma-based","name":"Plasma Life","solvent":"Plasma","backbone":"Magnetic","temp_min":5000,"temp_max":50000,"elements":["H","He"],"energy":"EM fields","color":"#ffffff","chance":0.02,"desc":"Hypothetical self-organizing magnetic vortices."},
]

EVO_STAGES = [
    {"id":0,"name":"Prebiotic Chemistry","icon":"⚗️","desc":"Monomers form in solvent","time":1e7},
    {"id":1,"name":"First Replicators","icon":"🔗","desc":"Self-replicating molecules","time":5e7},
    {"id":2,"name":"Prokaryotic Analogs","icon":"🦠","desc":"Single-cell life. Alters atmosphere","time":2e8},
    {"id":3,"name":"Eukaryotic Complexity","icon":"🔬","desc":"Compartmentalization","time":5e8},
    {"id":4,"name":"Multicellularity","icon":"🌿","desc":"Flora and Fauna emerge","time":1e9},
    {"id":5,"name":"Complex Ecosystems","icon":"🌍","desc":"Food webs, predators","time":2e9},
    {"id":6,"name":"Sentience & Technology","icon":"🏙️","desc":"Civilization, technosignatures","time":4e9},
    {"id":7,"name":"Post-Biological","icon":"🤖","desc":"Digital consciousness","time":8e9},
]

def compute_molecules(bodies, events_out):
    for b in bodies:
        if not b.active or not b.is_planet(): continue
        c=b.composition; b.molecules={}
        found_any=False
        for mol in MOLECULES:
            ok=True
            for el,cnt in mol["inputs"].items():
                if c.get(el,0)<0.01*cnt: ok=False; break
            if ok:
                b.molecules[mol["formula"]]=1
                found_any=True
                if mol["formula"] not in DISCOVERED_MOLECULES:
                    DISCOVERED_MOLECULES.add(mol["formula"])
                    events_out.append(f"🔬 Molecule: {mol['name']} ({mol['formula']})")
        if found_any:
            b.has_atmosphere=True
            _try_unknown_compound(b, events_out)

def _try_unknown_compound(b, events_out):
    c=b.composition
    present=[sym for sym,frac in c.items() if frac>0.05 and sym not in ("H","He")]
    if len(present)>=3:
        UNKNOWN_COMPOUND_COUNTER[0]+=1
        n=UNKNOWN_COMPOUND_COUNTER[0]
        formula=f"Unk-{n}"
        name=f"Unknown Compound #{n}"
        if formula not in DISCOVERED_MOLECULES:
            DISCOVERED_MOLECULES.add(formula)
            events_out.append(f"🔬 New molecule synthesized: {name} ({formula})")

def compute_habitability(b):
    if not b.is_planet(): return
    s=0
    t=b.temp
    if 253<t<393: s+=30*(1-abs(t-303)/90)
    elif 80<t<120: s+=15
    elif 700<t<1600: s+=10
    if b.molecules.get("H₂O"): s+=25
    elif b.molecules.get("CH₄"): s+=12
    elif b.molecules.get("NH₃"): s+=10
    if b.composition.get("C",0)>0.05: s+=20
    elif b.composition.get("C",0)>0.01: s+=10
    if b.has_atmosphere: s+=15
    if b.is_planet(): s+=10
    b.habitability=min(100,s)
    b.life_detected=b.habitability>=55
    return b.habitability

def detect_biochemistry(b):
    if b.biochemistry: return b.biochemistry
    t=b.temp; best=None; bs=0
    for bio in BIOCHEMISTRIES:
        if t<bio["temp_min"] or t>bio["temp_max"]: continue
        sc=bio["chance"]
        for el in bio["elements"]:
            if b.composition.get(el,0)>0.01: sc+=0.15
        solvent_key="H₂O"
        if bio["solvent"]=="CH₄": solvent_key="CH₄"
        elif bio["solvent"]=="NH₃": solvent_key="NH₃"
        elif bio["solvent"]=="H₂SO₄": solvent_key="H₂SO₄"
        if b.molecules.get(solvent_key): sc+=0.3
        if sc>bs: bs=sc; best=bio
    return best

def advance_bio(b, events_out, unlocked_set=None):
    if not b or not b.life_detected: return
    if b.bio_stage<0:
        bio=detect_biochemistry(b)
        if bio:
            b.biochemistry=bio
            b.bio_stage=0
            events_out.append(f"🧬 Prebiotic chemistry on {b.name}")
    if b.bio_stage>=7: return
    ns=None
    for s in EVO_STAGES:
        if s["id"]==b.bio_stage+1: ns=s; break
    if not ns: return
    needed=ns["time"]*(50/max(1,b.habitability))
    if b.bio_age>needed:
        b.bio_stage+=1
        nm=ns["name"]
        b.bio_events.append({"age":b.bio_age,"msg":f"Stage {b.bio_stage}: {nm}"})
        events_out.append(f"🧬 {b.name}: {nm}")
        if b.bio_stage>=6:
            events_out.append(f"🏙️ SENTIENT LIFE on {b.name}!")
            if unlocked_set is not None:
                for s in ["Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds","Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og"]:
                    if s not in unlocked_set:
                        unlocked_set.add(s)
                        events_out.append(f"🔓 Unlocked: {s}")
