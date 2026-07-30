# Master Execution Plan — 2D Universe Simulation & Astrobiology Engine

## Overview
This plan governs the complete implementation, refinement, testing, and verification of `universe_simulation.html`.

## Milestone Structure

### Milestone 0: Workspace & Baseline Inspection
- Inspect existing `universe_simulation.html` to assess compliance with R1-R4 requirements.
- Identify bugs, performance bottlenecks, NaN edge cases, and missing features.
- Output: Baseline Inspection Report.

### Milestone 1: Physics & N-Body Stability (R1)
- Barnes-Hut O(n log n) quadtree structure & center of mass calculation.
- Velocity Verlet numerical integration scheme.
- Softened gravity ($\epsilon^2$), collision handling, gas cloud collapse.
- Time scaling controls (1x to 100,000x) maintaining stability without NaN or particle divergence.

### Milestone 2: Astrophysical Lifecycle & Fusion (R2)
- Stellar mass thresholding: Gas Clump -> Protostar -> Main Sequence -> Red Giant -> Supernova / Remnant (White Dwarf, Neutron Star, Black Hole).
- Stellar nucleosynthesis: Hydrogen fusion into He, C, N, O, Si.
- Supernova explosions: r-process & s-process heavy element creation (Fe, Au, U, Pt) and isotropic/directional matter ejection.
- Planetary accretion: Heavy elements and gas collapsing into rocky/gas giant planets with orbital vectors.

### Milestone 3: Planetary Chemistry & Astrobiology Engine (R3)
- Molecule synthesis (10+ real-world compounds: H2O, CO2, CH4, NH3, SiO2, FeO, N2, O2, H2S, HCN, etc.).
- 8-Factor Habitability Index (0-100%): Stellar Flux/Temp, Liquid Solvent availability, Atmosphere thickness, Organic Carbon, Magnetic Shielding, Tidal Locking, Orbit Eccentricity, Radiation exposure.
- 2D Biosphere View: Procedural terrain, atmosphere canvas, alien flora/fauna procedural rendering, and 8 evolutionary stages (Prebiotic -> Proto-RNA -> Single Cell -> Multicellular -> Complex Organisms -> Intelligence -> Technological -> Sentient Galactic Civilization).

### Milestone 4: Controls, Audio & UX Polish (R4)
- Place tool with velocity drag vector, Nebula spray brush, Pan/Zoom controls, Pause, Time speed selector (1x-100kX), Quick Presets (Big Bang, Solar System, Binary Star, Dense Nebula).
- Web Audio API synthesizer for sound effects: Big Bang rumble, particle click/placement, protostar ignition chimes, supernova boom, life discovery synth pad.
- Dynamic Onboarding Tutorial Banner: Step-by-step interactive guidance.

### Milestone 5: E2E Verification & Integration Acceptance
- Comprehensive verification across chrome/headless/playwright runtime tests.
- Zero NaN, zero infinity, zero browser freeze under 100,000x speed.
- Final Forensic Audit confirmation.

## Iteration Protocol
Each milestone is executed via:
1. Explorer analysis (3 Explorers) -> Strategy report
2. Worker implementation (1 Worker) -> Build/Test verification
3. Reviewer evaluation (2 Reviewers) -> Code quality & correctness
4. Challenger testing (2 Challengers) -> Empirical stress & edge case testing
5. Forensic Auditor verification (1 Auditor) -> Integrity check (BINARY VETO)
