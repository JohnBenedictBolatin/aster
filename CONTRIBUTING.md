# Contributing to Aster

Thanks for helping improve Aster. Keep changes focused on making the demonstration clearer, more useful, and more honest about its limits.

## Get the app running

Install Node.js and npm, then from `docs/design-review/` run:

```powershell
npm ci
npm run dev:web
```

The browser app opens at the Vite address (normally `http://127.0.0.1:4174/`). Run `npm run build` from the same folder to type-check and build the browser app. See the [app README](docs/design-review/README.md) for the Windows desktop prerequisites.

## Product and evidence guidelines

- Keep the user-facing story centered on noticing changes, inspecting evidence, taking a next step, and reassessing.
- Label example crew records and simulated communications clearly.
- Preserve the source, time, unit, method, conditions, quality, and known gaps when showing or exporting records.
- Do not turn research summaries into medical advice or claim that a research source validates Aster’s demonstration rules.
- Do not add diagnosis, treatment, emergency procedures, clinical thresholds, risk scores, or claims of NASA/CSA endorsement.
- Keep browser and desktop records local unless a separately reviewed product decision changes that boundary.
- Retain the attribution and license notices for bundled anatomy and other third-party assets.

## Before submitting a change

Describe the user-visible behavior and its limitations. For a change to a scenario or evidence rule, update the [feature guide](docs/FEATURES.md), [evidence register](docs/EVIDENCE-REGISTER.md), or [delivery plan](docs/DELIVERY-PLAN.md) when needed so the public description stays accurate. Do not include real personal health information in fixtures, screenshots, or bug reports.
