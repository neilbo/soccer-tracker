# Changelog

All notable changes to Soccer Tracker are recorded here, grouped by feature area and ordered most-recent first.

---

## 2026-05-19
### Export
- **Position per stint** — match CSV now splits stints by position changes, showing each segment with its position (e.g. `00:00-45:00 (DEF-L); 45:00-90:00 (MID)`). Removed the flat "Position" column in favour of this richer per-segment format.
- Added `saves` column to both match and dashboard CSV exports.
- Added `saves` migration file for Supabase (`match_players.saves`).

---

## 2026-05-08
### Stats — Saves
- Added **Saves** tracking alongside Goals and Assists across the full stack: state model, live match +/− buttons, edit drawer, dashboard stats table, match-edit stats table, Supabase sync, and CSV exports.
- Goals / Assists / Saves grid stacks vertically on mobile (`grid-cols-1 sm:grid-cols-3`).

### Positions
- Made L/C/R side selection **optional** for DEF, MID, FWD — clicking a role now sets it immediately without requiring a side. Side picker stays open and highlights the active selection; clicking the same side again deselects it.

---

## 2026-04-28
### Bug Fix
- Fixed blob vs normalised match count mismatch — the active (non-deleted) blob count is now compared against normalised matches so new matches are picked up correctly on sync.

---

## 2026-04-24
### Match Page
- **Re-design** of the match view.
- Widened screen layout.
- **Soft delete** for matches — matches are flagged `deletedAt` rather than removed, preserving data integrity.
- Added GitHub Action to keep the Supabase project alive (prevents free-tier pausing).

---

## 2026-03-15
### UX
- Offline/online sync notification is now dismissable.

---

## 2026-02-20
### Offline Mode
- Offline mode v1 — app works without a connection and queues changes for sync when back online.
- Offline/online status indicators in the UI.
- Support for creating non-live (retroactive) matches.

### Super Admins
- Auto-save skipped when viewing admin pages (Organisations, Users, Invitations).
- Super admin views show team and club name.
- Fixed multi-team bug.

---

## 2026-02-16
### Auth & Roles
- Hidden team dropdown for Super Admins.
- Guest users get their own Org and Team on first visit.
- Added blank club option on sign-up.
- Fixed clubs not appearing on sign-up screen.

---

## 2026-02-14
### Auth & Invitations
- Separated Guest vs Authenticated permissions.
- Updated default guest data.
- Fixed invitation flow end-to-end.
- Fixed production live bug.
- Fixed Dashboard and Invitations views for Super Admins.
- Super admin functionality: Organisations CRUD, user and invitation management.

---

## 2026-02-13
### Auth & Roles
- Roles and permissions groundwork; invitation flows.
- Fixed player UUID generation.
- Fixed sign-up process.
- General cleanup.

### Position Tracking
- Track player position (GK / DEF / MID / FWD with L/C/R side) per player per match.
- Position changes during a live match are recorded as timestamped events.

---

## 2026-02-11
### Foundation
- **First commit** — basic app scaffolding.
- Dashboard layout fixes; export only shown when matches exist.
- Default match date to today.
- Supabase integration — data connected and syncing.
- Player timeline moved to a bottom drawer; ability to delete matches.
- Duplicate player stats removed; player rows made editable inline.
- UI polish: row styling, button layout fixes.
- `ComboSelect` component for opponent club input.
- **Clubs** feature — manage opponent clubs.
- Security: removed `.env` from tracking, added `.env.example`.
