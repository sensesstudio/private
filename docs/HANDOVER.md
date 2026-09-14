# Aligned (Senses Studio) — Developer Handover

**Live demo:** https://sensesprivate.com · **Repo:** `sensesstudio/private` · Deployed on **Railway** (auto-deploys `main`)
**Stack:** React 18 + Vite (no SSR, no router lib — hash-based portal switch), Supabase (Auth + Edge Functions), Stripe (Checkout), Anthropic Claude API (AI chat), plain CSS-in-JS + `global.css` design tokens.

Three portals in one SPA, switchable via the top-bar pills or URL hash: `#client` (default), `#teacher`, `#admin`.

**Feature flags** (change in code):
- `GUEST_MODE = true` — `src/components/client/Portal.jsx` (~line 1043): clients land straight in the app as a demo user ("Mara"), no login. Set `false` to require sign-in.
- `CLIENT_ONLY = false` — `src/App.jsx` (line 24): when `true`, hides the Teacher/Admin switcher (client-only demo mode).

---

## 1. Client portal (`#client`) — bottom nav: Home · Book · Ask · Pricing · Profile

### Home
- **"ALIGNED" wordmark** (app name) + date + personalised welcome.
- **Promo hero carousel** — 3 slides, auto-rotate 5s, swipeable, per-slide CTA (`PROMOS` in `src/components/client/ClientDetail.jsx`; photos `public/assets/promos/promo{1..3}.jpg`).
- **Next class card** — the client's soonest upcoming booking; taps into the teacher profile.
- **"Working towards" chips** — the goals chosen in intake.
- **Available now rail** — horizontally scrollable cards of teachers with open slots *right now*, live from the slot store.
- **Suggested for you** — ranked list (favourites first → teachers from session history → match score), each with a **personalised reason line** (favourite / history / rule-matched from goals) and a Book CTA.

### Book (screen heading "Find your instructor")
Two segments:
- **Find** — combined filter: free-text search across **teacher name, studio, class type and language**, plus chip filters (Studio × 5, Language: Cantonese/English/Mandarin, Need × 8) and a sort dropdown (Top match / Name / Rating / Price). Results are teacher cards → full teacher profile → time slots → booking.
- **By date** — day-by-day list of every open slot across teachers (max 2 per teacher/day shown), tap a slot to book directly.
- (The non-embedded variant of this component also powers the logged-out browse with Schedule / Needs / Teachers / Studios tabs — incl. Needs cards with difficulty stars and studio drill-down "Available in {studio} now".)

### Ask — AI availability chat (English + Cantonese)
Replaces "client WhatsApps us → we manually check availability".
- Client types e.g. *"any Reformer slots tomorrow afternoon?"* / *"聽日晏晝有冇 Reformer 位？"* → assistant replies + **tappable, bookable slot cards** (Book → real booking flow).
- **Hybrid architecture (important):**
  1. Message goes to Supabase Edge Function **`chat-ask`** → Claude (Haiku 4.5) with a forced tool `propose_search` → returns a structured `intent` `{need, dayIdx, daySpan, timeOfDay, studio, teacher, language}` + a one-line natural reply mirroring the client's language + an `understood` flag.
  2. **Slot matching always runs client-side** (`src/chat/query.js findSlots`) against the live slot store — the AI never invents availability; suggestions are real & bookable. Slot data never leaves the browser.
  3. **Offline fallback:** if the function isn't deployed / no API key / errors, a rule-based bilingual parser (`src/chat/parse.js`) answers instead — the tab is never broken.
- **Gibberish/off-topic handling:** no intent recognised → friendly bilingual "didn't catch that" + example chips (no random slots dumped).
- Files: `src/chat/{parse,query,ask}.js`, `src/components/client/ChatAssistant.jsx`, `supabase/functions/chat-ask/index.ts`.

### Pricing
Package list (1:1 and 1:2 formats) with prices, per-session breakdown, **validity period (from first visit)**, trial packs limited to one purchase per client.

