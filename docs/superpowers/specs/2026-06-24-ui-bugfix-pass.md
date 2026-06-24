# MyRA UI Bug Fix Pass — Design Spec

**Date:** 2026-06-24
**Status:** Approved

---

## Overview

A comprehensive single-pass fix for 10 confirmed issues across three categories: critical blockers, visual/layout, and feature gaps. All changes are surgical — no new abstractions, no refactors of uninvolved code.

---

## Category 1 — Critical Blockers

### 1a. CSP blocks HTTPS connections

**File:** `src/renderer/index.html`

The `<meta http-equiv="Content-Security-Policy">` tag has `connect-src 'self'`, which blocks all HTTPS fetch calls originating from the renderer process. This prevents direct API calls and can block Electron's internal service tunnels.

**Fix:** Change `connect-src 'self'` to `connect-src 'self' https:`.

```html
<!-- Before -->
connect-src 'self'
<!-- After -->
connect-src 'self' https:
```

---

### 1b. Cron / MCP / Plugins toolbar buttons appear non-functional when sidebar is collapsed

**File:** `src/renderer/App.tsx`

The Cron, MCP, and Plugins toolbar buttons toggle flags that control what is rendered *inside* the Sidebar component. However, when the sidebar is collapsed (`sidebarCollapsed === true`), the sidebar has `w-0` and its contents are invisible. Clicking these buttons updates state but the user sees no change, making them appear broken.

**Fix:** In each button's `onClick` handler, call `setSidebarCollapsed(false)` alongside the existing toggle, so the sidebar expands to reveal the panel.

---

### 1c. Pipeline mode has no empty state

**File:** `src/renderer/App.tsx`

The welcome screen condition is `!activeConvId && mode === 'single'`. When `mode === 'pipeline'` with no active conversation, the app renders `<ChatView conversationId={null} />` — an empty message list with no guidance. Users have no indication of what to do.

**Fix:** Extend the condition to also show an empty state for pipeline mode with no active conversation:

```text
if !activeConvId && mode === 'single'  → show "Welcome to MyRA" empty state
if !activeConvId && mode === 'pipeline' → show "Select a pipeline template above, then send your first message" empty state
```

The single-mode empty state retains its "New conversation" button. The pipeline-mode empty state shows only guidance text ("Select a pipeline template from the toolbar above, then type your first message") — no button, because a conversation is auto-created on first send once a template is selected.

---

## Category 2 — Visual / Layout

### 2a. Sidebar background indistinct from main area

**File:** `src/renderer/components/Sidebar/Sidebar.tsx`

