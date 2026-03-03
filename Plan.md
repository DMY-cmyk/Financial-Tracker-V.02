# Plan - Google Sheet Clone (gid 523656526)

## Goal
Replicate the Google Sheet budgeting tracker into a static web app using `HTML`, `CSS`, and `JavaScript`, with core parity for structure, calculations, and transaction interactions.

## Implemented Scope
- Imported snapshot data from Google Sheets CSV into `data/source.csv`.
- Built a responsive dashboard with:
  - Summary metrics (`Total Income`, `Total Expense`, `Total Assets`)
  - Add income/expense forms
  - Income and expense transaction tables
  - Payment method balance recap
  - Expense category recap
  - Bill notes table
- Implemented calculation logic:
  - `Total Assets = Total Income - Total Expense`
  - Method balance = income by method minus expense by account
  - Expense recap by expense category

## File Plan
- `index.html`: page layout and semantic sections.
- `styles.css`: spreadsheet-inspired responsive visual style.
- `app.js`: CSV parsing, data normalization, rendering, and recalculation.
- `data/source.csv`: static snapshot used by the app.
- `README.md`: setup, architecture, and maintenance policy.
- `scripts/check-doc-sync.ps1`: staged-file policy validator.
- `scripts/check-doc-sync-ci.ps1`: changed-file validator for GitHub Actions.
- `scripts/install-hooks.ps1`: hook installer and `core.hooksPath` setup.
- `scripts/hooks/pre-commit`: pre-commit entrypoint for policy enforcement.
- `.github/workflows/ci.yml`: CI pipeline for syntax and doc sync checks.

## Validation Checklist
- [x] CSV source can be loaded at runtime.
- [x] Summary totals recalculate after adding transactions.
- [x] New transactions appear immediately in corresponding tables.
- [x] Expense recap and method balances stay synchronized with state updates.
- [x] Layout remains usable on desktop and mobile widths.
- [x] Commit guardrail script blocks implementation-only commits without doc sync.
- [x] Hook installer configures `.githooks` path from repo scripts.
- [x] GitHub Actions workflow validates JS syntax on push/PR to `main`.
- [x] GitHub Actions enforces doc synchronization using changed-file diff checks.

## Ongoing Update Policy (Mandatory)
For every meaningful feature or behavior change:
1. Update implementation files.
2. Update `Plan.md` to reflect scope, decisions, and checklist state.
3. Update `README.md` to reflect usage, architecture, and behavior.
4. Commit only after both docs are synchronized with the code.

## Automation Note
- Run `powershell -ExecutionPolicy Bypass -File .\scripts\install-hooks.ps1` after clone/setup.
- The pre-commit hook enforces that staged implementation changes include both `Plan.md` and `README.md`.
- CI also enforces doc sync on GitHub for `push` and `pull_request` into `main`.

## Git Delivery Protocol
1. Verify working tree with `git status`.
2. Stage app + docs together.
3. Create one atomic commit for the full change set.
4. Push to `origin/main`.
