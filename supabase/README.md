# Senses Studio — Supabase backend

Slice 1: the relational schema (the foundation). This is real, validated SQL —
not yet wired into the React app (that's slice 2).

## What's here
- `migrations/0001_init.sql` — full schema: profiles (client/teacher/admin),
  studios, teacher/client profiles (incl. health declaration + waiver), packages,
  payments, an **append-only credit ledger**, slots, bookings, session notes,
  reviews, applications. Plus Row-Level Security policies and a transactional
  `book_with_credit()` function.
- `seed.sql` — reference data (the 5 studios + 3 packages).

## Design guarantees
- **PostgreSQL relational integrity** — foreign keys + transactions mean a
  booking always spends exactly one credit and a balance can't drift.
- **Credit balance is derived**, never stored: `select balance from credit_balances`
  (a view over `sum(delta)` of the ledger). Refunds/expiry are just new ledger rows.
- **RLS** — clients see only their own data; teachers see their slots/bookings;
  admins see everything (via `is_admin()`).

## How to deploy (you do this — the sandbox can't reach Supabase)
1. Create a project at https://supabase.com (free tier).
2. In the SQL Editor, run `migrations/0001_init.sql`, then `seed.sql`.
   (Or with the Supabase CLI: `supabase db push`.)
3. Grab **Project URL** and **anon key** from Project Settings → API and send them
   to me — slice 2 wires the React app (auth + profiles) to it.

## Validated locally
Applied against PostgreSQL 16 with a stubbed `auth` schema and tested:
atomic credit spend, double-book rejection, insufficient-credit rejection,
and FK enforcement. All pass.
