# Julius — User Guide

Julius is a personal budget and spending tracker that lives entirely on your device. No account, no cloud, no subscriptions.

---

## Getting Started

### 1. Open the App
Visit [julius-omega.vercel.app](https://julius-omega.vercel.app) in your browser.

On mobile, tap **Add to Home Screen** from your browser menu to install it as an app.

### 2. Set Up Your Budget Settings
Before anything else, go to **Settings** (☰ → Settings) and configure:

- **Payday Day of Month** — the day you get paid (e.g. 25)
- **Expected Monthly Income** — your take-home pay in ZAR (optional but improves forecasting)

Tap **Save** when done.

---

## Navigation

Tap the **☰** icon in the top-left corner to open the menu. You'll find 8 sections:

| Section | What it does |
|---|---|
| Dashboard | Monthly overview at a glance |
| Insights | 6-month spending trends and analysis |
| Budget | Plan and manage your monthly budget |
| Bills | Track recurring bills and due dates |
| Timeline | Visual projection of upcoming bills |
| Planner | Model major purchases before committing |
| Spend | Log and review all transactions |
| Settings | Configure banks, groups, categories and more |

Use the **month selector** (top-right of the header) to switch between months.

---

## Setting Up Your Budget

### Create Budget Groups and Categories
Budget Groups are broad buckets (e.g. *Needs*, *Should Die*). Categories live inside groups (e.g. *Groceries*, *Eating Out*).

The app comes with default groups and categories. To customise:

1. Go to **Settings → Budget Groups** — add, edit, or deactivate groups
2. Go to **Settings → Categories** — add categories and assign them to a group

### Add Recurring Templates
Templates auto-populate your budget each month so you don't start from scratch.

1. Go to **Settings → Recurring Templates**
2. Tap **+ Add Template**
3. Fill in the name, amount, group, and category
4. Toggle **This is a bill** if it has a monthly due date
5. Tap **Save**

---

## Monthly Budget (Budget Page)

Each month's budget is generated from your recurring templates.

1. Navigate to **Budget**
2. Your templated items appear grouped by category
3. Tap **+ Add Item** to add a once-off budget line
4. Tap any item to edit the planned amount, multiplier, or split ratio
5. The progress bar shows planned vs. actual spending per group

---

## Tracking Bills (Bills Page)

Bills are budget items with a due date.

1. Go to **Bills** to see all bills for the selected month
2. Bills are colour-coded by urgency: overdue, due today, due tomorrow, upcoming
3. Tap a bill and mark it as **Paid** once settled
4. Paid bills move to the bottom with a green indicator

---

## Logging Transactions (Spend Page)

1. Go to **Spend**
2. Tap **+ Add** in the top-right
3. Fill in:
   - **Category** — what type of spend
   - **Budget Item** — link it to a specific budget line (optional)
   - **Amount** — in ZAR
   - **Date** — defaults to today
   - **Note** — optional description
4. Tap **Save**

Transactions not linked to a budget item are flagged as **Unbudgeted**.

To edit or delete a transaction, tap it in the list.

---

## Insights Page

View your spending history across the last 6 months:

- **Monthly Summary cards** — planned vs. actual with surplus/deficit for each month
- **Group trend bars** — see if a spending group is creeping up month by month
- **Category drill-down** — tap any category to see all transactions across months

---

## Affordability Planner

Use this before committing to a major ongoing expense (e.g. a car, a new subscription bundle).

1. Go to **Planner**
2. Tap **+ New Scenario** and give it a name (e.g. *New Car*)
3. In the scenario, tap **+ Add** to add monthly expense lines:
   - Petrol — R2 500/mo
   - Car installment — R4 800/mo
   - Insurance — R900/mo
4. The **Forecast panel** at the bottom shows:
   - Your baseline disposable income (avg of last 3 months)
   - Your spending trend (↑ increasing / ↓ decreasing / → stable)
   - Total new monthly obligations
   - What you'd have left after the scenario
   - A verdict chip: **Affordable**, **Tight**, or **Can't Afford**

Scenarios are saved and persist between sessions.

---

## Bank Statement Reconciliation

Upload your bank's CSV export to find transactions you may have missed logging in Julius.

### Step 1 — Add Your Bank
1. Go to **Settings → Bank Accounts**
2. Tap **+ Add Bank**
3. Select your bank (FNB, Capitec, Standard Bank, Discovery, ABSA)
4. Set your upload frequency
5. Tap **Add Bank**

### Step 2 — Upload a Statement
1. On your bank card, tap **Upload Statement (.csv)**
2. Export a CSV from your banking app or internet banking and select the file
3. Julius will automatically parse and match transactions

### Step 3 — Review and Import
After upload, a reconciliation screen appears:

- **Matched** — transactions already in Julius
- **Missing from Julius** — transactions found in your bank statement but not logged

For each missing transaction:
1. Tick the checkbox to select it
2. Choose a category from the dropdown
3. Tap **Import Selected**

Imported transactions appear immediately in your Spend page.

---

## Tips

- **Switch months** using the selector in the header to review or plan past/future months
- **Dark mode** can be toggled in Settings → Appearance
- The app works fully **offline** — all data is stored on your device
- Clearing your browser data will erase all Julius data — there is no cloud backup
