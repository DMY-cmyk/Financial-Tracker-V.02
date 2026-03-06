# Financial Tracker V.02 - Implementation Plan

## Overview
Static HTML/CSS/JS clone of a personal monthly budgeting Google Spreadsheet. Renders 12 monthly sheets (JAN-DES) with income/expense logging, category summaries, payment method balances, and bills tracking.

## Architecture
```
Financial Tracker.xlsx  -->  extract_xlsx.py  -->  data/workbook.json  -->  index.html + script.js
```

1. **Data extraction**: Python script reads the XLSX source and outputs a structured JSON file
2. **Frontend rendering**: Vanilla JS reads `workbook.json`, builds a Google Sheets-style grid with tabs, formula evaluation, and interactive features

## Key Features
- 12 monthly tab navigation (JAN through DES)
- Formula engine: SUM, AVERAGE, IF, SUMIF, COUNTIF, IFERROR, NOW
- Checkbox rendering for bills tracking section
- Cell selection, keyboard navigation, inline editing
- Column/row resize, freeze rows/columns
- Filter, sort, CSV import/export
- Light/dark theme toggle
- GitHub Pages auto-deployment

## Performance
Sheets declare ~1006 rows x 26 cols but only populate ~70 rows x 20 cols. The builder caps row/col counts to max populated + buffer, reducing DOM elements from ~26K to ~1,800 per sheet.

## Data Pipeline
1. Place `Financial Tracker.xlsx` in project root
2. Run `python scripts/extract_xlsx.py` to regenerate `data/workbook.json`
3. Serve with any static file server
