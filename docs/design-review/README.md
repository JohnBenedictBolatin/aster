# Aster browser preview

The Aster workspace is built with React, TypeScript, Vite, React Three Fiber, and bundled reference assets.

The hosted browser demo is [Aster on GitHub Pages](https://johnbenedictbolatin.github.io/aster/). It requires internet to load, needs no account, and keeps entries in the current browser on the current device.

```powershell
npm ci
npm run dev:web
```

Open the local URL Vite prints (starts at `http://127.0.0.1:4174/` and advances to another port if needed). Keep the server running while you review changes; edits update in the browser automatically. Create a browser bundle with `npm run build`. The preview uses IndexedDB with a localStorage fallback and needs no API key or account.

The primary destinations are **Home**, **My readings**, and **Health reviews**. **Help & sources** and **Settings** are secondary; presenter controls open separately. Manual entries, follow-up actions, notes, handoffs, and investigation changes persist locally. Browser Web Bluetooth is optional; live records are stored separately from investigation records. NASA and Canadian Space Agency source summaries are bundled; external source pages open only when selected.

For Windows desktop setup, see [the root README](../../README.md) and [delivery plan](../../docs/DELIVERY-PLAN.md). The Tauri/SQLite vault and native BLE code compile, and the NSIS installer is generated under `src-tauri/target/release/bundle/nsis/`. Installing it and verifying saved records across restart remain outstanding; physical BLE hardware has not been tested.

## Anatomy assets and attribution

The BodyParts3D body surface and system meshes are locally bundled. The heart and lung meshes are separately licensed source assets. Attribution and adaptations are documented in `public/assets/anatomy/LICENSE.md` and adjacent credit files. Rebuild the grouped body asset with `scripts/prepare_bodyparts3d.py`.
