# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**BII Agent Harness** — A native Electron desktop chat app (Windows + macOS) that wraps local CLI-based AI backends (Claude Code, Gemini CLI, Opencode) behind a persistent chat UI with conversation history and persona management.

Full design spec: [docs/superpowers/specs/2026-06-17-ai-agent-harness-design.md](docs/superpowers/specs/2026-06-17-ai-agent-harness-design.md)

## Commands

```bash
npm run dev          # Start Electron app in development (electron-vite HMR)
npm run build        # Compile TypeScript + bundle with electron-vite
npm run dist         # Package installer via electron-builder (win/mac)
npm run lint         # ESLint
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```

## Architecture

The app follows a strict main/renderer split — see the design spec for the full diagram.

**Main process** (`src/main/`) owns all side effects: spawning CLI processes, reading/writing SQLite, file system access. It never imports renderer code.

**Renderer process** (`src/renderer/`) is a React app. It communicates with main exclusively via typed IPC channels defined in `src/shared/ipc.ts`. It never calls `child_process`, `fs`, or `better-sqlite3` directly.

**Adapter layer** (`src/main/adapters/`) — one file per CLI backend. Every adapter implements the `BackendAdapter` interface from `src/shared/types.ts`. Adding a new backend = adding one adapter file and registering it in `AdapterManager`.

**ConvStore** (`src/main/store/`) — all SQLite access goes through this module. Schema migrations live in `src/main/store/migrations/`.

## Key Conventions

**IPC:** All channel names and payload types are declared in `src/shared/ipc.ts`. Never use raw string channel names elsewhere — import the constants.

**Adapter contract:** `send()` must return an `AsyncIterable<MessageChunk>`. The caller (IPC handler) drives iteration; adapters must respect `abort()` by terminating the spawned process and ending the iterable.

**Persona injection:** System prompts are injected inside each adapter's `send()` call as a CLI flag. Never concatenate persona text into the user message string.

**State assumptions explicitly.** If a change touches the adapter interface or IPC channel shapes, surface the breaking change before making it — downstream consumers are in a different process.

**Surgical changes.** The main/renderer boundary is load-bearing. Don't move logic across it without updating the IPC layer.
