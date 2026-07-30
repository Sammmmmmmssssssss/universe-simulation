# Project: 2D Universe Simulation & Astrobiology Engine

## Overview
A high-performance, single-file interactive 2D Universe Simulation & Astrobiology Engine (`universe_simulation.html`) with N-body physics, realistic stellar evolution, element fusion, molecule discovery, and procedural 2D biosphere visualization.

## Architecture
- Single-file HTML5/JS application (`universe_simulation.html`) containing:
  - **Simulation Engine**: Barnes-Hut O(n log n) quadtree N-body gravity with Velocity Verlet integration.
  - **Astrophysics & Nucleosynthesis Module**: Star lifecycle states, fusion chains (H -> He -> C -> N -> O -> Si), supernovae r/s-process heavy element seeding (Fe, Au, U, Pt), and accretion into planets.
  - **Astrobiology & Planetary Chemistry Engine**: Molecule synthesis (10+ compounds), 8-factor habitability scoring (0-100%), evolutionary stage progression (8 stages), and 2D Biosphere View canvas with procedural terrain and alien life forms.
  - **UX, Audio & Controls**: Interactive tools (Place with velocity vector, Nebula spray, Pan/Zoom, Speed 1x-100kX, Quick Presets), Web Audio API sound synthesis (Big Bang, clicks, chimes, supernovae), interactive Onboarding Tutorial Banner.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Baseline Inspection | Analyze existing `universe_simulation.html` against requirements | None | DONE |
| 1 | Physics & N-Body Stability | Barnes-Hut quadtree, Velocity Verlet, gas collapse, 1x-100kX time controls without NaN | M0 | DONE |
| 2 | Astrophysical Lifecycle & Fusion | Mass thresholds, fusion chains, supernova r/s-process seeding, planetary accretion | M1 | DONE |
| 3 | Astrobiology & Planetary Chemistry | 10+ molecules, 8-factor habitability score, 2D Biosphere view with alien flora/fauna & 8 evolutionary stages | M2 | IN_PROGRESS |
| 4 | Controls, Audio & UX Polish | Place velocity tool, Nebula spray, presets, Web Audio API SFX, tutorial banner | M3 | PLANNED |
| 5 | E2E Verification & Audit | E2E test suite, zero-NaN verification, Forensic Audit | M4 | PLANNED |

## Code Layout
- Target artifact: `/Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html`
- Standalone HTML5 file containing embedded `<style>`, HTML structure, and standard JavaScript ES6+ engine classes/modules.

## Interface Contracts
- **Simulation System**: `universe.particles`, `universe.stars`, `universe.planets`, `universe.update(dt)`
- **Barnes-Hut Quadtree**: `QuadTree(bounds)`, `insert(body)`, `calculateForces(body, theta)`
- **Planet & Astrobiology Data**: `planet.chemistry`, `planet.habitabilityScore`, `planet.biosphere`, `planet.evolutionStage`
- **Audio Engine**: `audioEngine.playBigBang()`, `audioEngine.playSupernova()`, `audioEngine.playChime()`, `audioEngine.playClick()`
