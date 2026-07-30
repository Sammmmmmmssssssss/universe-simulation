## 2026-07-30T04:00:00Z
<USER_REQUEST>
You are Worker for Milestone 3 (Planetary Chemistry & Astrobiology Engine).
Your working directory is `/Users/samiranmishra/Documents/Univarsal simulation/.agents/teamwork_preview_worker_m3`. Create your directory if needed.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Task Scope:
Refine and harden Milestone 3 in `/Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html`:

1. **8-Factor Habitability Scoring (`computeHab()`)**:
   - Update `computeHab()` so it computes a score on 0-100% scale using 8 distinct physical & chemical factors:
     1. Surface Temperature & Flux (Ideal 298K / Goldilocks zone flux)
     2. Liquid Solvent Availability (Liquid Water H₂O at 273-373K, Liquid Methane CH₄ at 90-112K, Liquid Ammonia NH₃ at 195-240K)
     3. Atmosphere Presence & Pressure (volatile mass / gravity estimate)
     4. Organic Carbon Abundance (`composition['C'] > 0.005`)
     5. Magnetic Shielding / Dynamo (core mass & Fe abundance: `(composition['Fe'] || 0) > 0.05`)
     6. Tidal Locking Status (penalize planets too close to low-mass stars without thick atmosphere)
     7. Orbital Eccentricity (calculate $e$ from orbital vectors, penalize $e > 0.25$)
     8. Low Radiation Exposure (penalize proximity to active Pulsar/Black Hole or recent Supernova)
   - Ensure final `habitability` score is clamped between `0` and `100` and integer rounded.
   - `lifeDetected` flag MUST be set to `this.habitability >= 50`.

2. **NaN Protection & Defensive Access**:
   - Add optional chaining or nullish checks for `this.molecules?.['H₂O']`.
   - Protect `advanceBio()`: ensure `hab` is a finite number > 0 so `50 / hab` never returns NaN.
   - Protect `Body.prototype.radius`: ensure `Math.cbrt(this.mass)` never returns NaN.

3. **Life Detection Event Notification**:
   - Ensure `playChime()` and notification toast fire whenever any individual planet first reaches `lifeDetected = true` (using a per-planet flag like `b.notifiedLife = true`).

4. **Verification & Test Script**:
   - Create a runnable Node.js test script `/Users/samiranmishra/Documents/Univarsal simulation/test_m3.js` that loads `universe_simulation.html`, instantiates bodies/planets across various chemical and orbital scenarios, and asserts:
     - All 10 molecules (`H₂O`, `CO₂`, `CH₄`, `NH₃`, `SiO₂`, `FeO`, `H₂S`, `N₂`, `O₂`, `CO`) are defined and synthesized under appropriate compositions.
     - `computeHab()` factors evaluate cleanly on 0-100% scale.
     - Habitability >= 50% sets `lifeDetected = true`.
     - Evolutionary stages (8 stages) progress in Biosphere view.
     - Zero `NaN` or `Infinity` values produced across all habitability calculations.
   - Run `node test_m3.js` and ensure all tests pass cleanly with exit code 0.

Write your report and test results to `/Users/samiranmishra/Documents/Univarsal simulation/.agents/teamwork_preview_worker_m3/handoff.md`.
</USER_REQUEST>
