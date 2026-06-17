# Data symmetry — 三方信息對稱

Every feature must present shared data **consistently and in real time across all
three portals** (client, teacher, admin). This is a hard requirement, not a
nice-to-have. The rules below are how we guarantee it.

## The four rules

1. **One source of truth.** Every shared entity lives in a **Supabase Postgres
   table** — never duplicated in `data.js` constants or held only in an in-memory
   store. The schema in `supabase/migrations/` is that source of truth.

2. **All three portals read the same table.** No portal keeps its own private
   copy of shared data. If two portals show the same thing, they read the same row.

3. **All three subscribe to realtime.** Any screen showing shared data uses
   `useRealtimeTable(table, reload, { filter })` so a write by *any* party reaches
   the other two devices in ~1 second. Fetch once, then let realtime keep it live.

4. **One guarded write path per entity.** Mutations go through a single function
   in `src/supabase/queries.js` (transactional / RLS-guarded where it matters,
   e.g. `book_with_credit`). No feature writes to just one portal's view, and no
   two portals can end up in contradictory states (e.g. a booking with no credit
   deducted).

**Checklist for every new feature:** define the table → read it in each portal →
one write path → subscribe to realtime. If any box is unchecked, it isn't done.

## Current state (transitional)

Today the app still runs on two **in-memory pub/sub stores**. They give symmetry
**only within a single browser session** — not across devices. This is the gap
Supabase closes. The Supabase layer is already built and waiting on project keys.

| In-memory today | Becomes (Supabase) | Write path | Realtime table |
|---|---|---|---|
| `clientStore` profile/health (`saveClientProfile`/`getClientProfile`) | `client_profiles` | `saveClientProfile` / `fetchClientProfile` | `client_profiles` |
| `clientStore` credits (`setClientCredits`) | `credit_ledger` → `credit_balances` view | `recordPurchase`, `bookWithCredit` | `credit_ledger` |
| `clientStore` payments (`recordPayment`) | `payments` | `recordPurchase` | `payments` |
| `_liveProgress` (`addLiveProgress`/`useLiveProgress`) | `session_notes` | `addProgressNote` / `fetchProgress` | `session_notes` |
| (new) progress photos | `session_photo` + Storage | `uploadSessionPhoto` / `listSessionPhotos` | `session_photo` |
| `data.js` `BOOKINGS` | `bookings` | `bookWithCredit` | `bookings` |
| `data.js` `CLIENTS` / `TEACHERS` | `profiles` (+ role tables) | (auth signup / admin) | `profiles` |

## Switching it on

1. Create the Supabase project; run `supabase/migrations/*.sql` then `seed.sql`.
2. Put **Project URL + anon key** in `.env.local` (see `.env.example`).
3. `isSupabaseConfigured` flips to `true`; components swap their in-memory calls
   for the `queries.js` functions + `useRealtimeTable`. Until then the app runs on
   the demo store, so nothing breaks while the project is being set up.

## Building blocks (already in the repo)

- `src/supabase/client.js` — the configured client (or `null` in demo mode).
- `src/supabase/useRealtime.js` — `useRealtimeTable` subscription hook.
- `src/supabase/queries.js` — the one write/read path per entity.
- `src/supabase/mappers.js` — UI answer shape ↔ Postgres row, so the swap doesn't
  ripple into components.
