# Auth Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Use one shared auth UI/logic for both the standalone `/login` page and the homepage modal, and make the homepage navbar emphasize student login.

**Architecture:** Extract a shared `AuthForm` component that owns the mode switch (student/teacher), login submission, error display, and change-password flow. `AuthModal` becomes a thin modal container that renders `AuthForm`. The `/login` page becomes a thin page container that renders the same `AuthForm`.

**Tech Stack:** Next.js App Router, React, Zustand (`useAuthStore`), Tailwind CSS.

---

### Task 1: Create Shared `AuthForm`

**Files:**
- Create: `apps/web/src/components/auth/auth-form.tsx`

**Step 1: Write the failing test**

Create `apps/web/src/components/auth/__tests__/auth-form.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthForm } from "../auth-form";

describe("AuthForm", () => {
  it("switches label/placeholder between student and teacher", () => {
    render(<AuthForm initialEntry="student" />);

    expect(screen.getByText("学号")).toBeTruthy();
    expect(screen.getByPlaceholderText("请输入学号")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test`

Expected: FAIL because `test` script / Vitest config is missing.

**Step 3: Add minimal test harness (only if missing)**

Modify `apps/web/package.json` to add:

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^1.6.0",
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.4.2",
    "jsdom": "^24.0.0"
  }
}
```

Create `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
```

Create `apps/web/vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

**Step 4: Run test to verify it fails for the right reason**

Run: `pnpm -C apps/web test`

Expected: FAIL because `AuthForm` doesn’t exist / doesn’t render label+placeholder.

**Step 5: Implement minimal `AuthForm`**

Create `apps/web/src/components/auth/auth-form.tsx` with:
- Props: `initialEntry?: "student" | "teacher"`, `variant?: "page" | "modal"`, `onSuccess?: () => void`, `onCancel?: () => void`
- Internal state: `entry`, `username`, `password`, `error`, `loading`, `showChangePassword`
- Uses `useAuthStore()` for `login`, `isAuthenticated`, `mustChangePassword`, `user`, `changePassword`
- Redirect logic stays in containers; `AuthForm` calls `onSuccess()` when login completes and password not required (or after change-password success)
- Label/placeholder/hint text computed from `entry`:
  - student: `学号` / `请输入学号`
  - teacher: `工号` / `请输入工号`
- Optional mode switch UI (two buttons) shown in both page and modal.

**Step 6: Run test to verify it passes**

Run: `pnpm -C apps/web test`

Expected: PASS.

---

### Task 2: Refactor Modal to Use `AuthForm`

**Files:**
- Modify: `apps/web/src/components/auth/auth-modal.tsx`

**Step 1: Write the failing test**

Create `apps/web/src/components/auth/__tests__/auth-modal.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthModal } from "../auth-modal";

describe("AuthModal", () => {
  it("renders student label when entry=student", () => {
    render(<AuthModal open={true} onOpenChange={() => {}} entry="student" />);
    expect(screen.getByText("学号")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test`

Expected: FAIL until `AuthModal` uses `AuthForm` consistently.

**Step 3: Minimal refactor**

Update `apps/web/src/components/auth/auth-modal.tsx`:
- Remove duplicated form + change-password content
- Render `<AuthForm initialEntry={entry} variant="modal" onSuccess={...} onCancel={...} />`
- Keep existing close/reset behavior via `onOpenChange(false)`
- Keep redirect logic in `AuthModal` (it already has `redirectByRole`)

**Step 4: Run tests**

Run: `pnpm -C apps/web test`

Expected: PASS.

---

### Task 3: Refactor Standalone `/login` Page to Use `AuthForm`

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`

**Step 1: Write the failing test**

Create `apps/web/src/app/login/__tests__/login-page.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "../page";

describe("/login", () => {
  it("renders shared auth form", () => {
    render(<LoginPage />);
    expect(screen.getByText("学生登录")).toBeTruthy();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm -C apps/web test`

Expected: FAIL until `/login` uses `AuthForm`.

**Step 3: Implement minimal refactor**

Update `apps/web/src/app/login/page.tsx`:
- Remove duplicated login UI and change-password form
- Keep page chrome (card/background) if desired
- Render `<AuthForm variant="page" initialEntry="student" onSuccess={redirectByRole} />`
- Ensure redirectByRole stays in page (it already exists)

**Step 4: Run tests**

Run: `pnpm -C apps/web test`

Expected: PASS.

---

### Task 4: Navbar UI Emphasizes Student Login

**Files:**
- Modify: `apps/web/src/app/page.tsx`

**Step 1: Make the UI change**

Update the navbar buttons so:
- “学生登录” becomes the primary/high-contrast `clay-btn bg-blue-600 text-white`
- “教师入口” becomes secondary (outline / lower emphasis)
- Both keep their existing click handlers, just swap styles.

**Step 2: Manual verify**

Run: `pnpm -C apps/web dev`

Check:
- Navbar right side visually emphasizes student login
- Clicking each opens modal with correct labels/placeholder.

---

### Task 5: Verification

**Step 1: Run lint**

Run: `pnpm -C apps/web lint`

Expected: no new errors introduced.

**Step 2: Run build**

Run: `pnpm -C apps/web build`

Expected: build succeeds.
