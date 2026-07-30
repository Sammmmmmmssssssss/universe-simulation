# 🌌 2D Universe Simulation & Astrobiology Engine

A high-performance, deterministic physics and astrobiology engine built for simulating cosmic evolution from stellar nucleosynthesis to planetary chemistry and cellular automata.

---

## 🚀 Key Backend Features & Systems

### 1. 🪐 Astrophysics & Cosmic Physics Engine
- **N-Body Gravity**: Barnes-Hut $O(N \log N)$ QuadTree gravitational calculation with Velocity Verlet numerical integration.
- **Stellar Lifecycle & Nucleosynthesis**:
  - Protostellar Cloud collapse into Main Sequence, Blue Giants, Red Dwarfs, or Brown Dwarfs.
  - Fusion chains ($H \rightarrow He \rightarrow C \rightarrow N \rightarrow O \rightarrow Si \rightarrow S$).
  - End-stage evolution: Red Giants, White Dwarfs, Pulsars, Neutron Stars, and Black Holes.
  - Kinetic Supernova explosions seeding $r$-process and $s$-process heavy elements ($Fe, Au, Pt, U$).
- **Planetary Accretion**: Inelastic collision and momentum conservation mechanics for planet formation.

### 2. 🧪 Chemical & Atmospheric Physics Engine
- **Magnetosphere Dynamics**: Simulates core iron ($Fe$) content and planetary mass to determine magnetic field generation.
- **Solar Wind Stripping**: Atmospheres lacking magnetospheric shielding undergo photo-evaporation and volatile stripping from nearby star radiation.
- **Atmospheric Pressure & Escape Velocity**: Gravity-based gas retention calculations.
- **Greenhouse Effect**: Dynamic thermal feedback driven by greenhouse gas concentrations ($CO_2$, $CH_4$).

### 3. 🧬 Astrobiology & Cellular Automata (Layer 2)
- **Multi-Solvent Biochemistry**: Supports Carbon-Water, Methano-Carbon, Ammonia-Carbon, Sulfuric-Carbon, Silicon-Thermo, and Radiotrophic life profiles.
- **Procedural Surface Map**: Seeded Linear Congruential Generator (LCG) noise for 2D terrain generation.
- **Tile-Based Nutrient Grid**: Dynamic distribution and cycle of Carbon ($C$), Nitrogen ($N$), and Phosphorus ($P$).
- **Organic Soup & Cellular Automata**: Tile-level life spawning, nutrient consumption, cellular reproduction, and death cycles.

### 4. ⚡ Scaling & Mathematical Optimization
- **Floating Origin System**: Prevents 64-bit floating-point precision degradation across astronomical scales by dynamically re-centering the coordinate origin.
- **Time Dilation / Simulation Throttling**: Background universe physics throttling when detailed surface-level (Layer 2) cellular automata are active.

---

## 🛠 Project Structure

```
├── universe_simulation.html  # Main single-file simulation engine
├── PROJECT.md                # Technical roadmap and milestone checklist
├── LICENSE                   # MIT License
└── README.md                 # System overview and backend documentation
```

---

## 📜 License
MIT License.
