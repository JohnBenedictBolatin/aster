# Aster — Crew health, in context

**Aster is a local-first astronaut health review demonstration.** It helps a crew member bring readings, symptoms, mission context, and follow-up actions together to understand what may need another look.

Built for the 2026 NASA Space Apps Challenge. Aster is an independent prototype; NASA and the Canadian Space Agency do not sponsor or endorse it.

[Open the browser demo](https://johnbenedictbolatin.github.io/aster/) · [Explore the features](docs/FEATURES.md) · [See the source](https://github.com/JohnBenedictBolatin/aster)

## What Aster helps you do

Aster turns a scattered set of mission records into a clear review path:

**Notice a change → inspect the evidence → choose a next step → follow up.**

- **Keep selected readings together.** Record resting heart rate, blood pressure, blood glucose, body temperature, sleep duration, and a mood check-in. Each entry can retain its time, method, conditions, and source.
- **See change against personal history.** Aster compares recent readings with a crew member’s own matching history. It explains when there is too little history or a record needs checking; the comparison is not a clinical range or diagnosis.
- **Review three mission scenarios.** Explore recovery and fatigue, a cabin-environment concern, and radiation records. Each scenario brings relevant readings, check-ins, instrument details, and open questions into one guided review.
- **Understand the evidence.** Follow the timeline, inspect data quality and provenance, explore a reference anatomy view, and read concise NASA and Canadian Space Agency research summaries with links to their sources.
- **Record an action and come back to it.** Save a follow-up task, add a later result, review what changed, and decide explicitly whether the investigation is complete. Recording a result does not close a review automatically.
- **Prepare a local handoff or export.** Create a review summary and export selected records as HTML or JSON. Private notes are excluded by default. Handoff delivery stages are simulated; Aster does not send a message to Earth or contact medical support.
- **Optionally capture heart rate over Bluetooth.** Supported browsers and the Windows desktop build have a heart-rate connection path. Device support and physical-wearable behavior still need hands-on validation; Bluetooth is not required for the scenarios.

The [feature guide](docs/FEATURES.md) walks through each screen and explains what the demo can and cannot show.

## Demo data and limits

The crew and mission scenarios are fictional. The radiation review also includes a small, clearly separated excerpt of historical NASA RadLab instrument data; those readings are not the fictional crew member’s personal dose. References provide research context and do not validate Aster’s demonstration rules.

Aster is an educational decision-support prototype, not a medical device. It does not diagnose, prescribe, calculate a health score or personal radiation dose, predict a person’s health, or supply emergency procedures. Its demonstration rules have not been clinically validated. Use the mission’s approved medical processes for real health decisions.

## Try the browser demo

Open the [hosted browser demo](https://johnbenedictbolatin.github.io/aster/). It needs an internet connection to load, requires no account, and saves records in the current browser on the current device. Records are not synced between devices. Once the app is open, the demo scenarios and bundled source summaries do not depend on a live NASA service.

To run it locally, install Node.js and npm, then use:

```powershell
cd docs/design-review
npm ci
npm run dev:web
```

Open the local address printed by Vite (usually `http://127.0.0.1:4174/`). Build the browser app with `npm run build`.

## Technology, in plain language

| Part | Technology | What it does |
|---|---|---|
| App interface | React and TypeScript | Builds the screens and keeps the product logic organized. |
| Browser development and build | Vite | Runs the local preview and creates the browser version. |
| Windows desktop shell | Tauri 2 and Rust | Packages the interface as a native Windows application and provides local system features. |
| Local records | IndexedDB in the browser; SQLite in the desktop app | Keeps readings, reviews, and follow-ups on the device. Browser storage has a localStorage fallback. |
| Anatomy and charts | React Three Fiber, Three.js, and Recharts | Displays the reference anatomy and reading trends. |
| Optional heart-rate connection | Web Bluetooth in supported browsers and a native BLE adapter | Receives heart-rate samples when a compatible device is available and access is granted. |

The current guidance is produced by transparent, versioned demonstration rules and curated scenarios. It does not use an AI doctor or a cloud health service.

## Browser and Windows versions

The browser demo is the easiest way to explore Aster. The Windows desktop build uses the same interface with a local SQLite vault. A Windows installer has been generated from this source, and the native code compiles; installation, saved-data recovery after restart, and physical wearable checks still need separate validation. The installer is not currently offered as a published download.

For Windows development, install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) (Rust stable, Microsoft C++ Build Tools, and WebView2), then run `npm run desktop:dev` or `npm run desktop:build` from `docs/design-review/`.

## Repository guide

- [Feature guide](docs/FEATURES.md) — screens, scenarios, and capability limits
- [Product brief](PRODUCT.md) — product direction and feature matrix
- [Product and engineering blueprint](docs/BLUEPRINT.md) — scenario and architecture details
- [Evidence register](docs/EVIDENCE-REGISTER.md) — research links, data provenance, and source limits
- [Research notes](docs/RESEARCH.md) — background research and open questions
- [Delivery plan](docs/DELIVERY-PLAN.md) — implementation status and remaining validation
- [Demo walkthrough](docs/DEMO-SCRIPT.md) — a three-minute tour and alternate scenarios
- [Visual system](DESIGN.md) — interface colors, typography, and design conventions
- [Browser app README](docs/design-review/README.md) — setup and app-specific notes
- [Contribution guide](CONTRIBUTING.md) — how to make a careful change

## Credits

Aster links to public NASA and Canadian Space Agency material and includes a limited, attributed NASA RadLab excerpt. Use of agency material does not imply agency endorsement. The anatomy assets have their own source licenses and attribution in [`docs/design-review/public/assets/anatomy/`](docs/design-review/public/assets/anatomy/). Please review those terms before reusing the assets.
