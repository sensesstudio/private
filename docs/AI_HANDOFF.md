# AI Agent Handoff — Aligned (Senses Studio private-session booking app)

You are picking up a working project mid-flight. Read this file, then `docs/HANDOVER.md` (full feature spec). Everything below is verified true as of 2026-09-13.

## What this is
A bilingual (EN/Cantonese) Pilates private-session booking platform for Senses Studio (Hong Kong). One React SPA, three portals: Client (`#client`), Teacher (`#teacher`), Admin (`#admin`). Live at **https://sensesprivate.com** (Railway auto-deploys `main`).

**Core product rule:** a client may book a slot only when
`teacher opened the slot` ∩ `room is free in Mindbody` ∩ `slot not already held/booked`.

## Stack & accounts
- **Frontend**: React 18 + Vite, no router lib (hash-based), CSS-in-JS + `src/global.css` tokens. Deployed by **Railway** (project "Private Pilates", service `private`) on push to `main`.
- **Backend**: Supabase project ref `wvyqxafhiawwyexiggxh` ("Senses Private") — Postgres + Auth + Edge Functions. Schema in `supabase/migrations/` (0001–0004 applied).
- **Mindbody**: rooms/schedule source of truth. Site ID `5720465` ("Senses Studio"). Public API v6.
- **Stripe**: checkout edge functions written; webhook config on Stripe side still pending.
- **Repo is PUBLIC** → never commit secrets, tokens, or keys. CI secrets live in GitHub Actions secrets; runtime secrets in Supabase Edge Function secrets.

## Credentials map (names only — values are already in place)
- Supabase Edge Function secrets: `MINDBODY_API_KEY`, `MINDBODY_SITE_ID`, `MINDBODY_STAFF_USER`, `MINDBODY_STAFF_PASS`, `SYNC_KEY` (auto-rotated by CI on every deploy).
- GitHub Actions secret: `SUPABASE_ACCESS_TOKEN` (drives all Supabase deploys).
- All verified working: staff token issues (HTTP 200), site list returns 5720465.

## How deployment works (do NOT deploy Supabase by hand)
`.github/workflows/supabase.yml` runs on any push to `main` touching `supabase/**`:
1. Applies new files in `supabase/migrations/` via the Supabase Management API, tracked in the `_migrations` table (0001–0003 are marked pre-applied).
2. Deploys edge functions (`--use-api`, JWT verification off per `supabase/config.toml`).
3. Rotates `SYNC_KEY` and (re)schedules the `pg_cron` job `mindbody-sync` (every 5 min).
4. Runs one sync immediately, smoke-tests endpoints, and **posts the JSON results as a comment on the commit** — read that comment to see outcomes.

Frontend: any push to `main` → Railway rebuilds sensesprivate.com. Do risky frontend work on a branch.

## Mindbody sync — LIVE and verified
- 3 client-bookable rooms, matched and confirmed:
  - `kt` ← resource #41 "KT - 30/F Private Pilates"
  - `cwb` ← resource #37 "CWB - Private Pilates"
  - `central` ← resource #49 "Central - Private Pilates"
- `mindbody-sync` edge function: every 5 min pulls next 14 days of staff appointments + classes, filters to those 3 rooms, atomically replaces `room_busy` rows via RPC `replace_room_busy`. First run: 1,621 classes + 102 appointments fetched → 211 busy blocks (central 63 / cwb 69 / kt 51). Stores **times only, never client data**.
- Tables (migration `0004_mindbody_rooms.sql`): `mindbody_rooms` (pattern→resource mapping, self-healing on rename), `room_busy` (world-readable, service-role-writable, in `supabase_realtime` publication), `sync_state`.
- Ops check (open anytime): `https://wvyqxafhiawwyexiggxh.supabase.co/functions/v1/mindbody-health` → shows sync age + per-studio busy counts. `mindbody-discover` lists all Mindbody rooms (temporary; remove or re-gate when Phase 2 ships).
- Gotchas: Mindbody returns naive local datetimes — always pin `+08:00` (see `hkToIso` in `supabase/functions/_shared/mb.ts`). Site TZ is Asia/Hong_Kong, no DST. `mindbody-sync` requires header `x-sync-key` = `SYNC_KEY`.
- Owner still owes one manual spot-check of 2–3 real bookings against `room_busy` (pending at handoff).

## Current app status
- Frontend is production-quality but still runs on **in-browser demo data** (`src/data.js`, `src/slots.js` — dates frozen to June 2026); `GUEST_MODE = true` in `src/components/client/Portal.jsx`; portal switcher visible (`CLIENT_ONLY = false` in `src/App.jsx`).
- Supabase Auth works; Stripe simulated in booking sheet (real checkout functions exist, webhook pending); Ask-AI chat runs on rule-based fallback (`chat-ask` function written, not deployed).

## Next task — Phase 2: frontend cutover (owner-approved direction)
Work on branch `mindbody-sync` (or similar); do not break the live demo until acceptance.
1. Replace the in-memory slot store with Supabase: teachers' opened slots in `slots`, holds/bookings in `slots`/`bookings`, subscribe via realtime. Keep the UI API of `src/slots.js` (`useSlots()` pub/sub) so components don't change.
2. Bookable availability = teacher slot ∩ no `room_busy` overlap (same `studio_id`, time-range intersect) ∩ slot not held/booked. `room_busy` is anon-readable + realtime.
3. Reduce studios to the 3 real ones (`kt`, `cwb`, `central` — already seeded in DB); update `src/data.js` studio references and photos.
4. Real teacher accounts (Supabase Auth) replacing demo teachers; teacher availability grid writes to `slots`.
5. Write-back (after read path is stable): when a client books in the app, create the appointment/reservation in Mindbody too, so the room blocks in both systems.
6. Then: finish Stripe webhook, deploy `chat-ask` with `ANTHROPIC_API_KEY`, set `GUEST_MODE=false`, auth-gate teacher/admin portals.

## Working agreements
- Cantonese-first owner (non-technical): explain in plain 廣東話, offer step-by-step clicks for any dashboard task, never ask them to run terminal commands.
- Never print secret values anywhere (chat, logs, commit comments). Repo is public.
- Commit style: small, descriptive; heavy changes on branches; `main` = live site.
