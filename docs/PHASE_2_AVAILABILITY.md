# Phase 2a — live availability

## Owner corrections — 14 September 2026

PR #1 was accepted and deployed to Railway; migration 0005 was applied by CI.
The owner then clarified that the original Admin design must be preserved,
all mock records removed from the live interface, and the interface kept
English-only. Do not replace an existing portal's design when connecting data.

The Admin correction reuses the original workspace, eight navigation sections,
Dashboard cards, colours and typography. It opens on Dashboard; **Bookings →
Room schedule** contains the live Mindbody room list. Today's occupied intervals
also populate the Dashboard's studio breakdown and room list. Other management
sections retain their place and layout with “Not connected yet” states and dashes
for unknown metrics. They do not display mock clients, teachers, revenue,
approvals, prospects, payouts or refunds, and do not simulate management actions.
Staff authentication remains required. Client and instructor flows retain their
current functionality; all newly added interface copy is English-only.

The live catalogue also excludes the old sample packages, clients, applications,
earnings, revenue and progress records. The explicitly labelled development demo
remains isolated behind `VITE_LIVE_AVAILABILITY=false`; do not enable it on the
live website. This frontend correction needs no database migration.

This branch implements the handoff's **read path first** milestone. It is not the
production booking launch. On 2026-09-14 the owner asked to stop showing demo data
and show actual room bookings. The accepted release now defaults to real data.

## What is connected

- Real data is selected by default (or `VITE_LIVE_AVAILABILITY=true`). Only an
  explicit `VITE_LIVE_AVAILABILITY=false` enables the labelled development demo.
  A missing connection,
  an empty database or a failed read never substitutes demo teachers or sessions.
- `src/slots.js` retains `useSlots`, `daysForTeacher`, `openSlotsForDay`,
  `slotById` and the existing demo mutator names. In live mode the simulated
  hold/payment/booking mutators throw, and the client cannot enter that flow.
- One shared, atomic `availability_snapshot` RPC reads real active teachers,
  their opened slots, existing holds/bookings and Mindbody room occupancy.
  Public responses contain teacher display fields and occupied times, excluding
  client IDs, held-by IDs, contact details, biographies and Mindbody references.
- Realtime updates invalidate the snapshot. A 30-second refresh, reconnect and
  foreground refresh recover missed events. Reads expire after 90 seconds;
  Mindbody sync expires after 15 minutes. Missing room mappings or a sync window
  that does not cover a session also make that session unavailable.
- Availability is checked using `[start,end)` ranges. Back-to-back classes are
  allowed. A room reservation blocks overlapping openings by other teachers;
  a teacher reservation blocks that teacher across studios. Expired holds only
  become available when the remaining checks pass. No synthetic booking timer
  runs against live data.
- Every live date/time uses Asia/Hong_Kong, independent of the visitor's timezone.
  The window is today plus 13 days. Browsing and chat use the session's actual
  studio; a multi-location instructor's home studio is not substituted.
- The live client preview reuses the existing Find / By date and Ask interfaces.
  It includes real instructor details and an enquiry sheet, without invented
  ratings, matches, credits, progress, payments or confirmed bookings.
- The live teacher portal restores Supabase sessions and checks profile roles.
  Teachers open/close 60-minute sessions, hourly from 07:00 to 21:00, in their
  assigned studios. Edits use an auth.uid-based RPC with teacher-row serialization,
  overlap checks, idempotence and held/booked/history deletion protection.
  A teacher may open a session while its room is busy; the saved opening remains
  unavailable to clients until the room is free. The grid explains this state.
- The live admin portal is role-gated and opens on the original **Dashboard**.
  **Bookings → Room schedule** shows
  Mindbody occupied intervals independently of teacher openings, filtered by
  studio and Hong Kong date, with last successful sync and read timestamps.
  Intervals crossing midnight appear on both affected days. Manual refresh
  rereads the shared snapshot; it does not trigger a Mindbody sync. Failed or
  stale reads retain the last records with an explicit warning, and an empty
  unverified list never claims the room is free. Other Admin management sections
  show unconnected states, as requested by the owner.
- Room records contain only studios and times. They include classes and
  appointments, not a client booking ledger with names, class titles or payments.
  Client holds/bookings are not relabelled as imported Mindbody bookings.
- Demo admin/teacher/client features are accessible only through explicit demo
  mode. Fake histories, credits, teachers and revenue are absent from real mode.

## Database changes

`0005_live_availability.sql` adds slot end times (existing slots default to 60
minutes), teacher studio assignments, the snapshot RPC and the teacher-edit RPC.
It enables the required realtime publications. It also fixes recursive
`is_admin()` profile-policy evaluation and prevents browser clients from changing
their role, activation, studio assignments or rate. These privileged changes
must use trusted administration. Teacher edits to public profile copy retain
the original row policy and a restricted column grant.

The new migration is transactional and is deployed through the existing
`.github/workflows/supabase.yml` **only after merge approval**. Do not run a manual
production migration, do not dispatch the production workflow from this branch,
and do not put service-role keys into Vite variables.

## Review and rollout

