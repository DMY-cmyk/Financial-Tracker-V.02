# Financial Tracker V.02 - Implementation Plan

## Overview
Static HTML/CSS/JS clone of a personal monthly budgeting Google Spreadsheet. Renders 12 monthly sheets (JAN-DES) with income/expense logging, category summaries, payment method balances, and bills tracking.

## Architecture
```
Financial Tracker.xlsx  -->  extract_xlsx.py  -->  data/workbook.json  -->  index.html + script.js
```

1. **Data extraction**: Python script reads the XLSX source and outputs a structured JSON file
2. **Frontend rendering**: Vanilla JS reads `workbook.json`, builds a Google Sheets-style grid with tabs, formula evaluation, and interactive features

## Implementation Checklist

### Project Setup
- [x] Project structure (index.html, script.js, styles.css)
- [x] Google Fonts (Roboto) integration
- [x] CSS variables for theming
- [x] Responsive layout with `@media` queries
- [x] `.gitignore` for xlsx files and Python cache

### Data Pipeline
- [x] `scripts/extract_xlsx.py` - Python extraction script (openpyxl)
- [x] `data/workbook.json` - Sample data with 12 monthly sheets
- [x] JSON loader with fallback workbook on fetch failure
- [x] Performance optimization: cap row/col counts to max populated + buffer

### UI Chrome (Google Sheets Look & Feel)
- [x] Brand row with Sheets icon, title, menu buttons
- [x] Toolbar row (Undo, Redo, Bold, Italic, Strikethrough, Align)
- [x] Formula bar with name box and fx input
- [x] Control row (freeze, sort, filter, CSV, theme controls)
- [x] Bottom bar with sheet tabs and selection label
- [x] Share modal dialog
- [x] Version history modal dialog

### Core Spreadsheet Features
- [x] 12 monthly tab navigation (JAN through DES)
- [x] Cell selection (click, shift+click, drag to extend)
- [x] Keyboard navigation (Arrow keys, Tab, Shift+Tab)
- [x] Inline cell editing (double-click or Enter)
- [x] Formula bar editing (type in fx bar, press Enter)
- [x] Column/row resize via drag handles
- [x] Freeze row 1 / Freeze column A toggles
- [x] Scroll sync between grid and column/row headers

### Formula Engine
- [x] `SUM(range)` - Sum values in a range
- [x] `AVERAGE(range)` - Average values in a range
- [x] `IF(condition, true_val, false_val)` - Conditional logic
- [x] `SUMIF(criteria_range, criteria, sum_range)` - Conditional sum
- [x] `COUNTIF(range, criteria)` - Conditional count
- [x] `IFERROR(expr, fallback)` - Error handling
- [x] `NOW()` - Current date (id-ID locale)
- [x] Cell references (e.g., `A1`, `B5`)
- [x] Arithmetic between cell refs (e.g., `=B11-C11`)
- [x] `$` absolute reference stripping
- [x] Circular reference detection (`#CYCLE!`)

### Data Display & Formatting
- [x] Number formatting with id-ID locale (thousand separators)
- [x] Decimal number formatting (up to 2 decimal places)
- [x] Dynamic header row detection (auto-styles section headers)
- [x] Interactive checkbox rendering for TRUE/FALSE values
- [x] Cell comment indicators (orange triangle) with hover popover
- [x] Right-aligned number cells

### Filter, Sort & CSV
- [x] Text filter across all columns (search cells)
- [x] Sort ascending (A-Z) by active column
- [x] Sort descending (Z-A) by active column
- [x] Clear filter button
- [x] CSV file import (load into current sheet)
- [x] CSV export (download current sheet as .csv)

### Theming
- [x] Light theme (default)
- [x] Dark theme with proper CSS variables
- [x] Dark-mode gradient background fix
- [x] Theme persistence via localStorage

### Deployment
- [x] `.github/workflows/deploy-pages.yml` - GitHub Pages auto-deploy
- [x] Static file serving (no build step required)

## Performance
Sheets declare ~1006 rows x 26 cols but only populate ~70 rows x 20 cols. The builder caps row/col counts to max populated + buffer, reducing DOM elements from ~26K to ~1,800 per sheet.

## Data Pipeline
1. Place `Financial Tracker.xlsx` in project root
2. Run `python scripts/extract_xlsx.py` to regenerate `data/workbook.json`
3. Serve with any static file server
