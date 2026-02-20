# Dark Mode + Gold/Olive Premium Theme — Design Doc

**Date:** 2026-02-20
**Status:** Approved

---

## Overview

Restyle Julius with a premium, prestige aesthetic using muted gold and olive green. Add dark mode support toggled from the Settings page, with preference persisted to `localStorage` and applied synchronously on load to prevent flash.

---

## Colour Palette

| Role | Light mode | Dark mode |
|---|---|---|
| Page background | `#F8FAF5` (warm off-white) | `#1E2330` |
| Card surface | `#FFFFFF` | `#252D3D` |
| Card border | `#E5E7EB` | `#2E3A4E` |
| Primary / CTA buttons | `#A89060` gold fill | `#C4A86B` gold fill |
| Header background | `#3B4A2F` (deep olive) | `#141B26` |
| Header text / logo | `#C4A86B` gold | `#C4A86B` gold |
| Body text | `#1E2330` | `#F0EDE4` |
| Muted text | `#6B7A6A` | `#8A9BAA` |
| KPI card gradient | `#3B4A2F` → `#5A6B3F` olive | `#141B26` → `#1E2A1A` |
| KPI number | `#C4A86B` gold | `#C4A86B` gold |
| Active nav icon | `#A89060` | `#C4A86B` |
| Progress bars | `#A89060` | `#C4A86B` |
| Bill badge | olive-tinted bg | muted gold text |
| Danger/overspend | red (unchanged) | red (unchanged) |
| Positive/surplus | green (unchanged) | green (unchanged) |

---

## Dark Mode Strategy

- **Mechanism:** Tailwind `dark:` class variant — add `dark` class to `<html>` element
- **Toggle location:** Settings page, top section "Appearance", gold toggle matching existing bill-toggle style
- **Persistence:** `localStorage` key `julius-theme` = `'dark'` | `'light'`
- **Flash prevention:** Inline `<script>` in `index.html` runs before React hydrates, reads localStorage and sets `document.documentElement.classList` synchronously
- **Tailwind v4:** Uses `@variant dark (&:where(.dark, .dark *))` or the default class strategy — no config changes needed

---

## Component Changes

### `index.html`
- Add inline script before `</head>` to apply `dark` class from localStorage synchronously

### `src/index.css`
- Define CSS custom properties for gold/olive palette
- Add dark mode body background override
- Warm off-white (`#F8FAF5`) as light page background instead of current `#F8FAFC`

### `src/app/Layout.tsx`
- Header: `bg-[#3B4A2F] dark:bg-[#141B26]`
- Logo "Julius": `text-[#C4A86B]` gold
- Nav active state: `text-[#A89060] dark:text-[#C4A86B]` (replaces `text-blue-600`)
- Nav inactive: `text-gray-500 dark:text-[#8A9BAA]`
- Nav container: `bg-white dark:bg-[#1E2330]` with dark border

### `src/pages/dashboard/DashboardPage.tsx`
- KPI card: olive gradient `from-[#3B4A2F] to-[#5A6B3F]` light / `from-[#141B26] to-[#1E2A1A]` dark
- KPI number: `text-[#C4A86B]` gold
- All card surfaces: `bg-white dark:bg-[#252D3D]`
- Progress bars: `bg-[#A89060] dark:bg-[#C4A86B]` (replaces `bg-blue-500`)
- Section headings: `dark:text-[#F0EDE4]`

### `src/pages/budget/BudgetPage.tsx` + `BudgetItemModal.tsx`
- Card surfaces: dark variants
- "Add Item" button: gold (`bg-[#A89060] hover:bg-[#8B7550]`)
- Group header bg: `dark:bg-[#1E2330]`
- Modal: `dark:bg-[#252D3D]`, input focus ring gold

### `src/pages/bills/BillsPage.tsx`
- Bill badge (currently `bg-blue-100 text-blue-700`): `bg-[#F5F0E8] text-[#8B7550] dark:bg-[#2A2215] dark:text-[#C4A86B]`
- Paid checkboxes: gold accent when ticked
- Card dark variants

### `src/pages/timeline/TimelinePage.tsx`
- Timeline dot/marker: gold
- Card dark variants

### `src/pages/transactions/TransactionsPage.tsx`
- Card dark variants
- Category filter active: gold underline/bg

### `src/pages/settings/SettingsPage.tsx`
- Add "Appearance" section at top with Dark Mode toggle
- Toggle matches existing bill-toggle style but uses gold active state
- All modals (GroupModal, CategoryModal, TemplateModal): dark surface variants
- Save/submit buttons: gold

### New: `src/app/ThemeContext.tsx`
- `useTheme()` hook exposing `{ isDark, toggleTheme }`
- Reads from localStorage on init
- On toggle: flips `document.documentElement.classList`, writes to localStorage

---

## Implementation Order

1. Flash-prevention script in `index.html`
2. `ThemeContext` + `useTheme` hook
3. `index.css` — palette variables + dark body bg
4. `Layout.tsx` — header, nav
5. `DashboardPage.tsx` — KPI card, progress bars, cards
6. `SettingsPage.tsx` — Appearance section + dark variants for all modals
7. `BudgetPage.tsx` + `BudgetItemModal.tsx`
8. `BillsPage.tsx`, `TimelinePage.tsx`, `TransactionsPage.tsx`
