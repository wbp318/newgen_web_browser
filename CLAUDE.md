# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Run

```
npm install
npm start
```

There is no build step, no test suite, no linter. The renderer is vanilla HTML/CSS/JS loaded directly by Electron from `index.html`.

## Architecture

Three-process Electron split:

- **`main.js`** — main process. Hosts the `BrowserWindow`, **owns all keyboard shortcuts** as Electron application-menu accelerators (the menu is hidden via `setMenuBarVisibility(false)` but accelerators still fire from anywhere), forwards menu/`window.open`/right-click events to the renderer over IPC, and serves omnibox suggestions by fetching `https://www.google.com/complete/search?client=firefox` over Node's `https`.
- **`preload.js`** — context-isolated bridge. Exposes `window.newgen` via `contextBridge`:
  - `onAction(cb)` — subscriber for the `action` IPC channel (main → renderer push: shortcut firings, popup-to-new-tab, view-source-from-context-menu, etc.)
  - `fetchSuggestions(q)` — `ipcRenderer.invoke('fetch-suggestions', q)` (renderer → main request/response, returns `string[]`).
- **`renderer.js`** — drives the entire browser chrome. Single file by design, organized as object literals (`tabs`, `bookmarks`, `history`, `find`, `omnibox`, `menus`) plus an `actions` dispatch table.

### Keyboard shortcuts: do not add window-level keydown listeners

`<webview>` content does not bubble keyboard events to the host page, so a `window.addEventListener('keydown', ...)` only fires when chrome has focus. Global shortcuts (Ctrl+T, Ctrl+W, F5, Ctrl+F, Esc, Ctrl+Shift+T, Ctrl+Shift+R, …) are wired as Electron application-menu accelerators in `buildAppMenu()` in `main.js`. Each item's `click` handler calls `sendAction(name, ...args)`, which IPCs to the renderer; the renderer's `onAction` dispatcher routes through the `actions` object. **To add a new shortcut: add a menu item in `buildAppMenu` and a matching key in `actions`** — do not reach for a window keydown listener.

A few special action names are handled inline in the IPC dispatcher rather than via `actions[]`:

- `open-in-new-tab` (url, focus) — popup routing and right-click "Open Link in New Tab"
- `view-source-url` (url) — right-click "View Page Source"
- `switch-tab` (index)
- `stop-or-close-find` — Esc handler; closes omnibox → find bar → stops loading, in that order

### Tabs

Each tab is a `<webview partition="persist:newgen">` element appended to `#content`. Only the tab with class `.active` is visible (CSS-driven; no destroy/recreate on switch). Chrome state (URL bar, throbber, progress, lock icon, nav buttons) updates only when the firing webview is the active tab — gated by an `isActive()` closure inside `tabs._wireWebview()`. Hook new browser-level reactions into `_wireWebview` and respect the gate.

`tab.favicon` is populated from `page-favicon-updated` and rendered in the strip; the `<img>` has an `error` listener that falls back to an emoji glyph.

### Persistence

`localStorage` only:

- `bookmarks` — `[{ url, title, addedAt }]`
- `history` — `[{ url, title, visitedAt }]`, capped at 500 entries
- `lastTabs` — `[url]`, written by `tabs._persistSession()` on every `create`/`close`/`did-navigate`, restored once at init

Closed tabs are an in-memory stack (max 20) for Ctrl+Shift+T; they intentionally do not persist across launches.

### Menus

The visible menubar uses **custom HTML dropdowns**, not Electron's native `Menu` (native would render Win11-style and break the aesthetic). The application menu set by `Menu.setApplicationMenu` is never rendered — it exists purely so its accelerators fire. Right-click context menus on page content **do** use native `Menu.popup()` from main (`buildContextMenu` in `main.js`) — that's fine because they pop over web content, not chrome.

## Aesthetic constraint

The project's whole point is period-correct Win95 / Netscape-Communicator chrome:

- Beveled `outset` (raised) / `inset` (pressed) borders using `var(--hl)` / `var(--dk-shadow)`. Never `border-radius` on chrome elements.
- Tahoma 11px with `-webkit-font-smoothing: none`.
- Palette `#c0c0c0` face / `#000080` selection / `#ffffff` highlight / `#000` shadow — defined as CSS vars in `:root`.
- Drop shadows are allowed on floating panels, dropdown menus, and the omnibox dropdown (offset, hard-edge `2px 2px 0 rgba(0,0,0,0.4)` style), nowhere else.

When adding new UI, match this. Modern conveniences (rounded corners, soft shadows, smooth fonts, gradients on flat chrome) break the design and shouldn't be introduced without an explicit ask.

## Trademark constraint

The product is named **Newgen Navigator**. Don't reintroduce the Netscape name, the N-with-comet logo, or other Netscape-owned trademarks anywhere — those marks are still held by Verizon and the project deliberately stays clear of them.

## Operational notes

- `[ERROR:debug_utils.cc(14)] Hit debug scenario: 4` is harmless Chromium GPU/sandbox init telemetry on Windows. Filter out when tailing logs. Same for `Autofill.*` errors from DevTools' `protocol_client.js`.
- `cache_util_win.cc(20)] Unable to move the cache: Access is denied` shows up when two Electron instances share the same userData dir. Make sure no stray instance is running before relaunching.
- `<webview>` is technically deprecated in Electron in favor of `WebContentsView`. We use webview because it lets the renderer own tab-switching state. If migrating, the `tabs` module is where all the coupling lives.
- Default search engine is Google; it's a plain query URL (`https://www.google.com/search?q=`) — no API key needed. The suggestions endpoint (`/complete/search?client=firefox`) is also unauthenticated and returns clean JSON `["query", ["sugg1", "sugg2", ...]]`.
