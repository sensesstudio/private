# Shared client activity

Admin → Clients → open a client now has shortcuts for About me, Liability waiver,
Progress log, Payment & packages and Preferences. Existing admin package editing
and the English/beige design remain in place.

The client portal and admin details use the same private activity projection:

| Section | Source |
| --- | --- |
| Progress log | `session_notes` and matching private `session_photo` records |
| Studio packages | Existing CRM imports/admin edits and Mindbody package sync |
| Packages purchased online | Paid, live-mode `package_checkout_orders` snapshots |
| Payment history | `payments`, joined to the immutable checkout snapshot when available |
| Preferences and favourites | Existing `client_profiles` and admin directory projection |

`my_client_activity` derives the CRM identity from the current authenticated
session and `studio_client_accounts`. `admin_client_activity` accepts an explicit
CRM ID only for an admin. Both public functions are invoker wrappers over a
private, authorization-checked function. No email-based matching is performed.
Responses are paginated, refreshed every minute and when the tab regains focus.
Failures clear the affected history and offer retry; no private history is cached
in browser storage. Existing preferences update through the admin directory's
automatic refresh.

Photos use the private `session-photos` bucket and on-demand signed URLs lasting
60 seconds. Read authorization verifies the matching note, owner, teacher and
path; clients must pass the current-session/password-reset gate. An instructor
can read photos from their own notes only.

No sample records are inserted. This adds readers for saved progress notes and
photos, not a new instructor note-writing or photo-upload workflow. Payment
history shows recorded payments, not saved card details or generated receipts.
Notification preferences are stored; automated notification delivery remains
unconnected. Full Mindbody visit history is not added by this change.

Online purchases have no per-purchase usage allocation or first-visit expiry in
the existing schema. Show purchased sessions and recorded payment status, not a
made-up remaining balance or expiry. Keep these purchases separate from CRM
credits so they are not counted twice. Test-mode checkout orders are excluded.

The shared `useAccount` hook now keeps a verified same-user workspace mounted
during Supabase SIGNED_IN/TOKEN_REFRESHED rechecks. Returning from another browser
tab preserves the current page, selected client, filters and unsaved editor.
Different identities, sign-out, failed role verification and revoked roles still
clear access. This does not persist page/form state across a full browser reload.

Validation: PostgreSQL/PGlite tests cover both projections, identity isolation,
pagination, live/test filtering, immutable purchase names, private photos and
reset/expired sessions. Desktop/mobile browser tests cover both portals,
background updates, errors/retry and navigation preservation with revoked-access
checks. Deploy only via the repository's existing CI/main pipelines.
