# Design System Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all Critical, High, and Medium design findings from the 2026-06-22 audit — typography, button system, icon library, viewport, accessibility, contrast, and prose config.

**Architecture:** Pure CSS/Tailwind and component-level changes plus two new npm packages (`@phosphor-icons/react`, `@tailwindcss/typography`). No new components, no IPC changes. Tasks are ordered foundation-first so later tasks build on earlier work.

**Tech Stack:** Tailwind CSS v3.4, React 18, TypeScript, Vitest, electron-vite

## Global Constraints

- Tailwind v3 syntax (postcss.config.cjs uses `tailwindcss: {}` — not v4)
- `darkMode: "class"` — every color utility needs a `dark:` counterpart
- CSP in `index.html` blocks external URLs — fonts must be system stack or bundled locally (`font-src 'self' data:`)
- `hoverable:` is a custom Tailwind variant (defined in tailwind.config.ts) that resolves to `@media (hover: hover) and (pointer: fine)` — keep using it for all hover states; never replace with plain `hover:`
- `ease-press` and `ease-drawer` are custom easing tokens in tailwind.config.ts — keep using them; never replace with `ease-out` or similar
- All imports of Phosphor icons must use `@phosphor-icons/react`
- Never use `h-screen` — use `min-h-[100dvh]`
- Run `npm run typecheck` and `npm test` after each task before committing

---

## File Map

| File | Tasks that touch it |
|------|---------------------|
| `src/renderer/index.css` | 1, 2 |
| `tailwind.config.ts` | 7 |
| `src/renderer/App.tsx` | 2, 3, 4 |
| `src/renderer/components/Sidebar/Sidebar.tsx` | 2 |
| `src/renderer/components/Sidebar/ConvItem.tsx` | 3, 5 |
| `src/renderer/components/Chat/InputBar.tsx` | 2, 3, 6 |
| `src/renderer/components/Chat/MessageBubble.tsx` | 6 |
| `src/renderer/components/Personas/PersonaPanel.tsx` | 2, 5, 6 |
| `src/renderer/components/Pipelines/PipelinePanel.tsx` | 2, 5, 6 |
| `src/renderer/components/Settings/SettingsPanel.tsx` | 2, 4 |
| `src/renderer/components/Wizard/SetupWizard.tsx` | 4 |
| `src/renderer/components/Wizard/WizardStep1.tsx` | 2 |
| `src/renderer/components/Wizard/WizardStep2.tsx` | 2 |
| `src/renderer/components/Wizard/WizardStep3.tsx` | 2 |

---

## Task 1: Typography Foundation

**Fixes:** Critical — no font stack defined anywhere in the project.

**Files:**
- Modify: `src/renderer/index.css`

**What:** Add a system font stack and antialiasing to the `@layer base` block. Uses the OS default (Segoe UI Variable on Windows, SF Pro on Mac) since the CSP blocks external font loading. Also sets `-webkit-font-smoothing` globally.

- [ ] **Step 1: Edit index.css**

