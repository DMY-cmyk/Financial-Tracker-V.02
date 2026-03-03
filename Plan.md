# Plan - Spreadsheet to Web App Rebuild (March 3, 2026)

## Objective
Rebuild the project from scratch in `HTML`, `CSS`, and `JavaScript` based on this spreadsheet:
`https://docs.google.com/spreadsheets/d/1KCkOmoFeKFUjyb2SsTQrTK7obToXnAky6h1TNUvI_ok/edit?usp=sharing`

## Source Snapshot
- Export source: default CSV export endpoint from the spreadsheet.
- Local data file: `data/source.csv`
- Snapshot refreshed on: **March 3, 2026 (21:25 local run time)**

## Step-by-Step Plan and Implementation Status
1. Refresh spreadsheet data snapshot.
- [x] Download latest CSV into `data/source.csv`.

2. Rebuild frontend structure.
- [x] Replace `index.html` with a clean dashboard layout (metrics, forms, analytics, tables).

3. Rebuild styling.
- [x] Replace `styles.css` with responsive design for desktop/mobile and table-heavy UI.

4. Rebuild JavaScript logic.
- [x] Replace `app.js` with:
  - CSV parsing
  - Sheet row normalization
  - Calculation engine (`Income`, `Expense`, `Assets`, balances, recap)
  - Dynamic rendering
  - Add-income and add-expense interactions
  - Error handling for data load failures

5. Set deployment workflow in GitHub.
- [x] Update `.github/workflows/ci.yml` with:
  - Validation job (`node --check app.js` + doc sync policy check)
  - Deployment job to GitHub Pages on push to `main`

6. Keep docs synchronized.
- [x] Rewrite `Plan.md` from scratch (this file).
- [x] Rewrite `README.md` to match rebuilt project + deployment process.

7. Validate and deliver.
- [x] Run local validation checks.
- [x] Commit all changes atomically.
- [x] Push to `origin/main`.

## UI/UX Enhancement Iteration (Post-Rebuild)
- [x] Added transaction explorer search input.
- [x] Improved table usability (sticky headers, zebra rows, hover states).
- [x] Added interaction feedback (toast on submit/error).
- [x] Added visual cues for positive/negative balances.

## Calculation Rules Implemented
- `Total Income` = sum of all income transaction amounts.
- `Total Expense` = sum of all expense transaction amounts.
- `Total Assets` = `Total Income - Total Expense`.
- Method balances = income by method minus expense by account.
- Expense recap = grouped sum of expenses by category.

## Files in Scope
- `index.html`
- `styles.css`
- `app.js`
- `data/source.csv`
- `.github/workflows/ci.yml`
- `README.md`
- `Plan.md`

## Documentation Policy (Mandatory)
For each meaningful implementation update:
1. Update code.
2. Update `Plan.md`.
3. Update `README.md`.
4. Commit only after both docs are synchronized with implementation.

## Git Delivery Protocol
1. Check status with `git status`.
2. Stage app + docs + workflow.
3. Commit with one clear message.
4. Push to `origin/main`.
