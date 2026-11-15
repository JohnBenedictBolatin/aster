# Aster — Crew health, in context

## Product

Aster is an offline desktop demonstration for the 2026 NASA Space Apps Challenge. It helps a crew member notice a change, inspect the supporting records, complete a guided review, record an action, and reassess later.

**Core loop:** notice a pattern → inspect the evidence → complete a guided check → take an action → reassess.

The primary user is an astronaut during a long-duration mission. Judges use the same scenario workflow and a separate presenter drawer to demonstrate alternate outcomes. Aster uses fictional crew records and curated public research references. It does not diagnose, prescribe, contact ground teams, or make clinical claims.

## Platform and implementation

- Windows desktop first: Tauri 2, React, TypeScript, Vite, Rust commands, and local SQLite.
- Browser preview: same React application, using IndexedDB with a localStorage fallback.
- All fonts, anatomy assets, scenario records, and evidence summaries are bundled for offline startup. Source links open only when selected.
- The earlier Android and iPhone proposal, “Today” home, and Mission log-first layout are superseded by the current desktop flow: Home, My readings, and Health reviews, with Help & sources and Settings secondary.

## Current feature direction

| Area | Aster direction |
|---|---|
| Home | Current concerns, due follow-ups, and recent meaningful actions, each with a clear route into a health review. |
| Measurements | Six manually recorded indicators with unit, time, method, conditions, mission phase, quality, and provenance. Optional Bluetooth heart-rate samples remain separate. |
| Personal history | A 14-day reference period compared with the current three-day window. At least seven comparable reference days are required. Method, context, unit, and mission phase must match. |
| Investigations | Recovery and fatigue; cabin-environment review; radiation-context review. Each keeps its evidence and branch history. |
| Anatomy | Licensed BodyParts3D reference model; selecting a system opens linked records. Anatomy indicates location only, and unmeasured systems remain unassessed. |
| Reaction check | A 60-second pointer/keyboard demonstration recording response times, premature responses, and misses. It is not NASA’s validated instrument or an operational fitness test. |
| Help & sources | Concise, attributed NASA and Canadian Space Agency summaries explain the research context and limits. They are bundled for offline reading; they do not validate Aster’s rules or provide diagnosis. |
| Follow-up | Investigation tasks, recorded outcomes, explicit reassessment, and separate closure. Completing a task never changes observations automatically. |
| Handoff | Editable local summary with a configurable default 12-minute simulated one-way delay. Queued, transmitted, received, and reviewed states are simulated. Private notes are excluded by default. |
| Presenter tools | Scenario reset, pause, time advancement, and explicit follow-up branches. Reset changes only the chosen fixture workspace and preserves live records. |
| Export | Printable dark HTML and JSON with provenance, rule version, scenario identity, and evidence links. |

## Visual system

Use a neutral dark interface: `#080808` canvas, `#121212` panels, `#1C1C1C` raised surfaces, `#303030` borders, and off-white text. White controls are primary; amber and red indicate attention and urgency. Status includes words and icons so color is never the only cue. System sans is the primary font; Space Mono is reserved for compact metadata, and Doto Variable for instrument readings and numeric axes. Original gradient icons identify destinations and metrics; charts share stable metric colors while historical bands stay gray. Color identifies categories, not health status. Use flat sections, one contextual primary action, and expandable record/source details to reduce clutter. See [the visual system](DESIGN.md).

## Boundaries and evidence

- Every record indicates whether it is fictional, crew-entered, historical, or live-device data.
- NASA’s hazard and risk frameworks cover more than Aster’s six indicators. Aster does not turn interacting hazards into one score; unmeasured systems remain unassessed.
- NASA’s ongoing-research and CSA’s ISS-research pages are background only. Aster’s manual check-ins and reaction demonstration are not those agencies’ research instruments.
- Historical space-radiation records describe their named mission instrument; they are not the fictional astronaut’s personal dose.
- CSA’s CANS development is kept distinct from NASA RadLab data and Aster’s fictional instrument records.
- NASA and CSA references do not endorse Aster. Their source-site terms apply; no CSA images or datasets are republished.
- Demonstration rules identify patterns for review. They are not clinical reference ranges or validated alert thresholds.
- A coincident symptom and environmental event do not prove exposure or cause.
- Aster does not calculate a health score, predict physiological change, or provide medication or emergency procedure instructions.
- No real ground communications, cloud account, clinical record, or network dependency is configured.

## Current implementation status

The React browser preview builds successfully, and the Tauri/SQLite/native BLE code compiles into a generated NSIS installer at `docs/design-review/src-tauri/target/release/bundle/nsis/Aster_0.2.0_x64-setup.exe`. Installer launch, save/reopen, interactive visual, and physical wearable checks remain outstanding. See [the implementation and rehearsal plan](docs/DELIVERY-PLAN.md), [the evidence register](docs/EVIDENCE-REGISTER.md), and [the three-minute walkthrough](docs/DEMO-SCRIPT.md).
