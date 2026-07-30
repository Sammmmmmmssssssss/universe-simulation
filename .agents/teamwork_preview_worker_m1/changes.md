# Changes Made for Milestone 1: Physics & N-Body Stability Refinement

## Target File
`universe_simulation.html`

## Summary of Changes

1. **Short-Range Particle Repulsion Optimization (O(N log N))**:
   - Added `queryRange(x, y, radius, callback)` to `QT` (Barnes-Hut QuadTree) class for bounding-box spatial pruning.
   - Refactored `QT.prototype.repulsion` to use `queryRange` instead of scanning all active particles/bodies in an O(N^2) loop.
   - Refactored `collide` to use `qt.queryRange(a.x, a.y, maxSearchR, callback)` with a unique `_nextId` comparison (`a.id < b.id`), reducing collision pair checks from O(N^2) to O(N log N).

2. **QuadTree Node Object Pooling & Recycling**:
   - Added `QT.pool = []` static array to `QT` class.
   - Added `QT.create(x, y, w, h, depth)` static factory method to reuse recycled QuadTree nodes.
   - Added `QT.recycle(node)` static method to recursively recycle all nodes of the previous frame's QuadTree back into `QT.pool`.
   - Updated `physicsStep` to recycle `lastQt` before constructing the new frame's QuadTree, eliminating object allocation GC pauses during continuous execution.

3. **Zero-NaN & Numerical Stability Hardening**:
   - Enforced `Number.isFinite(p.x)` and `Number.isFinite(p.y)` checks in `Particle`, `Body`, `QT.insert`, and `physicsStep`.
   - Hardened Velocity Verlet integration in `physicsStep`: added checks for `p.vx`, `p.vy`, `p.ax`, `p.ay`, and clamped final velocity against `MAX_SPEED` (250).
   - Clamped `physDt` using `Math.min(Math.max(0.001, DT_BASE * validSpeedMult), 0.35)` to prevent excessive or negative delta times at high time controls (100,000x).
   - Sanitized `doMerge`, `updatePlanetTemp`, `force`, and `cosmicAge` against `NaN`, `Infinity`, or invalid division by zero (`tm <= 0`).

4. **Zero-Allocation Accumulators**:
   - Added reusable `_acc = [0, 0]` accumulator to eliminate array instantiations during recursive `QT.force` and `QT.repulsion` traversals.
   - Pre-filtered `lumStars` before particle wind updates to avoid unnecessary body iterations.

5. **Automated Verification**:
   - Created Node.js test suite `test_runner.js` in `.agents/teamwork_preview_worker_m1/test_runner.js`.
   - Verified valid JS compilation without syntax/reference errors.
   - Verified QuadTree node recycling (`QT.pool` active with 2,800+ recycled nodes).
   - Verified zero NaN / Infinity state variables after injecting corrupted inputs and high speed multipliers.
