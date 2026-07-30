## 2026-07-29T19:35:06Z
<USER_REQUEST>
You are a Worker subagent (teamwork_preview_worker_m2_remediation) performing targeted remediation for Milestone 2 in `universe_simulation.html`.

Working directory: /Users/samiranmishra/Documents/Univarsal simulation/.agents/teamwork_preview_worker_m2_remediation
Target file to edit: /Users/samiranmishra/Documents/Univarsal simulation/universe_simulation.html
Scope document: /Users/samiranmishra/Documents/Univarsal simulation/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Specific Fixes Required:
1. **Composition Vector Normalization in `triggerSN()`**:
   - In `triggerSN()` (around line 1178), when creating `remComp` (remnant composition), ensure all element fractions are normalized so their sum is strictly 1.0 (100%):
     `let sum = 0; for(let k in remComp) sum += remComp[k];`
     `if (sum > 0) { for(let k in remComp) remComp[k] /= sum; }`
   - Also ensure ejected heavy element particles spawned by Supernova have normalized composition vectors.

2. **Mass Conservation & Ejecta Particles in `triggerSN()`**:
   - Calculate ejected mass `ejectedMass = Math.max(0, star.mass - remnantMass)`.
   - Distribute `ejectedMass` across spawned ejecta particles/gas clumps (or spawn N ejecta particles each with `mass = ejectedMass / N`) with kinetic shockwave velocity vectors ($\vec{v} = \vec{v}_{star} + \text{speed} \cdot \hat{r}$), preserving total mass conservation during supernovae.

3. **Classification Order & Bounds in `Body.classify()`**:
   - Fix classification order in `Body.classify()` (around line 694):
     - Stellar thresholds ($m \ge 3 \times 10^{10}$) MUST be checked FIRST:
       - $m \ge 2 \times 10^{12}$: `supermassive_bh`
       - $m \ge 8 \times 10^{11}$: `black_hole` (if giant) / `red_giant`
       - $m \ge 3 \times 10^{11}$: `blue_giant`
       - $m \ge 8 \times 10^{10}$: `main_sequence_star`
       - $m \ge 3 \times 10^{10}$: `red_dwarf`
       - $m \ge 1.5 \times 10^{10}$: `brown_dwarf`
     - Planetary thresholds ($m < 1.5 \times 10^{10}$):
       - `terrestrial_planet`, `gas_giant`, `ice_giant`, `dwarf_planet` based on heavy element fraction and mass.
     - Preserved compact remnants (`white_dwarf`, `neutron_star`, `pulsar`, `black_hole`, `supermassive_bh`) MUST maintain their remnant state unless Chandrasekhar limit ($1.4 \times 10^{11}$) or TOV limit ($4 \times 10^{11}$) is crossed.

4. Run all verification test scripts (`node .agents/teamwork_preview_worker_m2/test_m2.js`, `node .agents/teamwork_preview_reviewer_m2_2/reviewer_stress_test_m2.js` if created, `node .agents/teamwork_preview_challenger_m2_1/test_m2_stress.js`, and `node .agents/teamwork_preview_challenger_m2_2/test_m2_accretion.js`) to verify all tests pass 100% cleanly.
5. Record changes in `.agents/teamwork_preview_worker_m2_remediation/changes.md` and handoff report in `.agents/teamwork_preview_worker_m2_remediation/handoff.md`.
6. Send a completion message to the orchestrator.
</USER_REQUEST>