### Profile
- **AI progress card** (top): "You're N sessions from your X-session milestone" + progress bar + **personalised suggestion synthesised from 4 real sources — intake goals, health history (injury/pregnancy), progress log, favourited teachers** (`src/suggest.js buildProgressSuggestion`). Expands to: cross-session summary, latest teacher quote, recent focus chips, **"Suggested for you next" teacher card**, link to full progress log. Currently rule-based (deterministic, free, offline); designed to be upgraded to Claude-generated copy using the same inputs (keep rule version as fallback).
- **Credits card** — pack balance + progress bar + validity.
- **Next/Upcoming booking cards** — with per-class **Add to calendar** button.
- Menu:
  - **Liability waiver** — full waiver text (`src/waiver.js`), scroll-to-end gate → tick → typed signature (rendered in script font) → stored; signing state gates booking.
  - **About me** — re-opens intake (goals with follow-up detail prompts, age, level, teaching language [multi, min 1], injuries, schedule, studios, free-text notes ≤100 words, **health declaration**: pregnancy + EDD → auto trimester, surgery, doctor clearance).
  - **Bookings** — combined sheet, Upcoming/Past tabs. Upcoming: **邀請朋友一齊上 · Invite a friend** (native share → WhatsApp, prefilled bilingual message), **Add to calendar**, Reschedule, Cancel. Past: Rate (feeds live reviews).
  - **Favourite teachers** — hearted teachers (boosts Home suggestions).
  - **Progress log** — timeline of per-session notes: focus, **Session notes + Posture record**, teacher attribution.
  - **Payment & packages** — active pack, card on file, payment history.
  - **Studios & locations** — 5 studios with photos, notes, addresses.
  - **Preferences** — phone (country codes), email, notify channels (WhatsApp/email), notification toggles.
  - **Terms & Conditions** — studio T&C (`src/terms.js`): no refund, arrive 10 min early, non-slip socks, reschedule ≥1 working day via WhatsApp, adverse weather (Black Rain / T8+), make-up class rules.
- Floating **WhatsApp button** (brand taupe) on all client screens → wa.me deep link.

### Booking flow (`BookingFlow` in `src/components/client/Portal.jsx`)
1. Slot selected → **held for 10 minutes** (live countdown; auto-release on abandon).
2. Choose **format**: Private 1:1 / Semi-private 1:2 (package list follows format).
3. Pay with **1 credit** (if balance) or buy a package (Apple Pay / card UI; simulated in demo — real Stripe Checkout exists for package purchase via `create-checkout`).
4. **Gating:** booking only confirms once **health declaration complete + waiver signed** (payment allowed first; gate prompts inline).
5. Confirmation: "You're booked" → **Add to calendar** (universal `.ics`: event + address + 2-hour reminder, works Apple/Google/Outlook — `src/calendar.js`) → for 1:2, **Invite a friend** share → "View my bookings" lands on Profile; credits decrement and sync to the Admin portal.

---

## 2. Teacher portal (`#teacher`) — Today · Availability · Your Bookings · Earnings · Your Profile
- **Login** (demo creds prefilled).
- **Today** — sessions today, active clients, month earnings, rating; session list with client context; **post-session progress-log entry** (session notes + posture record) that appears live in the client's Progress log (data symmetry).
- **Availability** — per-studio weekly grid; teacher **taps slots open/closed**. This is the *source of truth* clients see: "Clients book only what you open."
- **Your Bookings / Earnings / Your Profile** — schedule, income breakdown, editable profile incl. bio (bios shown in teacher+admin portals only, hidden from clients by design), specialisations, certifications, teaching languages, studios (multi-location supported).

## 3. Admin portal (`#admin`) — desktop layout, 8 sections
Dashboard (bookings/revenue/teachers/clients KPIs, 6-month revenue trend, by-studio utilisation, recent bookings) · Clients (incl. credits synced from client actions) · Teachers (row → detail modal with bio; **Export to Excel**) · Approvals · Prospects · Bookings · Payouts · Refunds.

---

## 4. Architecture notes ("data symmetry / 信息對稱")
All three portals read the same in-browser stores, so a change in one portal is instantly visible in the others **within the same browser session**:
- `src/slots.js` — availability slot store (hold/book/release, 7-day seeded window, `useSlots()` pub/sub). *Deliberately scaffolded so the internals can be swapped for Supabase tables + realtime without changing the UI API.* Demo dates are frozen (BASE = 2026-06-16).
- `src/clientStore.js` — client profile/declaration/waiver/credits/payments (persisted to localStorage) + Supabase profile save when configured.
- `src/components/shared/index.jsx` — live progress log, live reviews, favourites (window CustomEvent pub/sub).
- `src/supabase/*` — client, auth (sign up/in/out), queries, checkout, `useRealtime.js`/`useReference.js` hooks (studios read live from DB when configured; `isSupabaseConfigured` guards everything so the app runs fully without env vars).

### Code map
| File | What it is |
|---|---|
| `src/App.jsx` | Portal shell, top-bar logo + Client/Teacher/Admin switcher, hash routing, theme tweaks |
| `src/data.js` | All demo data: 5 studios, 5 teachers (rate HK$950/hr), packages, clients, bookings, progress log |
| `src/slots.js` | Availability store (see above) |
| `src/chat/` | Ask assistant: `parse.js` (rule parser EN/粵), `query.js` (slot matching + reply), `ask.js` (AI-first orchestration) |
| `src/suggest.js` | Personalised progress-card suggestion (goals × health × log × favourites) |
| `src/share.js` / `src/calendar.js` | Invite-a-friend share / .ics calendar export |
| `src/waiver.js` / `src/terms.js` | Legal content (structured sections) |
| `src/components/client/` | `Portal.jsx` (booking flow, profile, sheets), `Browse.jsx` (Find/By date), `ClientDetail.jsx` (Home, search, teacher profile), `ClientCore.jsx` (nav, login, intake), `ChatAssistant.jsx` |
| `src/components/teacher/Portal.jsx` · `src/components/admin/Portal.jsx` | Teacher / Admin portals |
| `supabase/functions/` | `create-checkout` (Stripe session, server-side prices, trial limits), `stripe-webhook` (credit fulfilment), `chat-ask` (Claude intent parsing) |

