# Google client registration

A new verified Google client returning to any client portal page calls
`ensure_my_client_profile`. This creates one empty `studio_clients` record and
one explicit `studio_client_accounts` mapping. The client completes their name
and mobile number (including country code) before continuing to their original
page. Email comes from the verified Google identity and cannot be edited here.

Admin → Clients includes these records even before any package is purchased.
The Google sign-ups and Awaiting contact details filters distinguish them.
The existing directory refreshes automatically every minute and when focused.
Admins retain the existing contact editing, package and password reset controls.

Existing mapped clients retain their mapping. An email collision with an
unlinked studio record requests studio assistance instead of automatically
claiming its packages or creating a duplicate. Returning or retrying the same
Google signup is idempotent. Completing onboarding never grants a package,
creates visits, creates a Mindbody customer, or starts a Stripe payment.

The two public RPCs are authenticated invoker wrappers around private definer
functions. Google identity, verified email, client role, actual session, OAuth
AMR and password-reset cutoffs are checked in the database. Clients still have
no direct CRM table access. Contact writes use the existing audit history and
never enable the temporary password. Role metadata is not trusted.

Deploy the migration through the normal main-branch Supabase workflow. No
manual production DDL is required. `tests/google-onboarding.test.js` checks
ownership, duplicate prevention, reset/session gates, validation and admin
visibility in PostgreSQL. Playwright covers new Google callbacks from Profile
and Pricing, incomplete profile reloads, save retries and admin presentation on
mobile and desktop, using synthetic records only.

## Client-entered records

About me now saves the client's contact name/mobile, goals, age group, practice
level, teaching languages, injuries, schedule/studio preferences, instructor
notes, and health declaration (including due date when applicable). The existing
client_profiles table has explicit typed fields; preferences and favourite
instructor IDs are also stored there. Profile versions prevent stale forms from
overwriting a more recent submission. Clients cannot change login email, role,
credits, ownership, or waiver metadata with these forms.

Liability waiver signing requires the displayed document, explicit agreement,
signer name and participant/guardian capacity. The server stores immutable
signature records with participant name, server time, document version and hash.
The versioned document stores the exact existing studio text. Retrying signing
returns the original signature. Future waiver text changes require a new document
version; never rewrite an already-signed document or treat older signatures as
agreement to new text.

Admin Clients includes sortable Intake and Waiver columns and pending filters.
Client details show all submitted fields, notification choices, favourites and
signature history, with the original signed document available to read. The
profile data and signature tables deny direct customer writes; authenticated RPCs
check the existing session, explicit CRM mapping and password reset gates. Raw
profile/health and signature reads are admin-only; clients use the scoped RPC.
Client mutations append profile changes to the existing private audit history.

Saving notification preferences does not send messages or enable an automated
notification service. Progress, booking and payment screens retain their existing
real records/empty states; this change does not manufacture session history or
payment records. No demo records are inserted into production.
