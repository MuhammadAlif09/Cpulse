# Design‑Refresh‑CPulse Implementation Plan

> **For agentic workers:** REQUIRED SUB‑SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task‑by‑task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the UI of CPulse to the “Clean Modern” design while improving component decomposition and testability.

**Architecture:** Introduce a thin layout shell (`Header`, `Sidebar`, `MainContent`) and a set of reusable UI primitives (`StatCard`, `DiskRow`, `QuickActionButton`). The Dashboard tab is rebuilt using these primitives; other tabs adopt the same primitives where applicable.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts, Jest/Vitest for tests, Git hooks for CI.

## Global Constraints
- No new dependencies – use existing Tailwind, Radix UI, Recharts only.  
- Follow existing project‑wide lint rules (`eslint-config-prettier`, `prettier`).  
- All new files must be placed under `src/app/components/ui/` or `src/app/components/`.  
- All tests must run with `pnpm test` and achieve 100 % passing.  
- Commits must be atomic and prefixed with conventional‑type (`feat:`, `refactor:`, `test:`).  

---  

### Task 1: Scaffold Layout Shell

**Files:**  
- Create: `src/app/components/Header.tsx`  
- Create: `src/app/components/Sidebar.tsx`  
- Modify: `src/app/App.tsx:720-1000` (remove UI markup, import new layout components)  
- Test: `src/app/components/__tests__/Header.test.tsx`
- Test: `src/app/components/__tests__/Sidebar.test.tsx`

**Interfaces:**  
- Consumes: Existing Radix UI components, Lucide icons.
- Produces: `<Header />` and `<Sidebar />` components for `App.tsx`. `Header` receives `onOpenSettings?: () => void`. `Sidebar` receives `activeTab: string`, `onSelectTab: (tab: string) => void`.  

- [x] **Step 1: Write failing tests for Header and Sidebar**

```tsx
// src/app/components/__tests__/Header.test.tsx
import { render, screen } from "@testing-library/react";
import Header from "../Header";

test("renders app title", () => {
  render(<Header appName="CPulse" appVersion="0.16.3" isAdmin={false} time={new Date()} unreadCount={0} showNotif={false} setShowNotif={() => {}} tab="dashboard" setTab={() => {}} />);
  expect(screen.getByText(/CPulse/i)).toBeInTheDocument();
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `pnpm test src/app/components/__tests__/Header.test.tsx`
Expected: FAIL (Header not defined).

- [x] **Step 3: Write minimal Header implementation**

```tsx
// src/app/components/Header.tsx
import React from "react";

export default function Header({ appName }: any) {
  return (
    <header className="flex items-center justify-between p-4 bg-white shadow">
      <h1 className="text-lg font-semibold">{appName}</h1>
    </header>
  );
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `pnpm test src/app/components/__tests__/Header.test.tsx`
Expected: PASS.

- [x] **Step 5: Extract full Header & Sidebar code from App.tsx into components**
- [x] **Step 6: Update App.tsx to use Header & Sidebar**
- [x] **Step 7: Commit**

```bash
git add src/app/components/Header.tsx src/app/components/Sidebar.tsx src/app/components/__tests__/ src/app/App.tsx
git commit -m "refactor: extract Header and Sidebar from App.tsx into separate components"
```

---

### Task 2: Create Reusable `StatCard` UI Primitive

**Files:**  
- Create: `src/app/components/ui/StatCard.tsx`  
- Create: `src/app/components/ui/__tests__/StatCard.test.tsx`  
- Modify: `src/app/features/DashboardTab.tsx:350-375` (use the new component)

**Interfaces:**  
- Consumes: Tailwind CSS
- Produces: `<StatCard icon={...} label="..." value="..." sub="..." color="..." />`

- [x] **Step 1: Write failing test**
- [x] **Step 2: Run test**
- [x] **Step 3: Write minimal implementation**
- [x] **Step 4: Run test**
- [x] **Step 5: Refactor DashboardTab to use StatCard**
- [x] **Step 6: Commit**

---

### Task 3: Refactor Dashboard Charts (Remove Big‑Number Overlay)

**Files:**  
- Modify: `src/app/features/DashboardTab.tsx:375-495`

**Interfaces:**  
- Consumes: Recharts
- Produces: Cleaner charts without large background numbers.

- [x] **Step 1: Remove `.animate-pulse-subtle` elements from CPU & RAM charts**
- [x] **Step 2: Commit**

---

### Task 4: Create `DiskRow` Primitive

**Files:**  
- Create: `src/app/components/ui/DiskRow.tsx`  
- Create: `src/app/components/ui/__tests__/DiskRow.test.tsx`  
- Modify: `src/app/features/DashboardTab.tsx:495-560`

**Interfaces:**  
- Consumes: HardDrive icon, disk data structure.
- Produces: `<DiskRow disk={disk} />` component.

- [x] **Step 1-6: Standard TDD flow + integration in DashboardTab**

---

### Task 5: Create `QuickActionButton` Primitive

**Files:**  
- Create: `src/app/components/ui/QuickActionButton.tsx`  
- Create: `src/app/components/ui/__tests__/QuickActionButton.test.tsx`  
- Modify: `src/app/features/DashboardTab.tsx:560-650`

**Interfaces:**  
- Consumes: Action state props
- Produces: `<QuickActionButton />` component

- [x] **Step 1-6: Standard TDD flow + integration in DashboardTab**

---

### Task 6: Lint, Format, and Final Verification

**Files:**  
- All modified files

**Interfaces:**  
- Consumes: ESLint, Prettier, Vitest

- [x] **Step 1: Run `pnpm lint`**
- [x] **Step 2: Run `pnpm format`**
- [x] **Step 3: Run `pnpm test`**
- [x] **Step 4: Commit**