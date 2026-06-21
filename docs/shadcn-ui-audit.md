# shadcn/ui Component Usage Audit

**Date:** 2026-06-18
**Method:** Repository-wide import search for `components/ui/`, `./ui/`, `@/components`, `@/lib/utils`, `ui/utils` patterns across all `.tsx` and `.ts` files.

## Summary

**48 components installed, 0 actively imported** by any feature, page, or application code.

The entire `src/app/components/ui/` directory is currently orphaned — no component is imported by `App.tsx`, any feature tab, or any other source file outside the `ui/` directory itself.

## Detailed Results

| Component | Size | Status | Imported By |
|-----------|------|--------|-------------|
| accordion.tsx | 2,057 B | ❌ UNUSED | — |
| alert-dialog.tsx | 3,781 B | ❌ UNUSED | — |
| alert.tsx | 1,590 B | ❌ UNUSED | — |
| aspect-ratio.tsx | 282 B | ❌ UNUSED | — |
| avatar.tsx | 1,046 B | ❌ UNUSED | — |
| badge.tsx | 1,591 B | ❌ UNUSED | — |
| breadcrumb.tsx | 2,357 B | ❌ UNUSED | — |
| button.tsx | 2,085 B | ❌ UNUSED | — |
| calendar.tsx | 2,880 B | ❌ UNUSED | — |
| card.tsx | 1,892 B | ❌ UNUSED | — |
| carousel.tsx | 5,524 B | ❌ UNUSED | — |
| chart.tsx | 9,693 B | ❌ UNUSED | — |
| checkbox.tsx | 1,239 B | ❌ UNUSED | — |
| collapsible.tsx | 752 B | ❌ UNUSED | — |
| command.tsx | 4,562 B | ❌ UNUSED | — |
| context-menu.tsx | 8,127 B | ❌ UNUSED | — |
| dialog.tsx | 3,789 B | ❌ UNUSED | — |
| drawer.tsx | 4,071 B | ❌ UNUSED | — |
| dropdown-menu.tsx | 8,175 B | ❌ UNUSED | — |
| form.tsx | 3,701 B | ❌ UNUSED | — |
| hover-card.tsx | 1,522 B | ❌ UNUSED | — |
| input-otp.tsx | 2,256 B | ❌ UNUSED | — |
| input.tsx | 962 B | ❌ UNUSED | — |
| label.tsx | 609 B | ❌ UNUSED | — |
| menubar.tsx | 8,340 B | ❌ UNUSED | — |
| navigation-menu.tsx | 6,625 B | ❌ UNUSED | — |
| pagination.tsx | 2,677 B | ❌ UNUSED | — |
| popover.tsx | 1,634 B | ❌ UNUSED | — |
| progress.tsx | 718 B | ❌ UNUSED | — |
| radio-group.tsx | 1,470 B | ❌ UNUSED | — |
| resizable.tsx | 2,008 B | ❌ UNUSED | — |
| scroll-area.tsx | 1,628 B | ❌ UNUSED | — |
| select.tsx | 6,204 B | ❌ UNUSED | — |
| separator.tsx | 706 B | ❌ UNUSED | — |
| sheet.tsx | 4,093 B | ❌ UNUSED | — |
| sidebar.tsx | 21,531 B | ❌ UNUSED | — |
| skeleton.tsx | 275 B | ❌ UNUSED | — |
| slider.tsx | 1,962 B | ❌ UNUSED | — |
| sonner.tsx | 571 B | ❌ UNUSED | — |
| switch.tsx | 1,176 B | ❌ UNUSED | — |
| table.tsx | 2,362 B | ❌ UNUSED | — |
| tabs.tsx | 1,927 B | ❌ UNUSED | — |
| textarea.tsx | 766 B | ❌ UNUSED | — |
| toggle-group.tsx | 1,910 B | ❌ UNUSED | — |
| toggle.tsx | 1,552 B | ❌ UNUSED | — |
| tooltip.tsx | 1,892 B | ❌ UNUSED | — |
| use-mobile.ts | 576 B | ❌ UNUSED | — |
| utils.ts | 169 B | ❌ UNUSED | — |

**Total size of unused components:** ~133 KB of source code

## Recommendation

Per project policy, no deletions are performed in this audit. However, the following observations are noted:

1. All 48 components are tree-shaken by Vite during production build, so they do **not** affect bundle size.
2. They **do** increase IDE indexing time, slow down TypeScript compilation, and add noise to the source tree.
3. The associated `@radix-ui/*` dependencies in `package.json` (~25 packages) **do** increase `node_modules` size and `npm install` time.
4. These components were likely installed during initial shadcn/ui scaffold and never adopted — the app uses inline Tailwind classes and custom components instead.

### Future Action Items (requires separate approval)
- Consider removing unused radix-ui dependencies from `package.json`
- Consider removing the `ui/` directory entirely if shadcn/ui migration is not planned
- If keeping for future use, document which components are planned for adoption
