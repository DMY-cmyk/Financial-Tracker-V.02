# Plan Baseline and Working Rules — Financial Tracker V.02

## Goal

Financial Tracker V.02 is a personal finance web app in Rupiah: a *bento grid* dashboard, bilingual (EN/ID), Next.js on Vercel, with Neon Postgres in production and SQLite for dev/tests. Its owner is Dzaki. The app is **already live and used by several real user accounts** (`CLAUDE.md:15`).

This plan is a **baseline**. It contains: a snapshot of the state as of 13/11/2026, gaps, decisions already recorded, and numbered acceptance criteria (ACs) for a "healthy project" state and for the next work already known:
- Sprint 3 *design foundation*, including the uncommitted *chart-theme* changes;
- PR #16 *Transaction Split*.

This plan does **not** execute anything.

### Problem statement

Financial Tracker V.02 is live with real user accounts, while Sprint 3 work (11 uncommitted changes, Current state) and PR #16 are open; a schema difference already caused a production outage once (08/08/2026, Risk & rollback).

### Measurable targets

- T1. The 11 old changes get a written decision and the tests are green (AC1, AC2, AC5); date: not applicable (no deadline in this plan's sources).
- T2. Task 2 (E2) is done per the Sprint 3 plan and the preflight is green before any release (AC3, AC4, AC7).
- T3. PR #16 has a written decision before Tasks 3–4 (AC6).

### Deliverables

- D1. Sprint 3 Task 2 with tests.
- D2. A written PR #16 decision.
- D3. Updated project memory and `CLAUDE.md` figures.

## Current state (evidence, verified 2026-11-13)

**Repo and branches**
- Git repo with remote `origin` = `DMY-cmyk/Financial-Tracker-V.02`. Production branch `main` (`README.md:431`: "Production (deployed to Vercel)"). `origin/main` = `58900bd` (09/08/2026, merge of PR #19 Sprint 2).
- Active branch `feat/sprint3-design-foundation` at `963ff8e` ("feat(design): … (E1)"). It is 2 commits ahead of `origin/main` and identical to `origin/feat/sprint3-design-foundation` (difference 0/0).

**Old uncommitted changes** (left as they are; the initial `git status` snapshot had 11 lines)
- 6 chart files modified (`M`):
  - `src/features/dashboard/CashFlowChart.tsx`
  - `src/features/dashboard/CategoryBreakdown.tsx`
  - `src/features/insights/CategoryComparisonChart.tsx`
  - `src/features/net-worth/NetWorthTrendChart.tsx`
  - `src/features/reports/ForecastChart.tsx`
  - `src/features/reports/TrendChart.tsx`
- 2 new files (`??`): `src/lib/chart-theme.ts` and `src/__tests__/chart-theme.test.ts`.
- Others: `.claude/settings.local.json` (`M`), `.claude/worktrees/agent-a97a87ee` (`D`), `.claude/skills/` (`??`).
- This pattern matches **Task 2 (E2)** of the Sprint 3 plan: a shared `chart-theme.ts` and chart adoption (`docs/superpowers/plans/2026-08-09-sprint-3-design-foundation.md:160`). That plan has 0 `[x]` boxes and 65 `[ ]` boxes, so per-task status is not ticked.

**Open work on GitHub**
- The only open PR is **#16** "feat: Transaction Split — allocate one transaction across multiple categories", `feature/transaction-split` → `main`. Created 20/04/2026, last updated 20/04/2026, status **`CONFLICTING`** (`gh pr view 16`).

**Existing project rules**
- A *Deployment Playbook* analysis is mandatory before every change (`CLAUDE.md:3`, `:8`). Playbook: `docs/DEPLOYMENT-PLAYBOOK.md`, with Stage 1 impact analysis at `:29`.
- Production outage on 08/08/2026 caused by a SQLite/Postgres schema difference (`CLAUDE.md:17`).
- Design source of truth: `design-system/financial-tracker-v.02/MASTER.md` (`CLAUDE.md:44`).
- Database: Neon Postgres in production, better-sqlite3 in dev/tests (`README.md:295`).

**Tests and CI**
- Scripts (`package.json`):
  - `typecheck` (`:13`)
  - `test` = `vitest run` (`:14`)
  - `validate` (`:16`)
  - `preflight` (`:17`)
- The README records 989 tests (`README.md:299`, `:336`).
- CI `.github/workflows/ci.yml` (`README.md:421`). Automatic Vercel deploy on push to `main` (`README.md:425`).
- **Tests were not run on 13/11/2026** (reason: `node_modules/` is absent, while `npm ci` needs network and writes a new folder). Local Node v26.12.1. The test count of 989 is still the README figure, not re-measured.

## Gap inventory

1. **Task 2 (E2) is half-done and uncommitted.** The work in the working tree can be lost, and there is no evidence yet that its tests are green.
2. **PR #16 has been abandoned for almost 7 months and conflicts.** The feature touches the transaction structure, so it must go through a schema impact analysis (playbook Stage 1). There is no decision yet to continue or close it.
3. **The rest of Sprint 3** (Tasks 3–13, E3–E5) has not started according to the commit history. Task 13 requires preflight, PR, CI, and a Preview test before merge (`…sprint-3-design-foundation.md:685`).
4. **The contents of `.claude/`** (`settings.local.json`, the deleted worktree, `skills/`) are mixed into git status. It needs a decision whether they are ignored, not committed along.
5. **Stale documents.**
   - The project memory `MEMORY.md` still names SQLite as the main database, while production uses Neon Postgres (`README.md:295`).
   - `CLAUDE.md:152` still says "84 tests", while the README says 989.
   - `CLAUDE.md:156` says CI runs on the `redesign` branch, while the README says `main` (`README.md:421`).

## Decisions

The following decisions are already recorded:
- **The playbook is mandatory** (`CLAUDE.md:3–17`). Migrations may only be additive: every new column must exist in `CREATE TABLE` **and** `ALTER TABLE` (`CLAUDE.md:11–13`). Rejected: relying on the dev SQLite that is "always fresh", which caused the 08/08/2026 outage.
- **The UI must not look like a spreadsheet** (*UX Constraints* section in `CLAUDE.md`). Rejected: cell/grid editing.
- **Colours through tokens**, never raw hex. The source of truth is `design-system/financial-tracker-v.02/MASTER.md` (`CLAUDE.md:44`).
- **Sprint 3 is worked on the `feat/sprint3-design-foundation` branch**, then one PR to `main` after preflight is green (`…sprint-3-design-foundation.md:24`, `:685`).
- **Decision of this plan:** the old changes in the working tree are **not** touched by the baseline. Their fate is decided by Dzaki in execution phase 1. Rejected: being committed or discarded by an agent without permission.

## Acceptance criteria

- **AC1 — Test environment ready.** `npm ci` succeeds with a Node version supported by the project, and `node_modules/` stays ignored (`.gitignore:12`).
- **AC2 — Tests green.** `npm run test` → 0 failures, including `src/__tests__/chart-theme.test.ts`. The test count is recorded and does not drop below 989 unless there is a written reason.
- **AC3 — Preflight green.** `npm run preflight` → format, typecheck, lint, and build pass.
- **AC4 — Task 2 (E2) done per the Sprint 3 plan.** All six charts use `chart-theme.ts`, there is no raw hex in the chart files, and it is committed on `feat/sprint3-design-foundation`.
- **AC5 — Working tree free of tool leftovers.** `git status --porcelain` no longer shows `.claude/settings.local.json`, `.claude/worktrees/…`, or `.claude/skills/`, because they are ignored or restored per Dzaki's decision.
- **AC6 — PR #16 has a written decision.** The options: (a) closed with a reason, or (b) continued with its own plan that contains the playbook Stage 1 impact analysis (schema change? API shape? reading old data?), after which the conflict is resolved and migration guard tests are added.
- **AC7 — Safe release.** Every merge to `main` is preceded by green CI and a Vercel Preview test, and followed by a post-deploy `/api/health` check (`CLAUDE.md:13–14`). Push and merge only with Dzaki's permission.

## Execution phases

1. Dzaki decides the fate of the 11 old changes: continue Task 2, or save them to `git stash` (AC5 for the `.claude/` contents).
2. Prepare the environment (AC1), then run the tests (AC2).
3. Finish Task 2 (E2) with TDD (AC4), then Tasks 3–12, then Task 13 preflight and PR (AC3, AC7).
4. Decide PR #16 (AC6). If it continues, write its own plan with the playbook impact analysis.
5. Update the project memory and `CLAUDE.md:152`/`:156` (Gap 5) with the figures measured in AC2. This is a trivial change and is mentioned when it is done.

### Work breakdown & dependencies

| # | Task | Depends on |
|---|---|---|
| 1 | Decision on the 11 old changes (Execution phases) | — |
| 2 | Prepare the environment and run the tests | 1 |
| 3 | Task 2, then Tasks 3–12, Task 13 preflight and PR | 2 |
| 4 | Decide PR #16 | — |
| 5 | Update project memory and `CLAUDE.md` | 2 |

### Milestones

Not applicable (this baseline names no delivery date). Milestones with buffers go into the Sprint 3 plan and the PR #16 plan.

### Roles (RACI)

| Deliverable/phase | R | A | C | I |
|---|---|---|---|---|
| Code, tests, PRs | Claude | Dzaki | — | — |
| Release to production | Dzaki | Dzaki | — | app users (via the live app) |

### Resources & budget

- Technical: Next.js, Vercel, Neon Postgres (production), SQLite (dev/tests)
- Budget: not applicable (existing hosting plan; no new spending in this plan)

### Stakeholder communication

| Who | When/trigger | Channel | Content |
|---|---|---|---|
| Dzaki | after each phase, before each PR and release | chat | AC status and permission requests |

## Test plan

| AC | Named check / test |
|---|---|
| AC1 | `node -v` matches `engines`/`.nvmrc` (if present); `npm ci` → exit 0; `git status --porcelain` does not list `node_modules` |
| AC2 | `npm run test` → Vitest summary "0 failed"; test count recorded in the log |
| AC3 | `npm run preflight` → exit 0 |
| AC4 | `npm run test -- chart-theme`; `grep -nE '#[0-9a-fA-F]{6}' src/features/**/*Chart*.tsx` → 0 lines; `git log -1 --stat` contains the 6 charts + `src/lib/chart-theme.ts` |
| AC5 | `git status --porcelain --untracked-files=all \| grep '^.. \.claude/'` → empty |
| AC6 | `gh pr view 16 --json state,closed` shows it closed, **or** `docs/superpowers/plans/*transaction-split*.md` exists with an impact-analysis section |
| AC7 | `gh pr checks <PR>` green; Preview test recorded; `curl -s <production-url>/api/health` → healthy status; `vercel logs` without new errors |

### Test types

- UAT: Dzaki checks the Vercel Preview before merge and `/api/health` after the release (AC7).
- Security: no tests with production data; the production database is not opened.
- Performance: not applicable (no performance target is stated in this plan's sources)

## Verification

- Each AC is checked with the named check in the Test plan; the result is recorded in the Execution log with the status `pass / fail / not yet proven / not run (reason)`.
- AC7 is verified per release, after the merge, with the post-deploy checks above.

## Files this plan will touch

**Added:**
- `docs/plan/2026-11-13-baseline-dan-aturan-kerja.md` (this file).

**Changed by later work, not by this plan:**
- `src/lib/chart-theme.ts`
- `src/__tests__/chart-theme.test.ts`
- the six chart files above
- `.gitignore` (AC5)
- the Task 3–12 files per the Sprint 3 plan

## Risk & rollback

| Risk | Type | Prevention | Plan B |
|---|---|---|---|
| Production outage from a schema difference | technical | playbook Stage 1 and additive migrations | Vercel instant rollback to the previous deployment |
| Chart changes lost | technical | commit or stash, not `checkout` | recover from the stash or the commit |
| PR #16 conflict grows | technical | AC6 decision before Tasks 3–4 | close it with a reason, or continue it under its own plan with the playbook Stage 1 impact analysis (AC6) |
| Real user accounts touched by tests | non-technical (privacy) | no tests with production data | stop and report to Dzaki |

- **Production outage from a schema difference.** This happened on 08/08/2026. Mitigation: playbook Stage 1 and additive migrations. Rollback: Vercel *instant rollback* to the previous deployment, because additive migrations need no reversal.
- **Chart changes lost.** Mitigation: execution phase 1: commit or stash, not `checkout`.
- **PR #16 conflict grows as Sprint 3 continues.** Mitigation: the AC6 decision before Tasks 3–4, which touch the transaction form.
- **Real user accounts.** No tests with production data, and the production database is not opened.

## Non-goals

- This baseline task does not touch code, configuration, or the 11 old changes.
- This baseline task does not run `npm ci`, merge, or deploy, and executing this plan pushes nothing; publishing the plan file itself happens only through a push Dzaki approves in chat.
- Does not open `.env*`, `data/*.db`, or the production database.
- Does not decide the fate of PR #16. That is Dzaki's decision (AC6).

## Execution log

- 2026-11-13 baseline written; nothing executed.
- 2026-11-13 tests not run (no `node_modules/`; `npm ci` needs network and writes to the repo). Status: not yet proven.
- 2026-11-14 translated into English (this repo is public) and aligned with the v1 section order: the former "Langkah kerja berikutnya" became Execution phases, the former check table became the Test plan, and a Verification section was added; the working-rules summary section was removed (the project rules remain in `CLAUDE.md`); statuses use the standard vocabulary. Every AC, every `path:line` reference, and every decision is kept. The Indonesian original is in this file's previous commit.
- 2026-11-14 review fixes: the previous line is corrected — only the project-specific rules (such as the playbook and TDD) remain in `CLAUDE.md`, not the whole removed summary; a local snapshot path in Current state was replaced by a plain description; and the Non-goals push line now states that executing this plan pushes nothing while the plan file itself is published only through an approved push.

- 2026-11-14 — Extended to the updated plan template: Problem statement, Measurable targets, Deliverables, Test types, Work breakdown & dependencies, Milestones, Roles (RACI), Resources & budget, Stakeholder communication, a risk table with a Plan B column, and Plan revisions were added, derived from this plan's own sections. No existing line and no acceptance criterion was changed.

### Plan revisions

Plan revision: 2 (2026-11-14)

| Revision | Date | What changed | Why | Approved |
|---|---|---|---|---|
| 1 | 2026-11-13 | baseline plan written | baseline for every project | Dzaki |
| 2 | 2026-11-14 | updated plan template elements added; acceptance criteria unchanged | plan template update | Dzaki |

Re-review triggers: direction or scope changes, a new request from the owner, a moved deadline, reviewer findings, or a production incident.
