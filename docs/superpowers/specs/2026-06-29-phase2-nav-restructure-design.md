# MyRA Phase 2 — Nav Restructure Design

**Date:** 2026-06-29
**Scope:** Phase 2 of the v0.2.1 issue list. Nav redesign, settings modal, bottom chat controls, default content.
**Approach:** Full restructure — remove top toolbar entirely, consolidate all config into a Settings modal, move conversation controls to chat bottom.

---

## Context

Phase 1 fixed all functional regressions. Phase 2 simplifies the navigation: the top toolbar is removed, the sidebar becomes conversations-only, and all secondary panels (Personas, Pipelines, MCP, Cron, Plugins) move into a single Settings modal. Conversation controls (backend, mode, persona, model) move to a compact bar at the bottom of the chat area.

---

## App Chrome

The top `Toolbar` component is deleted. The root layout becomes a two-column flex row with no header:

```
┌──────────────┬──────────────────────────────────────┐
│  Sidebar     │  MessageList (flex-1)                │
│  (220px)     │                                      │
│  Convs only  │                                      │
│  + Search    │                                      │
│              │  ──────────────────────────────────  │
│              │  BottomBar: backend│mode│persona│model│
│  ──────────  │  InputBar: [📎] [textarea] [↑]      │
│  ⚙ Settings  │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Files affected:**
- Delete: `src/renderer/components/Toolbar/` (entire directory)
- Modify: `src/renderer/App.tsx` — remove toolbar render, toolbar state; add `settingsModalOpen` + `settingsSection` state; render `BottomBar` inside the chat column

---

## BottomBar Component

**New file:** `src/renderer/components/Chat/BottomBar.tsx`

A single compact row rendered between `MessageList` and `InputBar` inside `ChatView`'s parent column.

```tsx
interface BottomBarProps {
  backend: string;
  setBackend: (b: string) => void;
  mode: "single" | "pipeline";
  setMode: (m: "single" | "pipeline") => void;
  personaId: string | null;
  setPersonaId: (id: string | null) => void;
  model: string;
  setModel: (m: string) => void;
  disabled?: boolean; // true while streaming
}
```

Four compact selectors in a row, `overflow-x: auto` for narrow windows:

| Control | Source | Values |
| --- | --- | --- |
| Backend | `BackendSwitcher` list (existing) | claude, gemini, opencode, … |
| Mode | toolbar toggle (existing) | Single, Pipeline |
| Persona | `PersonaPanel` list via IPC `PERSONA_LIST` | None + saved personas |
| Model | `ModelSelector` list via IPC `MODEL_LIST` | per-backend models |

Styling: `btn-sm` height, same border/background as existing toolbar selects. Row gets `border-t border-border` to separate from messages.

`App.tsx` passes the four state pairs as props — the same state it currently maintains for the toolbar. No new IPC channels needed.

---

## Settings Modal

**New file:** `src/renderer/components/Settings/SettingsModal.tsx`

Replaces the slide-out `SettingsPanel` and absorbs `PersonaPanel`, `PipelinePanel`, `CronPanel`, `McpPanel`, and `PluginPanel`.

**Trigger:** ⚙ gear icon in the sidebar footer. `App.tsx` state: `settingsModalOpen: boolean`, `settingsSection: string` (defaults to `"general"`).

**Structure:** Centered overlay with a dimmed backdrop. Two-column layout inside:

```
┌─────────────────────────────────────────────┐
│ Settings                                  ✕ │
├────────────┬────────────────────────────────┤
│ General    │                                │
│ API Keys   │  (section content)             │
│ Proxy      │                                │
│ ─────────  │                                │
│ Personas   │                                │
│ Pipelines  │                                │
│ ─────────  │                                │
│ MCP        │                                │
│ Cron       │                                │
│ Plugins    │                                │
│ ─────────  │                                │
│ Wizard     │                                │
└────────────┴────────────────────────────────┘
```

- **Left nav:** ~140px wide, sticky, list of section names. Active section highlighted.
- **Right content:** Existing panel content, moved as-is. No redesign of individual sections.
- **Sections and their content sources:**

| Section | Current source |
| --- | --- |
| General | Theme dropdown + version display from `SettingsPanel` |
| API Keys | API key rows from `SettingsPanel` |
| Proxy | Proxy fields from `SettingsPanel` |
| Personas | `PersonaPanel` content (list + create/edit) |
| Pipelines | `PipelinePanel` content (list + create/edit) |
| MCP | `McpPanel` content |
| Cron | `CronPanel` content |
| Plugins | `PluginPanel` content |
| Wizard | Re-run Setup Wizard button from `SettingsPanel` |

- **Close:** ✕ button or clicking the backdrop.
- **Deep-linking:** `settingsSection` allows internal code to open the modal to a specific tab (e.g. the wizard probe button opens to "API Keys").

---

## Sidebar Simplification

The sidebar tab system is removed. Sidebar becomes:

```
┌─────────────────┐
│ MyRA      + New │
│ ─────────────── │
│ ⌕ [search…]    │  ← always-visible inline search
│ ─────────────── │
│ Project review  │
│ Debug session   │
│   …             │
│                 │
│ ─────────────── │
│ ⚙ Settings      │  ← footer gear, opens modal
└─────────────────┘
```

**Changes:**
- Remove `CronPanel`, `McpPanel`, `PluginPanel` render from sidebar — they no longer appear here.
- Remove sidebar tab buttons (Cron, MCP, Plugins, Personas, Pipelines).
- Add a persistent inline search input at the top of the conversation list. Typing filters `ConvList` in place. A small icon beside it triggers full-text `SearchPanel` mode for cross-conversation search.
- Add a sidebar footer with the ⚙ gear icon that sets `settingsModalOpen = true`.
- `PersonaPanel` and `PipelinePanel` slide-outs are no longer rendered in `App.tsx`.

**Files affected:**
- Modify: `src/renderer/App.tsx` — remove PersonaPanel, PipelinePanel, CronPanel, McpPanel, PluginPanel renders; add SettingsModal render
- Modify: `src/renderer/components/Sidebar/Sidebar.tsx` (or equivalent) — remove tab buttons, add search input + footer

---

## Default Content Seeding

**File:** `src/main/store/defaults.ts` (new)

Called once at app startup from `src/main/index.ts` (after DB init). Seeds only if the `settings` table has no `defaults_seeded` key — i.e., exactly once ever per installation.

```ts
// pseudocode in defaults.ts
if (!settingStore.get("defaults_seeded")) {
  personaStore.save({ name: "Coder", ... });
  personaStore.save({ name: "Explainer", ... });
  pipelineStore.save({ name: "Draft → Review", steps: [...] });
  settingStore.set("defaults_seeded", "true");
}
```

**Default personas:**

```ts
{ name: "Coder", systemPrompt: "You are an expert software engineer. Be concise, use code blocks, prefer working solutions over explanations.", isDefault: true }
{ name: "Explainer", systemPrompt: "You are a patient teacher. Explain concepts clearly using plain language and examples. Avoid jargon.", isDefault: false }
```

**Default pipeline:**

```ts
{
  name: "Draft → Review",
  steps: [
    { stepOrder: 0, backendId: "claude", personaId: null },
    { stepOrder: 1, backendId: "claude", personaId: null },
  ]
}
```

Seeds exactly once. If the user deletes all personas, they are not re-seeded — they were intentionally removed.

---

## File Map

| File | Change |
| --- | --- |
| `src/renderer/App.tsx` | Remove toolbar state + render; add BottomBar, SettingsModal; simplify sidebar |
| `src/renderer/components/Toolbar/` | Delete entire directory |
| `src/renderer/components/Chat/BottomBar.tsx` | New — backend/mode/persona/model selectors |
| `src/renderer/components/Settings/SettingsModal.tsx` | New — replaces SettingsPanel slide-out + absorbs all panels |
| `src/renderer/components/Settings/SettingsPanel.tsx` | Keep as section components, imported by SettingsModal |
| `src/renderer/components/Sidebar/Sidebar.tsx` | Remove tab buttons; add inline search + gear footer |
| `src/renderer/components/Sidebar/CronPanel.tsx` | No change (content reused in modal) |
| `src/renderer/components/Sidebar/McpPanel.tsx` | No change (content reused in modal) |
| `src/renderer/components/Sidebar/PluginPanel.tsx` | No change (content reused in modal) |
| `src/renderer/components/Personas/PersonaPanel.tsx` | No change (content reused in modal) |
| `src/renderer/components/Pipelines/PipelinePanel.tsx` | No change (content reused in modal) |
| `src/main/store/defaults.ts` | New — seed default personas + pipeline |
| `src/main/index.ts` | Call `seedDefaults()` after DB init |

---

## What This Does NOT Include

- Redesign of individual section content (API key rows, MCP server list, etc.)
- Model-to-persona mapping (future)
- Any new IPC channels
- Responsive/mobile layout changes

---

## Success Criteria

- [ ] No top toolbar visible in the app
- [ ] BottomBar shows backend, mode, persona, and model selectors below the message list
- [ ] Changing any selector in BottomBar takes effect on the next message sent
- [ ] ⚙ gear in sidebar footer opens the Settings modal
- [ ] Settings modal has all 9 sections navigable from the left nav
- [ ] All content from old panels (Personas, Pipelines, MCP, Cron, Plugins) is accessible inside the modal
- [ ] Sidebar shows conversations + inline search + no panel tab buttons
- [ ] On first launch with empty personas table, 2 personas and 1 pipeline are pre-loaded
- [ ] Existing tests pass; BottomBar and SettingsModal have basic render tests
