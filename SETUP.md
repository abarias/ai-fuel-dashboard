# AI Fuel Dashboard — Setup & Run

## Prerequisites

| Tool | Install |
|------|---------|
| Node.js 18+ | https://nodejs.org |
| Rust (stable) | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Tauri CLI | included in devDependencies |
| macOS Xcode CLT | `xcode-select --install` |

---

## First-time setup

```bash
cd ai-fuel-dashboard

# 1. Install JS dependencies
npm install

# 2. Generate app icons (requires ImageMagick, or supply your own 1024x1024 PNG)
#    Option A — auto-generate a placeholder:
bash scripts/gen-icons.sh
npm run tauri icon src-tauri/icons/source.png

#    Option B — use your own image:
npm run tauri icon /path/to/your-icon.png
```

---

## Development

```bash
npm run tauri dev
```

This starts the Vite dev server on port 1420 and launches the Tauri window.
The widget appears as a small always-on-top floating panel.

---

## Production build

```bash
npm run tauri build
```

Produces:
- **macOS**: `src-tauri/target/release/bundle/dmg/` and `.app`
- **Windows**: `src-tauri/target/release/bundle/msi/` and `.exe`

---

## Usage

| Action | How |
|--------|-----|
| Move widget | Drag from the title bar |
| Expand / collapse | Click ▼ / ▲ in header |
| Update usage | Right-click → Settings |
| Pin / unpin | Right-click → Pin on Top |
| Adjust opacity | Right-click → Toggle Transparency or Settings |
| Hide to tray | Click tray icon (macOS menu bar / Windows system tray) |
| Show again | Click tray icon again |
| Quit | Right-click → Quit |

---

## Data

Usage data is stored in SQLite at the Tauri app data directory:
- **macOS**: `~/Library/Application Support/com.aifuel.dashboard/ai_fuel.db`
- **Windows**: `%APPDATA%\com.aifuel.dashboard\ai_fuel.db`

Widget state (opacity, position, expanded/collapsed) persists via `localStorage`.

---

## Default providers (seeded on first run)

| Provider    | Used | Allowance | Cadence |
|-------------|------|-----------|---------|
| Claude Code | 32   | 100       | Monthly |
| Codex       | 48   | 100       | Monthly |
| Copilot     | 16   | 100       | Monthly |

Update these in Settings → Edit to match your actual plan limits.

---

## Architecture

```
src/
  types/index.ts          ← shared TypeScript interfaces
  utils/calculations.ts   ← remainingPct, status, countdown math
  utils/db.ts             ← SQLite via @tauri-apps/plugin-sql
  store/useProviders.ts   ← Zustand store (provider data + widget state)
  components/
    Widget.tsx            ← main floating panel
    ProviderRow.tsx       ← single provider bar + countdown
    Settings.tsx          ← edit provider values + widget prefs
    ContextMenu.tsx       ← right-click menu

src-tauri/
  src/lib.rs              ← Tauri setup, tray icon, always-on-top command
  tauri.conf.json         ← window config (transparent, no decorations, AOT)
  capabilities/default.json ← permission grants for sql/process plugins
```

---

## Roadmap (not yet built)

- [ ] Auto-detect Claude Code usage from `~/.claude/` logs
- [ ] GitHub Copilot quota via VS Code extension API
- [ ] Codex usage via OpenAI API key + `/usage` endpoint
- [ ] Smart tips engine (burn-rate analysis, model-switch suggestions)
- [ ] Battery/fuel-tank visual themes
- [ ] Flutter mobile companion app (iOS/Android widgets)
- [ ] Daily burn chart
- [ ] Fencing-inspired visual mode
