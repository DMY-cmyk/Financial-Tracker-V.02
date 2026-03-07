# Financial Tracker V.02

A static HTML/CSS/JS clone of a personal monthly budgeting spreadsheet, designed to look and feel like Google Sheets. Displays 12 monthly tabs with income/expense tracking, category summaries, payment method balances, and bills checklists.

## Features

- **12 Monthly Tabs** - JAN through DES with independent data
- **Formula Engine** - SUM, AVERAGE, IF, SUMIF, COUNTIF, IFERROR, NOW with circular reference detection
- **Interactive Grid** - Cell selection, keyboard navigation (Arrow/Tab/Enter), inline editing
- **Interactive Checkboxes** - TRUE/FALSE values rendered as toggleable checkboxes
- **Number Formatting** - Locale-aware thousand separators (id-ID)
- **Dynamic Headers** - Auto-detects and styles section header rows
- **Freeze Rows/Columns** - Sticky headers for easier navigation
- **Scroll Sync** - Column and row headers scroll in sync with the grid
- **Filter & Sort** - Text filtering across all columns, ascending/descending sort
- **CSV Import/Export** - Load data from CSV or export current sheet
- **Light/Dark Theme** - Toggle between light and dark modes with localStorage persistence
- **Cell Comments** - Hover popovers for cells with comments
- **Responsive Layout** - Adapts to different screen sizes

## Local Development

```bash
# Serve locally
python -m http.server 8080
# Open http://localhost:8080
```

## Data Pipeline

```
Financial Tracker.xlsx  -->  scripts/extract_xlsx.py  -->  data/workbook.json  -->  Frontend
```

To regenerate data from a new spreadsheet:

```bash
pip install openpyxl
python scripts/extract_xlsx.py
```

## Project Structure

```
├── index.html                          # Main HTML page
├── script.js                           # Spreadsheet engine & UI logic
├── styles.css                          # Google Sheets-style theming
├── data/
│   └── workbook.json                   # Extracted spreadsheet data (12 months)
├── scripts/
│   └── extract_xlsx.py                 # XLSX to JSON extraction script
├── .github/
│   └── workflows/
│       └── deploy-pages.yml            # GitHub Pages auto-deployment
├── Plan.md                             # Implementation plan & checklist
└── README.md
```

## Deployment

Pushes to `main` trigger GitHub Pages deployment via `.github/workflows/deploy-pages.yml`. The site is served as a static page with no build step required.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JS (no frameworks)
- **Data**: JSON extracted from XLSX via Python/openpyxl
- **Hosting**: GitHub Pages
