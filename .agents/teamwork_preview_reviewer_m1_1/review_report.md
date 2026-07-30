# Milestone 1 Code Review & Stress-Test Report

**Target**: `universe_simulation.html`  
**Milestone**: Milestone 1 (Physics & N-Body Stability)  
**Reviewer**: `teamwork_preview_reviewer_m1_1`  
**Date**: 2026-07-30  

---

## Review Summary

**Verdict**: **VETO** (REQUEST_CHANGES)  
**Rationale**: QuadTree spatial collision search in `collide()` uses a fixed search radius padding of `+ 20` (`const maxSearchR = (a.radius || 3) + 20;`). Large celestial bodies (Red Giants, Supermassive Black Holes, etc.) have radii exceeding 50 units. When a small particle `a` (radius 3, `id` = 10) interacts with a large body `b` (radius 51, `id` = 20) at distance 35 (overlapping physical radii 3 + 51 = 54), `a`'s search range (23) fails to reach `b`'s center. When `b` iterates, its ID filter (`if (a.id >= b.id) return;`) drops `a`. Consequently, particles pass straight through large bodies without colliding or accreting.

---

## Findings

### 1. [Major] Collision Range Query Radius Truncation for Large Celestial Bodies

- **What**: In `collide(all, qt)`, `maxSearchR` is hardcoded as `(a.radius || 3) + 20`.
- **Where**: `universe_simulation.html`, Line 862.
- **Why**: Large stars, Red Giants, and Black Holes have radii up to 50–65 units (`Math.cbrt(mass) * 0.005` or `Math.log(mass) * 1.8`). When a small body `a` (radius 3) overlaps with a large body `b` (radius 51) at distance $d \in (23, 54]$, `a`'s spatial range query (`maxSearchR = 23`) does not reach `b`'s center. When `b` queries with `maxSearchR = 71`, `b` finds `a`, but line 865 (`if (a.id >= b.id) return;` where `a` is `b` and `b` is `a`) rejects `a` because `b.id > a.id`. As a result, collisions between small objects and large celestial bodies are silently missed whenever `small.id < large.id`.
- **Suggestion**: Dynamically track the maximum active body radius `maxRadius` (or set padding to `Math.max(20, maxBodyRadius)`), e.g.:
  ```javascript
  let maxR = 20;
  for (const b of bodies) {
    if (b.active && b.radius > maxR) maxR = b.radius;
  }
  const maxSearchR = (a.radius || 3) + maxR;
  ```

---

## Verified Claims

1. **JS Syntax & Script Evaluation**: PASS — Executed via Node.js VM context without syntax errors or runtime exceptions.
2. **QuadTree Node Pooling & Recycling**: PASS — Verified `QT.pool`, `QT.create`, and `QT.recycle`. Over 3,200 QuadTree nodes recycled per frame in 5,000 particle simulation runs.
3. **Velocity Verlet Integration**: PASS — 2nd-order position (`x += vx*dt + 0.5*ax*dt^2`) and velocity (`vx += 0.5*(ax_old + ax_new)*dt`) updates correctly implemented.
4. **Velocity Clamping (`MAX_SPEED = 250`)**: PASS — Tested particles with $v = 707$; verified clamping to $v \le 250$.
5. **Timestep Clamping (`physDt <= 0.35`)**: PASS — Tested simulation under 100,000x speed multiplier (`speedMult = 100000`); `physDt` remains bounded at 0.35s.
6. **`isFinite` State Sanitization**: PASS — Corrupted inputs (`NaN`, `Infinity`) sanitized cleanly without state corruption.
7. **Integrity Check**: PASS — No facade implementations, hardcoded test results, or self-certifying shortcuts found.

---

## Coverage & Stress-Test Results

| Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| QuadTree node creation & recycle | Recycles nodes into `QT.pool` | `QT.pool.length > 3200` | PASS |
| Particle repulsion ($N=5000$) | O(N log N) spatial query lookup | 5000 particles updated via `queryRange` | PASS |
| Small particle + Small particle collision | Merges or bounces | Collision detected & processed | PASS |
| Small particle ($id=10$) + Large BH ($id=20$, $r=51$) | Merges on contact | Collision missed due to search range 23 < distance 35 | **FAIL** |
| High velocity particle ($v=707$) | Clamped to 250 | Velocity clamped to 244.9 / 250 | PASS |
| Extreme speed mult ($100,000\times$) | Bounded `physDt`, 0 NaNs | `physDt` clamped to 0.35s, 0 NaNs | PASS |

---

## Recommendation

Request Worker `fa99b789-9ea5-45e4-9f29-d989c7754f53` to update `maxSearchR` in `collide()` to account for the maximum body radius in the simulation, re-run verification, and resubmit.
