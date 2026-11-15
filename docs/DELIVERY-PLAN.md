# Aster implementation and delivery plan

This replaces the earlier Android-first, time-boxed proposal. The accepted target is an advanced offline Windows desktop demonstration plus a browser preview. No fixed deadline is set.

## Build order and exit evidence

| Stage | Scope | Exit evidence |
|---|---|---|
| 1. Foundation and identity | Neutral dark theme, Aster wordmark/icon, Home / My readings / Health reviews shell, versioned local browser store, Tauri/SQLite snapshot repository | Browser refresh retains actions; desktop save is transactional; all pages use Aster styling. |
| 2. Recovery investigation | Personal baseline comparison, context capture, reaction-time demonstration, follow-up, explicit reassessment | Walkthrough explains change, data quality, action, and unresolved questions. |
| 3. Cabin and radiation | Time-linked symptom/environment records; instrument provenance, units, timestamps, and gaps; distinct checklists | No causal or personal-dose claims; alternate branches remain explicit. |
| 4. Presenter and telemetry | Reproducible fixtures, clock controls, follow-up outcomes, browser Web Bluetooth, native BLE adapter | Branches replay deterministically; signal loss/staleness requires verification; real data stays separate. |
| 5. Packaging and rehearsal | Browser preview, Windows NSIS installer, app icon, exports, keyboard/reduced-motion/small-window review, demo script | Clean start/reopen/offline rehearsal; installer launches with the SQLite vault; judge can follow the full loop. |

## Domain and persistence

The browser store is IndexedDB with a localStorage fallback. The desktop uses SQLite in the per-user application data directory. Saves are serialized by the frontend and written in one SQLite transaction. The JSON snapshot is preserved alongside indexed records for observations, context, investigations, tasks, mission events, cabin/radiation readings, reaction sessions, handoffs, and separate live observations. Schema version 2 is checked before accepting a saved snapshot; version 1 browser snapshots migrate by initializing per-scenario clocks from their saved mission time.

`Observation` includes the existing metric value, unit, timestamp, method, context, data quality, mission phase, and provenance. Other domain records include `MissionEvent`, `BaselineComparison`, `Investigation`, `EvidenceReference`, `ReactionSession`, scenario workspaces, and `Handoff`.

Scenario time is distinct from wall-clock time. The presenter may pause or advance the scenario clock without changing saved timestamps on unrelated live-device records. Every completed user action is written through the current repository interface.

## Personal-history rule

For a three-day assessment window, Aster compares against the immediately preceding 14 days. At least seven distinct comparable days are required. The latest recent observation selects the comparison cohort; metric, unit, method, collection conditions, and mission phase must match. Unusable, malformed, mismatched-unit, or missing recent readings do not become normal readings. The comparison describes historical change; it is not a clinical range or risk estimate.

The current versioned demonstration rule uses the historical median and median absolute deviation to construct an illustrative band. It presents supporting observation IDs and contributing day counts. Numeric mood scoring is intentionally not inferred from a free-text check-in.

## Scenario map

| Scenario | Starting evidence | Crew review | Presenter branches | Unresolved boundary |
|---|---|---|---|---|
| Recovery and fatigue | Fictional sleep, resting pulse, workload, optional mood/fatigue context | Check measurement conditions; optional 60-second reaction demonstration; record follow-up | Improving, persistent pattern, sensor contact error | Demo reaction check is not a validated PVT or readiness screen. |
| Cabin environment | Fictional CO₂ instrument records and overlapping headache check-in | Inspect source, time, and quality; record own symptoms; prepare handoff | Lower follow-up reading, uncertain sensor contact | Timing does not prove cause; no approved emergency procedure is embedded. |
| Radiation context | Fictional instrument values and a visible gap; separately cited NASA RadLab reference; CSA CANS research link | Inspect source, device, unit, time, and missing interval; preserve context | Keep gap open, add instrument event | No dose is calculated; CANS context, NASA reference data, and demo readings are separate; none is personal astronaut dose. |

Each scenario retains its own workspace. Scenario reset restores deterministic fixtures without clearing separate live Bluetooth records.

## Released challenge-resource integration

The official NASA and CSA resources inform the framing and explanation layer; none is treated as a clinical protocol or a source of Aster alert thresholds.

