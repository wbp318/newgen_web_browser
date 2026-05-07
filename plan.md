# Newgen Navigator — phase plan

Tracks completed and upcoming phases. Phases ship as a single feature each, get one commit (or a small cluster) on `main`, and are verified before moving on.

---

## Done

- **Phase 1 — Open-source distributable** (`c336e76`)
  LICENSE, NOTICE, CONTRIBUTING, app icon source + rasterizer, electron-builder config (NSIS + portable on Win, DMG x64+arm64 on Mac, AppImage + deb on Linux), GitHub Actions release workflow, README rewrite, full deprecation cleanup via top-level bumps + targeted `overrides`.

- **Phase 2 — `newgen://` scheme + Chromium messaging** (`369ded1`)
  Custom protocol registered as standard + secure + supportFetchAPI on both default and `persist:newgen` sessions. `home.html` rewritten with a Win95-chrome "About Newgen Navigator" hero card carrying the engine claim and a live version stats line (chromium / electron / node / newgen). Hotfix `046fd97` added a `lastTabs` migration shim so existing sessions auto-rewrite the old `file://` home URL on relaunch.

- **Phase 3 — MV2 unpacked extension loader** (`837df19`)
  `Tools → Extensions...` (Ctrl+Shift+E) opens a Win95 floating panel with a folder-picker. Loads via `session.extensions.loadExtension` into the `persist:newgen` partition; persists in `<userData>/extensions.json`; auto-loads on app start. Ships a `tools/test-extension/` fixture that injects a Win95-styled badge on every http(s) page, so contributors can verify the loader without downloading a real extension.

---

## Phase 4 — Downloads bar with progress

**Why:** Every browser has one. Right now Newgen has no surface for in-progress or completed downloads, so users hit `Save Image As…` (already wired in the right-click menu via `contents.downloadURL`) and the file lands silently. That's the most visible "this isn't a real browser yet" gap.

**Scope (tight version, ship first):**
- A collapsible Win95 strip at the bottom of the chrome (above the status bar), hidden by default, slides up on first download.
- One row per active or recently-completed download:
  - Filename (truncated middle, full path on hover).
  - Throbber + bytes-downloaded / total + percent bar while in progress.
  - On completion: file icon, size, "Open" / "Show in folder" / "Remove" buttons.
  - On failure: red error icon, error message, retry button (when retryable).
- Per-download state: `downloading | paused | completed | cancelled | interrupted`.
- "Clear" button on the strip that wipes finished entries (does not touch files).
- Persisted as `<userData>/downloads.json` (just metadata — completed entries survive across launches; in-progress entries are dropped on quit since `DownloadItem` doesn't survive process restarts).

**Deferred (phase 4.5 or later):**
- Resume-on-restart for in-progress downloads (requires `DownloadItem.canResume()` checks and saved state).
- Dangerous-file warnings (executable extensions, mismatched MIME).
- Drag-out-to-target (drag a completed entry to Explorer/Finder).
- Custom save-to dialog (currently uses default OS dialog).

**Implementation outline:**
- `main.js`:
  - `session.fromPartition('persist:newgen').on('will-download', (e, item, contents) => …)` — hook into every download.
  - Forward state changes to renderer over an IPC channel `'downloads:event'` with a stable download id.
  - Methods: `downloads:list` (get current registry), `downloads:cancel(id)`, `downloads:pause(id)`, `downloads:resume(id)`, `downloads:open(id)` (`shell.openPath`), `downloads:show(id)` (`shell.showItemInFolder`), `downloads:clear-finished()`.
  - Persist metadata to `<userData>/downloads.json` on every state transition.
- `preload.js`:
  - Expose `window.newgen.downloads` with the methods above plus `onEvent(cb)`.
- `index.html`:
  - `<div class="downloads-bar" id="downloads-bar" hidden>` between `#content` and `.statusbar`.
  - Hidden by default; renderer toggles on first `'will-download'` event.
- `styles.css`:
  - Win95-beveled strip, inset row borders, throbber glyph reusing the existing animated frames if possible.
- `renderer.js`:
  - `downloads` module driving the bar. Subscribes to `window.newgen.downloads.onEvent`.
  - Auto-shows the bar on the first event of the session; provides a close button that hides it (a future Ctrl+J / "Show Downloads" action would re-open).

**Verification:**
- Right-click any image → Save Image As… → confirm row appears, percent ticks up, "Open" works post-completion.
- Hit a slow connection (chunked large file from a test mirror), confirm pause/resume work.
- Close and relaunch — completed entries should persist, in-progress entries should disappear cleanly.

---

## Backlog (post-phase-4)

In rough priority order; promote one to a numbered phase when ready to start.

- **Settings panel** — homepage URL, default search engine, default zoom, clear browsing data. Win95 tabbed-dialog aesthetic. Wires the customization layer that the rest of the roadmap depends on.
- **Incognito / Private window** — second session partition (`memory:incognito` or unpartitioned in-memory), separate window with a visual indicator (e.g. dark navy chrome trim, "private" glyph). No persistence on close.
- **Browser-action toolbar UI** — completes phase 3. Read each loaded extension's `browser_action` / `page_action` manifest, render icons in a chrome strip, popup the action HTML in a small `BrowserView` on click.
- **Tab drag-to-reorder + drag-out-to-detach** — pure UX polish on the tab strip.
- **Reader mode** — bundle Mozilla's Readability.js, expose a "Reader View" toolbar button, render extracted content in a `newgen://reader?url=…` page styled in the project's chrome aesthetic.
- **Code signing** — Windows Authenticode cert + macOS notarization. Removes the SmartScreen / Gatekeeper warnings on first launch. Costs real money for the certs and a yearly renewal.
- **Auto-updater** — `electron-updater` against GitHub Releases. Needs signing in place first (otherwise updates get blocked). Background check + apply-on-relaunch.
- **About dialog** — proper Win95-modal "About Newgen Navigator" with the icon, version stats, contributor credits, and a "View licence" link. Replaces the current `alert()`-based about action.