1. Review the PR and automated tests. The frontend preview can be exercised using
   the mocked browser tests without any production credentials or bookings.
2. Rehearse migrations 0001–0005 on an isolated Supabase project, including the
   site's existing Auth provisioning triggers and realtime settings. The local
   embedded-PostgreSQL test covers schema/RLS/RPC behaviour but cannot reproduce
   Supabase hosting, realtime delivery, cron or real concurrent database sessions.
3. Before merging, explicitly set the production frontend's
   `VITE_LIVE_AVAILABILITY=false` in Railway while staging is validated: an unset
   flag NOW selects real data. After owner acceptance, merge via GitHub. CI applies
   0005; read the workflow result and existing commit smoke comment. Verify the
   migration before rebuilding production with `VITE_LIVE_AVAILABILITY=true`.
4. In a separate Railway preview service, select the accepted branch/commit and
   provide `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
   `VITE_LIVE_AVAILABILITY=true`. Rebuild because Vite variables are build-time.
5. Provision instructor users through trusted Supabase administration. Each needs
   an Auth user, matching `profiles` row with role `teacher`, and active
   `teacher_profiles` row. Set its `home_studio_id` and `studio_ids` to approved
   values from `central`, `cwb`, `kt`. A login does not create an instructor or
   elevate a client. Admins need an explicitly provisioned `admin` profile.
6. Check 2–3 actual Mindbody appointments against the displayed blocked times,
   open a test teacher slot, view it from a second device, close it, and verify the
   second device refreshes. Test both a shared room and a multi-location teacher.
   Use intentionally chosen test availability; these edits persist in Supabase.
7. Decide whether to expose the availability/enquiry preview to clients. The
   production booking launch requires the work below; this PR does not enable it.

## Remaining before booking launch

- Transactional authenticated holds, release, credit booking and cancellation,
  with shared room/teacher/client locks, server-side room freshness checks,
  health/waiver gates and retry/idempotency tests under real concurrency.
- Reliable Mindbody appointment write-back, reconciliation and failure handling.
  The current five-minute room sync is not an atomic reservation in Mindbody.
- Stripe webhook configuration/verification and credit fulfilment; real package,
  waiver and health state must replace browser-local demo state in the full UI.
- Teacher/client session histories, progress, profile editing, admin operations,
  payouts and other demo features still require their individual data cutovers.
- Confirm real teacher directory details, approved studio assignments and photos.
  No demo teacher UUID mappings or new teacher accounts were invented.
- `chat-ask` deployment and secret setup, plus re-gating temporary diagnostics,
  remain as described in the original handoff. Local bilingual parsing works.

## Validation

### Admin room day view (14 September 2026)

The default Bookings view follows the owner's reference: three room columns
(Kwun Tong, Causeway Bay, Central), hourly rows from 07:00 to 22:00 HKT, exact
partial-hour free gaps and occupied continuations. Daily free totals merge
overlapping source intervals. Each room must have a fresh, mapped, fully covered
day before any gap is labelled FREE; otherwise availability is unconfirmed.
Previous/Today/Next and date selection cover the existing 14-day window. The
List toggle retains all daily source intervals, including those outside grid
hours. The existing Admin shell and English-only interface are preserved.
Mindbody supplies room times only, so no client names, session types or payment
instructions from the reference are added. This feature makes no backend writes.

- `npm test`: availability/timezone/expiry/reconnect tests and execution of the
  actual migration on embedded PostgreSQL, including RLS and guarded RPC cases.
- `npm run test:e2e`: desktop and mobile Chromium journeys against isolated fake
  API responses: client date/studio selection, blocked rooms, teacher login and
  edits, client/admin access denial, empty/stale/failed reads and recovery, admin
  room filters, cross-midnight blocks, refresh and stale empty-list handling.
- `npm run build`: default real-data build. `VITE_LIVE_AVAILABILITY=false npm run
  build`: explicit demo build. Neither command connects to a real database.

Browser binaries are installed with `npx playwright install chromium`. An
existing Chromium binary can be selected with
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` in constrained development environments.
The automated workflow uses no production secrets and performs no deployment.

## Admin client details (16 September 2026)

Dashboard room rows, the day grid and List now load client names and booking
status through `admin-room-details`. The endpoint verifies the access token
against Supabase Auth and the protected `profiles.role = admin` before any
Mindbody query. It only resolves references already present in the selected
Hong Kong day's synced rooms within the existing 14-day window. Appointment
clients and non-cancelled class visits are resolved to display names; empty
class rosters are distinct from missing names or an unavailable roster.
Changed room/time, cancelled and waitlisted source records cannot label an old
busy interval as a current booking. Failed reads remove displayed names.

Private responses use no-store; names stay in component memory, are cleared on
sign-out/unmount, and are never added to public snapshots, database tables,
browser storage, logs or deployment smoke output. Room occupancy continues to
use the existing five-minute sync; private details refresh separately while
Admin is open. The existing design and English interface copy are retained.
Deploy the new edge function through the existing main-branch workflow; no
migration or manual Supabase deployment is needed. Tests cover verified-role
access, private field minimization, date/source matching, class roster states,
and desktop/mobile names, refresh failure and sign-out.
