# Product Requirements Document — Senses Studio ("Align Senses App")

**Owner:** Senses Studio (Samantha's Workspace)
**Platform:** Base44 (React + Vite frontend, Base44 entities, Deno edge functions)
**Payments:** Stripe (HKD) · **Repo:** `sensesstudio/align` · **Date:** 2026‑06‑15

---

## 1. Overview

Senses Studio is a booking platform for **private (1:1) and semi‑private (1:2)** Pilates & yoga sessions across five Hong Kong locations. Clients buy **prepaid class packs (credits)** via Stripe, then book sessions with teachers; each confirmed session consumes one credit. The product has **three role‑based portals** — Client, Teacher, Admin — served from one app and routed by user role.

**Monetisation model (canonical): prepaid credits.** Cash is collected at **package purchase** (Stripe Checkout). Booking a session **deducts a credit**; cancelling **restores** it. A per‑teacher `hourly_rate` is shown as the session's attributed value, not a separate charge.

**Locations:** Central, Causeway Bay, Lai Chi Kok, Kwun Tong, Quarry Bay.
**Session formats:** 1:1, 1:2. **Currency:** HKD.

---

## 2. Goals / Non‑Goals

**Goals**
- Let clients discover the right teacher/slot and book a private session in minutes.
- Capture health/goal context up front so sessions are safe and well‑matched.
- Give the studio full operational control: bookings, teachers, prospects, revenue.
- Enforce the credits economy correctly (no free sessions; clean refunds).

**Non‑Goals (current scope)**
- Group/class‑schedule (drop‑in class) booking — this is 1:1 / 1:2 only.
- In‑house video, messaging, or a native mobile app.
- Teacher self‑payout/earnings management (see Roadmap).

---

## 3. Roles & Personas

| Role | Lands on | Can do |
|------|----------|--------|
| **Client (student)** | `/ClientHome` | Complete health intake, buy packs, find & book sessions, amend/cancel, track progress, manage profile |
| **Teacher** | `/TeacherDashboard` | Set availability, view bookings & clients, log progress, manage working profile (public profile is studio‑managed) |
| **Admin** | `/AdminDashboard` | Manage bookings (+ manual teacher override), teachers (approval), students, prospects, packages, payments/revenue, locations, class types, analytics, notifications, settings |

Routing: `RoleRouter` redirects by `user.role`; teachers/admins use a sidebar, students use bottom‑nav + a credits widget.

---

## 4. Architecture & Data Model

**Stack:** React 18 + Vite, React Router, TanStack Query, Tailwind/Radix UI, `@base44/sdk`. Backend logic = Base44 Deno **edge functions** (`base44/functions/*`). Code syncs to the Base44 Builder via GitHub; **Publish** pushes to end users.

**Key entities**
- **StudentProfile** — name, email, phone, `user_id`, `preferred_locations`, `flag` (vip/medical/blacklist), `account_status`.
- **ClientHealthProfile** — `age_range`, `training_goals[]`, `preferred_class_type_ids[]`, `medical_conditions[]`, `pain_areas[]`, `injuries_limitations`, `fitness_level`, emergency contact, prenatal/postnatal fields, `profile_completed`.
- **TeacherProfile** — name, bio, `photo_url`, `hourly_rate`, cert booleans (`reformer_cert`/`mat_cert`/`yoga_cert`/`prenatal_cert`/`rehab_cert`), `languages[]`, `preferred_locations[]`, `avg_rating`, `total_sessions`, `status` (active/inactive/pending).
- **PublicTeacherProfile** — studio‑managed client‑facing profile (`display_name`, `title`, `bio`, `teaching_style`, `certifications[]`, `specialties[]`, `is_published`).
- **AvailabilityBlock** — `teacher_id`, `date`, `location`, `block_start`, `block_end` (sliced into 60‑min slots).
- **Booking** — student/teacher refs, `location`, `date`, `start_time`/`end_time`, `class_type(_id)`, `session_format`, `status` (pending/confirmed/completed/cancelled/no_show/rescheduled), `amount_hkd`, `stripe_payment_id`, `stripe_refund_id`, `hold_expires_at`, `credit_handling` (Deducted/Complimentary/Manual Payment/Refunded), `booking_source`, `change_log[]`.
- **Package** — `name`, `session_format`, `pack_type` (Trial/Single/5/10), `total_classes`, `price_hkd`, `cost_per_class`, `is_trial`, `is_active`.
- **Purchase** (credits ledger) — `user_id`, `package_id`, `credits_total`, `credits_remaining`, `stripe_session_id`, `stripe_payment_status` (pending/succeeded/failed/refunded), `is_active`.
- **ClassTypes** — catalog (category: General/Themed/Specialty).

**Edge functions:** `bookingOperations` (hold/confirm/release/amend/adminCreate/cancel), `packageOperations` (checkout/refund), `stripeOperations`, `stripeWebhook`, notifications (`sendWhatsApp`, `sendBookingNotification`, `sessionReminders`, …), Google Calendar sync.

---

## 5. Core Flows

1. **Onboarding/intake** — multi‑step `ClientHealthProfile` (age, goals, class‑type interests, medical/pain/injuries, fitness level, emergency contact; prenatal/postnatal sub‑flows). Age range is required before booking.
2. **Buy credits** — `BuyClasses` → `packageOperations.createCheckoutSession` → Stripe Checkout → `stripeWebhook` activates the `Purchase` (credits). Trial packs limited to new clients.
3. **Find & book** — `FindClass` lists open slots (availability minus booked/held), ranked by the matching engine. Booking: `createHold` (10‑min reservation + server‑side conflict check) → confirm → **1 credit deducted server‑side** → `confirmed`.
4. **Amend / cancel** — student or admin; cancelling **restores the credit** and marks `credit_handling = Refunded`.
5. **Teacher** — set availability (copy day/week), view upcoming bookings & clients, log progress.
6. **Admin** — full bookings overview with manual teacher reassignment, teacher approval, prospects, packages/credits, revenue, analytics.

---

## 6. Functional Requirements & Status

Status legend: ✅ Implemented · ⚠️ Partial · ❌ Missing/Skipped. (Reflects state after the 2026‑06‑15 work, merged to `main`.)

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | **Three portals** (Admin/Client/Teacher) | ✅ | Role‑based routing + separate nav per portal. |
| 2 | **Client intake** (goals, injury history, schedule prefs) | ⚠️ | Goals, medical/pain/injuries, fitness, prenatal/postnatal all captured. **Schedule/time preferences pending** — needs `preferred_days` + `preferred_time_blocks` on `ClientHealthProfile` (Base44 schema change). |
| 3 | **Assisted teacher–client matching** | ✅ | Weighted scoring (rating 35 / location 25 / reliability 20 / price 10 / on‑time 10) **+ client‑aware fit bonus (≤30)** using the health profile (prenatal/postnatal, rehab/injury → matching certs). Heuristic, not LLM (LLM optional, see Roadmap). |
| 4 | **Real‑time availability calendar** | ⚠️ | Availability mgmt + slot computation + 10‑min holds prevent double‑booking. Freshness via query refetch/polling, **not** true real‑time. |
| 5 | **Fixed‑rate pricing visible to clients** | ✅ | Per‑teacher `hourly_rate` + package prices shown. In the credits model this is the session's attributed value. |
| 6 | **Booking flow with Stripe payment** | ✅* | Stripe powers pack purchases; booking **deducts a credit** (server‑side, closes the prior "book for free" gap). *Backend function verified by build/lint/review, **not runtime‑tested**. |
| 7 | **Admin prospect tracking** (no‑booking accounts, abandoned checkouts) | ✅ | New **Prospects** page: no‑booking accounts (+ "has credits, not booked") and pending/failed `Purchase`s, with a conversion stat. |
| 8 | **Teacher profile setup** (specialisations, bio, availability) | ✅ | Working profile (bio, photo, rate, certs, languages) + self‑serve availability. Public profile is studio‑managed. |
| 9 | **Teacher earnings summary** | ❌ | Skipped this round. Needs an earnings basis (commission split vs gross). |
| 10 | **Admin teacher approval / onboarding** | ✅ | **Pending Approval queue** with a readiness checklist (photo, bio, rate, certs, availability) + Approve/Decline. |
| 11 | **Admin bookings overview + manual matching override** | ✅ | Full filterable list; create/edit/cancel; reassign teacher with change log + notifications. |
| 12 | **Admin revenue dashboard** | ✅ | Revenue now from **succeeded `Purchase`s** (real cash) by date; refunds = refunded purchases; **Credits Outstanding** liability; removed mock charge. |
| 13 | **Payout report for teachers** | ❌ | Skipped per request. |
| 14 | **Refund handling** | ✅ | Booking cancel → **credit restored** (`Refunded`); real Stripe **package** refunds via `packageOperations`. Mock refund id removed. |
| 15 | **Real‑time updates (WebSocket/Supabase Realtime)** | ❌ | Not implemented; polling only. True real‑time would need Base44 platform support. |

---

## 7. Business Rules (Credits & Booking)

- **1 credit = 1 session.** Confirming a booking requires an active `Purchase` with `credits_remaining > 0`; otherwise the client is routed to **Buy Classes**.
- **Deduction is server‑side & authoritative** (`bookingOperations.confirmHold`, `asServiceRole`) — credit consumed FIFO (oldest active pack first); booking stamped `credit_handling = Deducted`.
- **Holds** last 10 minutes (`hold_expires_at`); overlapping active bookings are rejected (`SLOT_UNAVAILABLE`).
- **Cancellation** (`cancelBooking`) restores 1 credit to the exact pack (`purchase_id` if recorded, else most‑recent succeeded pack), sets `credit_handling = Refunded`, and cancels. Authorised to admin or the booking's own client.
- **Trial packs**: one per new client.
- **Admin bookings** may be `Deducted`, `Complimentary` (with reason), or `Manual Payment`.

---

## 8. Matching Algorithm

`score = 0.35·rating + 0.25·locationMatch + 0.20·reliability + 0.10·priceEfficiency + 0.10·onTimeRate + clientFit(≤30)`

`clientFit` derives the client's needs from their health profile — `prenatal` (prenatal/postnatal signals) and `rehab` (injury‑rehab/back‑pain/scoliosis/posture goals, medical conditions, pain areas, or free‑text injuries) — and boosts teachers whose `prenatal_cert`/`rehab_cert` match. The recommendation line leads with "✓ Matches your needs". When no client profile is supplied (e.g. admin booking form), scoring is unchanged.

---

## 9. Non‑Functional

- **Security:** Base44 RLS on entities; sensitive operations (credit deduction/restoration, Stripe, conflict checks) run in edge functions as service role.
- **Notifications:** WhatsApp + email for booking confirm/amend/cancel; session reminders; Google Calendar sync.
- **Performance/freshness:** TanStack Query caching; admin dashboards poll (60–300s).
- **Deploy:** GitHub `main` → Base44 Builder (preview) → **Publish** → end users.

---

## 10. Open Items / Roadmap

1. **#2 Schedule preferences** — add `preferred_days[]`, `preferred_time_blocks[]` to `ClientHealthProfile` (Base44 schema), wire into intake + matching. *Blocked on schema/MCP access.*
2. **#9 Teacher earnings** & **#13 payout report** — define commission/split, build teacher earnings view + admin payout export.
3. **#4 / #15 Real‑time** — richer polling now; evaluate Base44 realtime/WebSocket for live availability.
4. **Runtime verification** — exercise `confirmHold`/`cancelBooking` against live data (credit deduct/restore, no‑credits block).
5. **Confirm Base44 deploy semantics** — whether edge functions go live on sync vs Publish.
6. **Optional:** `purchase_id` on `Booking` for exact credit restoration; LLM‑assisted matching; retire the unused per‑session `stripeOperations.charge` path.

---

## 11. Release Status (2026‑06‑15)

Merged to `main` (synced to Base44 Builder; not yet Published): **#6, #14, #7, #10, #12, #3**. Pending: **#2** (blocked), **#9/#13** (skipped), **#4/#15** (not started). Recommend preview + smoke test in Base44, then Publish.
