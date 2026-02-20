# Dark Mode + Gold/Olive Premium Theme — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle Julius with a muted gold + deep olive premium aesthetic and add a dark mode toggle in Settings that persists across sessions without flash.

**Architecture:** Tailwind `dark:` class variant — the `dark` class on `<html>` controls all dark styles. A `ThemeContext` hook reads/writes `localStorage` and flips the class. An inline script in `index.html` applies the class synchronously before React hydrates to prevent a white flash. All blue accents are replaced with muted gold (`#A89060` / `#C4A86B`) and the header/hero with deep olive (`#3B4A2F`).

**Tech Stack:** React 19, Tailwind CSS v4, localStorage

---

## Colour Reference (use these exact values everywhere)

```
GOLD_MAIN    = #A89060   (buttons, active states in light mode)
GOLD_BRIGHT  = #C4A86B   (buttons in dark mode, KPI number, logo text)
GOLD_DARK    = #8B7550   (hover state for gold buttons)
OLIVE_DEEP   = #3B4A2F   (header bg light)
OLIVE_MID    = #5A6B3F   (header gradient end light)
OLIVE_DARK   = #141B26   (header bg dark)
OLIVE_DARK2  = #1E2A1A   (header gradient end dark)
PAGE_LIGHT   = #F8FAF5   (page bg light — warm off-white)
PAGE_DARK    = #1E2330   (page bg dark — charcoal slate)
CARD_DARK    = #252D3D   (card surface dark)
BORDER_DARK  = #2E3A4E   (card border dark)
TEXT_DARK    = #F0EDE4   (body text dark)
MUTED_LIGHT  = #6B7A6A   (muted text light)
MUTED_DARK   = #8A9BAA   (muted text dark)
```

---

## Task 1: Flash-prevention script + meta update in `index.html`

**Files:**
- Modify: `index.html`

**Step 1: Add inline script and update theme-color meta**

Replace the entire `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#3B4A2F" />
    <meta name="description" content="Julius - Local-first spending tracker PWA" />
    <title>Julius - Spending Tracker</title>
    <script>
      (function () {
        try {
          var theme = localStorage.getItem('julius-theme')
          if (theme === 'dark') {
            document.documentElement.classList.add('dark')
          }
        } catch (e) {}
      })()
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Step 2: Verify dev server still starts**

Run: `npm run dev`
Expected: App loads, no errors in terminal.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add theme flash-prevention script and update meta theme-color to olive"
```

---

## Task 2: Create `ThemeContext`

**Files:**
- Create: `src/app/ThemeContext.tsx` (this file will REPLACE the existing one — the file currently has MonthContext; ThemeContext is a NEW file)

Wait — check: the existing `src/app/MonthContext.tsx` is the month context. We are creating a brand new file `src/app/ThemeContext.tsx`.

**Step 1: Create `src/app/ThemeContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextValue {
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  toggleTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('julius-theme') === 'dark'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('julius-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('julius-theme', 'light')
    }
  }, [isDark])

  function toggleTheme() {
    setIsDark((prev) => !prev)
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
```

**Step 2: Wrap app in `ThemeProvider` in `src/main.tsx`**

Read `src/main.tsx` first. It likely looks like:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

Add the ThemeProvider import and wrap:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './app/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
```

**Step 3: Commit**

```bash
git add src/app/ThemeContext.tsx src/main.tsx
git commit -m "feat: add ThemeContext with localStorage persistence"
```

---

## Task 3: Update `index.css` — palette variables + dark page background

**Files:**
- Modify: `src/index.css`

**Step 1: Replace `src/index.css` with:**

```css
@import "tailwindcss";

:root {
  --gold-main: #A89060;
  --gold-bright: #C4A86B;
  --gold-dark: #8B7550;
  --olive-deep: #3B4A2F;
  --olive-mid: #5A6B3F;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
}

html {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  min-height: 100vh;
  background-color: #F8FAF5;
  color: #1E2330;
}

