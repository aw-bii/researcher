# MyRA Phase 1 — Functional Fixes Design

**Date:** 2026-06-26
**Scope:** Phase 1 of the v0.2.1 issue list (GitHub issue #1). Fixes critical functional regressions before the Phase 2 UI restructure.
**Approach:** Layer-by-layer — fix the shared streaming path first (unblocks testing), then backend detection and auth, then UI integrity bugs.

---

## Context

All backends currently return empty replies. Setup wizard install commands produce npm E404 errors. API key auth does not work. Search button is non-functional. These make the app unusable. Phase 2 (nav restructure, default personas/pipelines, chat layout redesign) is deferred until Phase 1 ships.

---

## Layer 1: IPC Streaming Fix

### Problem

Every backend — CLI and HTTP alike — returns an empty reply. Since the failure is universal, the break is in the shared streaming infrastructure, not any individual adapter.

### Streaming path

```text
Renderer → IPC(CHAT_SEND) → Main handler → adapter.send() → AsyncIterable<MessageChunk>
                                                                        ↓
Renderer ← IPC(CHAT_CHUNK) ←───────── Main iterates iterable ←─────────┘
                                                ↓
                                         IPC(CHAT_DONE)
```

### Investigation targets

1. **`src/main/ipc.ts` — CHAT_SEND handler:** The handler iterates the adapter's `AsyncIterable<MessageChunk>` and calls `event.sender.send(CHAT_CHUNK, chunk)` per chunk. Candidates for failure:
   - `event.sender` is stale (window destroyed or navigated) by the time chunks arrive
   - Chunk shape mismatch: adapter yields `{ type, content, raw }` but the emit wraps or renames the field
   - The `for await` loop is not reached because `adapter.send()` throws synchronously and the error is swallowed

2. **`src/renderer/` — CHAT_CHUNK listener:** The renderer registers a listener for `CHAT_CHUNK` and appends `chunk.content` to the active message state. Candidates:
   - Listener registered on the wrong channel name (string mismatch vs `src/shared/ipc.ts` constants)
   - Listener torn down (unsubscribed) before chunks arrive — e.g., on re-render of the chat component
   - State update uses a stale closure over `messages`, so new chunks overwrite rather than append

### Fix

Patch whichever side (or both) is broken. No adapter code is touched in this layer. A correct fix makes all 8 adapters stream simultaneously.

### Success criterion

Sending a message to any backend produces visible streamed text in the chat window.

---

## Layer 2: Backend Detection & Auth

### 2a. PATH detection

**Problem:** CLI adapters' `isAvailable()` methods check hardcoded or bundled binary paths. OpenCode reports "not installed" even when it is on PATH.

**Fix:** Replace all `isAvailable()` implementations for CLI adapters with a PATH probe:

```ts
// Windows
await exec('where <binary>')
// Unix
await exec('which <binary>')
```

Exit code 0 = available. This applies to: `claude`, `gemini`, `opencode`, `ollama`, `codex`.

Claude Code is no longer bundled. Both `claude.adapter.ts` (CLI) and `claude-api.adapter.ts` (HTTP) remain — the CLI variant requires `claude` on PATH.

### 2b. Correct install commands

The wizard's install step uses per-backend shell commands. Replace existing commands with:

| Backend | Install command |
| --- | --- |
| Claude Code | `curl -fsSL https://claude.ai/install.sh \| bash` |
| Gemini CLI | `npm install -g @google/gemini-cli` |
| Opencode | `curl -fsSL https://opencode.ai/install \| bash` |
| Ollama (Windows) | `irm https://ollama.com/install.ps1 \| iex` |
| Ollama (Mac/Linux) | `curl -fsSL https://ollama.com/install.sh \| sh` |
| Codex | `curl -fsSL https://chatgpt.com/codex/install.sh \| sh` |

The npm E404 error is caused by an incorrect package name in the current wizard; the Gemini CLI command above is correct.

### 2c. Wizard validation

**Problem:** The wizard marks backends as configured after install without confirming they actually work.

**Fix:** After each install (and on initial probe), the wizard calls both `isAvailable()` and `checkAuth()`:

- **CLI adapters:** `checkAuth()` runs the binary with a known-safe command (e.g., `--version`, `--help`, or the adapter's existing probe) and expects exit code 0.
- **API adapters:** `checkAuth()` makes a minimal authenticated HTTP request (e.g., list models endpoint) and expects a 2xx response.

A backend is shown as green only when both checks pass. Failed auth shows a specific error message ("Binary found but auth failed — check your API key") rather than a generic failure.

### 2d. API key UX — Save → Remove

**Problem:** After saving an API key, the Save button remains, giving no confirmation and no way to remove the key.

**Fix:** The key management IPC channels already exist (`KEY_HAS`, `KEY_STORE`, `KEY_DELETE`). The renderer queries `KEY_HAS` after each save/delete operation and conditionally renders:

- **No key stored:** "Save" button (primary)
- **Key stored:** "Remove" button (destructive/secondary)

No new IPC channels needed.

### 2e. Ollama — in-app launch

**Problem:** Ollama must be running (`ollama serve`) before its adapter can connect, but there's no in-app way to start it.

**Fix:** The wizard adds a "Start Ollama" button on the Ollama step. It calls Electron's `shell.openExternal` to open a terminal running `ollama serve`. After the user starts Ollama, they click "Re-check" to re-run the availability probe.

---

## Layer 3: UI Integrity Fixes

Four isolated CSS/wiring bugs. No structural changes (those are Phase 2).

### 3a. Settings panel doesn't scroll

**Problem:** Content below the fold is clipped with no scroll.

**Fix:** Add `overflow-y: auto` and `max-height: 100%` (or `height: 100%`) to the `SettingsPanel` root container.

### 3b. Search button does nothing

**Problem:** The search toggle button in the toolbar does not open `SearchPanel`.

**Fix:** Trace the search mode state from `App.tsx` through the toolbar button to the `SearchPanel` mount condition. Wire the missing connection — likely a missing `onClick` handler or an inverted boolean condition.

### 3c. Setup screen clips adapter list

**Problem:** The wizard step listing adapters clips backends that don't fit in the visible area.

**Fix:** Add `overflow-y: auto` and a bounded `max-height` to the adapter list container in the wizard step component.

### 3d. Chat area has excess empty space

**Problem:** The main chat column doesn't stretch to fill the window.

**Fix:** Identify the flex/grid container where `ChatView` or its parent is missing `flex: 1` or `height: 100%`. One CSS property addition.

---

## What this does NOT include (Phase 2)

- Navigation restructure (no top menu bar, sidebar simplified to conversations only)
- Settings as a popup with MCP/Cron/Plugins as menu items
- Persona and model selector moved to bottom of chat
- Default personas and pipelines pre-loaded
- Model-to-persona mapping
- Chat layout redesign

---

## Success criteria (Phase 1 complete)

- [ ] Sending a message to any configured backend produces streamed text
- [ ] All CLI adapters detect via PATH; none assume bundled binaries
- [ ] Wizard install commands succeed without npm errors
- [ ] OpenCode detected correctly when installed
- [ ] API key adapters authenticate and return real responses
- [ ] API key UI shows "Remove" after a key is saved
- [ ] Ollama wizard step has a "Start Ollama" button
- [ ] Settings panel scrolls to reveal all content
- [ ] Search button opens the search panel
- [ ] Wizard adapter list is fully scrollable
- [ ] Chat area fills the window without excess empty space
