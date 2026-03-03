# Financial-Tracker-V.02

Web clone of the Google Sheet budgeting tracker:
`https://docs.google.com/spreadsheets/d/1KCkOmoFeKFUjyb2SsTQrTK7obToXnAky6h1TNUvI_ok/edit?gid=523656526#gid=523656526`

## Stack
- `HTML`
- `CSS`
- `JavaScript` (vanilla)

## Project Structure
- `index.html` - dashboard layout and sections.
- `styles.css` - responsive styling.
- `app.js` - CSV parsing, state, calculations, rendering, and form interactions.
- `data/source.csv` - static sheet snapshot used by the UI.
- `Plan.md` - implementation plan and maintenance protocol.

## Run Locally
Use any static server from the repo root, for example:

```powershell
python -m http.server 8080
```

Open: `http://localhost:8080`

## Current Behavior
- Loads snapshot data from `data/source.csv`.
- Renders income and expense transactions.
- Calculates:
  - `Total Income`
  - `Total Expense`
  - `Total Assets = Income - Expense`
  - Payment method balances
  - Expense recap by category
- Supports adding new income and expense transactions through forms.

## Data Refresh From Google Sheet
After updating/publicizing the sheet, refresh snapshot:

```powershell
$url='https://docs.google.com/spreadsheets/d/1KCkOmoFeKFUjyb2SsTQrTK7obToXnAky6h1TNUvI_ok/export?format=csv&gid=523656526'
Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile 'data/source.csv'
```

## Documentation Synchronization Rule
For each meaningful code change, `Plan.md` and `README.md` must both be updated in the same cycle before commit.
