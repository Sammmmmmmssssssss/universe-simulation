# Original User Request

## 2026-07-30T03:58:03Z

Build and refine a single-file interactive 2D Universe Simulation & Astrobiology Engine (`universe_simulation.html`) with N-body physics, realistic stellar evolution, element fusion, molecule discovery, and procedural biosphere visualization.

Working directory: /Users/samiranmishra/Documents/Univarsal simulation
Integrity mode: development

## Requirements

### R1. Physics & N-Body Stability
- Implement a stable Barnes-Hut O(n log n) N-body gravitational engine with Velocity Verlet integration.
- Ensure gas particles smoothly collapse into protostellar clouds and stars under gravity without exploding or freezing the browser.
- Time scaling controls (1x to 100,000x) must accelerate cosmic age and stellar evolution without blowing up particle positions or causing `NaN` numerical instability.

### R2. Astrophysical Lifecycle & Fusion
- Model realistic mass thresholds: Gas Clump -> Protostar -> Main Sequence Star -> Red Giant -> Supernova / Stellar Remnant (White Dwarf, Neutron Star, Black Hole).
- Main sequence stars fuse Hydrogen into Helium, Carbon, Nitrogen, Oxygen, Silicon. Supernovae seed heavy r-process/s-process elements (Iron, Gold, Uranium, Platinum).
- Supernova explosions scatter heavy elements into surrounding space to seed rocky planet formation.

### R3. Planetary Chemistry & Astrobiology Engine
- Synthesize 10+ real-world molecules (H₂O, CO₂, CH₄, NH₃, SiO₂, FeO, etc.) on planets based on elemental composition.
- Calculate an 8-factor Habitability Score (0-100%) based on surface temperature (star luminosity + orbit distance), liquid solvents, atmosphere, and organic carbon.
- When Habitability ≥ 50%, trigger "Life Detected" flag and allow entering a 2D Biosphere View showing procedurally generated terrain, alien flora/fauna, and 8 evolutionary stages (Prebiotic to Sentient Civilization).

### R4. Controls, Audio & UX Polish
- Include intuitive controls: Place tool with velocity vector, Nebula spray brush, Pan/Zoom, Pause, Time Speed buttons, and Quick Presets (Spawn Star, Solar System).
- Include synthesized Web Audio API sound effects for Big Bang ignition, particle placement, star formation chimes, and Supernova explosions.
- Include a dynamic Onboarding Tutorial Banner that guides the user through forming their first star, planet, and detecting life.

## Acceptance Criteria

### Verification & Quality Assurance
- [ ] Simulation loads cleanly with a responsive canvas and pitch-black Big Bang ignition screen.
- [ ] Clicking Big Bang ignites a primordial explosion of H, He, Li, Be particles.
- [ ] Spawning gas particles or using Quick Presets produces stable gravitational orbits and star formation without tab freezing or `NaN` errors.
- [ ] Stars age into Red Giants and detonate in Supernovae at high time speeds (100kX) cleanly.
- [ ] Planets forming in habitable zones achieve liquid water/methane, triggering the 2D Biosphere View with animated alien life and evolutionary stages.
- [ ] Audio toggle correctly enables/disables Web Audio sound effects.
