export const BIOCHEMISTRIES=[
  {id:'aqua-carbon',   name:'Carbon-Water Life',   solvent:'H₂O',backbone:'Carbon',tempMin:253,tempMax:393,elements:['C','H','O','N'],energySrc:'Photosynthesis',color:'#00d4ff',chance:1.0,desc:'DNA/RNA-based. High adaptability.'},
  {id:'methano-carbon',name:'Methane Cryo-Life',   solvent:'CH₄',backbone:'Carbon',tempMin:80, tempMax:120,elements:['C','H','N'],    energySrc:'Radiotrophy',   color:'#ee8800',chance:0.6,desc:'Lipid membranes in liquid methane.'},
  {id:'ammonia-carbon',name:'Ammonia-Carbon Life', solvent:'NH₃',backbone:'Carbon',tempMin:150,tempMax:245,elements:['C','H','N'],    energySrc:'Chemosynthesis',color:'#88eeaa',chance:0.5,desc:'Amide polymers in liquid ammonia.'},
  {id:'sulfuric-carbon',name:'Sulfuric Acid Life', solvent:'H₂SO₄',backbone:'Carbon',tempMin:270,tempMax:500,elements:['C','H','S'],  energySrc:'Sulfur photo',  color:'#ffff44',chance:0.3,desc:'Acidophilic extreme environment life.'},
  {id:'silicon-thermo',name:'Silicon Thermo-Life', solvent:'Silicates',backbone:'Silicon',tempMin:700,tempMax:1600,elements:['Si','O','S'],energySrc:'Thermal gradients',color:'#ff6622',chance:0.25,desc:'Si-O-Si chains in molten silicate seas.'},
  {id:'radiotrophic',  name:'Radiotrophic Life',   solvent:'H₂O',backbone:'Melanin',tempMin:220,tempMax:380,elements:['C','H','O','U'],energySrc:'Ionizing Radiation',color:'#44ff44',chance:0.15,desc:'Harvests nuclear radiation.'},
  {id:'boron-based',   name:'Boron-Ammonia Life',  solvent:'NH₃',backbone:'Boron', tempMin:160,tempMax:280,elements:['B','H','N'],    energySrc:'UV catalysis',  color:'#aa88ff',chance:0.1, desc:'Borane electron-deficient polymers.'},
  {id:'plasma-based',  name:'Plasma Life',         solvent:'Plasma',backbone:'Magnetic',tempMin:5000,tempMax:50000,elements:['H','He'],energySrc:'EM fields',     color:'#ffffff',chance:0.02,desc:'Self-organizing magnetic vortices.'},
];
export const EVO_STAGES=[
  {id:0,name:'Prebiotic Chemistry',   icon:'⚗️', time:5, desc:'Monomers form in solvent'},
  {id:1,name:'First Replicators',     icon:'🔗', time:15,desc:'Self-replicating polymers'},
  {id:2,name:'Prokaryotic Analogs',   icon:'🦠', time:30,desc:'Single-cell metabolic organisms'},
  {id:3,name:'Eukaryotic Complexity', icon:'🔬', time:50,desc:'Organelles & nucleus analogs'},
  {id:4,name:'Multicellularity',      icon:'🌿', time:75,desc:'Differentiated flora and fauna'},
  {id:5,name:'Complex Ecosystems',    icon:'🌍', time:110,desc:'Predator-prey food webs'},
  {id:6,name:'Sentience & Technology',icon:'🏙️', time:150,desc:'Civilization & radio signals'},
  {id:7,name:'Post-Biological',       icon:'🤖', time:200,desc:'Digital consciousness grid'},
];
