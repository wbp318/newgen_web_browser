# Contributing to Newgen Navigator

Thanks for considering a contribution. The project is small and opinionated; the goal is a working modern browser dressed in late-1990s desktop chrome.

## Quick start

```bash
git clone https://github.com/wbp318/newgen_web_browser.git
cd newgen_web_browser
npm install
npm start
```

There is no build step, no test suite, no linter. The renderer is vanilla HTML/CSS/JS loaded directly by Electron.

## Building installers

```bash
npm run build:icons   # rasterizes assets/icon.svg → build/icon.{png,ico,icns}
npm run dist          # builds for the current platform
npm run dist:win      # Windows NSIS + portable
npm run dist:mac      # macOS DMG (x64 + arm64)
npm run dist:linux    # Linux AppImage + deb
```

Output lands in `dist/`. Builds are unsigned by default — Windows SmartScreen will warn on first run, and macOS Gatekeeper will require right-click → Open. Production releases should be code-signed; signing config is intentionally absent so contributors can build locally without certs.

### Windows: enable Developer Mode

`electron-builder` downloads a `winCodeSign` archive that contains macOS dylib symlinks. Extracting symlinks on Windows requires either Developer Mode or an elevated shell. One-time setup:

> Settings → Privacy & Security → For developers → **Developer Mode = On**

GitHub Actions' `windows-latest` runner already has the necessary privileges, so the release workflow doesn't need this.

## Architecture

See [`CLAUDE.md`](CLAUDE.md) for the full architecture rundown. Highlights:

- **Three-process Electron split.** `main.js` owns the window, the application menu (which is hidden but its accelerators still fire), and right-click context menus. `preload.js` is a context-isolated bridge. `renderer.js` drives the entire chrome.
- **All keyboard shortcuts are Electron menu accelerators** in `buildAppMenu()`. `<webview>` doesn't bubble keys to the host page, so window-level keydown listeners don't work for global shortcuts. Add new shortcuts as menu items.
- **Persistence is `localStorage` only.** Bookmarks, history (capped at 500), and `lastTabs` for session restore.

## Aesthetic constraint

The whole point is period-correct Win95 / Netscape-era chrome:

- Beveled `outset` (raised) / `inset` (pressed) borders using `var(--hl)` / `var(--dk-shadow)`. **No `border-radius` on chrome elements.**
- Tahoma at 11px with `-webkit-font-smoothing: none`.
- Palette `#c0c0c0` face, `#000080` selection, `#ffffff` highlight, `#000` shadow.
- Drop shadows allowed on floating panels, dropdowns, and the omnibox dropdown only — offset, hard-edge `2px 2px 0 rgba(0,0,0,0.4)`. Nothing else.

Modern conveniences (rounded corners, soft shadows, smooth fonts, gradients on flat chrome) break the design and shouldn't be introduced without an explicit ask. PRs that modernize the look will be asked to revert.

## Trademark constraint

The product is **Newgen Navigator**. Don't reintroduce the Netscape name, the N-with-comet logo, or other Netscape-owned trademarks anywhere — those marks are still held by Verizon and the project deliberately stays clear of them. "Chrome" and "Chromium" trademarks belong to Google; we use "built on Chromium" descriptively, never as branding.

## Pull requests

- One change per PR. A bug fix and a refactor go in separate PRs.
- Match the existing code style. The codebase uses 2-space indent, single quotes, semicolons.
- Update [`README.md`](README.md) and [`CLAUDE.md`](CLAUDE.md) when behavior, shortcuts, or architecture change.
- Don't add dependencies without a strong reason. The runtime currently has zero deps beyond Electron itself.
