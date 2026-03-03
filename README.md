# Financial-Tracker-V.02

Rebuilt from spreadsheet source to a static web app (`HTML/CSS/JavaScript`):
`https://docs.google.com/spreadsheets/d/1KCkOmoFeKFUjyb2SsTQrTK7obToXnAky6h1TNUvI_ok/edit?usp=sharing`

## Stack
- `HTML`
- `CSS`
- `JavaScript` (vanilla)
- GitHub Actions + GitHub Pages

## Project Structure
- `index.html` - Dashboard layout and UI sections.
- `styles.css` - Responsive styling for cards and tables.
- `app.js` - CSV parser, state normalization, calculations, render, form handlers.
- `data/source.csv` - Bundled spreadsheet snapshot.
- `Plan.md` - Step-by-step execution record and delivery checklist.
- `.github/workflows/ci.yml` - Validation and deployment pipeline.
- `scripts/check-doc-sync.ps1` - Local pre-commit doc sync validator.
- `scripts/check-doc-sync-ci.ps1` - CI doc sync validator.

## Run Locally
From repo root:

```powershell
python -m http.server 8080
```

Open:
`http://localhost:8080`

## Current Features
- Loads data from `data/source.csv`.
- Renders:
  - Total Income
  - Total Expense
  - Total Assets
  - Income transactions
  - Expense transactions
  - Method balances
  - Expense recap by category
  - Bill notes
- Supports adding income and expense entries in-browser with immediate recalculation.
- Adds UX upgrades:
  - Global transaction search filter (income + expense tables)
  - Sticky table headers and zebra rows for readability
  - Visual positive/negative balance cues
  - Toast feedback for form success and validation errors

## Calculation Logic
- `Total Income` = sum of income amounts.
- `Total Expense` = sum of expense amounts.
- `Total Assets` = `Total Income - Total Expense`.
- Method balance = income by method minus expense by account.
- Expense recap = total expense grouped by category.

## Refresh Data From Spreadsheet
Update local snapshot:

```powershell
$ErrorActionPreference='Stop'
$url='https://docs.google.com/spreadsheets/d/1KCkOmoFeKFUjyb2SsTQrTK7obToXnAky6h1TNUvI_ok/export?format=csv'
Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile 'data/source.csv'
```

## Documentation Sync Rule
For any meaningful implementation change, update both:
- `Plan.md`
- `README.md`

before commit.

## GitHub Workflow
Workflow file: `.github/workflows/ci.yml`

### Validate job (push + PR to `main`)
- Checkout repository
- `node --check app.js`
- Changed-file doc sync check via `scripts/check-doc-sync-ci.ps1`

### Deploy job (push to `main`)
- Runs only after validate job succeeds
- Publishes repository content to GitHub Pages using official Pages actions

## GitHub Pages Setup Notes
In repository settings:
1. Open **Settings > Pages**.
2. Set source to **GitHub Actions**.
3. Push to `main` to trigger deployment.

The deployed URL will be available in the Actions deployment summary.