.dark body {
  background-color: #1E2330;
  color: #F0EDE4;
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
```

**Step 2: Commit**

```bash
git add src/index.css
git commit -m "feat: add gold/olive CSS variables and dark mode body styles"
```

---

## Task 4: Restyle `Layout.tsx` — header + nav

**Files:**
- Modify: `src/app/Layout.tsx`

**Step 1: Replace `src/app/Layout.tsx` with:**

```tsx
import { Outlet, NavLink } from 'react-router-dom'
import { MonthSelector } from './MonthSelector'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: '◈' },
  { to: '/budget', label: 'Budget', icon: '◉' },
  { to: '/bills', label: 'Bills', icon: '◎' },
  { to: '/timeline', label: 'Timeline', icon: '◷' },
  { to: '/transactions', label: 'Spend', icon: '◆' },
  { to: '/settings', label: 'Settings', icon: '◐' },
]

export function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header
        className="sticky top-0 z-50"
        style={{ background: 'linear-gradient(135deg, #3B4A2F 0%, #5A6B3F 100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold tracking-widest uppercase" style={{ color: '#C4A86B' }}>
            Julius
          </h1>
          <MonthSelector />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1A2030] border-t border-gray-200 dark:border-[#2E3A4E] z-50">
        <div className="flex justify-around items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-1 text-xs ${
                  isActive
                    ? 'text-[#A89060] dark:text-[#C4A86B]'
                    : 'text-gray-400 dark:text-[#8A9BAA]'
                }`
              }
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
```

Note: The icons are changed from emoji to unicode geometric symbols for a cleaner premium look. If you prefer the original emoji icons, keep them — just update the colour classes.

**Step 2: Check app in browser — header should be olive green, logo gold**

**Step 3: Commit**

```bash
git add src/app/Layout.tsx
git commit -m "feat: olive green header, gold logo, gold active nav state"
```

---

## Task 5: Update `MonthSelector.tsx` for dark mode

**Files:**
- Modify: `src/app/MonthSelector.tsx`

**Step 1: Read the file first, then add `dark:` variants to any `text-` or `bg-` classes**

The month selector sits in the olive header, so its text should already be visible (white/light). Add `text-[#C4A86B]` or `text-white` to the month text and button arrows. Anything with `bg-white` becomes `bg-white dark:bg-[#252D3D]`. Any dropdowns/modals get the same treatment.

**Step 2: Commit**

```bash
git add src/app/MonthSelector.tsx
git commit -m "feat: dark mode support for MonthSelector"
```

---

## Task 6: Restyle `DashboardPage.tsx`

**Files:**
- Modify: `src/pages/dashboard/DashboardPage.tsx`

**Step 1: Update the KPI card gradient and number colour**

Find this block:
```tsx
<div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-5 text-white shadow-lg">
  <div className="text-sm opacity-80 mb-1">Remaining until payday</div>
  <div className="text-3xl font-bold mb-3">{formatCurrency(remaining)}</div>
```

Replace with:
```tsx
<div
  className="rounded-xl p-5 text-white shadow-lg"
  style={{
    background: 'linear-gradient(135deg, #3B4A2F 0%, #5A6B3F 100%)',
  }}
>
  <div className="text-sm mb-1" style={{ color: '#C4A86B', opacity: 0.9 }}>
    Remaining until payday
  </div>
  <div className="text-3xl font-bold mb-3" style={{ color: '#C4A86B' }}>
    {formatCurrency(remaining)}
  </div>
```

**Step 2: Update all card backgrounds to support dark mode**

Every `className="bg-white rounded-xl p-4 shadow"` becomes:
```tsx
className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow"
```

Every `className="bg-white rounded-xl shadow"` becomes:
```tsx
className="bg-white dark:bg-[#252D3D] rounded-xl shadow"
```

**Step 3: Update text colours**

Every `text-gray-800` heading → `text-gray-800 dark:text-[#F0EDE4]`
Every `text-gray-600` → `text-gray-600 dark:text-[#8A9BAA]`
Every `text-gray-500` → `text-gray-500 dark:text-[#8A9BAA]`

**Step 4: Update progress bars**

Find: `className={`h-2 rounded-full ${actual > planned ? 'bg-red-500' : 'bg-blue-500'}`}`
Replace: `className={`h-2 rounded-full ${actual > planned ? 'bg-red-500' : 'bg-[#A89060] dark:bg-[#C4A86B]'}`}`

Find: `className="mt-1 bg-gray-200 rounded-full h-2"`
Replace: `className="mt-1 bg-gray-200 dark:bg-[#2E3A4E] rounded-full h-2"`

**Step 5: Update border dividers**

Find: `className="flex justify-between border-t pt-2"`
Replace: `className="flex justify-between border-t dark:border-[#2E3A4E] pt-2"`

Find: `className="border-b last:border-0 pb-2 last:pb-0"`
Replace: `className="border-b dark:border-[#2E3A4E] last:border-0 pb-2 last:pb-0"`

**Step 6: Update loading state**

Find: `<div className="text-gray-500">Loading...</div>`
Replace: `<div className="text-gray-500 dark:text-[#8A9BAA]">Loading...</div>`

**Step 7: Update empty state card**

```tsx
<div className="bg-white dark:bg-[#252D3D] rounded-xl p-6 shadow text-center">
  ...
  <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-2">Get Started!</h3>
  <p className="text-gray-600 dark:text-[#8A9BAA] text-sm">
```

**Step 8: Update money leaks card**

```tsx
<div className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow">
  <h2 className="text-lg font-semibold mb-3 text-red-600">Money Leaks</h2>
  ...
  <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
```

**Step 9: Commit**

```bash
git add src/pages/dashboard/DashboardPage.tsx
git commit -m "feat: olive KPI gradient, gold numbers, dark mode dashboard cards"
```

---

## Task 7: Add dark mode toggle to `SettingsPage.tsx`

**Files:**
- Modify: `src/pages/settings/SettingsPage.tsx`

**Step 1: Add `useTheme` import at the top**

```tsx
import { useTheme } from '../../app/ThemeContext'
```

**Step 2: Call the hook inside `SettingsPage`**

```tsx
const { isDark, toggleTheme } = useTheme()
```

**Step 3: Add an Appearance section ABOVE the Budget Settings card**

```tsx
{/* Appearance */}
<div className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4">
  <h2 className="text-lg font-semibold text-gray-800 dark:text-[#F0EDE4] mb-4">Appearance</h2>
  <div className="flex items-center justify-between py-2">
    <div>
      <label className="font-medium text-gray-700 dark:text-[#F0EDE4]">Dark Mode</label>
      <p className="text-xs text-gray-500 dark:text-[#8A9BAA]">Switch to a darker theme</p>
    </div>
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative w-12 h-6 rounded-full transition-colors ${
        isDark ? 'bg-[#A89060]' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
          isDark ? 'translate-x-6' : ''
        }`}
      />
    </button>
  </div>
