# AI Agent Harness — Design Spec

**Date:** 2026-06-17
**Status:** Approved

---

## Overview

A native desktop chat application (Windows + macOS) that wraps local CLI-based AI backends (Claude Code, Gemini CLI, Opencode, etc.) behind a clean, persistent chat UI. Target user: someone who wants a Hermes-Desktop-style experience but with a guided setup and no gateway/proxy complexity.

**Core v1 features:**

- Chat interface backed by local CLI tools
- Conversation history with full-text search
- Persona / system prompt management
- Guided setup wizard with auto-detection of installed backends
- Claude Code bundled as the zero-install default backend

---

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│                   Electron App                       │
│                                                      │
│  ┌─────────────────┐       ┌─────────────────────┐  │
│  │  Renderer        │  IPC  │  Main Process        │  │
│  │  (React UI)      │◄─────►│                     │  │
│  │                  │       │  ┌───────────────┐   │  │
│  │  - Chat view     │       │  │ AdapterManager│   │  │
│  │  - Sidebar       │       │  │ (spawns CLIs) │   │  │
│  │  - Persona panel │       │  └───────┬───────┘   │  │
│  │  - Setup wizard  │       │          │            │  │
│  └─────────────────┘       │  ┌───────▼───────┐   │  │
│                             │  │  ConvStore    │   │  │
│                             │  │  (SQLite)     │   │  │
│                             │  └───────────────┘   │  │
│                             └─────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │                │               │
    claude CLI        gemini CLI     opencode CLI
  (bundled, JSON)    (optional)      (optional)
```

The renderer process never spawns processes or touches the filesystem directly. All CLI orchestration lives in the main process; renderer communicates via named IPC channels.

---

## Adapter Layer

Every CLI backend implements a common `BackendAdapter` interface:

```typescript
interface BackendAdapter {
  id: string                    // "claude" | "gemini" | "opencode"
  isAvailable(): Promise<boolean>
  send(message: string, persona?: string): AsyncIterable<MessageChunk>
  abort(): void
}

type MessageChunk = {
  type: "text" | "tool_use" | "error" | "done"
  content: string
  raw?: unknown   // original JSON from CLI, for debugging
}
```

**AdapterManager** holds the registry of adapters, exposes `getActive()`, `listAvailable()`, and `setActive(id)`. It is the only entry point the IPC handlers call.

### Per-tool invocation

| Backend | Command | Notes |
| --- | --- | --- |
| Claude | `claude --output-format stream-json --print "<msg>"` | Bundled binary, always present |
| Gemini | `gemini --format json -p "<msg>"` | Falls back to line parsing |
| Opencode | `opencode run --json "<msg>"` | Falls back to stdout line parsing until JSON flag stabilizes |

Persona injection happens inside each adapter's `send()` call as a system-prompt flag — never in the UI layer.

---

## Conversation Store

SQLite via `better-sqlite3`. Three tables:

```sql
CREATE TABLE conversations (
  id         TEXT PRIMARY KEY,
  title      TEXT,        -- auto-generated from first user message (first 60 chars)
  backend    TEXT,        -- adapter id active at creation
  persona_id TEXT REFERENCES personas(id),
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id) ON DELETE CASCADE,
  role            TEXT,   -- "user" | "assistant"
  content         TEXT,
  backend         TEXT,
  created_at      INTEGER
);

CREATE TABLE personas (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  system_prompt TEXT,
  is_default    INTEGER  -- 0 | 1
);

-- Full-text search over message content
CREATE VIRTUAL TABLE messages_fts USING fts5(content, content=messages, content_rowid=rowid);
```

**Persona locking:** the `persona_id` is written to `conversations` at creation time. Editing a persona later does not rewrite history — existing conversations replay with the original system prompt.

---

## Persona Manager

Thin service layer over the `personas` table:

- CRUD: create, read, update, delete personas
- One persona flagged `is_default = 1` auto-injected into every new conversation
- Personas surfaced in a sidebar panel; can be assigned per-conversation on creation

---

## Setup Wizard

Triggered on first launch; re-accessible from Settings.

**Step 1 — Detection**
Scans `PATH` for `claude`, `gemini`, `opencode`. Displays a checklist. Claude always shows ✅ (bundled).

**Step 2 — Install missing (optional)**
Per-tool "Install" button runs the official install command inside a sandboxed terminal panel embedded in the wizard window. User can skip any tool.

**Step 3 — Auth check**
Runs a lightweight probe per detected tool (`claude --version`, `gemini auth status`, etc.). If auth is missing, shows the auth command with a "Run" button and polls until success before marking the tool Ready.

**Post-wizard:**
User lands in the main chat window with Claude pre-selected. Uninstalled/unauthenticated backends appear grayed out in the backend switcher with an "Add" shortcut back to the wizard.

---

## IPC Channels

| Channel          | Direction       | Payload                              |
|------------------|-----------------|--------------------------------------|
| `chat:send`      | Renderer → Main | `{conversationId, message, backend}` |
| `chat:chunk`     | Main → Renderer | `MessageChunk`                       |
| `chat:done`      | Main → Renderer | `{conversationId, messageId}`        |
| `chat:abort`     | Renderer → Main | `{conversationId}`                   |
| `conv:list`      | Renderer → Main | `{limit, offset}`                    |
| `conv:get`       | Renderer → Main | `{conversationId}`                   |
| `conv:search`    | Renderer → Main | `{query}`                            |
| `persona:list`   | Renderer → Main | —                                    |
| `persona:save`   | Renderer → Main | `Persona`                            |
| `persona:delete` | Renderer → Main | `{id}`                               |
| `backend:list`   | Renderer → Main | —                                    |
| `wizard:probe`   | Renderer → Main | `{backend}`                          |
| `wizard:install` | Renderer → Main | `{backend}`                          |

---

## Tech Stack

| Layer      | Choice                              |
|------------|-------------------------------------|
| App shell  | Electron (latest stable)            |
| Frontend   | React + TypeScript                  |
| Styling    | Tailwind CSS                        |
| IPC typing | manual types in `src/shared/ipc.ts` |
| DB         | `better-sqlite3`                    |
| Build      | `electron-vite`                     |
| Packaging  | `electron-builder` (win + mac)      |

---

## Out of Scope (v1)

- Multi-agent orchestration (multiple backends collaborating on one task)
- File/image attachments
- Plugin system
- Cloud sync of conversations
- Mobile app
