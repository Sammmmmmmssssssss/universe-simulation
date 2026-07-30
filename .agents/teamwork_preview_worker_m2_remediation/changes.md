# Milestone 2 Targeted Remediation Changes

## Summary of Modifications to `universe_simulation.html`

1. **Composition Vector Normalization in `triggerSN()` & `doMerge()`**:
   - `triggerSN()`: Normalized remnant composition vector `remComp` so element fractions sum strictly to 1.0 (100%):
     ```javascript
     let sum = 0; for(let k in remComp) sum += remComp[k];
     if (sum > 0) { for(let k in remComp) remComp[k] /= sum; }
     ```
   - Spawned ejecta particles in `triggerSN()` set `p.composition = { [el]: 1.0 }`, strictly normalized.
   - `doMerge()`: Added explicit re-normalization of mass-weighted composition `comp` so every merged body composition sums strictly to 1.0.

2. **Mass Conservation & Ejecta Particles in `triggerSN()`**:
   - Exact mass conservation in Supernova explosions:
     ```javascript
     let remnantMass = Math.max(1e9, star.mass * 0.25);
     const ejectedMass = Math.max(0, star.mass - remnantMass);
     ```
   - If `canAdd > 0`, each spawned ejecta particle receives `p.mass = ejectedMass / canAdd`, preserving total mass across progenitor, remnant, and ejecta particles ($M_{\text{star}} = M_{\text{remnant}} + \sum M_{\text{ejecta}}$).
   - Ejecta particles spawn with radial shockwave velocity vectors $\vec{v} = \vec{v}_{\text{star}} + \text{speed} \cdot \hat{r}$.

3. **Classification Hierarchy & Bounds in `Body.classify()`**:
   - Refactored `Body.classify()`:
     - Preserved compact remnant states (`white_dwarf`, `neutron_star`, `pulsar`, `black_hole`, `supermassive_bh`) maintain state unless Chandrasekhar limit ($1.4 \times 10^{11}$) or TOV limit ($4 \times 10^{11}$) is breached.
     - Compact remnant mass scale ($m \ge 5 \times 10^{11}$) checked first.
     - Heavy-element rich objects ($heavyFrac > 0.20$ and $hFrac \le 0.35$) correctly classify as planets (`terrestrial_planet`, `dwarf_planet`) rather than stellar objects.
     - Gas-rich objects with low heavy fraction ($heavyFrac \le 0.20$) in the $1.5 \times 10^{10} \le m < 1.8 \times 10^{10}$ range classify as `gas_giant`.
     - Hydrogen-rich objects ($hFrac > 0.35$) evaluate stellar mass thresholds (`main_sequence_star`, `blue_giant`).
     - Sub-stellar gas clouds and brown dwarfs cleanly map to `protostellar_cloud` ($m < 1.5 \times 10^{10}$) and `brown_dwarf` ($1.8 \times 10^{10} \le m < 3 \times 10^{10}$).

4. **Verification**:
   - All 5 test suites (`test_m2.js`, `test_m2_stress.js`, `test_m2_accretion.js`, `test_adversarial_m2.js`, `independent_audit_m2.js`) passed 100% cleanly without any errors.