</div>
```

**Step 4: Update all card backgrounds in SettingsPage**

Find every: `className="bg-white rounded-xl shadow p-4"`
Replace with: `className="bg-white dark:bg-[#252D3D] rounded-xl shadow p-4"`

Find every: `className="bg-white rounded-xl shadow"`
Replace with: `className="bg-white dark:bg-[#252D3D] rounded-xl shadow"`

**Step 5: Update headings and text**

Every `text-gray-800` → `text-gray-800 dark:text-[#F0EDE4]`
Every `text-gray-700` → `text-gray-700 dark:text-[#F0EDE4]`
Every `text-gray-600` → `text-gray-600 dark:text-[#8A9BAA]`
Every `text-gray-500` → `text-gray-500 dark:text-[#8A9BAA]`
Every `text-gray-400` → `text-gray-400 dark:text-[#8A9BAA]`

**Step 6: Update inputs in SettingsPage**

Every:
```tsx
className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
```
Replace with:
```tsx
className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4] focus:ring-2 focus:ring-[#A89060]"
```

**Step 7: Update Save Settings button and all Add/Edit/blue buttons in SettingsPage**

Every: `className="... bg-blue-600 text-white rounded-lg hover:bg-blue-700"`
Replace with: `className="... bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550]"`

Every: `className="text-blue-600 hover:text-blue-800 text-sm font-medium"` (the inline Add links)
Replace with: `className="text-[#A89060] dark:text-[#C4A86B] hover:text-[#8B7550] text-sm font-medium"`

Every: `className="text-sm text-blue-600 hover:text-blue-800"` (Edit buttons)
Replace with: `className="text-sm text-[#A89060] dark:text-[#C4A86B] hover:text-[#8B7550]"`

**Step 8: Update list dividers and inactive state backgrounds**

Every: `className="divide-y"` → `className="divide-y dark:divide-[#2E3A4E]"`
Every `bg-gray-50 opacity-60` (inactive items) → `bg-gray-50 dark:bg-[#1E2330] opacity-60`

**Step 9: Update the three inline modals (GroupModal, CategoryModal, TemplateModal)**

For each modal's outer card:
```tsx
className="bg-white dark:bg-[#252D3D] w-full max-w-sm rounded-xl"
```
and for the sheet variant:
```tsx
className="bg-white dark:bg-[#252D3D] w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto"
```

Modal header border:
```tsx
className="p-4 border-b dark:border-[#2E3A4E] flex justify-between items-center"
```

Modal close button:
```tsx
className="text-gray-500 dark:text-[#8A9BAA] hover:text-gray-700 dark:hover:text-[#F0EDE4] text-xl"
```

All modal headings: add `dark:text-[#F0EDE4]`
All modal labels: add `dark:text-[#F0EDE4]`
All modal inputs: same dark pattern as Step 6
All modal save buttons: gold (same as Step 7)
All modal cancel buttons: `text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-100 dark:hover:bg-[#1E2330]`

**Step 10: Commit**

```bash
git add src/pages/settings/SettingsPage.tsx
git commit -m "feat: dark mode toggle in Settings, gold buttons, full dark support for settings page"
```

---

## Task 8: Restyle `BudgetPage.tsx` and `BudgetItemModal.tsx`

**Files:**
- Modify: `src/pages/budget/BudgetPage.tsx`
- Modify: `src/pages/budget/BudgetItemModal.tsx`

### BudgetPage.tsx

**Step 1: Update Add Item button**

Find: `className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"`
Replace: `className="px-4 py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550]"`

**Step 2: Update From Templates button for dark mode**

Find: `className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"`
Replace: `className="px-3 py-2 text-sm bg-gray-100 dark:bg-[#1E2330] text-gray-700 dark:text-[#F0EDE4] rounded-lg hover:bg-gray-200 dark:hover:bg-[#2E3A4E]"`

**Step 3: Update page heading**

`text-gray-800` → `text-gray-800 dark:text-[#F0EDE4]`
`text-gray-500` → `text-gray-500 dark:text-[#8A9BAA]`

**Step 4: Update group cards**

```tsx
className="bg-white dark:bg-[#252D3D] rounded-xl shadow overflow-hidden"
```

Group header:
```tsx
className="bg-gray-50 dark:bg-[#1E2330] px-4 py-3 flex justify-between items-center border-b dark:border-[#2E3A4E]"
```

Group name: add `dark:text-[#F0EDE4]`
Group total: add `dark:text-[#8A9BAA]`
Group "+ Add" link: `text-[#A89060] dark:text-[#C4A86B] hover:text-[#8B7550]`

**Step 5: Update item rows**

Item hover: `hover:bg-gray-50 dark:hover:bg-[#1E2330]`
Item divider: `divide-y dark:divide-[#2E3A4E]`
Item name: add `dark:text-[#F0EDE4]`
Item subtitle: add `dark:text-[#8A9BAA]`
Item amount: add `dark:text-[#F0EDE4]`

**Step 6: Update badges**

Bill badge `bg-blue-100 text-blue-700` → `bg-[#F5F0E8] text-[#8B7550] dark:bg-[#2A2215] dark:text-[#C4A86B]`
Template badge `bg-gray-100 text-gray-600` → `bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA]`

**Step 7: Update empty state and loading**

`bg-white` → `bg-white dark:bg-[#252D3D]`
`text-gray-500` → `text-gray-500 dark:text-[#8A9BAA]`

### BudgetItemModal.tsx

**Step 8: Update modal container**

```tsx
className="bg-white dark:bg-[#252D3D] w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[90vh] overflow-y-auto"
```

**Step 9: Modal header**

```tsx
className="p-4 border-b dark:border-[#2E3A4E] flex justify-between items-center"
```
Heading: add `dark:text-[#F0EDE4]`
Close button: add `dark:text-[#8A9BAA]`

**Step 10: All labels, inputs, selects**

Labels: add `dark:text-[#F0EDE4]`
Hint text: add `dark:text-[#8A9BAA]`
Inputs/selects:
```tsx
className="w-full px-3 py-2 border dark:border-[#2E3A4E] rounded-lg bg-white dark:bg-[#1E2330] text-gray-800 dark:text-[#F0EDE4] focus:ring-2 focus:ring-[#A89060]"
```

**Step 11: Bill toggle — already correct style; just ensure active uses gold not blue**

`isBill ? 'bg-blue-600' : 'bg-gray-300'` → `isBill ? 'bg-[#A89060]' : 'bg-gray-300 dark:bg-[#2E3A4E]'`

**Step 12: Action buttons**

Save: `className="px-6 py-2 bg-[#A89060] text-white rounded-lg hover:bg-[#8B7550]"`
Cancel: `className="px-4 py-2 text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-100 dark:hover:bg-[#1E2330] rounded-lg"`
Delete: unchanged (stays red)

**Step 13: Commit**

```bash
git add src/pages/budget/BudgetPage.tsx src/pages/budget/BudgetItemModal.tsx
git commit -m "feat: gold buttons, dark mode cards and modal for Budget page"
```

---

## Task 9: Restyle `BillsPage.tsx`

**Files:**
- Modify: `src/pages/bills/BillsPage.tsx`

**Step 1: Summary cards**

```tsx
className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow"
```
Unpaid label: add `dark:text-[#8A9BAA]`
Paid label: add `dark:text-[#8A9BAA]`

**Step 2: Filter pills — active state**

Find: `filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'`
Replace:
```tsx
filter === f
  ? 'bg-[#A89060] dark:bg-[#C4A86B] text-white'
  : 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-200 dark:hover:bg-[#2E3A4E]'
```

**Step 3: Bill list container**

```tsx
className="bg-white dark:bg-[#252D3D] rounded-xl shadow divide-y dark:divide-[#2E3A4E]"
```

**Step 4: Bill row**

Paid bg: `bg-gray-50` → `bg-gray-50 dark:bg-[#1E2330]`
Bill name (normal): add `dark:text-[#F0EDE4]`
Subtitle: add `dark:text-[#8A9BAA]`
Amount (normal): add `dark:text-[#F0EDE4]`

**Step 5: Unpaid checkbox hover**

`border-gray-300 hover:border-blue-500` → `border-gray-300 dark:border-[#2E3A4E] hover:border-[#A89060]`

**Step 6: Update STATUS_BADGES for `due_before_payday`**

Find:
```tsx
due_before_payday: { label: 'Before Payday', className: 'bg-blue-100 text-blue-700' },
```
Replace:
```tsx
due_before_payday: {
  label: 'Before Payday',
  className: 'bg-[#F5F0E8] text-[#8B7550] dark:bg-[#2A2215] dark:text-[#C4A86B]',
},
```

Also update `upcoming`:
```tsx
upcoming: { label: 'Upcoming', className: 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA]' },
```

**Step 7: Empty state cards**

`bg-white` → `bg-white dark:bg-[#252D3D]`
Headings/text: add dark variants

**Step 8: Loading state**

add `dark:text-[#8A9BAA]`

**Step 9: Commit**

```bash
git add src/pages/bills/BillsPage.tsx
git commit -m "feat: gold filter pills, dark mode cards and badges for Bills page"
```

---

## Task 10: Restyle `TimelinePage.tsx`

**Files:**
- Modify: `src/pages/timeline/TimelinePage.tsx`

**Step 1: Header card**

```tsx
className="bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow"
```
Heading: add `dark:text-[#F0EDE4]`
Subtitle/labels: add `dark:text-[#8A9BAA]`
Balance value: add `dark:text-[#F0EDE4]`

**Step 2: Event cards**

```tsx
className={`bg-white dark:bg-[#252D3D] rounded-xl p-4 shadow flex items-center gap-4 ${isPastDate ? 'opacity-60' : ''}`}
```

Date number (non-payday): `text-gray-800` → `text-gray-800 dark:text-[#F0EDE4]`
Day label: `text-gray-500` → `text-gray-500 dark:text-[#8A9BAA]`
Event name: `text-gray-800` → `text-gray-800 dark:text-[#F0EDE4]`
Event subtitle: `text-gray-500` → `text-gray-500 dark:text-[#8A9BAA]`

**Step 3: Payday event — gold accent**

Payday date number stays `text-green-600` (fine).
The left-bar divider for payday:

Find: `className={`w-1 h-12 rounded ${isPayday ? 'bg-green-500' : 'bg-red-400'}`}`
Replace:
```tsx
className={`w-1 h-12 rounded ${isPayday ? 'bg-[#C4A86B]' : 'bg-red-400'}`}
```

And the payday date number:
```tsx
className={`text-2xl font-bold ${isPayday ? 'text-[#C4A86B]' : 'text-gray-800 dark:text-[#F0EDE4]'}`}
```

**Step 4: Warning card**

```tsx
className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4"
```

**Step 5: Commit**

```bash
git add src/pages/timeline/TimelinePage.tsx
git commit -m "feat: gold payday marker, dark mode cards for Timeline page"
```

---

## Task 11: Restyle `TransactionsPage.tsx` and `TransactionModal.tsx`

**Files:**
- Modify: `src/pages/transactions/TransactionsPage.tsx`
- Modify: `src/pages/transactions/TransactionModal.tsx`

### TransactionsPage.tsx

**Step 1: Header**

Heading: `text-gray-800` → `text-gray-800 dark:text-[#F0EDE4]`
Subtitle: `text-gray-500` → `text-gray-500 dark:text-[#8A9BAA]`
Add button: `bg-blue-600 hover:bg-blue-700` → `bg-[#A89060] hover:bg-[#8B7550]`

**Step 2: Category filter pills**

Same pattern as Bills:
```tsx
!filterCategory
  ? 'bg-[#A89060] dark:bg-[#C4A86B] text-white'
  : 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-200 dark:hover:bg-[#2E3A4E]'
```
and active category:
```tsx
filterCategory === catId
  ? 'bg-[#A89060] dark:bg-[#C4A86B] text-white'
  : 'bg-gray-100 dark:bg-[#1E2330] text-gray-600 dark:text-[#8A9BAA] hover:bg-gray-200 dark:hover:bg-[#2E3A4E]'
```

**Step 3: Date group header**

`text-gray-600` → `text-gray-600 dark:text-[#8A9BAA]`
`text-gray-500` → `text-gray-500 dark:text-[#8A9BAA]`

**Step 4: Transaction list cards**

```tsx
className="bg-white dark:bg-[#252D3D] rounded-xl shadow divide-y dark:divide-[#2E3A4E]"
```

Row hover: `hover:bg-gray-50 dark:hover:bg-[#1E2330]`
Tx name: `text-gray-800` → `text-gray-800 dark:text-[#F0EDE4]`
Tx note: `text-gray-500` → `text-gray-500 dark:text-[#8A9BAA]`
Tx category: `text-gray-400` → `text-gray-400 dark:text-[#8A9BAA]`
Tx amount: `text-gray-800` → `text-gray-800 dark:text-[#F0EDE4]`

**Step 5: Empty state cards**

`bg-white` → `bg-white dark:bg-[#252D3D]`
Headings/text: add dark variants

### TransactionModal.tsx

**Step 6: Read the file first**, then apply the same pattern as BudgetItemModal:
- Modal bg: `dark:bg-[#252D3D]`
- Header border: `dark:border-[#2E3A4E]`
- Labels: `dark:text-[#F0EDE4]`
- Inputs/selects: `dark:bg-[#1E2330] dark:border-[#2E3A4E] dark:text-[#F0EDE4] focus:ring-[#A89060]`
- Save button: `bg-[#A89060] hover:bg-[#8B7550]`
- Cancel: add `dark:text-[#8A9BAA] dark:hover:bg-[#1E2330]`

**Step 7: Commit**

```bash
git add src/pages/transactions/TransactionsPage.tsx src/pages/transactions/TransactionModal.tsx
git commit -m "feat: gold buttons, dark mode cards and modal for Transactions page"
```

---

## Task 12: Final check + build

**Step 1: Run the dev server and visually verify each page in light mode**

Run: `npm run dev`

Check each page:
- Dashboard: olive KPI card, gold "Remaining" number, gold progress bars
- Budget: olive header, gold buttons, group cards readable
- Bills: gold active filter pill, before-payday badge in gold tones
- Timeline: gold payday bar marker
- Transactions: gold add button, gold active filter
- Settings: Appearance section at top, dark mode toggle with gold active state

**Step 2: Toggle dark mode in Settings and re-check each page**

- All card backgrounds should be `#252D3D`
- Page background should be `#1E2330`
- Text should be `#F0EDE4` (warm off-white)
- Gold accents should be `#C4A86B` (brighter in dark)

**Step 3: Refresh while in dark mode — confirm no flash**

Hard reload (`Cmd+Shift+R`). The page should open dark immediately, with no white flash.

**Step 4: Production build**

Run: `npm run build`
Expected: Build completes with no errors.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete gold/olive premium theme with dark mode"
```
