# Ponytail Audit

Over-engineering audit (complexity only — correctness/security/perf out of scope).
Date: 2026-06-21 · Branch: staging

Codebase is lean: 3 runtime deps, no speculative abstractions. The inline `Icon`
SVG map and the offline-sync context are correct-lazy. The blob+normalized
dual-write is a deliberate recovery net (normalized reconstructs matches the blob
missed), not redundancy — keep.

## Findings (biggest cut first)

| # | Tag | What to cut | Replacement | Path | Status |
|---|-----|-------------|-------------|------|--------|
| 1 | delete | `resetPassword` + `updatePassword` — zero callers | nothing | `src/supabaseClient.js:123-157` | **done** |
| 2 | shrink | 4 date-only `formatDate` copies | shared `src/format.js`, imported by App + 2 Admin views | `src/App.jsx:41`, `:1217`, `components/Admin/{InvitationManagementView,UserManagementView}.jsx` | **done** |
| 3 | delete | `MatchesView` inner `formatDate` shadow | use shared `formatDate` | `src/App.jsx:1217-1225` | **done** |
| 4 | shrink | `'N/A'` guard repeated in Admin `formatDate`s | folded into shared helper (`UserDetailsModal` excluded — it's a datetime, not a date) | `components/Admin/*` | partial |

**net: ~-70 lines, -0 deps possible.**

## Left alone (deliberately)

- 3041-line `App.jsx` — cohesive, no needless indirection. Splitting adds files for no behavior change.
- Inline `Icon` SVG map — adding an icon lib would be a new dep for what a few lines do.
- `OfflineSyncContext` thin wrapper — standard React pattern to share one hook instance.
- blob + normalized dual-write — recovery net, not dead redundancy.

## Out of scope (route elsewhere)

- `loadFromSupabase` match-reconstruction has a correctness smell → `/code-review`.
