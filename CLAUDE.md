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

- **`main.js`** — main process. Creates the `BrowserWindow`, intercepts `window.open` and webview right-click `context-menu` events, and forwards them to the renderer over IPC (`open-in-new-tab`, `view-source`).
- **`preload.js`** — context-isolated bridge. Exposes `window.newgen` via `contextBridge` with `onOpenInNewTab` / `onViewSource` subscribers. The renderer has **no Node access**; anything that needs main-process powers goes through here.
- **`renderer.js`** — drives all browser chrome and tab logic. Single file by design.

The renderer is organized as object literals, not classes: `tabs`, `bookmarks`, `history`, `menus`, `find`, plus an `actions` dispatch table.

### Tabs

Each tab is a `<webview partition="persist:newgen">` element appended to `#content`. Only the tab with class `.active` is visible (CSS-driven; no destroy/recreate on switch). All chrome state (URL bar, throbber, progress, lock icon, nav buttons) updates only when the firing webview is the active tab — this is gated by an `isActive()` closure inside `tabs._wireWebview()`. When adding new browser-level features that react to navigation events, hook them into `_wireWebview` and respect the active-tab gate.

### Action dispatch

Menu items carry `data-action="foo"` attributes. A single document-level click handler looks up `actions[foo]` and invokes it. Keyboard shortcuts in the global `keydown` listener call the same `actions.foo()` functions. **To add a new menu item or shortcut, add one entry to the `actions` object** — don't fork the wiring.

### Menus

The menubar uses **custom HTML dropdowns**, not Electron's native `Menu` API. This is intentional: native menus on Win11 render in modern style and break the Win95 aesthetic. The `menus` object handles positioning, hover-slide between menus, and outside-click dismissal. Right-click context menus on page content **do** use native `Menu.popup()` from the main process (see `buildContextMenu` in `main.js`) — that one's fine because it pops over web content and doesn't read against the chrome.

### Persistence

`localStorage` only — `bookmarks`, `history`. No main-process storage, no database. History is capped at 500 entries. If multi-window or per-profile state is added later, this needs rework.

## Aesthetic constraint

The project's whole point is period-correct Win95/Netscape Communicator chrome:

- Beveled `outset` (raised) / `inset` (pressed) borders using `var(--hl)` / `var(--dk-shadow)`. Never `border-radius` on chrome elements.
- Tahoma 11px with `-webkit-font-smoothing: none`.
- Color palette is `#c0c0c0` face / `#000080` selection / `#ffffff` highlight / `#000` shadow — defined as CSS vars in `:root`.
- Drop shadows are allowed on floating panels and dropdown menus (the offset, hard-edge `2px 2px 0 rgba(0,0,0,0.4)` kind), nowhere else.

When adding new UI, match this. Modern conveniences (rounded corners, soft shadows, smooth fonts, gradients on flat chrome) break the design and shouldn't be introduced without an explicit ask.

## Trademark constraint

The product is named **Newgen Navigator**. Don't reintroduce the Netscape name, the N-with-comet logo, or other Netscape-owned trademarks anywhere in code, UI strings, assets, or commit messages — those marks are still held by Verizon and the project deliberately stays clear of them.

## Operational notes

- `[ERROR:debug_utils.cc(14)] Hit debug scenario: 4` is harmless Chromium GPU/sandbox init telemetry on Windows. Filter it out when tailing logs.
- `<webview>` is technically deprecated in Electron in favor of `WebContentsView`. We use webview because it lets renderer code own tab-switching state. If migrating, the `tabs` module is where all the coupling lives.
