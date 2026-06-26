# CPulse Design Refresh – Clean Modern

**File:** `docs/superpowers/specs/2026-06-26-design-refresh-cpulse.md`

---

### 1️⃣ Visual Direction – “Clean Modern”
| Property | Value | Rationale |
|----------|-------|-----------|
| **Palette** | – **Background**: `#FAFAFA` (light gray)  
– **Surface**: `#FFFFFF` (white)  
– **Accent**: `#4F46E5` (indigo‑600)  
– **Muted**: `#64748B` (slate‑500)  
– **Error**: `#F43F5E` (rose‑600) | Soft, high‑contrast UI that reads well on Windows, aligns with modern system‑utility aesthetic. |
| **Typography** | Primary: **Plus Jakarta Sans** (default Tailwind)  
Headings: `font-semibold` / `text-lg`  
Body: `font-normal` / `text-sm` | Clean, legible, corporate‑friendly. |
| **Elevation** | Subtle `box‑shadow: 0 2px 6px rgba(0,0,0,0.04)` on cards; hover adds `shadow-md`. | Gives depth without clutter. |
| **Border radius** | `0.75rem` (rounded‑lg) on cards, inputs, buttons. | Modern softness. |
| **Motion** | CSS `transition` (150 ms) for hover, focus, active states. No heavy JS animations. | Keeps UI snappy, low CPU. |
| **Dark mode** | Optional – invert palette (`#1F2937` background, `#374151` surface, same accent). | Windows 10/11 dark theme support. |

### 2️⃣ Layout Refactor – Component Tree
```
<App>
 ├─ <Header>                // top bar: app title, clock, settings icon
 ├─ <Sidebar>               // vertical nav + health score widget
 ├─ <MainContent>
 │    └─ <TabPanel>         // renders current tab (Dashboard, Cleaner, …)
 │          ├─ DashboardTab   // refreshed UI (see §3)
 │          ├─ CleanerTab
 │          ├─ BoosterTab
 │          ├─ StartupTab
 │          ├─ PrivacyTab
 │          ├─ DiagnosticsTab
 │          ├─ HistoryTab
 │          └─ SettingsTab
 └─ <NotificationPanel>     // overlay dropdown, triggered from Header
```
*All tabs keep their existing hooks (`useSystemMetrics`, `useJunkScanner`, …) – only UI is updated.*

### 3️⃣ DashboardTab – UI Refresh
| Section | New design | Implementation notes |
|---------|------------|----------------------|
| **Health Score Card** | Single‑line large number (`/100`) with subtle indigo gradient background, rounded corners, minimal text. | Keep `GradientCard` but replace heavy background gradient with flat `linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)`. |
| **Stat Cards (CPU, RAM, Disk, Network)** | 4 equally‑spaced cards, each with tiny icon, label, value, sub‑text. Use `flex` grid (`grid-cols-2 md:grid-cols-4`). Card background = `#FFFFFF`, border = `1px solid #E5E7EB`. | New `StatCard` component (props: icon, label, value, sub, color). |
| **Charts (CPU/RAM History)** | Small area charts inside cards, background = `rgba(79,70,229,0.05)`. Remove large “big number” overlay – keep only chart. | Use existing Recharts but hide the big‑number overlay. |
| **Disk List** | Compact list with progress bar per drive, color‑coded (indigo → amber → rose). Use `flex` rows, truncate long model names. | Same data, new `DiskRow` component. |
| **Quick Actions** | 4 square buttons (`Clean`, `Boost`, `Startup`, `Privacy`) with solid indigo/violet/amber/rose backgrounds, icons centered, label underneath. Hover lifts button (`translateY(-2px)`). | New `QuickActionButton` component handling scanning/cleaning states. |
| **Spacing / Padding** | Card padding `p-4`, grid gap `gap-4`. | Consistent across UI. |

### 4️⃣ Component Library (internal)
| Component | Props | Purpose |
|-----------|-------|---------|
| `Sidebar` | `activeTab`, `onSelectTab` | Nav list + health widget. |
| `Header` | `title`, `onOpenSettings` | Top bar, clock, settings icon. |
| `StatCard` | `icon`, `label`, `value`, `sub`, `color` | Reusable metric card. |
| `DiskRow` | `disk` (object) | Render a drive with progress bar. |
| `QuickActionButton` | `icon`, `label`, `sub`, `color`, `onClick`, `state` | Handles scanning/cleaning states. |
| `NotificationPanel` | `notifications` | Dropdown overlay. |
All components live under `src/app/components/ui/` and use **Tailwind‑styled** class utilities only (no custom CSS files). 

### 5️⃣ Implementation Priorities
| Phase | Tasks | Reason |
|-------|-------|--------|
| **P0 – Core skeleton** | Create `Header`, `Sidebar`, `MainContent` layout; route tab selection; move existing health‑score logic into `Sidebar`. | Gives immediate visual split, reduces `App.tsx` size. |
| **P1 – Dashboard UI** | Build `StatCard`, `DiskRow`, `QuickActionButton`; replace old markup in `DashboardTab`. | Most visible tab, biggest impact on perceived polish. |
| **P2 – Remaining tabs** | Refactor each tab to use shared components where possible (e.g., button style, card style). | Consistency across the app. |
| **P3 – Dark mode toggle** | Add `next-themes` switch (already imported) to `Header`; apply dark‑mode classes. | Optional, but ready for Windows dark theme. |
| **P4 – Minor polish** | Adjust spacing, fix any TypeScript lint warnings, run `pnpm lint:fix`. | Finish clean up. |

### 6️⃣ Non‑Functional Requirements
- **No new dependencies** – use existing Tailwind, Radix UI, Recharts. 
- **Performance** – keep CSS‑only transitions; avoid heavy JS animation. 
- **Accessibility** – all interactive elements have `aria-label`s, visible focus outline. 
- **Responsiveness** – UI collapses to single‑column on < 640 px (mobile view). 

### 7️⃣ Acceptance Checklist
- [ ] `App.tsx` reduced below 300 lines (logic only). 
- [ ] All UI components compile without TypeScript errors. 
- [ ] Visual regression test (storyshots) passes vs. baseline screenshot. 
- [ ] `pnpm lint && pnpm test` succeed. 
- [ ] Dark mode toggle works (optional). 

---

**Next steps (after you confirm this spec):**
1. Write the spec file to the repository (this file). 
2. Self‑review the spec for placeholders, consistency, and scope. 
3. You review the spec in the repo and give final approval. 
4. Invoke `writing-plans` to generate a detailed implementation plan.

Please review the spec in the repository and let me know if any changes are needed before we commit and move to the planning stage.