# Aster — Crew health, in context

Aster is an offline desktop demonstration for the 2026 NASA Space Apps Challenge. It helps an astronaut notice a health pattern, inspect the evidence, complete a guided review, record an action, and reassess. It uses fictional crew data and curated NASA and Canadian Space Agency research context; it is not a clinical tool and does not contact ground teams or claim agency endorsement.

**Try the live browser demo:** [Open Aster](https://johnbenedictbolatin.github.io/tether/). It needs an internet connection to load, requires no account, and keeps browser entries on the device and browser where they were recorded. The [source code](https://github.com/JohnBenedictBolatin/tether) is also available on GitHub.

## Run the browser preview

```powershell
cd docs/design-review
npm ci
npm run dev:web
```

Open `http://127.0.0.1:4174/`. The browser preview persists local records in IndexedDB (with a localStorage fallback), requires no account or API key, and includes bundled scenarios, anatomy assets, curated NASA/CSA summaries, and a small offline NASA RadLab instrument-data excerpt with source query metadata. The five NASA/CSA challenge resources are catalogued in the [evidence register](docs/EVIDENCE-REGISTER.md). Optional heart-rate capture uses Web Bluetooth where supported.

## Windows desktop build

Install the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/): Rust stable, Microsoft C++ Build Tools with “Desktop development with C++,” and Microsoft Edge WebView2. Then install the Tauri 2 CLI with `cargo install tauri-cli --version "^2" --locked`, and run `npm run desktop:dev` or `npm run desktop:build` from `docs/design-review/`. The desktop app stores data in SQLite in the per-user application data directory and builds an NSIS installer under `src-tauri/target/release/bundle/nsis/`; see the [Tauri Windows installer guide](https://v2.tauri.app/distribute/windows-installer/) for packaging options.

The Windows NSIS installer has been generated successfully on this Windows environment with `cargo tauri build`. It is available at `docs/design-review/src-tauri/target/release/bundle/nsis/Aster_0.2.0_x64-setup.exe` (24.35 MiB). The build compiles the Tauri/SQLite vault and native BLE adapter; installation, app-data reopen, and physical wearable checks remain separate validation steps.

## Project docs

- [Product brief and feature matrix](PRODUCT.md)
- [Implementation, validation, and delivery plan](docs/DELIVERY-PLAN.md)
- [Evidence register](docs/EVIDENCE-REGISTER.md)
- [Three-minute demo and alternate scenarios](docs/DEMO-SCRIPT.md)
- [Research background](docs/RESEARCH.md)
- [Browser app setup](docs/design-review/README.md)
