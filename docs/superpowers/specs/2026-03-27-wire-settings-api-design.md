---
feature: Wire Settings to API
type: spec
date: 2026-03-27
status: draft
tier: 1
---

# Wire Settings to API — Design Spec

## Overview

The Settings page currently reads and writes `theme` and `locale` directly to Zustand with `localStorage` persistence. The `/api/settings` backend already exists with `GET` and `PATCH` endpoints. This feature wires the settings page to use the API, so preferences persist across devices and sessions.

## Goals

- Settings (theme, locale) persist in the database, not just localStorage
- Changing settings on one device/browser reflects on all others
- `useSettings()` hook becomes the single source of truth for settings state
- Existing Zustand UI slices for `theme` and `locale` remain as a local cache (fast reads), populated from API on mount
- First-load flash of wrong theme is eliminated or minimized

## Non-Goals

- No new settings fields beyond theme and locale in this feature
- No per-user multi-device sync notifications
- No settings history or undo

## Current State Analysis

**What exists:**
- `GET /api/settings` — returns `{ theme: string, locale: string }` from the `settings` table
- `PATCH /api/settings` — updates one or more settings keys
- `src/hooks/useSettings.ts` — hook that may partially sync from API on mount
- `src/store/index.ts` — Zustand store has `ui.theme` and `ui.locale` slices with `setTheme` / `setLocale` actions, persisted to localStorage via `zustand/middleware/persist`

**What's broken:**
- Settings page writes to Zustand only — `PATCH /api/settings` is never called
- New browser/device always starts with default settings (localStorage is empty)
- If localStorage is cleared, preferences are lost
- Settings API and DB exist but are unused by the frontend

## Approaches

### Option A — Replace Zustand settings with pure API calls (Recommended)
Remove `theme` and `locale` from Zustand persist middleware. `useSettings()` fetches from API on mount, writes to API on change. Zustand still holds the current runtime value (non-persisted) for fast reads across components.

**Pros:** Single source of truth, works across devices, simple mental model.
**Cons:** Tiny latency on first load before API responds.

### Option B — Dual-write: Zustand + API
Keep Zustand localStorage persist AND also call API on change. On mount, API response wins over localStorage if they differ.

**Pros:** Fast first-load (localStorage pre-populates).
**Cons:** Two sources of truth, conflict resolution needed, unnecessary complexity.

### Option C — Server-rendered settings in layout
Load settings server-side in `src/app/layout.tsx`, pass as props, hydrate Zustand.

**Pros:** Zero flash of wrong theme.
**Cons:** Makes layout async, complicates client component hydration. Over-engineered for this.

**Recommendation: Option A.** The first-load latency is acceptable (~50ms). Remove `theme`/`locale` from Zustand's `persist` middleware but keep them in the store as runtime state.

## Design

### Data Flow

```
App mount
  → useSettings() calls GET /api/settings
  → Response: { theme: 'dark', locale: 'id' }
  → Calls setTheme('dark') and setLocale('id') in Zustand
  → applyTheme('dark') adds/removes .dark class on <html>
  → Components read theme/locale from Zustand (same as today)

User changes theme
  → setTheme('light') in Zustand (immediate UI update)
  → PATCH /api/settings { theme: 'light' } (background, no await)
  → Toast: "Appearance saved" (optional, or silent)
```

### Files Changed

**`src/store/index.ts`**
- Remove `theme` and `locale` from the `persist` middleware's whitelist
- Keep `setTheme` / `setLocale` actions (used for runtime state)
- Result: Zustand holds the session-local value, not persisted to localStorage

**`src/hooks/useSettings.ts`** (update or create)
```typescript
export function useSettings() {
  const { setTheme, setLocale } = useStore()

  useEffect(() => {
    api.settings.get().then(({ data }) => {
      if (data?.theme) setTheme(data.theme)
      if (data?.locale) setLocale(data.locale)
    })
  }, [])

  const updateTheme = (theme: Theme) => {
    setTheme(theme)                          // immediate
    api.settings.update({ theme })           // background persist
  }

  const updateLocale = (locale: Locale) => {
    setLocale(locale)                        // immediate
    api.settings.update({ locale })          // background persist
  }

  return { updateTheme, updateLocale }
}
```

**`src/lib/api/client.ts`**
- Ensure `settings.get()` and `settings.update(patch)` methods exist

**`src/app/settings/page.tsx`**
- Replace direct `setTheme`/`setLocale` Zustand calls with `updateTheme`/`updateLocale` from `useSettings()`

**`src/app/layout.tsx` (or `AppShell`)**
- Call `useSettings()` once at the app root to hydrate Zustand from API on mount

### Handling First-Load Flash

On mount before API responds, the `<html>` element has no `.dark` class (or whatever the last-known Zustand value was). To minimize flash:
1. Add a default `class="dark"` to `<html>` in `layout.tsx` as a safe default (most apps default dark)
2. Or keep the localStorage read just for the theme class application (not for Zustand state) as a one-line script in `<head>`

The simplest fix: keep theme in localStorage **only for the class application**, but API is the write source. This is a known Next.js dark-mode pattern.

### API Client additions (`src/lib/api/client.ts`)

```typescript
settings: {
  get: () => fetchAPI<{ theme: string; locale: string }>('/api/settings'),
  update: (patch: Partial<{ theme: string; locale: string }>) =>
    fetchAPI('/api/settings', { method: 'PATCH', body: patch }),
}
```

## i18n Keys

No new translation keys needed — the settings page UI copy already exists.

## Testing

- `useSettings` hook: mock `api.settings.get`, verify it calls `setTheme`/`setLocale` on mount
- Settings page: verify `updateTheme('dark')` calls `api.settings.update({ theme: 'dark' })`
- API route `PATCH /api/settings`: verify it updates DB correctly (service test already exists)
- Edge: API failure during update → log error, keep local state (don't revert)

## Edge Cases & Risks

| Risk | Mitigation |
|------|-----------|
| First-load theme flash | Keep localStorage write for `.dark` class toggle; read API for settings store |
| API failure on settings change | Fail silently — local state already applied, user sees change; retry not needed |
| Existing users with localStorage settings | On first API-backed load, `GET /api/settings` returns DB defaults (light/en); API value wins. User may see reset preferences once. Acceptable — document this. |
| Stale Zustand persist data | Remove theme/locale from persist whitelist to prevent stale data from overriding API |
