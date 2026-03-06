# Financial Tracker V.02

A static HTML/CSS/JS clone of a personal monthly budgeting spreadsheet, designed to look and feel like Google Sheets. Displays 12 monthly tabs with income/expense tracking, category summaries, payment method balances, and bills checklists.

## Features

- **12 Monthly Tabs** - JAN through DES with independent data
- **Formula Engine** - SUM, AVERAGE, IF, SUMIF, COUNTIF, IFERROR, NOW
- **Interactive Grid** - Cell selection, keyboard navigation, inline editing
- **Bills Checkboxes** - TRUE/FALSE values rendered as checkboxes
- **Number Formatting** - Locale-aware thousand separators (id-ID)
- **Freeze Rows/Columns** - Sticky headers for easier navigation
- **Filter & Sort** - Text filtering and column sorting
- **CSV Import/Export** - Load data from CSV or export current sheet
- **Light/Dark Theme** - Toggle between light and dark modes
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

## Deployment

Pushes to `main` trigger GitHub Pages deployment via `.github/workflows/deploy-pages.yml`. The site is served as a static page.

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JS (no frameworks)
- **Data**: JSON extracted from XLSX via Python/openpyxl
- **Hosting**: GitHub Pages