The sidebar uses `bg-gray-50 dark:bg-gray-900` and the main area uses `bg-white dark:bg-gray-950`. In light mode, `gray-50` (#F9FAFB) and `white` (#FFFFFF) are nearly identical and the sidebar has no apparent separation.

**Fix:** Change sidebar background to `bg-gray-100 dark:bg-gray-900`. The `gray-100` (#F3F4F6) provides enough contrast against `white` to visually separate the two panels.

---

### 2b. Sidebar width breakpoints reversed

**File:** `src/renderer/components/Sidebar/Sidebar.tsx`

The expanded sidebar uses `w-64 lg:w-48`. The `lg:` prefix applies at ≥ 1024px, so large (desktop) screens get the *narrower* 192px sidebar, and smaller screens get the *wider* 256px one. This is backwards.

**Fix:** Change to `w-48 lg:w-64` — 192px on mobile/tablet, 256px on desktop.

---

### 2c. Full-height layout broken on Windows

**Files:** `src/renderer/index.html`, `src/renderer/App.tsx`

The outer wrapper uses `min-h-screen`. In an Electron window on Windows, this allows the React tree to grow taller than the window frame, producing a scrollbar on the `<body>` and breaking the `flex-1` height chain inside the app.

**Fixes:**

1. `index.html`: Add `style="height: 100%"` to both `<html>` and `<body>`, and `height: 100%` to `#root`.
2. `App.tsx`: Change the outer wrapper class from `flex min-h-screen` to `flex h-screen overflow-hidden`.

This locks the app to exactly the window height and forces all `flex-1` children to fill correctly without overflow.

---

### 2d. Animation jank on right-side panels (Windows)

**File:** `src/renderer/App.tsx`

The Personas, Pipelines, and Settings panels use `transition-[width]`, which triggers layout reflow on every animation frame. On Windows this produces visible jitter, especially when the panel contains complex content.

**Fix:** Add `style={{ willChange: 'width' }}` to each of the three animated panel wrapper `<div>`s. This promotes the elements to their own compositor layer and eliminates the layout-reflow cost during the transition.

---

## Category 3 — Feature Gaps

### 3a. Persona system prompt not visible in list

**File:** `src/renderer/components/Personas/PersonaPanel.tsx`

Each persona list item shows only the persona name and an optional "default" badge. The system prompt — the primary value of a persona — is invisible until the user clicks Edit. This makes it hard to distinguish between personas.

**Fix:** Add a truncated 1-line preview of `p.systemPrompt` below the persona name in each list item, using `text-xs text-gray-400 truncate`. If `systemPrompt` is empty, show a placeholder: `"No system prompt"`.

---

### 3b. Persona edit form scrolls out of view

**File:** `src/renderer/components/Personas/PersonaPanel.tsx`

When a user clicks Edit on a persona near the bottom of the list, the edit form renders below the fold of the scrollable panel. Nothing appears to happen.

**Fix:** Add a `useRef` attached to the edit form container. When `editing` becomes non-null, call `ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` in a `useEffect`. This ensures the form is always visible when opened.

---

### 3c. Backend list not refreshed after wizard completes

**File:** `src/renderer/hooks/useBackends.ts`, `src/renderer/App.tsx`

`useBackends` calls `listBackends()` once on mount. After the setup wizard runs and installs/probes tools, the backend switcher still shows the stale pre-wizard state.

**Fix:** Add a `refresh` function to the `useBackends` hook return value. Call `refresh()` inside the `onComplete` callback of `<SetupWizard>` in `App.tsx` so the backend list updates immediately after wizard exit.

Since `useBackends` is used in `BackendSwitcher` (not in `App.tsx`), the cleanest approach is to add an optional `refreshTrigger` prop to `BackendSwitcher` and pass a counter from `App.tsx` that increments on wizard completion. Alternatively, lift backend state to `App.tsx` and pass it down.

**Chosen approach:** Add `refreshTrigger?: number` to `useBackends`, defaulting to `0`. When it changes, re-fetch. Pass a counter incremented in `App.tsx`'s `onComplete` down to `BackendSwitcher` → `useBackends`.

---

### 3d. Install log streaming not wired to renderer

**File:** `src/main/ipc.ts`

The main-process `installBackend(id, onData)` function accepts an `onData(line: string)` callback and calls it for each line of npm output. The wizard's `WizardStep2` component listens for `window.ipc.on("wizard:install:line", ...)` to display these lines in a `<pre>` log panel.

The connection between them — `win.webContents.send("wizard:install:line", line)` — must be present in the `WIZARD_INSTALL` IPC handler.

**Fix:** In the `ipcMain.handle(IPC.WIZARD_INSTALL, ...)` handler, pass:

```typescript
(line) => win.webContents.send("wizard:install:line", line)
```

as the `onData` argument to `installBackend`. Also forward the `error` field from the result back to the renderer so `WizardStep2` can display the specific failure reason instead of a generic message.

---

## Files Changed

| File | Change |
| --- | --- |
| `src/renderer/index.html` | CSP `connect-src`, `html/body/root` height |
| `src/renderer/App.tsx` | Outer `h-screen`, pipeline empty state, sidebar auto-expand on Cron/MCP/Plugins, `willChange` on panels, wizard `onComplete` refresh trigger |
| `src/renderer/components/Sidebar/Sidebar.tsx` | Background color, width breakpoints |
| `src/renderer/components/Personas/PersonaPanel.tsx` | System prompt preview, scroll-into-view on edit |
| `src/renderer/hooks/useBackends.ts` | `refreshTrigger` param |
| `src/renderer/components/BackendSwitcher.tsx` | Accept + forward `refreshTrigger` |
| `src/main/ipc.ts` | Wire `win.webContents.send` for install log streaming |

---

## Out of Scope

- Refactoring the IPC type definitions to include `isTemplate`, `variables`, `category` on `PERSONA_SAVE` (these are passed through today and work; typing them is a separate cleanup)
- Animation redesign for right-side panels (replacing width transitions with translateX would require restructuring the layout)
- Wizard re-design (the wizard flow itself is not broken, only the install log streaming needs a wire-up)
