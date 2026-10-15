# Crosswired — local verification

This records the initial local verification before repository upload. The later successful public deployment and anonymous gameplay checks are recorded in [DEPLOYMENT.md](DEPLOYMENT.md).

Verified on 2026-10-15, Windows, Node.js 24.14.0, installed Chromium 1155 through the existing Playwright installation. No packages or browsers were downloaded. All implementation and generated evidence are inside `C:\dev\tandem_tales\crosswired`. No other project was edited, and no GitHub or deployment operation ran.

## Results

- `npm test`: **10/10 passing**. Raw output: [.preview/engine-results.txt](.preview/engine-results.txt).
- `node --check` passed for `app.js`, `engine.js`, `server.mjs` and `tests/browser.smoke.mjs`.
- `node tests/browser.smoke.mjs`: **14/14 browser checks passing**, no page exceptions and no failed asset responses. Structured results: [.preview/browser-results.json](.preview/browser-results.json).
- Inspected full-page desktop and narrow-screen screenshots. Desktop tested at 1440×1100; narrow layout at 390×844. The board scrolls within its panel on narrow screens; the page does not overflow horizontally.

## Behaviors exercised

1. All five starter receiver signals reach the appropriate actuator; opposing motor signals cancel.
2. Cutting Drive's wires prevents keyboard movement. Routing A to Drive changes actual movement through the same simulation used by the game.
3. Missing components, wrong-direction ports, occupied inputs, self-connections and feedback loops are rejected. Cyclic malformed input cannot hang evaluation.
4. OR relay fan-in/fan-out and periodic clock pulses drive the same output model as keyboard input.
5. Chassis corners, bounds, overlap and fractional placements are rejected; moving a component to its own footprint is allowed. Chassis dimensions, speed and health derive from the chosen chassis.
6. Forward/reverse movement, turning, wall confinement, firing, projectile hits, enemy damage, win/loss, time limit and frozen completed bouts were checked in the deterministic simulation.
7. Browser actions created connections, rejected a duplicate input, moved a component, rejected an overlapping footprint, removed/reinstalled a receiver, and restored that layout after a reload.
8. The browser installed a relay, connected Space through it to Fire, and verified live Fire state and two active wire paths.
9. Actual browser keyboard events moved/turned the robot. Escape/resume froze/resumed simulation time.
10. Played a complete three-bout browser run: first victory; selected/placed/wired a clock; won the second bout with automatic fire; selected/placed armor; verified 130 maximum health and final victory. This used keyboard/UI actions plus accelerated browser time, without directly changing match state.
11. Idle player lost to AI and received edit/retry controls. Six browser edit/retry cycles and **100 deterministic simulation cycles** reset health, time, bullets, cooldowns and result state while retaining the design.
12. Browser switching between Scout and Hauler changed cell count and maximum health. Mobile page width and board-scroller assertions passed.

The browser checks found overlapping A/B ports on the 2×1 relay; the ports were separated and the complete suite passed afterward. Two other intermediate test failures were ambiguous accessible-name selectors in the test script, corrected without changing game behavior.

## Screenshots

- [Workbench](.preview/desktop-workbench.png)
- [Active signal](.preview/desktop-signal.png)
- [Combat](.preview/desktop-combat.png)
- [Victory and salvage choice](.preview/desktop-victory.png)
- [Narrow-screen layout](.preview/mobile-workbench.png)

## Tool limits and remaining scope

The dedicated browser-control runtime failed during initialization, including after reset, with `failed to prepare MXC sandbox: permission path cannot be represented losslessly`. The installed Playwright/Chromium fallback completed all browser QA. Sandboxed loopback initially returned network-access denial/timeouts; running both the test server and browser QA outside the network sandbox resolved access. This was local-loopback testing only. The QA server was stopped after verification; use `npm start` to launch it again.

Verification covers Chromium and desktop keyboard play. Narrow-screen layout was tested, but touch combat controls, other browsers, subjective difficulty balancing and long-duration performance profiling were not implemented or claimed. AI is deliberately forgiving and can be beaten by firing from the initial facing. Wires are patch cables, not occupied grid routes. Feedback/sequential logic, richer sensors, content variety and final deck rules remain future work. No remaining blocker prevents local play.