| Challenge resource | Applied to Aster |
|---|---|
| NASA: [Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) | Keeps radiation, isolation/confinement, distance from Earth, gravity, and closed environments distinct while noting they can interact. The app does not infer cause from one metric or event overlap. |
| NASA: [Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/) | Grounds the Help & sources context and the coverage statement: the demo’s six indicators cannot assess all physiological, behavioral-performance, or radiation risks, nor every mission destination. |
| NASA: [Ongoing HRP Research](https://www.nasa.gov/hrp/ongoing-hrp-research/) | Supports using sleep, activity/workload, and self-described wellbeing as separate context and explicitly marking other research areas (such as immune work) unassessed. Aster does not reproduce NASA measures. |
| CSA: [Monitoring radiation for astronaut health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | Adds context on continued development of the autonomous CANS neutron instrument. The link is attributed and kept separate from the historical NASA RadLab excerpt and fictional mission readings. |
| CSA: [Why conduct science experiments in space?](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) | Adds broad ISS and deep-space research context in Help & sources; it does not drive individual guidance or rules. |

Summaries are short paraphrases with links to the original publishers. NASA and CSA are not represented as endorsing Aster, and the linked sites’ terms remain applicable. See the [evidence register](EVIDENCE-REGISTER.md) for source-by-source limitations and data provenance.

## Feature matrix

| Challenge need | Implemented in the demo | Remaining validation |
|---|---|---|
| Gather health indicators | Six manual metrics, units, time, method, conditions; optional heart-rate BLE | Device testing on a Windows BLE adapter and actual monitor. |
| Self-assessment | Personal trend comparison with insufficient/verify states | Independent rule tests and a qualified medical review before any real use. |
| Explain context | Linked scenario records, mission timeline, anatomy, and curated NASA/CSA source summaries | Review all science copy; source summaries are context, not validation of the demo rules. |
| Support an action | Guided scenario checklist, follow-up tasks, reassessment, local handoff | Usability walkthrough with representative users. |
| Long-duration / delayed connection | Deterministic scenario clock and local simulated delivery stages | No real transport or receiver is included. |
| Offline startup | Bundled content, browser storage, SQLite desktop design | Rehearse packaged installer with network disabled. |
| Accessibility | Keyboard-operable buttons and checks, reduced-motion CSS, text status | Keyboard, contrast, zoom, screen-reader, and failure-state review. |

## Validation checklist

- [x] Baseline rules: insufficient history, mismatched conditions/method/phase/unit, invalid value, missing recent data, and future/current-window exclusion are covered by pure unit checks.
- [ ] Sensor: bad contact and stale/absent samples require verification; urgent symptom review remains available without sensor data.
- [ ] Scenario reset: exact same fixtures return; live readings are preserved.
- [x] Privacy sanitizer: private notes and self-reports are excluded by default and included in a local handoff only after opt-in; unit checks cover private text paths.
- [ ] Handoff delivery states: queued/transmitted/received/reviewed behavior persists across restart.
- [x] Radiation source test: NASA RadLab instrument IDs, source timestamps, units, query URL, and separation from scenario records are covered by unit checks.
- [ ] Export presentation: generate and inspect browser HTML/JSON exports with and without the explicit private-text option.
- [x] Reaction comparison rule: matching version and input method are covered by unit checks.
- [ ] Reaction interaction: premature input, missed cue, cancellation, hidden tab, and interrupted-session handling need interaction rehearsal.
- [ ] Persistence: browser refresh and desktop process restart retain all completed actions with no partial save.
- [ ] Synchronization: chart, anatomy selection, timeline evidence, investigation status, and follow-up state agree after replay.
- [ ] Usability: keyboard-only navigation, visible focus, contrast, reduced motion, narrow window, anatomy fallback, and first-run empty/error states.
- [ ] Presentation: 3-minute primary walkthrough and cabin/radiation alternate branches rehearsed offline.
- [x] Desktop build: Windows NSIS installer generated with `cargo tauri build`; Tauri, SQLite vault, and native BLE source compile.
- [ ] Desktop round-trip: install the generated bundle, create a record, close, reopen, and confirm it remains in the per-user SQLite database.
- [ ] Physical sensor: verify standard BLE heart-rate capture, contact flags, disconnects, and stale-signal handling with a supported wearable.

## Build prerequisites and commands

The browser requires Node.js and npm. The Windows desktop build additionally requires Rust with the MSVC toolchain, Microsoft C++ Build Tools with “Desktop development with C++,” and Microsoft Edge WebView2. Rust stable, Tauri CLI 2, and the existing Visual Studio 2022 C++ workload were used to generate the installer in this environment. The first full native build compiled the application and created the bundle; it did not include an install/reopen or physical wearable round trip.

From `docs/design-review/`:

```powershell
npm ci
npm run dev
npm run build
npm run desktop:dev
npm run desktop:build
```

Install the Tauri CLI after Rust is available with `cargo install tauri-cli --version "^2" --locked`. The generated NSIS installer is `src-tauri/target/release/bundle/nsis/Aster_0.2.0_x64-setup.exe` (24.35 MiB; SHA-256 `4AD014B69DC6362FD8B8EF4FA5F6A7A4E3A3ACE2BB96B6534F0F4A0BA6FFCD66`). The preview runs at `http://127.0.0.1:4173/` and needs no API key or account.

## Delivery claim ledger

| Claim | State |
|---|---|
| Aster browser experience and bundled scenario fixtures | Production browser build passes; interactive visual rehearsal still required. |
| Fictional branches and simulated communication delays | Implemented as local presentation behavior. |
| Browser IndexedDB and fallback | Implemented in source; refresh/restart flow requires verification. |
| Tauri SQLite transactional vault | Compiled into the Windows app; installed save/reopen round trip still required. |
| Native Windows BLE | Compiled with `btleplug`; physical wearable behavior is not verified. |
| Windows installer | Generated at `src-tauri/target/release/bundle/nsis/Aster_0.2.0_x64-setup.exe`; installation is not yet smoke-tested. |
| Clinical validity or NASA endorsement | Not claimed. |