---

## 5. Real vs demo — honest status
| Layer | Status |
|---|---|
| Frontend (all portals, flows, UI) | ✅ Real, production-grade |
| Auth (Supabase) | ✅ Wired (sign up/in works when env configured; guest mode currently on) |
| Stripe payments | 🟡 Edge functions written; **webhook config on Stripe side pending** — booking-sheet payment is simulated meanwhile |
| Ask AI (Claude) | 🟡 Edge function written; **needs deploy (Verify JWT OFF) + `ANTHROPIC_API_KEY` secret**; rule-based fallback active until then |
| Data (teachers/slots/bookings/clients/progress) | ❌ **In-memory demo data** — resets on refresh, not shared across devices |

## 6. Prioritized backlog (to make it fully production)
1. **Move data layer to Supabase** (tables: slots/availability, bookings, clients, progress log, reviews, favourites) + **realtime subscriptions** → replaces `slots.js`/demo data; makes availability truly real-time across student & admin, cross-device.
2. **Finish Stripe webhook** setup (Stripe dashboard → endpoint + secret) so package purchases grant credits for real.
3. **Deploy `chat-ask`** + add `ANTHROPIC_API_KEY` (then optionally upgrade the Profile suggestion to Claude-generated copy, cached per day, rule version as fallback).
4. **Auth-gate Teacher/Admin portals** (they're openly switchable now — fine for demo only) and turn off `GUEST_MODE` at launch.
5. Small: upload `public/assets/needs/polestar.jpg` + `stott.jpg` (currently 404 → gradient fallback); consider basic rate-limiting on `chat-ask`; demo dates are frozen to June 2026 until real data lands.

---

## 7. Mindbody integration (Phase 1 — in progress)
Rooms are managed in Mindbody (site `5720465`); clients may only book when the room is free. Three client-bookable rooms map to existing studio rows: `KT - 30/F Private Pilates` → `kt`, `CWB - Private Pilates` → `cwb`, `Central - Private Pilates` → `central`.

- **Credentials**: Supabase Edge Function secrets `MINDBODY_API_KEY` / `MINDBODY_SITE_ID` / `MINDBODY_STAFF_USER` / `MINDBODY_STAFF_PASS` (verified working — staff token PASS).
- **Schema** (`supabase/migrations/0004_mindbody_rooms.sql`): `mindbody_rooms` (pattern→resource mapping, self-healing), `room_busy` (times only, no client data; world-readable, service-role-writable), `sync_state`, RPC `replace_room_busy` (atomic window swap).
- **Functions** (`supabase/functions/`): `mindbody-sync` (every 5 min via pg_cron+pg_net, guarded by rotating `x-sync-key`; pulls 14 days of staff appointments + classes, filters to the 3 rooms), `mindbody-health` (public ops check), `mindbody-discover` (temporary diagnostics — remove after verification).
- **CI** (`.github/workflows/supabase.yml`): on push to `main` touching `supabase/**` — applies migrations via the Management API (tracked in `_migrations`), deploys functions (`--use-api`, no Docker), rotates `SYNC_KEY`, reschedules the cron, smoke-tests endpoints. Requires repo secret `SUPABASE_ACCESS_TOKEN`.
- **Next (Phase 2)**: frontend reads real slots — bookable = teacher slot ∩ no `room_busy` overlap ∩ not held/booked; app switches to the 3 real studios; work on branch `mindbody-sync`, demo untouched until acceptance.

*Build: `npm run build` (Vite). Local: `npm run dev`. Serve prod: `npm start`.*

## Phase 2a development branch

See [`PHASE_2_AVAILABILITY.md`](./PHASE_2_AVAILABILITY.md) for the real-data
availability preview, authenticated teacher edits, validation and rollout gates.
As requested on 2026-09-14, this branch now defaults to real data; explicit
`VITE_LIVE_AVAILABILITY=false` is required for the labelled development demo.
Admin opens on a date/studio-filtered Mindbody room occupancy list with sync
timestamps. The live deployment has not yet changed. Booking confirmation and
Mindbody write-back are subsequent milestones; see the updated rollout sequence
before merging because an unset frontend flag now selects real data.
