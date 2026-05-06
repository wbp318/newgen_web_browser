# Newgen Navigator

A modern web browser dressed in classic Netscape-era chrome.

Built on Electron — full Chromium rendering under the hood, hand-styled UI inspired by the late-90s desktop: Win95 beveled buttons, Tahoma at 11px with anti-aliasing off, an animated starfield throbber, a blinking-marquee home page, the works.

## Features

- **Multiple tabs** with middle-click close, persistent session storage, Ctrl+1..9 jump, real favicons, and reopen-closed-tab (Ctrl+Shift+T)
- **Session restore** — closed-tab list is rebuilt on every launch
- **Omnibox autocomplete** — bookmark/history hits plus live Google suggestions, arrow-key navigation, Chrome-style empty-focus recents
- **Working menu bar** — File / Edit / View / Go / Bookmarks / History / Window / Help, with proper accelerators
- **Bookmarks** — add, remove, navigate; persisted in local storage
- **History** — auto-recorded with timestamps; full panel + recent-items dropdown
- **Find in page** (Ctrl+F) with previous/next and match counter
- **Zoom** (Ctrl+/-/0) per tab; **hard reload** (Ctrl+Shift+R) bypasses cache
- **Developer tools** (F12)
- **Right-click context menus** — Open in New Tab, Save Image, View Source, Inspect Element, search selection on the web
- **Custom retro home page** with scrolling marquee, neon panels, and a totally-legit visitor counter

## Stack

- **Electron** with `webview` tag for tab content
- **No build step** — vanilla HTML / CSS / JS in the renderer
- **`localStorage`** for bookmarks, history, and session
- **Zero runtime dependencies** beyond Electron itself

## Getting started

```bash
npm install
npm start
```

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| New tab | Ctrl+T |
| Reopen closed tab | Ctrl+Shift+T |
| Close tab | Ctrl+W |
| Next / previous tab | Ctrl+Tab / Ctrl+Shift+Tab |
| Switch to tab N | Ctrl+1..9 |
| Focus address bar | Ctrl+L |
| Reload | F5 / Ctrl+R |
| Hard reload (bypass cache) | Ctrl+Shift+R |
| Stop | Esc |
| Back / Forward | Alt+Left / Alt+Right |
| Find in page | Ctrl+F |
| Find next / previous | F3 / Shift+F3 |
| Add bookmark | Ctrl+D |
| Open Bookmarks panel | Ctrl+B |
| Open History panel | Ctrl+H |
| Zoom in / out / reset | Ctrl++ / Ctrl+- / Ctrl+0 |
| View page source | Ctrl+U |
| Developer tools | F12 |
| Print | Ctrl+P |

## Project layout

```
newgen_web_browser/
├── main.js          # Electron main — window, context menus, popup routing
├── preload.js       # Renderer ↔ main IPC bridge
├── index.html       # Browser chrome
├── styles.css       # Period-correct Win95 chrome aesthetic
├── renderer.js      # Tab manager, bookmarks, history, find, menus
├── home.html        # Retro home page loaded by new tabs
└── package.json
```

## Roadmap

- Downloads bar with progress
- Settings panel (homepage, search engine, default zoom)
- Incognito mode (separate session partition)
- Reader mode
- Tab drag-to-reorder, drag-out to detach
- Session restore on relaunch
- Retro "About" dialog with custom modal styling

## A note on Netscape

Netscape Navigator was discontinued in 2008. The trademarks ("Netscape", "Navigator", the N-with-comet logo) are still held by Verizon. Newgen Navigator borrows the *look and feel* of the era — beveled gray chrome, the "Location:" tab, the throbber-style loading indicator — but uses original artwork and an original name. No Netscape logo, branding, or assets are reproduced.
