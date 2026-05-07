# Newgen Navigator

A modern web browser dressed in classic Netscape-era chrome.

**Built on Chromium** — the same rendering engine that powers Google Chrome, Microsoft Edge, Brave, and Opera. You get current-day web compatibility, JavaScript, modern CSS, video, audio, WebGL, the works. The only thing that's vintage is the chrome around it: Win95 beveled buttons, Tahoma at 11px with anti-aliasing off, an animated starfield throbber, a blinking-marquee home page.

> **Trademark note.** Chromium and Chrome are trademarks of Google LLC. Newgen Navigator is not affiliated with, endorsed by, or sponsored by Google. The browser uses Chromium descriptively as its rendering engine, embedded via [Electron](https://www.electronjs.org/).

## Download

Prebuilt installers for Windows, macOS, and Linux are published on the [Releases page](https://github.com/wbp318/newgen_web_browser/releases).

| Platform | File |
| --- | --- |
| Windows (installer) | `Newgen-Navigator-Setup-<version>.exe` |
| Windows (portable)  | `Newgen-Navigator-<version>-portable.exe` |
| macOS (Intel + Apple Silicon) | `Newgen-Navigator-<version>.dmg` |
| Linux (universal)   | `Newgen-Navigator-<version>.AppImage` |
| Linux (Debian/Ubuntu) | `newgen-navigator_<version>_amd64.deb` |

Builds are currently unsigned. On first launch:

- **Windows** SmartScreen will warn — click *More info* → *Run anyway*.
- **macOS** Gatekeeper will block — right-click the app → *Open* → *Open*.
- **Linux** AppImage: `chmod +x` the file, then run.

## Features

- **Multiple tabs** with middle-click close, persistent session storage, Ctrl+1..9 jump, real favicons, and reopen-closed-tab (Ctrl+Shift+T)
- **Session restore** — closed-tab list is rebuilt on every launch
- **Omnibox autocomplete** — bookmark/history hits plus live Google suggestions, arrow-key navigation, Chrome-style empty-focus recents
- **Working menu bar** — File / Edit / View / Go / Bookmarks / History / Window / Help, with proper accelerators
- **Bookmarks** — add, remove, navigate; persisted in local storage
- **History** — auto-recorded with timestamps; full panel + recent-items dropdown
- **Find in page** (Ctrl+F) with previous/next and match counter
- **Zoom** (Ctrl+/-/0) per tab; **hard reload** (Ctrl+Shift+R) bypasses cache
- **Developer tools** (F12) — full Chromium DevTools
- **Right-click context menus** — Open in New Tab, Save Image, View Source, Inspect Element, search selection on the web
- **Custom retro home page** with scrolling marquee, neon panels, and a totally-legit visitor counter
- **Chrome extensions (Manifest V2)** — Tools → Extensions... or Ctrl+Shift+E loads unpacked MV2 extensions (e.g. uBlock Origin Legacy) into the browsing partition. MV3 is not supported by Electron 42

## Build from source

```bash
git clone https://github.com/wbp318/newgen_web_browser.git
cd newgen_web_browser
npm install
npm start                # run in dev
```

Producing distributable installers:

```bash
npm run dist             # current platform
npm run dist:win         # Windows NSIS + portable
npm run dist:mac         # macOS DMG (x64 + arm64)
npm run dist:linux       # AppImage + .deb
```

Output lands in `dist/`. Icons are regenerated from `assets/icon.svg` automatically on every build (`predist` hook → `tools/build-icons.js`).

## Stack

- **Electron 33** with `<webview>` for tab content (Chromium under the hood)
- **No build step** in the renderer — vanilla HTML / CSS / JS
- **`localStorage`** for bookmarks, history, and session
- **Zero runtime dependencies** beyond Electron itself
- **electron-builder** for cross-platform installers

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
| Open Extensions panel | Ctrl+Shift+E |
| Zoom in / out / reset | Ctrl++ / Ctrl+- / Ctrl+0 |
| View page source | Ctrl+U |
| Developer tools | F12 |
| Print | Ctrl+P |

## Project layout

```
newgen_web_browser/
├── main.js                      # Electron main — window, context menus, popup routing
├── preload.js                   # Renderer ↔ main IPC bridge
├── index.html                   # Browser chrome
├── styles.css                   # Period-correct Win95 chrome aesthetic
├── renderer.js                  # Tab manager, bookmarks, history, find, menus
├── home.html                    # Retro home page served at newgen://home
├── assets/icon.svg              # Source-of-truth app icon
├── tools/build-icons.js         # SVG -> .png/.ico/.icns rasterizer
├── .github/workflows/release.yml# CI build + GitHub Releases on tag
└── package.json                 # electron-builder config lives here
```

## Roadmap

- Downloads bar with progress
- Settings panel (homepage, search engine, default zoom)
- Incognito mode (separate session partition)
- Reader mode
- Tab drag-to-reorder, drag-out to detach
- Code-signed Windows installer + notarized macOS DMG

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow, architecture map, and the **aesthetic constraint** (no rounded corners, no soft shadows, no smooth fonts on chrome — the whole point of the project is period-correct Win95 chrome).

## License

[MIT](LICENSE) — see also [`NOTICE`](NOTICE) for Chromium / Electron / Node.js attribution.