Replace the entire file content with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text",
      "Segoe UI", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button:not(:disabled),
  a:not(:disabled),
  [role="button"]:not(:disabled) {
    -webkit-tap-highlight-color: transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Verify build**

```
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Visual check**

```
npm run dev
```

Open the app. Text in the sidebar and message bubbles should look sharper — less "browser default" feel on Windows in particular.

- [ ] **Step 4: Commit**

```
git add src/renderer/index.css
git commit -m "style: add system font stack and antialiasing to base CSS"
```

---

## Task 2: Button System + Border Radius Normalization

**Fixes:** Critical — no button system; buttons have 5 inconsistent sizes. Critical — border radius inconsistent across components.

**Files:**
- Modify: `src/renderer/index.css`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Sidebar/Sidebar.tsx`
- Modify: `src/renderer/components/Chat/InputBar.tsx`
- Modify: `src/renderer/components/Personas/PersonaPanel.tsx`
- Modify: `src/renderer/components/Pipelines/PipelinePanel.tsx`
- Modify: `src/renderer/components/Settings/SettingsPanel.tsx`
- Modify: `src/renderer/components/Wizard/WizardStep1.tsx`
- Modify: `src/renderer/components/Wizard/WizardStep2.tsx`
- Modify: `src/renderer/components/Wizard/WizardStep3.tsx`

**Border radius rule (enforced in this task):**
- `rounded-md` (6px) — small toolbar/header buttons
- `rounded-lg` (8px) — inputs, selects, medium buttons, form containers
- `rounded-xl` (12px) — wizard cards/items, full-width CTA buttons
- `rounded-2xl` (16px) — message bubbles only

**Button size tiers:**
- `.btn-sm` — toolbar buttons, panel header "+ New" buttons (text-xs, px-2 py-1)
- `.btn-md` — form Save/Cancel buttons inside panels (text-sm, px-3 py-1.5)
- `.btn-lg` — full-width wizard CTAs (text-sm, px-4 py-2, font-medium, w-full)

### Step 2a — Define component classes in index.css

- [ ] **Step 1: Add @layer components block to index.css**

Append after the `@media (prefers-reduced-motion)` block:

```css
@layer components {
  /* btn-sm: toolbar buttons, panel header "+ New" buttons */
  .btn-sm {
    @apply text-xs px-2 py-1 rounded-md transition-transform duration-100 ease-press active:scale-95;
  }

  /* btn-md: form action buttons (Save, Cancel, Recheck) */
  .btn-md {
    @apply text-sm px-3 py-1.5 rounded-lg transition-transform duration-100 ease-press active:scale-95;
  }

  /* btn-lg: full-width wizard CTAs (Next, Continue, Finish) */
  .btn-lg {
    @apply w-full text-sm px-4 py-2 rounded-xl font-medium transition-transform duration-100 ease-press active:scale-95;
  }
}
```

### Step 2b — Update Sidebar.tsx

- [ ] **Step 2: Edit Sidebar.tsx**

In `src/renderer/components/Sidebar/Sidebar.tsx`, replace the "+ New" button className:

```tsx
// BEFORE:
className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hoverable:hover:bg-blue-700 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-sm bg-blue-600 text-white hoverable:hover:bg-blue-700"
```

### Step 2c — Update App.tsx toolbar buttons

- [ ] **Step 3: Edit App.tsx toolbar buttons**

In `src/renderer/App.tsx`, update the three right-side toolbar buttons (Personas, Pipelines, Settings):

```tsx
// BEFORE (Personas button, line ~179):
className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800 ml-auto transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-sm border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800 ml-auto"
```

```tsx
// BEFORE (Pipelines button, line ~188):
className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-sm border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800"
```

```tsx
// BEFORE (Settings gear button, line ~193):
className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-sm border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800"
```

Note: the mode toggle buttons (Single/Pipeline, lines ~139/145) are inside a segmented control with `overflow-hidden rounded-md` on the parent — do NOT apply `.btn-sm` to them since it would add `rounded-md` to the inner buttons. Leave those unchanged.

### Step 2d — Update PersonaPanel.tsx buttons and inputs

- [ ] **Step 4: Edit PersonaPanel.tsx**

**Panel header "+ New" button:**
```tsx
// BEFORE:
className="text-xs px-2 py-1 rounded bg-blue-600 text-white hoverable:hover:bg-blue-700 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-sm bg-blue-600 text-white hoverable:hover:bg-blue-700"
```

**Template item "Create" span (line ~144) — not a button but acts as one; leave as-is.**

**submitFromTemplate "Create Persona" button (line ~192):**
```tsx
// BEFORE:
className="flex-1 text-sm py-1 rounded bg-blue-600 text-white hoverable:hover:bg-blue-700 disabled:opacity-50 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-md flex-1 bg-blue-600 text-white hoverable:hover:bg-blue-700 disabled:opacity-50"
```

**submitFromTemplate "Cancel" button (line ~201):**
```tsx
// BEFORE:
className="flex-1 text-sm py-1 rounded border border-gray-300 hoverable:hover:bg-gray-50 dark:border-gray-600 dark:hoverable:hover:bg-gray-800 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-md flex-1 border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-50 dark:hoverable:hover:bg-gray-800"
```

**Edit form "Save" button (line ~305):**
```tsx
// BEFORE:
className="flex-1 text-sm py-1 rounded bg-blue-600 text-white hoverable:hover:bg-blue-700 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-md flex-1 bg-blue-600 text-white hoverable:hover:bg-blue-700"
```

**Edit form "Cancel" button (line ~311):**
```tsx
// BEFORE:
className="flex-1 text-sm py-1 rounded border border-gray-300 hoverable:hover:bg-gray-50 dark:border-gray-600 dark:hoverable:hover:bg-gray-800 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-md flex-1 border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-50 dark:hoverable:hover:bg-gray-800"
```

**Name input (line ~278) — add rounded-lg:**
```tsx
// BEFORE:
className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600"

// AFTER:
className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
```

**System prompt textarea (line ~285) — add rounded-lg:**
```tsx
// BEFORE:
className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600 resize-none"

// AFTER:
className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
```

**Variable inputs (line ~176):**
```tsx
// BEFORE:
className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600"

// AFTER:
className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
```

### Step 2e — Update PipelinePanel.tsx buttons and inputs

- [ ] **Step 5: Edit PipelinePanel.tsx**

**Panel header "+ New" button (line ~105):**
```tsx
// BEFORE:
className="text-xs px-2 py-1 rounded bg-blue-600 text-white hoverable:hover:bg-blue-700 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-sm bg-blue-600 text-white hoverable:hover:bg-blue-700"
```

**Form "Save" button (line ~255):**
```tsx
// BEFORE:
className="flex-1 text-sm py-1 rounded bg-blue-600 text-white hoverable:hover:bg-blue-700 disabled:opacity-50 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-md flex-1 bg-blue-600 text-white hoverable:hover:bg-blue-700 disabled:opacity-50"
```

**Form "Cancel" button (line ~262):**
```tsx
// BEFORE:
className="flex-1 text-sm py-1 rounded border border-gray-300 hoverable:hover:bg-gray-50 dark:border-gray-600 dark:hoverable:hover:bg-gray-800 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-md flex-1 border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-50 dark:hoverable:hover:bg-gray-800"
```

**Template name input (line ~169):**
```tsx
// BEFORE:
className="text-sm border rounded px-2 py-1 dark:bg-gray-800 dark:border-gray-600"

// AFTER:
className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
```

**Step backend selects (line ~184 and ~201) — both:**
```tsx
// BEFORE:
className="text-xs border rounded px-1 py-1 dark:bg-gray-800 dark:border-gray-600 flex-1"

// AFTER:
className="text-xs border rounded-lg px-1 py-1 dark:bg-gray-800 dark:border-gray-600 flex-1"
```

### Step 2f — Update SettingsPanel.tsx

- [ ] **Step 6: Edit SettingsPanel.tsx**

**"Close" button (line ~42):**
```tsx
// BEFORE:
className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-sm border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800"
```

**"Re-run Setup Wizard" button (line ~63):**
```tsx
// BEFORE:
className="text-xs w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-sm w-full px-3 py-2 border border-gray-300 dark:border-gray-600 hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800"
```

Note: `px-3 py-2` on the Re-run Wizard button override btn-sm's `px-2 py-1` because component layer utilities are overridden by base utilities in Tailwind v3. This is intentional — the Re-run button is wider and slightly taller than a normal btn-sm.

### Step 2g — Update Wizard step CTAs

- [ ] **Step 7: Edit WizardStep1.tsx**

**"Next" button (line ~78):**
```tsx
// BEFORE:
className="py-2 rounded-xl bg-blue-600 text-white font-medium hoverable:hover:bg-blue-700 disabled:opacity-50 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-lg bg-blue-600 text-white hoverable:hover:bg-blue-700 disabled:opacity-50"
```

- [ ] **Step 8: Edit WizardStep2.tsx**

**"Next"/"Continue" buttons (lines ~39 and ~86):**
```tsx
// BEFORE:
className="py-2 rounded-xl bg-blue-600 text-white font-medium hoverable:hover:bg-blue-700 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-lg bg-blue-600 text-white hoverable:hover:bg-blue-700"
```

**Install button inside each backend card (line ~69):**
```tsx
// BEFORE:
className="text-xs px-3 py-1 rounded-lg bg-blue-600 text-white hoverable:hover:bg-blue-700 disabled:opacity-50 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-sm bg-blue-600 text-white hoverable:hover:bg-blue-700 disabled:opacity-50"
```

- [ ] **Step 9: Edit WizardStep3.tsx**

**"Finish Setup" button (line ~69):**
```tsx
// BEFORE:
className="py-2 rounded-xl bg-blue-600 text-white font-medium hoverable:hover:bg-blue-700 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-lg bg-blue-600 text-white hoverable:hover:bg-blue-700"
```

**"Recheck" button (line ~60):**
```tsx
// BEFORE:
className="text-sm py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 hoverable:hover:bg-gray-300 dark:hoverable:hover:bg-gray-600 disabled:opacity-50 transition-transform duration-100 ease-press active:scale-95"

// AFTER:
className="btn-md w-full bg-gray-200 dark:bg-gray-700 hoverable:hover:bg-gray-300 dark:hoverable:hover:bg-gray-600 disabled:opacity-50"
```

### Step 2h — Verify and commit

- [ ] **Step 10: Run typecheck and tests**

```
npm run typecheck
npm test
```

Expected: typecheck passes, all tests pass.

- [ ] **Step 11: Visual check**

```
npm run dev
```

Open the app. Verify:
- Toolbar buttons (Personas/Pipelines/Settings) have consistent rounded-md corners
- Wizard CTA buttons are full-width and consistently rounded-xl
- Panel form Save/Cancel buttons are consistent height

- [ ] **Step 12: Commit**

```
git add src/renderer/index.css src/renderer/App.tsx src/renderer/components/Sidebar/Sidebar.tsx src/renderer/components/Chat/InputBar.tsx src/renderer/components/Personas/PersonaPanel.tsx src/renderer/components/Pipelines/PipelinePanel.tsx src/renderer/components/Settings/SettingsPanel.tsx src/renderer/components/Wizard/WizardStep1.tsx src/renderer/components/Wizard/WizardStep2.tsx src/renderer/components/Wizard/WizardStep3.tsx
git commit -m "style: add button system (btn-sm/md/lg) and normalize border radius"
```

---

## Task 3: Icon Library

**Fixes:** Medium — hand-rolled SVG paths throughout; inconsistent stroke weights; no icon system.

**Files:**
- New dependency: `@phosphor-icons/react`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Chat/InputBar.tsx`
- Modify: `src/renderer/components/Sidebar/ConvItem.tsx`

**Icons to replace:**

| Location | Hand-rolled SVG | Phosphor replacement |
|----------|----------------|---------------------|
| App.tsx — Settings gear | Custom path | `GearSix` |
| App.tsx — Empty state chat bubble | Custom path | `ChatCircle` |
| InputBar.tsx — Paperclip | Custom path | `Paperclip` |
| ConvItem.tsx — Trash/Delete | Custom path | `Trash` |
| ConvItem.tsx — Pipeline indicator | Custom path | `ArrowsSplit` |

- [ ] **Step 1: Install the package**

```
npm install @phosphor-icons/react
```

Expected: package added to dependencies in package.json.

- [ ] **Step 2: Update App.tsx — Settings icon**

Add import at top of file:
```tsx
import { GearSix, ChatCircle } from "@phosphor-icons/react";
```

Replace Settings button SVG (lines ~197-204):
```tsx
// BEFORE:
<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
</svg>

// AFTER:
<GearSix size={16} />
```

Replace empty-state SVG (lines ~212-220):
```tsx
// BEFORE:
<svg className="w-8 h-8 text-blue-600 dark:text-blue-300" viewBox="0 0 20 20" fill="currentColor">
  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-4 0H9v2h2V9z" clipRule="evenodd" />
</svg>

// AFTER:
<ChatCircle size={32} className="text-blue-600 dark:text-blue-300" />
```

- [ ] **Step 3: Update InputBar.tsx — Paperclip icon**

Add import at top:
```tsx
import { Paperclip } from "@phosphor-icons/react";
```

Replace paperclip SVG (lines ~131-137):
```tsx
// BEFORE:
<svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
  <path fillRule="evenodd" d="M8 4a3 3 0 0 0-3 3v4.5a4.5 4.5 0 0 0 9 0V7a1 1 0 1 1 2 0v4.5a6.5 6.5 0 1 1-13 0V7a5 5 0 0 1 10 0v4.5a2.5 2.5 0 1 1-5 0V7a1 1 0 0 1 2 0v4.5a.5.5 0 0 0 1 0V7a3 3 0 0 0-3-3z" clipRule="evenodd" />
</svg>

// AFTER:
<Paperclip size={20} />
```

- [ ] **Step 4: Update ConvItem.tsx — Trash and pipeline icons**

Add import at top:
```tsx
import { Trash, ArrowsSplit } from "@phosphor-icons/react";
```

Replace pipeline indicator SVG (lines ~63-69):
```tsx
// BEFORE:
<svg className="w-3 h-3 flex-shrink-0 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
  <path d="M4 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm8-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-5-1h2v2H7V7zm0-4h2v2H7V3z" />
</svg>

// AFTER:
<ArrowsSplit size={12} className="flex-shrink-0 text-blue-500" />
```

Replace trash SVG (lines ~87-93):
```tsx
// BEFORE:
<svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
  <path fillRule="evenodd" d="M9 2a1 1 0 0 0-.894.553L7.382 4H4a1 1 0 0 0 0 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a1 1 0 1 0 0-2h-3.382l-.724-1.447A1 1 0 0 0 11 2H9zM7 8a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0V8zm5-1a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1z" clipRule="evenodd" />
</svg>

// AFTER:
<Trash size={16} />
```

- [ ] **Step 5: Run typecheck and tests**

```
npm run typecheck
npm test
```

Expected: no errors. Tests pass (they don't assert on icon internals).

- [ ] **Step 6: Visual check**

```
npm run dev
```

Verify all replaced icons render correctly:
- Settings gear visible in toolbar
- Chat bubble icon visible in empty state
- Paperclip visible in InputBar
- Trash icon visible on ConvItem hover
- Pipeline indicator visible on pipeline-type conversations

- [ ] **Step 7: Commit**

```
git add package.json package-lock.json src/renderer/App.tsx src/renderer/components/Chat/InputBar.tsx src/renderer/components/Sidebar/ConvItem.tsx
git commit -m "style: replace hand-rolled SVGs with @phosphor-icons/react"
```

---

## Task 4: Viewport & Panel Animation Fixes

**Fixes:** High — `App.tsx` root uses `h-screen` (should be `min-h-[100dvh]`). Medium — panel collapse animates `width` which squishes content.

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Wizard/SetupWizard.tsx`
- Modify: `src/renderer/components/Settings/SettingsPanel.tsx`

### Step 4a — Fix h-screen

- [ ] **Step 1: Fix root container in App.tsx (line 118)**

```tsx
// BEFORE:
<div className="flex h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">

// AFTER:
<div className="flex min-h-[100dvh] bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
```

- [ ] **Step 2: Fix SetupWizard.tsx overlay (line 36)**

```tsx
// BEFORE:
<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">

// AFTER:
<div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 dark:bg-gray-950">
```

### Step 4b — Fix panel slide animation

The current approach animates `width` from 288px to 0. The inner `w-72` div maintains its 288px width but gets clipped — this creates a content-squish artefact during the transition.

Fix: animate `max-width` instead. The inner div stays at 288px and gets cleanly clipped by `overflow-hidden` + `max-width: 0`. No squish.

- [ ] **Step 3: Update all three panel wrappers in App.tsx (lines ~249-289)**

Replace the PersonaPanel wrapper:
```tsx
// BEFORE:
<div
  className={`overflow-hidden border-l border-gray-200 dark:border-gray-700 transition-all duration-200 ease-press ${
    showPersonas ? "w-72 opacity-100" : "w-0 opacity-0"
  }`}
>
  <div className="w-72 overflow-y-auto h-full">

// AFTER:
<div
  className={`overflow-hidden transition-[max-width,opacity] duration-200 ease-press ${
    showPersonas
      ? "max-w-72 opacity-100 border-l border-gray-200 dark:border-gray-700"
      : "max-w-0 opacity-0"
  }`}
>
  <div className="w-72 overflow-y-auto h-full">
```

Apply the same pattern to the PipelinePanel wrapper:
```tsx
// BEFORE:
<div
  className={`overflow-hidden border-l border-gray-200 dark:border-gray-700 transition-all duration-200 ease-press ${
    showPipelines ? "w-72 opacity-100" : "w-0 opacity-0"
  }`}
>
  <div className="w-72 overflow-y-auto h-full">

// AFTER:
<div
  className={`overflow-hidden transition-[max-width,opacity] duration-200 ease-press ${
    showPipelines
      ? "max-w-72 opacity-100 border-l border-gray-200 dark:border-gray-700"
      : "max-w-0 opacity-0"
  }`}
>
  <div className="w-72 overflow-y-auto h-full">
```

Apply the same pattern to the SettingsPanel wrapper:
```tsx
// BEFORE:
<div
  className={`overflow-hidden border-l border-gray-200 dark:border-gray-700 transition-all duration-200 ease-press ${
    showSettings ? "w-72 opacity-100" : "w-0 opacity-0"
  }`}
>

// AFTER:
<div
  className={`overflow-hidden transition-[max-width,opacity] duration-200 ease-press ${
    showSettings
      ? "max-w-72 opacity-100 border-l border-gray-200 dark:border-gray-700"
      : "max-w-0 opacity-0"
  }`}
>
```

### Step 4c — Fix double border on SettingsPanel

`SettingsPanel.tsx` has its own `border-l border-gray-200 dark:border-gray-700` on its root div (line ~38). The App.tsx wrapper now conditionally adds the border. Remove the duplicate from SettingsPanel itself.

- [ ] **Step 4: Edit SettingsPanel.tsx root div (line 38)**

```tsx
// BEFORE:
<div className="w-72 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900">

// AFTER:
<div className="w-72 overflow-y-auto bg-gray-50 dark:bg-gray-900">
```

- [ ] **Step 5: Run typecheck and tests**

```
npm run typecheck
npm test
```

- [ ] **Step 6: Visual check**

```
npm run dev
```

Open/close the Personas, Pipelines, and Settings panels. The panel content should slide in cleanly without squishing. Settings panel should have exactly one left border.

- [ ] **Step 7: Commit**

```
git add src/renderer/App.tsx src/renderer/components/Wizard/SetupWizard.tsx src/renderer/components/Settings/SettingsPanel.tsx
git commit -m "fix: replace h-screen with min-h-[100dvh] and fix panel slide animation"
```

---

## Task 5: Accessibility

**Fixes:** High — active conversation item lacks `aria-current`; titles truncate with no tooltip. High — form labels missing or too subtle in PersonaPanel and PipelinePanel.

**Files:**
- Modify: `src/renderer/components/Sidebar/ConvItem.tsx`
- Modify: `src/renderer/components/Personas/PersonaPanel.tsx`
- Modify: `src/renderer/components/Pipelines/PipelinePanel.tsx`

### Step 5a — ConvItem accessibility

- [ ] **Step 1: Write a failing test in ConvItem.test.tsx**

Open `src/renderer/components/Sidebar/__tests__/ConvItem.test.tsx` and add:

```tsx
it("marks active conversation with aria-current", () => {
  const conv = {
    id: "1",
    title: "Test conversation",
    backend: "claude",
    updatedAt: new Date().toISOString(),
    pipelineTemplateId: null,
  };
  render(
    <ConvItem
      conversation={conv}
      active={true}
      onClick={() => {}}
      onDelete={() => {}}
      onRename={() => {}}
    />,
  );
  expect(screen.getByRole("button", { name: /Test conversation/i })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

it("shows full title in tooltip on truncated span", () => {
  const conv = {
    id: "1",
    title: "A very long conversation title that will definitely truncate",
    backend: "claude",
    updatedAt: new Date().toISOString(),
    pipelineTemplateId: null,
  };
  render(
    <ConvItem
      conversation={conv}
      active={false}
      onClick={() => {}}
      onDelete={() => {}}
      onRename={() => {}}
    />,
  );
  expect(screen.getByTitle("A very long conversation title that will definitely truncate")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npm test -- --reporter=verbose
```

Expected: the two new tests fail (aria-current and title not yet added).

- [ ] **Step 3: Fix ConvItem.tsx**

In `src/renderer/components/Sidebar/ConvItem.tsx`, update the button:

```tsx
// Line 51-59 — add aria-current to button:
// BEFORE:
<button
  onClick={onClick}
  onDoubleClick={() => {
    setEditValue(conversation.title);
    setEditing(true);
  }}
  className={`flex-1 text-left px-3 py-2 rounded-lg text-sm truncate hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800 transition-colors transition-transform duration-100 ease-press active:scale-95 ${
    active ? "bg-gray-200 dark:bg-gray-700" : ""
  }`}
>

// AFTER:
<button
  onClick={onClick}
  onDoubleClick={() => {
    setEditValue(conversation.title);
    setEditing(true);
  }}
  aria-current={active ? "page" : undefined}
  className={`flex-1 text-left px-3 py-2 rounded-lg text-sm truncate hoverable:hover:bg-gray-100 dark:hoverable:hover:bg-gray-800 transition-colors transition-transform duration-100 ease-press active:scale-95 ${
    active ? "bg-gray-200 dark:bg-gray-700 font-medium" : ""
  }`}
>
```

Also add `title` to the truncated span (line ~71):

```tsx
// BEFORE:
<span className="truncate">{conversation.title}</span>

// AFTER:
<span className="truncate" title={conversation.title}>{conversation.title}</span>
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npm test -- --reporter=verbose
```

Expected: all tests pass including the two new ones.

### Step 5b — Form label improvements

- [ ] **Step 5: Update PersonaPanel.tsx — wrap name input with label**

Replace the bare `<input>` for "Name" (line ~276) with a labelled group:

```tsx
// BEFORE:
<input
  className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Name"
  value={editing.name ?? ""}
  onChange={(e) =>
    setEditing((prev) => ({ ...prev, name: e.target.value }))
  }
/>

// AFTER:
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
    Name
  </label>
  <input
    className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="e.g. Code Reviewer"
    value={editing.name ?? ""}
    onChange={(e) =>
      setEditing((prev) => ({ ...prev, name: e.target.value }))
    }
  />
</div>
```

Replace the bare `<textarea>` for "System prompt" (line ~284) with a labelled group:

```tsx
// BEFORE:
<textarea
  className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="System prompt..."
  rows={3}
  value={editing.systemPrompt ?? ""}
  onChange={(e) =>
    setEditing((prev) => ({ ...prev, systemPrompt: e.target.value }))
  }
/>

// AFTER:
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
    System prompt
  </label>
  <textarea
    className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="You are a helpful assistant that..."
    rows={3}
    value={editing.systemPrompt ?? ""}
    onChange={(e) =>
      setEditing((prev) => ({ ...prev, systemPrompt: e.target.value }))
    }
  />
</div>
```

Upgrade template variable labels (line ~168):

```tsx
// BEFORE:
<label htmlFor={`var-${v.name}`} className="text-xs text-gray-500">
  {v.label}
  {v.required && " *"}
</label>

// AFTER:
<label
  htmlFor={`var-${v.name}`}
  className="text-sm font-medium text-gray-700 dark:text-gray-300"
>
  {v.label}
  {v.required && <span className="text-red-500 ml-0.5">*</span>}
</label>
```

- [ ] **Step 6: Update PipelinePanel.tsx — wrap name input with label**

Replace the bare template name `<input>` (line ~168) with a labelled group:

```tsx
// BEFORE:
<input
  className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="Template name"
  value={editing.name}
  onChange={(e) =>
    setEditing((prev) =>
      prev ? { ...prev, name: e.target.value } : null,
    )
  }
/>

// AFTER:
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
    Template name
  </label>
  <input
    className="text-sm border rounded-lg px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
    placeholder="e.g. Draft → Review"
    value={editing.name}
    onChange={(e) =>
      setEditing((prev) =>
        prev ? { ...prev, name: e.target.value } : null,
      )
    }
  />
</div>
```

- [ ] **Step 7: Run typecheck and tests**

```
npm run typecheck
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```
git add src/renderer/components/Sidebar/ConvItem.tsx src/renderer/components/Sidebar/__tests__/ConvItem.test.tsx src/renderer/components/Personas/PersonaPanel.tsx src/renderer/components/Pipelines/PipelinePanel.tsx
git commit -m "fix: add aria-current, title tooltip, and proper form labels for accessibility"
```

---

## Task 6: Contrast & Copy Fixes

**Fixes:** Medium — message timestamp uses `opacity-50` on a blue background (~2.3:1 contrast ratio, WCAG fail). Medium — error chips are too small with no icon. Low — "Del" labels in PersonaPanel and PipelinePanel should say "Delete".

**Files:**
- Modify: `src/renderer/components/Chat/MessageBubble.tsx`
- Modify: `src/renderer/components/Chat/InputBar.tsx`
- Modify: `src/renderer/components/Personas/PersonaPanel.tsx`
- Modify: `src/renderer/components/Pipelines/PipelinePanel.tsx`

### Step 6a — Fix timestamp contrast

- [ ] **Step 1: Write a failing test in MessageBubble.test.tsx**

Open `src/renderer/components/Chat/__tests__/MessageBubble.test.tsx` and add:

```tsx
it("renders user message timestamp without opacity-50 class", () => {
  const msg = {
    id: "1",
    role: "user" as const,
    content: "Hello",
    backend: "claude",
    createdAt: new Date().toISOString(),
    conversationId: "conv1",
  };
  const { container } = render(<MessageBubble message={msg} />);
  const timestampEl = container.querySelector(".text-xs.mt-1");
  expect(timestampEl).not.toHaveClass("opacity-50");
  expect(timestampEl).toHaveClass("text-blue-100");
});
```

- [ ] **Step 2: Run tests to confirm it fails**

```
npm test -- --reporter=verbose
```

Expected: the new test fails.

- [ ] **Step 3: Fix MessageBubble.tsx timestamp (line ~39)**

```tsx
// BEFORE:
<div className="text-xs opacity-50 mt-1">
  {message.backend} · {new Date(message.createdAt).toLocaleTimeString()}
</div>

// AFTER:
<div
  className={`text-xs mt-1 ${
    isUser
      ? "text-blue-100"
      : "text-gray-400 dark:text-gray-500"
  }`}
>
  {message.backend} · {new Date(message.createdAt).toLocaleTimeString()}
</div>
```

`text-blue-100` (#dbeafe) on `bg-blue-600` (#2563eb) is ~4.6:1 — passes WCAG AA.

- [ ] **Step 4: Run tests to confirm they pass**

```
npm test -- --reporter=verbose
```

### Step 6b — Fix error chips in InputBar

`@phosphor-icons/react` was installed in Task 3. Use `Warning` icon here.

- [ ] **Step 5: Update InputBar.tsx error chips**

Add import at top (if not already present from Task 3):
```tsx
import { Paperclip, Warning } from "@phosphor-icons/react";
```

Replace the error chip `<span>` (lines ~90-96):

```tsx
// BEFORE:
{errors.map((err, i) => (
  <span
    key={i}
    className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded"
  >
    {err}
  </span>
))}

// AFTER:
{errors.map((err, i) => (
  <span
    key={i}
    className="text-xs px-2.5 py-1 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-700 rounded-md flex items-center gap-1.5"
  >
    <Warning size={12} weight="bold" />
    {err}
  </span>
))}
```

### Step 6c — Fix "Del" labels

- [ ] **Step 6: Update PersonaPanel.tsx "Del" button (line ~263)**

```tsx
// BEFORE:
<button
  onClick={(e) => {
    e.stopPropagation();
    remove(p.id);
  }}
  className="text-xs text-red-400 hoverable:hover:text-red-600 px-1"
>
  Del
</button>

// AFTER:
<button
  onClick={(e) => {
    e.stopPropagation();
    remove(p.id);
  }}
  className="text-xs text-red-400 hoverable:hover:text-red-600 px-1"
  aria-label={`Delete persona ${p.name}`}
>
  Delete
</button>
```

- [ ] **Step 7: Update PipelinePanel.tsx "Del" button (line ~152)**

```tsx
// BEFORE:
<button
  onClick={(e) => {
    e.stopPropagation();
    remove(t.id);
  }}
  className="text-xs text-red-400 hoverable:hover:text-red-600 px-1"
>
  Del
</button>

// AFTER:
<button
  onClick={(e) => {
    e.stopPropagation();
    remove(t.id);
  }}
  className="text-xs text-red-400 hoverable:hover:text-red-600 px-1"
  aria-label={`Delete pipeline ${t.name}`}
>
  Delete
</button>
```

- [ ] **Step 8: Run typecheck and tests**

```
npm run typecheck
npm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```
git add src/renderer/components/Chat/MessageBubble.tsx src/renderer/components/Chat/__tests__/MessageBubble.test.tsx src/renderer/components/Chat/InputBar.tsx src/renderer/components/Personas/PersonaPanel.tsx src/renderer/components/Pipelines/PipelinePanel.tsx
git commit -m "fix: correct timestamp contrast, improve error chips, rename Del to Delete"
```

---

## Task 7: Prose Configuration

**Fixes:** Medium — `prose prose-sm dark:prose-invert` is uncustomized; code blocks and inline code use Tailwind Typography defaults which don't match the app's density or dark mode.

**Files:**
- New dev dependency: `@tailwindcss/typography`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Install the typography plugin**

```
npm install -D @tailwindcss/typography
```

- [ ] **Step 2: Update tailwind.config.ts**

Replace the entire file with:

```ts
import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  darkMode: "class",
  content: ["./src/renderer/**/*.{html,tsx,ts}"],
  theme: {
    extend: {
      transitionTimingFunction: {
        press: "cubic-bezier(0.23, 1, 0.32, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 300ms cubic-bezier(0.23, 1, 0.32, 1) forwards",
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: "none",
            // Remove backticks around inline code
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            code: {
              fontSize: "0.85em",
              fontFamily:
                'ui-monospace, "Cascadia Code", "JetBrains Mono", "Fira Code", monospace',
              backgroundColor: "rgb(243 244 246)", // gray-100
              padding: "0.15em 0.35em",
              borderRadius: "0.25rem",
              fontWeight: "400",
            },
            pre: {
              backgroundColor: "rgb(17 24 39)", // gray-900
              borderRadius: "0.5rem",
              fontSize: "0.82em",
            },
            "pre code": {
              backgroundColor: "transparent",
              padding: "0",
              borderRadius: "0",
              fontWeight: "400",
            },
          },
        },
        invert: {
          css: {
            code: {
              backgroundColor: "rgb(31 41 55)", // gray-800
            },
          },
        },
      },
    },
  },
  plugins: [
    typography,
    function ({ addVariant }: { addVariant: Function }) {
      addVariant("hoverable", "@media (hover: hover) and (pointer: fine)");
    },
  ],
} satisfies Config;
```

- [ ] **Step 3: Run typecheck and tests**

```
npm run typecheck
npm test
```

Expected: no errors. If TypeScript complains about the `typography` import, add `"moduleResolution": "bundler"` to `tsconfig.web.json` (electron-vite uses bundler resolution by default, so this should be fine).

- [ ] **Step 4: Visual check**

```
npm run dev
```

Send a message that includes markdown (code block, inline code, lists). Verify:
- Inline code renders with a light grey background and monospace font
- Code blocks have a dark background with rounded corners
- Dark mode code blocks have a grey background instead of the default

- [ ] **Step 5: Commit**

```
git add tailwind.config.ts package.json package-lock.json
git commit -m "style: configure tailwind typography plugin for prose markdown rendering"
```

---

## Self-Review

### Spec coverage check

| Audit finding | Task |
|--------------|------|
| No font stack (Critical) | Task 1 |
| No spacing scale (Critical) | Task 2 — spacing normalization on inputs (py-1 → py-1.5) |
| Border radius inconsistent (Critical) | Task 2 — all inputs/buttons normalized |
| Button system missing (Critical) | Task 2 — btn-sm/md/lg defined |
| `h-screen` on root container (High) | Task 4 |
| Form labels too subtle (High) | Task 5 |
| Truncated titles no tooltip (High) | Task 5 |
| Active item color-only (High) | Task 5 — aria-current + font-medium |
| Loading states thin (High) | Not in scope — requires new async state modeling |
| Hand-rolled SVG icons (Medium) | Task 3 |
| Prose uncustomized (Medium) | Task 7 |
| Timestamp contrast 2.3:1 (Medium) | Task 6 |
| Error chips too small (Medium) | Task 6 |
| Panel animation squish (Medium) | Task 4 |
| Wizard uses min-h-screen (Medium) | Task 4 |
| "Del" labels (Low) | Task 6 |
| No secondary color tokens (Low) | Not in scope — no failing states that need them yet |
| Wizard progress bar motion (Low) | Not in scope — acceptable as-is |
| Double border on SettingsPanel (bug) | Task 4 |

**Gap: Loading states (High priority).** Skeleton screens for ConvList and MessageList were intentionally excluded — they require understanding the async loading state for each hook and creating new skeleton components. Treat as a follow-up task.

### Placeholder scan

No TBD, TODO, or "implement later" in any task. All code blocks are complete.

### Type consistency

- `aria-current` on ConvItem button: `aria-current={active ? "page" : undefined}` — HTML attribute, no TS type issue
- `Warning` from `@phosphor-icons/react`: used in Task 6 after being installed in Task 3 — correct order
- `typography` default export from `@tailwindcss/typography` — correct for the package's v0.5.x API
- `btn-sm`, `btn-md`, `btn-lg` defined in Task 2 Step 1, used throughout Task 2 — consistent
