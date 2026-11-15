# Aster browser app

This folder contains the Aster experience: a local reading log, personal-history comparisons, three guided mission reviews, follow-up tasks, and source notes. See the [feature guide](../FEATURES.md) for a screen-by-screen overview and the limits of each demonstration.

## Run the browser version

Install Node.js and npm, then run these commands from this folder:

```powershell
npm ci
npm run dev:web
```

Open the local address printed by Vite (normally `http://127.0.0.1:4174/`). The hosted demo is [Aster on GitHub Pages](https://johnbenedictbolatin.github.io/aster/). The page needs internet to load, but its scenario records and summaries are bundled. Browser records stay in the current browser on the current device; they are not synced.

To check the browser build, run:

```powershell
npm run build
```

## Windows desktop build

The desktop version packages the same interface with Tauri 2 and Rust. Its local records use SQLite. Install the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/) and the Tauri CLI, then run `npm run desktop:dev` or `npm run desktop:build` from this folder.

The Windows application and installer have compiled successfully. The install, save-and-reopen flow, and connection to a physical heart-rate wearable still need hands-on validation; see the [delivery plan](../DELIVERY-PLAN.md).

## Technology

The interface uses React and TypeScript, with Vite for the browser build. React Three Fiber and Three.js display the reference anatomy; Recharts displays trends. The Tauri desktop shell uses Rust commands and SQLite. The browser saves through IndexedDB with a localStorage fallback. Optional heart-rate capture uses Web Bluetooth where supported; it is not required to use the scenario reviews.

The project has no cloud backend or account. Its guided suggestions come from local, versioned demonstration rules. It does not use an AI health service.

## Anatomy assets and attribution

Body and organ models are bundled as reference assets. Read [`public/assets/anatomy/LICENSE.md`](public/assets/anatomy/LICENSE.md) and the adjacent attribution files before reuse. The grouped body asset can be rebuilt with `scripts/prepare_bodyparts3d.py`.
