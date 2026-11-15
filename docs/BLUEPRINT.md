# Aster product and engineering blueprint

This file replaces the earlier Tether/Android-first proposal. **Aster — Crew health, in context** is the current product direction: an offline, Windows desktop demonstration with a browser preview, local records, three investigation scenarios, and separate presenter controls.

The agreed interaction is:

**Notice a pattern → inspect the evidence → complete a guided check → take an action → reassess.**

## Product summary

Home is the opening screen. It places current concerns and due follow-ups first, with a short recent-activity list. The three primary destinations are Home, My readings, and Health reviews; Help & sources and Settings are secondary. Each health review presents the change, the evidence, and one suggested next action, while detailed charts, timelines, collection information, sources, and anatomy remain available in context.

The astronaut is the primary user. Judges follow the same workflow and use a separate presenter drawer to advance the deterministic scenario clock, reset fixtures, or select explicit follow-up branches.

## Desktop architecture

- React, TypeScript, Vite, and React Three Fiber for the interface and bundled anatomy viewer.
- Tauri 2 for the Windows desktop shell and native Rust commands.
- SQLite for the local desktop vault; IndexedDB with localStorage fallback for the browser preview.
- A versioned JSON snapshot is stored with transactional projections for observations, contexts, investigations, tasks, mission events, scenario sensor records, reaction sessions, handoffs, and separate live observations.
- The same heart-rate domain flow accepts browser Web Bluetooth and a native standard BLE heart-rate adapter. A sample stays unverified until method and conditions can be reviewed.
- Scenario time is replayable and separate from real time. No network service is needed for scenario operation.

## Three scenarios

1. **Recovery and fatigue:** declining fictional sleep, rising resting pulse, workload context, optional check-in, and a 60-second independent reaction demonstration. Presenter branches show improving values, a continuing pattern, or sensor error.
2. **Cabin environment:** a fictional sensor event overlaps a headache check-in. The user reviews source, time, and quality and can prepare a local handoff. The interface does not infer causation.
3. **Radiation context:** fictional instrument readings and a visible data gap sit beside a separately labeled four-row NASA RadLab ISS/DosTel excerpt. The source instrument IDs, timestamps, values, units, exact query, retrieval date, and portal version travel with the excerpt; no personal dose is calculated.

## Explainable evidence and comparison

The guidance selector returns a suggested action, its reason, supporting records, and optional actions. Help & sources bundles concise, attributed NASA and Canadian Space Agency references. The five-hazards and risks resources explain the wider context and the limits of a six-indicator demo; NASA's ongoing research examples support treating sleep, activity/workload, and self-described wellbeing as distinct context. CSA's radiation-monitoring article describes continued development of CANS and is kept separate from the historical NASA RadLab excerpt and fictional dosimeter records. The CSA science-in-space page is general research context only. These sources do not validate Aster's demonstration rules or imply agency endorsement.

Personal comparison uses a 14-day reference before a three-day assessment and requires seven comparable daily observations. Unit, measurement method, conditions, and mission phase must match. Missing, stale, invalid, or incompatible records are surfaced as insufficient or needing verification. A demonstration band is not a clinical range.

## Safety and scope boundaries

- Fictional crew and scenario telemetry are labeled as synthetic.
- Historical NASA instrument readings never become the fictional astronaut’s personal measurement.
- “Not assessed” remains distinct from “normal.”
- A symptom stays accessible even when sensor data are absent or invalid.
- Task completion, acknowledgement, reassessment, and investigation closure are separate actions.
- Handoff saves locally before the simulated queue. Its 12-minute default one-way delay is a scenario clock setting, not a clinician response promise.
- There is no diagnosis, prescription, health score, physiological prediction, cloud account, or real ground communication.

For the implementation order, validation checklist, feature matrix, and build prerequisites, see [DELIVERY-PLAN.md](DELIVERY-PLAN.md). Source limitations are in [EVIDENCE-REGISTER.md](EVIDENCE-REGISTER.md), and the judge walkthrough is in [DEMO-SCRIPT.md](DEMO-SCRIPT.md).
