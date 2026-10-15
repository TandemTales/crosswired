# Crosswired

A separate robot-circuit combat prototype. Build a control circuit inside a shaped chassis, then pilot that exact circuit against an AI robot. Playing requires no dependencies, accounts, paid services, backend, multiplayer, or external assets. This directory is independent of RSI and the other games.

**Play online: https://tandemtales.github.io/crosswired/**

## Run locally

Requires Node.js 20+ (tested on the installed Node 24.14.0). In PowerShell:

```powershell
cd C:\dev\tandem_tales\crosswired
npm start
```

Open **http://127.0.0.1:4187**. Stop the server with Ctrl+C. No `npm install` or build is necessary. The server binds to this computer only. To use another port: `$env:PORT=4188; npm start`.

## Play

- The starter circuit is connected: **W/S** drive forward/reverse, **A/D** turn, and **Space** fires in your facing direction. **Escape** pauses/resumes. Changing tabs pauses a fight.
- Hold a key on the bench to see its port and wire light up and read the resulting motor/weapon state. Bench testing does not move the robot.
- **Wire:** click an **OUT** circle, then an **IN** circle. Outputs can branch. One wire per input. Expand **Connections** to disconnect individual wires. **Clear wires** is a useful proof: the same keys can no longer move or fire until reconnected.
- For example, disconnect W → Drive/forward, then connect Space OUT → Drive/forward. Space now drives AND fires. W no longer drives. There is no separate hidden keyboard-to-movement mapping.
- **Move:** click a component, then a free cell for its new top-left corner. **Remove:** click a component to return it to the tray, removing its wires. Click a tray card then a free cell to install it. Invalid placements leave the old circuit intact.
- The tray starts with one **OR relay**. Place it, route two receiver outputs to A/B, and connect its OUT to an actuator. Either input can activate it.
- **Launch bout** starts combat. **Edit circuit** returns to a fresh bench. **Retry bout** keeps the build and starts a fresh fight. Losing preserves the circuit.
- Win to select one salvage component before each of the next two bouts: a **clock** (automatic pulses every 0.8 seconds), **armor** (+30 health in a 2×2 footprint), or another **OR relay** (2×1). A clock wired to Fire works without pressing a key. Three victories finish a run.
- **Restore starter wiring** restores the starting components/connections and returns acquired clock/armor cards to the tray. **New run** resets the build, salvage and bout number.
- Circuit, tray, chassis and bout number save automatically in this browser's local storage. Current combat does not persist. Desktop keyboard is the play target; narrow screens can scroll the board horizontally.

## Prototype defaults and assumptions

- Web technology was chosen for quick inspection; no engine was specified. Original provisional folder `circuit-bots` was not created. The confirmed title is **Crosswired**, folder `crosswired`.
- Two chassis demonstrate body-defined dimensions and shape: **Kite/Scout**, 8×6 with four cutaway corner cells, 100 health / 150 speed; **Brick/Hauler**, 9×6 with two cutaway top corners, 125 health / 120 speed. Switching to a smaller body rejects a layout that no longer fits.
- Receivers and logic use 2×1 footprints; motors, cannon and armor use 2×2. All compete for the same available cells. No rotation in this slice.
- Signals are Boolean levels, evaluated through an acyclic directed graph. Receivers are keyboard sources; clocks are time sources; relays combine signals; motors/cannon are sinks. Both source types use the same graph. Simultaneous opposing movement signals cancel.
- Wires are direct patch cables, may cross or pass over parts, and do not consume cells. Physical component placement is enforced; cable-length costs and cell-by-cell routing remain open design questions. Self-wiring, feedback, wrong-direction ports and duplicate destination inputs are rejected.
- The arena uses turning plus forward/reverse movement, bounded walls, robot separation, forward projectiles, cooldowns and projectile damage. AI pursues, aims and fires slower projectiles with a short opening grace period. Later bouts increase AI health (65 / 80 / 95). This is an intentionally forgiving sparring opponent; holding fire from the starting line can win. Difficulty balance is not final.
- A bout lasts at most 90 seconds. A timeout offers edit/retry. Enemy and player shots are separate colors. Player damage is 10 per hit, hostile damage 12. Armor adds health only while physically installed.
- Salvage is bounded to two selections per completed three-bout run. Full deck rules, purchasing, sensors, advanced logic, custom key assignment, persistence beyond one browser, sound, varied weapons/arenas and multiplayer are outside this slice.
- The source repository `TandemTales/crosswired` and its GitHub Pages playable build are public following explicit owner approval. No plan purchase, new credentials or separate publishing repository was needed. See `DEPLOYMENT.md` for publication status and verification.

## Tests and inspection

```powershell
npm test
```

The deterministic engine suite covers propagation and rewiring, invalid wires and cycles, relay/clock behavior, placement and shape restrictions, movement/walls, weapon hits, AI win/loss, timeout, chassis/armor stats, salvage limits, and 100 reset/edit/retry cycles.

Optional browser smoke test, with the local server already running:

```powershell
node tests/browser.smoke.mjs
```

The browser script uses an **existing** Playwright installation and browser; it downloads nothing. The defaults match this host's existing Python 3.12 Playwright package and Chromium 1155. Set `PLAYWRIGHT_PACKAGE`, `CHROMIUM_PATH`, and optionally `CROSSWIRED_URL` for another machine. Playwright is not a game runtime dependency. Network-restricted shells may require running both server and QA outside that sandbox to allow loopback access.

For deployed verification, set `CROSSWIRED_URL=https://tandemtales.github.io/crosswired/` and `CROSSWIRED_ARTIFACT_DIR=.preview/public` before running the browser script. It uses a fresh browser context without authentication.

`window.crosswired.snapshot()` returns a copy of the current design, match, mode and signal values for read-only browser inspection. `.preview/` contains QA screenshots and results. See `QA.md` for actual verification and tool limits.

## Files

- `engine.js`: placement, wiring validation, signal evaluation, simulation and salvage.
- `app.js`: editor, UI, input, Canvas rendering and browser storage.
- `index.html` / `style.css`: responsive workshop and arena UI.
- `server.mjs`: loopback-only static server, explicit asset allowlist.
- `tests/`: engine tests and optional browser checks.
- `scripts/build.mjs`: copies and verifies the five runtime assets into `docs/`, with `.nojekyll`, for Pages' `main` / `docs` source. Run `npm run build` after changing runtime files and commit the updated build with its source. QA screenshots, tests, this README and the local server are excluded from the public build.
