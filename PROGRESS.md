# Julius - Spending Tracker PWA Progress

## Build Status: V1 Complete

### Phase 1: Repo Bootstrap & Tooling
- [x] Create Vite React TS project
- [x] Install dependencies (react-router-dom, dexie, date-fns, vite-plugin-pwa)
- [x] Install Tailwind CSS
- [x] Configure PWA manifest and service worker
- [x] App runs locally with `npm run dev`
- [x] Build passes with `npm run build`

### Phase 2: Architecture Skeleton
- [x] Create layered folder structure (app, pages, components, domain, data, pwa, utils)
- [x] Configure routes with react-router-dom
- [x] Shared layout with bottom navigation

### Phase 3: Domain Models + Rules
- [x] BudgetGroup, Category, BudgetMonth, BudgetItem models
- [x] Transaction, BillTick, RecurringTemplate models
- [x] AppSettings model
- [x] Constants (DEFAULT_GROUPS, DEFAULT_CATEGORIES, PAYDAY)
- [x] Domain rules: effectivePlanned, aggregations, overspend detection
- [x] Payday calculations, timeline projection

### Phase 4: Local Database (Dexie) + Repositories
- [x] Dexie DB schema with all tables
- [x] Repository interfaces for all entities
- [x] Dexie implementations for all repositories
- [x] seedDefaults() function for initial data

### Phase 5: Month Lifecycle
- [x] getOrCreate month functionality
- [x] Month selection with localStorage persistence
- [x] Month selector UI component

### Phase 6: Budget Page
- [x] Group sections with totals
- [x] Budget item CRUD
- [x] Add/Edit modal with all fields
- [x] Multiplier and split ratio support
- [x] Bill toggle with due date

### Phase 7: Templates (Recurring Items)
- [x] Template CRUD in Settings
- [x] "From Templates" button on Budget page
- [x] Active/inactive toggle

### Phase 8: Transactions Page
- [x] Transaction add/edit form
- [x] Required fields: amount, date, category
- [x] Budget item selection
- [x] Grouped by date display
- [x] Category filter

### Phase 9: Bills Page
- [x] Bills list from budget items where isBill=true
- [x] Paid checkbox (BillTick)
- [x] Due status badges (overdue, today, tomorrow, before payday)
- [x] Filter options

### Phase 10: Timeline Page
- [x] Payday date calculation
- [x] Timeline events (bills, payday)
- [x] Running balance projection
- [x] Negative balance warning

### Phase 11: Dashboard Page
- [x] Remaining until payday KPI
- [x] Budget overview totals
- [x] Group summaries with progress bars
- [x] Money leaks section (overspent categories, unbudgeted spend)

### Phase 12: Settings Page
- [x] Payday day configuration
- [x] Expected monthly income
- [x] Budget groups CRUD
- [x] Categories CRUD
- [x] Recurring templates CRUD

### Phase 13: Polish
- [x] Build passes
- [x] PWA configured with service worker
- [x] Manifest with icons

## Notes
- Currency: ZAR only (V1)
- Payday default: 25th
- Default groups: Needs, Should Die
- effectivePlanned = plannedAmount * multiplier * splitRatio

## To Run
```bash
npm install
npm run dev    # Development
npm run build  # Production build
npm run preview # Preview production build
```

## Future Phases (Not Implemented)
- CSV statement upload
- Bank sync
- Cash spending tracking
- Cloud sync + authentication
- Push notifications
