# Style Unification (Phase 2) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate remaining hardcoded Tailwind colors/legacy styling in `apps/web` pages and shared components by migrating to shadcn/ui semantic tokens, without changing business logic.

**Architecture:** Keep changes superficial (classnames, token swaps, component wiring). Prefer local, mechanical replacements; avoid refactors that move logic or change data flow.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand.

---

### Task 1: Identify Remaining Hardcoded Colors

**Files:**
- Read/search: `apps/web/src/**/*.{ts,tsx}`

**Step 1: Search for common hardcoded Tailwind colors**

Run:
```bash
cd /home/lin/projects/MyProject/apps/web && rg -n "\b(bg|text|border|ring|from|to)-(gray|slate|zinc|neutral|stone|blue|cyan|sky|indigo|emerald|green|red|amber|yellow|orange)-(50|100|200|300|400|500|600|700|800|900|950)\b" src
```
Expected: list of remaining occurrences.

**Step 2: Search for inline styles that embed colors**

Run:
```bash
cd /home/lin/projects/MyProject/apps/web && rg -n "style=\{\{" src
```
Expected: few occurrences; triage if color-related.

**Step 3: Capture a short hit-list**

Record the top ~5 files with the most hits to tackle first.

---

### Task 2: Migrate Remaining Page-Level Hardcoded Colors

**Files:**
- Modify: the small set of files identified in Task 1

**Step 1: Apply mechanical replacements**

Use these mapping rules where they preserve intent:

- `text-gray-*` / `text-slate-*` -> `text-foreground` (for primary text) or `text-muted-foreground` (for secondary)
- `bg-gray-*` / `bg-slate-*` -> `bg-muted` / `bg-muted/50` / `bg-card` (depending on container semantics)
- `border-gray-*` / `border-slate-*` -> `border-border`
- Accent colors:
  - `bg-blue-*`/`text-blue-*` -> `bg-primary`/`text-primary` (or `text-primary-foreground` when on primary background)
  - `bg-red-*`/`text-red-*` -> `bg-destructive`/`text-destructive`

Keep existing spacing, layout, and component structure.

**Step 2: Replace any `Input label=` usage**

If you find `label=` passed to `Input`, replace with:

```tsx
<div className="grid gap-2">
  <Label htmlFor="...">Label</Label>
  <Input id="..." ... />
</div>
```

**Step 3: Verify**

Run:
```bash
cd /home/lin/projects/MyProject/apps/web && npm run build
```
Expected: build succeeds.

---

### Task 3: Migrate Shared Components With Styling Debt

**Files:**
- Modify: whichever shared components show up in Task 1 (likely `apps/web/src/components/**` or `apps/web/src/components/ui/**`)

**Step 1: Prefer semantic tokens over palette colors**

Keep logic untouched; only adjust classnames.

**Step 2: Verify**

Run:
```bash
cd /home/lin/projects/MyProject/apps/web && npm run build
cd /home/lin/projects/MyProject/apps/web && npx tsc --noEmit
```
Expected: both pass.

---

### Task 4: Reduce the Remaining "High Signal" Lint Warnings (Optional)

**Files:**
- Modify: files reported by build warnings

**Step 1: Remove unused imports**

Delete unused imports that are safe and do not change behavior.

**Step 2: Verify**

Run:
```bash
cd /home/lin/projects/MyProject/apps/web && npm run build
```
Expected: build succeeds.
